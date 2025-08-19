import React, { useState, useEffect } from 'react';

const PurchaseDialog = ({
  purchase,
  isNew,
  onSave,
  onClose
}) => {
  // Estados del formulario
  const [formData, setFormData] = useState({
    purchaseNumber: '',
    supplier: '',
    purchaseDate: new Date().toISOString().split('T')[0],
    products: [],
    freight: '',
    taxes: '',
    notes: '',
    status: 'pending'
  });
  
  const [newProduct, setNewProduct] = useState({
    name: '',
    code: '',
    category: 'insumo',
    manufacturer: '',
    activeIngredient: '',
    unitSize: '',
    unitSizeUnit: 'L',
    storageType: 'bolsas',
    unit: 'kg',
    quantity: '',
    unitCost: '',
    lotNumber: '',
    storageConditions: '',
    dimensions: '',
    expiryDate: '',
    supplierCode: '',
    supplierName: '',
    supplierContact: '',
    notes: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Cargar datos si es edición
  useEffect(() => {
    if (!isNew && purchase) {
      const purchaseDate = purchase.purchaseDate
        ? new Date(purchase.purchaseDate.seconds ? purchase.purchaseDate.seconds * 1000 : purchase.purchaseDate)
        : new Date();
      
      setFormData({
        purchaseNumber: purchase.purchaseNumber || '',
        supplier: purchase.supplier || '',
        purchaseDate: purchaseDate.toISOString().split('T')[0],
        products: purchase.products || [],
        freight: purchase.freight ? String(purchase.freight) : '',
        taxes: purchase.taxes ? String(purchase.taxes) : '',
        notes: purchase.notes || '',
        status: purchase.status || 'pending'
      });
    }
  }, [purchase, isNew]);

  // Manejar cambios en el formulario
  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? value : value
    }));
  };

  // Manejar cambios en el nuevo producto
  const handleProductChange = (e) => {
    const { name, value, type } = e.target;
    setNewProduct(prev => ({
      ...prev,
      [name]: type === 'number' ? value : value
    }));
  };

  // Agregar producto a la lista
  const handleAddProduct = () => {
    if (!newProduct.name.trim()) {
      setError('El nombre del producto es obligatorio');
      return;
    }
    
    const quantity = parseFloat(newProduct.quantity) || 0;
    const unitCost = parseFloat(newProduct.unitCost) || 0;
    
    if (quantity <= 0) {
      setError('La cantidad debe ser mayor a 0');
      return;
    }
    
    if (unitCost <= 0) {
      setError('El costo unitario debe ser mayor a 0');
      return;
    }

    const productToAdd = {
      ...newProduct,
      id: Date.now().toString(),
      quantity: quantity,
      unitCost: unitCost,
      totalCost: quantity * unitCost
    };

    setFormData(prev => ({
      ...prev,
      products: [...prev.products, productToAdd]
    }));

    // Resetear formulario de producto
    setNewProduct({
      name: '',
      code: '',
      category: 'insumo',
      manufacturer: '',
      activeIngredient: '',
      unitSize: '',
      unitSizeUnit: 'L',
      storageType: 'bolsas',
      unit: 'kg',
      quantity: '',
      unitCost: '',
      lotNumber: '',
      storageConditions: '',
      dimensions: '',
      expiryDate: '',
      supplierCode: '',
      supplierName: '',
      supplierContact: '',
      notes: ''
    });
    
    setError('');
  };

  // Eliminar producto de la lista
  const handleRemoveProduct = (index) => {
    setFormData(prev => ({
      ...prev,
      products: prev.products.filter((_, i) => i !== index)
    }));
  };

  // Calcular totales
  const calculateTotals = () => {
    const subtotal = formData.products.reduce((sum, product) => 
      sum + (product.quantity * product.unitCost), 0
    );
    const freight = parseFloat(formData.freight) || 0;
    const taxes = parseFloat(formData.taxes) || 0;
    const total = subtotal + freight + taxes;
    
    return { subtotal, total };
  };

  // Formatear moneda
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(amount);
  };

  // Manejar envío del formulario
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    // Validaciones
    if (!formData.supplier.trim()) {
      setError('El proveedor es obligatorio');
      return;
    }
    
    if (formData.products.length === 0) {
      setError('Debe agregar al menos un producto');
      return;
    }
    
    if (!formData.purchaseDate) {
      setError('La fecha de compra es obligatoria');
      return;
    }

    try {
      setLoading(true);
      
      const purchaseData = {
        ...formData,
        purchaseDate: new Date(formData.purchaseDate),
        freight: parseFloat(formData.freight) || 0,
        taxes: parseFloat(formData.taxes) || 0
      };
      
      await onSave(purchaseData);
    } catch (err) {
      setError('Error al guardar la compra: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const { subtotal, total } = calculateTotals();

  return (
    <div className="dialog-content large">
      <div className="dialog-header">
        <div className="dialog-title-container">
          <h2 className="dialog-title">
            <i className="fas fa-shopping-cart"></i>
            {isNew ? 'Nueva Compra' : 'Editar Compra'}
          </h2>
        </div>
        <button className="dialog-close" onClick={onClose}>
          <i className="fas fa-times"></i>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="dialog-body">
        {error && (
          <div className="alert alert-error">
            <i className="fas fa-exclamation-circle"></i>
            <span>{error}</span>
          </div>
        )}

        {/* Información básica */}
        <div className="form-section">
          <h3 className="section-title">
            <i className="fas fa-info-circle"></i>
            Información de la Compra
          </h3>
          
          <div className="form-row">
            <div className="form-col">
              <label htmlFor="purchaseNumber" className="form-label">
                Número de Compra
              </label>
              <input
                type="text"
                id="purchaseNumber"
                name="purchaseNumber"
                className="form-control"
                value={formData.purchaseNumber}
                onChange={handleChange}
                placeholder="Se generará automáticamente"
                disabled={loading}
              />
            </div>
            
            <div className="form-col">
              <label htmlFor="purchaseDate" className="form-label required">
                Fecha de Compra
              </label>
              <input
                type="date"
                id="purchaseDate"
                name="purchaseDate"
                className="form-control"
                value={formData.purchaseDate}
                onChange={handleChange}
                disabled={loading}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="supplier" className="form-label required">
              Proveedor
            </label>
            <input
              type="text"
              id="supplier"
              name="supplier"
              className="form-control"
              value={formData.supplier}
              onChange={handleChange}
              placeholder="Nombre del proveedor"
              disabled={loading}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="status" className="form-label">
              Estado
            </label>
            <select
              id="status"
              name="status"
              className="form-control"
              value={formData.status}
              onChange={handleChange}
              disabled={loading}
            >
              <option value="pending">Pendiente</option>
              <option value="approved">Aprobada</option>
              <option value="cancelled">Cancelada</option>
            </select>
          </div>
        </div>

        {/* Productos */}
        <div className="form-section">
          <h3 className="section-title">
            <i className="fas fa-boxes"></i>
            Productos
          </h3>
          
          {/* Formulario para agregar producto */}
          <div className="product-form">
            <h4 style={{marginBottom: 'var(--spacing-md)', color: 'var(--primary)', fontSize: 'var(--font-size-md)'}}>
              <i className="fas fa-plus-circle"></i> Agregar Producto
            </h4>
            
            <div className="form-row">
              <div className="form-col">
                <label htmlFor="productName" className="form-label required">
                  Nombre del Producto
                </label>
                <input
                  type="text"
                  id="productName"
                  name="name"
                  className="form-control"
                  value={newProduct.name}
                  onChange={handleProductChange}
                  placeholder="Nombre del producto"
                  disabled={loading}
                />
              </div>
              
              <div className="form-col">
                <label htmlFor="productCategory" className="form-label">
                  Categoría
                </label>
                <select
                  id="productCategory"
                  name="category"
                  className="form-control"
                  value={newProduct.category}
                  onChange={handleProductChange}
                  disabled={loading}
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
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-col">
                <label htmlFor="productUnit" className="form-label">
                  Unidad
                </label>
                <select
                  id="productUnit"
                  name="unit"
                  className="form-control"
                  value={newProduct.unit}
                  onChange={handleProductChange}
                  disabled={loading}
                >
                  <option value="kg">Kilogramos</option>
                  <option value="L">Litros</option>
                  <option value="unidad">Unidades</option>
                  <option value="ton">Toneladas</option>
                  <option value="bolsa">Bolsas</option>
                  <option value="ml">Mililitros</option>
                  <option value="g">Gramos</option>
                  <option value="ha">Hectáreas</option>
                  <option value="dosis">Dosis</option>
                  <option value="aplicaciones">Aplicaciones</option>
                  <option value="paquete">Paquetes</option>
                  <option value="caja">Cajas</option>
                  <option value="galon">Galones</option>
                  <option value="m">Metros</option>
                  <option value="m2">Metros cuadrados</option>
                  <option value="m3">Metros cúbicos</option>
                </select>
              </div>

              <div className="form-col">
                <label htmlFor="productCode" className="form-label">
                  Código
                </label>
                <input
                  type="text"
                  id="productCode"
                  name="code"
                  className="form-control"
                  value={newProduct.code}
                  onChange={handleProductChange}
                  placeholder="Código del producto"
                  disabled={loading}
                />
              </div>
              
              <div className="form-col">
                <label htmlFor="productQuantity" className="form-label required">
                  Cantidad
                </label>
                <input
                  type="number"
                  id="productQuantity"
                  name="quantity"
                  className="form-control"
                  value={newProduct.quantity}
                  onChange={handleProductChange}
                  min="0"
                  step="0.01"
                  placeholder="0"
                  disabled={loading}
                />
              </div>
              
              <div className="form-col">
                <label htmlFor="productUnitCost" className="form-label required">
                  Costo Unitario ($)
                </label>
                <input
                  type="number"
                  id="productUnitCost"
                  name="unitCost"
                  className="form-control"
                  value={newProduct.unitCost}
                  onChange={handleProductChange}
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-col">
                <label htmlFor="productManufacturer" className="form-label">
                  Fabricante
                </label>
                <input
                  type="text"
                  id="productManufacturer"
                  name="manufacturer"
                  className="form-control"
                  value={newProduct.manufacturer}
                  onChange={handleProductChange}
                  placeholder="Fabricante del producto"
                  disabled={loading}
                />
              </div>
              
              <div className="form-col">
                <label htmlFor="productActiveIngredient" className="form-label">
                  Principio Activo
                </label>
                <input
                  type="text"
                  id="productActiveIngredient"
                  name="activeIngredient"
                  className="form-control"
                  value={newProduct.activeIngredient}
                  onChange={handleProductChange}
                  placeholder="Principio activo (opcional)"
                  disabled={loading}
                />
              </div>
              
              <div className="form-col">
                <label htmlFor="productUnitSize" className="form-label">
                  Tamaño de Unidad
                </label>
                <input
                  type="number"
                  id="productUnitSize"
                  name="unitSize"
                  className="form-control"
                  value={newProduct.unitSize}
                  onChange={handleProductChange}
                  placeholder="Ej: 1, 2.5, 20"
                  disabled={loading}
                  step="0.1"
                  min="0"
                />
              </div>
              
              <div className="form-col">
                <label htmlFor="productUnitSizeUnit" className="form-label">
                  Unidad de Tamaño
                </label>
                <select
                  id="productUnitSizeUnit"
                  name="unitSizeUnit"
                  className="form-control"
                  value={newProduct.unitSizeUnit}
                  onChange={handleProductChange}
                  disabled={loading}
                >
                  <option value="L">Litros</option>
                  <option value="kg">Kilogramos</option>
                  <option value="g">Gramos</option>
                  <option value="ml">Mililitros</option>
                  <option value="unidad">Unidades</option>
                  <option value="ton">Toneladas</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-col">
                <label htmlFor="productLotNumber" className="form-label">
                  Número de Lote
                </label>
                <input
                  type="text"
                  id="productLotNumber"
                  name="lotNumber"
                  className="form-control"
                  value={newProduct.lotNumber}
                  onChange={handleProductChange}
                  placeholder="Número de lote"
                  disabled={loading}
                />
              </div>
              
              <div className="form-col">
                <label htmlFor="productExpiryDate" className="form-label">
                  Fecha de Vencimiento
                </label>
                <input
                  type="date"
                  id="productExpiryDate"
                  name="expiryDate"
                  className="form-control"
                  value={newProduct.expiryDate}
                  onChange={handleProductChange}
                  disabled={loading}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-col" style={{justifyContent: 'flex-end'}}>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleAddProduct}
                  disabled={loading}
                  style={{ width: 'auto', padding: '12px 24px' }}
                >
                  <i className="fas fa-plus"></i> Agregar Producto
                </button>
              </div>
            </div>
          </div>

          {/* Lista de productos */}
          {formData.products.length > 0 ? (
            <div className="products-list">
              <table className="table">
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Categoría</th>
                    <th>Cantidad</th>
                    <th>Costo Unit.</th>
                    <th>Total</th>
                    <th style={{width: '100px', textAlign: 'center'}}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {formData.products.map((product, index) => (
                    <tr key={index}>
                      <td>
                        <div className="product-info">
                          <div className="product-name">{product.name}</div>
                        </div>
                      </td>
                      <td>
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
                      <td>{product.quantity} {product.unit}</td>
                      <td>{formatCurrency(product.unitCost)}</td>
                      <td style={{fontWeight: 'var(--font-weight-semibold)'}}>
                        {formatCurrency(product.quantity * product.unitCost)}
                      </td>
                      <td style={{textAlign: 'center'}}>
                        <button
                          type="button"
                          className="btn btn-sm"
                          onClick={() => handleRemoveProduct(index)}
                          disabled={loading}
                          style={{
                            background: 'var(--danger)',
                            color: 'white',
                            border: 'none',
                            borderRadius: 'var(--border-radius-circle)',
                            width: '32px',
                            height: '32px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                          title="Eliminar producto"
                        >
                          <i className="fas fa-trash"></i>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-products">
              <i className="fas fa-box-open"></i>
              <h4 className="empty-title">No hay productos agregados</h4>
              <p className="empty-description">
                Agrega productos a esta compra usando el formulario anterior
              </p>
            </div>
          )}
        </div>

        {/* Costos adicionales */}
        <div className="form-section">
          <h3 className="section-title">
            <i className="fas fa-calculator"></i>
            Costos Adicionales
          </h3>
          
          <div className="form-row">
            <div className="form-col">
              <label htmlFor="freight" className="form-label">
                Flete ($)
              </label>
              <input
                type="number"
                id="freight"
                name="freight"
                className="form-control"
                value={formData.freight}
                onChange={handleChange}
                min="0"
                step="0.01"
                placeholder="0.00"
                disabled={loading}
              />
            </div>
            
            <div className="form-col">
              <label htmlFor="taxes" className="form-label">
                Impuestos ($)
              </label>
              <input
                type="number"
                id="taxes"
                name="taxes"
                className="form-control"
                value={formData.taxes}
                onChange={handleChange}
                min="0"
                step="0.01"
                placeholder="0.00"
                disabled={loading}
              />
            </div>
          </div>
        </div>

        {/* Resumen de totales */}
        {formData.products.length > 0 && (
          <div className="form-section">
            <h3 className="section-title">
              <i className="fas fa-receipt"></i>
              Resumen de Compra
            </h3>
            
            <div className="totals-summary">
              <div className="total-row">
                <span>Subtotal productos:</span>
                <span style={{fontWeight: 'var(--font-weight-semibold)'}}>
                  {formatCurrency(subtotal)}
                </span>
              </div>
              <div className="total-row">
                <span>Flete:</span>
                <span>{formatCurrency(parseFloat(formData.freight) || 0)}</span>
              </div>
              <div className="total-row">
                <span>Impuestos:</span>
                <span>{formatCurrency(parseFloat(formData.taxes) || 0)}</span>
              </div>
              <div className="total-row total-final">
                <span>Total:</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Notas */}
        <div className="form-section">
          <h3 className="section-title">
            <i className="fas fa-sticky-note"></i>
            Notas Adicionales
          </h3>
          
          <div className="form-group">
            <label htmlFor="notes" className="form-label">
              Notas
            </label>
            <textarea
              id="notes"
              name="notes"
              className="form-control"
              value={formData.notes}
              onChange={handleChange}
              rows="4"
              placeholder="Notas adicionales sobre la compra, condiciones especiales, etc."
              disabled={loading}
            />
          </div>
        </div>

        <div className="dialog-footer">
          <div className="footer-left">
            <button 
              type="button" 
              className="btn btn-outline" 
              onClick={onClose}
              disabled={loading}
            >
              <i className="fas fa-times"></i>
              Cancelar
            </button>
          </div>
          
          <button
            type="submit"
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={loading || formData.products.length === 0}
          >
            {loading ? (
              <>
                <span className="spinner-border-sm"></span>
                {isNew ? 'Creando...' : 'Guardando...'}
              </>
            ) : (
              <>
                <i className="fas fa-save"></i>
                {isNew ? 'Crear Compra' : 'Guardar Cambios'}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default PurchaseDialog;