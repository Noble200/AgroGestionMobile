// src/pages/DashboardPage.tsx - MODERNO: Diseño elegante y contemporáneo
import React from 'react';
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
  IonSpinner,
  IonText,
  IonChip
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
  refresh,
  leaf,
  time,
  checkmarkCircle,
  trendingUp,
  notifications,
  ellipsisVertical
} from 'ionicons/icons';

// Importar el controlador
import useDashboardController from '../controllers/DashboardController';

// Importar el nuevo componente
import PanelSelector from '../components/PanelSelector';

const DashboardPage: React.FC = () => {
  // Usar el controlador para obtener datos reales
  const {
    stats,
    lowStockProducts,
    expiringSoonProducts,
    pendingTransfers,
    pendingFumigations,
    upcomingHarvests,
    loading,
    error,
    refreshData
  } = useDashboardController();

  // TODO: Obtener permisos del usuario desde el contexto/store de autenticación
  // Por ahora simulamos permisos de usuario
  const userPermissions = [
    'dashboard.view',
    'products.view',
    'transfers.view', 
    'fumigations.view',
    'fields.view',
    'warehouses.view',
    'reports.view',
    // 'users.view',       // Comentado para simular usuario sin acceso
    // 'admin.access',     // Comentado para simular usuario sin acceso
    // 'settings.view'     // Comentado para simular usuario sin acceso
  ];

  // Función para manejar refresh
  const doRefresh = async (event: CustomEvent) => {
    try {
      await refreshData();
    } catch (err) {
      console.error('Error al refrescar:', err);
    } finally {
      event.detail.complete();
    }
  };

  // Función para formatear fechas
  const formatDate = (date: any): string => {
    if (!date) return 'Sin fecha';
    
    try {
      const dateObj = date.seconds ? new Date(date.seconds * 1000) : new Date(date);
      return dateObj.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch (error) {
      return 'Fecha inválida';
    }
  };

  // Función para calcular días hasta una fecha
  const getDaysUntil = (date: any): number => {
    if (!date) return 0;
    
    try {
      const targetDate = date.seconds ? new Date(date.seconds * 1000) : new Date(date);
      const today = new Date();
      const diffTime = targetDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays;
    } catch (error) {
      return 0;
    }
  };

  // Función para obtener color según urgencia
  const getUrgencyColor = (days: number): string => {
    if (days <= 0) return 'danger';
    if (days <= 3) return 'warning';
    if (days <= 7) return 'primary';
    return 'success';
  };

  // Componente para tarjetas de estadísticas modernas
  const ModernStatCard: React.FC<{
    title: string;
    value: number;
    description: string;
    icon: string;
    color: string;
    trend?: string;
  }> = ({ title, value, description, icon, color, trend }) => (
    <IonCol size="6" sizeMd="4" sizeLg="2">
      <div 
        style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: '20px',
          padding: '24px 20px',
          position: 'relative',
          overflow: 'hidden',
          minHeight: '140px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          boxShadow: '0 10px 30px rgba(102, 126, 234, 0.2)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)'
        }}
        className={`modern-stat-card-${color}`}
      >
        {/* Elemento decorativo de fondo */}
        <div 
          style={{
            position: 'absolute',
            top: '-20px',
            right: '-20px',
            width: '80px',
            height: '80px',
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '50%',
            zIndex: 0
          }}
        />
        
        {/* Icono */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div 
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              borderRadius: '12px',
              width: '48px',
              height: '48px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px'
            }}
          >
            <IonIcon 
              icon={icon} 
              style={{ 
                fontSize: '24px', 
                color: 'white'
              }} 
            />
          </div>
        </div>

        {/* Contenido */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ 
            fontSize: '32px', 
            fontWeight: '700', 
            color: 'white',
            lineHeight: '1',
            marginBottom: '4px'
          }}>
            {value.toLocaleString()}
          </div>
          
          <div style={{ 
            fontSize: '13px', 
            color: 'rgba(255, 255, 255, 0.9)',
            fontWeight: '600',
            marginBottom: '8px'
          }}>
            {title}
          </div>
          
          <div style={{ 
            fontSize: '11px', 
            color: 'rgba(255, 255, 255, 0.7)',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            {trend && (
              <IonIcon 
                icon={trendingUp} 
                style={{ fontSize: '12px' }} 
              />
            )}
            {description}
          </div>
        </div>
      </div>
    </IonCol>
  );

  // Componente para secciones de listas modernas
  const ModernListSection: React.FC<{
    title: string;
    items: any[];
    icon: string;
    emptyMessage: string;
    viewAllRoute: string;
    renderItem: (item: any, index: number) => React.ReactNode;
    color?: string;
  }> = ({ title, items, icon, emptyMessage, viewAllRoute, renderItem, color = 'primary' }) => (
    <div 
      style={{
        background: 'white',
        borderRadius: '20px',
        padding: '0',
        marginBottom: '20px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
        border: '1px solid rgba(0, 0, 0, 0.05)',
        overflow: 'hidden'
      }}
    >
      {/* Header moderno */}
      <div 
        style={{
          background: `linear-gradient(135deg, var(--ion-color-${color}) 0%, var(--ion-color-${color}-shade) 100%)`,
          padding: '20px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div 
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              borderRadius: '10px',
              width: '40px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <IonIcon 
              icon={icon} 
              style={{ 
                fontSize: '20px', 
                color: 'white' 
              }} 
            />
          </div>
          
          <div>
            <h3 style={{ 
              margin: 0,
              fontSize: '18px',
              fontWeight: '700',
              color: 'white'
            }}>
              {title}
            </h3>
            <div style={{
              background: 'rgba(255, 255, 255, 0.2)',
              borderRadius: '12px',
              padding: '2px 8px',
              display: 'inline-block',
              marginTop: '4px'
            }}>
              <span style={{ 
                fontSize: '12px', 
                color: 'white',
                fontWeight: '600'
              }}>
                {items.length} {items.length === 1 ? 'elemento' : 'elementos'}
              </span>
            </div>
          </div>
        </div>
        
        <IonButton 
          fill="clear" 
          size="small" 
          routerLink={viewAllRoute}
          style={{ 
            '--color': 'white',
            '--border-radius': '12px'
          }}
        >
          <IonIcon icon={arrowForward} />
        </IonButton>
      </div>
      
      {/* Contenido */}
      <div style={{ padding: items.length === 0 ? '40px 24px' : '0' }}>
        {items.length === 0 ? (
          <div style={{ 
            textAlign: 'center',
            color: '#8e9aaf'
          }}>
            <div 
              style={{
                background: 'rgba(142, 154, 175, 0.1)',
                borderRadius: '50%',
                width: '64px',
                height: '64px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px'
              }}
            >
              <IonIcon 
                icon={checkmarkCircle} 
                style={{ fontSize: '32px', opacity: 0.6 }} 
              />
            </div>
            <p style={{ 
              margin: 0,
              fontSize: '14px',
              fontWeight: '500'
            }}>
              {emptyMessage}
            </p>
          </div>
        ) : (
          <div>
            {items.slice(0, 5).map((item, index) => (
              <div key={item.id || index}>
                {renderItem(item, index)}
                {index < Math.min(items.length, 5) - 1 && (
                  <div style={{
                    height: '1px',
                    background: 'rgba(0, 0, 0, 0.05)',
                    margin: '0 24px'
                  }} />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  // Componente para items de lista modernos
  const ModernListItem: React.FC<{
    title: string;
    subtitle?: string;
    description?: string;
    badge?: { text: string; color: string };
    icon?: string;
    children?: React.ReactNode;
  }> = ({ title, subtitle, description, badge, icon, children }) => (
    <div 
      style={{
        padding: '20px 24px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        transition: 'all 0.2s ease',
        cursor: 'pointer'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'rgba(0, 0, 0, 0.02)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent';
      }}
    >
      {icon && (
        <div 
          style={{
            background: 'rgba(102, 126, 234, 0.1)',
            borderRadius: '12px',
            width: '48px',
            height: '48px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}
        >
          <IonIcon 
            icon={icon} 
            style={{ 
              fontSize: '20px', 
              color: 'var(--ion-color-primary)' 
            }} 
          />
        </div>
      )}
      
      <div style={{ flex: 1, minWidth: 0 }}>
        <h4 style={{ 
          margin: '0 0 4px 0',
          fontSize: '16px',
          fontWeight: '600',
          color: '#2c3e50',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}>
          {title}
        </h4>
        
        {subtitle && (
          <p style={{ 
            margin: '0 0 4px 0',
            fontSize: '14px',
            color: '#495057',
            fontWeight: '500'
          }}>
            {subtitle}
          </p>
        )}
        
        {description && (
          <p style={{ 
            margin: 0,
            fontSize: '12px',
            color: '#8e9aaf',
            lineHeight: '1.4'
          }}>
            {description}
          </p>
        )}
      </div>
      
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '8px',
        flexShrink: 0
      }}>
        {children}
        {badge && (
          <div 
            style={{
              background: `var(--ion-color-${badge.color})`,
              color: 'white',
              padding: '4px 12px',
              borderRadius: '20px',
              fontSize: '11px',
              fontWeight: '600',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}
          >
            {badge.text}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar 
          style={{
            '--background': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            '--color': 'white'
          }}
        >
          <IonTitle style={{ fontWeight: '700', fontSize: '20px' }}>
            Dashboard
          </IonTitle>
          <div slot="end" style={{ display: 'flex', gap: '8px', paddingRight: '16px' }}>
            {/* Selector de páginas */}
            <PanelSelector
              userPermissions={userPermissions}
              currentRoute="/dashboard"
              onNavigate={(route) => {
                // Función personalizada de navegación
                console.log('Navegando a:', route);
                // Aquí puedes integrar con tu router (React Router, etc.)
                // Por ejemplo: navigate(route);
                
                // Mientras tanto, usar window.location como fallback
                window.location.href = route;
              }}
            />
            
            <IonButton
              fill="clear"
              onClick={() => refreshData()}
              disabled={loading}
              style={{ 
                '--color': 'white',
                '--border-radius': '12px'
              }}
            >
              {loading ? (
                <IonSpinner name="crescent" />
              ) : (
                <IonIcon icon={refresh} />
              )}
            </IonButton>
          </div>
        </IonToolbar>
      </IonHeader>

      <IonContent style={{ '--background': '#f8fafc' }}>
        <IonRefresher slot="fixed" onIonRefresh={doRefresh}>
          <IonRefresherContent></IonRefresherContent>
        </IonRefresher>

        {/* Header con saludo */}
        <div style={{ 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          padding: '0 20px 30px',
          marginBottom: '20px'
        }}>
          <div style={{ paddingTop: '10px' }}>
            <h1 style={{ 
              color: 'white', 
              fontSize: '28px', 
              fontWeight: '300',
              margin: '0 0 8px 0'
            }}>
              ¡Buen día! 👋
            </h1>
            <p style={{ 
              color: 'rgba(255, 255, 255, 0.8)', 
              fontSize: '16px',
              margin: 0,
              fontWeight: '400'
            }}>
              Aquí tienes el resumen de tu operación agrícola
            </p>
          </div>
        </div>

        {/* Mostrar error si existe */}
        {error && (
          <div style={{ padding: '0 20px 20px' }}>
            <div 
              style={{
                background: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%)',
                borderRadius: '16px',
                padding: '20px',
                color: 'white'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <IonIcon icon={warning} style={{ fontSize: '24px' }} />
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>
                  Error al cargar datos
                </h3>
              </div>
              <p style={{ margin: '0 0 16px 0', opacity: 0.9 }}>{error}</p>
              <IonButton 
                fill="outline" 
                color="light" 
                size="small" 
                onClick={() => refreshData()}
                style={{ '--border-radius': '12px' }}
              >
                Reintentar
              </IonButton>
            </div>
          </div>
        )}

        {/* Mostrar loading completo solo al cargar inicialmente */}
        {loading && !stats.totalProducts ? (
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            height: '300px',
            flexDirection: 'column',
            gap: '20px'
          }}>
            <div 
              style={{
                background: 'white',
                borderRadius: '20px',
                padding: '40px',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
              }}
            >
              <IonSpinner name="crescent" style={{ '--color': 'var(--ion-color-primary)' }} />
            </div>
            <IonText style={{ color: '#8e9aaf', fontWeight: '500' }}>
              Cargando datos del dashboard...
            </IonText>
          </div>
        ) : (
          <>
            {/* Estadísticas principales */}
            <div style={{ padding: '0 20px', marginTop: '-40px', marginBottom: '30px' }}>
              <IonGrid>
                <IonRow>
                  <ModernStatCard
                    title="Total Productos"
                    value={stats.totalProducts}
                    description="En inventario"
                    icon={cube}
                    color="primary"
                    trend="+5%"
                  />
                  <ModernStatCard
                    title="Stock Bajo"
                    value={stats.lowStockCount}
                    description="Necesitan reposición"
                    icon={warning}
                    color="warning"
                  />
                  <ModernStatCard
                    title="Próximos a vencer"
                    value={stats.expiringCount}
                    description="En 30 días"
                    icon={time}
                    color="danger"
                  />
                  <ModernStatCard
                    title="Almacenes"
                    value={stats.warehouseCount}
                    description="Activos"
                    icon={business}
                    color="secondary"
                  />
                  <ModernStatCard
                    title="Transferencias"
                    value={stats.pendingTransfersCount}
                    description="Pendientes"
                    icon={swapHorizontal}
                    color="tertiary"
                  />
                  <ModernStatCard
                    title="Fumigaciones"
                    value={stats.pendingFumigationsCount}
                    description="Programadas"
                    icon={leaf}
                    color="success"
                  />
                </IonRow>
              </IonGrid>
            </div>

            {/* Secciones de contenido */}
            <div style={{ padding: '0 20px 100px' }}>
              
              {/* Productos con stock bajo */}
              <ModernListSection
                title="Stock Bajo"
                items={lowStockProducts}
                icon={warning}
                emptyMessage="Todos los productos tienen stock suficiente"
                viewAllRoute="/productos"
                color="warning"
                renderItem={(product: any, index: number) => (
                  <ModernListItem
                    title={product.name}
                    subtitle={`${product.stock || 0} ${product.unit || 'unidades'} disponibles`}
                    description={`Mínimo requerido: ${product.minStock || 0} • ${product.category || 'Sin categoría'}`}
                    badge={{ text: 'Bajo Stock', color: 'warning' }}
                    icon={cube}
                  />
                )}
              />

              {/* Productos próximos a vencer */}
              <ModernListSection
                title="Próximos a Vencer"
                items={expiringSoonProducts}
                icon={time}
                emptyMessage="No hay productos próximos a vencer"
                viewAllRoute="/productos"
                color="danger"
                renderItem={(product: any, index: number) => {
                  const days = getDaysUntil(product.expiryDate);
                  return (
                    <ModernListItem
                      title={product.name}
                      subtitle={`Vence: ${formatDate(product.expiryDate)}`}
                      description={`Stock: ${product.stock || 0} ${product.unit || 'unidades'}`}
                      badge={{ 
                        text: days <= 0 ? 'Vencido' : `${days} día${days !== 1 ? 's' : ''}`, 
                        color: getUrgencyColor(days) 
                      }}
                      icon={time}
                    />
                  );
                }}
              />

              {/* Transferencias pendientes */}
              <ModernListSection
                title="Transferencias Pendientes"
                items={pendingTransfers}
                icon={swapHorizontal}
                emptyMessage="No hay transferencias pendientes"
                viewAllRoute="/transferencias"
                color="tertiary"
                renderItem={(transfer: any, index: number) => (
                  <ModernListItem
                    title={transfer.transferNumber || `Transferencia #${transfer.id?.slice(-6)}`}
                    subtitle={`${transfer.sourceWarehouse?.name || 'Origen'} → ${transfer.targetWarehouse?.name || 'Destino'}`}
                    description={`${formatDate(transfer.requestDate || transfer.createdAt)} • ${transfer.products?.length || 0} producto(s)`}
                    badge={{ text: transfer.status || 'Pendiente', color: 'tertiary' }}
                    icon={swapHorizontal}
                  />
                )}
              />

              {/* Fumigaciones pendientes */}
              <ModernListSection
                title="Fumigaciones Programadas"
                items={pendingFumigations}
                icon={leaf}
                emptyMessage="No hay fumigaciones programadas"
                viewAllRoute="/fumigaciones"
                color="success"
                renderItem={(fumigation: any, index: number) => {
                  const days = getDaysUntil(fumigation.applicationDate || fumigation.plannedDate);
                  return (
                    <ModernListItem
                      title={fumigation.orderNumber || `Orden #${fumigation.id?.slice(-6)}`}
                      subtitle={`Campo: ${fumigation.fieldName || fumigation.field?.name || 'Sin especificar'}`}
                      description={`${fumigation.crop || 'Sin cultivo'} • ${fumigation.totalSurface || 0} ha • ${formatDate(fumigation.applicationDate || fumigation.plannedDate)}`}
                      badge={{ 
                        text: days <= 0 ? 'Hoy' : days === 1 ? 'Mañana' : `${days} días`, 
                        color: getUrgencyColor(days) 
                      }}
                      icon={leaf}
                    />
                  );
                }}
              />

              {/* Cosechas próximas */}
              <ModernListSection
                title="Cosechas Próximas"
                items={upcomingHarvests}
                icon={calendar}
                emptyMessage="No hay cosechas programadas"
                viewAllRoute="/campos"
                color="primary"
                renderItem={(harvest: any, index: number) => {
                  const days = getDaysUntil(harvest.harvestDate || harvest.plannedDate);
                  return (
                    <ModernListItem
                      title={harvest.field?.name || harvest.fieldName || 'Campo sin nombre'}
                      subtitle={`${harvest.crop || 'Sin cultivo'} • ${harvest.totalArea || 0} ha`}
                      description={`${formatDate(harvest.harvestDate || harvest.plannedDate)}${harvest.estimatedYield ? ` • Rendimiento: ${harvest.estimatedYield} ${harvest.yieldUnit || 'tn/ha'}` : ''}`}
                      badge={{ 
                        text: days <= 0 ? 'Hoy' : days === 1 ? 'Mañana' : `${days} días`, 
                        color: getUrgencyColor(days) 
                      }}
                      icon={calendar}
                    />
                  );
                }}
              />

            </div>
          </>
        )}

        {/* Ocultar la barra de navegación inferior con CSS */}
        <style>{`
          ion-tab-bar {
            display: none !important;
          }
          .tab-bar {
            display: none !important;
          }
          ion-router-outlet {
            padding-bottom: 0 !important;
          }
        `}</style>
      </IonContent>

      <style>{`
        .modern-stat-card-primary {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
        }
        .modern-stat-card-warning {
          background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%) !important;
        }
        .modern-stat-card-danger {
          background: linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%) !important;
        }
        .modern-stat-card-secondary {
          background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%) !important;
        }
        .modern-stat-card-tertiary {
          background: linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%) !important;
        }
        .modern-stat-card-success {
          background: linear-gradient(135deg, #a8e6cf 0%, #7fcdcd 100%) !important;
        }
        
        /* Animaciones suaves */
        .modern-stat-card-primary,
        .modern-stat-card-warning,
        .modern-stat-card-danger,
        .modern-stat-card-secondary,
        .modern-stat-card-tertiary,
        .modern-stat-card-success {
          transition: all 0.3s ease;
        }
        
        .modern-stat-card-primary:hover,
        .modern-stat-card-warning:hover,
        .modern-stat-card-danger:hover,
        .modern-stat-card-secondary:hover,
        .modern-stat-card-tertiary:hover,
        .modern-stat-card-success:hover {
          transform: translateY(-4px);
          box-shadow: 0 15px 40px rgba(102, 126, 234, 0.3);
        }
      `}</style>
    </IonPage>
  );
};

export default DashboardPage;