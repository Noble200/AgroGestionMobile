// src/components/panels/Fumigations/FumigationPDFDialog.js - ACTUALIZADO con Railway
import React, { useState, useRef, useEffect } from 'react';
import { generateFumigationPDF, downloadFumigationPDF } from '../../../utils/fumigationPdfGenerator';
const RailwayPdfService = require('../../../services/railwayPdfService');

const FumigationPDFDialog = ({ 
  fumigation, 
  fields, 
  products, 
  onClose 
}) => {
  const [mapImage, setMapImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [pdfPreview, setPdfPreview] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [pdfExistsInRailway, setPdfExistsInRailway] = useState(false);
  const [railwayPdfMetadata, setRailwayPdfMetadata] = useState(null);
  const [testingConnection, setTestingConnection] = useState(false);
  const fileInputRef = useRef(null);

  // Verificar si existe PDF en Railway al abrir el diálogo
  useEffect(() => {
    checkPdfInRailway();
  }, [fumigation.id]);

  // Verificar si existe PDF en Railway
  const checkPdfInRailway = async () => {
    try {
      console.log('🔍 Verificando PDF existente en Railway para:', fumigation.id);
      const metadata = await RailwayPdfService.getPdfMetadata(fumigation.id);
      
      if (metadata) {
        setPdfExistsInRailway(true);
        setRailwayPdfMetadata(metadata);
        console.log('✅ PDF encontrado en Railway:', metadata);
      } else {
        setPdfExistsInRailway(false);
        setRailwayPdfMetadata(null);
        console.log('ℹ️ No hay PDF en Railway para esta fumigación');
      }
    } catch (error) {
      console.error('❌ Error verificando PDF en Railway:', error);
      setPdfExistsInRailway(false);
      setRailwayPdfMetadata(null);
    }
  };

  // Test de conexión a Railway
  const testRailwayConnection = async () => {
    try {
      setTestingConnection(true);
      const isConnected = await RailwayPdfService.testConnection();
      
      if (isConnected) {
        alert('✅ Conexión a Railway exitosa');
      } else {
        alert('❌ Error de conexión a Railway');
      }
    } catch (error) {
      console.error('Error en test de conexión:', error);
      alert('❌ Error de conexión a Railway: ' + error.message);
    } finally {
      setTestingConnection(false);
    }
  };

  // Manejar selección de imagen
  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    
    if (file) {
      // Validar tipo de archivo
      if (!file.type.startsWith('image/')) {
        alert('Por favor selecciona un archivo de imagen válido (JPG, PNG, etc.)');
        return;
      }
      
      // Validar tamaño (máximo 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert('La imagen es demasiado grande. Por favor selecciona una imagen menor a 10MB.');
        return;
      }
      
      setMapImage(file);
      
      // Crear preview de la imagen
      const reader = new FileReader();
      reader.onload = (event) => {
        setImagePreview(event.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Eliminar imagen seleccionada
  const handleRemoveImage = () => {
    setMapImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Generar preview del PDF
  const handleGeneratePreview = async () => {
    try {
      setGenerating(true);
      
      const generator = await generateFumigationPDF(fumigation, products, mapImage);
      const pdfDataUrl = generator.getPDFDataURL();
      
      setPdfPreview(pdfDataUrl);
      setShowPreview(true);
    } catch (error) {
      console.error('Error al generar preview:', error);
      alert('Error al generar el preview del PDF: ' + error.message);
    } finally {
      setGenerating(false);
    }
  };

  // Generar y guardar PDF nuevo (local + Railway)
  const handleGenerateAndSavePDF = async () => {
    try {
      setGenerating(true);
      console.log('🔄 Generando nuevo PDF y guardando en Railway...');
      
      // 1. Generar PDF
      const generator = await generateFumigationPDF(fumigation, products, mapImage);
      
      // 2. Guardar PDF localmente
      await downloadFumigationPDF(fumigation, products, mapImage);
      
      // 3. Convertir PDF a array para Railway (NO usar Buffer en frontend)
      const pdfBlob = generator.output('blob');
      const arrayBuffer = await pdfBlob.arrayBuffer();
      const pdfArray = new Uint8Array(arrayBuffer); // ✅ Usar Uint8Array en lugar de Buffer
      
      // 4. Guardar en Railway
      const fumigationData = {
        id: fumigation.id,
        date: fumigation.applicationDate || fumigation.date || new Date(),
        fieldName: getFieldName(),
        crop: fumigation.crop,
        applicator: fumigation.applicator,
        totalSurface: fumigation.totalSurface,
        surfaceUnit: fumigation.surfaceUnit
      };
      
      const railwayResult = await RailwayPdfService.savePdf(
        fumigationData, 
        pdfArray, // ✅ Enviar como array
        !!mapImage
      );
      
      console.log('✅ PDF guardado exitosamente:', railwayResult);
      
      // 5. Actualizar estado
      await checkPdfInRailway();
      
      alert('✅ PDF generado y guardado exitosamente en local y Railway');
      onClose();
      
    } catch (error) {
      console.error('❌ Error al generar y guardar PDF:', error);
      alert('❌ Error al generar el PDF: ' + error.message);
    } finally {
      setGenerating(false);
    }
  };

  // Descargar PDF existente desde Railway
  const handleDownloadFromRailway = async () => {
    try {
      setDownloading(true);
      console.log('📥 Descargando PDF desde Railway...');
      
      const result = await RailwayPdfService.downloadPdf(fumigation.id);
      
      // ✅ Crear blob desde array (no desde Buffer)
      const pdfBlob = new Blob([new Uint8Array(result.pdfBuffer)], { type: 'application/pdf' });
      
      // Crear URL de descarga
      const url = window.URL.createObjectURL(pdfBlob);
      
      // Crear enlace de descarga
      const link = document.createElement('a');
      link.href = url;
      link.download = `Fumigacion_${fumigation.orderNumber || fumigation.id}_${new Date().toISOString().split('T')[0]}.pdf`;
      
      // Ejecutar descarga
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Limpiar URL
      window.URL.revokeObjectURL(url);
      
      console.log('✅ PDF descargado exitosamente desde Railway');
      alert('✅ PDF descargado exitosamente');
      
    } catch (error) {
      console.error('❌ Error al descargar PDF desde Railway:', error);
      alert('❌ Error al descargar PDF: ' + error.message);
    } finally {
      setDownloading(false);
    }
  };

  // Obtener nombre del campo
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

  // Obtener productos seleccionados con nombres
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

  // Formatear fecha
  const formatDate = (date) => {
    if (!date) return 'No especificada';
    
    const d = date.seconds
      ? new Date(date.seconds * 1000)
      : new Date(date);
    
    return d.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Formatear tamaño de archivo
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="dialog fumigation-pdf-dialog">
      <div className="dialog-header">
        <h2 className="dialog-title">Gestión de PDF - Fumigación</h2>
        <button className="dialog-close" onClick={onClose}>
          <i className="fas fa-times"></i>
        </button>
      </div>
      
      <div className="dialog-body">
        {!showPreview ? (
          <div className="pdf-generator-content">
            {/* Estado del PDF en Railway */}
            {pdfExistsInRailway && railwayPdfMetadata && (
              <div className="pdf-status-section">
                <h3 className="section-title">
                  <i className="fas fa-cloud"></i> PDF Existente en Railway
                </h3>
                
                <div className="pdf-status-info">
                  <div className="pdf-status-item">
                    <span className="status-label">Estado:</span>
                    <span className="status-value success">
                      <i className="fas fa-check-circle"></i> Disponible
                    </span>
                  </div>
                  <div className="pdf-status-item">
                    <span className="status-label">Creado:</span>
                    <span className="status-value">
                      {new Date(railwayPdfMetadata.created_at).toLocaleString('es-ES')}
                    </span>
                  </div>
                  <div className="pdf-status-item">
                    <span className="status-label">Tamaño:</span>
                    <span className="status-value">
                      {formatFileSize(railwayPdfMetadata.pdf_size)}
                    </span>
                  </div>
                  <div className="pdf-status-item">
                    <span className="status-label">Incluye mapa:</span>
                    <span className="status-value">
                      {railwayPdfMetadata.has_map_image ? 
                        <><i className="fas fa-check text-success"></i> Sí</> : 
                        <><i className="fas fa-times text-muted"></i> No</>
                      }
                    </span>
                  </div>
                </div>

                <div className="pdf-download-section">
                  <button
                    className="btn btn-primary btn-download"
                    onClick={handleDownloadFromRailway}
                    disabled={downloading}
                  >
                    {downloading ? (
                      <>
                        <span className="spinner-border spinner-border-sm mr-2"></span>
                        Descargando...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-cloud-download-alt"></i> Descargar PDF Existente
                      </>
                    )}
                  </button>
                  <p className="help-text">
                    Descarga el PDF previamente generado sin necesidad de recrearlo.
                  </p>
                </div>
              </div>
            )}

            {/* Resumen de la fumigación */}
            <div className="fumigation-summary-section">
              <h3 className="section-title">
                <i className="fas fa-info-circle"></i> Resumen de la fumigación
              </h3>
              
              <div className="summary-grid">
                <div className="summary-item">
                  <span className="summary-label">Orden N°</span>
                  <span className="summary-value">{fumigation.orderNumber || 'Sin asignar'}</span>
                </div>
                
                <div className="summary-item">
                  <span className="summary-label">Fecha de aplicación</span>
                  <span className="summary-value">{formatDate(fumigation.applicationDate)}</span>
                </div>
                
                <div className="summary-item">
                  <span className="summary-label">Establecimiento</span>
                  <span className="summary-value">{fumigation.establishment}</span>
                </div>
                
                <div className="summary-item">
                  <span className="summary-label">Aplicador</span>
                  <span className="summary-value">{fumigation.applicator}</span>
                </div>
                
                <div className="summary-item">
                  <span className="summary-label">Campo</span>
                  <span className="summary-value">{getFieldName()}</span>
                </div>
                
                <div className="summary-item">
                  <span className="summary-label">Cultivo</span>
                  <span className="summary-value">{fumigation.crop}</span>
                </div>
                
                <div className="summary-item">
                  <span className="summary-label">Superficie</span>
                  <span className="summary-value">{fumigation.totalSurface} {fumigation.surfaceUnit}</span>
                </div>
                
                <div className="summary-item">
                  <span className="summary-label">Productos</span>
                  <span className="summary-value">{getSelectedProducts().length} productos</span>
                </div>
              </div>
            </div>

            {/* Productos a incluir en el PDF */}
            {getSelectedProducts().length > 0 && (
              <div className="pdf-products-section">
                <h3 className="section-title">
                  <i className="fas fa-flask"></i> Productos incluidos en el PDF
                </h3>
                
                <div className="pdf-products-list">
                  {getSelectedProducts().map((product, index) => (
                    <div key={index} className="pdf-product-item">
                      <div className="product-info">
                        <span className="product-name">{product.name}</span>
                        <span className="product-dose">{product.dosePerHa} {product.doseUnit}</span>
                      </div>
                      <div className="product-total">
                        <span>{product.totalQuantity.toFixed(2)} {product.unit}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Sección para cargar imagen del mapa */}
            <div className="map-image-section">
              <h3 className="section-title">
                <i className="fas fa-map"></i> Mapa de aplicación (opcional)
              </h3>
              
              <p className="help-text">
                Puedes cargar una imagen del mapa de aplicación que se incluirá en el PDF. 
                La imagen será usada solo para este PDF y no se guardará en la base de datos.
              </p>
              
              {!imagePreview ? (
                <div className="image-upload-section">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageSelect}
                    accept="image/*"
                    style={{ display: 'none' }}
                  />
                  
                  <button
                    className="btn btn-outline btn-upload"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <i className="fas fa-cloud-upload-alt"></i> Seleccionar imagen del mapa
                  </button>
                </div>
              ) : (
                <div className="image-preview">
                  <img src={imagePreview} alt="Preview del mapa" />
                  <div className="image-actions">
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={handleRemoveImage}
                    >
                      <i className="fas fa-trash"></i> Eliminar imagen
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Sección de test de conexión */}
            <div className="railway-test-section">
              <h3 className="section-title">
                <i className="fas fa-database"></i> Estado de Railway
              </h3>
              
              <button
                className="btn btn-outline btn-sm"
                onClick={testRailwayConnection}
                disabled={testingConnection}
              >
                {testingConnection ? (
                  <>
                    <span className="spinner-border spinner-border-sm mr-2"></span>
                    Probando...
                  </>
                ) : (
                  <>
                    <i className="fas fa-network-wired"></i> Probar conexión Railway
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="pdf-preview-section">
            <h3 className="section-title">
              <i className="fas fa-eye"></i> Preview del PDF
            </h3>
            
            <div className="pdf-preview-container">
              {pdfPreview ? (
                <iframe
                  src={pdfPreview}
                  width="100%"
                  height="600px"
                  title="Preview del PDF"
                  style={{ border: '1px solid #ddd', borderRadius: '8px' }}
                />
              ) : (
                <div className="pdf-preview-loading">
                  <div className="spinner"></div>
                  <p>Generando preview...</p>
                </div>
              )}
            </div>
            
            <div className="pdf-preview-actions">
              <button
                className="btn btn-outline"
                onClick={() => setShowPreview(false)}
              >
                <i className="fas fa-arrow-left"></i> Volver a editar
              </button>
              
              <button
                className="btn btn-primary"
                onClick={handleGenerateAndSavePDF}
                disabled={generating}
              >
                {generating ? (
                  <>
                    <span className="spinner-border spinner-border-sm mr-2"></span>
                    Guardando...
                  </>
                ) : (
                  <>
                    <i className="fas fa-save"></i> Guardar PDF
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
      
      <div className="dialog-footer">
        <button className="btn btn-outline" onClick={onClose} disabled={generating || downloading}>
          Cancelar
        </button>
        
        {!showPreview && (
          <>
            <button
              className="btn btn-secondary"
              onClick={handleGeneratePreview}
              disabled={generating || downloading}
            >
              {generating ? (
                <>
                  <span className="spinner-border spinner-border-sm mr-2"></span>
                  Generando...
                </>
              ) : (
                <>
                  <i className="fas fa-eye"></i> Ver Preview
                </>
              )}
            </button>
            
            <button
              className="btn btn-primary"
              onClick={handleGenerateAndSavePDF}
              disabled={generating || downloading}
            >
              {generating ? (
                <>
                  <span className="spinner-border spinner-border-sm mr-2"></span>
                  Generando...
                </>
              ) : (
                <>
                  <i className="fas fa-plus"></i> Generar Nuevo PDF
                </>
              )}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default FumigationPDFDialog;