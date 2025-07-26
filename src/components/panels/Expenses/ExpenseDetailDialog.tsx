// src/components/panels/Expenses/ExpenseDetailDialog.tsx - Modal moderno para ver detalles de gastos
import React from 'react';
import {
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
  IonButtons,
  IonIcon,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonGrid,
  IonRow,
  IonCol,
  IonText,
  IonBadge,
  IonItem,
  IonLabel,
  IonNote,
  IonList,
  IonAlert
} from '@ionic/react';
import {
  close,
  create,
  trash,
  storefront,
  receipt,
  calendar,
  person,
  pricetag,
  informationCircle,
  business,
  time,
  document,
  checkmarkCircle
} from 'ionicons/icons';

interface ExpenseDetailDialogProps {
  isOpen: boolean;
  expense: any;
  products: any[];
  onClose: () => void;
  onEditExpense: (expense: any) => void;
  onDeleteExpense: (expenseId: string) => Promise<void>;
}

const ExpenseDetailDialog: React.FC<ExpenseDetailDialogProps> = ({
  isOpen,
  expense,
  products,
  onClose,
  onEditExpense,
  onDeleteExpense
}) => {
  const [showDeleteAlert, setShowDeleteAlert] = React.useState(false);

  if (!expense) return null;

  // Función para formatear fecha
  const formatDate = (date: any): string => {
    if (!date) return 'Sin fecha';
    
    const d = date.seconds
      ? new Date(date.seconds * 1000)
      : new Date(date);
    
    return d.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Función para formatear hora completa
  const formatDateTime = (date: any): string => {
    if (!date) return 'Sin fecha';
    
    const d = date.seconds
      ? new Date(date.seconds * 1000)
      : new Date(date);
    
    return d.toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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

  // Función para obtener información del producto
  const getProductInfo = () => {
    if (!expense.productId) return null;
    
    const product = products.find(p => p.id === expense.productId);
    return product;
  };

  const productInfo = getProductInfo();

  // Componente para mostrar un detalle
  const DetailItem: React.FC<{
    label: string;
    value: string | number;
    icon?: string;
    highlight?: boolean;
  }> = ({ label, value, icon, highlight = false }) => (
    <div style={{
      background: highlight ? 'rgba(var(--ion-color-primary-rgb), 0.1)' : '#f8fafc',
      borderRadius: '12px',
      padding: '16px',
      border: highlight ? '1px solid var(--ion-color-primary)' : '1px solid rgba(0, 0, 0, 0.05)'
    }}>
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '8px',
        marginBottom: '4px'
      }}>
        {icon && (
          <IonIcon 
            icon={icon} 
            style={{ 
              fontSize: '16px', 
              color: highlight ? 'var(--ion-color-primary)' : '#6c757d' 
            }} 
          />
        )}
        <IonText style={{ 
          fontSize: '12px', 
          fontWeight: '600',
          color: '#6c757d',
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          {label}
        </IonText>
      </div>
      <IonText style={{ 
        fontSize: highlight ? '20px' : '16px',
        fontWeight: highlight ? '700' : '600',
        color: highlight ? 'var(--ion-color-primary)' : '#2c3e50'
      }}>
        {value}
      </IonText>
    </div>
  );

  return (
    <>
      <IonModal isOpen={isOpen} onDidDismiss={onClose}>
        <IonHeader>
          <IonToolbar>
            <IonTitle style={{ fontWeight: '600' }}>
              Detalles del gasto
            </IonTitle>
            <IonButtons slot="end">
              <IonButton onClick={onClose}>
                <IonIcon icon={close} />
              </IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>

        <IonContent>
          <div style={{ padding: '20px' }}>
            
            {/* Header del gasto */}
            <IonCard style={{ borderRadius: '20px', marginBottom: '20px', overflow: 'hidden' }}>
              <div style={{
                background: `linear-gradient(135deg, var(--ion-color-${getExpenseTypeColor(expense.type)}) 0%, var(--ion-color-${getExpenseTypeColor(expense.type)}-shade) 100%)`,
                padding: '24px',
                color: 'white'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  marginBottom: '16px'
                }}>
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.2)',
                    borderRadius: '16px',
                    width: '64px',
                    height: '64px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <IonIcon 
                      icon={expense.type === 'product' ? storefront : receipt}
                      style={{ fontSize: '32px', color: 'white' }}
                    />
                  </div>
                  
                  <div style={{ flex: 1 }}>
                    <h2 style={{ 
                      margin: '0 0 4px 0',
                      fontSize: '24px',
                      fontWeight: '700'
                    }}>
                      {expense.expenseNumber}
                    </h2>
                    <div style={{
                      background: 'rgba(255, 255, 255, 0.2)',
                      borderRadius: '20px',
                      padding: '4px 12px',
                      display: 'inline-block',
                      fontSize: '12px',
                      fontWeight: '600',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      {getExpenseTypeText(expense.type)}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ 
                      fontSize: '32px',
                      fontWeight: '700',
                      lineHeight: '1'
                    }}>
                      {expense.type === 'product' 
                        ? formatCurrency(expense.totalAmount)
                        : formatCurrency(expense.amount)
                      }
                    </div>
                    <div style={{ 
                      fontSize: '14px',
                      opacity: 0.8,
                      marginTop: '4px'
                    }}>
                      Importe total
                    </div>
                  </div>
                </div>

                <div style={{ 
                  fontSize: '14px',
                  opacity: 0.9
                }}>
                  <IonIcon icon={calendar} style={{ marginRight: '8px' }} />
                  {formatDate(expense.date)}
                </div>
              </div>

              {/* Botones de acción */}
              <IonCardContent>
                <div style={{ 
                  display: 'flex', 
                  gap: '12px',
                  justifyContent: 'center'
                }}>
                  <IonButton 
                    fill="outline"
                    onClick={() => onEditExpense(expense)}
                    style={{ '--border-radius': '12px' }}
                  >
                    <IonIcon icon={create} slot="start" />
                    Editar gasto
                  </IonButton>
                  
                  <IonButton 
                    fill="outline"
                    color="danger"
                    onClick={() => setShowDeleteAlert(true)}
                    style={{ '--border-radius': '12px' }}
                  >
                    <IonIcon icon={trash} slot="start" />
                    Eliminar
                  </IonButton>
                </div>
              </IonCardContent>
            </IonCard>

            {/* Información básica */}
            <IonCard style={{ borderRadius: '16px', marginBottom: '20px' }}>
              <IonCardHeader>
                <IonCardTitle style={{ fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <IonIcon icon={informationCircle} />
                  Información básica
                </IonCardTitle>
              </IonCardHeader>
              <IonCardContent>
                <IonGrid>
                  <IonRow>
                    <IonCol size="12" sizeMd="6">
                      <DetailItem
                        label="Número de gasto"
                        value={expense.expenseNumber}
                        icon={document}
                      />
                    </IonCol>
                    
                    <IonCol size="12" sizeMd="6">
                      <DetailItem
                        label="Tipo"
                        value={getExpenseTypeText(expense.type)}
                        icon={pricetag}
                      />
                    </IonCol>
                    
                    <IonCol size="12" sizeMd="6">
                      <DetailItem
                        label="Fecha"
                        value={formatDate(expense.date)}
                        icon={calendar}
                      />
                    </IonCol>
                    
                    <IonCol size="12" sizeMd="6">
                      <DetailItem
                        label="Registrado por"
                        value={expense.createdBy || 'Usuario desconocido'}
                        icon={person}
                      />
                    </IonCol>
                  </IonRow>
                </IonGrid>
              </IonCardContent>
            </IonCard>

            {/* Detalles específicos según el tipo */}
            {expense.type === 'product' ? (
              <IonCard style={{ borderRadius: '16px', marginBottom: '20px' }}>
                <IonCardHeader>
                  <IonCardTitle style={{ fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <IonIcon icon={storefront} />
                    Detalles de la venta
                  </IonCardTitle>
                </IonCardHeader>
                <IonCardContent>
                  <IonGrid>
                    <IonRow>
                      <IonCol size="12" sizeMd="6">
                        <DetailItem
                          label="Producto vendido"
                          value={expense.productName}
                        />
                      </IonCol>
                      
                      <IonCol size="12" sizeMd="6">
                        <DetailItem
                          label="Categoría del producto"
                          value={expense.productCategory || 'Sin categoría'}
                        />
                      </IonCol>
                      
                      <IonCol size="12" sizeMd="4">
                        <DetailItem
                          label="Cantidad vendida"
                          value={`${expense.quantitySold} ${productInfo?.unit || 'unidades'}`}
                        />
                      </IonCol>
                      
                      <IonCol size="12" sizeMd="4">
                        <DetailItem
                          label="Precio unitario"
                          value={formatCurrency(expense.unitPrice)}
                        />
                      </IonCol>
                      
                      <IonCol size="12" sizeMd="4">
                        <DetailItem
                          label="Total de la venta"
                          value={formatCurrency(expense.totalAmount)}
                          highlight={true}
                        />
                      </IonCol>
                      
                      {expense.saleReason && (
                        <IonCol size="12">
                          <DetailItem
                            label="Motivo de la venta"
                            value={expense.saleReason}
                          />
                        </IonCol>
                      )}
                    </IonRow>
                  </IonGrid>

                  {/* Información del producto si está disponible */}
                  {productInfo && (
                    <div style={{
                      background: 'rgba(var(--ion-color-success-rgb), 0.1)',
                      border: '1px solid var(--ion-color-success)',
                      borderRadius: '12px',
                      padding: '16px',
                      marginTop: '20px'
                    }}>
                      <h4 style={{ 
                        margin: '0 0 12px 0', 
                        color: 'var(--ion-color-success)',
                        fontSize: '16px',
                        fontWeight: '600',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        <IonIcon icon={checkmarkCircle} />
                        Información del producto
                      </h4>
                      
                      <IonGrid>
                        <IonRow>
                          <IonCol size="12" sizeMd="4">
                            <div style={{ marginBottom: '8px' }}>
                              <IonText style={{ fontSize: '12px', color: '#6c757d', fontWeight: '600' }}>
                                Stock actual
                              </IonText>
                              <div style={{ fontSize: '16px', fontWeight: '600', color: '#2c3e50' }}>
                                {productInfo.stock} {productInfo.unit}
                              </div>
                            </div>
                          </IonCol>
                          
                          {productInfo.cost && (
                            <IonCol size="12" sizeMd="4">
                              <div style={{ marginBottom: '8px' }}>
                                <IonText style={{ fontSize: '12px', color: '#6c757d', fontWeight: '600' }}>
                                  Costo del producto
                                </IonText>
                                <div style={{ fontSize: '16px', fontWeight: '600', color: '#2c3e50' }}>
                                  {formatCurrency(productInfo.cost)}
                                </div>
                              </div>
                            </IonCol>
                          )}
                          
                          {productInfo.minStock && (
                            <IonCol size="12" sizeMd="4">
                              <div style={{ marginBottom: '8px' }}>
                                <IonText style={{ fontSize: '12px', color: '#6c757d', fontWeight: '600' }}>
                                  Stock mínimo
                                </IonText>
                                <div style={{ fontSize: '16px', fontWeight: '600', color: '#2c3e50' }}>
                                  {productInfo.minStock} {productInfo.unit}
                                </div>
                              </div>
                            </IonCol>
                          )}
                        </IonRow>
                      </IonGrid>
                    </div>
                  )}
                </IonCardContent>
              </IonCard>
            ) : (
              <IonCard style={{ borderRadius: '16px', marginBottom: '20px' }}>
                <IonCardHeader>
                  <IonCardTitle style={{ fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <IonIcon icon={receipt} />
                    Detalles del gasto
                  </IonCardTitle>
                </IonCardHeader>
                <IonCardContent>
                  <IonGrid>
                    <IonRow>
                      <IonCol size="12">
                        <DetailItem
                          label="Descripción"
                          value={expense.description}
                        />
                      </IonCol>
                      
                      <IonCol size="12" sizeMd="6">
                        <DetailItem
                          label="Categoría"
                          value={expense.category || 'Sin categoría'}
                          icon={business}
                        />
                      </IonCol>
                      
                      <IonCol size="12" sizeMd="6">
                        <DetailItem
                          label="Importe"
                          value={formatCurrency(expense.amount)}
                          highlight={true}
                        />
                      </IonCol>
                      
                      {expense.supplier && (
                        <IonCol size="12">
                          <DetailItem
                            label="Proveedor"
                            value={expense.supplier}
                            icon={person}
                          />
                        </IonCol>
                      )}
                    </IonRow>
                  </IonGrid>
                </IonCardContent>
              </IonCard>
            )}

            {/* Notas adicionales */}
            {expense.notes && (
              <IonCard style={{ borderRadius: '16px', marginBottom: '20px' }}>
                <IonCardHeader>
                  <IonCardTitle style={{ fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <IonIcon icon={document} />
                    Notas adicionales
                  </IonCardTitle>
                </IonCardHeader>
                <IonCardContent>
                  <div style={{
                    background: '#f8fafc',
                    borderRadius: '12px',
                    padding: '16px',
                    border: '1px solid rgba(0, 0, 0, 0.05)'
                  }}>
                    <IonText style={{ 
                      fontSize: '16px',
                      color: '#2c3e50',
                      lineHeight: '1.5',
                      whiteSpace: 'pre-wrap'
                    }}>
                      {expense.notes}
                    </IonText>
                  </div>
                </IonCardContent>
              </IonCard>
            )}

            {/* Información de auditoría */}
            <IonCard style={{ borderRadius: '16px', marginBottom: '20px' }}>
              <IonCardHeader>
                <IonCardTitle style={{ fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <IonIcon icon={time} />
                  Información de registro
                </IonCardTitle>
              </IonCardHeader>
              <IonCardContent>
                <IonGrid>
                  <IonRow>
                    <IonCol size="12" sizeMd="6">
                      <DetailItem
                        label="Creado por"
                        value={expense.createdBy || 'Usuario desconocido'}
                        icon={person}
                      />
                    </IonCol>
                    
                    <IonCol size="12" sizeMd="6">
                      <DetailItem
                        label="Fecha de creación"
                        value={formatDateTime(expense.createdAt)}
                        icon={calendar}
                      />
                    </IonCol>
                    
                    {expense.updatedAt && (
                      <IonCol size="12">
                        <DetailItem
                          label="Última modificación"
                          value={formatDateTime(expense.updatedAt)}
                          icon={time}
                        />
                      </IonCol>
                    )}
                  </IonRow>
                </IonGrid>
              </IonCardContent>
            </IonCard>

          </div>
        </IonContent>
      </IonModal>

      {/* Alert de confirmación para eliminar */}
      <IonAlert
        isOpen={showDeleteAlert}
        onDidDismiss={() => setShowDeleteAlert(false)}
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
              onDeleteExpense(expense.id);
              onClose();
            }
          }
        ]}
      />
    </>
  );
};

export default ExpenseDetailDialog;