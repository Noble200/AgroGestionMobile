import { Redirect, Route } from 'react-router-dom';
import {
  IonApp,
  IonIcon,
  IonLabel,
  IonRouterOutlet,
  IonTabBar,
  IonTabButton,
  IonTabs,
  setupIonicReact
} from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { 
  home, 
  cube, 
  swapHorizontal, 
  leaf, 
  people,
  receipt
} from 'ionicons/icons';

// Páginas de AgroGestión
import DashboardPage from './pages/DashboardPage';
import ProductsPage from './pages/ProductsPage';
import TransfersPage from './pages/TransfersPage';
import FieldsPage from './pages/FieldsPage';
import UsersPage from './pages/UsersPage';
import ExpensesPage from './pages/ExpensesPage'; // ← AGREGAR ESTA IMPORTACIÓN

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
      <IonTabs>
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
          
          {/* ← AGREGAR ESTA RUTA PARA GASTOS */}
          <Route exact path="/gastos">
            <ExpensesPage />
          </Route>
          
          {/* Ruta por defecto */}
          <Route exact path="/">
            <Redirect to="/dashboard" />
          </Route>
        </IonRouterOutlet>
        
        {/* Tab Bar con las opciones principales */}
        <IonTabBar slot="bottom" className="agro-tab-bar">
          <IonTabButton tab="dashboard" href="/dashboard">
            <IonIcon icon={home} />
            <IonLabel>Dashboard</IonLabel>
          </IonTabButton>
          
          <IonTabButton tab="productos" href="/productos">
            <IonIcon icon={cube} />
            <IonLabel>Productos</IonLabel>
          </IonTabButton>
          
          <IonTabButton tab="transferencias" href="/transferencias">
            <IonIcon icon={swapHorizontal} />
            <IonLabel>Transferencias</IonLabel>
          </IonTabButton>
          
          <IonTabButton tab="campos" href="/campos">
            <IonIcon icon={leaf} />
            <IonLabel>Campos</IonLabel>
          </IonTabButton>
          
          {/* ← OPCIONAL: Agregar gastos al tab bar también */}
          <IonTabButton tab="gastos" href="/gastos">
            <IonIcon icon={receipt} />
            <IonLabel>Gastos</IonLabel>
          </IonTabButton>
        </IonTabBar>
      </IonTabs>
    </IonReactRouter>
  </IonApp>
);

export default App;