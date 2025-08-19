import React from 'react';
import ReactDOM from 'react-dom/client';

// CSS mínimo - crear un archivo básico que funcione
import './index.css';

// Tu aplicación principal de AgroGestión
import App from './App';

// Logs de inicialización MÁS DETALLADOS
console.log('🚀 === INICIANDO AGROGESTION DEBUG ===');
console.log('📍 Location:', window.location.href);
console.log('⚛️  React version:', React.version);
console.log('🌐 User Agent:', navigator.userAgent);
console.log('💻 Platform:', navigator.platform);

// Verificar elemento root ANTES de todo
console.log('🔍 Buscando elemento root...');
const rootElement = document.getElementById('root');
if (rootElement) {
  console.log('✅ Elemento root encontrado:', rootElement);
  console.log('📏 Root innerHTML length:', rootElement.innerHTML.length);
  console.log('📏 Root offsetWidth:', rootElement.offsetWidth);
  console.log('📏 Root offsetHeight:', rootElement.offsetHeight);
} else {
  console.error('❌ Elemento root NO encontrado');
  // Crear elemento root manualmente
  const newRoot = document.createElement('div');
  newRoot.id = 'root';
  newRoot.style.width = '100%';
  newRoot.style.height = '100vh';
  document.body.appendChild(newRoot);
  console.log('🔧 Elemento root creado manualmente');
}

// Verificar document.body
console.log('📄 Document body:', document.body);
console.log('📄 Document readyState:', document.readyState);

// Capturar TODOS los errores posibles
window.addEventListener('error', (event) => {
  console.error('❌ Error JavaScript global:', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    error: event.error
  });
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('❌ Promesa rechazada global:', event.reason);
});

// Crear y renderizar la aplicación con máximo manejo de errores
try {
  console.log('🎯 Intentando crear React root...');
  
  const rootContainer = document.getElementById('root');
  if (!rootContainer) {
    throw new Error('No se encontró elemento root después de verificación');
  }
  
  const root = ReactDOM.createRoot(rootContainer);
  console.log('✅ React root creado exitosamente');
  
  console.log('🎯 Intentando renderizar App...');
  
  // Renderizar SIN StrictMode primero para debug
  root.render(<App />);
  
  console.log('✅ App renderizada - esperando montaje...');
  
  // Verificar después de un momento si se montó
  setTimeout(() => {
    const rootContent = document.getElementById('root');
    if (rootContent && rootContent.children.length > 0) {
      console.log('✅ ÉXITO: Contenido React montado correctamente');
      console.log('📊 Elementos hijos en root:', rootContent.children.length);
      console.log('📏 Contenido innerHTML length:', rootContent.innerHTML.length);
    } else {
      console.error('❌ FALLO: React no se montó después de renderizar');
      console.log('📊 Root children length:', rootContent ? rootContent.children.length : 'root no existe');
    }
  }, 2000);
  
} catch (error) {
  console.error('❌ ERROR CRÍTICO iniciando React:', error);
  console.error('❌ Stack:', error.stack);
  
  // Mostrar error directamente en el DOM sin React
  const errorDiv = document.createElement('div');
  errorDiv.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: #f44336;
    color: white;
    padding: 40px;
    font-family: Arial, sans-serif;
    text-align: center;
    display: flex;
    flex-direction: column;
    justify-content: center;
    z-index: 9999;
  `;
  
  errorDiv.innerHTML = `
    <h1>🌱 AgroGestión - Error Crítico</h1>
    <h2>❌ No se pudo iniciar React</h2>
    <div style="background: rgba(0,0,0,0.3); padding: 20px; border-radius: 10px; margin: 20px; font-family: monospace; text-align: left;">
      <strong>Error:</strong> ${error.message}<br><br>
      <strong>Stack:</strong><br>${error.stack}
    </div>
    <button onclick="location.reload()" style="background: #4caf50; color: white; border: none; padding: 15px 30px; border-radius: 25px; font-size: 1.1rem; cursor: pointer;">
      🔄 Recargar Aplicación
    </button>
    <p style="margin-top: 20px; opacity: 0.8;">Revisa la consola del desarrollador (F12) para más detalles</p>
  `;
  
  document.body.appendChild(errorDiv);
}

console.log('📄 === index.js PROCESADO COMPLETAMENTE ===');