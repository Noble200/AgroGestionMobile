// src/components/panels/Purchases/PurchaseDetailDialog.js - MEJORADO con nuevos estilos
import React from 'react';

const PurchaseDetailDialog = ({
  purchase,
  warehouses,
  onClose,
  onEdit,
  onAddDelivery,
  onViewDelivery,
  onCompleteDelivery,
  onCancelDelivery,
  onDelete
}) => {
  // Función para formatear fecha
  const formatDate = (date) => {
    if (!date) return '-';
    
    const d = date.seconds
      ? new Date(date.seconds * 1000)
      : new Date(date);
    
    return d.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Función para formatear fecha y hora
  const formatDateTime = (date) => {
    if (!date) return '-';
    
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
  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return '$0';
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(amount);
  };

  // Función para renderizar el estado como chip
  const renderStatusChip = (status) => {
    let chipClass = '';
    let statusText = '';
    let iconClass = '';

    switch (status) {
      case 'pending':
        chipClass = 'chip-warning';
        statusText = 'Pendiente';
        iconClass = 'fas fa-clock';
        break;
      case 'approved':
        chipClass = 'chip-info';
        statusText = 'Aprobada';
        iconClass = 'fas fa-check';
        break;
      case 'partial_delivered':
        chipClass = 'chip-primary';
        statusText = 'Entrega parcial';
        iconClass = 'fas fa-truck-loading';
        break;
      case 'completed':
        chipClass = 'chip-success';
        statusText = 'Completada';
        iconClass = 'fas fa-check-circle';
        break;
      case 'cancelled':
        chipClass = 'chip-danger';
        statusText = 'Cancelada';
        iconClass = 'fas fa-times-circle';
        break;
      default:
        chipClass = 'chip-warning';
        statusText = status || 'Pendiente';
        iconClass = 'fas fa-question';
    }

    return (
      <span className={`chip ${chipClass}`} style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 'var(--spacing-xs)',
        padding: 'var(--spacing-xs) var(--spacing-md)',
        borderRadius: 'var(--border-radius-pill)',
        fontSize: 'var(--font-size-sm)',
        fontWeight: 'var(--font-weight-medium)',
        textTransform: 'uppercase',
        letterSpacing: '0.5px'
      }}>
        <i className={iconClass}></i>
        {statusText}
      </span>
    );
  };

  // Función para renderizar el estado de entrega
  const renderDeliveryStatus = (status) => {
    let chipClass = '';
    let statusText = '';
    let iconClass = '';

    switch (status) {
      case 'in_transit':
        chipClass = 'chip-primary';
        statusText = 'En camino';
        iconClass = 'fas fa-shipping-fast';
        break;
      case 'completed':
        chipClass = 'chip-success';
        statusText = 'Entregado';
        iconClass = 'fas fa-check-circle';
        break;
      case 'cancelled':
        chipClass = 'chip-danger';
        statusText = 'Cancelado';
        iconClass = 'fas fa-times-circle';
        break;
      default:
        chipClass = 'chip-warning';
        statusText = status || 'Desconocido';
        iconClass = 'fas fa-question';
    }

    return (
      <span className={`chip ${chipClass}`} style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 'var(--spacing-xs)',
        padding: 'var(--spacing-xxs) var(--spacing-sm)',
        borderRadius: 'var(--border-radius-pill)',
        fontSize: 'var(--font-size-xs)',
        fontWeight: 'var(--font-weight-medium)'
      }}>
        <i className={iconClass}></i>
        {statusText}
      </span>
    );
  };

  // Obtener nombre del almacén
  const getWarehouseName = (warehouseId) => {
    const warehouse = warehouses.find(w => w.id === warehouseId);
    return warehouse ? warehouse.name : 'Almacén desconocido';
  };

  // Calcular progreso de entrega
  const calculateProgress = () => {
    const totalPurchased = purchase.products.reduce((sum, product) => sum + product.quantity, 0);
    const totalDelivered = purchase.totalDelivered || 0;
    
    if (totalPurchased === 0) return 0;
    return Math.round((totalDelivered / totalPurchased) * 100);
  };

  const progress = calculateProgress();

  return (
    <div className="dialog-content extra-large">
      <div className="dialog-header">
        <div className="dialog-title-container">
          <h2 className="dialog-title">
            <i className="fas fa-shopping-cart"></i>
            Detalles de Compra
          </h2>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--spacing-md)',
            marginTop: 'var(--spacing-xs)'
          }}>
            <span style={{
              fontSize: 'var(--font-size-md)',
              fontWeight: 'var(--font-weight-semibold)',
              color: 'var(--text-primary)'
            }}>
              {purchase.purchaseNumber || `Compra ${purchase.id.substring(0, 8)}`}
            </span>
            {renderStatusChip(purchase.status)}
          </div>
        </div>
        <button className="dialog-close" onClick={onClose}>
          <i className="fas fa-times"></i>
        </button>
      </div>

      <div className="dialog-body">
        {/* Información general */}
        <div className="detail-section">
          <h3 className="section-title">
            <i className="fas fa-info-circle"></i>
            Información General
          </h3>
          
          <div className="detail-grid" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: 'var(--spacing-lg)',
            marginBottom: 'var(--spacing-lg)'
          }}>
            <div className="detail-item">
              <label style={{
                fontSize: 'var(--font-size-sm)',
                fontWeight: 'var(--font-weight-semibold)',
                color: 'var(--text-secondary)',
                marginBottom: 'var(--spacing-xs)',
                display: 'block'
              }}>Número de Compra:</label>
              <span style={{
                fontSize: 'var(--font-size-md)',
                color: 'var(--text-primary)',
                fontWeight: 'var(--font-weight-medium)'
              }}>
                {purchase.purchaseNumber || `Compra ${purchase.id.substring(0, 8)}`}
              </span>
            </div>
            
            <div className="detail-item">
              <label style={{
                fontSize: 'var(--font-size-sm)',
                fontWeight: 'var(--font-weight-semibold)',
                color: 'var(--text-secondary)',
                marginBottom: 'var(--spacing-xs)',
                display: 'block'
              }}>Proveedor:</label>
              <span style={{
                fontSize: 'var(--font-size-md)',
                color: 'var(--text-primary)',
                fontWeight: 'var(--font-weight-medium)'
              }}>
                {purchase.supplier || 'No especificado'}
              </span>
            </div>
            
            <div className="detail-item">
              <label style={{
                fontSize: 'var(--font-size-sm)',
                fontWeight: 'var(--font-weight-semibold)',
                color: 'var(--text-secondary)',
                marginBottom: 'var(--spacing-xs)',
                display: 'block'
              }}>Fecha de Compra:</label>
              <span style={{
                fontSize: 'var(--font-size-md)',
                color: 'var(--text-primary)'
              }}>
                {formatDate(purchase.purchaseDate)}
              </span>
            </div>
            
            <div className="detail-item">
              <label style={{
                fontSize: 'var(--font-size-sm)',
                fontWeight: 'var(--font-weight-semibold)',
                color: 'var(--text-secondary)',
                marginBottom: 'var(--spacing-xs)',
                display: 'block'
              }}>Creado por:</label>
              <span style={{
                fontSize: 'var(--font-size-md)',
                color: 'var(--text-primary)'
              }}>
                {purchase.createdBy || 'No especificado'}
              </span>
            </div>
            
            <div className="detail-item">
              <label style={{
                fontSize: 'var(--font-size-sm)',
                fontWeight: 'var(--font-weight-semibold)',
                color: 'var(--text-secondary)',
                marginBottom: 'var(--spacing-xs)',
                display: 'block'
              }}>Fecha de Creación:</label>
              <span style={{
                fontSize: 'var(--font-size-md)',
                color: 'var(--text-primary)'
              }}>
                {formatDateTime(purchase.createdAt)}
              </span>
            </div>
          </div>
        </div>

        {/* Productos */}
        <div className="detail-section">
          <h3 className="section-title">
            <i className="fas fa-boxes"></i>
            Productos ({purchase.products?.length || 0})
          </h3>
          
          <div className="products-list">
            <table className="table">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th style={{textAlign: 'center'}}>Categoría</th>
                  <th style={{textAlign: 'center'}}>Cantidad</th>
                  <th style={{textAlign: 'center'}}>Costo Unitario</th>
                  <th style={{textAlign: 'center'}}>Total</th>
                </tr>
              </thead>
              <tbody>
                {purchase.products.map((product, index) => (
                  <tr key={index}>
                    <td>
                      <div className="product-info">
                        <div className="product-name" style={{
                          fontWeight: 'var(--font-weight-semibold)',
                          color: 'var(--text-primary)',
                          marginBottom: 'var(--spacing-xxs)'
                        }}>
                          {product.name}
                        </div>
                      </div>
                    </td>
                    <td style={{textAlign: 'center'}}>
                      <span style={{
                        padding: '4px 8px',
                        backgroundColor: 'var(--primary-bg)',
                        color: 'var(--primary)',
                        borderRadius: 'var(--border-radius-pill)',
                        fontSize: 'var(--font-size-xs)',
                        fontWeight: 'var(--font-weight-medium)'
                      }}>
                        {product.category}
                      </span>
                    </td>
                    <td style={{textAlign: 'center', fontWeight: 'var(--font-weight-medium)'}}>
                      {product.quantity} {product.unit}
                    </td>
                    <td style={{textAlign: 'center', fontWeight: 'var(--font-weight-medium)'}}>
                      {formatCurrency(product.unitCost)}
                    </td>
                    <td style={{textAlign: 'center', fontWeight: 'var(--font-weight-semibold)'}}>
                      {formatCurrency(product.quantity * product.unitCost)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Resumen financiero */}
        <div className="detail-section">
          <h3 className="section-title">
            <i className="fas fa-calculator"></i>
            Resumen Financiero
          </h3>
          
          <div className="financial-summary">
            <div className="summary-row">
              <span style={{display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)'}}>
                <i className="fas fa-boxes" style={{color: 'var(--primary)'}}></i>
                Subtotal productos:
              </span>
              <span style={{fontWeight: 'var(--font-weight-semibold)'}}>
                {formatCurrency(purchase.totalProducts)}
              </span>
            </div>
            <div className="summary-row">
              <span style={{display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)'}}>
                <i className="fas fa-truck" style={{color: 'var(--warning)'}}></i>
                Flete:
              </span>
              <span>{formatCurrency(purchase.freight)}</span>
            </div>
            <div className="summary-row">
              <span style={{display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)'}}>
                <i className="fas fa-receipt" style={{color: 'var(--info)'}}></i>
                Impuestos:
              </span>
              <span>{formatCurrency(purchase.taxes)}</span>
            </div>
            <div className="summary-row total">
              <span style={{display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)'}}>
                <i className="fas fa-dollar-sign" style={{color: 'var(--success)'}}></i>
                Total:
              </span>
              <span>{formatCurrency(purchase.totalAmount)}</span>
            </div>
            <div className="summary-row">
              <span style={{display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)'}}>
                <i className="fas fa-shipping-fast" style={{color: 'var(--secondary)'}}></i>
                Flete pagado:
              </span>
              <span>{formatCurrency(purchase.totalFreightPaid)}</span>
            </div>
          </div>
        </div>

        {/* Progreso de entregas */}
        <div className="detail-section">
          <h3 className="section-title">
            <i className="fas fa-chart-line"></i>
            Progreso de Entregas
          </h3>
          
          <div className="delivery-progress" style={{
            backgroundColor: 'var(--gray-50)',
            padding: 'var(--spacing-lg)',
            borderRadius: 'var(--border-radius-lg)',
            border: '1px solid var(--gray-200)'
          }}>
            <div className="progress-info" style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 'var(--spacing-sm)'
            }}>
              <span style={{
                fontSize: 'var(--font-size-md)',
                fontWeight: 'var(--font-weight-medium)',
                color: 'var(--text-primary)'
              }}>
                Progreso general
              </span>
              <span style={{
                fontSize: 'var(--font-size-lg)',
                fontWeight: 'var(--font-weight-bold)',
                color: progress === 100 ? 'var(--success)' : 'var(--primary)'
              }}>
                {progress}%
              </span>
            </div>
            <div className="progress-bar" style={{
              height: '12px',
              backgroundColor: 'var(--gray-200)',
              borderRadius: 'var(--border-radius-pill)',
              overflow: 'hidden',
              marginBottom: 'var(--spacing-sm)'
            }}>
              <div 
                className="progress-fill" 
                style={{ 
                  width: `${progress}%`,
                  height: '100%',
                  background: progress === 100 
                    ? 'linear-gradient(90deg, var(--success) 0%, #66BB6A 100%)'
                    : 'linear-gradient(90deg, var(--primary) 0%, var(--primary-light) 100%)',
                  transition: 'width 0.3s ease'
                }}
              ></div>
            </div>
            <div className="progress-details" style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 'var(--font-size-sm)',
              color: 'var(--text-secondary)'
            }}>
              <span style={{color: 'var(--success)'}}>
                <i className="fas fa-check-circle"></i> Entregado: {purchase.totalDelivered || 0}
              </span>
              <span style={{color: 'var(--warning)'}}>
                <i className="fas fa-clock"></i> Pendiente: {purchase.totalPending || 0}
              </span>
            </div>
          </div>
        </div>

        {/* Lista de entregas */}
        <div className="detail-section">
          <div className="section-header">
            <h3 className="section-title">
              <i className="fas fa-truck-loading"></i>
              Entregas ({purchase.deliveries?.length || 0})
            </h3>
            {(purchase.status === 'approved' || purchase.status === 'partial_delivered') && (
              <button
                className="btn btn-primary btn-sm"
                onClick={() => onAddDelivery(purchase)}
              >
                <i className="fas fa-plus"></i> Nueva Entrega
              </button>
            )}
          </div>
          
          {purchase.deliveries && purchase.deliveries.length > 0 ? (
            <div className="deliveries-list" style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--spacing-md)'
            }}>
              {purchase.deliveries.map((delivery) => (
                <div key={delivery.id} className="delivery-card">
                  <div className="delivery-header">
                    <div className="delivery-info">
                      <h4 className="delivery-title">
                        <i className="fas fa-warehouse" style={{color: 'var(--primary)', marginRight: 'var(--spacing-xs)'}}></i>
                        Entrega a {getWarehouseName(delivery.warehouseId)}
                      </h4>
                      <span className="delivery-date" style={{
                        fontSize: 'var(--font-size-sm)',
                        color: 'var(--text-secondary)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--spacing-xs)'
                      }}>
                        <i className="fas fa-calendar"></i>
                        {formatDate(delivery.deliveryDate)}
                      </span>
                    </div>
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-end',
                      gap: 'var(--spacing-xs)'
                    }}>
                      {renderDeliveryStatus(delivery.status)}
                    </div>
                  </div>
                  
                  <div className="delivery-content" style={{marginBottom: 'var(--spacing-md)'}}>
                    <div className="delivery-products" style={{marginBottom: 'var(--spacing-sm)'}}>
                      <strong style={{color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)'}}>
                        <i className="fas fa-boxes"></i>
                        Productos:
                      </strong>
                      <ul style={{margin: 'var(--spacing-xs) 0 0 var(--spacing-lg)', padding: 0}}>
                        {delivery.products.map((product, index) => (
                          <li key={index} style={{
                            fontSize: 'var(--font-size-sm)',
                            color: 'var(--text-primary)',
                            marginBottom: 'var(--spacing-xxs)',
                            listStyle: 'none',
                            position: 'relative'
                          }}>
                            <i className="fas fa-box" style={{
                              color: 'var(--primary)',
                              marginRight: 'var(--spacing-xs)',
                              width: '12px'
                            }}></i>
                            {product.name}: <strong>{product.quantity} {product.unit}</strong>
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    {delivery.freight > 0 && (
                      <div className="delivery-freight" style={{
                        fontSize: 'var(--font-size-sm)',
                        marginBottom: 'var(--spacing-sm)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--spacing-xs)'
                      }}>
                        <i className="fas fa-truck" style={{color: 'var(--warning)'}}></i>
                        <strong>Flete:</strong> {formatCurrency(delivery.freight)}
                      </div>
                    )}
                    
                    {delivery.notes && (
                      <div className="delivery-notes" style={{
                        fontSize: 'var(--font-size-sm)',
                        padding: 'var(--spacing-sm)',
                        backgroundColor: 'var(--gray-100)',
                        borderRadius: 'var(--border-radius-md)',
                        borderLeft: '3px solid var(--info)'
                      }}>
                        <strong style={{display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', marginBottom: 'var(--spacing-xs)'}}>
                          <i className="fas fa-sticky-note" style={{color: 'var(--info)'}}></i>
                          Notas:
                        </strong> 
                        {delivery.notes}
                      </div>
                    )}
                  </div>
                  
                  <div className="delivery-actions">
                    <button
                      className="btn btn-sm btn-outline"
                      onClick={() => onViewDelivery(purchase, delivery)}
                    >
                      <i className="fas fa-eye"></i> Ver Detalles
                    </button>
                    
                    {delivery.status === 'in_transit' && (
                      <>
                        <button
                          className="btn btn-sm btn-success"
                          onClick={() => onCompleteDelivery(purchase.id, delivery.id)}
                        >
                          <i className="fas fa-check"></i> Completar
                        </button>
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => onCancelDelivery(purchase.id, delivery.id)}
                        >
                          <i className="fas fa-times"></i> Cancelar
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-deliveries">
              <i className="fas fa-truck"></i>
              <h4 className="empty-title">No hay entregas registradas</h4>
              <p className="empty-description">
                Esta compra aún no tiene entregas programadas
              </p>
              {(purchase.status === 'approved' || purchase.status === 'partial_delivered') && (
                <button
                  className="btn btn-primary"
                  onClick={() => onAddDelivery(purchase)}
                >
                  <i className="fas fa-plus"></i> Crear Primera Entrega
                </button>
              )}
            </div>
          )}
        </div>

        {/* Notas */}
        {purchase.notes && (
          <div className="detail-section">
            <h3 className="section-title">
              <i className="fas fa-sticky-note"></i>
              Notas
            </h3>
            <div style={{
              backgroundColor: 'var(--gray-50)',
              padding: 'var(--spacing-lg)',
              borderRadius: 'var(--border-radius-lg)',
              border: '1px solid var(--gray-200)',
              fontSize: 'var(--font-size-sm)',
              color: 'var(--text-primary)',
              lineHeight: '1.6'
            }}>
              {purchase.notes}
            </div>
          </div>
        )}
      </div>

      <div className="dialog-footer">
        <div className="footer-left">
          {purchase.status !== 'completed' && purchase.status !== 'cancelled' && (
            <button
              className="btn btn-outline"
              onClick={() => onEdit(purchase)}
            >
              <i className="fas fa-edit"></i> Editar
            </button>
          )}
          
          <button
            className="btn btn-danger"
            onClick={() => {
              if (window.confirm('¿Estás seguro de que deseas eliminar esta compra? Esta acción no se puede deshacer.')) {
                onDelete(purchase.id);
                onClose();
              }
            }}
          >
            <i className="fas fa-trash"></i> Eliminar
          </button>
        </div>
        
        <button className="btn btn-outline" onClick={onClose}>
          <i className="fas fa-times"></i>
          Cerrar
        </button>
      </div>
    </div>
  );
};

export default PurchaseDetailDialog;