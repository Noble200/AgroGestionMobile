import React, { useState, useEffect } from 'react';
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonGrid,
  IonRow,
  IonCol,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonItem,
  IonLabel,
  IonList,
  IonIcon,
  IonButton,
  IonRefresher,
  IonRefresherContent,
  IonBadge,
  IonSpinner
} from '@ionic/react';
import {
  cube,
  warning,
  business,
  people,
  swapHorizontal,
  water,
  calendar,
  arrowForward,
  refresh
} from 'ionicons/icons';

interface Stats {
  totalProducts: number;
  lowStockCount: number;
  warehousesCount: number;
  pendingTransfersCount: number;
  pendingFumigationsCount: number;
  upcomingHarvestsCount: number;
}

interface Product {
  id: number;
  name: string;
  currentStock: number;
  minStock: number;
  unit: string;
  warehouse: string;
}

interface Transfer {
  id: number;
  productName: string;
  quantity: number;
  unit: string;
  fromWarehouse: string;
  toWarehouse: string;
  date: string;
}

interface Fumigation {
  id: number;
  fieldName: string;
  productName: string;
  date: string;
  area: number;
}

interface Harvest {
  id: number;
  fieldName: string;
  crop: string;
  expectedDate: string;
  area: number;
}

const DashboardPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<Stats>({
    totalProducts: 156,
    lowStockCount: 8,
    warehousesCount: 4,
    pendingTransfersCount: 5,
    pendingFumigationsCount: 3,
    upcomingHarvestsCount: 2
  });

  const [lowStockProducts] = useState<Product[]>([
    { id: 1, name: "Fertilizante NPK", currentStock: 2, minStock: 10, unit: "kg", warehouse: "Almacén Central" },
    { id: 2, name: "Semilla de Soja", currentStock: 5, minStock: 20, unit: "kg", warehouse: "Almacén Norte" },
    { id: 3, name: "Herbicida Glifosato", currentStock: 1, minStock: 5, unit: "L", warehouse: "Almacén Sur" }
  ]);

  const [pendingTransfers] = useState<Transfer[]>([
    { id: 1, productName: "Fertilizante Urea", quantity: 50, unit: "kg", fromWarehouse: "Central", toWarehouse: "Norte", date: "2025-07-26" },
    { id: 2, productName: "Semilla de Maíz", quantity: 100, unit: "kg", fromWarehouse: "Norte", toWarehouse: "Sur", date: "2025-07-27" }
  ]);

  const [pendingFumigations] = useState<Fumigation[]>([
    { id: 1, fieldName: "Campo Norte", productName: "Insecticida BT", date: "2025-07-28", area: 15.5 },
    { id: 2, fieldName: "Campo Sur", productName: "Fungicida Cobre", date: "2025-07-29", area: 22.3 }
  ]);

  const [upcomingHarvests] = useState<Harvest[]>([
    { id: 1, fieldName: "Campo Este", crop: "Soja", expectedDate: "2025-08-15", area: 30.2 },
    { id: 2, fieldName: "Campo Oeste", crop: "Maíz", expectedDate: "2025-08-20", area: 25.8 }
  ]);

  const doRefresh = (event: CustomEvent) => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      event.detail.complete();
    }, 2000);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getDaysUntil = (dateString: string) => {
    const targetDate = new Date(dateString);
    const today = new Date();
    const diffTime = targetDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getUrgencyColor = (days: number) => {
    if (days <= 1) return 'danger';
    if (days <= 3) return 'warning';
    return 'primary';
  };

  const StatCard: React.FC<{
    title: string;
    value: number;
    description: string;
    icon: string;
    color: string;
  }> = ({ title, value, description, icon, color }) => (
    <IonCol size="6">
      <IonCard className={`stat-card ${color}`}>
        <IonCardContent>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
            <IonIcon icon={icon} style={{ fontSize: '24px', marginRight: '8px', color: `var(--ion-color-${color})` }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#333' }}>{value}</div>
              <div style={{ fontSize: '12px', color: '#666' }}>{title}</div>
            </div>
          </div>
          <div style={{ fontSize: '11px', color: '#888' }}>{description}</div>
        </IonCardContent>
      </IonCard>
    </IonCol>
  );

  return (
    <IonPage className="agrogestion-page">
      <IonHeader className="agrogestion-header">
        <IonToolbar>
          <IonTitle>Panel Principal</IonTitle>
          <IonButton
            fill="clear"
            slot="end"
            onClick={() => doRefresh({ detail: { complete: () => {} } } as CustomEvent)}
            disabled={loading}
          >
            {loading ? <IonSpinner name="crescent" /> : <IonIcon icon={refresh} />}
          </IonButton>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        <IonRefresher slot="fixed" onIonRefresh={doRefresh}>
          <IonRefresherContent></IonRefresherContent>
        </IonRefresher>

        {/* Estadísticas principales */}
        <IonGrid>
          <IonRow>
            <StatCard
              title="Total Productos"
              value={stats.totalProducts}
              description="Inventario completo"
              icon={cube}
              color="primary"
            />
            <StatCard
              title="Stock Bajo"
              value={stats.lowStockCount}
              description="Requieren atención"
              icon={warning}
              color="warning"
            />
            <StatCard
              title="Almacenes"
              value={stats.warehousesCount}
              description="Activos"
              icon={business}
              color="secondary"
            />
            <StatCard
              title="Tareas Pendientes"
              value={stats.pendingTransfersCount + stats.pendingFumigationsCount}
              description="Por completar"
              icon={people}
              color="tertiary"
            />
          </IonRow>
        </IonGrid>

        {/* Productos con Stock Bajo */}
        <div className="item-list">
          <div className="item-list-header">
            <IonIcon icon={warning} />
            Productos con Stock Bajo
          </div>
          <IonList>
            {lowStockProducts.map((product) => (
              <IonItem key={product.id} className="list-item">
                <IonLabel>
                  <h3>{product.name}</h3>
                  <p>{product.warehouse}</p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                    <span style={{ fontSize: '12px', color: '#666' }}>
                      Stock: {product.currentStock} {product.unit}
                    </span>
                    <IonBadge color="warning" style={{ fontSize: '10px' }}>
                      Min: {product.minStock} {product.unit}
                    </IonBadge>
                  </div>
                </IonLabel>
              </IonItem>
            ))}
          </IonList>
          <div style={{ padding: '12px', textAlign: 'center', borderTop: '1px solid #f0f0f0' }}>
            <IonButton fill="clear" size="small" routerLink="/productos">
              Ver todos los productos
              <IonIcon icon={arrowForward} slot="end" />
            </IonButton>
          </div>
        </div>

        {/* Transferencias Pendientes */}
        <div className="item-list">
          <div className="item-list-header">
            <IonIcon icon={swapHorizontal} />
            Transferencias Pendientes
          </div>
          <IonList>
            {pendingTransfers.map((transfer) => {
              const days = getDaysUntil(transfer.date);
              return (
                <IonItem key={transfer.id} className="list-item">
                  <IonLabel>
                    <h3>{transfer.productName}</h3>
                    <p>Cantidad: {transfer.quantity} {transfer.unit}</p>
                    <p>De: {transfer.fromWarehouse} → {transfer.toWarehouse}</p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                      <span style={{ fontSize: '12px', color: '#666' }}>
                        Fecha: {formatDate(transfer.date)}
                      </span>
                      <IonBadge color={getUrgencyColor(days)} className="urgency-badge">
                        {days === 0 ? 'Hoy' : days === 1 ? 'Mañana' : `${days} días`}
                      </IonBadge>
                    </div>
                  </IonLabel>
                </IonItem>
              );
            })}
          </IonList>
          <div style={{ padding: '12px', textAlign: 'center', borderTop: '1px solid #f0f0f0' }}>
            <IonButton fill="clear" size="small" routerLink="/transferencias">
              Ver todas las transferencias
              <IonIcon icon={arrowForward} slot="end" />
            </IonButton>
          </div>
        </div>

        {/* Fumigaciones Programadas */}
        <div className="item-list">
          <div className="item-list-header">
            <IonIcon icon={water} />
            Fumigaciones Programadas
          </div>
          <IonList>
            {pendingFumigations.map((fumigation) => {
              const days = getDaysUntil(fumigation.date);
              return (
                <IonItem key={fumigation.id} className="list-item">
                  <IonLabel>
                    <h3>{fumigation.fieldName}</h3>
                    <p>Producto: {fumigation.productName}</p>
                    <p>Área: {fumigation.area} ha</p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                      <span style={{ fontSize: '12px', color: '#666' }}>
                        Fecha: {formatDate(fumigation.date)}
                      </span>
                      <IonBadge color={getUrgencyColor(days)} className="urgency-badge">
                        {days === 0 ? 'Hoy' : days === 1 ? 'Mañana' : `${days} días`}
                      </IonBadge>
                    </div>
                  </IonLabel>
                </IonItem>
              );
            })}
          </IonList>
          <div style={{ padding: '12px', textAlign: 'center', borderTop: '1px solid #f0f0f0' }}>
            <IonButton fill="clear" size="small" routerLink="/fumigaciones">
              Ver todas las fumigaciones
              <IonIcon icon={arrowForward} slot="end" />
            </IonButton>
          </div>
        </div>

        {/* Cosechas Próximas */}
        <div className="item-list">
          <div className="item-list-header">
            <IonIcon icon={calendar} />
            Cosechas Próximas
          </div>
          <IonList>
            {upcomingHarvests.map((harvest) => {
              const days = getDaysUntil(harvest.expectedDate);
              return (
                <IonItem key={harvest.id} className="list-item">
                  <IonLabel>
                    <h3>{harvest.fieldName}</h3>
                    <p>Cultivo: {harvest.crop}</p>
                    <p>Área: {harvest.area} ha</p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                      <span style={{ fontSize: '12px', color: '#666' }}>
                        Fecha estimada: {formatDate(harvest.expectedDate)}
                      </span>
                      <IonBadge color="primary" className="urgency-badge">
                        {days} días
                      </IonBadge>
                    </div>
                  </IonLabel>
                </IonItem>
              );
            })}
          </IonList>
          <div style={{ padding: '12px', textAlign: 'center', borderTop: '1px solid #f0f0f0' }}>
            <IonButton fill="clear" size="small" routerLink="/campos">
              Ver todas las cosechas
              <IonIcon icon={arrowForward} slot="end" />
            </IonButton>
          </div>
        </div>

        {/* Espaciado inferior para el tab bar */}
        <div style={{ height: '20px' }}></div>
      </IonContent>
    </IonPage>
  );
};

export default DashboardPage;