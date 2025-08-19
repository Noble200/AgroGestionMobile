import React from 'react';

const ProductDetailDialog = ({ product, fields, warehouses, onClose, onEditProduct, onDeleteProduct }) => {
  // Función para formatear fecha

  const formatDate = (date) => {
    if (!date) return 'Sin vencimiento';
    
    const d = date.seconds
      ? new Date(date.seconds * 1000)
      : new Date(date);
    
    return d.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Función para obtener el color del stock según el nivel
  const getStockStatus = () => {
    const currentStock = product.stock || 0;
    const minStock = product.minStock || 0;
    
    if (currentStock === 0) return 'stock-empty';
    if (currentStock <= minStock) return 'stock-low';
    if (currentStock <= minStock * 1.5) return 'stock-warning';
    return 'stock-ok';
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

  // Función para obtener el nombre del lote
  const getLotName = () => {
    if (!product.lotId) return 'No asignado';
    
    const field = fields.find(f => f.id === product.fieldId);
    if (!field) return 'Lote desconocido';
    
    const lot = field.lots.find(l => l.id === product.lotId);
    return lot ? lot.name : 'Lote desconocido';
  };

  // Función para obtener el texto de la ubicación
  const getLocationText = () => {
    const fieldName = getFieldName();
    
    if (product.storageLevel === 'field') {
      return `${fieldName} (Campo completo)`;
    } else if (product.storageLevel === 'warehouse') {
      return `${fieldName} > ${getWarehouseName()}`;
    } else if (product.storageLevel === 'lot') {
      return `${fieldName} > Lote: ${getLotName()}`;
    }
    
    return fieldName;
  };

  // Función para obtener el texto de las categorías
  const getCategoryText = (category) => {
    const categories = {
      'insumo': 'Insumo',
      'herramienta': 'Herramienta',
      'semilla': 'Semilla',
      'fertilizante': 'Fertilizante',
      'fertilizante_foliar': 'Fertilizante Foliar', 
      'curasemilla_quimico': 'Curasemilla Químico', 
      'curasemilla_biologico': 'Curasemilla Biológico', 
      'inoculante': 'Inoculante', 
      'insecticida': 'Insecticida', 
      'fungicida': 'Fungicida', 
      'herbicida': 'Herbicida', 
      'lubricante': 'Lubricante', 
      'combustible': 'Combustible',
      'coadyuvante': 'Coadyuvante', 
      'bioestimulante': 'Bioestimulante', 
      'pesticida': 'Pesticida',
      'maquinaria': 'Maquinaria',
      'combustible': 'Combustible',
      'otro': 'Otro'
    };
    
    return categories[category] || category;
  };

  const isFitosanitaryProduct = (category) => {
    const fitosanitaryCategories = [
      'insecticida',
      'fungicida', 
      'herbicida',
      'curasemilla_quimico',
      'curasemilla_biologico',
      'pesticida'
    ];
    return fitosanitaryCategories.includes(category);
  };

  // Función para obtener el texto del tipo de almacenamiento
  const getStorageTypeText = (storageType) => {
    const types = {
      'bolsas': 'Bolsas',
      'bidones': 'Bidones', 
      'botellas': 'Botellas', 
      'big-bag': 'Big-bag', 
      'tambores': 'Tambores',
      'bag_in_box': 'Bag in box', 
      'dosis': 'Dosis', 
      'packs': 'Packs', 
      'sobres': 'Sobres', 
      'suelto': 'Suelto',
      'unidad': 'Por unidad',
      'sacos': 'Sacos',
      'contenedores': 'Contenedores',
      'cajas': 'Cajas'
    };
    
    return types[storageType] || storageType;
  };

  // Función para obtener el icono según la categoría
  const getCategoryIcon = (category) => {
    switch (category) {
      case 'insumo':
        return 'fas fa-flask';
      case 'herramienta':
        return 'fas fa-tools';
      case 'semilla':
        return 'fas fa-seedling';
      case 'fertilizante':
        return 'fas fa-leaf';
      case 'pesticida':
        return 'fas fa-spray-can';
      case 'maquinaria':
        return 'fas fa-cogs';
      case 'combustible':
        return 'fas fa-gas-pump';
      default:
        return 'fas fa-box';
    }
  };

  return (
    <div className="dialog product-detail-dialog">
      <div className="dialog-header">
        <div className="dialog-title-container">
          <h2 className="dialog-title">Detalles del producto</h2>
          <span className={`stock-status-chip ${getStockStatus()}`}>
            {getStockStatus() === 'stock-empty' && 'Sin stock'}
            {getStockStatus() === 'stock-low' && 'Stock bajo'}
            {getStockStatus() === 'stock-warning' && 'Stock limitado'}
            {getStockStatus() === 'stock-ok' && 'Stock normal'}
          </span>
        </div>
        <button className="dialog-close" onClick={onClose}>
          <i className="fas fa-times"></i>
        </button>
      </div>
      
      <div className="dialog-body">
        <div className="product-details-container">
          <div className="product-summary">
            <div className="product-summary-header">
              <div className="product-category-icon">
                <i className={getCategoryIcon(product.category)}></i>
              </div>
              <div className="product-summary-content">
                <h3 className="product-name">{product.name}</h3>
                <div className="product-category-container">
                  <span className="product-category">{getCategoryText(product.category)}</span>
                  {/* 🆕 Badge para fitosanitarios */}
                  {isFitosanitaryProduct(product.category) && (
                    <span className="fitosanitary-badge">
                      <i className="fas fa-leaf"></i> Fitosanitario
                    </span>
                  )}
                </div>
                {product.code && (
                  <div className="product-code">Código: {product.code}</div>
                )}
                {/* 🆕 Mostrar fabricante en el encabezado si existe */}
                {product.manufacturer && (
                  <div className="product-manufacturer-header">
                    <i className="fas fa-industry"></i> {product.manufacturer}
                  </div>
                )}
              </div>
              <div className="product-stock-display">
                <div className="stock-value">{product.stock || 0}</div>
                <div className="stock-unit">{product.unit}</div>
                {product.minStock > 0 && (
                  <div className="min-stock-text">Mín: {product.minStock}</div>
                )}
              </div>
            </div>
            
            {/* Acciones rápidas */}
            <div className="product-actions-bar">
              <button className="btn btn-primary" onClick={() => onEditProduct(product)}>
                <i className="fas fa-edit"></i> Editar producto
              </button>
              <button className="btn btn-outline btn-danger" onClick={() => {
                if (window.confirm('¿Estás seguro de que deseas eliminar este producto?')) {
                  onDeleteProduct(product.id);
                  onClose();
                }
              }}>
                <i className="fas fa-trash"></i> Eliminar
              </button>
            </div>

            {/* Información básica */}
            <div className="detail-section">
              <h3 className="section-title">
                <i className="fas fa-info-circle"></i> Información básica
              </h3>
              
              <div className="detail-grid">
                <div className="detail-item">
                  <span className="detail-label">Nombre</span>
                  <span className="detail-value">{product.name}</span>
                </div>
                
                {product.code && (
                  <div className="detail-item">
                    <span className="detail-label">Código</span>
                    <span className="detail-value">{product.code}</span>
                  </div>
                )}
                
                <div className="detail-item">
                  <span className="detail-label">Categoría</span>
                  <span className="detail-value">{getCategoryText(product.category)}</span>
                </div>
                
                {/* 🆕 FABRICANTE */}
                {product.manufacturer && (
                  <div className="detail-item">
                    <span className="detail-label">
                      <i className="fas fa-industry"></i> Fabricante
                    </span>
                    <span className="detail-value manufacturer-detail">
                      {product.manufacturer}
                    </span>
                  </div>
                )}
                
                {/* 🆕 PRINCIPIO ACTIVO */}
                {product.activeIngredient && (
                  <div className="detail-item">
                    <span className="detail-label">
                      <i className="fas fa-flask"></i> Principio Activo
                    </span>
                    <span className="detail-value active-ingredient-detail">
                      {product.activeIngredient}
                    </span>
                  </div>
                )}
                
                <div className="detail-item">
                  <span className="detail-label">Forma de almacenamiento</span>
                  <span className="detail-value">{getStorageTypeText(product.storageType)}</span>
                </div>
                
                <div className="detail-item">
                  <span className="detail-label">Unidad</span>
                  <span className="detail-value">{product.unit}</span>
                </div>
                
                {product.lotNumber && (
                  <div className="detail-item">
                    <span className="detail-label">Número de lote</span>
                    <span className="detail-value">{product.lotNumber}</span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Stock y vencimiento */}
            <div className="detail-section">
              <h3 className="section-title">
                <i className="fas fa-warehouse"></i> Stock y vencimiento
              </h3>
              
              <div className="detail-grid">
                <div className="detail-item">
                  <span className="detail-label">Stock actual</span>
                  <span className={`detail-value stock-value ${getStockStatus()}`}>
                    {product.stock || 0} {product.unit}
                  </span>
                </div>
                
                <div className="detail-item">
                  <span className="detail-label">Stock mínimo</span>
                  <span className="detail-value">
                    {product.minStock ? `${product.minStock} ${product.unit}` : 'No definido'}
                  </span>
                </div>
                
                <div className="detail-item">
                  <span className="detail-label">Fecha de vencimiento</span>
                  <span className="detail-value">{formatDate(product.expiryDate)}</span>
                </div>
              </div>
            </div>
            
            {/* Ubicación */}
            <div className="detail-section">
              <h3 className="section-title">
                <i className="fas fa-map-marker-alt"></i> Ubicación
              </h3>
              
              <div className="detail-grid">
                <div className="detail-item">
                  <span className="detail-label">Ubicación</span>
                  <span className="detail-value">{getLocationText()}</span>
                </div>
                
                <div className="detail-item">
                  <span className="detail-label">Campo</span>
                  <span className="detail-value">{getFieldName()}</span>
                </div>
                
                {product.storageLevel === 'warehouse' && (
                  <div className="detail-item">
                    <span className="detail-label">Almacén</span>
                    <span className="detail-value">{getWarehouseName()}</span>
                  </div>
                )}
                
                {product.storageLevel === 'lot' && (
                  <div className="detail-item">
                    <span className="detail-label">Lote</span>
                    <span className="detail-value">{getLotName()}</span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Información del proveedor y costos */}
            {(product.supplierName || product.cost || product.supplierCode || product.manufacturer) && (
              <div className="detail-section">
                <h3 className="section-title">
                  <i className="fas fa-truck"></i> Proveedor y costos
                </h3>
                
                <div className="detail-grid">
                  {product.supplierName && (
                    <div className="detail-item">
                      <span className="detail-label">Proveedor</span>
                      <span className="detail-value">{product.supplierName}</span>
                    </div>
                  )}
                  
                  {/* Si no hay proveedor pero hay fabricante, mostrarlo aquí también */}
                  {product.supplierContact && (
                    <div className="detail-item">
                      <span className="detail-label">Contacto</span>
                      <span className="detail-value">{product.supplierContact}</span>
                    </div>
                  )}
                  
                  {product.supplierCode && (
                    <div className="detail-item">
                      <span className="detail-label">Código de proveedor</span>
                      <span className="detail-value">{product.supplierCode}</span>
                    </div>
                  )}
                  
                  {product.cost && (
                    <div className="detail-item">
                      <span className="detail-label">Costo por unidad</span>
                      <span className="detail-value">${product.cost}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Características físicas */}
            {(product.dimensions || product.storageConditions) && (
              <div className="detail-section">
                <h3 className="section-title">
                  <i className="fas fa-ruler-combined"></i> Características físicas
                </h3>
                
                <div className="detail-grid">
                  {product.dimensions && (
                    <div className="detail-item">
                      <span className="detail-label">Dimensiones</span>
                      <span className="detail-value">{product.dimensions}</span>
                    </div>
                  )}
                  
                  {product.storageConditions && (
                    <div className="detail-item">
                      <span className="detail-label">Condiciones de almacenamiento</span>
                      <span className="detail-value">{product.storageConditions}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Etiquetas */}
            {product.tags && product.tags.length > 0 && (
              <div className="detail-section">
                <h3 className="section-title">
                  <i className="fas fa-tags"></i> Etiquetas
                </h3>
                
                <div className="tags-display">
                  {product.tags.map((tag, index) => (
                    <span key={index} className="tag-display">{tag}</span>
                  ))}
                </div>
              </div>
            )}
            
            {/* Notas */}
            {product.notes && (
              <div className="detail-section">
                <h3 className="section-title">
                  <i className="fas fa-sticky-note"></i> Notas
                </h3>
                
                <div className="notes-content">
                  <p>{product.notes}</p>
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
        <button className="btn btn-primary" onClick={() => onEditProduct(product)}>
          <i className="fas fa-edit"></i> Editar producto
        </button>
      </div>
    </div>
  );
};

export default ProductDetailDialog;