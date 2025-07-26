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

  // Formatear fecha para input de tipo date
  const formatDateForInput = (date: any): string => {
    if (!date) return new Date().toISOString();
    
    const d = date.seconds
      ? new Date(date.seconds * 1000)
      : new Date(date);
    
    return d.toISOString();
  };

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
      
      if (product) {
        setFormData(prev => ({
          ...prev,
          productId: value,
          unitPrice: product.price ? String(product.price) : '',
          productName: product.name || '',
          productCategory: product.category || ''
        }));
      }
    }
    
    // Calcular total automáticamente
    if (field === 'quantitySold' || field === 'unitPrice') {
      setFormData(prev => {
        const newData = { ...prev, [field]: value };
        const quantity = parseFloat(newData.quantitySold) || 0;
        const price = parseFloat(newData.unitPrice) || 0;
        const total = quantity * price;
        
        return {
          ...newData,
          totalAmount: total > 0 ? String(total.toFixed(2)) : ''
        };
      });
    }
    
    // Calcular precio unitario si se modifica el total
    if (field === 'totalAmount' && formData.quantitySold) {
      setFormData(prev => {
        const newData = { ...prev, [field]: value };
        const total = parseFloat(newData.totalAmount) || 0;
        const quantity = parseFloat(newData.quantitySold) || 0;
        
        if (quantity > 0) {
          newData.unitPrice = total > 0 ? (total / quantity).toFixed(2) : '';
        }
        
        return newData;
      });
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
            totalAmount: parseFloat(formData.totalAmount) || 0,
            productName: selectedProduct?.name || '',
            productCategory: selectedProduct?.category || ''
          } : {
            amount: parseFloat(formData.amount) || 0
          }),
          // Convertir fecha
          date: new Date(formData.date)
        };
        
        const success = await onSave(expenseData);
        
        if (success) {
          onClose();
        }
        
      } catch (error) {
        console.error('Error al guardar gasto:', error);
      } finally {
        setSubmitting(false);
      }
    }
  };

  // Categorías predefinidas para gastos varios
  const miscCategories = [
    'Combustible',
    'Mantenimiento',
    'Seguros',
    'Servicios',
    'Suministros',
    'Transporte',
    'Personal',
    'Otros'
  ];

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
            <IonCardHeader style={{ paddingBottom: '10px' }}>
              <IonCardTitle style={{ fontSize: '18px', fontWeight: '600', color: 'var(--ion-color-primary)' }}>
                Tipo de gasto
              </IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <IonSegment
                value={formData.type}
                onIonChange={e => handleChange('type', e.detail.value)}
                style={{ '--background': '#f8f9fa' }}
              >
                <IonSegmentButton value="product">
                  <IonIcon icon={storefront} />
                  <IonLabel>Venta de producto</IonLabel>
                </IonSegmentButton>
                <IonSegmentButton value="misc">
                  <IonIcon icon={receipt} />
                  <IonLabel>Gasto varios</IonLabel>
                </IonSegmentButton>
              </IonSegment>
            </IonCardContent>
          </IonCard>

          {/* Información básica */}
          <IonCard style={{ borderRadius: '16px', marginBottom: '20px' }}>
            <IonCardHeader style={{ paddingBottom: '10px' }}>
              <IonCardTitle style={{ fontSize: '18px', fontWeight: '600', color: 'var(--ion-color-primary)' }}>
                <IonIcon icon={informationCircle} style={{ marginRight: '8px' }} />
                Información básica
              </IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <IonGrid>
                <IonRow>
                  <IonCol size="12" sizeMd="6">
                    <IonItem>
                      <IonLabel position="stacked">Número de gasto</IonLabel>
                      <IonInput
                        placeholder="Se generará automáticamente"
                        value={formData.expenseNumber}
                        onIonInput={e => handleChange('expenseNumber', e.detail.value!)}
                      />
                    </IonItem>
                  </IonCol>
                  <IonCol size="12" sizeMd="6">
                    <IonItem>
                      <IonLabel position="stacked">Fecha *</IonLabel>
                      <IonDatetime
                        value={formData.date}
                        onIonChange={e => handleChange('date', e.detail.value!)}
                        presentation="date"
                        style={{ width: '100%' }}
                      />
                    </IonItem>
                    {errors.date && (
                      <IonText color="danger" style={{ fontSize: '12px', marginLeft: '16px' }}>
                        {errors.date}
                      </IonText>
                    )}
                  </IonCol>
                </IonRow>
              </IonGrid>
            </IonCardContent>
          </IonCard>

          {/* Formulario para gastos de productos */}
          {formData.type === 'product' && (
            <IonCard style={{ borderRadius: '16px', marginBottom: '20px' }}>
              <IonCardHeader style={{ paddingBottom: '10px' }}>
                <IonCardTitle style={{ fontSize: '18px', fontWeight: '600', color: 'var(--ion-color-success)' }}>
                  <IonIcon icon={storefront} style={{ marginRight: '8px' }} />
                  Detalles de venta
                </IonCardTitle>
              </IonCardHeader>
              <IonCardContent>
                <IonGrid>
                  <IonRow>
                    <IonCol size="12">
                      <IonItem>
                        <IonLabel position="stacked">Producto *</IonLabel>
                        <IonSelect
                          value={formData.productId}
                          onIonChange={e => handleChange('productId', e.detail.value)}
                          placeholder="Seleccionar producto"
                        >
                          {getAvailableProducts().map(product => (
                            <IonSelectOption key={product.id} value={product.id}>
                              {product.name} (Stock: {product.stock})
                            </IonSelectOption>
                          ))}
                        </IonSelect>
                      </IonItem>
                      {errors.productId && (
                        <IonText color="danger" style={{ fontSize: '12px', marginLeft: '16px' }}>
                          {errors.productId}
                        </IonText>
                      )}
                    </IonCol>
                  </IonRow>
                  
                  <IonRow>
                    <IonCol size="12" sizeMd="4">
                      <IonItem>
                        <IonLabel position="stacked">Cantidad vendida *</IonLabel>
                        <IonInput
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0"
                          value={formData.quantitySold}
                          onIonInput={e => handleChange('quantitySold', e.detail.value!)}
                        />
                      </IonItem>
                      {errors.quantitySold && (
                        <IonText color="danger" style={{ fontSize: '12px', marginLeft: '16px' }}>
                          {errors.quantitySold}
                        </IonText>
                      )}
                    </IonCol>
                    
                    <IonCol size="12" sizeMd="4">
                      <IonItem>
                        <IonLabel position="stacked">Precio unitario *</IonLabel>
                        <IonInput
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          value={formData.unitPrice}
                          onIonInput={e => handleChange('unitPrice', e.detail.value!)}
                        />
                      </IonItem>
                      {errors.unitPrice && (
                        <IonText color="danger" style={{ fontSize: '12px', marginLeft: '16px' }}>
                          {errors.unitPrice}
                        </IonText>
                      )}
                    </IonCol>
                    
                    <IonCol size="12" sizeMd="4">
                      <IonItem>
                        <IonLabel position="stacked">Total</IonLabel>
                        <IonInput
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          value={formData.totalAmount}
                          onIonInput={e => handleChange('totalAmount', e.detail.value!)}
                        />
                      </IonItem>
                    </IonCol>
                  </IonRow>
                  
                  <IonRow>
                    <IonCol size="12">
                      <IonItem>
                        <IonLabel position="stacked">Motivo de la venta</IonLabel>
                        <IonTextarea
                          placeholder="Descripción del motivo de venta..."
                          value={formData.saleReason}
                          onIonInput={e => handleChange('saleReason', e.detail.value!)}
                          rows={3}
                        />
                      </IonItem>
                    </IonCol>
                  </IonRow>
                </IonGrid>
              </IonCardContent>
            </IonCard>
          )}

          {/* Formulario para gastos varios */}
          {formData.type === 'misc' && (
            <IonCard style={{ borderRadius: '16px', marginBottom: '20px' }}>
              <IonCardHeader style={{ paddingBottom: '10px' }}>
                <IonCardTitle style={{ fontSize: '18px', fontWeight: '600', color: 'var(--ion-color-warning)' }}>
                  <IonIcon icon={receipt} style={{ marginRight: '8px' }} />
                  Detalles del gasto
                </IonCardTitle>
              </IonCardHeader>
              <IonCardContent>
                <IonGrid>
                  <IonRow>
                    <IonCol size="12" sizeMd="6">
                      <IonItem>
                        <IonLabel position="stacked">Categoría *</IonLabel>
                        <IonSelect
                          value={formData.category}
                          onIonChange={e => handleChange('category', e.detail.value)}
                          placeholder="Seleccionar categoría"
                        >
                          {miscCategories.map(category => (
                            <IonSelectOption key={category} value={category}>
                              {category}
                            </IonSelectOption>
                          ))}
                        </IonSelect>
                      </IonItem>
                    </IonCol>
                    
                    <IonCol size="12" sizeMd="6">
                      <IonItem>
                        <IonLabel position="stacked">Importe *</IonLabel>
                        <IonInput
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          value={formData.amount}
                          onIonInput={e => handleChange('amount', e.detail.value!)}
                        />
                      </IonItem>
                      {errors.amount && (
                        <IonText color="danger" style={{ fontSize: '12px', marginLeft: '16px' }}>
                          {errors.amount}
                        </IonText>
                      )}
                    </IonCol>
                  </IonRow>
                  
                  <IonRow>
                    <IonCol size="12">
                      <IonItem>
                        <IonLabel position="stacked">Descripción *</IonLabel>
                        <IonTextarea
                          placeholder="Descripción detallada del gasto..."
                          value={formData.description}
                          onIonInput={e => handleChange('description', e.detail.value!)}
                          rows={3}
                        />
                      </IonItem>
                      {errors.description && (
                        <IonText color="danger" style={{ fontSize: '12px', marginLeft: '16px' }}>
                          {errors.description}
                        </IonText>
                      )}
                    </IonCol>
                  </IonRow>
                  
                  <IonRow>
                    <IonCol size="12">
                      <IonItem>
                        <IonLabel position="stacked">Proveedor</IonLabel>
                        <IonInput
                          placeholder="Nombre del proveedor..."
                          value={formData.supplier}
                          onIonInput={e => handleChange('supplier', e.detail.value!)}
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
            <IonCardHeader style={{ paddingBottom: '10px' }}>
              <IonCardTitle style={{ fontSize: '18px', fontWeight: '600', color: 'var(--ion-color-medium)' }}>
                Notas adicionales
              </IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <IonItem>
                <IonLabel position="stacked">Observaciones</IonLabel>
                <IonTextarea
                  placeholder="Cualquier información adicional relevante..."
                  value={formData.notes}
                  onIonInput={e => handleChange('notes', e.detail.value!)}
                  rows={3}
                />
              </IonItem>
            </IonCardContent>
          </IonCard>

          {/* Botones de acción */}
          <div style={{ 
            display: 'flex', 
            gap: '12px', 
            justifyContent: 'space-between',
            marginTop: '20px'
          }}>
            <IonButton
              fill="outline"
              expand="block"
              onClick={onClose}
              disabled={submitting}
              style={{ flex: 1, '--border-radius': '12px' }}
            >
              Cancelar
            </IonButton>
            
            <IonButton
              expand="block"
              onClick={handleSubmit}
              disabled={submitting}
              style={{ flex: 2, '--border-radius': '12px' }}
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