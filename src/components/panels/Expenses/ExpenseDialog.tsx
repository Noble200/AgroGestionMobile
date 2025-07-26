// src/components/panels/Expenses/ExpenseDialog.tsx - Modal moderno para crear/editar gastos
import React, { useState, useEffect } from 'react';
import {
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
  IonButtons,
  IonIcon,
  IonItem,
  IonLabel,
  IonInput,
  IonSelect,
  IonSelectOption,
  IonTextarea,
  IonDatetime,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonGrid,
  IonRow,
  IonCol,
  IonText,
  IonSpinner,
  IonSegment,
  IonSegmentButton
} from '@ionic/react';
import {
  close,
  save,
  storefront,
  receipt,
  informationCircle,
  calculator,
  person,
  calendar,
  pricetag
} from 'ionicons/icons';

interface ExpenseDialogProps {
  isOpen: boolean;
  expense?: any;
  products: any[];
  isNew: boolean;
  onSave: (expenseData: any) => Promise<boolean>;
  onClose: () => void;
}

const ExpenseDialog: React.FC<ExpenseDialogProps> = ({
  isOpen,
  expense,
  products,
  isNew,
  onSave,
  onClose
}) => {
  // Estado inicial para el formulario
  const [formData, setFormData] = useState({
    expenseNumber: '',
    type: 'product', // 'product' o 'misc'
    date: '',
    // Datos para gastos de productos (ventas)
    productId: '',
    quantitySold: '',
    unitPrice: '',
    totalAmount: '',
    saleReason: '',
    // Datos para gastos varios
    description: '',
    category: '',
    amount: '',
    supplier: '',
    // Datos comunes
    notes: ''
  });

  // Estados adicionales
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [submitting, setSubmitting] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);

  // Cargar datos del gasto si estamos editando
  useEffect(() => {
    if (expense && !isNew) {
      setFormData({
        expenseNumber: expense.expenseNumber || '',
        type: expense.type || 'product',
        date: formatDateForInput(expense.date),
        // Datos para gastos de productos
        productId: expense.productId || '',
        quantitySold: expense.quantitySold ? String(expense.quantitySold) : '',
        unitPrice: expense.unitPrice ? String(expense.unitPrice) : '',
        totalAmount: expense.totalAmount ? String(expense.totalAmount) : '',
        saleReason: expense.saleReason || '',
        // Datos para gastos varios
        description: expense.description || '',
        category: expense.category || '',
        amount: expense.amount ? String(expense.amount) : '',
        supplier: expense.supplier || '',
        // Datos comunes
        notes: expense.notes || ''
      });

      // Si hay un producto seleccionado, buscarlo
      if (expense.productId) {
        const product = products.find(p => p.id === expense.productId);
        setSelectedProduct(product || null);
      }
    } else {
      // Para gastos nuevos, establecer fecha actual
      setFormData(prev => ({
        ...prev,
        date: new Date().toISOString()
      }));
    }
  }, [expense, isNew, products]);

  // Formatear fecha para input de tipo date
  const formatDateForInput = (date: any): string => {
    if (!date) return '';
    
    const d = date.seconds
      ? new Date(date.seconds * 1000)
      : new Date(date);
    
    return d.toISOString();
  };

  // Manejar cambios en el formulario
  const handleChange = (field: string, value: any) => {
    // Limpiar errores al modificar el campo
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
    
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Lógica especial para el tipo de gasto
    if (field === 'type') {
      // Limpiar campos según el tipo
      setFormData(prev => ({
        ...prev,
        type: value,
        // Limpiar campos de producto si cambia a misc
        ...(value === 'misc' ? {
          productId: '',
          quantitySold: '',
          unitPrice: '',
          totalAmount: '',
          saleReason: ''
        } : {}),
        // Limpiar campos de misc si cambia a product
        ...(value === 'product' ? {
          description: '',
          category: '',
          amount: '',
          supplier: ''
        } : {})
      }));
      setSelectedProduct(null);
    }
    
    // Lógica especial para selección de producto
    if (field === 'productId') {
      const product = products.find(p => p.id === value);
      setSelectedProduct(product || null);
      
      // Si selecciona un producto, limpiar campos de cantidad y precio
      if (product) {
        setFormData(prev => ({
          ...prev,
          productId: value,
          quantitySold: '',
          unitPrice: '',
          totalAmount: ''
        }));
      }
    }
  };

  // Manejar cambios en cantidad o precio unitario (cálculo automático)
  const handleQuantityOrPriceChange = (field: string, value: string) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      
      // Calcular automáticamente el total
      const quantity = parseFloat(newData.quantitySold) || 0;
      const unitPrice = parseFloat(newData.unitPrice) || 0;
      
      if (quantity > 0 && unitPrice > 0) {
        newData.totalAmount = (quantity * unitPrice).toFixed(2);
      } else if (field === 'totalAmount' && quantity > 0) {
        // Si se modifica el total, calcular precio unitario
        const total = parseFloat(value) || 0;
        newData.unitPrice = total > 0 ? (total / quantity).toFixed(2) : '';
      }
      
      return newData;
    });
    
    // Limpiar errores
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Filtrar productos disponibles con stock > 0
  const getAvailableProducts = () => {
    return products.filter(product => (product.stock || 0) > 0);
  };

  // Validar formulario antes de guardar
  const validateForm = (): boolean => {
    const newErrors: {[key: string]: string} = {};
    
    // Validaciones comunes
    if (!formData.type) {
      newErrors.type = 'El tipo de gasto es obligatorio';
    }
    
    if (!formData.date) {
      newErrors.date = 'La fecha es obligatoria';
    }
    
    // Validaciones específicas para gastos de productos
    if (formData.type === 'product') {
      if (!formData.productId) {
        newErrors.productId = 'Debe seleccionar un producto';
      }
      
      if (!formData.quantitySold || parseFloat(formData.quantitySold) <= 0) {
        newErrors.quantitySold = 'La cantidad debe ser mayor a 0';
      }
      
      if (!formData.unitPrice || parseFloat(formData.unitPrice) <= 0) {
        newErrors.unitPrice = 'El precio unitario debe ser mayor a 0';
      }
      
      // Verificar que hay suficiente stock
      if (selectedProduct && formData.quantitySold) {
        const quantityToSell = parseFloat(formData.quantitySold);
        const availableStock = selectedProduct.stock || 0;
        
        if (quantityToSell > availableStock) {
          newErrors.quantitySold = `Stock insuficiente. Disponible: ${availableStock}`;
        }
      }
    }
    
    // Validaciones específicas para gastos varios
    if (formData.type === 'misc') {
      if (!formData.description.trim()) {
        newErrors.description = 'La descripción es obligatoria';
      }
      
      if (!formData.amount || parseFloat(formData.amount) <= 0) {
        newErrors.amount = 'El importe debe ser mayor a 0';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Manejar envío del formulario
  const handleSubmit = async () => {
    if (validateForm()) {
      setSubmitting(true);
      
      try {
        // Preparar datos para guardar
        const expenseData = {
          ...formData,
          // Convertir números
          ...(formData.type === 'product' ? {
            quantitySold: parseFloat(formData.quantitySold) || 0,
            unitPrice: parseFloat(formData.unitPrice) || 0,
            totalAmount: parseFloat(formData.totalAmount) || 0
          } : {
            amount: parseFloat(formData.amount) || 0
          })
        };
        
        // Convertir fecha
        if (expenseData.date) {
expenseData.date = new Date(expenseData.date as string).toISOString();
        }
        
        // Llamar a onSave - devuelve Promise<boolean> según el controlador
        await onSave(expenseData);
      } catch (error) {
        console.error("Error al guardar gasto:", error);
      } finally {
        setSubmitting(false);
      }
    }
  };

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onClose}>
      <IonHeader>
        <IonToolbar>
          <IonTitle style={{ fontWeight: '600' }}>
            {isNew ? 'Registrar nuevo gasto' : 'Editar gasto'}
          </IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={onClose} disabled={submitting}>
              <IonIcon icon={close} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        <div style={{ padding: '20px' }}>
          
          {/* Selector de tipo de gasto */}
          <IonCard style={{ borderRadius: '16px', marginBottom: '20px' }}>
            <IonCardHeader>
              <IonCardTitle style={{ fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <IonIcon icon={pricetag} />
                Tipo de gasto
              </IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <IonSegment 
                value={formData.type} 
                onIonChange={(e) => handleChange('type', e.detail.value)}
                style={{ '--background': '#f8fafc' }}
              >
                <IonSegmentButton value="product">
                  <div style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center',
                    gap: '8px',
                    padding: '12px 8px'
                  }}>
                    <IonIcon icon={storefront} style={{ fontSize: '24px' }} />
                    <IonLabel>Venta de producto</IonLabel>
                  </div>
                </IonSegmentButton>
                
                <IonSegmentButton value="misc">
                  <div style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center',
                    gap: '8px',
                    padding: '12px 8px'
                  }}>
                    <IonIcon icon={receipt} style={{ fontSize: '24px' }} />
                    <IonLabel>Gasto varios</IonLabel>
                  </div>
                </IonSegmentButton>
              </IonSegment>
              
              {errors.type && (
                <IonText color="danger" style={{ fontSize: '14px', marginTop: '8px', display: 'block' }}>
                  {errors.type}
                </IonText>
              )}
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
                    <IonItem lines="none" style={{ '--background': '#f8fafc', '--border-radius': '12px' }}>
                      <IonLabel position="stacked">Fecha *</IonLabel>
                      <IonDatetime
                        value={formData.date}
                        onIonChange={(e) => handleChange('date', e.detail.value)}
                        presentation="date"
                        style={{ width: '100%' }}
                      />
                    </IonItem>
                    {errors.date && (
                      <IonText color="danger" style={{ fontSize: '12px', marginTop: '4px', display: 'block' }}>
                        {errors.date}
                      </IonText>
                    )}
                  </IonCol>
                </IonRow>
              </IonGrid>
            </IonCardContent>
          </IonCard>

          {/* Datos específicos según el tipo */}
          {formData.type === 'product' ? (
            <IonCard style={{ borderRadius: '16px', marginBottom: '20px' }}>
              <IonCardHeader>
                <IonCardTitle style={{ fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <IonIcon icon={storefront} />
                  Venta de producto
                </IonCardTitle>
              </IonCardHeader>
              <IonCardContent>
                <IonGrid>
                  <IonRow>
                    {/* Selección de producto */}
                    <IonCol size="12">
                      <IonItem lines="none" style={{ '--background': '#f8fafc', '--border-radius': '12px', marginBottom: '16px' }}>
                        <IonLabel position="stacked">Producto *</IonLabel>
                        <IonSelect
                          value={formData.productId}
                          onIonChange={(e) => handleChange('productId', e.detail.value)}
                          placeholder="Seleccionar producto..."
                          interface="popover"
                        >
                          {getAvailableProducts().map((product) => (
                            <IonSelectOption key={product.id} value={product.id}>
                              {product.name} (Stock: {product.stock} {product.unit})
                            </IonSelectOption>
                          ))}
                        </IonSelect>
                      </IonItem>
                      {errors.productId && (
                        <IonText color="danger" style={{ fontSize: '12px', marginTop: '4px', display: 'block' }}>
                          {errors.productId}
                        </IonText>
                      )}
                    </IonCol>

                    {/* Información del producto seleccionado */}
                    {selectedProduct && (
                      <IonCol size="12">
                        <div style={{
                          background: 'rgba(var(--ion-color-success-rgb), 0.1)',
                          border: '1px solid var(--ion-color-success)',
                          borderRadius: '12px',
                          padding: '16px',
                          marginBottom: '16px'
                        }}>
                          <h4 style={{ 
                            margin: '0 0 8px 0', 
                            color: 'var(--ion-color-success)',
                            fontSize: '16px',
                            fontWeight: '600'
                          }}>
                            Información del producto
                          </h4>
                          <p style={{ margin: '4px 0', fontSize: '14px' }}>
                            <strong>Categoría:</strong> {selectedProduct.category}
                          </p>
                          <p style={{ margin: '4px 0', fontSize: '14px' }}>
                            <strong>Stock disponible:</strong> {selectedProduct.stock} {selectedProduct.unit}
                          </p>
                          {selectedProduct.cost && (
                            <p style={{ margin: '4px 0', fontSize: '14px' }}>
                              <strong>Costo unitario:</strong> ${selectedProduct.cost}
                            </p>
                          )}
                        </div>
                      </IonCol>
                    )}

                    {/* Cantidad y precios */}
                    <IonCol size="12" sizeMd="4">
                      <IonItem lines="none" style={{ '--background': '#f8fafc', '--border-radius': '12px' }}>
                        <IonLabel position="stacked">Cantidad vendida *</IonLabel>
                        <IonInput
                          type="number"
                          value={formData.quantitySold}
                          onIonInput={(e) => handleQuantityOrPriceChange('quantitySold', e.detail.value!)}
                          placeholder="Cantidad"
                          min="0"
                          step="0.01"
                          disabled={!selectedProduct}
                        />
                      </IonItem>
                      {errors.quantitySold && (
                        <IonText color="danger" style={{ fontSize: '12px', marginTop: '4px', display: 'block' }}>
                          {errors.quantitySold}
                        </IonText>
                      )}
                    </IonCol>

                    <IonCol size="12" sizeMd="4">
                      <IonItem lines="none" style={{ '--background': '#f8fafc', '--border-radius': '12px' }}>
                        <IonLabel position="stacked">Precio unitario *</IonLabel>
                        <IonInput
                          type="number"
                          value={formData.unitPrice}
                          onIonInput={(e) => handleQuantityOrPriceChange('unitPrice', e.detail.value!)}
                          placeholder="Precio por unidad"
                          min="0"
                          step="0.01"
                        />
                      </IonItem>
                      {errors.unitPrice && (
                        <IonText color="danger" style={{ fontSize: '12px', marginTop: '4px', display: 'block' }}>
                          {errors.unitPrice}
                        </IonText>
                      )}
                    </IonCol>

                    <IonCol size="12" sizeMd="4">
                      <IonItem lines="none" style={{ '--background': '#e8f5e8', '--border-radius': '12px' }}>
                        <IonLabel position="stacked">Total</IonLabel>
                        <IonInput
                          type="number"
                          value={formData.totalAmount}
                          onIonInput={(e) => handleQuantityOrPriceChange('totalAmount', e.detail.value!)}
                          placeholder="Total calculado"
                          min="0"
                          step="0.01"
                        />
                      </IonItem>
                    </IonCol>

                    <IonCol size="12">
                      <IonItem lines="none" style={{ '--background': '#f8fafc', '--border-radius': '12px' }}>
                        <IonLabel position="stacked">Motivo de la venta</IonLabel>
                        <IonInput
                          value={formData.saleReason}
                          onIonInput={(e) => handleChange('saleReason', e.detail.value!)}
                          placeholder="Ej: Venta al cliente Juan Pérez"
                        />
                      </IonItem>
                    </IonCol>
                  </IonRow>
                </IonGrid>
              </IonCardContent>
            </IonCard>
          ) : (
            <IonCard style={{ borderRadius: '16px', marginBottom: '20px' }}>
              <IonCardHeader>
                <IonCardTitle style={{ fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <IonIcon icon={receipt} />
                  Gasto varios
                </IonCardTitle>
              </IonCardHeader>
              <IonCardContent>
                <IonGrid>
                  <IonRow>
                    <IonCol size="12">
                      <IonItem lines="none" style={{ '--background': '#f8fafc', '--border-radius': '12px', marginBottom: '16px' }}>
                        <IonLabel position="stacked">Descripción *</IonLabel>
                        <IonInput
                          value={formData.description}
                          onIonInput={(e) => handleChange('description', e.detail.value!)}
                          placeholder="Descripción del gasto"
                        />
                      </IonItem>
                      {errors.description && (
                        <IonText color="danger" style={{ fontSize: '12px', marginTop: '4px', display: 'block' }}>
                          {errors.description}
                        </IonText>
                      )}
                    </IonCol>

                    <IonCol size="12" sizeMd="6">
                      <IonItem lines="none" style={{ '--background': '#f8fafc', '--border-radius': '12px' }}>
                        <IonLabel position="stacked">Categoría</IonLabel>
                        <IonSelect
                          value={formData.category}
                          onIonChange={(e) => handleChange('category', e.detail.value)}
                          placeholder="Seleccionar categoría..."
                          interface="popover"
                        >
                          <IonSelectOption value="combustible">Combustible</IonSelectOption>
                          <IonSelectOption value="mantenimiento">Mantenimiento</IonSelectOption>
                          <IonSelectOption value="servicios">Servicios</IonSelectOption>
                          <IonSelectOption value="administrativo">Administrativo</IonSelectOption>
                          <IonSelectOption value="impuestos">Impuestos</IonSelectOption>
                          <IonSelectOption value="personal">Personal</IonSelectOption>
                          <IonSelectOption value="transporte">Transporte</IonSelectOption>
                          <IonSelectOption value="otros">Otros</IonSelectOption>
                        </IonSelect>
                      </IonItem>
                    </IonCol>

                    <IonCol size="12" sizeMd="6">
                      <IonItem lines="none" style={{ '--background': '#f8fafc', '--border-radius': '12px' }}>
                        <IonLabel position="stacked">Importe *</IonLabel>
                        <IonInput
                          type="number"
                          value={formData.amount}
                          onIonInput={(e) => handleChange('amount', e.detail.value!)}
                          placeholder="Importe del gasto"
                          min="0"
                          step="0.01"
                        />
                      </IonItem>
                      {errors.amount && (
                        <IonText color="danger" style={{ fontSize: '12px', marginTop: '4px', display: 'block' }}>
                          {errors.amount}
                        </IonText>
                      )}
                    </IonCol>

                    <IonCol size="12">
                      <IonItem lines="none" style={{ '--background': '#f8fafc', '--border-radius': '12px' }}>
                        <IonLabel position="stacked">Proveedor</IonLabel>
                        <IonInput
                          value={formData.supplier}
                          onIonInput={(e) => handleChange('supplier', e.detail.value!)}
                          placeholder="Nombre del proveedor"
                        />
                      </IonItem>
                    </IonCol>
                  </IonRow>
                </IonGrid>
              </IonCardContent>
            </IonCard>
          )}

          {/* Notas adicionales */}
          <IonCard style={{ borderRadius: '16px', marginBottom: '20px' }}>
            <IonCardHeader>
              <IonCardTitle style={{ fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <IonIcon icon={informationCircle} />
                Información adicional
              </IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <IonItem lines="none" style={{ '--background': '#f8fafc', '--border-radius': '12px' }}>
                <IonLabel position="stacked">Notas</IonLabel>
                <IonTextarea
                  value={formData.notes}
                  onIonInput={(e) => handleChange('notes', e.detail.value!)}
                  placeholder="Notas adicionales sobre el gasto"
                  rows={3}
                />
              </IonItem>
            </IonCardContent>
          </IonCard>

          {/* Botones de acción */}
          <div style={{ 
            display: 'flex', 
            gap: '12px', 
            marginTop: '32px',
            paddingBottom: '20px'
          }}>
            <IonButton
              expand="block"
              fill="outline"
              onClick={onClose}
              disabled={submitting}
              style={{ '--border-radius': '12px' }}
            >
              Cancelar
            </IonButton>
            
            <IonButton
              expand="block"
              onClick={handleSubmit}
              disabled={submitting}
              style={{ '--border-radius': '12px' }}
            >
              {submitting ? (
                <>
                  <IonSpinner name="crescent" style={{ marginRight: '8px' }} />
                  {isNew ? 'Registrando...' : 'Guardando...'}
                </>
              ) : (
                <>
                  <IonIcon icon={save} slot="start" />
                  {isNew ? 'Registrar gasto' : 'Guardar cambios'}
                </>
              )}
            </IonButton>
          </div>
        </div>
      </IonContent>
    </IonModal>
  );
};

export default ExpenseDialog;
