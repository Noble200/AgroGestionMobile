// src/components/panels/Products/ProductsPanel.tsx - Panel principal para gestión de productos
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
  IonAlert,
  IonPopover,
  IonList,
  IonItem,
  IonLabel,
  IonChip
} from '@ionic/react';
import {
  add,
  refresh,
  cube,
  warningOutline,
  checkmarkCircle,
  alertCircle,
  filterOutline,
  eyeOutline,
  createOutline,
  trashOutline,
  calendarOutline,
  ellipsisVertical,
  closeCircle,
  storefrontOutline,
  business,
  leaf
} from 'ionicons/icons';

// Importar componente de navegación y modales
import PanelSelector from '../../PanelSelector';
import ProductDialog from './ProductDialog';
import ProductDetailDialog from './ProductDetailDialog';

// Interfaces que coinciden con el controlador
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
  expirationDate?: any; // Nota: en el controlador es expirationDate, no expiryDate
  warehouseId?: string;
  fieldId?: string;
  description?: string;
  notes?: string;
  createdAt?: any;
  updatedAt?: any;
}

interface Filters {
  category: string;
  stockStatus: string;
  fieldId: string;
  expiringSoon: boolean;
  searchTerm: string;
}

interface FilterOption {
  value: string;
  label: string;
}

interface FilterOptions {
  category: FilterOption[];
  stockStatus: FilterOption[];
  field: FilterOption[];
}

interface Statistics {
  totalProducts: number;
  lowStockProducts: number;
  expiringSoonProducts: number;
  totalValue: number;
}

interface ProductsPanelProps {
  products: ControllerProduct[];
  fields: any[];
  warehouses: any[];
  loading: boolean;
  error: string;
  selectedProduct: ControllerProduct | null;
  dialogOpen: boolean;
  dialogType: string;
  filterOptions: FilterOptions;
  filters: Filters;
  statistics: Statistics;
  handleAddProduct: () => void;
  handleEditProduct: (product: ControllerProduct) => void;
  handleViewProduct: (product: ControllerProduct) => void;
  handleDeleteProduct: (productId: string) => Promise<void>;
  handleSaveProduct: (productData: Partial<ControllerProduct>) => Promise<boolean>;
  handleFilterChange: (filterName: string, value: any) => void;
  handleSearch: (searchTerm: string) => void;
  handleCloseDialog: () => void;
  clearSpecialFilters: () => void;
  refreshData: () => Promise<void>;
}

