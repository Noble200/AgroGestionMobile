// src/App.tsx - CORREGIDO: Agregando ruta de gastos
import { Redirect, Route } from 'react-router-dom';
import {
  IonApp,
  IonRouterOutlet,
  setupIonicReact
} from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';

// Páginas de AgroGestión
import DashboardPage from './pages/DashboardPage';
import ProductsPage from './pages/ProductsPage';
import TransfersPage from './pages/TransfersPage';
import FieldsPage from './pages/FieldsPage';
import UsersPage from './pages/UsersPage';
import ExpensesPage from './pages/ExpensesPage';  // ← AGREGADO

/* Core CSS required for Ionic components to work properly */
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

/* Tema personalizado */
import './theme/variables.css';
import './theme/agrogestion.css';

setupIonicReact();

const App: React.FC = () => (
  <IonApp>
    <IonReactRouter>
      <IonRouterOutlet>
        {/* Ruta principal - Dashboard */}
        <Route exact path="/dashboard">
          <DashboardPage />
        </Route>
        
        {/* Rutas principales */}
        <Route exact path="/productos">
          <ProductsPage />
        </Route>
        <Route exact path="/transferencias">
          <TransfersPage />
        </Route>
        <Route exact path="/campos">
          <FieldsPage />
        </Route>
        <Route exact path="/usuarios">
          <UsersPage />
        </Route>
        
        {/* Ruta de gastos */}
        <Route exact path="/gastos">
          <ExpensesPage />
        </Route>
        
        {/* Ruta por defecto */}
        <Route exact path="/">
          <Redirect to="/dashboard" />
        </Route>
      </IonRouterOutlet>
    </IonReactRouter>
  </IonApp>
);

export default App;