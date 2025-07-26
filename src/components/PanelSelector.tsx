// src/components/PanelSelector.tsx - Selector de navegación entre páginas
import React, { useState, useRef } from 'react';
import {
  IonButton,
  IonIcon,
  IonPopover,
  IonList,
  IonItem,
  IonLabel,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent
} from '@ionic/react';
import {
  apps,
  warning,
  listOutline,
  barChart,
  people,
  settings,
  calendar,
  checkmarkCircle,
  cube,
  swapHorizontal,
  leaf,
  business,
  home,
  reader,
  construct,
  receipt
} from 'ionicons/icons';

// Tipos para las páginas
export interface PageConfig {
  id: string;
  name: string;
  description: string;
  icon: string;
  route: string;
  requiredPermissions: string[];
  color: string;
}

// Configuración de todas las páginas disponibles
const ALL_PAGES: PageConfig[] = [
  {
    id: 'dashboard',
    name: 'Dashboard',
    description: 'Panel principal',
    icon: home,
    route: '/dashboard',
    requiredPermissions: ['dashboard.view'],
    color: 'primary'
  },
  {
    id: 'products',
    name: 'Productos',
    description: 'Gestión de inventario',
    icon: cube,
    route: '/productos',
    requiredPermissions: ['products.view'],
    color: 'secondary'
  },
  {
    id: 'transfers',
    name: 'Transferencias',
    description: 'Movimientos entre almacenes',
    icon: swapHorizontal,
    route: '/transferencias',
    requiredPermissions: ['transfers.view'],
    color: 'tertiary'
  },
  {
    id: 'fumigations',
    name: 'Fumigaciones',
    description: 'Aplicaciones y programación',
    icon: leaf,
    route: '/fumigaciones',
    requiredPermissions: ['fumigations.view'],
    color: 'success'
  },
  {
    id: 'fields',
    name: 'Campos',
    description: 'Gestión de campos y cultivos',
    icon: calendar,
    route: '/campos',
    requiredPermissions: ['fields.view'],
    color: 'warning'
  },
  {
    id: 'warehouses',
    name: 'Almacenes',
    description: 'Gestión de almacenes',
    icon: business,
    route: '/almacenes',
    requiredPermissions: ['warehouses.view'],
    color: 'medium'
  },
  {
    id: 'expenses',
    name: 'Gastos',
    description: 'Control de gastos y ventas',
    icon: receipt,
    route: '/gastos',
    requiredPermissions: ['expenses.view'],
    color: 'tertiary'
  },
  {
    id: 'users',
    name: 'Usuarios',
    description: 'Gestión de usuarios y roles',
    icon: people,
    route: '/usuarios',
    requiredPermissions: ['users.view', 'admin.access'],
    color: 'danger'
  },
  {
    id: 'reports',
    name: 'Reportes',
    description: 'Informes y estadísticas',
    icon: barChart,
    route: '/reportes',
    requiredPermissions: ['reports.view'],
    color: 'dark'
  },
  {
    id: 'settings',
    name: 'Configuración',
    description: 'Ajustes del sistema',
    icon: settings,
    route: '/configuracion',
    requiredPermissions: ['settings.view', 'admin.access'],
    color: 'medium'
  }
];

interface PanelSelectorProps {
  userPermissions: string[];
  currentRoute?: string;
  className?: string;
  onNavigate?: (route: string) => void; // Función opcional para manejar navegación
}

const PanelSelector: React.FC<PanelSelectorProps> = ({
  userPermissions,
  currentRoute = '/dashboard',
  className = '',
  onNavigate
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLIonPopoverElement>(null);

  // TEMPORALMENTE: Mostrar todas las páginas sin filtro de permisos
  const getAvailablePages = (): PageConfig[] => {
    // Comentamos el filtro de permisos para mostrar todos los paneles
    return ALL_PAGES;
    
    // Código original comentado:
    // return ALL_PAGES.filter(page => {
    //   // Verificar si el usuario tiene TODOS los permisos requeridos para esta página
    //   return page.requiredPermissions.every(permission => 
    //     userPermissions.includes(permission)
    //   );
    // });
  };

  const availablePages = getAvailablePages();

  const handlePageSelect = (route: string) => {
    setIsOpen(false);
    
    // Intentar usar función de navegación personalizada primero
    if (onNavigate) {
      onNavigate(route);
    } else {
      // Fallback a navegación directa
      try {
        // Intentar con history API primero
        if (window.history && window.history.pushState) {
          window.history.pushState(null, '', route);
          // Disparar evento personalizado para que React Router lo detecte
          window.dispatchEvent(new PopStateEvent('popstate'));
        } else {
          // Fallback a window.location
          window.location.href = route;
        }
      } catch (error) {
        console.error('Error de navegación:', error);
        // Último fallback
        window.location.href = route;
      }
    }
  };

  return (
    <>
      <IonButton
        id="panel-selector-trigger"
        fill="clear"
        onClick={() => setIsOpen(true)}
        className={className}
        style={{ 
          '--color': 'white',
          '--border-radius': '12px'
        }}
      >
        <IonIcon 
          icon={apps}
          style={{ fontSize: '20px' }}
        />
      </IonButton>

      <IonPopover
        ref={popoverRef}
        trigger="panel-selector-trigger"
        isOpen={isOpen}
        onDidDismiss={() => setIsOpen(false)}
        showBackdrop={true}
        backdropDismiss={true}
        side="bottom"
        alignment="center"
        style={{
          '--width': '320px',
          '--max-height': '500px',
          '--offset-y': '-20px'
        }}
      >
        <IonHeader>
          <IonToolbar>
            <IonTitle size="small">Ir a Página</IonTitle>
          </IonToolbar>
        </IonHeader>
        
        <IonContent>
          <IonList>
            {availablePages.map((page) => (
              <IonItem
                key={page.id}
                button
                onClick={() => handlePageSelect(page.route)}
                style={{
                  '--background': currentRoute === page.route ? 'var(--ion-color-primary-tint)' : 'transparent'
                }}
              >
                <IonIcon
                  icon={page.icon}
                  slot="start"
                  style={{
                    color: `var(--ion-color-${page.color})`,
                    fontSize: '20px'
                  }}
                />
                <IonLabel>
                  <h3 style={{ fontWeight: '600', margin: '0 0 4px 0' }}>
                    {page.name}
                  </h3>
                  <p style={{ 
                    color: '#6c757d', 
                    fontSize: '12px',
                    margin: 0
                  }}>
                    {page.description}
                  </p>
                </IonLabel>
                {currentRoute === page.route && (
                  <IonIcon
                    icon={checkmarkCircle}
                    slot="end"
                    style={{
                      color: 'var(--ion-color-primary)',
                      fontSize: '16px'
                    }}
                  />
                )}
              </IonItem>
            ))}
          </IonList>
        </IonContent>
      </IonPopover>
    </>
  );
};

export default PanelSelector;