// src/App.tsx - Aplicación principal con autenticación
import React from 'react';
import { Redirect, Route } from 'react-router-dom';
import {
  IonApp,
  IonRouterOutlet,
  setupIonicReact,
  IonSpinner,
  IonContent,
  IonPage
} from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';

// Contextos (usa los que ya tienes)
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { StockProvider } from './contexts/StockContext';
import { HarvestProvider } from './contexts/HarvestContext';
import { FumigationProvider } from './contexts/FumigationContext';
import { TransferProvider } from './contexts/TransferContext';
import { ExpenseProvider } from './contexts/ExpenseContext';
import { UsersProvider } from './contexts/UsersContext';
import { ActivityProvider } from './contexts/ActivityContext';

// Páginas
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ProductsPage from './pages/ProductsPage';
import TransfersPage from './pages/TransfersPage';
import FieldsPage from './pages/FieldsPage';
import UsersPage from './pages/UsersPage';
import ExpensesPage from './pages/ExpensesPage';

// CSS
import '@ionic/react/css/core.css';
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';
import '@ionic/react/css/padding.css';
import '@ionic/react/css/float-elements.css';
import '@ionic/react/css/text-alignment.css';
import '@ionic/react/css/text-transformation.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/display.css';
import '@ionic/react/css/palettes/dark.system.css';

import './theme/variables.css';
import './theme/agrogestion.css';

setupIonicReact();

// Componente de carga
const LoadingScreen: React.FC = () => (
  <IonPage>
    <IonContent 
      style={{ 
        '--background': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <div style={{ 
        textAlign: 'center',
        color: 'white'
      }}>
        <IonSpinner 
          name="crescent" 
          style={{ 
            width: '50px', 
            height: '50px',
            marginBottom: '20px'
          }} 
        />
        <h2 style={{ 
          fontSize: '18px',
          fontWeight: '300',
          margin: '0'
        }}>
          Iniciando AgroGestión...
        </h2>
      </div>
    </IonContent>
  </IonPage>
);

// Componente de ruta protegida simple
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!currentUser) {
    return <Redirect to="/login" />;
  }

  return <>{children}</>;
};

// Componente principal de rutas
const AppRoutes: React.FC = () => {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <IonRouterOutlet>
      {/* Ruta de login */}
      <Route exact path="/login">
        {currentUser ? <Redirect to="/dashboard" /> : <LoginPage />}
      </Route>
      
      {/* Rutas protegidas */}
      <Route exact path="/dashboard">
        <ProtectedRoute>
          <DashboardPage />
        </ProtectedRoute>
      </Route>
      
      <Route exact path="/productos">
        <ProtectedRoute>
          <ProductsPage />
        </ProtectedRoute>
      </Route>
      
      <Route exact path="/transferencias">
        <ProtectedRoute>
          <TransfersPage />
        </ProtectedRoute>
      </Route>
      
      <Route exact path="/campos">
        <ProtectedRoute>
          <FieldsPage />
        </ProtectedRoute>
      </Route>
      
      <Route exact path="/usuarios">
        <ProtectedRoute>
          <UsersPage />
        </ProtectedRoute>
      </Route>
      
      <Route exact path="/gastos">
        <ProtectedRoute>
          <ExpensesPage />
        </ProtectedRoute>
      </Route>
      
      {/* Ruta por defecto */}
      <Route exact path="/">
        {currentUser ? <Redirect to="/dashboard" /> : <Redirect to="/login" />}
      </Route>
      
      {/* Catch all */}
      <Route>
        {currentUser ? <Redirect to="/dashboard" /> : <Redirect to="/login" />}
      </Route>
    </IonRouterOutlet>
  );
};

// App principal
const App: React.FC = () => {
  return (
    <IonApp>
      <AuthProvider>
        <ActivityProvider>
          <StockProvider>
            <HarvestProvider>
              <FumigationProvider>
                <TransferProvider>
                  <ExpenseProvider>
                    <UsersProvider>
                      <IonReactRouter>
                        <AppRoutes />
                      </IonReactRouter>
                    </UsersProvider>
                  </ExpenseProvider>
                </TransferProvider>
              </FumigationProvider>
            </HarvestProvider>
          </StockProvider>
        </ActivityProvider>
      </AuthProvider>
    </IonApp>
  );
};

export default App;