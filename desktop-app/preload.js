const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
    // Folder creation - the main feature!
    createFolders: (options) => ipcRenderer.invoke('create-folders', options),

    // Folder selection
    selectFolder: () => ipcRenderer.invoke('select-folder'),

    // File operations
    saveFile: (options) => ipcRenderer.invoke('save-file', options),
    readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),

    // Menu actions
    onMenuAction: (callback) => ipcRenderer.on('menu-action', (event, action) => callback(action)),

    // Import template
    onImportTemplate: (callback) => ipcRenderer.on('import-template', (event, data) => callback(data)),

    // WebSocket status
    onWSStatus: (callback) => ipcRenderer.on('ws-status', (event, status) => callback(status)),

    // WebSocket commands from external clients
    onWSLoadTemplate: (callback) => ipcRenderer.on('ws-load-template', (event, template) => callback(template)),
    onWSCreateFolders: (callback) => ipcRenderer.on('ws-create-folders', (event, data) => callback(data)),
    onWSGetTemplates: (callback) => ipcRenderer.on('ws-get-templates', () => callback()),

    // Get current state for WebSocket sync
    onGetCurrentState: (callback) => ipcRenderer.on('get-current-state', () => callback()),

    // Broadcast state to WebSocket clients
    broadcastState: (state) => ipcRenderer.send('broadcast-state', state),
    sendTemplates: (templates) => ipcRenderer.send('send-templates', templates),

    // Platform info
    platform: process.platform
});
