const { app, BrowserWindow, ipcMain, dialog, Menu, Tray, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const WebSocket = require('ws');
const { autoUpdater } = require('electron-updater');
const { createClient } = require('@supabase/supabase-js');

let mainWindow;
let tray = null;
let wsServer = null;
let wsClients = new Set();

// Safe send to renderer (handles null mainWindow)
function sendToRenderer(channel, data) {
    if (mainWindow && mainWindow.webContents && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send(channel, data);
    }
}

// WebSocket server settings (configurable)
let wsPort = 9876;
let wsIdentifier = 'folder-architect-default';

// ========== SUPABASE CONFIG ==========
const SUPABASE_URL = 'https://gnlcckcehekjacewihvc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdubGNja2NlaGVramFjZXdpaHZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYzNDQ1MDUsImV4cCI6MjA4MTkyMDUwNX0.R7f1Qq3l7s2R_IlA_G7NErhWNi_ci2uXT42XO3K-CG8';

let supabase = null;
let currentUser = null;
let realtimeSubscription = null;

function initSupabase() {
    if (SUPABASE_URL === 'YOUR_SUPABASE_URL' || !SUPABASE_URL.includes('supabase.co')) {
        console.log('Supabase not configured - running in local mode');
        return false;
    }
    try {
        supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            realtime: {
                params: {
                    eventsPerSecond: 10
                }
            }
        });
        console.log('Supabase client initialized');
        return true;
    } catch (e) {
        console.error('Failed to initialize Supabase:', e);
        return false;
    }
}

// ========== AUTO UPDATER ==========
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;
// Skip signature verification (self-signed/unsigned builds)
autoUpdater.forceDevUpdateConfig = true;

let updateCheckInProgress = false;
let isManualCheck = false;

function setupAutoUpdater() {
    autoUpdater.on('checking-for-update', () => {
        console.log('Checking for updates...');
        mainWindow.webContents.send('update-status', { status: 'checking' });
    });

    autoUpdater.on('update-available', (info) => {
        console.log('Update available:', info.version);
        updateCheckInProgress = false;
        mainWindow.webContents.send('update-status', {
            status: 'available',
            version: info.version,
            releaseDate: info.releaseDate
        });
    });

    autoUpdater.on('update-not-available', (info) => {
        console.log('No updates available');
        updateCheckInProgress = false;
        mainWindow.webContents.send('update-status', {
            status: 'up-to-date',
            version: info.version
        });
    });

    autoUpdater.on('download-progress', (progress) => {
        mainWindow.webContents.send('update-status', {
            status: 'downloading',
            percent: Math.round(progress.percent),
            bytesPerSecond: progress.bytesPerSecond,
            transferred: progress.transferred,
            total: progress.total
        });
    });

    autoUpdater.on('update-downloaded', (info) => {
        console.log('Update downloaded:', info.version);
        mainWindow.webContents.send('update-status', {
            status: 'ready',
            version: info.version
        });
    });

    autoUpdater.on('error', (err) => {
        console.error('Auto-updater error:', err);
        updateCheckInProgress = false;
        mainWindow.webContents.send('update-status', {
            status: 'error',
            message: err.message || 'Unknown error occurred'
        });
    });
}

function checkForUpdates(manual = false) {
    isManualCheck = manual;
    if (updateCheckInProgress) return;
    updateCheckInProgress = true;
    autoUpdater.checkForUpdates().catch(err => {
        console.log('Update check failed:', err.message);
        updateCheckInProgress = false;
        mainWindow.webContents.send('update-status', {
            status: 'error',
            message: err.message || 'Failed to check for updates'
        });
    });
}

// IPC handlers for update actions from renderer
ipcMain.handle('check-for-updates', async () => {
    checkForUpdates(true);
    return { success: true };
});

ipcMain.handle('download-update', async () => {
    autoUpdater.downloadUpdate();
    return { success: true };
});

