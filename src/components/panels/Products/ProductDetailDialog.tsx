// src/components/panels/Products/ProductDetailDialog.tsx - Modal para ver detalles del producto
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
  IonGrid,
  IonRow,
  IonCol,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonChip,
  IonLabel,
  IonItem,
  IonBadge
} from '@ionic/react';
import {
  close,
  createOutline,
  trashOutline,
  cube,
  pricetag,
  business,
  calendar,
  location,
  informationCircle,
  warningOutline,
  checkmarkCircle,
  alertCircle,
  leaf,
  storefrontOutline
} from 'ionicons/icons';

interface ControllerProduct {
  id: string;
  name?: string;
  code?: string;
  category?: string;
  storageType?: string;
  unit?: string;
  stock?: number;
  minStock?: number;
  lotNumber?: string;
  storageConditions?: string;
  dimensions?: string;
  supplierCode?: string;
  cost?: number;
  expirationDate?: any;
  warehouseId?: string;
  fieldId?: string;
  description?: string;
  notes?: string;
  createdAt?: any;
  updatedAt?: any;
}

interface ProductDetailDialogProps {
  isOpen: boolean;
  product: ControllerProduct;
  fields: any[];
  warehouses: any[];
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

const ProductDetailDialog: React.FC<ProductDetailDialogProps> = ({
  isOpen,
  product,
  fields,
  warehouses,
  onClose,
  onEdit,
  onDelete
}) => {
  // Función para formatear fecha
  const formatDate = (date: any): string => {
    if (!date) return 'Sin vencimiento';
    
    try {
      const d = date.seconds
        ? new Date(date.seconds * 1000)
        : new Date(date);
      
      return d.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch (error) {
      return 'Fecha inválida';
    }
  };

  // Función para obtener el estado del stock
  const getStockStatus = () => {
    const currentStock = product.stock || 0;
    const minStock = product.minStock || 0;
    
    if (currentStock === 0) return { status: 'empty', color: 'danger', text: 'Sin stock' };
    if (currentStock <= minStock) return { status: 'low', color: 'warning', text: 'Stock bajo' };
    if (currentStock <= minStock * 1.5) return { status: 'warning', color: 'medium', text: 'Stock limitado' };
    return { status: 'ok', color: 'success', text: 'Stock normal' };
  };

  // Función para obtener el nombre del campo
  const getFieldName = () => {
    if (!product.fieldId) return 'No asignado';
    
    const field = fields.find(f => f.id === product.fieldId);
    return field ? field.name : 'Campo desconocido';
  };

  // Función para obtener el nombre del almacén
  const getWarehouseName = () => {
    if (!product.warehouseId) return 'No asignado';
    
    const warehouse = warehouses.find(w => w.id === product.warehouseId);
    return warehouse ? warehouse.name : 'Almacén desconocido';
  };

  // Función para obtener el icono de categoría
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'insumo': return leaf;
      case 'herramienta': return business;
      case 'semilla': return leaf;
      case 'fertilizante': return leaf;
      case 'pesticida': return warningOutline;
      case 'maquinaria': return business;
      case 'combustible': return storefrontOutline;
      default: return cube;
    }
  };

  // Función para obtener días hasta vencimiento
  const getDaysUntilExpiry = () => {
    if (!product.expirationDate) return null;
    
    try {
      const expiryDate = product.expirationDate.seconds 
        ? new Date(product.expirationDate.seconds * 1000) 
        : new Date(product.expirationDate);
      
      const today = new Date();
      const diffTime = expiryDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      return diffDays;
    } catch (error) {
      console.error('Error calculando días hasta vencimiento:', error);
      return null;
    }
  };

  // Función para obtener texto de categoría
  const getCategoryText = (category: string) => {
    const categories: Record<string, string> = {
      'insumo': 'Insumo',
      'herramienta': 'Herramienta',
      'semilla': 'Semilla',
      'fertilizante': 'Fertilizante',
      'pesticida': 'Pesticida',
      'maquinaria': 'Maquinaria',
      'combustible': 'Combustible',
      'otro': 'Otro'
    };
    
    return categories[category] || category;
  };

  // Función para obtener texto del tipo de almacenamiento
  const getStorageTypeText = (storageType: string) => {
    const types: Record<string, string> = {
      'bolsas': 'Bolsas',
      'suelto': 'Suelto',
      'unidad': 'Por unidad',
      'sacos': 'Sacos',
      'tambores': 'Tambores',
      'contenedores': 'Contenedores',
      'cajas': 'Cajas'
    };
    
    return types[storageType] || storageType;
  };

