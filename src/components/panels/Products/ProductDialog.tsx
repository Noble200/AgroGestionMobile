// src/components/panels/Products/ProductDialog.tsx - Modal para crear/editar productos
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
  IonInput,
  IonSelect,
  IonSelectOption,
  IonTextarea,
  IonItem,
  IonLabel,
  IonGrid,
  IonRow,
  IonCol,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonCheckbox,
  IonChip,
  IonToast,
  IonSpinner
} from '@ionic/react';
import {
  close,
  save,
  cube,
  pricetag,
  business,
  calendar,
  location
} from 'ionicons/icons';

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
  expirationDate?: any;
  warehouseId?: string;
  fieldId?: string;
  description?: string;
  notes?: string;
}

interface ProductDialogProps {
  isOpen: boolean;
  product: ControllerProduct | null;
  fields: any[];
  warehouses: any[];
  isNew: boolean;
  onSave: (productData: Partial<ControllerProduct>) => Promise<boolean>;
  onClose: () => void;
}

const ProductDialog: React.FC<ProductDialogProps> = ({
  isOpen,
  product,
  fields,
  warehouses,
  isNew,
  onSave,
  onClose
}) => {
  // Estado inicial para el formulario
  const [formData, setFormData] = useState<Partial<ControllerProduct>>({
    name: '',
    code: '',
    category: 'insumo',
    storageType: 'bolsas',
    unit: 'kg',
    stock: 0,
    minStock: 0,
    lotNumber: '',
    storageConditions: '',
    dimensions: '',
    supplierCode: '',
    cost: 0,
    expirationDate: null,
    warehouseId: '',
    fieldId: '',
    description: '',
    notes: ''
  });

  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [availableWarehouses, setAvailableWarehouses] = useState<any[]>([]);

  // Cargar datos del producto si estamos editando
  useEffect(() => {
    if (product && !isNew) {
      console.log('Cargando producto para editar:', product); // Debug
      
      setFormData({
        name: product.name || '',
        code: product.code || '',
        category: product.category || 'insumo',
        storageType: product.storageType || 'bolsas',
        unit: product.unit || 'kg',
        stock: product.stock || 0,
        minStock: product.minStock || 0,
        lotNumber: product.lotNumber || '',
        storageConditions: product.storageConditions || '',
        dimensions: product.dimensions || '',
        supplierCode: product.supplierCode || '',
        cost: product.cost || 0,
        expirationDate: formatDateForInput(product.expirationDate),
        warehouseId: product.warehouseId || '',
        fieldId: product.fieldId || '',
        description: product.description || '',
        notes: product.notes || ''
      });

      // Cargar almacenes del campo seleccionado
      if (product.fieldId) {
        updateWarehouses(product.fieldId);
      }
    } else {
      // Resetear formulario para nuevo producto
      setFormData({
        name: '',
        code: '',
        category: 'insumo',
        storageType: 'bolsas',
        unit: 'kg',
        stock: 0,
        minStock: 0,
        lotNumber: '',
        storageConditions: '',
        dimensions: '',
        supplierCode: '',
        cost: 0,
        expirationDate: null,
        warehouseId: '',
        fieldId: '',
        description: '',
        notes: ''
      });
      setAvailableWarehouses([]);
    }
    
    // Limpiar errores al abrir/cambiar
    setErrors({});
  }, [product, isNew]);

  // Formatear fecha para input de tipo date
  const formatDateForInput = (date: any): string => {
    if (!date) return '';
    
    try {
      const d = date.seconds
        ? new Date(date.seconds * 1000)
        : new Date(date);
      
      return d.toISOString().split('T')[0];
    } catch (error) {
      console.error('Error formateando fecha:', error);
      return '';
    }
  };

  // Actualizar almacenes disponibles según el campo
  const updateWarehouses = (fieldId: string) => {
    if (!fieldId) {
      setAvailableWarehouses([]);
      return;
    }
    
    // Filtrar almacenes del campo seleccionado
    const fieldWarehouses = warehouses.filter(w => w.fieldId === fieldId);
    setAvailableWarehouses(fieldWarehouses);
  };

  // Manejar cambios en el formulario
  const handleInputChange = (field: string, value: any) => {
    console.log(`Campo ${field} cambió a:`, value); // Debug
    
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Limpiar errores al modificar el campo
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }

    // Si cambia el campo, actualizar almacenes disponibles
    if (field === 'fieldId') {
      updateWarehouses(value);
      setFormData(prev => ({ ...prev, fieldId: value, warehouseId: '' }));
    }
  };

  // Validar formulario
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name?.trim()) {
      newErrors.name = 'El nombre es obligatorio';
    }
    
    if (!formData.category) {
      newErrors.category = 'La categoría es obligatoria';
    }
    
    if (formData.stock !== undefined && formData.stock < 0) {
      newErrors.stock = 'El stock no puede ser negativo';
    }
    
    if (formData.minStock !== undefined && formData.minStock < 0) {
      newErrors.minStock = 'El stock mínimo no puede ser negativo';
    }
    
    if (formData.cost !== undefined && formData.cost < 0) {
      newErrors.cost = 'El costo no puede ser negativo';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Manejar guardado
  const handleSave = async () => {
    if (!validateForm()) {
      setToastMessage('Por favor corrige los errores en el formulario');
      setShowToast(true);
      return;
    }

    setSaving(true);
    
    try {
      // Preparar datos para guardar
      const productData = { ...formData };
      
      console.log('Datos del formulario antes de guardar:', productData); // Debug
      
      // Convertir fecha si existe
      if (productData.expirationDate && typeof productData.expirationDate === 'string') {
        productData.expirationDate = new Date(productData.expirationDate);
      }
      
      console.log('Datos preparados para enviar:', productData); // Debug
      
      const success = await onSave(productData);
      
      if (success) {
        setToastMessage(isNew ? 'Producto creado exitosamente' : 'Producto actualizado exitosamente');
        setShowToast(true);
        
        // Cerrar modal después de un breve delay
        setTimeout(() => {
          onClose();
        }, 1500);
      }
      
    } catch (error) {
      console.error('Error al guardar producto:', error);
      setToastMessage('Error al guardar el producto');
      setShowToast(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <IonModal isOpen={isOpen} onDidDismiss={onClose}>
        <IonHeader>
          <IonToolbar>
            <IonTitle>{isNew ? 'Nuevo Producto' : 'Editar Producto'}</IonTitle>
            <IonButtons slot="end">
              <IonButton onClick={onClose} disabled={saving}>
                <IonIcon icon={close} />
              </IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>
        
        <IonContent>
          <div style={{ padding: '16px' }}>
            {/* Información básica */}
            <IonCard>
              <IonCardHeader>
                <IonCardTitle>
                  <IonIcon icon={cube} style={{ marginRight: '8px' }} />
                  Información básica
                </IonCardTitle>
              </IonCardHeader>
              <IonCardContent>
                <IonGrid>
                  <IonRow>
                    <IonCol size="12" sizeMd="6">
                      <IonItem>
                        <IonLabel position="stacked">Nombre *</IonLabel>
                        <IonInput
                          value={formData.name}
                          onIonInput={(e) => handleInputChange('name', e.detail.value!)}
                          placeholder="Nombre del producto"
                          className={errors.name ? 'ion-invalid' : ''}
                          disabled={saving}
                        />
                      </IonItem>
                      {errors.name && (
                        <p style={{ color: 'var(--ion-color-danger)', fontSize: '14px', margin: '4px 16px' }}>
                          {errors.name}
                        </p>
                      )}
                    </IonCol>
                    
                    <IonCol size="12" sizeMd="6">
                      <IonItem>
                        <IonLabel position="stacked">Código</IonLabel>
                        <IonInput
                          value={formData.code}
                          onIonInput={(e) => handleInputChange('code', e.detail.value!)}
                          placeholder="Código único del producto"
                          disabled={saving}
                        />
                      </IonItem>
                    </IonCol>
                  </IonRow>
                  
                  <IonRow>
                    <IonCol size="12" sizeMd="6">
                      <IonItem>
                        <IonLabel position="stacked">Categoría *</IonLabel>
                        <IonSelect
                          value={formData.category}
                          onIonChange={(e) => handleInputChange('category', e.detail.value)}
                          placeholder="Seleccionar categoría"
                          disabled={saving}
                        >
                          <IonSelectOption value="insumo">Insumo</IonSelectOption>
                          <IonSelectOption value="herramienta">Herramienta</IonSelectOption>
                          <IonSelectOption value="semilla">Semilla</IonSelectOption>
                          <IonSelectOption value="fertilizante">Fertilizante</IonSelectOption>
                          <IonSelectOption value="pesticida">Pesticida</IonSelectOption>
                          <IonSelectOption value="maquinaria">Maquinaria</IonSelectOption>
                          <IonSelectOption value="combustible">Combustible</IonSelectOption>
                          <IonSelectOption value="otro">Otro</IonSelectOption>
                        </IonSelect>
                      </IonItem>
                      {errors.category && (
                        <p style={{ color: 'var(--ion-color-danger)', fontSize: '14px', margin: '4px 16px' }}>
                          {errors.category}
                        </p>
                      )}
                    </IonCol>
                    
                    <IonCol size="12" sizeMd="6">
                      <IonItem>
                        <IonLabel position="stacked">Forma de almacenamiento</IonLabel>
                        <IonSelect
                          value={formData.storageType}
                          onIonChange={(e) => handleInputChange('storageType', e.detail.value)}
                          disabled={saving}
                        >
                          <IonSelectOption value="bolsas">Bolsas</IonSelectOption>
                          <IonSelectOption value="suelto">Suelto</IonSelectOption>
                          <IonSelectOption value="unidad">Por unidad</IonSelectOption>
                          <IonSelectOption value="sacos">Sacos</IonSelectOption>
                          <IonSelectOption value="tambores">Tambores</IonSelectOption>
                          <IonSelectOption value="contenedores">Contenedores</IonSelectOption>
                          <IonSelectOption value="cajas">Cajas</IonSelectOption>
                        </IonSelect>
                      </IonItem>
                    </IonCol>
                  </IonRow>
                  
                  <IonRow>
                    <IonCol size="12" sizeMd="6">
                      <IonItem>
                        <IonLabel position="stacked">Unidad</IonLabel>
                        <IonSelect
                          value={formData.unit}
                          onIonChange={(e) => handleInputChange('unit', e.detail.value)}
                          disabled={saving}
                        >
                          <IonSelectOption value="kg">Kilogramos</IonSelectOption>
                          <IonSelectOption value="L">Litros</IonSelectOption>
                          <IonSelectOption value="unidad">Unidades</IonSelectOption>
                          <IonSelectOption value="ton">Toneladas</IonSelectOption>
                          <IonSelectOption value="m">Metros</IonSelectOption>
                          <IonSelectOption value="m²">Metros cuadrados</IonSelectOption>
                          <IonSelectOption value="m³">Metros cúbicos</IonSelectOption>
                        </IonSelect>
                      </IonItem>
                    </IonCol>
                    
                    <IonCol size="12" sizeMd="6">
                      <IonItem>
                        <IonLabel position="stacked">Número de lote</IonLabel>
                        <IonInput
                          value={formData.lotNumber}
                          onIonInput={(e) => handleInputChange('lotNumber', e.detail.value!)}
                          placeholder="Número de lote del producto"
                          disabled={saving}
                        />
                      </IonItem>
                    </IonCol>
                  </IonRow>
                </IonGrid>
              </IonCardContent>
            </IonCard>

            {/* Control de stock */}
            <IonCard>
              <IonCardHeader>
                <IonCardTitle>
                  <IonIcon icon={pricetag} style={{ marginRight: '8px' }} />
                  Control de stock
                </IonCardTitle>
              </IonCardHeader>
              <IonCardContent>
                <IonGrid>
                  <IonRow>
                    <IonCol size="12" sizeMd="4">
                      <IonItem>
                        <IonLabel position="stacked">Stock actual</IonLabel>
                        <IonInput
                          type="number"
                          value={formData.stock}
                          onIonInput={(e) => handleInputChange('stock', parseFloat(e.detail.value!) || 0)}
                          placeholder="Cantidad actual"
                          min="0"
                          step="0.01"
                          disabled={saving}
                        />
                      </IonItem>
                      {errors.stock && (
                        <p style={{ color: 'var(--ion-color-danger)', fontSize: '14px', margin: '4px 16px' }}>
                          {errors.stock}
                        </p>
                      )}
                    </IonCol>
                    
                    <IonCol size="12" sizeMd="4">
                      <IonItem>
                        <IonLabel position="stacked">Stock mínimo</IonLabel>
                        <IonInput
                          type="number"
                          value={formData.minStock}
                          onIonInput={(e) => handleInputChange('minStock', parseFloat(e.detail.value!) || 0)}
                          placeholder="Cantidad mínima para alerta"
                          min="0"
                          step="0.01"
                          disabled={saving}
                        />
                      </IonItem>
                      {errors.minStock && (
                        <p style={{ color: 'var(--ion-color-danger)', fontSize: '14px', margin: '4px 16px' }}>
                          {errors.minStock}
                        </p>
                      )}
                    </IonCol>
                    
                    <IonCol size="12" sizeMd="4">
                      <IonItem>
                        <IonLabel position="stacked">Costo por unidad</IonLabel>
                        <IonInput
                          type="number"
                          value={formData.cost}
                          onIonInput={(e) => handleInputChange('cost', parseFloat(e.detail.value!) || 0)}
                          placeholder="Precio de compra"
                          min="0"
                          step="0.01"
                          disabled={saving}
                        />
                      </IonItem>
                      {errors.cost && (
                        <p style={{ color: 'var(--ion-color-danger)', fontSize: '14px', margin: '4px 16px' }}>
                          {errors.cost}
                        </p>
                      )}
                    </IonCol>
                  </IonRow>
                  
                  <IonRow>
                    <IonCol size="12" sizeMd="6">
                      <IonItem>
                        <IonLabel position="stacked">Fecha de vencimiento</IonLabel>
                        <IonInput
                          type="date"
                          value={formData.expirationDate}
                          onIonInput={(e) => handleInputChange('expirationDate', e.detail.value!)}
                          disabled={saving}
                        />
                      </IonItem>
                    </IonCol>
                  </IonRow>
                </IonGrid>
              </IonCardContent>
            </IonCard>

            {/* Ubicación */}
            <IonCard>
              <IonCardHeader>
                <IonCardTitle>
                  <IonIcon icon={location} style={{ marginRight: '8px' }} />
                  Ubicación
                </IonCardTitle>
              </IonCardHeader>
              <IonCardContent>
                <IonGrid>
                  <IonRow>
                    <IonCol size="12" sizeMd="6">
                      <IonItem>
                        <IonLabel position="stacked">Campo</IonLabel>
                        <IonSelect
                          value={formData.fieldId}
                          onIonChange={(e) => handleInputChange('fieldId', e.detail.value)}
                          placeholder="Seleccionar campo"
                          disabled={saving}
                        >
                          <IonSelectOption value="">Sin asignar</IonSelectOption>
                          {fields.map((field) => (
                            <IonSelectOption key={field.id} value={field.id}>
                              {field.name}
                            </IonSelectOption>
                          ))}
                        </IonSelect>
                      </IonItem>
                    </IonCol>
                    
                    <IonCol size="12" sizeMd="6">
                      <IonItem>
                        <IonLabel position="stacked">Almacén</IonLabel>
                        <IonSelect
                          value={formData.warehouseId}
                          onIonChange={(e) => handleInputChange('warehouseId', e.detail.value)}
                          placeholder="Seleccionar almacén"
                          disabled={!formData.fieldId || saving}
                        >
                          <IonSelectOption value="">Sin asignar</IonSelectOption>
                          {availableWarehouses.map((warehouse) => (
                            <IonSelectOption key={warehouse.id} value={warehouse.id}>
                              {warehouse.name}
                            </IonSelectOption>
                          ))}
                        </IonSelect>
                      </IonItem>
                      {!formData.fieldId && (
                        <p style={{ color: 'var(--ion-color-medium)', fontSize: '12px', margin: '4px 16px' }}>
                          Selecciona un campo primero
                        </p>
                      )}
                    </IonCol>
                  </IonRow>
                </IonGrid>
              </IonCardContent>
            </IonCard>

            {/* Información adicional */}
            <IonCard>
              <IonCardHeader>
                <IonCardTitle>
                  <IonIcon icon={business} style={{ marginRight: '8px' }} />
                  Información adicional
                </IonCardTitle>
              </IonCardHeader>
              <IonCardContent>
                <IonGrid>
                  <IonRow>
                    <IonCol size="12" sizeMd="6">
                      <IonItem>
                        <IonLabel position="stacked">Condiciones de almacenamiento</IonLabel>
                        <IonInput
                          value={formData.storageConditions}
                          onIonInput={(e) => handleInputChange('storageConditions', e.detail.value!)}
                          placeholder="Ej: Lugar seco y fresco"
                          disabled={saving}
                        />
                      </IonItem>
                    </IonCol>
                    
                    <IonCol size="12" sizeMd="6">
                      <IonItem>
                        <IonLabel position="stacked">Dimensiones</IonLabel>
                        <IonInput
                          value={formData.dimensions}
                          onIonInput={(e) => handleInputChange('dimensions', e.detail.value!)}
                          placeholder="Ej: 50x30x20 cm"
                          disabled={saving}
                        />
                      </IonItem>
                    </IonCol>
                  </IonRow>
                  
                  <IonRow>
                    <IonCol size="12" sizeMd="6">
                      <IonItem>
                        <IonLabel position="stacked">Código de proveedor</IonLabel>
                        <IonInput
                          value={formData.supplierCode}
                          onIonInput={(e) => handleInputChange('supplierCode', e.detail.value!)}
                          placeholder="Código del proveedor"
                          disabled={saving}
                        />
                      </IonItem>
                    </IonCol>
                  </IonRow>
                  
                  <IonRow>
                    <IonCol size="12">
                      <IonItem>
                        <IonLabel position="stacked">Descripción</IonLabel>
                        <IonTextarea
                          value={formData.description}
                          onIonInput={(e) => handleInputChange('description', e.detail.value!)}
                          placeholder="Descripción del producto"
                          rows={3}
                          disabled={saving}
                        />
                      </IonItem>
                    </IonCol>
                  </IonRow>
                  
                  <IonRow>
                    <IonCol size="12">
                      <IonItem>
                        <IonLabel position="stacked">Notas</IonLabel>
                        <IonTextarea
                          value={formData.notes}
                          onIonInput={(e) => handleInputChange('notes', e.detail.value!)}
                          placeholder="Notas adicionales"
                          rows={3}
                          disabled={saving}
                        />
                      </IonItem>
                    </IonCol>
                  </IonRow>
                </IonGrid>
              </IonCardContent>
            </IonCard>

            {/* Botones de acción */}
            <div style={{ padding: '16px 0', display: 'flex', gap: '12px' }}>
              <IonButton 
                expand="block" 
                fill="outline" 
                onClick={onClose}
                disabled={saving}
              >
                Cancelar
              </IonButton>
              <IonButton 
                expand="block" 
                onClick={handleSave}
                disabled={saving}
              >
                {saving && <IonSpinner style={{ marginRight: '8px' }} />}
                <IonIcon icon={save} slot="start" />
                {saving ? 'Guardando...' : (isNew ? 'Crear producto' : 'Guardar cambios')}
              </IonButton>
            </div>
          </div>
        </IonContent>
      </IonModal>

      <IonToast
        isOpen={showToast}
        onDidDismiss={() => setShowToast(false)}
        message={toastMessage}
        duration={3000}
        position="top"
      />
    </>
  );
};

export default ProductDialog;