ipcMain.handle('install-update', async () => {
    autoUpdater.quitAndInstall();
    return { success: true };
});

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1000,
        minHeight: 700,
        icon: path.join(__dirname, 'assets', 'icon.png'),
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        },
        backgroundColor: '#0a0a0f',
        show: false,
        titleBarStyle: 'default',
        frame: true
    });

    mainWindow.loadFile('index.html');

    // Show window when ready
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    // Handle window close
    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    // Create application menu
    createMenu();
}

function createMenu() {
    const template = [
        {
            label: 'File',
            submenu: [
                {
                    label: 'New Structure',
                    accelerator: 'CmdOrCtrl+N',
                    click: () => mainWindow.webContents.send('menu-action', 'new')
                },
                {
                    label: 'Import Template...',
                    accelerator: 'CmdOrCtrl+O',
                    click: () => importTemplate()
                },
                {
                    label: 'Export JSON...',
                    accelerator: 'CmdOrCtrl+S',
                    click: () => mainWindow.webContents.send('menu-action', 'export-json')
                },
                { type: 'separator' },
                {
                    label: 'Exit',
                    accelerator: 'Alt+F4',
                    click: () => app.quit()
                }
            ]
        },
        {
            label: 'Edit',
            submenu: [
                {
                    label: 'Undo',
                    accelerator: 'CmdOrCtrl+Z',
                    role: 'undo'
                },
                {
                    label: 'Redo',
                    accelerator: 'CmdOrCtrl+Y',
                    role: 'redo'
                },
                { type: 'separator' },
                {
                    label: 'Cut',
                    accelerator: 'CmdOrCtrl+X',
                    role: 'cut'
                },
                {
                    label: 'Copy',
                    accelerator: 'CmdOrCtrl+C',
                    role: 'copy'
                },
                {
                    label: 'Paste',
                    accelerator: 'CmdOrCtrl+V',
                    role: 'paste'
                }
            ]
        },
        {
            label: 'View',
            submenu: [
                {
                    label: 'Expand All',
                    accelerator: 'CmdOrCtrl+E',
                    click: () => mainWindow.webContents.send('menu-action', 'expand-all')
                },
                {
                    label: 'Collapse All',
                    accelerator: 'CmdOrCtrl+Shift+E',
                    click: () => mainWindow.webContents.send('menu-action', 'collapse-all')
                },
                { type: 'separator' },
                {
                    label: 'Toggle Developer Tools',
                    accelerator: 'F12',
                    click: () => mainWindow.webContents.toggleDevTools()
                },
                {
                    label: 'Reload',
                    accelerator: 'CmdOrCtrl+R',
                    click: () => mainWindow.reload()
                }
            ]
        },
        {
            label: 'WebSocket',
            submenu: [
                {
                    label: 'Start Server',
                    click: () => startWebSocketServer()
                },
                {
                    label: 'Stop Server',
                    click: () => stopWebSocketServer()
                },
                { type: 'separator' },
                {
                    label: 'Configure...',
                    click: () => configureWebSocket()
                },
                { type: 'separator' },
                {
                    label: `Port: ${wsPort}`,
                    enabled: false,
                    id: 'ws-port-label'
                }
            ]
        },
        {
            label: 'Help',
            submenu: [
                {
                    label: 'Check for Updates...',
                    click: () => {
                        checkForUpdates(true);
                        mainWindow.webContents.send('show-update-panel');
                    }
                },
                { type: 'separator' },
                {
                    label: `Version ${app.getVersion()}`,
                    enabled: false
                },
                {
                    label: 'About Folder Architect',
                    click: () => showAbout()
                }
            ]
        }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}

async function importTemplate() {
    const result = await dialog.showOpenDialog(mainWindow, {
        title: 'Import Template',
        filters: [
            { name: 'JSON Templates', extensions: ['json'] }
        ],
        properties: ['openFile']
    });

    if (!result.canceled && result.filePaths.length > 0) {
        try {
            const content = fs.readFileSync(result.filePaths[0], 'utf8');
            const data = JSON.parse(content);
            mainWindow.webContents.send('import-template', data);
        } catch (err) {
            dialog.showErrorBox('Import Error', 'Failed to import template: ' + err.message);
        }
    }
}

function showAbout() {
    const version = app.getVersion();
    dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: 'About Folder Architect',
        message: `Folder Architect v${version}`,
        detail: 'A powerful folder structure builder.\n\nCreate any folder structure with infinite subfolders.\nSave templates, apply naming conventions, and create folders instantly.\n\nBuilt with love for professionals.\n\nhttps://github.com/Sean4E/FolderArchitect'
    });
}