  const stockInfo = getStockStatus();
  const daysUntilExpiry = getDaysUntilExpiry();

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onClose}>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Detalles del Producto</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={onClose}>
              <IonIcon icon={close} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      
      <IonContent>
        <div style={{ padding: '16px' }}>
          {/* Resumen del producto */}
          <IonCard style={{ marginBottom: '16px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
            <IonCardContent>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '16px' }}>
                <div style={{ 
                  width: '64px', 
                  height: '64px', 
                  borderRadius: '16px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  backgroundColor: 'rgba(255, 255, 255, 0.2)', 
                  color: 'white', 
                  fontSize: '28px',
                  flexShrink: 0
                }}>
                  <IonIcon icon={getCategoryIcon(product.category || '')} />
                </div>
                
                <div style={{ flex: 1 }}>
                  <h2 style={{ 
                    margin: '0 0 4px 0', 
                    fontSize: '24px', 
                    fontWeight: '600',
                    color: 'white'
                  }}>
                    {product.name}
                  </h2>
                  <p style={{ 
                    margin: '0 0 8px 0', 
                    fontSize: '16px', 
                    color: 'rgba(255, 255, 255, 0.8)' 
                  }}>
                    {getCategoryText(product.category || '')}
                  </p>
                  {product.code && (
                    <p style={{ 
                      margin: 0, 
                      fontSize: '14px', 
                      color: 'rgba(255, 255, 255, 0.7)' 
                    }}>
                      Código: {product.code}
                    </p>
                  )}
                </div>
                
                <div style={{ textAlign: 'center', flexShrink: 0 }}>
                  <div style={{ 
                    fontSize: '32px', 
                    fontWeight: '700', 
                    color: 'white',
                    lineHeight: 1
                  }}>
                    {product.stock || 0}
                  </div>
                  <div style={{ 
                    fontSize: '14px', 
                    color: 'rgba(255, 255, 255, 0.8)', 
                    marginTop: '4px' 
                  }}>
                    {product.unit}
                  </div>
                  {product.minStock && product.minStock > 0 && (
                    <div style={{ 
                      fontSize: '12px', 
                      color: 'rgba(255, 255, 255, 0.7)', 
                      marginTop: '4px' 
                    }}>
                      Mín: {product.minStock}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Estado del stock */}
              <div style={{ marginBottom: '16px' }}>
                <IonBadge 
                  color={stockInfo.color} 
                  style={{ 
                    fontSize: '12px', 
                    padding: '6px 12px',
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    color: 'white'
                  }}
                >
                  {stockInfo.text}
                </IonBadge>
                
                {/* Alerta de vencimiento */}
                {daysUntilExpiry !== null && daysUntilExpiry <= 30 && (
                  <IonBadge 
                    color={daysUntilExpiry <= 0 ? 'danger' : daysUntilExpiry <= 7 ? 'danger' : 'warning'}
                    style={{ 
                      fontSize: '12px', 
                      padding: '6px 12px',
                      marginLeft: '8px',
                      backgroundColor: 'rgba(255, 255, 255, 0.2)',
                      color: 'white'
                    }}
                  >
                    {daysUntilExpiry <= 0 ? 'VENCIDO' : 
                     daysUntilExpiry === 1 ? 'VENCE MAÑANA' :
                     `VENCE EN ${daysUntilExpiry} DÍAS`}
                  </IonBadge>
                )}
              </div>
              
              {/* Botones de acción */}
              <div style={{ display: 'flex', gap: '12px' }}>
                <IonButton 
                  onClick={onEdit} 
                  style={{ 
                    flex: 1,
                    '--background': 'rgba(255, 255, 255, 0.2)',
                    '--color': 'white'
                  }}
                >
                  <IonIcon icon={createOutline} slot="start" />
                  Editar
                </IonButton>
                <IonButton 
                  color="danger" 
                  fill="outline" 
                  onClick={onDelete}
                  style={{ 
                    '--border-color': 'rgba(255, 255, 255, 0.5)',
                    '--color': 'white'
                  }}
                >
                  <IonIcon icon={trashOutline} slot="start" />
                  Eliminar
                </IonButton>
              </div>
            </IonCardContent>
          </IonCard>

          {/* Información básica */}
          <IonCard>
            <IonCardHeader>
              <IonCardTitle>
                <IonIcon icon={informationCircle} style={{ marginRight: '8px' }} />
                Información básica
              </IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <IonGrid>
                <IonRow>
                  <IonCol size="12" sizeMd="6">
                    <IonItem>
                      <IonLabel>
                        <h3>Nombre</h3>
                        <p>{product.name || 'No especificado'}</p>
                      </IonLabel>
                    </IonItem>
                  </IonCol>
                  
                  {product.code && (
                    <IonCol size="12" sizeMd="6">
                      <IonItem>
                        <IonLabel>
                          <h3>Código</h3>
                          <p>{product.code}</p>
                        </IonLabel>
                      </IonItem>
                    </IonCol>
                  )}
                  
                  <IonCol size="12" sizeMd="6">
                    <IonItem>
                      <IonLabel>
                        <h3>Categoría</h3>
                        <p>{getCategoryText(product.category || '')}</p>
                      </IonLabel>
                    </IonItem>
                  </IonCol>
                  
                  <IonCol size="12" sizeMd="6">
                    <IonItem>
                      <IonLabel>
                        <h3>Forma de almacenamiento</h3>
                        <p>{getStorageTypeText(product.storageType || '')}</p>
                      </IonLabel>
                    </IonItem>
                  </IonCol>
                  
                  <IonCol size="12" sizeMd="6">
                    <IonItem>
                      <IonLabel>
                        <h3>Unidad</h3>
                        <p>{product.unit || 'No especificado'}</p>
                      </IonLabel>
                    </IonItem>
                  </IonCol>
                  
                  {product.lotNumber && (
                    <IonCol size="12" sizeMd="6">
                      <IonItem>
                        <IonLabel>
                          <h3>Número de lote</h3>
                          <p>{product.lotNumber}</p>
                        </IonLabel>
                      </IonItem>
                    </IonCol>
                  )}
                </IonRow>
              </IonGrid>
            </IonCardContent>
          </IonCard>

          {/* Stock y vencimiento */}
          <IonCard>
            <IonCardHeader>
              <IonCardTitle>
                <IonIcon icon={pricetag} style={{ marginRight: '8px' }} />
                Stock y vencimiento
              </IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <IonGrid>
                <IonRow>
                  <IonCol size="12" sizeMd="4">
                    <IonItem>
                      <IonLabel>
                        <h3>Stock actual</h3>
                        <p style={{ 
                          color: stockInfo.color === 'danger' ? 'var(--ion-color-danger)' :
                                 stockInfo.color === 'warning' ? 'var(--ion-color-warning)' :
                                 'var(--ion-color-success)',
                          fontWeight: '600',
                          fontSize: '18px'
                        }}>
                          {product.stock || 0} {product.unit}
                        </p>
                      </IonLabel>
                    </IonItem>
                  </IonCol>
                  
                  <IonCol size="12" sizeMd="4">
                    <IonItem>
                      <IonLabel>
                        <h3>Stock mínimo</h3>
                        <p>{product.minStock ? `${product.minStock} ${product.unit}` : 'No definido'}</p>
                      </IonLabel>
                    </IonItem>
                  </IonCol>
                  
                  <IonCol size="12" sizeMd="4">
                    <IonItem>
                      <IonLabel>
                        <h3>Fecha de vencimiento</h3>
                        <p>
                          {formatDate(product.expirationDate)}
                          {daysUntilExpiry !== null && (
                            <div style={{
                              marginTop: '4px',
                              color: daysUntilExpiry <= 0 ? 'var(--ion-color-danger)' :
                                     daysUntilExpiry <= 7 ? 'var(--ion-color-danger)' :
                                     daysUntilExpiry <= 30 ? 'var(--ion-color-warning)' : 'var(--ion-color-success)',
                              fontSize: '12px',
                              fontWeight: '600'
                            }}>
                              {daysUntilExpiry <= 0 ? 'VENCIDO' : 
                               daysUntilExpiry === 1 ? 'VENCE MAÑANA' :
                               daysUntilExpiry <= 30 ? `VENCE EN ${daysUntilExpiry} DÍAS` : ''}
                            </div>
                          )}
                        </p>
                      </IonLabel>
                    </IonItem>
                  </IonCol>
                </IonRow>
                
                {product.cost && (
                  <IonRow>
                    <IonCol size="12" sizeMd="6">
                      <IonItem>
                        <IonLabel>
                          <h3>Costo por unidad</h3>
                          <p style={{ fontSize: '16px', fontWeight: '600' }}>
                            ${product.cost.toLocaleString()}
                          </p>
                        </IonLabel>
                      </IonItem>
                    </IonCol>
                    <IonCol size="12" sizeMd="6">
                      <IonItem>
                        <IonLabel>
                          <h3>Valor total del stock</h3>
                          <p style={{ 
                            fontSize: '16px', 
                            fontWeight: '600',
                            color: 'var(--ion-color-primary)'
                          }}>
                            ${((product.cost || 0) * (product.stock || 0)).toLocaleString()}
                          </p>
                        </IonLabel>
                      </IonItem>
                    </IonCol>
                  </IonRow>
                )}
              </IonGrid>
            </IonCardContent>
          </IonCard>

          {/* Ubicación */}
          <IonCard>
            <IonCardHeader>
              <IonCardTitle>
                <IonIcon icon={location} style={{ marginRight: '8px' }} />
                Ubicación
              </IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <IonGrid>
                <IonRow>
                  <IonCol size="12" sizeMd="6">
                    <IonItem>
                      <IonLabel>
                        <h3>Campo</h3>
                        <p>{getFieldName()}</p>
                      </IonLabel>
                    </IonItem>
                  </IonCol>
                  
                  <IonCol size="12" sizeMd="6">
                    <IonItem>
                      <IonLabel>
                        <h3>Almacén</h3>
                        <p>{getWarehouseName()}</p>
                      </IonLabel>
                    </IonItem>
                  </IonCol>
                </IonRow>
              </IonGrid>
            </IonCardContent>
          </IonCard>

          {/* Información adicional */}
          {(product.storageConditions || product.dimensions || product.supplierCode || product.description || product.notes) && (
            <IonCard>
              <IonCardHeader>
                <IonCardTitle>
                  <IonIcon icon={business} style={{ marginRight: '8px' }} />
                  Información adicional
                </IonCardTitle>
              </IonCardHeader>
              <IonCardContent>
                <IonGrid>
                  <IonRow>
                    {product.storageConditions && (
                      <IonCol size="12" sizeMd="6">
                        <IonItem>
                          <IonLabel>
                            <h3>Condiciones de almacenamiento</h3>
                            <p>{product.storageConditions}</p>
                          </IonLabel>
                        </IonItem>
                      </IonCol>
                    )}
                    
                    {product.dimensions && (
                      <IonCol size="12" sizeMd="6">
                        <IonItem>
                          <IonLabel>
                            <h3>Dimensiones</h3>
                            <p>{product.dimensions}</p>
                          </IonLabel>
                        </IonItem>
                      </IonCol>
                    )}
                    
                    {product.supplierCode && (
                      <IonCol size="12" sizeMd="6">
                        <IonItem>
                          <IonLabel>
                            <h3>Código de proveedor</h3>
                            <p>{product.supplierCode}</p>
                          </IonLabel>
                        </IonItem>
                      </IonCol>
                    )}
                  </IonRow>
                  
                  {product.description && (
                    <IonRow>
                      <IonCol size="12">
                        <IonItem>
                          <IonLabel>
                            <h3>Descripción</h3>
                            <p style={{ whiteSpace: 'pre-wrap' }}>{product.description}</p>
                          </IonLabel>
                        </IonItem>
                      </IonCol>
                    </IonRow>
                  )}
                  
                  {product.notes && (
                    <IonRow>
                      <IonCol size="12">
                        <IonItem>
                          <IonLabel>
                            <h3>Notas</h3>
                            <p style={{ whiteSpace: 'pre-wrap' }}>{product.notes}</p>
                          </IonLabel>
                        </IonItem>
                      </IonCol>
                    </IonRow>
                  )}
                </IonGrid>
              </IonCardContent>
            </IonCard>
          )}

          {/* Información de creación/actualización */}
          {(product.createdAt || product.updatedAt) && (
            <IonCard>
              <IonCardHeader>
                <IonCardTitle>
                  <IonIcon icon={calendar} style={{ marginRight: '8px' }} />
                  Información del registro
                </IonCardTitle>
              </IonCardHeader>
              <IonCardContent>
                <IonGrid>
                  <IonRow>
                    {product.createdAt && (
                      <IonCol size="12" sizeMd="6">
                        <IonItem>
                          <IonLabel>
                            <h3>Creado</h3>
                            <p>{formatDate(product.createdAt)}</p>
                          </IonLabel>
                        </IonItem>
                      </IonCol>
                    )}
                    
                    {product.updatedAt && (
                      <IonCol size="12" sizeMd="6">
                        <IonItem>
                          <IonLabel>
                            <h3>Última actualización</h3>
                            <p>{formatDate(product.updatedAt)}</p>
                          </IonLabel>
                        </IonItem>
                      </IonCol>
                    )}
                  </IonRow>
                </IonGrid>
              </IonCardContent>
            </IonCard>
          )}

          {/* Botones de acción inferiores */}
          <div style={{ padding: '16px 0', display: 'flex', gap: '12px' }}>
            <IonButton expand="block" fill="outline" onClick={onClose}>
              Cerrar
            </IonButton>
            <IonButton expand="block" onClick={onEdit}>
              <IonIcon icon={createOutline} slot="start" />
              Editar producto
            </IonButton>
          </div>
        </div>
      </IonContent>
    </IonModal>
  );
};

export default ProductDetailDialog;