import React from 'react';

// Componente de prueba muy simple
function TestApp() {
  const [count, setCount] = React.useState(0);
  
  React.useEffect(() => {
    console.log('✅ React se ha montado correctamente');
    console.log('✅ useState funciona');
    console.log('✅ useEffect funciona');
    
    // Verificar si estamos en Electron
    if (window.electronAPI) {
      console.log('✅ Electron API disponible');
    } else {
      console.log('⚠️  Electron API no disponible');
    }
    
    // Verificar errores de JavaScript
    window.addEventListener('error', (event) => {
      console.error('❌ Error JavaScript:', event.error);
    });
    
    window.addEventListener('unhandledrejection', (event) => {
      console.error('❌ Promesa rechazada:', event.reason);
    });
  }, []);
  
  const styles = {
    container: {
      fontFamily: 'Arial, sans-serif',
      padding: '40px',
      textAlign: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      minHeight: '100vh',
      color: 'white',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center'
    },
    title: {
      fontSize: '3rem',
      marginBottom: '2rem',
      textShadow: '2px 2px 4px rgba(0,0,0,0.3)'
    },
    status: {
      background: 'rgba(255,255,255,0.1)',
      padding: '20px',
      borderRadius: '10px',
      marginBottom: '20px',
      backdropFilter: 'blur(10px)',
      border: '1px solid rgba(255,255,255,0.2)',
      maxWidth: '600px'
    },
    button: {
      background: '#4caf50',
      color: 'white',
      border: 'none',
      padding: '15px 30px',
      borderRadius: '25px',
      fontSize: '1.1rem',
      cursor: 'pointer',
      margin: '10px',
      transition: 'background 0.3s'
    },
    counter: {
      fontSize: '2rem',
      margin: '20px 0',
      fontWeight: 'bold'
    }
  };
  
  const handleTestElectron = async () => {
    try {
      if (window.electronAPI && window.electronAPI.getAppInfo) {
        const info = await window.electronAPI.getAppInfo();
        console.log('🔍 Info de la aplicación:', info);
        alert(`Electron funciona!\nVersión: ${info.version}\nPlataforma: ${info.platform}`);
      } else {
        alert('Electron API no disponible');
      }
    } catch (error) {
      console.error('Error probando Electron:', error);
      alert(`Error: ${error.message}`);
    }
  };
  
  const handleTestConsole = () => {
    console.log('🧪 Prueba de consola - React funcionando correctamente');
    console.log('📊 Estado actual:', { count });
    console.log('🌐 Window object:', window);
    console.log('📍 Location:', window.location);
  };
  
  return (
    <div style={styles.container}>
      <h1 style={styles.title}>🌱 AgroGestión - Prueba de Funcionamiento</h1>
      
      <div style={styles.status}>
        <h3>Estado del Sistema</h3>
        <p>✅ React cargado y funcionando</p>
        <p>✅ JavaScript ejecutándose</p>
        <p>✅ CSS aplicándose correctamente</p>
        <p>{window.electronAPI ? '✅' : '❌'} Electron API {window.electronAPI ? 'disponible' : 'no disponible'}</p>
        <p>📱 User Agent: {navigator.userAgent}</p>
        <p>🌐 URL actual: {window.location.href}</p>
      </div>
      
      <div style={styles.counter}>
        Contador: {count}
      </div>
      
      <div>
        <button 
          style={styles.button}
          onClick={() => setCount(count + 1)}
          onMouseOver={(e) => e.target.style.background = '#45a049'}
          onMouseOut={(e) => e.target.style.background = '#4caf50'}
        >
          ➕ Incrementar Contador
        </button>
        
        <button 
          style={styles.button}
          onClick={handleTestElectron}
          onMouseOver={(e) => e.target.style.background = '#45a049'}
          onMouseOut={(e) => e.target.style.background = '#4caf50'}
        >
          🔧 Probar Electron API
        </button>
        
        <button 
          style={styles.button}
          onClick={handleTestConsole}
          onMouseOver={(e) => e.target.style.background = '#45a049'}
          onMouseOut={(e) => e.target.style.background = '#4caf50'}
        >
          📝 Escribir en Consola
        </button>
        
        <button 
          style={styles.button}
          onClick={() => window.location.reload()}
          onMouseOver={(e) => e.target.style.background = '#45a049'}
          onMouseOut={(e) => e.target.style.background = '#4caf50'}
        >
          🔄 Recargar Página
        </button>
      </div>
      
      <div style={styles.status}>
        <h3>Información Técnica</h3>
        <p><strong>Protocolo:</strong> {window.location.protocol}</p>
        <p><strong>Host:</strong> {window.location.host}</p>
        <p><strong>Pathname:</strong> {window.location.pathname}</p>
        <p><strong>Electron:</strong> {window.electronAPI ? 'Sí' : 'No'}</p>
        <p><strong>React Version:</strong> {React.version}</p>
      </div>
    </div>
  );
}

export default TestApp;