// ========== FOLDER SELECTION ==========
// Select a destination folder

ipcMain.handle('select-folder', async (event) => {
    const result = await dialog.showOpenDialog(mainWindow, {
        title: 'Select Destination Folder',
        properties: ['openDirectory', 'createDirectory'],
        buttonLabel: 'Select Folder'
    });

    if (result.canceled) {
        return { success: false };
    }

    return { success: true, path: result.filePaths[0] };
});

// ========== FOLDER CREATION ==========
// This is the core functionality - create folders directly without terminal

ipcMain.handle('create-folders', async (event, options) => {
    const { paths, targetDirectory } = options;

    try {
        // Select directory if not provided
        let targetDir = targetDirectory;
        if (!targetDir) {
            const result = await dialog.showOpenDialog(mainWindow, {
                title: 'Select Location for Folder Structure',
                properties: ['openDirectory', 'createDirectory'],
                buttonLabel: 'Create Here'
            });

            if (result.canceled) {
                return { success: false, message: 'Cancelled by user' };
            }
            targetDir = result.filePaths[0];
        }

        // Create all folders
        let created = 0;
        let errors = [];

        for (const folderPath of paths) {
            const fullPath = path.join(targetDir, folderPath);
            try {
                fs.mkdirSync(fullPath, { recursive: true });
                created++;
            } catch (err) {
                errors.push({ path: folderPath, error: err.message });
            }
        }

        // Send success to WebSocket clients if connected
        broadcastToClients({
            type: 'folders-created',
            created,
            targetDir,
            errors
        });

        return {
            success: true,
            created,
            targetDir,
            errors,
            message: `Created ${created} folders in ${targetDir}`
        };

    } catch (err) {
        return { success: false, message: err.message };
    }
});

// Handle saving files (templates, exports)
ipcMain.handle('save-file', async (event, options) => {
    const { content, defaultName, filters } = options;

    const result = await dialog.showSaveDialog(mainWindow, {
        title: 'Save File',
        defaultPath: defaultName,
        filters: filters || [{ name: 'All Files', extensions: ['*'] }]
    });

    if (!result.canceled) {
        try {
            fs.writeFileSync(result.filePath, content, 'utf8');
            return { success: true, filePath: result.filePath };
        } catch (err) {
            return { success: false, error: err.message };
        }
    }
    return { success: false, cancelled: true };
});

// Handle reading files
ipcMain.handle('read-file', async (event, filePath) => {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        return { success: true, content };
    } catch (err) {
        return { success: false, error: err.message };
    }
});

// ========== WEBSOCKET SERVER ==========

async function configureWebSocket() {
    // Use a simple prompt via dialog
    const { response, checkboxChecked } = await dialog.showMessageBox(mainWindow, {
        type: 'question',
        title: 'Configure WebSocket',
        message: `Current Settings:\nPort: ${wsPort}\nIdentifier: ${wsIdentifier}\n\nTo change settings, edit the port via the renderer settings panel.`,
        buttons: ['OK'],
        defaultId: 0
    });
}

// Handler for setting port from renderer
ipcMain.handle('set-ws-port', async (event, port) => {
    const newPort = parseInt(port, 10);
    if (newPort >= 1024 && newPort <= 65535) {
        wsPort = newPort;
        createMenu(); // Refresh menu to show new port
        return { success: true, port: wsPort };
    }
    return { success: false, error: 'Port must be between 1024 and 65535' };
});

