// src/components/ui/ErrorBoundary.js
import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('❌ ErrorBoundary capturó un error:', error, errorInfo);
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '40px',
          textAlign: 'center',
          background: '#f44336',
          color: 'white',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center'
        }}>
          <h1>🌱 AgroGestión - Error</h1>
          <h2>❌ Algo salió mal</h2>
          
          <div style={{
            background: 'rgba(0,0,0,0.3)',
            padding: '20px',
            borderRadius: '10px',
            margin: '20px',
            textAlign: 'left',
            fontFamily: 'monospace',
            fontSize: '14px'
          }}>
            <strong>Error:</strong><br/>
            {this.state.error && this.state.error.toString()}
            <br/><br/>
            <strong>Component Stack:</strong><br/>
            {/* 🔧 LÍNEA CORREGIDA para evitar el error de componentStack null */}
            {this.state.errorInfo && this.state.errorInfo.componentStack 
              ? this.state.errorInfo.componentStack 
              : 'No hay información del stack disponible'}
          </div>

          <div>
            <button 
              onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })}
              style={{
                background: '#4caf50',
                color: 'white',
                border: 'none',
                padding: '15px 30px',
                borderRadius: '25px',
                fontSize: '1.1rem',
                cursor: 'pointer',
                margin: '10px'
              }}
            >
              🔄 Intentar de nuevo
            </button>
            
            <button 
              onClick={() => window.location.reload()}
              style={{
                background: '#ff9800',
                color: 'white',
                border: 'none',
                padding: '15px 30px',
                borderRadius: '25px',
                fontSize: '1.1rem',
                cursor: 'pointer',
                margin: '10px'
              }}
            >
              🔄 Recargar página
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;