const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const log = require('electron-log');
const { registerRailwayHandlers, unregisterRailwayHandlers } = require('./railwayHandlers');

// Determinar modo desarrollo de forma robusta - CORREGIDO
const isDev = process.env.NODE_ENV === 'development' || 
               process.env.ELECTRON_IS_DEV === 'true';

// Configuración del log con manejo de errores
try {
  log.transports.file.level = 'info';
  log.transports.file.maxSize = 5 * 1024 * 1024; // 5MB max
  log.transports.console.level = isDev ? 'debug' : 'info';
} catch (error) {
  console.error('Error configurando logs:', error);
}

// Log inicial con información de debug
console.log('=== AgroGestión iniciando ===');
console.log(`Modo desarrollo: ${isDev}`);
console.log(`App isPackaged: ${app.isPackaged}`);
console.log(`__dirname: ${__dirname}`);
console.log(`process.cwd(): ${process.cwd()}`);
console.log(`app.getAppPath(): ${app.getAppPath()}`);
console.log(`process.resourcesPath: ${process.resourcesPath}`);

let mainWindow;

// Función para verificar si un archivo existe
function fileExists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch (error) {
    console.warn(`Error verificando archivo ${filePath}:`, error.message);
    return false;
  }
}

// Función para obtener la ruta del preload de forma segura
function getPreloadPath() {
  const possiblePaths = [
    path.join(__dirname, 'preload.js'),
    path.join(__dirname, '../public/preload.js'),
    path.join(process.resourcesPath, 'app/public/preload.js'),
    path.join(app.getAppPath(), 'public/preload.js'),
    path.join(app.getAppPath(), 'preload.js')
  ];
  
  console.log('Buscando preload.js en las siguientes ubicaciones:');
  for (const preloadPath of possiblePaths) {
    console.log(`  - ${preloadPath}: ${fileExists(preloadPath) ? 'ENCONTRADO' : 'No encontrado'}`);
    if (fileExists(preloadPath)) {
      console.log(`✅ Usando preload: ${preloadPath}`);
      return preloadPath;
    }
  }
  
  console.error('❌ No se encontró preload.js en ninguna ubicación');
  // Devolver una ruta por defecto aunque no exista
  return path.join(__dirname, 'preload.js');
}

// Función para obtener la URL de inicio
function getStartUrl() {
  if (isDev) {
    console.log('Modo desarrollo: usando localhost:3000');
    return 'http://localhost:3000';
  }
  
  // En producción, React build genera el index.html en build/
  // La estructura después del empaquetado puede variar
  const possiblePaths = [
    // Ruta estándar en aplicaciones React empaquetadas
    path.join(app.getAppPath(), 'build/index.html'),
    
    // Rutas alternativas basadas en la estructura real
    path.join(__dirname, '../build/index.html'),
    path.join(__dirname, 'build/index.html'),
    
    // Si está en el directorio de recursos
    path.join(process.resourcesPath, 'app/build/index.html'),
    
    // Otras posibles ubicaciones
    path.join(app.getAppPath(), '../build/index.html'),
    path.join(app.getAppPath(), '../../build/index.html')
  ];
  
  console.log('Buscando index.html en las siguientes ubicaciones:');
  for (const indexPath of possiblePaths) {
    console.log(`  - ${indexPath}: ${fileExists(indexPath) ? 'ENCONTRADO' : 'No encontrado'}`);
    if (fileExists(indexPath)) {
      const fileUrl = `file://${indexPath.replace(/\\/g, '/')}`;
      console.log(`✅ Usando URL: ${fileUrl}`);
      return fileUrl;
    }
  }
  
  // Log de debug adicional
  console.log('\n=== DEBUG ADICIONAL ===');
  console.log(`App.getAppPath(): ${app.getAppPath()}`);
  console.log(`__dirname: ${__dirname}`);
  console.log(`process.resourcesPath: ${process.resourcesPath}`);
  
  // Intentar listar contenido del app path
  try {
    const appPath = app.getAppPath();
    const appContents = fs.readdirSync(appPath);
    console.log(`Contenido de app path: ${appContents.join(', ')}`);
    
    // Buscar específicamente directorios build
    appContents.forEach(item => {
      if (item === 'build' || item.includes('build')) {
        const buildPath = path.join(appPath, item);
        console.log(`Encontrado directorio relacionado con build: ${buildPath}`);
        try {
          const buildContents = fs.readdirSync(buildPath);
          console.log(`  Contenido: ${buildContents.join(', ')}`);
        } catch (e) {
          console.log(`  Error leyendo contenido: ${e.message}`);
        }
      }
    });
  } catch (error) {
    console.log(`Error listando app path: ${error.message}`);
  }
  
  console.error('❌ No se encontró index.html en ninguna ubicación');
  return null;
}

// Función para mostrar página de error
function showErrorPage() {
  const errorHtml = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Error - AgroGestión</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
        .container {
          max-width: 600px;
          background: rgba(255,255,255,0.1);
          padding: 40px;
          border-radius: 20px;
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255,255,255,0.2);
          text-align: center;
        }
        h1 { color: #ffeb3b; margin-bottom: 20px; font-size: 2.5em; }
        .error-details {
          background: rgba(0,0,0,0.3);
          padding: 20px;
          border-radius: 10px;
          margin: 20px 0;
          text-align: left;
          font-family: 'Courier New', monospace;
          font-size: 0.9em;
        }
        .reload-btn {
          background: #4caf50;
          color: white;
          border: none;
          padding: 15px 30px;
          border-radius: 25px;
          font-size: 1.1em;
          cursor: pointer;
          margin: 20px 10px;
          transition: background 0.3s;
        }
        .reload-btn:hover { background: #45a049; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🌱 AgroGestión</h1>
        <p><strong>Error al cargar la aplicación</strong></p>
        
        <div class="error-details">
          <strong>Información de debug:</strong><br>
          App Path: ${app.getAppPath()}<br>
          __dirname: ${__dirname}<br>
          Is Packaged: ${app.isPackaged}<br>
          Platform: ${process.platform}<br>
          Version: ${app.getVersion()}
        </div>
        
        <button class="reload-btn" onclick="location.reload()">🔄 Reintentar</button>
        <button class="reload-btn" onclick="require('electron').remote.app.quit()">❌ Cerrar</button>
      </div>
      
      <script>
        // Intentar recargar automáticamente después de 5 segundos
        setTimeout(() => {
          console.log('Reintentando carga automática...');
          location.reload();
        }, 5000);
      </script>
    </body>
    </html>
  `;
  
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(errorHtml)}`);
  }
}