ipcMain.handle('set-ws-identifier', async (event, identifier) => {
    if (identifier && identifier.length > 0) {
        wsIdentifier = identifier;
        return { success: true, identifier: wsIdentifier };
    }
    return { success: false, error: 'Identifier cannot be empty' };
});

ipcMain.handle('get-ws-config', async () => {
    return { port: wsPort, identifier: wsIdentifier, isRunning: wsServer !== null };
});

// Direct handlers for start/stop from renderer
ipcMain.handle('start-ws-server', async () => {
    startWebSocketServer();
    return { success: true };
});

ipcMain.handle('stop-ws-server', async () => {
    stopWebSocketServer();
    return { success: true };
});

function startWebSocketServer() {
    if (wsServer) {
        mainWindow.webContents.send('ws-status', { status: 'already-running', port: wsPort });
        return;
    }

    try {
        wsServer = new WebSocket.Server({ port: wsPort });

        wsServer.on('connection', (ws) => {
            wsClients.add(ws);
            console.log('WebSocket client connected');

            // Send welcome message with server identifier
            ws.send(JSON.stringify({
                type: 'welcome',
                identifier: wsIdentifier,
                port: wsPort
            }));

            // Send current state to new client
            mainWindow.webContents.send('get-current-state');

            ws.on('message', (message) => {
                try {
                    const data = JSON.parse(message);
                    handleWebSocketMessage(data, ws);
                } catch (err) {
                    console.error('WebSocket message error:', err);
                }
            });

            ws.on('close', () => {
                wsClients.delete(ws);
                console.log('WebSocket client disconnected');
            });

            ws.on('error', (err) => {
                console.error('WebSocket error:', err);
                wsClients.delete(ws);
            });
        });

        wsServer.on('listening', () => {
            mainWindow.webContents.send('ws-status', { status: 'started', port: wsPort, identifier: wsIdentifier });
            console.log(`WebSocket server started on port ${wsPort} (${wsIdentifier})`);
        });

        wsServer.on('error', (err) => {
            mainWindow.webContents.send('ws-status', { status: 'error', error: err.message });
            console.error('WebSocket server error:', err);
        });

    } catch (err) {
        mainWindow.webContents.send('ws-status', { status: 'error', error: err.message });
    }
}

function stopWebSocketServer() {
    if (wsServer) {
        // Close all clients
        wsClients.forEach(ws => ws.close());
        wsClients.clear();

        wsServer.close(() => {
            wsServer = null;
            sendToRenderer('ws-status', { status: 'stopped' });
            console.log('WebSocket server stopped');
        });
    }
}

function handleWebSocketMessage(data, ws) {
    switch (data.type) {
        case 'load-template':
            sendToRenderer('ws-load-template', data.template);
            break;
        case 'create-folders':
            sendToRenderer('ws-create-folders', data);
            break;
        case 'get-templates':
            sendToRenderer('ws-get-templates');
            break;
        case 'get-state':
            // Client requesting current state
            sendToRenderer('get-current-state');
            break;
        case 'sync-state':
            // Broadcast state to all other clients
            broadcastToClients(data, ws);
            break;
        case 'template-added':
            // Broadcast new template to all clients and notify renderer
            sendToRenderer('ws-template-added', data.template);
            broadcastToClients(data, ws);
            break;
        case 'template-deleted':
            // Broadcast template deletion to all clients and notify renderer
            sendToRenderer('ws-template-deleted', data.templateId);
            broadcastToClients(data, ws);
            break;
        case 'auth-session':
            // Receive auth session from web client (Google sign-in)
            handleAuthSessionFromWeb(data.session);
            break;
    }
}

