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

  // Permisos del usuario (hardcoded por ahora, en producción vendría de un contexto)
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

  return (
    <IonPage>
      {/* Header moderno con gradiente */}
      <IonHeader className="ion-no-border">
        <IonToolbar 
          style={{
            '--background': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            '--color': 'white'
          }}
        >
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <PanelSelector 
                userPermissions={userPermissions}
                currentRoute="/expenses"
              />
              <IonTitle style={{ fontSize: '20px', fontWeight: '700' }}>
                Gastos
              </IonTitle>
            </div>
            
            <IonButton
              fill="clear"
              onClick={onRefresh}
              style={{ '--color': 'white' }}
            >
              <IonIcon icon={refresh} />
            </IonButton>
          </div>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        <IonRefresher slot="fixed" onIonRefresh={doRefresh}>
          <IonRefresherContent />
        </IonRefresher>

        {/* Hero Section con gradiente */}
        <div style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          padding: '40px 20px 80px',
          color: 'white',
          position: 'relative'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <h1 style={{
              fontSize: '32px',
              fontWeight: '700',
              margin: '0 0 12px 0'
            }}>
              Control de Gastos
            </h1>
            <p style={{
              fontSize: '16px',
              opacity: 0.9,
              margin: 0
            }}>
              Gestiona ventas de productos y gastos varios
            </p>
          </div>
        </div>

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
                    '--background': '#f8f9fa',
                    '--border-radius': '12px',
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
                <div style={{ 
                  marginTop: '16px', 
                  paddingTop: '16px', 
                  borderTop: '1px solid #e9ecef',
                  display: 'flex',
                  gap: '12px',
                  flexWrap: 'wrap'
                }}>
                  <IonSelect
                    placeholder="Tipo"
                    onIonChange={(e) => onFilterChange('type', e.detail.value)}
                    style={{ minWidth: '120px' }}
                  >
                    {filterOptions.types?.map((option: any) => (
                      <IonSelectOption key={option.value} value={option.value}>
                        {option.label}
                      </IonSelectOption>
                    ))}
                  </IonSelect>
                  
                  <IonSelect
                    placeholder="Categoría"
                    onIonChange={(e) => onFilterChange('category', e.detail.value)}
                    style={{ minWidth: '140px' }}
                  >
                    {filterOptions.categories?.map((option: any) => (
                      <IonSelectOption key={option.value} value={option.value}>
                        {option.label}
                      </IonSelectOption>
                    ))}
                  </IonSelect>
                </div>
              )}
            </IonCardContent>
          </IonCard>
        </div>

        {/* Lista de gastos */}
        <div style={{ padding: '0 20px 100px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <IonSpinner name="crescent" />
              <IonText>
                <p style={{ marginTop: '16px', color: '#6c757d' }}>
                  Cargando gastos...
                </p>
              </IonText>
            </div>
          ) : error ? (
            <IonCard style={{ borderRadius: '16px' }}>
              <IonCardContent style={{ textAlign: 'center', padding: '40px' }}>
                <IonIcon 
                  icon={closeCircle} 
                  style={{ fontSize: '48px', color: '#dc3545', marginBottom: '16px' }} 
                />
                <IonText color="danger">
                  <h3>Error al cargar gastos</h3>
                  <p>{error}</p>
                </IonText>
                <IonButton onClick={onRefresh} style={{ marginTop: '16px' }}>
                  <IonIcon icon={refresh} slot="start" />
                  Reintentar
                </IonButton>
              </IonCardContent>
            </IonCard>
          ) : expenses.length === 0 ? (
            <IonCard style={{ borderRadius: '16px' }}>
              <IonCardContent style={{ textAlign: 'center', padding: '40px' }}>
                <IonIcon 
                  icon={receipt} 
                  style={{ fontSize: '48px', color: '#6c757d', marginBottom: '16px' }} 
                />
                <IonText>
                  <h3>No hay gastos registrados</h3>
                  <p style={{ color: '#6c757d' }}>
                    Comienza agregando tu primer gasto
                  </p>
                </IonText>
                <IonButton onClick={onAddExpense} style={{ marginTop: '16px' }}>
                  <IonIcon icon={add} slot="start" />
                  Agregar Gasto
                </IonButton>
              </IonCardContent>
            </IonCard>
          ) : (
            expenses.map((expense) => (
              <ModernExpenseItem key={expense.id} expense={expense} />
            ))
          )}
        </div>

        {/* FAB para agregar gastos */}
        <IonFab vertical="bottom" horizontal="end" slot="fixed">
          <IonFabButton onClick={onAddExpense}>
            <IonIcon icon={add} />
          </IonFabButton>
        </IonFab>

        {/* Alert de confirmación para eliminar */}
        <IonAlert
          isOpen={deleteAlert.isOpen}
          onDidDismiss={() => setDeleteAlert({isOpen: false, expenseId: ''})}
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