// Función para crear la ventana principal
function createWindow() {
  console.log('🔨 Creando ventana principal...');
  
  try {
    // Crear la ventana del navegador con configuración mínima
    mainWindow = new BrowserWindow({
      width: 1280,
      height: 800,
      minWidth: 800,
      minHeight: 600,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: getPreloadPath(),
        webSecurity: !isDev,
        allowRunningInsecureContent: false,
      },
      show: false,
      backgroundColor: '#2e7d32',
      titleBarStyle: 'default',
      autoHideMenuBar: !isDev,
    });

    console.log('✅ Ventana creada exitosamente');

    // Maximizar la ventana
    mainWindow.maximize();

    // Obtener la URL de inicio
    const startUrl = getStartUrl();
    
    if (!startUrl) {
      console.error('❌ No se pudo determinar la URL de inicio');
      showErrorPage();
      return;
    }

    console.log(`🌐 Cargando URL: ${startUrl}`);
    
    // Cargar la aplicación con manejo de errores
    mainWindow.loadURL(startUrl).then(() => {
      console.log('✅ URL cargada exitosamente');
    }).catch(error => {
      console.error('❌ Error cargando URL:', error);
      showErrorPage();
    });

    // Mostrar la ventana una vez que esté lista
    mainWindow.once('ready-to-show', () => {
      console.log('✅ Ventana lista para mostrar');
      mainWindow.show();
      
      // En desarrollo, abrir DevTools
      if (isDev) {
        mainWindow.webContents.openDevTools();
      }
    });

    // TEMPORAL: Atajo para abrir DevTools con F12
    mainWindow.webContents.on('before-input-event', (event, input) => {
      if (input.key === 'F12') {
        mainWindow.webContents.toggleDevTools();
      }
    });

    // Manejar errores de carga
    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
      console.error(`❌ Error de carga: ${errorCode} - ${errorDescription} - URL: ${validatedURL}`);
      showErrorPage();
    });

    // Manejar crashes
    mainWindow.webContents.on('render-process-gone', (event, details) => {
      console.error('❌ Proceso de renderizado terminado:', details);
      if (details.reason !== 'clean-exit') {
        console.log('🔄 Intentando recargar automáticamente...');
        setTimeout(() => {
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.reload();
          }
        }, 1000);
      }
    });

    // Gestionar el cierre de la ventana
    mainWindow.on('closed', () => {
      console.log('🔒 Ventana cerrada');
      mainWindow = null;
    });

    // Manejar navegación externa
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
      console.log(`🔗 Intento de abrir URL externa: ${url}`);
      require('electron').shell.openExternal(url);
      return { action: 'deny' };
    });

  } catch (error) {
    console.error('❌ Error crítico creando ventana:', error);
    dialog.showErrorBox(
      'Error crítico',
      `No se pudo crear la ventana principal: ${error.message}`
    );
    app.quit();
  }
}

// Prevenir múltiples instancias
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  console.log('🚫 Ya hay una instancia ejecutándose');
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

// Configurar comportamiento de la aplicación
app.commandLine.appendSwitch('disable-web-security'); // Solo para debug
app.commandLine.appendSwitch('--no-sandbox'); // Ayuda con algunos problemas de seguridad

// Inicializar la aplicación - CORREGIDO
app.whenReady().then(() => {
  console.log('🚀 App ready, creando ventana...');
  
  try {
    registerRailwayHandlers();
    console.log('✅ Railway handlers registrados exitosamente');
  } catch (error) {
    console.error('❌ Error registrando Railway handlers:', error);
  }
  
  createWindow();
});

// Salir cuando todas las ventanas estén cerradas
app.on('window-all-closed', () => {
  console.log('🔚 Todas las ventanas cerradas');
  try {
    unregisterRailwayHandlers();
  } catch (error) {
    console.error('❌ Error en cleanup Railway:', error);
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// === MANEJADORES IPC BÁSICOS ===
ipcMain.handle('get-app-info', () => {
  return {
    version: app.getVersion(),
    name: app.getName(),
    isPackaged: app.isPackaged,
    platform: process.platform,
    isDev: isDev
  };
});

// === MANEJO DE ERRORES GLOBALES ===
process.on('uncaughtException', (error) => {
  console.error('❌ Error no controlado:', error);
  if (mainWindow && !mainWindow.isDestroyed()) {
    dialog.showErrorBox(
      'Error en AgroGestión',
      `Error inesperado: ${error.message}\n\nLa aplicación intentará continuar funcionando.`
    );
  }
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Promesa rechazada:', reason);
});

app.on('before-quit', (event) => {
  console.log('🧹 Limpiando Railway antes de cerrar...');
  try {
    unregisterRailwayHandlers();
  } catch (error) {
    console.error('❌ Error en cleanup Railway:', error);
  }
});

// Log final
console.log('📄 Archivo electron.js cargado completamente');