// src/components/panels/Fumigations/FumigationDetailDialog.js - Actualizado
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import FumigationPDFDialog from './FumigationPDFDialog';

const FumigationDetailDialog = ({
  fumigation,
  fields,
  products,
  onClose,
  onEdit,
  onComplete,
  onDelete
}) => {
  const [pdfDialogOpen, setPdfDialogOpen] = useState(false);

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

  // Función para obtener el nombre del campo
  const getFieldName = () => {
    if (fumigation.field && fumigation.field.name) {
      return fumigation.field.name;
    }
    
    if (fumigation.fieldId) {
      const field = fields.find(f => f.id === fumigation.fieldId);
      return field ? field.name : 'Campo desconocido';
    }
    
    return 'No asignado';
  };

  // Función para renderizar el estado como chip
  const renderStatusChip = (status) => {
    let statusClass = '';
    let statusText = '';

    switch (status) {
      case 'pending':
        statusClass = 'status-pending';
        statusText = 'Pendiente';
        break;
      case 'scheduled':
        statusClass = 'status-scheduled';
        statusText = 'Programada';
        break;
      case 'in_progress':
        statusClass = 'status-in-progress';
        statusText = 'En proceso';
        break;
      case 'completed':
        statusClass = 'status-completed';
        statusText = 'Completada';
        break;
      case 'cancelled':
        statusClass = 'status-cancelled';
        statusText = 'Cancelada';
        break;
      default:
        statusClass = 'status-pending';
        statusText = status || 'Pendiente';
    }

    return <span className={`status-chip ${statusClass}`}>{statusText}</span>;
  };

  // Función para obtener productos seleccionados con nombres completos
  const getSelectedProducts = () => {
    if (!fumigation.selectedProducts || fumigation.selectedProducts.length === 0) {
      return [];
    }
    
    return fumigation.selectedProducts.map(selectedProduct => {
      const product = products.find(p => p.id === selectedProduct.productId);
      return {
        ...selectedProduct,
        name: product ? product.name : 'Producto desconocido',
        unit: product ? product.unit : ''
      };
    });
  };

  // Función para obtener los lotes con nombre y superficie
  const getLotsText = () => {
    if (!fumigation.lots || fumigation.lots.length === 0) {
      return 'Sin lotes asignados';
    }

    return fumigation.lots.map(lot => `${lot.name} (${lot.area} ${lot.areaUnit || 'ha'})`).join(', ');
  };

  // Función para obtener el texto del método de aplicación
  const getApplicationMethodText = (method) => {
    const methods = {
      'terrestre': 'Aplicación terrestre',
      'aereo': 'Aplicación aérea',
      'dron': 'Aplicación con dron'
    };
    
    return methods[method] || method || 'No especificado';
  };

  // Función para calcular el volumen total de mezcla
  const getTotalMixVolume = () => {
    if (!fumigation.flowRate || !fumigation.totalSurface) return 0;
    return (fumigation.flowRate * fumigation.totalSurface).toFixed(1);
  };

  // Manejar apertura del diálogo PDF
  const handleOpenPDFDialog = () => {
    console.log('🚀 handleOpenPDFDialog ejecutado');
    console.log('📋 Estado actual pdfDialogOpen:', pdfDialogOpen);
    
    setPdfDialogOpen(true);
    
    console.log('📋 setPdfDialogOpen(true) ejecutado');
    
    // Debug completo del DOM
    setTimeout(() => {
      console.log('🔍 === DEBUG DOM DESPUÉS DE 500ms ===');
      
      // Buscar todos los overlays
      const allOverlays = document.querySelectorAll('.dialog-overlay, .pdf-dialog-overlay');
      console.log(`📊 Total overlays encontrados: ${allOverlays.length}`);
      
      allOverlays.forEach((overlay, index) => {
        const styles = getComputedStyle(overlay);
        console.log(`📋 Overlay ${index}:`, {
          className: overlay.className,
          zIndex: styles.zIndex,
          position: styles.position,
          display: styles.display,
          visibility: styles.visibility,
          opacity: styles.opacity,
          top: styles.top,
          left: styles.left,
          width: styles.width,
          height: styles.height
        });
      });
      
      // Buscar el diálogo PDF específicamente
      const pdfDialogs = document.querySelectorAll('.fumigation-pdf-dialog');
      console.log(`📊 PDF Dialogs encontrados: ${pdfDialogs.length}`);
      
      pdfDialogs.forEach((dialog, index) => {
        const styles = getComputedStyle(dialog);
        console.log(`📋 PDF Dialog ${index}:`, {
          className: dialog.className,
          zIndex: styles.zIndex,
          position: styles.position,
          display: styles.display,
          visibility: styles.visibility,
          opacity: styles.opacity,
          parent: dialog.parentElement?.className || 'no parent'
        });
      });
      
      // Verificar si está en document.body
      const bodyChildren = Array.from(document.body.children);
      const pdfInBody = bodyChildren.find(child => 
        child.className && child.className.includes('pdf-dialog-overlay')
      );
      
      console.log('🏠 PDF Dialog está en document.body:', !!pdfInBody);
      if (pdfInBody) {
        console.log('🏠 PDF Dialog en body:', pdfInBody);
      }
      
    }, 500);
  };

  // Manejar cierre del diálogo PDF
  const handleClosePDFDialog = () => {
    setPdfDialogOpen(false);
  };

  return (
    <>
      <div className="dialog fumigation-detail-dialog">
        <div className="dialog-header">
          <div className="dialog-title-container">
            <h2 className="dialog-title">Detalles de fumigación</h2>
            {renderStatusChip(fumigation.status)}
          </div>
          <button className="dialog-close" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>
        
        <div className="dialog-body">
          <div className="fumigation-details-container">
            <div className="fumigation-summary">
              <div className="fumigation-summary-header">
                <div className="fumigation-icon-large">
                  <i className="fas fa-spray-can"></i>
                </div>
                <div className="fumigation-summary-content">
                  <h3 className="fumigation-name">
                    {fumigation.orderNumber ? 
                      `Orden #${fumigation.orderNumber}` : fumigation.establishment}
                  </h3>
                  <div className="fumigation-field">{fumigation.crop} - {getFieldName()}</div>
                  <div className="fumigation-establishment">
                    <strong>Establecimiento:</strong> {fumigation.establishment}
                  </div>
                </div>
                <div className="fumigation-stats">
                  <div className="stat">
                    <div className="stat-value">{fumigation.totalSurface} {fumigation.surfaceUnit || 'ha'}</div>
                    <div className="stat-label">Superficie</div>
                  </div>
                  <div className="stat">
                    <div className="stat-value">{fumigation.flowRate || 80} L/ha</div>
                    <div className="stat-label">Caudal</div>
                  </div>
                  <div className="stat">
                    <div className="stat-value">{getTotalMixVolume()} L</div>
                    <div className="stat-label">Vol. Total</div>
                  </div>
                </div>
              </div>
              
              {/* Acciones rápidas */}
              <div className="fumigation-actions-bar">
                {/* Botón de generar PDF */}
                <button className="btn btn-secondary" onClick={handleOpenPDFDialog}>
                  <i className="fas fa-file-pdf"></i> Generar PDF
                </button>
                
                {fumigation.status !== 'completed' && fumigation.status !== 'cancelled' && (
                  <>
                    <button className="btn btn-primary" onClick={() => onComplete(fumigation)}>
                      <i className="fas fa-check"></i> Completar fumigación
                    </button>
                    <button className="btn btn-outline" onClick={() => onEdit(fumigation)}>
                      <i className="fas fa-edit"></i> Editar
                    </button>
                  </>
                )}
                <button 
                  className="btn btn-outline btn-danger" 
                  onClick={() => {
                    if (window.confirm('¿Estás seguro de que deseas eliminar esta fumigación? Esta acción no se puede deshacer.')) {
                      onDelete(fumigation.id);
                      onClose();
                    }
                  }}
                >
                  <i className="fas fa-trash"></i> Eliminar
                </button>
              </div>

              {/* Información general */}
              <div className="detail-section">
                <h3 className="section-title">
                  <i className="fas fa-info-circle"></i> Información general
                </h3>
                
                <div className="detail-grid">
                  <div className="detail-item">
                    <span className="detail-label">Número de orden</span>
                    <span className="detail-value">{fumigation.orderNumber || 'No asignado'}</span>
                  </div>
                  
                  <div className="detail-item">
                    <span className="detail-label">Estado</span>
                    <span className="detail-value">{renderStatusChip(fumigation.status)}</span>
                  </div>
                  
                  <div className="detail-item">
                    <span className="detail-label">Fecha de aplicación</span>
                    <span className="detail-value">{formatDate(fumigation.applicationDate)}</span>
                  </div>
                  
                  <div className="detail-item">
                    <span className="detail-label">Establecimiento</span>
                    <span className="detail-value">{fumigation.establishment}</span>
                  </div>
                  
                  <div className="detail-item">
                    <span className="detail-label">Aplicador</span>
                    <span className="detail-value">{fumigation.applicator}</span>
                  </div>
                  
                  <div className="detail-item">
                    <span className="detail-label">Cultivo</span>
                    <span className="detail-value">{fumigation.crop}</span>
                  </div>
                  
                  <div className="detail-item">
                    <span className="detail-label">Campo</span>
                    <span className="detail-value">{getFieldName()}</span>
                  </div>
                  
                  <div className="detail-item">
                    <span className="detail-label">Lotes</span>
                    <span className="detail-value">{getLotsText()}</span>
                  </div>
                </div>
              </div>
              
              {/* Método de aplicación */}
              <div className="detail-section">
                <h3 className="section-title">
                  <i className="fas fa-cogs"></i> Método de aplicación
                </h3>
                
                <div className="detail-grid">
                  <div className="detail-item">
                    <span className="detail-label">Método</span>
                    <span className="detail-value">{getApplicationMethodText(fumigation.applicationMethod)}</span>
                  </div>
                  
                  <div className="detail-item">
                    <span className="detail-label">Superficie total</span>
                    <span className="detail-value">{fumigation.totalSurface} {fumigation.surfaceUnit || 'ha'}</span>
                  </div>
                  
                  <div className="detail-item">
                    <span className="detail-label">Caudal</span>
                    <span className="detail-value">{fumigation.flowRate || 80} L/ha</span>
                  </div>
                  
                  <div className="detail-item">
                    <span className="detail-label">Volumen total de mezcla</span>
                    <span className="detail-value">{getTotalMixVolume()} L</span>
                  </div>
                </div>
              </div>
              
              {/* Productos aplicados */}
              <div className="detail-section">
                <h3 className="section-title">
                  <i className="fas fa-flask"></i> Productos aplicados
                </h3>
                
                {getSelectedProducts().length > 0 ? (
                  <div className="products-table-container">
                    <table className="products-table">
                      <thead>
                        <tr>
                          <th>Producto</th>
                          <th>Dosis</th>
                          <th>Cantidad total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {getSelectedProducts().map((product, index) => (
                          <tr key={index}>
                            <td>
                              <strong>{product.name}</strong>
                            </td>
                            <td>
                              {product.dose} {product.unit}/ha
                            </td>
                            <td>
                              {(product.dose * fumigation.totalSurface).toFixed(2)} {product.unit}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-muted">No se han seleccionado productos para esta fumigación.</p>
                )}
              </div>

              {/* Condiciones climáticas */}
              {fumigation.weatherConditions && (
                <div className="detail-section">
                  <h3 className="section-title">
                    <i className="fas fa-cloud-sun"></i> Condiciones climáticas
                  </h3>
                  
                  <div className="detail-grid">
                    {fumigation.weatherConditions.temperature && (
                      <div className="detail-item">
                        <span className="detail-label">Temperatura</span>
                        <span className="detail-value">{fumigation.weatherConditions.temperature}°C</span>
                      </div>
                    )}
                    
                    {fumigation.weatherConditions.humidity && (
                      <div className="detail-item">
                        <span className="detail-label">Humedad</span>
                        <span className="detail-value">{fumigation.weatherConditions.humidity}%</span>
                      </div>
                    )}
                    
                    {fumigation.weatherConditions.windSpeed && (
                      <div className="detail-item">
                        <span className="detail-label">Velocidad del viento</span>
                        <span className="detail-value">{fumigation.weatherConditions.windSpeed} km/h</span>
                      </div>
                    )}
                    
                    {fumigation.weatherConditions.windDirection && (
                      <div className="detail-item">
                        <span className="detail-label">Dirección del viento</span>
                        <span className="detail-value">{fumigation.weatherConditions.windDirection}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Información de finalización */}
              {fumigation.status === 'completed' && (
                <div className="detail-section">
                  <h3 className="section-title">
                    <i className="fas fa-check-circle"></i> Información de finalización
                  </h3>
                  
                  <div className="detail-grid">
                    {fumigation.startDateTime && (
                      <div className="detail-item">
                        <span className="detail-label">Inicio</span>
                        <span className="detail-value">{formatDateTime(fumigation.startDateTime)}</span>
                      </div>
                    )}
                    
                    {fumigation.endDateTime && (
                      <div className="detail-item">
                        <span className="detail-label">Finalización</span>
                        <span className="detail-value">{formatDateTime(fumigation.endDateTime)}</span>
                      </div>
                    )}
                    
                    {fumigation.startDateTime && fumigation.endDateTime && (
                      <div className="detail-item">
                        <span className="detail-label">Duración</span>
                        <span className="detail-value">
                          {(() => {
                            const start = fumigation.startDateTime.seconds 
                              ? new Date(fumigation.startDateTime.seconds * 1000)
                              : new Date(fumigation.startDateTime);
                            const end = fumigation.endDateTime.seconds 
                              ? new Date(fumigation.endDateTime.seconds * 1000)
                              : new Date(fumigation.endDateTime);
                            const duration = Math.round((end - start) / (1000 * 60)); // minutos
                            
                            if (duration >= 60) {
                              const hours = Math.floor(duration / 60);
                              const minutes = duration % 60;
                              return `${hours}h ${minutes}min`;
                            } else {
                              return `${duration} min`;
                            }
                          })()}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {fumigation.completionNotes && (
                    <div className="completion-notes">
                      <h4>Notas de finalización</h4>
                      <p>{fumigation.completionNotes}</p>
                    </div>
                  )}
                </div>
              )}
              
              {/* Observaciones */}
              {fumigation.observations && (
                <div className="detail-section">
                  <h3 className="section-title">
                    <i className="fas fa-sticky-note"></i> Observaciones
                  </h3>
                  
                  <div className="notes-content">
                    <p>{fumigation.observations}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="dialog-footer">
          <button className="btn btn-outline" onClick={onClose}>
            Cerrar
          </button>
          {fumigation.status !== 'completed' && fumigation.status !== 'cancelled' && (
            <button className="btn btn-primary" onClick={() => onComplete(fumigation)}>
              <i className="fas fa-check"></i> Completar fumigación
            </button>
          )}
        </div>
      </div>

      {/* DIÁLOGO PDF CON PORTAL - RENDERIZADO FUERA DEL DOM ACTUAL */}
      {pdfDialogOpen && createPortal(
        <div 
          className="pdf-dialog-overlay" 
          style={{ 
            zIndex: 999999, 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            backgroundColor: 'rgba(255,0,0,0.8)', // ROJO PARA DEBUG
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            pointerEvents: 'auto'
          }}
          onClick={(e) => {
            console.log('Click en overlay PDF');
            e.stopPropagation();
          }}
        >
          <div 
            style={{ 
              zIndex: 999999, 
              position: 'relative',
              maxHeight: '90vh',
              overflow: 'auto',
              backgroundColor: 'white',
              border: '5px solid blue', // BORDE AZUL PARA DEBUG
              borderRadius: '10px',
              padding: '20px'
            }}
            onClick={(e) => {
              console.log('Click en contenido PDF');
              e.stopPropagation();
            }}
          >
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <h2>🐛 DEBUG: Diálogo PDF Visible</h2>
              <button 
                onClick={handleClosePDFDialog}
                style={{ 
                  padding: '10px 20px', 
                  backgroundColor: 'red', 
                  color: 'white', 
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer'
                }}
              >
                CERRAR DEBUG
              </button>
            </div>
            
            <FumigationPDFDialog
              fumigation={fumigation}
              fields={fields}
              products={products}
              onClose={handleClosePDFDialog}
            />
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default FumigationDetailDialog;