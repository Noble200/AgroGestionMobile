// src/components/panels/Expenses/ExpensesPanel.tsx - Panel moderno para gestión de gastos
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

  // Función para formatear moneda
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS'
    }).format(amount || 0);
  };

  // Función para obtener el texto del tipo de gasto
  const getExpenseTypeText = (type: string): string => {
    return type === 'product' ? 'Venta de producto' : 'Gasto varios';
  };

  // Función para obtener el color según el tipo
  const getExpenseTypeColor = (type: string): string => {
    return type === 'product' ? 'success' : 'primary';
  };

  // Componente para tarjetas de estadísticas modernas
  const ModernStatCard: React.FC<{
    title: string;
    value: string | number;
    description: string;
    icon: string;
    color: string;
  }> = ({ title, value, description, icon, color }) => (
    <IonCol size="6" sizeMd="3">
      <div 
        style={{
          background: 'white',
          borderRadius: '20px',
          padding: '24px 20px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
          border: '1px solid rgba(0, 0, 0, 0.05)',
          minHeight: '140px',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          overflow: 'hidden',
          transition: 'all 0.3s ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-4px)';
          e.currentTarget.style.boxShadow = '0 12px 40px rgba(0, 0, 0, 0.12)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.08)';
        }}
      >
        {/* Línea de color lateral */}
        <div 
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: '4px',
            background: `var(--ion-color-${color})`
          }}
        />
        
        {/* Header con icono */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          marginBottom: '16px' 
        }}>
          <div 
            style={{
              background: `var(--ion-color-${color}-tint)`,
              borderRadius: '12px',
              width: '48px',
              height: '48px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: '12px'
            }}
          >
            <IonIcon 
              icon={icon} 
              style={{ 
                fontSize: '24px', 
                color: `var(--ion-color-${color})` 
              }} 
            />
          </div>
          <div>
            <div style={{ 
              fontSize: '14px', 
              color: '#6c757d',
              fontWeight: '600',
              marginBottom: '4px'
            }}>
              {title}
            </div>
          </div>
        </div>

        {/* Valor principal */}
        <div style={{ 
          fontSize: '32px', 
          fontWeight: '700', 
          color: '#2c3e50',
          lineHeight: '1',
          marginBottom: '8px'
        }}>
          {typeof value === 'number' ? value.toLocaleString() : value}
        </div>
        
        {/* Descripción */}
        <div style={{ 
          fontSize: '12px', 
          color: '#8e9aaf'
        }}>
          {description}
        </div>
      </div>
    </IonCol>
  );

  // Componente para items de gasto modernos
  const ModernExpenseItem: React.FC<{
    expense: any;
  }> = ({ expense }) => (
    <IonCard style={{ 
      margin: '8px 0',
      borderRadius: '16px',
      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.06)',
      border: '1px solid rgba(0, 0, 0, 0.05)'
    }}>
      <IonCardContent style={{ padding: '20px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          {/* Información principal */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
            {/* Icono del tipo */}
            <div 
              style={{
                background: `var(--ion-color-${getExpenseTypeColor(expense.type)}-tint)`,
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
                icon={expense.type === 'product' ? storefrontOutline : receipt} 
                style={{ 
                  fontSize: '20px', 
                  color: `var(--ion-color-${getExpenseTypeColor(expense.type)})` 
                }} 
              />
            </div>
            
            {/* Detalles */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '4px'
              }}>
                <h3 style={{ 
                  margin: 0,
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#2c3e50',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {expense.type === 'product' ? expense.productName : expense.description}
                </h3>
                
                <IonBadge 
                  color={getExpenseTypeColor(expense.type)}
                  style={{ 
                    '--background': `var(--ion-color-${getExpenseTypeColor(expense.type)}-tint)`,
                    '--color': `var(--ion-color-${getExpenseTypeColor(expense.type)})`,
                    fontSize: '11px',
                    padding: '4px 8px'
                  }}
                >
                  {getExpenseTypeText(expense.type)}
                </IonBadge>
              </div>
              
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                marginBottom: '8px'
              }}>
                <span style={{ 
                  fontSize: '14px',
                  color: '#495057',
                  fontWeight: '500'
                }}>
                  {expense.expenseNumber}
                </span>
                
                <span style={{ 
                  fontSize: '14px',
                  color: '#6c757d'
                }}>
                  {formatDate(expense.date)}
                </span>
              </div>

              {/* Información específica según tipo */}
              {expense.type === 'product' ? (
                <div style={{ fontSize: '12px', color: '#8e9aaf' }}>
                  {expense.quantitySold} unidades × {formatCurrency(expense.unitPrice)}
                  {expense.saleReason && ` • ${expense.saleReason}`}
                </div>
              ) : (
                <div style={{ fontSize: '12px', color: '#8e9aaf' }}>
                  {expense.category || 'Sin categoría'}
                  {expense.supplier && ` • Proveedor: ${expense.supplier}`}
                </div>
              )}
            </div>
          </div>
          
          {/* Importe y acciones */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '16px',
            flexShrink: 0
          }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ 
                fontSize: '20px',
                fontWeight: '700',
                color: '#2c3e50'
              }}>
                {expense.type === 'product' 
                  ? formatCurrency(expense.totalAmount)
                  : formatCurrency(expense.amount)
                }
              </div>
            </div>
            
            {/* Botón de acciones */}
            <IonButton
              id={`expense-actions-${expense.id}`}
              fill="clear"
              size="small"
              style={{ '--color': '#6c757d' }}
            >
              <IonIcon icon={ellipsisVertical} />
            </IonButton>
            
            {/* Popover de acciones */}
            <IonPopover trigger={`expense-actions-${expense.id}`} dismissOnSelect={true}>
              <IonContent>
                <IonList>
                  <IonItem button onClick={() => onViewExpense(expense)}>
                    <IonIcon icon={eyeOutline} slot="start" />
                    <IonLabel>Ver detalles</IonLabel>
                  </IonItem>
                  <IonItem button onClick={() => onEditExpense(expense)}>
                    <IonIcon icon={createOutline} slot="start" />
                    <IonLabel>Editar</IonLabel>
                  </IonItem>
                  <IonItem 
                    button 
                    onClick={() => setDeleteAlert({isOpen: true, expenseId: expense.id})}
                    color="danger"
                  >
                    <IonIcon icon={trashOutline} slot="start" />
                    <IonLabel>Eliminar</IonLabel>
                  </IonItem>
                </IonList>
              </IonContent>
            </IonPopover>
          </div>
        </div>
      </IonCardContent>
    </IonCard>
  );

  // Mostrar loading
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

      <IonContent style={{ '--background': '#f8fafc' }}>
        <IonRefresher slot="fixed" onIonRefresh={doRefresh}>
          <IonRefresherContent></IonRefresherContent>
        </IonRefresher>

        {/* Header con título */}
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

        {/* Estadísticas principales */}
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

        {/* Barra de búsqueda y filtros */}
        <div style={{ padding: '0 20px 20px' }}>
          <IonCard style={{ borderRadius: '16px', marginBottom: '20px' }}>
            <IonCardContent>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <IonSearchbar
                  placeholder="Buscar gastos..."
                  debounce={300}
                  onIonInput={(e) => onSearch(e.detail.value!)}
                  style={{ 
                    flex: 1,
                    '--background': '#f8fafc',
                    '--border-radius': '12px'
                  }}
                />
                
                <IonButton
                  fill="outline"
                  onClick={() => setShowFilters(!showFilters)}
                  style={{ '--border-radius': '12px' }}
                >
                  <IonIcon icon={filterOutline} slot="start" />
                  Filtros
                </IonButton>
              </div>

              {/* Panel de filtros expandible */}
              {showFilters && (
                <div style={{ 
                  marginTop: '20px', 
                  padding: '20px',
                  background: '#f8fafc',
                  borderRadius: '12px',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '16px'
                }}>
                  <div>
                    <IonLabel>Tipo de gasto</IonLabel>
                    <IonSelect
                      placeholder="Seleccionar tipo"
                      onSelectionChange={(e) => onFilterChange('type', e.detail.value)}
                    >
                      {filterOptions.types?.map((option: any) => (
                        <IonSelectOption key={option.value} value={option.value}>
                          {option.label}
                        </IonSelectOption>
                      ))}
                    </IonSelect>
                  </div>
                  
                  <div>
                    <IonLabel>Categoría</IonLabel>
                    <IonSelect
                      placeholder="Seleccionar categoría"
                      onSelectionChange={(e) => onFilterChange('category', e.detail.value)}
                    >
                      {filterOptions.categories?.map((option: any) => (
                        <IonSelectOption key={option.value} value={option.value}>
                          {option.label}
                        </IonSelectOption>
                      ))}
                    </IonSelect>
                  </div>
                </div>
              )}
            </IonCardContent>
          </IonCard>
        </div>

        {/* Lista de gastos */}
        <div style={{ padding: '0 20px 100px' }}>
          {expenses.length > 0 ? (
            <div>
              {expenses.map((expense) => (
                <ModernExpenseItem
                  key={expense.id}
                  expense={expense}
                />
              ))}
            </div>
          ) : (
            <div style={{ 
              textAlign: 'center',
              padding: '60px 20px',
              background: 'white',
              borderRadius: '20px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)'
            }}>
              <div 
                style={{
                  background: 'rgba(102, 126, 234, 0.1)',
                  borderRadius: '50%',
                  width: '80px',
                  height: '80px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 20px'
                }}
              >
                <IonIcon 
                  icon={receipt} 
                  style={{ fontSize: '40px', color: 'var(--ion-color-primary)' }} 
                />
              </div>
              <h2 style={{ 
                fontSize: '24px', 
                fontWeight: '600', 
                color: '#2c3e50',
                margin: '0 0 8px 0'
              }}>
                No hay gastos registrados
              </h2>
              <p style={{ 
                fontSize: '16px', 
                color: '#8e9aaf',
                margin: '0 0 24px 0'
              }}>
                Comienza registrando un nuevo gasto o venta de producto
              </p>
              <IonButton 
                onClick={onAddExpense}
                style={{ '--border-radius': '12px' }}
              >
                <IonIcon icon={add} slot="start" />
                Registrar gasto
              </IonButton>
            </div>
          )}
        </div>

        {/* FAB para agregar gasto */}
        <IonFab vertical="bottom" horizontal="end" slot="fixed">
          <IonFabButton onClick={onAddExpense}>
            <IonIcon icon={add} />
          </IonFabButton>
        </IonFab>

        {/* Alert de confirmación para eliminar */}
        <IonAlert
          isOpen={deleteAlert.isOpen}
          onDidDismiss={() => setDeleteAlert({isOpen: false, expenseId: ''})}
          header={'Confirmar eliminación'}
          message={'¿Estás seguro de que deseas eliminar este gasto? Esta acción no se puede deshacer.'}
          buttons={[
            {
              text: 'Cancelar',
              role: 'cancel'
            },
            {
              text: 'Eliminar',
              role: 'destructive',
              handler: () => {
                onDeleteExpense(deleteAlert.expenseId);
                setDeleteAlert({isOpen: false, expenseId: ''});
              }
            }
          ]}
        />

        {/* Modales modernos */}
        {dialogOpen && (
          <>
            {(dialogType === 'add-expense' || dialogType === 'edit-expense') && (
              <ExpenseDialog
                isOpen={dialogOpen}
                expense={selectedExpense}
                products={products}
                isNew={dialogType === 'add-expense'}
                onSave={onSaveExpense}
                onClose={onCloseDialog}
              />
            )}
            
            {dialogType === 'view-expense' && (
              <ExpenseDetailDialog
                isOpen={dialogOpen}
                expense={selectedExpense}
                products={products}
                onClose={onCloseDialog}
                onEditExpense={onEditExpense}
                onDeleteExpense={onDeleteExpense}
              />
            )}
          </>
        )}
      </IonContent>
    </IonPage>
  );
};

export default ExpensesPanel;