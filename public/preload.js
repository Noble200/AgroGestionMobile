const { contextBridge, ipcRenderer } = require('electron');

// API segura expuesta al proceso de renderizado
contextBridge.exposeInMainWorld('electronAPI', {
  // Sistema de archivos - delegamos al main process
  readFile: (filePath) => ipcRenderer.invoke('fs-read-file', filePath),
  writeFile: (filePath, data) => ipcRenderer.invoke('fs-write-file', filePath, data),
  deleteFile: (filePath) => ipcRenderer.invoke('fs-delete-file', filePath),
  copyFile: (source, destination) => ipcRenderer.invoke('fs-copy-file', source, destination),
  readDir: (dirPath) => ipcRenderer.invoke('fs-read-dir', dirPath),
  pathExists: (path) => ipcRenderer.invoke('fs-path-exists', path),
  makeDir: (dirPath) => ipcRenderer.invoke('fs-make-dir', dirPath),
  
  // Obtener ruta del directorio de datos del usuario
  getUserDataPath: () => ipcRenderer.invoke('get-user-data-path'),
  
  // Diálogos de archivo
  showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),
  showOpenDialog: (options) => ipcRenderer.invoke('show-open-dialog', options),
  
  // Sistema
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  
  // Ventana
  minimizeWindow: () => ipcRenderer.send('minimize-window'),
  maximizeWindow: () => ipcRenderer.send('maximize-window'),
  closeWindow: () => ipcRenderer.send('close-window'),

  // === APIs DE RAILWAY ===
  railwayTestConnection: () => ipcRenderer.invoke('railway:test-connection'),
  railwaySavePdf: (fumigationData, pdfBufferArray, hasMapImage) => 
    ipcRenderer.invoke('railway:save-pdf', fumigationData, pdfBufferArray, hasMapImage),
  railwayDownloadPdf: (fumigationId) => 
    ipcRenderer.invoke('railway:download-pdf', fumigationId),
  railwayPdfExists: (fumigationId) => 
    ipcRenderer.invoke('railway:pdf-exists', fumigationId),
  railwayGetPdfMetadata: (fumigationId) => 
    ipcRenderer.invoke('railway:get-pdf-metadata', fumigationId),
  railwayDeletePdf: (fumigationId) => 
    ipcRenderer.invoke('railway:delete-pdf', fumigationId),

  // Generic invoke para compatibilidad
  invoke: (channel, ...args) => {
    const validChannels = [
      'railway:test-connection',
      'railway:save-pdf', 
      'railway:download-pdf',
      'railway:pdf-exists',
      'railway:get-pdf-metadata',
      'railway:delete-pdf'
    ];
    
    if (validChannels.includes(channel)) {
      return ipcRenderer.invoke(channel, ...args);
    } else {
      console.warn(`Canal IPC no reconocido: ${channel}`);
      return Promise.reject(new Error(`Canal IPC no permitido: ${channel}`));
    }
  }
});

// Comportamientos de seguridad adicionales
window.addEventListener('DOMContentLoaded', () => {
  // Sobrescribir console.log en producción para evitar fugas de información
  const isDev = process.env.NODE_ENV === 'development';
  if (!isDev) {
    const originalConsoleLog = console.log;
    console.log = (...args) => {
      originalConsoleLog('[AgroGestión]', ...args);
    };
  }
});