// src/components/panels/Expenses/ExpensesPanel.tsx - Panel CORREGIDO para gestión de gastos
import React, { useState } from 'react';
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
  IonIcon,
  IonButton,
  IonRefresher,
  IonRefresherContent,
  IonBadge,
  IonSpinner,
  IonText,
  IonSearchbar,
  IonSelect,
  IonSelectOption,
  IonFab,
  IonFabButton,
  IonAlert,
  IonPopover,
  IonList,
  IonItem,
  IonLabel
} from '@ionic/react';
import {
  add,
  refresh,
  receipt,
  storefrontOutline,
  cashOutline,
  filterOutline,
  eyeOutline,
  createOutline,
  trashOutline,
  businessOutline,
  ellipsisVertical,
  checkmarkCircle,
  closeCircle
} from 'ionicons/icons';

// Importar componente de navegación y modales modernos
import PanelSelector from '../../PanelSelector';
import ExpenseDialog from './ExpenseDialog';
import ExpenseDetailDialog from './ExpenseDetailDialog';

interface ExpensesPanelProps {
  expenses: any[];
  products: any[];
  loading: boolean;
  error: string | null;
  selectedExpense: any;
  dialogOpen: boolean;
  dialogType: string;
  filterOptions: any;
  statistics: any;
  onAddExpense: () => void;
  onEditExpense: (expense: any) => void;
  onViewExpense: (expense: any) => void;
  onDeleteExpense: (expenseId: string) => Promise<void>;
  onSaveExpense: (expenseData: any) => Promise<boolean>;
  onFilterChange: (filterType: string, value: any) => void;
  onSearch: (searchTerm: string) => void;
  onCloseDialog: () => void;
  onRefresh: () => Promise<void>;
}

