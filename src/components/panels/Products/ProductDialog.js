import React, { useState, useEffect, useCallback } from 'react';

const ProductDialog = ({ product, fields, warehouses, isNew, onSave, onClose }) => {
  // Estado inicial para el formulario
  
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    category: 'insumo',
    manufacturer: '',
    activeIngredient: '',
    unitSize: '',
    unitSizeUnit: 'L',
    storageType: 'bolsas',
    unit: 'kg',
    stock: '', 
    minStock: '', 
    lotNumber: '',
    storageConditions: '',
    dimensions: '',
    expiryDate: '',
    supplierCode: '',
    cost: '',
    supplierName: '',
    supplierContact: '',
    tags: [],
    notes: '',
    // Ubicación
    fieldId: '',
    warehouseId: '',
    lotId: '',
    storageLevel: 'field' // 'field', 'warehouse', 'lot'
  });

  // Estados adicionales
  const [availableWarehouses, setAvailableWarehouses] = useState([]);
  const [availableLots, setAvailableLots] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Cargar datos del producto si estamos editando
  useEffect(() => {
    if (product && !isNew) {
      setFormData({
        name: product.name || '',
        code: product.code || '',
        category: product.category || 'insumo',
        manufacturer: product.manufacturer || '',
        activeIngredient: product.activeIngredient || '',
        unitSize: product.unitSize || '',
        unitSizeUnit: product.unitSizeUnit || 'L',
        storageType: product.storageType || 'bolsas',
        storageType: product.storageType || 'bolsas',
        unit: product.unit || 'kg',
        stock: product.stock !== null && product.stock !== undefined ? String(product.stock) : '',
        minStock: product.minStock !== null && product.minStock !== undefined ? String(product.minStock) : '',
        lotNumber: product.lotNumber || '',
        storageConditions: product.storageConditions || '',
        dimensions: product.dimensions || '',
        expiryDate: formatDateForInput(product.expiryDate),
        supplierCode: product.supplierCode || '',
        cost: product.cost !== null && product.cost !== undefined ? String(product.cost) : '',
        supplierName: product.supplierName || '',
        supplierContact: product.supplierContact || '',
        tags: product.tags || [],
        notes: product.notes || '',
        fieldId: product.fieldId || '',
        warehouseId: product.warehouseId || '',
        lotId: product.lotId || '',
        storageLevel: product.storageLevel || 'field'
      });
      
      
      // Cargar almacenes y lotes según el campo seleccionado
      if (product.fieldId) {
        updateWarehouses(product.fieldId);
      }
    }
  }, [product, isNew, fields, warehouses]);

  // Formatear fecha para input de tipo date
  const formatDateForInput = (date) => {
  
    if (!date || date === null || date === 'null' || date === '' || date === undefined) {
      return '';
    }
    
    try {
      let d;
      
      // Si es un timestamp de Firebase
      if (date && typeof date === 'object' && date.seconds) {
        d = new Date(date.seconds * 1000);
      }
      // Si es una fecha válida
      else if (date instanceof Date) {
        d = date;
      }
      // Si es un string de fecha válido
      else if (typeof date === 'string' && date.trim() !== '') {
        d = new Date(date);
      }
      // Cualquier otro caso
      else {
        return '';
      }
      
      // Verificar que la fecha sea válida
      if (isNaN(d.getTime())) {
        return '';
      }
      
      return d.toISOString().split('T')[0];
    } catch (error) {
      console.warn('Error al formatear fecha:', error);
      return '';
    }
  };

  // Actualizar almacenes disponibles según el campo
  const updateWarehouses = (fieldId) => {
    if (!fieldId) {
      setAvailableWarehouses([]);
      setAvailableLots([]);
      return;
    }
    
    // Filtrar almacenes del campo seleccionado
    const fieldWarehouses = warehouses.filter(w => w.fieldId === fieldId);
    setAvailableWarehouses(fieldWarehouses);
    
    // Obtener lotes del campo
    const field = fields.find(f => f.id === fieldId);
    if (field && field.lots) {
      setAvailableLots(field.lots);
    } else {
      setAvailableLots([]);
    }
  };

  const isFitosanitaryProduct = useCallback((category) => {
    const fitosanitaryCategories = [
      'insecticida',
      'fungicida', 
      'herbicida',
      'curasemilla_quimico',
      'curasemilla_biologico',
      'pesticida'
    ];
    return fitosanitaryCategories.includes(category);
  }, []);

  // Manejar cambios en el formulario
  const handleChange = (e) => {
    const { name, value } = e.target;
    
    console.log(`Campo ${name} cambió a:`, value); // Debug
    
    // Limpiar errores al modificar el campo
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
    
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Si cambia el campo, actualizar almacenes disponibles
    if (name === 'fieldId') {
      updateWarehouses(value);
      // Limpiar selecciones dependientes
      setFormData(prev => ({
        ...prev,
        fieldId: value,
        warehouseId: '',
        lotId: ''
      }));
    }
  };

  // Manejar cambio en nivel de almacenamiento
  const handleStorageLevelChange = (e) => {
    const level = e.target.value;
    setFormData(prev => ({
      ...prev,
      storageLevel: level,
      // Limpiar selecciones según el nivel
      warehouseId: level === 'field' ? '' : prev.warehouseId,
      lotId: level !== 'lot' ? '' : prev.lotId
    }));
  };

  // Manejar adición de etiqueta
  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }));
      setTagInput('');
    }
  };

  // Manejar eliminación de etiqueta
  const handleRemoveTag = (index) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter((_, i) => i !== index)
    }));
  };

  // Manejar entrada de tecla en input de etiqueta
  const handleTagKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  // Validar formulario antes de guardar
  const validateForm = () => {
    const newErrors = {};
    
    // Validar campos obligatorios
    if (!formData.name.trim()) {
      newErrors.name = 'El nombre es obligatorio';
    }
    
    if (!formData.category) {
      newErrors.category = 'La categoría es obligatoria';
    }
    
    // Validar que stock sea un número si no está vacío
    if (formData.stock && (isNaN(Number(formData.stock)) || Number(formData.stock) < 0)) {
      newErrors.stock = 'El stock debe ser un número positivo';
    }
    
    // Validar que minStock sea un número si no está vacío
    if (formData.minStock && (isNaN(Number(formData.minStock)) || Number(formData.minStock) < 0)) {
      newErrors.minStock = 'El stock mínimo debe ser un número positivo';
    }

    // Validar tamaño de unidad si está presente
    if (formData.unitSize && (isNaN(Number(formData.unitSize)) || Number(formData.unitSize) <= 0)) {
      newErrors.unitSize = 'El tamaño debe ser un número positivo';
    }
    
    // Validar que cost sea un número si no está vacío
    if (formData.cost && (isNaN(Number(formData.cost)) || Number(formData.cost) < 0)) {
      newErrors.cost = 'El costo debe ser un número positivo';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Manejar envío del formulario
  const handleSubmit = (e) => {
    e.preventDefault();
    
    console.log('handleSubmit - Datos del formulario:', formData); // Debug
    
    if (validateForm()) {
      setSubmitting(true);
      
      // Preparar datos para guardar - CONVERSIÓN MEJORADA
      const productData = {
        ...formData,
        // Asegurar conversión correcta de números
        stock: formData.stock !== '' ? Number(formData.stock) : 0,
        minStock: formData.minStock !== '' ? Number(formData.minStock) : 0,
        cost: formData.cost !== '' ? Number(formData.cost) : null,
      };
      
      
      // Convertir fecha de vencimiento
      if (productData.expiryDate) {
        productData.expiryDate = new Date(productData.expiryDate);
      }
      
      onSave(productData)
        .then(() => {
          console.log('Producto guardado exitosamente'); // Debug
        })
        .catch(error => {
          console.error("Error al guardar producto:", error);
        })
        .finally(() => {
          setSubmitting(false);
        });
    }
  };

  return (
    <div className="dialog product-dialog">
      <div className="dialog-header">
        <h2 className="dialog-title">
          {isNew ? 'Añadir nuevo producto' : 'Editar producto'}
        </h2>
        <button className="dialog-close" onClick={onClose}>
          <i className="fas fa-times"></i>
        </button>
      </div>
      
      <div className="dialog-body">
        <form onSubmit={handleSubmit}>
          <div className="form-sections">
            {/* Información básica */}
            <div className="form-section">
              <h3 className="section-title">Información básica</h3>
              
              <div className="form-grid">
                {/* Nombre */}
                <div className="form-group">
                  <label htmlFor="name" className="form-label required">Nombre</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    className={`form-control ${errors.name ? 'is-invalid' : ''}`}
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Nombre del producto"
                    disabled={submitting}
                  />
                  {errors.name && <div className="invalid-feedback">{errors.name}</div>}
                </div>
                
                {/* Código identificador */}
                <div className="form-group">
                  <label htmlFor="code" className="form-label">Código identificador</label>
                  <input
                    type="text"
                    id="code"
                    name="code"
                    className="form-control"
                    value={formData.code}
                    onChange={handleChange}
                    placeholder="Código único del producto"
                    disabled={submitting}
                  />
                </div>

                {/* 🆕 FABRICANTE */}
                <div className="form-group">
                  <label htmlFor="manufacturer" className="form-label">Fabricante</label>
                  <input
                    type="text"
                    id="manufacturer"
                    name="manufacturer"
                    className="form-control"
                    value={formData.manufacturer}
                    onChange={handleChange}
                    placeholder="Nombre del fabricante"
                    disabled={submitting}
                    maxLength={100}
                  />
                </div>
                
                {/* Categoría */}
                <div className="form-group">
                  <label htmlFor="category" className="form-label required">Categoría</label>
                  <select
                    id="category"
                    name="category"
                    className={`form-control ${errors.category ? 'is-invalid' : ''}`}
                    value={formData.category}
                    onChange={handleChange}
                    style={{ height: 'auto', minHeight: '40px', paddingTop: '8px', paddingBottom: '8px' }}
                    disabled={submitting}
                  >
                    <option value="insumo">Insumo</option>
                    <option value="herramienta">Herramienta</option>
                    <option value="semilla">Semilla</option>
                    <option value="fertilizante">Fertilizante</option>
                    <option value="fertilizante_foliar">Fertilizante Foliar</option>
                    <option value="curasemilla_quimico">Curasemilla Químico</option>
                    <option value="curasemilla_biologico">Curasemilla Biológico</option>
                    <option value="inoculante">Inoculante</option>
                    <option value="insecticida">Insecticida</option>
                    <option value="fungicida">Fungicida</option>
                    <option value="herbicida">Herbicida</option>
                    <option value="lubricante">Lubricante</option>
                    <option value="combustible">Combustible</option>
                    <option value="coadyuvante">Coadyuvante</option>
                    <option value="bioestimulante">Bioestimulante</option>
                    <option value="pesticida">Pesticida</option>
                    <option value="maquinaria">Maquinaria</option>
                    <option value="otro">Otro</option>
                  </select>
                  {errors.category && <div className="invalid-feedback">{errors.category}</div>}
                </div>
                
                {/* 🆕 PRINCIPIO ACTIVO - Ahora siempre visible */}
                <div className="form-group">
                  <label htmlFor="activeIngredient" className="form-label">Principio Activo</label>
                  <input
                    type="text"
                    id="activeIngredient"
                    name="activeIngredient"
                    className="form-control"
                    value={formData.activeIngredient}
                    onChange={handleChange}
                    placeholder="Principio activo del producto (opcional)"
                    disabled={submitting}
                  />
                  <small className="form-text text-muted">
                    Campo opcional. Dejar vacío si no aplica.
                  </small>
                </div>

                {/* 🆕 TAMAÑO DE LA UNIDAD */}
                <div className="form-group">
                  <label className="form-label">Tamaño de la unidad</label>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <input
                      type="number"
                      name="unitSize"
                      className="form-control"
                      value={formData.unitSize}
                      onChange={handleChange}
                      placeholder="Ej: 5, 10, 25"
                      disabled={submitting}
                      style={{ flex: '1' }}
                      min="0"
                      step="0.01"
                    />
                    <select
                      name="unitSizeUnit"
                      className="form-control"
                      value={formData.unitSizeUnit}
                      onChange={handleChange}
                      disabled={submitting}
                      style={{ flex: '0 0 100px' }}
                    >
                      <option value="L">Litros</option>
                      <option value="kg">Kg</option>
                      <option value="g">Gramos</option>
                      <option value="ml">ml</option>
                      <option value="ton">Toneladas</option>
                    </select>
                  </div>
                  <small className="form-text text-muted">
                    Ej: 5 L para bidón de 5 litros, 25 kg para bolsa de 25 kg
                  </small>
                </div>
                
                {/* Forma de almacenamiento */}
                <div className="form-group">
                  <label htmlFor="storageType" className="form-label">Forma de almacenamiento</label>
                  <select
                    id="storageType"
                    name="storageType"
                    className="form-control"
                    value={formData.storageType}
                    onChange={handleChange}
                    style={{ height: 'auto', minHeight: '40px', paddingTop: '8px', paddingBottom: '8px' }}
                    disabled={submitting}
                  >
                    <option value="bolsas">Bolsas</option>
                    <option value="bidones">Bidones</option>
                    <option value="botellas">Botellas</option>
                    <option value="big-bag">Big-bag</option>
                    <option value="tambores">Tambores</option>
                    <option value="bag_in_box">Bag in box</option>
                    <option value="dosis">Dosis</option>
                    <option value="packs">Packs</option>
                    <option value="sobres">Sobres</option>
                    <option value="suelto">Suelto</option>
                    <option value="unidad">Por unidad</option>
                    <option value="sacos">Sacos</option>
                    <option value="contenedores">Contenedores</option>
                    <option value="cajas">Cajas</option>
                  </select>
                </div>
                
                {/* Unidad */}
                <div className="form-group">
                  <label htmlFor="unit" className="form-label">Unidad</label>
                  <select
                    id="unit"
                    name="unit"
                    className="form-control"
                    value={formData.unit}
                    onChange={handleChange}
                    style={{ height: 'auto', minHeight: '40px', paddingTop: '8px', paddingBottom: '8px' }}
                    disabled={submitting}
                  >
                    <option value="kg">Kilogramos</option>
                    <option value="L">Litros</option>
                    <option value="unidad">Unidades</option>
                    <option value="ton">Toneladas</option>
                    <option value="m">Metros</option>
                    <option value="m²">Metros cuadrados</option>
                    <option value="m³">Metros cúbicos</option>
                  </select>
                </div>
                
                {/* Número de lote */}
                <div className="form-group">
                  <label htmlFor="lotNumber" className="form-label">Número de lote</label>
                  <input
                    type="text"
                    id="lotNumber"
                    name="lotNumber"
                    className="form-control"
                    value={formData.lotNumber || ''}
                    onChange={handleChange}
                    placeholder="Número de lote del producto"
                    disabled={submitting}
                  />
                </div>
              </div>
            </div>
            
            {/* Stock */}
            <div className="form-section">
              <h3 className="section-title">Control de stock</h3>
              
              <div className="form-grid">
                {/* Stock actual */}
                <div className="form-group">
                  <label htmlFor="stock" className="form-label">Stock actual</label>
                  <input
                    type="number"
                    id="stock"
                    name="stock"
                    className={`form-control ${errors.stock ? 'is-invalid' : ''}`}
                    value={formData.stock || ''} 
                    onChange={handleChange}
                    placeholder="Cantidad actual en stock"
                    min="0"
                    step="0.01"
                    disabled={submitting}
                  />
                  {errors.stock && <div className="invalid-feedback">{errors.stock}</div>}
                </div>
                
                {/* Stock mínimo */}
                <div className="form-group">
                  <label htmlFor="minStock" className="form-label">Stock mínimo</label>
                  <input
                    type="number"
                    id="minStock"
                    name="minStock"
                    className={`form-control ${errors.minStock ? 'is-invalid' : ''}`}
                    value={formData.minStock || ''}
                    onChange={handleChange}
                    placeholder="Cantidad mínima para alerta"
                    min="0"
                    step="0.01"
                    disabled={submitting}
                  />
                  {errors.minStock && <div className="invalid-feedback">{errors.minStock}</div>}
                </div>
                
                {/* Fecha de vencimiento */}
                <div className="form-group">
                  <label htmlFor="expiryDate" className="form-label">Fecha de vencimiento</label>
                  <input
                    type="date"
                    id="expiryDate"
                    name="expiryDate"
                    className="form-control"
                    value={formData.expiryDate || ''}
                    onChange={handleChange}
                    disabled={submitting}
                  />
                </div>
              </div>
            </div>
            
            {/* Ubicación */}
            <div className="form-section">
              <h3 className="section-title">Ubicación de almacenamiento</h3>
              
              {/* Campo */}
              <div className="form-group">
                <label htmlFor="fieldId" className="form-label">Campo</label>
                <select
                  id="fieldId"
                  name="fieldId"
                  className="form-control"
                  value={formData.fieldId}
                  onChange={handleChange}
                  style={{ height: 'auto', minHeight: '40px', paddingTop: '8px', paddingBottom: '8px' }}
                  disabled={submitting}
                >
                  <option value="">Seleccionar campo</option>
                  {fields.map((field) => (
                    <option key={field.id} value={field.id}>
                      {field.name}
                    </option>
                  ))}
                </select>
              </div>
              
              {formData.fieldId && (
                <>
                  {/* Nivel de almacenamiento */}
                  <div className="form-group">
                    <label className="form-label">Nivel de almacenamiento</label>
                    <div className="radio-group">
                      <div className="form-check">
                        <input
                          type="radio"
                          className="form-check-input"
                          id="storageField"
                          name="storageLevel"
                          value="field"
                          checked={formData.storageLevel === 'field'}
                          onChange={handleStorageLevelChange}
                          disabled={submitting}
                        />
                        <label className="form-check-label" htmlFor="storageField">
                          Campo completo
                        </label>
                      </div>
                      
                      <div className="form-check">
                        <input
                          type="radio"
                          className="form-check-input"
                          id="storageWarehouse"
                          name="storageLevel"
                          value="warehouse"
                          checked={formData.storageLevel === 'warehouse'}
                          onChange={handleStorageLevelChange}
                          disabled={submitting}
                        />
                        <label className="form-check-label" htmlFor="storageWarehouse">
                          Almacén específico
                        </label>
                      </div>
                      
                      <div className="form-check">
                        <input
                          type="radio"
                          className="form-check-input"
                          id="storageLot"
                          name="storageLevel"
                          value="lot"
                          checked={formData.storageLevel === 'lot'}
                          onChange={handleStorageLevelChange}
                          disabled={submitting}
                        />
                        <label className="form-check-label" htmlFor="storageLot">
                          Lote específico
                        </label>
                      </div>
                    </div>
                  </div>
                  
                  {/* Almacén específico */}
                  {formData.storageLevel === 'warehouse' && (
                    <div className="form-group">
                      <label htmlFor="warehouseId" className="form-label">Almacén</label>
                      <select
                        id="warehouseId"
                        name="warehouseId"
                        className="form-control"
                        value={formData.warehouseId}
                        onChange={handleChange}
                        style={{ height: 'auto', minHeight: '40px', paddingTop: '8px', paddingBottom: '8px' }}
                        disabled={submitting}
                      >
                        <option value="">Seleccionar almacén</option>
                        {availableWarehouses.map((warehouse) => (
                          <option key={warehouse.id} value={warehouse.id}>
                            {warehouse.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  
                  {/* Lote específico */}
                  {formData.storageLevel === 'lot' && (
                    <div className="form-group">
                      <label htmlFor="lotId" className="form-label">Lote</label>
                      <select
                        id="lotId"
                        name="lotId"
                        className="form-control"
                        value={formData.lotId}
                        onChange={handleChange}
                        style={{ height: 'auto', minHeight: '40px', paddingTop: '8px', paddingBottom: '8px' }}
                        disabled={submitting}
                      >
                        <option value="">Seleccionar lote</option>
                        {availableLots.map((lot) => (
                          <option key={lot.id} value={lot.id}>
                            {lot.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </>
              )}
            </div>
            
            {/* Información adicional */}
            <div className="form-section">
              <h3 className="section-title">Información adicional</h3>
              
              <div className="form-grid">
                {/* Condiciones de almacenamiento */}
                <div className="form-group">
                  <label htmlFor="storageConditions" className="form-label">Condiciones de almacenamiento</label>
                  <input
                    type="text"
                    id="storageConditions"
                    name="storageConditions"
                    className="form-control"
                    value={formData.storageConditions || ''} 
                    onChange={handleChange}
                    placeholder="Ej: Lugar seco y fresco"
                    disabled={submitting}
                  />
                </div>
                
                {/* Dimensiones */}
                <div className="form-group">
                  <label htmlFor="dimensions" className="form-label">Dimensiones</label>
                  <input
                    type="text"
                    id="dimensions"
                    name="dimensions"
                    className="form-control"
                    value={formData.dimensions || ''}
                    onChange={handleChange}
                    placeholder="Ej: 50x30x20 cm"
                    disabled={submitting}
                  />
                </div>
                
                {/* Código de proveedor */}
                <div className="form-group">
                  <label htmlFor="supplierCode" className="form-label">Código de proveedor</label>
                  <input
                    type="text"
                    id="supplierCode"
                    name="supplierCode"
                    className="form-control"
                    value={formData.supplierCode || ''} 
                    onChange={handleChange}
                    placeholder="Código del proveedor"
                    disabled={submitting}
                  />
                </div>
                
                {/* Costo */}
                <div className="form-group">
                  <label htmlFor="cost" className="form-label">Costo por unidad</label>
                  <input
                    type="number"
                    id="cost"
                    name="cost"
                    className={`form-control ${errors.cost ? 'is-invalid' : ''}`}
                    value={formData.cost || ''}
                    onChange={handleChange}
                    placeholder="Precio de compra por unidad"
                    min="0"
                    step="0.01"
                    disabled={submitting}
                  />
                  {errors.cost && <div className="invalid-feedback">{errors.cost}</div>}
                </div>
              </div>
              
              {/* Información del proveedor */}
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="supplierName" className="form-label">Nombre del proveedor</label>
                  <input
                    type="text"
                    id="supplierName"
                    name="supplierName"
                    className="form-control"
                    value={formData.supplierName || ''}
                    onChange={handleChange}
                    placeholder="Nombre del proveedor"
                    disabled={submitting}
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="supplierContact" className="form-label">Contacto del proveedor</label>
                  <input
                    type="text"
                    id="supplierContact"
                    name="supplierContact"
                    className="form-control"
                    value={formData.supplierContact || ''}
                    onChange={handleChange}
                    placeholder="Teléfono o email del proveedor"
                    disabled={submitting}
                  />
                </div>
              </div>
              
              {/* Etiquetas */}
              <div className="form-group">
                <label htmlFor="tags" className="form-label">Etiquetas</label>
                
                <div className="tags-input-container">
                  <input
                    type="text"
                    id="tagInput"
                    className="form-control"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleTagKeyDown}
                    placeholder="Agregar etiqueta"
                    disabled={submitting}
                  />
                  <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    onClick={handleAddTag}
                    disabled={submitting}
                  >
                    <i className="fas fa-plus"></i>
                  </button>
                </div>
                
                {formData.tags && formData.tags.length > 0 ? (
                  <div className="tags-container">
                    {formData.tags.map((tag, index) => (
                      <div key={index} className="tag">
                        {tag}
                        <button
                          type="button"
                          className="tag-remove"
                          onClick={() => handleRemoveTag(index)}
                          disabled={submitting}
                        >
                          <i className="fas fa-times"></i>
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-tags-message">No hay etiquetas agregadas</div>
                )}
              </div>
              
              {/* Notas */}
              <div className="form-group">
                <label htmlFor="notes" className="form-label">Notas</label>
                <textarea
                  id="notes"
                  name="notes"
                  className="form-control"
                  value={formData.notes || ''}
                  onChange={handleChange}
                  placeholder="Notas adicionales sobre el producto"
                  rows={4}
                  disabled={submitting}
                />
              </div>
            </div>
          </div>
        </form>
      </div>
      
      <div className="dialog-footer">
        <button className="btn btn-outline" onClick={onClose} disabled={submitting}>
          Cancelar
        </button>
        <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
          {submitting ? (
            <>
              <span className="spinner-border spinner-border-sm mr-2"></span>
              {isNew ? 'Creando...' : 'Guardando...'}
            </>
          ) : (
            isNew ? 'Crear producto' : 'Guardar cambios'
          )}
        </button>
      </div>
    </div>
  );
};

export default ProductDialog;