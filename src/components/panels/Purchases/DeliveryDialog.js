import React, { useState, useEffect } from 'react';

const DeliveryDialog = ({
  purchase,
  warehouses,
  onSave,
  onClose
}) => {
  // Estados del formulario
  const [formData, setFormData] = useState({
    warehouseId: '',
    warehouseName: '',
    deliveryDate: new Date().toISOString().split('T')[0],
    products: [],
    freight: '',
    notes: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Función para convertir string a número de forma segura
  const parseNumberValue = (value) => {
    if (value === '' || value === null || value === undefined) {
      return 0;
    }
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : parsed;
  };

  // Inicializar productos disponibles para entrega
  useEffect(() => {
    if (purchase && purchase.products) {
      // Calcular cantidades ya entregadas por producto
      const deliveredQuantities = {};
      
      if (purchase.deliveries) {
        purchase.deliveries.forEach(delivery => {
          if (delivery.status === 'completed' || delivery.status === 'in_transit') {
            delivery.products.forEach(product => {
              const key = product.productId || product.id || product.name;
              deliveredQuantities[key] = (deliveredQuantities[key] || 0) + product.quantity;
            });
          }
        });
      }
      
      // Crear lista de productos con cantidades pendientes
      const availableProducts = purchase.products.map(product => {
        const key = product.id || product.name;
        const delivered = deliveredQuantities[key] || 0;
        const pending = product.quantity - delivered;
        
        return {
          ...product,
          productId: product.id || product.name,
          originalQuantity: product.quantity,
          deliveredQuantity: delivered,
          pendingQuantity: Math.max(0, pending),
          selectedQuantity: ''
        };
      }).filter(product => product.pendingQuantity > 0);
      
      setFormData(prev => ({
        ...prev,
        products: availableProducts
      }));
    }
  }, [purchase]);

  // Manejar cambios en el formulario
  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'warehouseId') {
      const selectedWarehouse = warehouses.find(w => w.id === value);
      setFormData(prev => ({
        ...prev,
        warehouseId: value,
        warehouseName: selectedWarehouse ? selectedWarehouse.name : ''
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  // Manejar cambios en cantidades de productos
  const handleProductQuantityChange = (index, quantity) => {
    const maxQuantity = formData.products[index].pendingQuantity;
    
    // Si está vacío, permitir string vacío
    if (quantity === '') {
      setFormData(prev => ({
        ...prev,
        products: prev.products.map((product, i) => 
          i === index 
            ? { ...product, selectedQuantity: '' }
            : product
        )
      }));
      return;
    }
    
    // Si no está vacío, parsearlo y limitar
    const numQuantity = parseNumberValue(quantity);
    const finalQuantity = Math.min(numQuantity, maxQuantity);
    
    setFormData(prev => ({
      ...prev,
      products: prev.products.map((product, i) => 
        i === index 
          ? { ...product, selectedQuantity: finalQuantity.toString() }
          : product
      )
    }));
  };

  // Seleccionar/deseleccionar todos los productos
  const handleSelectAll = (selectAll) => {
    setFormData(prev => ({
      ...prev,
      products: prev.products.map(product => ({
        ...product,
        selectedQuantity: selectAll ? product.pendingQuantity.toString() : ''
      }))
    }));
  };

  // Obtener productos seleccionados para la entrega
  const getSelectedProducts = () => {
    return formData.products
      .filter(product => {
        const quantity = parseNumberValue(product.selectedQuantity);
        return quantity > 0;
      })
      .map(product => ({
        productId: product.productId,
        name: product.name,
        category: product.category,
        unit: product.unit,
        quantity: parseNumberValue(product.selectedQuantity),
        unitCost: product.unitCost
      }));
  };

  // Calcular totales
  const calculateTotals = () => {
    const selectedProducts = getSelectedProducts();
    const totalProducts = selectedProducts.length;
    const totalQuantity = selectedProducts.reduce((sum, product) => sum + product.quantity, 0);
    const totalValue = selectedProducts.reduce((sum, product) => sum + (product.quantity * product.unitCost), 0);
    const freight = parseNumberValue(formData.freight);
    
    return { 
      totalProducts, 
      totalQuantity, 
      totalValue,
      totalWithFreight: totalValue + freight 
    };
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
    if (!formData.warehouseId) {
      setError('Debe seleccionar un almacén de destino');
      return;
    }
    
    if (!formData.deliveryDate) {
      setError('La fecha de entrega es obligatoria');
      return;
    }
    
    const selectedProducts = getSelectedProducts();
    if (selectedProducts.length === 0) {
      setError('Debe seleccionar al menos un producto para entregar');
      return;
    }

    try {
      setLoading(true);
      
      const deliveryData = {
        warehouseId: formData.warehouseId,
        warehouseName: formData.warehouseName,
        deliveryDate: new Date(formData.deliveryDate),
        products: selectedProducts,
        freight: parseNumberValue(formData.freight),
        notes: formData.notes
      };
      
      await onSave(deliveryData);
    } catch (err) {
      setError('Error al crear la entrega: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const totals = calculateTotals();

  return (
    <div className="dialog-content large">
      <div className="dialog-header">
        <div className="dialog-title-container">
          <h2 className="dialog-title">
            <i className="fas fa-truck"></i>
            Nueva Entrega
          </h2>
          <div style={{
            fontSize: 'var(--font-size-sm)',
            color: 'var(--text-secondary)',
            marginTop: 'var(--spacing-xs)'
          }}>
            {purchase.purchaseNumber || `Compra ${purchase.id.substring(0, 8)}`}
          </div>
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
            Información de la Entrega
          </h3>
          
          <div className="form-row">
            <div className="form-col">
              <label htmlFor="warehouseId" className="form-label required">
                Almacén de Destino
              </label>
              <select
                id="warehouseId"
                name="warehouseId"
                className="form-control"
                value={formData.warehouseId}
                onChange={handleChange}
                disabled={loading}
                required
              >
                <option value="">Seleccionar almacén...</option>
                {warehouses.map((warehouse) => (
                  <option key={warehouse.id} value={warehouse.id}>
                    {warehouse.name} {warehouse.location && `- ${warehouse.location}`}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="form-col">
              <label htmlFor="deliveryDate" className="form-label required">
                Fecha de Entrega
              </label>
              <input
                type="date"
                id="deliveryDate"
                name="deliveryDate"
                className="form-control"
                value={formData.deliveryDate}
                onChange={handleChange}
                disabled={loading}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="freight" className="form-label">
              Costo de Flete ($)
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
        </div>

        {/* Productos disponibles */}
        <div className="form-section">
          <div className="section-header">
            <h3 className="section-title">
              <i className="fas fa-boxes"></i>
              Productos a Entregar
            </h3>
            <div className="section-actions">
              <button
                type="button"
                className="btn btn-sm btn-outline"
                onClick={() => handleSelectAll(true)}
                disabled={loading}
              >
                <i className="fas fa-check-square"></i>
                Seleccionar todo
              </button>
              <button
                type="button"
                className="btn btn-sm btn-outline"
                onClick={() => handleSelectAll(false)}
                disabled={loading}
              >
                <i className="fas fa-square"></i>
                Deseleccionar todo
              </button>
            </div>
          </div>
          
          {formData.products.length > 0 ? (
            <div className="products-list">
              <table className="table">
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th style={{textAlign: 'center'}}>Comprado</th>
                    <th style={{textAlign: 'center'}}>Entregado</th>
                    <th style={{textAlign: 'center'}}>Pendiente</th>
                    <th style={{textAlign: 'center'}}>A Entregar</th>
                    <th style={{textAlign: 'center'}}>Costo Unit.</th>
                  </tr>
                </thead>
                <tbody>
                  {formData.products.map((product, index) => (
                    <tr key={index}>
                      <td>
                        <div className="product-info">
                          <div className="product-name">{product.name}</div>
                          <div className="product-category">
                            <span style={{
                              padding: '2px 6px',
                              backgroundColor: 'var(--primary-bg)',
                              color: 'var(--primary)',
                              borderRadius: 'var(--border-radius-pill)',
                              fontSize: '10px',
                              fontWeight: 'var(--font-weight-medium)'
                            }}>
                              {product.category}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td style={{textAlign: 'center'}}>
                        <strong>{product.originalQuantity}</strong>
                        <div style={{fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)'}}>
                          {product.unit}
                        </div>
                      </td>
                      <td style={{textAlign: 'center'}}>
                        <span style={{color: 'var(--success)'}}>
                          {product.deliveredQuantity}
                        </span>
                        <div style={{fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)'}}>
                          {product.unit}
                        </div>
                      </td>
                      <td style={{textAlign: 'center'}}>
                        <span className="pending-quantity" style={{
                          fontWeight: 'var(--font-weight-semibold)',
                          color: 'var(--warning)',
                          padding: '4px 8px',
                          backgroundColor: 'rgba(255, 152, 0, 0.1)',
                          borderRadius: 'var(--border-radius-sm)'
                        }}>
                          {product.pendingQuantity}
                        </span>
                        <div style={{fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)'}}>
                          {product.unit}
                        </div>
                      </td>
                      <td style={{textAlign: 'center'}}>
                        <input
                          type="number"
                          className="form-control"
                          value={product.selectedQuantity}
                          onChange={(e) => handleProductQuantityChange(index, e.target.value)}
                          min="0"
                          max={product.pendingQuantity}
                          step="0.01"
                          style={{ 
                            width: '100px', 
                            textAlign: 'center',
                            margin: '0 auto'
                          }}
                          placeholder="0"
                          disabled={loading}
                        />
                      </td>
                      <td style={{textAlign: 'center', fontWeight: 'var(--font-weight-medium)'}}>
                        {formatCurrency(product.unitCost)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-products">
              <i className="fas fa-box-open"></i>
              <h4 className="empty-title">No hay productos pendientes</h4>
              <p className="empty-description">
                Todos los productos de esta compra ya han sido entregados
              </p>
            </div>
          )}
        </div>

        {/* Resumen de entrega */}
        {totals.totalProducts > 0 && (
          <div className="form-section">
            <h3 className="section-title">
              <i className="fas fa-calculator"></i>
              Resumen de Entrega
            </h3>
            
            <div className="delivery-summary">
              <div className="summary-row">
                <span style={{display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)'}}>
                  <i className="fas fa-boxes" style={{color: 'var(--primary)'}}></i>
                  Productos seleccionados:
                </span>
                <span style={{fontWeight: 'var(--font-weight-semibold)'}}>{totals.totalProducts}</span>
              </div>
              <div className="summary-row">
                <span style={{display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)'}}>
                  <i className="fas fa-weight" style={{color: 'var(--info)'}}></i>
                  Cantidad total:
                </span>
                <span>{totals.totalQuantity.toFixed(2)} unidades</span>
              </div>
              <div className="summary-row">
                <span style={{display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)'}}>
                  <i className="fas fa-dollar-sign" style={{color: 'var(--success)'}}></i>
                  Valor de productos:
                </span>
                <span>{formatCurrency(totals.totalValue)}</span>
              </div>
              <div className="summary-row">
                <span style={{display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)'}}>
                  <i className="fas fa-truck" style={{color: 'var(--warning)'}}></i>
                  Costo de flete:
                </span>
                <span>{formatCurrency(parseNumberValue(formData.freight))}</span>
              </div>
              <div className="summary-row total">
                <span style={{display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)'}}>
                  <i className="fas fa-receipt" style={{color: 'var(--primary)'}}></i>
                  Total de entrega:
                </span>
                <span>{formatCurrency(totals.totalWithFreight)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Notas */}
        <div className="form-section">
          <h3 className="section-title">
            <i className="fas fa-sticky-note"></i>
            Notas de la Entrega
          </h3>
          
          <div className="form-group">
            <label htmlFor="notes" className="form-label">
              Notas Adicionales
            </label>
            <textarea
              id="notes"
              name="notes"
              className="form-control"
              value={formData.notes}
              onChange={handleChange}
              rows="4"
              placeholder="Notas adicionales sobre la entrega, instrucciones especiales, horarios de recepción, etc."
              disabled={loading}
            />
          </div>
        </div>
      </form>

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
          disabled={loading || totals.totalProducts === 0}
        >
          {loading ? (
            <>
              <span className="spinner-border-sm"></span>
              Creando entrega...
            </>
          ) : (
            <>
              <i className="fas fa-truck"></i>
              Crear Entrega ({totals.totalProducts} producto{totals.totalProducts !== 1 ? 's' : ''})
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default DeliveryDialog;