// Handle auth session received from web client via WebSocket
async function handleAuthSessionFromWeb(session) {
    if (!supabase || !session) return;

    try {
        // Set the session in Supabase client
        const { data, error } = await supabase.auth.setSession({
            access_token: session.access_token,
            refresh_token: session.refresh_token
        });

        if (error) {
            console.error('Failed to set auth session:', error);
            return;
        }

        if (data.user) {
            currentUser = data.user;
            sendToRenderer('supabase-auth-change', { user: currentUser });
            startSupabaseRealtime();
            console.log('Auth session received from web, user:', currentUser.email);
        }
    } catch (e) {
        console.error('Error setting auth session:', e);
    }
}

function broadcastToClients(data, excludeClient = null) {
    const message = JSON.stringify(data);
    wsClients.forEach(client => {
        if (client !== excludeClient && client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}

// Handle state updates from renderer
ipcMain.on('broadcast-state', (event, state) => {
    broadcastToClients({
        type: 'state-update',
        ...state
    });
});

ipcMain.on('send-templates', (event, templates) => {
    broadcastToClients({
        type: 'templates',
        templates
    });
});

// Handle template sync from renderer (when user saves/deletes a template)
ipcMain.on('broadcast-template-added', (event, template) => {
    broadcastToClients({
        type: 'template-added',
        template
    });
});

ipcMain.on('broadcast-template-deleted', (event, templateId) => {
    broadcastToClients({
        type: 'template-deleted',
        templateId
    });
});

// ========== SUPABASE IPC HANDLERS ==========

ipcMain.handle('supabase-signin', async (event, email, password) => {
    if (!supabase) return { error: 'Supabase not configured' };
    try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) return { error: error.message };
        currentUser = data.user;
        sendToRenderer('supabase-auth-change', { user: currentUser });
        startSupabaseRealtime();
        return { user: currentUser };
    } catch (e) {
        return { error: e.message };
    }
});

ipcMain.handle('supabase-signup', async (event, email, password) => {
    if (!supabase) return { error: 'Supabase not configured' };
    try {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) return { error: error.message };
        return { user: data.user, message: 'Check your email to verify your account' };
    } catch (e) {
        return { error: e.message };
    }
});

ipcMain.handle('supabase-signin-google', async () => {
    if (!supabase) return { error: 'Supabase not configured' };
    try {
        // Auto-start WebSocket server if not running
        if (!wsServer) {
            startWebSocketServer(wsPort, wsIdentifier);
        }

        // Add desktop flag to redirect URL so web knows to send auth back
        const redirectUrl = `https://sean4e.github.io/FolderArchitect/?desktop_auth=true&ws_port=${wsPort}`;

        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: redirectUrl
            }
        });
        if (error) return { error: error.message };
        // Open the OAuth URL in external browser
        if (data?.url) {
            require('electron').shell.openExternal(data.url);
        }
        return { success: true, message: 'Complete sign-in in your browser - you will be signed in automatically' };
    } catch (e) {
        return { error: e.message };
    }
});

ipcMain.handle('supabase-signout', async () => {
    if (!supabase) return { error: 'Supabase not configured' };
    try {
        await supabase.auth.signOut();
        currentUser = null;
        stopSupabaseRealtime();
        sendToRenderer('supabase-auth-change', { user: null });
        return { success: true };
    } catch (e) {
        return { error: e.message };
    }
});

ipcMain.handle('supabase-get-session', async () => {
    if (!supabase) return { user: null };
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
            currentUser = session.user;
            return { user: currentUser };
        }
        return { user: null };
    } catch (e) {
        return { user: null };
    }
});

ipcMain.handle('supabase-load-templates', async () => {
    if (!supabase || !currentUser) return { templates: [], error: 'Not authenticated' };
    try {
        const { data, error } = await supabase
            .from('templates')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('updated_at', { ascending: false });
        if (error) return { templates: [], error: error.message };
        return { templates: data };
    } catch (e) {
        return { templates: [], error: e.message };
    }
});