const ProductsPanel: React.FC<ProductsPanelProps> = ({
  products,
  fields,
  warehouses,
  loading,
  error,
  selectedProduct,
  dialogOpen,
  dialogType,
  filterOptions,
  filters,
  statistics,
  handleAddProduct,
  handleEditProduct,
  handleViewProduct,
  handleDeleteProduct,
  handleSaveProduct,
  handleFilterChange,
  handleSearch,
  handleCloseDialog,
  clearSpecialFilters,
  refreshData
}) => {
  // Estados locales para la UI
  const [showFilters, setShowFilters] = useState(false);
  const [deleteAlert, setDeleteAlert] = useState<{isOpen: boolean, productId: string}>({
    isOpen: false,
    productId: ''
  });
  const [searchValue, setSearchValue] = useState(''); // Estado local para el search

  // Función para manejar búsqueda con debounce manual
  const handleSearchInput = (value: string) => {
    setSearchValue(value);
    // Usar setTimeout para debounce manual y evitar scroll issues
    setTimeout(() => {
      handleSearch(value);
    }, 300);
  };

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
    'products.create',
    'products.edit',
    'products.delete'
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

  // Función para formatear fecha - CORREGIDA para usar expirationDate
  const formatDate = (date: any): string => {
    if (!date) return 'Sin vencimiento';
    
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

  // Función para obtener el estado del stock
  const getStockStatus = (product: ControllerProduct) => {
    const currentStock = product.stock || 0;
    const minStock = product.minStock || 0;
    
    if (currentStock === 0) return 'empty';
    if (currentStock <= minStock) return 'low';
    if (currentStock <= minStock * 1.5) return 'warning';
    return 'ok';
  };

  // Función para obtener días hasta vencimiento - CORREGIDA para usar expirationDate
  const getDaysUntilExpiry = (product: ControllerProduct) => {
    if (!product.expirationDate) return null;
    
    const expiryDate = product.expirationDate.seconds 
      ? new Date(product.expirationDate.seconds * 1000) 
      : new Date(product.expirationDate);
    
    const today = new Date();
    const diffTime = expiryDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  };

  // Función para obtener el color del stock
  const getStockColor = (status: string) => {
    switch (status) {
      case 'empty': return 'danger';
      case 'low': return 'warning';
      case 'warning': return 'medium';
      case 'ok': return 'success';
      default: return 'medium';
    }
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

  // Componente para estadísticas modernas
  const ModernStatCard = ({ title, value, description, icon, color }: any) => (
    <IonCol size="6" sizeMd="3">
      <div style={{
        background: 'white',
        borderRadius: '20px',
        padding: '20px',
        textAlign: 'center',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        backdropFilter: 'blur(10px)',
        marginBottom: '16px'
      }}>
        <IonIcon 
          icon={icon} 
          style={{ 
            fontSize: '32px', 
            color: `var(--ion-color-${color})`,
            marginBottom: '12px'
          }} 
        />
        <h3 style={{ 
          margin: 0, 
          fontSize: '24px', 
          fontWeight: '700',
          color: '#1a202c',
          marginBottom: '4px'
        }}>
          {value}
        </h3>
        <h4 style={{ 
          margin: 0, 
          fontSize: '16px', 
          fontWeight: '600',
          color: '#4a5568',
          marginBottom: '8px'
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
              Productos
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
              Cargando productos...
            </IonText>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      {/* Header igual al Dashboard */}
      <IonHeader className="ion-no-border">
        <IonToolbar 
          style={{
            '--background': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            '--color': 'white'
          }}
        >
          <IonTitle style={{ fontWeight: '700', fontSize: '20px' }}>
            Productos
          </IonTitle>
          <div slot="end" style={{ display: 'flex', gap: '8px', paddingRight: '16px' }}>
            {/* Selector de páginas */}
            <PanelSelector
              userPermissions={userPermissions}
              currentRoute="/productos"
              onNavigate={(route) => {
                console.log('Navegando a:', route);
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
              <IonIcon icon={refresh} />
            </IonButton>
          </div>
        </IonToolbar>
      </IonHeader>

      {/* Content optimizado para evitar scroll issues */}
      <IonContent 
        style={{ '--background': '#f8fafc' }}
        forceOverscroll={false}
        scrollEvents={false}
        className="ion-padding-bottom"
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
              Gestión de Productos 📦
            </h1>
            <p style={{ 
              color: 'rgba(255, 255, 255, 0.8)', 
              fontSize: '16px',
              margin: 0,
              fontWeight: '400'
            }}>
              Controla tu inventario de productos agrícolas
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
                      Error al cargar productos
                    </h3>
                    <p style={{ margin: 0, color: 'rgba(255, 255, 255, 0.9)' }}>{error}</p>
                  </div>
                  <IonButton 
                    fill="outline" 
                    color="light" 
                    size="small" 
                    onClick={() => refreshData()}
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
                title="Total Productos"
                value={statistics.totalProducts}
                description="Productos registrados"
                icon={cube}
                color="primary"
              />
              <ModernStatCard
                title="Stock Bajo"
                value={statistics.lowStockProducts}
                description="Productos con stock crítico"
                icon={warningOutline}
                color="warning"
              />
              <ModernStatCard
                title="Próximos a Vencer"
                value={statistics.expiringSoonProducts}
                description="Vencen en 30 días"
                icon={calendarOutline}
                color="danger"
              />
              <ModernStatCard
                title="Valor Total"
                value={`$${statistics.totalValue.toLocaleString()}`}
                description="Valor del inventario"
                icon={storefrontOutline}
                color="success"
              />
            </IonRow>
          </IonGrid>
        </div>

        {/* Barra de búsqueda y filtros optimizada */}
        <div style={{ padding: '0 20px 20px', position: 'sticky', top: '0', zIndex: 10, backgroundColor: '#f8fafc', paddingTop: '10px' }}>
          <IonCard style={{ borderRadius: '16px', marginBottom: '20px', boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)' }}>
            <IonCardContent>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <IonSearchbar
                  value={searchValue}
                  placeholder="Buscar productos..."
                  debounce={0} // Deshabilitamos el debounce automático
                  onIonInput={(e) => handleSearchInput(e.detail.value!)}
                  onIonClear={() => {
                    setSearchValue('');
                    handleSearch('');
                  }}
                  style={{ 
                    '--border-radius': '16px', 
                    flex: 1,
                    '--background': '#fff',
                    '--color': '#333',
                    '--placeholder-color': '#999',
                    '--icon-color': '#666'
                  }}
                  showClearButton="focus"
                />
                
                <IonButton 
                  fill="clear" 
                  onClick={() => {
                    console.log('Botón filtros clickeado, estado actual:', showFilters); // Debug
                    setShowFilters(!showFilters);
                  }}
                  style={{ 
                    '--color': showFilters ? 'var(--ion-color-primary)' : 'var(--ion-color-medium)',
                    minWidth: '44px',
                    '--background': showFilters ? 'var(--ion-color-primary-tint)' : 'transparent',
                    '--border-radius': '12px'
                  }}
                >
                  <IonIcon icon={filterOutline} />
                </IonButton>
              </div>
              
              {/* Filtros expandibles */}
              <div style={{ 
                marginTop: showFilters ? '16px' : '0px',
                height: showFilters ? 'auto' : '0px',
                overflow: 'hidden',
                transition: 'all 0.3s ease-in-out',
                opacity: showFilters ? 1 : 0
              }}>
                {showFilters && (
                  <div style={{ 
                    display: 'flex', 
                    gap: '12px', 
                    flexWrap: 'wrap',
                    paddingTop: '8px'
                  }}>
                    <IonSelect
                      placeholder="Categoría"
                      value={filters.category}
                      onIonChange={(e) => handleFilterChange('category', e.detail.value)}
                      style={{ minWidth: '150px' }}
                      interface="popover"
                    >
                      {filterOptions.category.map((option) => (
                        <IonSelectOption key={option.value} value={option.value}>
                          {option.label}
                        </IonSelectOption>
                      ))}
                    </IonSelect>
                    
                    <IonSelect
                      placeholder="Estado de stock"
                      value={filters.stockStatus}
                      onIonChange={(e) => handleFilterChange('stockStatus', e.detail.value)}
                      style={{ minWidth: '150px' }}
                      interface="popover"
                    >
                      {filterOptions.stockStatus.map((option) => (
                        <IonSelectOption key={option.value} value={option.value}>
                          {option.label}
                        </IonSelectOption>
                      ))}
                    </IonSelect>
                    
                    <IonSelect
                      placeholder="Campo"
                      value={filters.fieldId}
                      onIonChange={(e) => handleFilterChange('fieldId', e.detail.value)}
                      style={{ minWidth: '150px' }}
                      interface="popover"
                    >
                      {filterOptions.field.map((option) => (
                        <IonSelectOption key={option.value} value={option.value}>
                          {option.label}
                        </IonSelectOption>
                      ))}
                    </IonSelect>
                    
                    {/* Botón para limpiar filtros */}
                    <IonButton 
                      fill="outline" 
                      size="small"
                      onClick={() => {
                        handleFilterChange('category', 'all');
                        handleFilterChange('stockStatus', 'all');
                        handleFilterChange('fieldId', 'all');
                        setSearchValue('');
                        handleSearch('');
                      }}
                      style={{ '--border-radius': '12px' }}
                    >
                      Limpiar filtros
                    </IonButton>
                  </div>
                )}
              </div>
            </IonCardContent>
          </IonCard>

          {/* Botón "Agregar Producto" */}
          <IonCard style={{ borderRadius: '16px', marginBottom: '20px' }}>
            <IonCardContent style={{ textAlign: 'center', padding: '20px' }}>
              <IonButton 
                expand="block"
                onClick={handleAddProduct}
                style={{ 
                  '--border-radius': '12px',
                  height: '48px',
                  fontWeight: '600'
                }}
              >
                <IonIcon icon={add} slot="start" />
                Agregar Producto
              </IonButton>
            </IonCardContent>
          </IonCard>
        </div>

        {/* Lista de productos optimizada - sin problemas de scroll */}
        <div style={{ 
          padding: '0 20px 100px',
          minHeight: '400px' // Altura mínima para evitar saltos
        }}>
          {products.length === 0 ? (
            <IonCard style={{ borderRadius: '16px', minHeight: '200px' }}>
              <IonCardContent style={{ textAlign: 'center', padding: '40px' }}>
                <IonIcon 
                  icon={cube} 
                  style={{ 
                    fontSize: '64px', 
                    color: '#cbd5e0', 
                    marginBottom: '16px' 
                  }} 
                />
                <h2 style={{ 
                  color: '#4a5568', 
                  fontSize: '24px', 
                  fontWeight: '600',
                  margin: '0 0 8px 0'
                }}>
                  {searchValue ? `No se encontraron productos para "${searchValue}"` :
                   filters.expiringSoon ? 'No hay productos próximos a vencer' :
                   filters.stockStatus === 'low' ? 'No hay productos con stock bajo' :
                   'No hay productos registrados'}
                </h2>
                <p style={{ 
                  color: '#8e9aaf', 
                  fontSize: '16px',
                  margin: '0 0 24px 0',
                  maxWidth: '400px',
                  marginLeft: 'auto',
                  marginRight: 'auto'
                }}>
                  {searchValue ? 'Intenta con otros términos de búsqueda o revisa los filtros activos.' :
                   filters.expiringSoon ? 'No se encontraron productos que venzan en los próximos 30 días.' :
                   filters.stockStatus === 'low' ? 'No se encontraron productos con stock por debajo del mínimo.' :
                   'Comienza añadiendo un nuevo producto para gestionar tu inventario.'}
                </p>
                {!searchValue && !filters.expiringSoon && filters.stockStatus !== 'low' && (
                  <IonButton onClick={handleAddProduct}>
                    <IonIcon icon={add} slot="start" />
                    Añadir producto
                  </IonButton>
                )}
                {(searchValue || filters.expiringSoon || filters.stockStatus === 'low') && (
                  <IonButton 
                    fill="outline" 
                    onClick={() => {
                      if (clearSpecialFilters) clearSpecialFilters();
                      setSearchValue('');
                      handleSearch('');
                    }}
                  >
                    <IonIcon icon={closeCircle} slot="start" />
                    Limpiar búsqueda y filtros
                  </IonButton>
                )}
              </IonCardContent>
            </IonCard>
          ) : (
            <div style={{ 
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}>
              {/* Información de resultados */}
              {searchValue && (
                <div style={{ 
                  padding: '12px 16px',
                  backgroundColor: 'var(--ion-color-primary-tint)',
                  borderRadius: '12px',
                  marginBottom: '8px'
                }}>
                  <p style={{ 
                    margin: 0,
                    color: 'var(--ion-color-primary)',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}>
                    📍 Mostrando {products.length} resultado{products.length !== 1 ? 's' : ''} para "{searchValue}"
                  </p>
                </div>
              )}
              
              {products.map((product, index) => {
                const stockStatus = getStockStatus(product);
                const daysUntilExpiry = getDaysUntilExpiry(product);
                
                return (
                  <ProductCard
                    key={`product-${product.id}`} // Key simplificada
                    product={product}
                    stockStatus={stockStatus}
                    daysUntilExpiry={daysUntilExpiry}
                    onView={() => handleViewProduct(product)}
                    onEdit={() => handleEditProduct(product)}
                    onDelete={() => setDeleteAlert({ isOpen: true, productId: product.id })}
                    getCategoryIcon={getCategoryIcon}
                    getStockColor={getStockColor}
                    formatDate={formatDate}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* Alerta de confirmación de eliminación */}
        <IonAlert
          isOpen={deleteAlert.isOpen}
          onDidDismiss={() => setDeleteAlert({ isOpen: false, productId: '' })}
          header="Confirmar eliminación"
          message="¿Estás seguro de que deseas eliminar este producto? Esta acción no se puede deshacer."
          buttons={[
            {
              text: 'Cancelar',
              role: 'cancel',
              cssClass: 'secondary'
            },
            {
              text: 'Eliminar',
              role: 'destructive',
              handler: async () => {
                try {
                  await handleDeleteProduct(deleteAlert.productId);
                  setDeleteAlert({ isOpen: false, productId: '' });
                } catch (error) {
                  console.error('Error al eliminar producto:', error);
                }
              }
            }
          ]}
        />

        {/* Diálogos modales */}
        {dialogOpen && (
          <>
            {(dialogType === 'add-product' || dialogType === 'edit-product') && (
              <ProductDialog
                isOpen={dialogOpen}
                product={selectedProduct}
                fields={fields}
                warehouses={warehouses}
                isNew={dialogType === 'add-product'}
                onSave={handleSaveProduct}
                onClose={handleCloseDialog}
              />
            )}
            
            {dialogType === 'view-product' && selectedProduct && (
              <ProductDetailDialog
                isOpen={dialogOpen}
                product={selectedProduct}
                fields={fields}
                warehouses={warehouses}
                onClose={handleCloseDialog}
                onEdit={() => handleEditProduct(selectedProduct)}
                onDelete={() => setDeleteAlert({ isOpen: true, productId: selectedProduct.id })}
              />
            )}
          </>
        )}
      </IonContent>
    </IonPage>
  );
};

// Componente ProductCard optimizado para evitar re-renders innecesarios
const ProductCard: React.FC<{
  product: ControllerProduct;
  stockStatus: string;
  daysUntilExpiry: number | null;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  getCategoryIcon: (category: string) => string;
  getStockColor: (status: string) => string;
  formatDate: (date: any) => string;
}> = React.memo(({
  product,
  stockStatus,
  daysUntilExpiry,
  onView,
  onEdit,
  onDelete,
  getCategoryIcon,
  getStockColor,
  formatDate
}) => {
  return (
    <IonCard 
      style={{ 
        borderRadius: '16px', 
        marginBottom: '16px',
        border: stockStatus === 'empty' ? '2px solid var(--ion-color-danger)' :
                stockStatus === 'low' ? '2px solid var(--ion-color-warning)' : 'none',
        // Optimización: altura mínima fija para evitar reflows
        minHeight: '140px',
        willChange: 'transform', // Optimización para animaciones
        contain: 'layout style paint' // Optimización CSS
      }}
    >
      <IonCardContent style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <IonIcon 
                icon={getCategoryIcon(product.category || '')} 
                style={{ 
                  fontSize: '24px', 
                  color: 'var(--ion-color-primary)',
                  flexShrink: 0 // Evita que el icono cambie de tamaño
                }} 
              />
              <div style={{ minWidth: 0 }}> {/* Permite que el texto se corte si es necesario */}
                <h3 style={{ 
                  margin: 0, 
                  fontSize: '18px', 
                  fontWeight: '600',
                  color: '#1a202c',
                  lineHeight: '1.2',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {product.name}
                </h3>
                {product.code && (
                  <p style={{ 
                    margin: 0, 
                    fontSize: '14px', 
                    color: '#8e9aaf',
                    lineHeight: '1.2',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    Código: {product.code}
                  </p>
                )}
              </div>
            </div>
            
            <div style={{ 
              display: 'flex', 
              gap: '8px', 
              flexWrap: 'wrap', 
              marginBottom: '12px',
              minHeight: '32px' // Altura fija para evitar saltos
            }}>
              <IonChip color={getStockColor(stockStatus)} style={{ margin: 0 }}>
                <IonIcon icon={cube} />
                <IonLabel>
                  {product.stock || 0} {product.unit}
                  {stockStatus === 'empty' && ' - Sin stock'}
                  {stockStatus === 'low' && ' - Stock bajo'}
                </IonLabel>
              </IonChip>
              
              {product.category && (
                <IonChip color="medium" style={{ margin: 0 }}>
                  <IonLabel>{product.category}</IonLabel>
                </IonChip>
              )}
              
              {product.lotNumber && (
                <IonChip color="tertiary" style={{ margin: 0 }}>
                  <IonLabel>Lote: {product.lotNumber}</IonLabel>
                </IonChip>
              )}
            </div>
            
            {product.expirationDate && (
              <div style={{ marginBottom: '12px' }}>
                <p style={{ 
                  margin: 0, 
                  fontSize: '14px', 
                  color: '#4a5568',
                  lineHeight: '1.3'
                }}>
                  Vence: {formatDate(product.expirationDate)}
                  {daysUntilExpiry !== null && (
                    <span style={{ 
                      marginLeft: '8px',
                      color: daysUntilExpiry <= 0 ? 'var(--ion-color-danger)' :
                             daysUntilExpiry <= 7 ? 'var(--ion-color-danger)' :
                             daysUntilExpiry <= 30 ? 'var(--ion-color-warning)' : 'var(--ion-color-success)',
                      fontWeight: '600'
                    }}>
                      ({daysUntilExpiry <= 0 ? 'Vencido' : 
                        daysUntilExpiry === 1 ? 'Vence mañana' :
                        daysUntilExpiry <= 30 ? `${daysUntilExpiry} días` : ''})
                    </span>
                  )}
                </p>
              </div>
            )}
            
            {product.minStock && product.minStock > 0 && (
              <p style={{ 
                margin: 0, 
                fontSize: '14px', 
                color: '#8e9aaf',
                lineHeight: '1.2'
              }}>
                Stock mínimo: {product.minStock} {product.unit}
              </p>
            )}
          </div>
          
          <div style={{ 
            display: 'flex', 
            gap: '8px',
            flexShrink: 0, // Los botones no se encogen
            alignItems: 'flex-start'
          }}>
            <IonButton 
              fill="clear" 
              size="small"
              onClick={onView}
              style={{ '--padding-start': '8px', '--padding-end': '8px' }}
            >
              <IonIcon icon={eyeOutline} />
            </IonButton>
            
            <IonButton 
              fill="clear" 
              size="small"
              onClick={onEdit}
              style={{ '--padding-start': '8px', '--padding-end': '8px' }}
            >
              <IonIcon icon={createOutline} />
            </IonButton>
            
            <IonButton 
              fill="clear" 
              size="small" 
              color="danger"
              onClick={onDelete}
              style={{ '--padding-start': '8px', '--padding-end': '8px' }}
            >
              <IonIcon icon={trashOutline} />
            </IonButton>
          </div>
        </div>
      </IonCardContent>
    </IonCard>
  );
});

// Establecer displayName para debugging
ProductCard.displayName = 'ProductCard';

export default ProductsPanel;