const ExpensesPanel: React.FC<ExpensesPanelProps> = ({
  expenses,
  products,
  loading,
  error,
  selectedExpense,
  dialogOpen,
  dialogType,
  filterOptions,
  statistics,
  onAddExpense,
  onEditExpense,
  onViewExpense,
  onDeleteExpense,
  onSaveExpense,
  onFilterChange,
  onSearch,
  onCloseDialog,
  onRefresh
}) => {
  // Estados locales para la UI
  const [showFilters, setShowFilters] = useState(false);
  const [deleteAlert, setDeleteAlert] = useState<{isOpen: boolean, expenseId: string}>({
    isOpen: false,
    expenseId: ''
  });

  // Permisos del usuario
  const userPermissions = [
    'dashboard.view',
    'products.view',
    'transfers.view', 
    'fumigations.view',
    'fields.view',
    'warehouses.view',
    'reports.view',
    'expenses.view',
    'expenses.create',
    'expenses.edit',
    'expenses.delete'
  ];

  // Función para manejar refresh
  const doRefresh = async (event: CustomEvent) => {
    try {
      await onRefresh();
    } catch (err) {
      console.error('Error al refrescar:', err);
    } finally {
      event.detail.complete();
    }
  };

  // Función para formatear fecha
  const formatDate = (date: any): string => {
    if (!date) return '-';
    
    try {
      const dateObj = date.seconds 
        ? new Date(date.seconds * 1000)
        : new Date(date);
      return dateObj.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch (err) {
      return '-';
    }
  };

  // Función para formatear moneda
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS'
    }).format(amount || 0);
  };

  // Componente para tarjetas de estadísticas modernas - MANTENIENDO ESTILO ORIGINAL
  const ModernStatCard: React.FC<{
    title: string;
    value: string | number;
    description: string;
    icon: string;
    color: string;
  }> = ({ title, value, description, icon, color }) => (
    <IonCol size="12" sizeMd="6" sizeLg="3">
      <div
        style={{
          background: 'white',
          borderRadius: '16px',
          padding: '20px',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
          border: '1px solid rgba(0, 0, 0, 0.05)',
          height: '100%',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
          <div
            style={{
              background: `linear-gradient(135deg, var(--ion-color-${color}) 0%, var(--ion-color-${color}-shade) 100%)`,
              borderRadius: '12px',
              width: '48px',
              height: '48px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <IonIcon icon={icon} style={{ fontSize: '24px', color: 'white' }} />
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{ 
              margin: 0, 
              fontSize: '32px', 
              fontWeight: '700',
              color: '#1a1a1a',
              lineHeight: '1'
            }}>
              {value}
            </h3>
          </div>
        </div>
        <div>
          <h4 style={{ 
            margin: '0 0 4px 0', 
            fontSize: '16px', 
            fontWeight: '600',
            color: '#4a5568' 
          }}>
            {title}
          </h4>
          <p style={{ 
            margin: 0, 
            fontSize: '14px', 
            color: '#8e9aaf',
            fontWeight: '500' 
          }}>
            {description}
          </p>
        </div>
      </div>
    </IonCol>
  );

  // Si está cargando, mostrar spinner
  if (loading) {
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
              Gastos
            </IonTitle>
          </IonToolbar>
        </IonHeader>
        
        <IonContent>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            height: '300px',
            flexDirection: 'column',
            gap: '20px'
          }}>
            <IonSpinner name="crescent" style={{ '--color': 'var(--ion-color-primary)' }} />
            <IonText style={{ color: '#8e9aaf', fontWeight: '500' }}>
              Cargando gastos...
            </IonText>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      {/* ESTRUCTURA CORREGIDA: Header igual al Dashboard */}
      <IonHeader className="ion-no-border">
        <IonToolbar 
          style={{
            '--background': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            '--color': 'white'
          }}
        >
          <IonTitle style={{ fontWeight: '700', fontSize: '20px' }}>
            Gastos
          </IonTitle>
          <div slot="end" style={{ display: 'flex', gap: '8px', paddingRight: '16px' }}>
            {/* Selector de páginas */}
            <PanelSelector
              userPermissions={userPermissions}
              currentRoute="/gastos"
              onNavigate={(route) => {
                console.log('Navegando a:', route);
                window.location.href = route;
              }}
            />
            
            <IonButton
              fill="clear"
              onClick={() => onRefresh()}
              disabled={loading}
              style={{ 
                '--color': 'white',
                '--border-radius': '12px'
              }}
            >
              <IonIcon icon={refresh} />
            </IonButton>
          </div>
        </IonToolbar>
      </IonHeader>

              {/* ESTRUCTURA CORREGIDA: Content igual al Dashboard - SIN POSICIÓN FIJA */}
      <IonContent 
        style={{ '--background': '#f8fafc' }}
        forceOverscroll={false}
        scrollEvents={true}
      >
        <IonRefresher slot="fixed" onIonRefresh={doRefresh}>
          <IonRefresherContent></IonRefresherContent>
        </IonRefresher>

        {/* Header con título - igual al Dashboard */}
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
              Gestión de Gastos 💰
            </h1>
            <p style={{ 
              color: 'rgba(255, 255, 255, 0.8)', 
              fontSize: '16px',
              margin: 0,
              fontWeight: '400'
            }}>
              Controla tus gastos y ventas de productos
            </p>
          </div>
        </div>

        {/* Mostrar error si existe */}
        {error && (
          <div style={{ padding: '0 20px 20px' }}>
            <IonCard color="danger">
              <IonCardContent>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <IonIcon icon={closeCircle} style={{ fontSize: '24px', color: 'white' }} />
                  <div>
                    <h3 style={{ margin: '0 0 4px 0', color: 'white', fontSize: '18px' }}>
                      Error al cargar gastos
                    </h3>
                    <p style={{ margin: 0, color: 'rgba(255, 255, 255, 0.9)' }}>{error}</p>
                  </div>
                  <IonButton 
                    fill="outline" 
                    color="light" 
                    size="small" 
                    onClick={() => onRefresh()}
                    style={{ marginLeft: 'auto' }}
                  >
                    Reintentar
                  </IonButton>
                </div>
              </IonCardContent>
            </IonCard>
          </div>
        )}

        {/* Estadísticas principales - MANTENIENDO DISEÑO ORIGINAL */}
        <div style={{ padding: '0 20px', marginTop: '-40px', marginBottom: '30px' }}>
          <IonGrid>
            <IonRow>
              <ModernStatCard
                title="Total Gastos"
                value={statistics.totalExpenses}
                description="Registros totales"
                icon={receipt}
                color="primary"
              />
              <ModernStatCard
                title="Ventas de Productos"
                value={statistics.productExpenses}
                description={`${statistics.totalProductsSold} unidades vendidas`}
                icon={storefrontOutline}
                color="success"
              />
              <ModernStatCard
                title="Gastos Varios"
                value={statistics.miscExpenses}
                description="Gastos administrativos"
                icon={businessOutline}
                color="warning"
              />
              <ModernStatCard
                title="Importe Total"
                value={formatCurrency(statistics.totalAmount)}
                description={`Este mes: ${formatCurrency(statistics.thisMonthAmount)}`}
                icon={cashOutline}
                color="secondary"
              />
            </IonRow>
          </IonGrid>
        </div>

        {/* Barra de búsqueda y filtros - MANTENIENDO DISEÑO ORIGINAL */}
        <div style={{ padding: '0 20px 20px' }}>
          <IonCard style={{ borderRadius: '16px', marginBottom: '20px' }}>
            <IonCardContent>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <IonSearchbar
                  placeholder="Buscar gastos..."
                  debounce={300}
                  onIonInput={(e) => onSearch(e.detail.value!)}
                  style={{
                    '--background': 'transparent',
                    '--color': '#000',
                    '--placeholder-color': '#8e8e93',
                    '--icon-color': '#8e8e93',
                    '--clear-button-color': '#8e8e93',
                    flex: 1
                  }}
                />
                
                <IonButton
                  fill="outline"
                  onClick={() => setShowFilters(!showFilters)}
                  style={{ '--border-radius': '12px' }}
                >
                  <IonIcon icon={filterOutline} />
                </IonButton>
              </div>

              {/* Filtros expandibles */}
              {showFilters && (
                <div style={{ marginTop: '16px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <IonSelect
                    placeholder="Tipo de gasto"
                    value={filterOptions.type}
                    onIonChange={(e) => onFilterChange('type', e.detail.value)}
                    style={{ minWidth: '150px' }}
                  >
                    <IonSelectOption value="">Todos</IonSelectOption>
                    <IonSelectOption value="product">Ventas de productos</IonSelectOption>
                    <IonSelectOption value="misc">Gastos varios</IonSelectOption>
                  </IonSelect>
                  
                  <IonSelect
                    placeholder="Categoría"
                    value={filterOptions.category}
                    onIonChange={(e) => onFilterChange('category', e.detail.value)}
                    style={{ minWidth: '150px' }}
                  >
                    <IonSelectOption value="">Todas</IonSelectOption>
                    <IonSelectOption value="combustible">Combustible</IonSelectOption>
                    <IonSelectOption value="mantenimiento">Mantenimiento</IonSelectOption>
                    <IonSelectOption value="servicios">Servicios</IonSelectOption>
                    <IonSelectOption value="administrativo">Administrativo</IonSelectOption>
                  </IonSelect>
                </div>
              )}
            </IonCardContent>
          </IonCard>

          {/* Botón "Agregar Gastos" - CORREGIDO PARA QUE FUNCIONE */}
          <IonCard style={{ borderRadius: '16px', marginBottom: '20px' }}>
            <IonCardContent style={{ textAlign: 'center', padding: '20px' }}>
              <IonButton 
                expand="block"
                onClick={onAddExpense}
                style={{ 
                  '--border-radius': '12px',
                  height: '48px',
                  fontWeight: '600'
                }}
              >
                <IonIcon icon={add} slot="start" />
                Agregar Gastos
              </IonButton>
            </IonCardContent>
          </IonCard>
        </div>

        {/* Lista de gastos - PADDING EXACTO COMO DASHBOARD */}
        <div style={{ padding: '0 20px 100px' }}>
          {expenses.length === 0 ? (
            <IonCard style={{ borderRadius: '16px', textAlign: 'center' }}>
              <IonCardContent style={{ padding: '40px 20px' }}>
                <IonIcon 
                  icon={receipt} 
                  style={{ fontSize: '64px', color: '#8e9aaf', marginBottom: '16px' }} 
                />
                <h3 style={{ color: '#4a5568', margin: '0 0 8px 0' }}>
                  No hay gastos registrados
                </h3>
                <p style={{ color: '#8e9aaf', margin: '0 0 20px 0' }}>
                  Comienza agregando tu primer gasto o venta de producto
                </p>
                <IonButton 
                  fill="outline" 
                  onClick={onAddExpense}
                  style={{ '--border-radius': '12px' }}
                >
                  <IonIcon icon={add} slot="start" />
                  Agregar Gasto
                </IonButton>
              </IonCardContent>
            </IonCard>
          ) : (
            <IonGrid>
              <IonRow>
                {expenses.map((expense) => (
                  <IonCol size="12" sizeMd="6" sizeLg="4" key={expense.id}>
                    <IonCard 
                      button
                      onClick={() => onViewExpense(expense)}
                      style={{ 
                        borderRadius: '16px',
                        margin: '0 0 16px 0',
                        cursor: 'pointer',
                        transition: 'transform 0.2s, box-shadow 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.12)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.08)';
                      }}
                    >
                      <IonCardContent>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                          <div
                            style={{
                              background: expense.type === 'product' 
                                ? 'linear-gradient(135deg, var(--ion-color-success) 0%, var(--ion-color-success-shade) 100%)'
                                : 'linear-gradient(135deg, var(--ion-color-warning) 0%, var(--ion-color-warning-shade) 100%)',
                              borderRadius: '8px',
                              width: '40px',
                              height: '40px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            <IonIcon 
                              icon={expense.type === 'product' ? storefrontOutline : receipt} 
                              style={{ fontSize: '20px', color: 'white' }} 
                            />
                          </div>
                          
                          <div style={{ flex: 1 }}>
                            <h3 style={{ 
                              margin: 0, 
                              fontSize: '18px', 
                              fontWeight: '600',
                              color: '#1a1a1a'
                            }}>
                              {expense.type === 'product' ? expense.productName : expense.description}
                            </h3>
                            <p style={{ 
                              margin: '2px 0 0 0', 
                              fontSize: '14px', 
                              color: '#8e9aaf' 
                            }}>
                              {formatDate(expense.date)}
                            </p>
                          </div>
                          
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ 
                              fontSize: '20px', 
                              fontWeight: '700',
                              color: '#1a1a1a'
                            }}>
                              {formatCurrency(expense.type === 'product' ? expense.totalAmount : expense.amount)}
                            </div>
                            
                            <IonBadge 
                              color={expense.type === 'product' ? 'success' : 'warning'}
                              style={{ fontSize: '11px' }}
                            >
                              {expense.type === 'product' ? 'Venta' : 'Gasto'}
                            </IonBadge>
                          </div>
                        </div>
                        
                        {/* Información adicional */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '14px', color: '#8e9aaf' }}>
                            {expense.category || expense.productCategory || 'Sin categoría'}
                          </span>
                          
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <IonButton
                              fill="clear"
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                onEditExpense(expense);
                              }}
                            >
                              <IonIcon icon={createOutline} />
                            </IonButton>
                            
                            <IonButton
                              fill="clear"
                              size="small"
                              color="danger"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteAlert({ isOpen: true, expenseId: expense.id });
                              }}
                            >
                              <IonIcon icon={trashOutline} />
                            </IonButton>
                          </div>
                        </div>
                      </IonCardContent>
                    </IonCard>
                  </IonCol>
                ))}
              </IonRow>
            </IonGrid>
          )}
        </div>

        {/* Botón FAB para agregar gasto (+ pequeño) - FUNCIONANDO */}
        <IonFab 
          vertical="bottom" 
          horizontal="end" 
          slot="fixed"
          style={{ marginBottom: '20px', marginRight: '20px' }}
        >
          <IonFabButton 
            onClick={onAddExpense}
            style={{
              '--background': 'linear-gradient(135deg, var(--ion-color-primary) 0%, var(--ion-color-primary-shade) 100%)',
              '--box-shadow': '0 8px 32px rgba(0, 0, 0, 0.3)'
            }}
          >
            <IonIcon icon={add} />
          </IonFabButton>
        </IonFab>

        {/* Diálogos */}
        <ExpenseDialog
          isOpen={dialogOpen && (dialogType === 'add-expense' || dialogType === 'edit-expense')}
          expense={selectedExpense}
          products={products}
          isNew={dialogType === 'add-expense'}
          onSave={onSaveExpense}
          onClose={onCloseDialog}
        />

        <ExpenseDetailDialog
          isOpen={dialogOpen && dialogType === 'view-expense'}
          expense={selectedExpense}
          products={products}
          onClose={onCloseDialog}
          onEditExpense={(expense) => {
            onCloseDialog();
            if (expense) {
              setTimeout(() => onEditExpense(expense), 100);
            }
          }}
          onDeleteExpense={(expenseId) => {
            if (expenseId) {
              return onDeleteExpense(expenseId);
            }
            return Promise.resolve();
          }}
        />

        {/* Alerta de confirmación para eliminar */}
        <IonAlert
          isOpen={deleteAlert.isOpen}
          onDidDismiss={() => setDeleteAlert({ isOpen: false, expenseId: '' })}
          header="Confirmar eliminación"
          message="¿Estás seguro de que deseas eliminar este gasto? Esta acción no se puede deshacer."
          buttons={[
            {
              text: 'Cancelar',
              role: 'cancel'
            },
            {
              text: 'Eliminar',
              role: 'destructive',
              handler: () => {
                if (deleteAlert.expenseId) {
                  onDeleteExpense(deleteAlert.expenseId);
                }
              }
            }
          ]}
        />

      </IonContent>
    </IonPage>
  );
};

export default ExpensesPanel;