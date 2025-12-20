const { app, BrowserWindow, ipcMain, dialog, Menu, Tray, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const WebSocket = require('ws');

let mainWindow;
let tray = null;
let wsServer = null;
let wsClients = new Set();

// WebSocket server settings
const WS_PORT = 9876;

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
                    label: `Server Port: ${WS_PORT}`,
                    enabled: false
                }
            ]
        },
        {
            label: 'Help',
            submenu: [
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
    dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: 'About Folder Architect',
        message: 'Folder Architect v1.0.0',
        detail: 'A powerful folder structure builder.\n\nCreate any folder structure with infinite subfolders.\nSave templates, apply naming conventions, and create folders instantly.\n\nBuilt with love for professionals.'
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

function startWebSocketServer() {
    if (wsServer) {
        mainWindow.webContents.send('ws-status', { status: 'already-running', port: WS_PORT });
        return;
    }

    try {
        wsServer = new WebSocket.Server({ port: WS_PORT });

        wsServer.on('connection', (ws) => {
            wsClients.add(ws);
            console.log('WebSocket client connected');

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
            mainWindow.webContents.send('ws-status', { status: 'started', port: WS_PORT });
            console.log(`WebSocket server started on port ${WS_PORT}`);
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
            mainWindow.webContents.send('ws-status', { status: 'stopped' });
            console.log('WebSocket server stopped');
        });
    }
}

function handleWebSocketMessage(data, ws) {
    switch (data.type) {
        case 'load-template':
            mainWindow.webContents.send('ws-load-template', data.template);
            break;
        case 'create-folders':
            mainWindow.webContents.send('ws-create-folders', data);
            break;
        case 'get-templates':
            mainWindow.webContents.send('ws-get-templates');
            break;
        case 'sync-state':
            // Broadcast state to all other clients
            broadcastToClients(data, ws);
            break;
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

// ========== APP LIFECYCLE ==========

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    stopWebSocketServer();
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('before-quit', () => {
    stopWebSocketServer();
});