ipcMain.handle('supabase-upload-template', async (event, template) => {
    if (!supabase || !currentUser) return { error: 'Not authenticated' };
    try {
        console.log('Uploading template to Supabase:', template.name);
        const { error } = await supabase
            .from('templates')
            .upsert({
                id: template.id,
                user_id: currentUser.id,
                name: template.name,
                description: template.description || '',
                structure: template.structure,
                updated_at: new Date(template.updatedAt || Date.now()).toISOString()
            }, { onConflict: 'id' });
        if (error) {
            console.error('Supabase upload error:', error);
            return { error: error.message };
        }
        console.log('Template uploaded successfully:', template.name);
        return { success: true };
    } catch (e) {
        console.error('Upload exception:', e);
        return { error: e.message };
    }
});

ipcMain.handle('supabase-update-template', async (event, template) => {
    if (!supabase || !currentUser) return { error: 'Not authenticated' };
    try {
        console.log('Updating template in Supabase:', template.name);
        const { error } = await supabase
            .from('templates')
            .update({
                name: template.name,
                description: template.description || '',
                structure: template.structure,
                updated_at: new Date(template.updatedAt || Date.now()).toISOString()
            })
            .eq('id', template.id)
            .eq('user_id', currentUser.id);
        if (error) return { error: error.message };
        return { success: true };
    } catch (e) {
        return { error: e.message };
    }
});

ipcMain.handle('supabase-delete-template', async (event, templateId) => {
    if (!supabase || !currentUser) return { error: 'Not authenticated' };
    try {
        const { error } = await supabase
            .from('templates')
            .delete()
            .eq('id', templateId)
            .eq('user_id', currentUser.id);
        if (error) return { error: error.message };
        return { success: true };
    } catch (e) {
        return { error: e.message };
    }
});

let realtimeStatus = 'DISCONNECTED';

function startSupabaseRealtime() {
    if (!supabase || !currentUser) {
        console.log('Cannot start realtime: supabase=', !!supabase, 'currentUser=', !!currentUser);
        return;
    }

    // Stop existing subscription first
    stopSupabaseRealtime();

    console.log('Starting Supabase realtime for user:', currentUser.id);
    realtimeStatus = 'CONNECTING';

    realtimeSubscription = supabase
        .channel('desktop-templates-' + Date.now())
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'templates',
                filter: `user_id=eq.${currentUser.id}`
            },
            (payload) => {
                console.log('=== REALTIME EVENT FROM SUPABASE ===');
                console.log('Event type:', payload.eventType);
                console.log('New data:', payload.new);
                console.log('Old data:', payload.old);
                // Format payload for renderer
                const formattedPayload = {
                    eventType: payload.eventType,
                    record: payload.new || payload.old
                };
                sendToRenderer('supabase-template-change', formattedPayload);
            }
        )
        .subscribe((status, err) => {
            realtimeStatus = status;
            console.log('Realtime subscription status:', status);
            // Also send status to renderer for debugging
            sendToRenderer('realtime-status', { status, error: err?.message });
            if (err) {
                console.error('Realtime subscription error:', err);
            }
            if (status === 'SUBSCRIBED') {
                console.log('✓ Desktop realtime connected and listening for template changes');
            } else if (status === 'CHANNEL_ERROR') {
                console.error('Realtime channel error - check RLS policies');
            } else if (status === 'TIMED_OUT') {
                console.error('Realtime connection timed out');
            }
        });
}

function stopSupabaseRealtime() {
    if (realtimeSubscription) {
        supabase.removeChannel(realtimeSubscription);
        realtimeSubscription = null;
    }
}

// ========== APP LIFECYCLE ==========

app.whenReady().then(async () => {
    createWindow();

    // Initialize Supabase
    initSupabase();

    // Setup auto-updater
    setupAutoUpdater();

    // Check for updates after a short delay (don't block startup)
    setTimeout(() => {
        checkForUpdates();
    }, 3000);

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    stopWebSocketServer();
    stopSupabaseRealtime();
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('before-quit', () => {
    stopWebSocketServer();
});
