// src/pages/LoginPage.tsx - Pantalla de login usando tus contextos existentes
import React, { useState, useEffect } from 'react';
import {
  IonPage,
  IonContent,
  IonItem,
  IonLabel,
  IonInput,
  IonButton,
  IonIcon,
  IonSpinner,
  IonAlert,
  IonCheckbox,
  IonCard,
  IonCardContent,
  IonText,
  IonInputPasswordToggle
} from '@ionic/react';
import {
  person,
  lockClosed,
  logIn,
  leaf,
  mail,
  shieldCheckmark
} from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useActivityLogger } from '../hooks/useActivityLogger';

const LoginPage: React.FC = () => {
  const { login, loginWithUsername, currentUser, error, setError, loading } = useAuth();
  const { log } = useActivityLogger();
  const history = useHistory();
  
  const [credentials, setCredentials] = useState({
    identifier: '',
    password: ''
  });
  const [rememberMe, setRememberMe] = useState(false);
  const [loginType, setLoginType] = useState<'email' | 'username'>('username'); // Cambiar a username por defecto
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redireccionar si ya está autenticado
  useEffect(() => {
    if (currentUser) {
      history.replace('/dashboard');
    }
  }, [currentUser, history]);

  // Manejar errores del contexto
  useEffect(() => {
    if (error) {
      setAlertMessage(error);
      setShowAlert(true);
      setError('');
    }
  }, [error, setError]);

  const handleInputChange = (field: string, value: string) => {
    setCredentials(prev => ({
      ...prev,
      [field]: value
    }));
    
    if (field === 'identifier') {
      setLoginType(value.includes('@') ? 'email' : 'username');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!credentials.identifier || !credentials.password) {
      setAlertMessage('Por favor completa todos los campos');
      setShowAlert(true);
      return;
    }

    setIsSubmitting(true);
    
    try {
      let userData;
      
      if (loginType === 'email') {
        userData = await login(credentials.identifier, credentials.password);
      } else {
        userData = await loginWithUsername(credentials.identifier, credentials.password);
      }

      // Guardar credenciales si "Recordarme" está activado
      if (rememberMe) {
        localStorage.setItem('agro_remember_user', credentials.identifier);
      } else {
        localStorage.removeItem('agro_remember_user');
      }

      // Registrar actividad usando tu hook existente
      try {
        await log('user-login', {
          id: userData?.uid || 'unknown',
          name: userData?.displayName || userData?.username || userData?.email || 'Usuario',
          email: userData?.email
        }, {
          loginMethod: loginType,
          remembered: rememberMe
        });
      } catch (logError) {
        console.warn('Error al registrar actividad:', logError);
      }
      
      history.replace('/dashboard');
      
    } catch (err: any) {
      let errorMessage = err.message || 'Error al iniciar sesión';
      
      if (err.code) {
        switch (err.code) {
          case 'auth/user-not-found':
            errorMessage = loginType === 'email' 
              ? 'No existe una cuenta con este correo electrónico'
              : 'No existe una cuenta con este nombre de usuario';
            break;
          case 'auth/wrong-password':
            errorMessage = 'La contraseña es incorrecta';
            break;
          case 'auth/invalid-email':
            errorMessage = 'El formato del correo electrónico no es válido';
            break;
          case 'auth/user-disabled':
            errorMessage = 'Esta cuenta ha sido deshabilitada';
            break;
          case 'auth/too-many-requests':
            errorMessage = 'Demasiados intentos fallidos. Intenta más tarde';
            break;
        }
      }
      
      setAlertMessage(errorMessage);
      setShowAlert(true);
      
    } finally {
      setIsSubmitting(false);
    }
  };

  // Cargar usuario recordado
  useEffect(() => {
    const rememberedUser = localStorage.getItem('agro_remember_user');
    if (rememberedUser) {
      setCredentials(prev => ({
        ...prev,
        identifier: rememberedUser
      }));
      setRememberMe(true);
      setLoginType(rememberedUser.includes('@') ? 'email' : 'username');
    }
  }, []);

  return (
    <IonPage>
      <IonContent 
        fullscreen 
        style={{ 
          '--background': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <div style={{ 
          width: '100%', 
          maxWidth: '420px', 
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}>
          
          {/* Logo y título */}
          <div style={{ 
            textAlign: 'center', 
            marginBottom: '40px',
            animation: 'fadeInDown 0.8s ease-out'
          }}>
            <div style={{ 
              background: 'rgba(255, 255, 255, 0.15)',
              borderRadius: '50%',
              width: '80px',
              height: '80px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              backdropFilter: 'blur(10px)',
              border: '2px solid rgba(255, 255, 255, 0.2)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
            }}>
              <IonIcon 
                icon={leaf} 
                style={{ 
                  fontSize: '40px', 
                  color: 'white' 
                }} 
              />
            </div>
            
            <h1 style={{ 
              color: 'white', 
              fontSize: '32px', 
              fontWeight: '700',
              margin: '0 0 8px 0',
              textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)'
            }}>
              AgroGestión
            </h1>
            
            <p style={{ 
              color: 'rgba(255, 255, 255, 0.9)', 
              fontSize: '16px',
              margin: 0,
              fontWeight: '400'
            }}>
              Sistema de Gestión Agrícola
            </p>
          </div>

          {/* Formulario de login */}
          <IonCard style={{ 
            width: '100%',
            margin: 0,
            borderRadius: '24px',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.2)',
            overflow: 'hidden',
            animation: 'fadeInUp 0.8s ease-out 0.2s both'
          }}>
            <IonCardContent style={{ padding: '32px' }}>
              
              <div style={{ 
                textAlign: 'center', 
                marginBottom: '32px' 
              }}>
                <h2 style={{ 
                  fontSize: '24px', 
                  fontWeight: '600',
                  color: '#2c3e50',
                  margin: '0 0 8px 0'
                }}>
                  Iniciar Sesión
                </h2>
                <p style={{ 
                  color: '#7f8c8d',
                  fontSize: '14px',
                  margin: 0
                }}>
                  Ingresa tus credenciales para acceder
                </p>
              </div>

              <form onSubmit={handleSubmit}>
                
                <IonItem 
                  style={{ 
                    marginBottom: '20px',
                    '--border-radius': '12px',
                    '--border-width': '2px',
                    '--border-color': '#e9ecef',
                    '--highlight-color-focused': '#667eea',
                    '--padding-top': '8px',
                    '--padding-bottom': '8px',
                    '--min-height': '60px'
                  }}
                >
                  <IonIcon 
                    icon={loginType === 'email' ? mail : person} 
                    slot="start" 
                    style={{ color: '#667eea', marginRight: '8px' }}
                  />
                  <IonLabel position="stacked" style={{ marginBottom: '4px' }}>
                    {loginType === 'email' ? 'Correo Electrónico' : 'Nombre de Usuario'}
                  </IonLabel>
                  <IonInput
                    fill="outline"
                    type={loginType === 'email' ? 'email' : 'text'}
                    value={credentials.identifier}
                    onIonInput={(e) => handleInputChange('identifier', e.detail.value!)}
                    placeholder={loginType === 'email' ? 'usuario@ejemplo.com' : 'nombre_usuario'}
                    required
                    disabled={isSubmitting || loading}
                    style={{ '--padding-top': '8px', '--padding-bottom': '8px' }}
                  />
                </IonItem>

                <IonItem 
                  style={{ 
                    marginBottom: '24px',
                    '--border-radius': '12px',
                    '--border-width': '2px',
                    '--border-color': '#e9ecef',
                    '--highlight-color-focused': '#667eea',
                    '--padding-top': '8px',
                    '--padding-bottom': '8px',
                    '--min-height': '60px'
                  }}
                >
                  <IonIcon 
                    icon={lockClosed} 
                    slot="start" 
                    style={{ color: '#667eea', marginRight: '8px' }}
                  />
                  <IonLabel position="stacked" style={{ marginBottom: '4px' }}>
                    Contraseña
                  </IonLabel>
                  <IonInput
                    fill="outline"
                    type="password"
                    value={credentials.password}
                    onIonInput={(e) => handleInputChange('password', e.detail.value!)}
                    placeholder="Ingresa tu contraseña"
                    required
                    disabled={isSubmitting || loading}
                    style={{ '--padding-top': '8px', '--padding-bottom': '8px' }}
                  >
                    <IonInputPasswordToggle slot="end" />
                  </IonInput>
                </IonItem>

                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  marginBottom: '24px',
                  padding: '0 4px'
                }}>
                  <IonCheckbox
                    checked={rememberMe}
                    onIonChange={(e) => setRememberMe(e.detail.checked)}
                    disabled={isSubmitting || loading}
                    style={{ 
                      '--size': '18px',
                      '--color': '#667eea',
                      '--checkmark-color': 'white',
                      marginRight: '12px'
                    }}
                  />
                  <IonLabel 
                    style={{ 
                      fontSize: '14px',
                      color: '#6c757d',
                      cursor: 'pointer'
                    }}
                  >
                    Recordar mis credenciales
                  </IonLabel>
                </div>

                <IonButton
                  expand="block"
                  type="submit"
                  disabled={isSubmitting || loading || !credentials.identifier || !credentials.password}
                  style={{
                    '--background': isSubmitting || loading 
                      ? '#cccccc' 
                      : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    '--border-radius': '12px',
                    '--padding-top': '16px',
                    '--padding-bottom': '16px',
                    '--box-shadow': isSubmitting || loading 
                      ? 'none' 
                      : '0 8px 24px rgba(102, 126, 234, 0.3)',
                    fontSize: '16px',
                    fontWeight: '600',
                    textTransform: 'none',
                    margin: '0 0 20px 0'
                  }}
                >
                  {isSubmitting || loading ? (
                    <>
                      <IonSpinner name="crescent" style={{ marginRight: '8px' }} />
                      Iniciando sesión...
                    </>
                  ) : (
                    <>
                      <IonIcon icon={logIn} style={{ marginRight: '8px' }} />
                      Iniciar Sesión
                    </>
                  )}
                </IonButton>

              </form>

              <div style={{ 
                textAlign: 'center',
                paddingTop: '20px',
                borderTop: '1px solid #e9ecef'
              }}>
                <IonText color="medium" style={{ fontSize: '12px' }}>
                  <p style={{ margin: '0 0 8px 0' }}>
                    ¿Problemas para acceder? Contacta al administrador
                  </p>
                  <p style={{ 
                    margin: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}>
                    <IonIcon icon={shieldCheckmark} style={{ fontSize: '12px' }} />
                    AgroGestión v2.0 © {new Date().getFullYear()}
                  </p>
                </IonText>
              </div>
              
            </IonCardContent>
          </IonCard>

          <div style={{ 
            marginTop: '20px',
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '20px',
            padding: '8px 16px',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.2)'
          }}>
            <IonText style={{ 
              color: 'rgba(255, 255, 255, 0.9)',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <IonIcon 
                icon={loginType === 'email' ? mail : person} 
                style={{ fontSize: '14px' }}
              />
              Modo: {loginType === 'email' ? 'Correo Electrónico' : 'Nombre de Usuario'}
            </IonText>
          </div>
        </div>

        <IonAlert
          isOpen={showAlert}
          onDidDismiss={() => setShowAlert(false)}
          header="Error de Autenticación"
          message={alertMessage}
          buttons={[
            {
              text: 'Entendido',
              role: 'confirm',
              cssClass: 'alert-button-confirm'
            }
          ]}
        />

        <style>{`
          @keyframes fadeInDown {
            from {
              opacity: 0;
              transform: translate3d(0, -30px, 0);
            }
            to {
              opacity: 1;
              transform: translate3d(0, 0, 0);
            }
          }

          @keyframes fadeInUp {
            from {
              opacity: 0;
              transform: translate3d(0, 30px, 0);
            }
            to {
              opacity: 1;
              transform: translate3d(0, 0, 0);
            }
          }

          @media (max-width: 480px) {
            ion-card ion-card-content {
              padding: 24px !important;
            }
          }

          .alert-button-confirm {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
            color: white !important;
            border-radius: 8px !important;
          }

          ion-item {
            transition: all 0.3s ease;
          }

          ion-item:focus-within {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15);
          }

          ion-button:not([disabled]):hover {
            transform: translateY(-2px);
          }
        `}</style>
        
      </IonContent>
    </IonPage>
  );
};

export default LoginPage;