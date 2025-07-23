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
import { home, person, list, settings } from 'ionicons/icons';

// Importar tus contextos copiados de la versión web
import { AuthProvider } from './contexts/AuthContext';
import { UsersProvider } from './contexts/UsersContext';
import { StockProvider } from './contexts/StockContext';

// Páginas temporales (las crearemos)
import Tab1 from './pages/Tab1';
import Tab2 from './pages/Tab2';
import Tab3 from './pages/Tab3';

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
import './theme/variables.css';

setupIonicReact();

const App: React.FC = () => (
  <IonApp>
    <AuthProvider>
      <UsersProvider>
        <StockProvider>
          <IonReactRouter>
            <IonTabs>
              <IonRouterOutlet>
                <Route exact path="/dashboard">
                  <Tab1 />
                </Route>
                <Route exact path="/productos">
                  <Tab2 />
                </Route>
                <Route path="/usuarios">
                  <Tab3 />
                </Route>
                <Route exact path="/">
                  <Redirect to="/dashboard" />
                </Route>
              </IonRouterOutlet>
              <IonTabBar slot="bottom">
                <IonTabButton tab="dashboard" href="/dashboard">
                  <IonIcon aria-hidden="true" icon={home} />
                  <IonLabel>Dashboard</IonLabel>
                </IonTabButton>
                <IonTabButton tab="productos" href="/productos">
                  <IonIcon aria-hidden="true" icon={list} />
                  <IonLabel>Productos</IonLabel>
                </IonTabButton>
                <IonTabButton tab="usuarios" href="/usuarios">
                  <IonIcon aria-hidden="true" icon={person} />
                  <IonLabel>Usuarios</IonLabel>
                </IonTabButton>
              </IonTabBar>
            </IonTabs>
          </IonReactRouter>
        </StockProvider>
      </UsersProvider>
    </AuthProvider>
  </IonApp>
);

export default App;