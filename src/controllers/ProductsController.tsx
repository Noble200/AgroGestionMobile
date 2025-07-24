// src/controllers/ProductsController.tsx - Controlador para productos con logging de actividades
import { useState, useEffect, useCallback } from 'react';
import { useStock } from '../contexts/StockContext';
import { useActivityLogger } from '../hooks/useActivityLogger';
import { collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, Timestamp, getDoc } from 'firebase/firestore';
import { db } from '../api/firebase';

// Interfaces para TypeScript - Redefinidas para evitar conflictos
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
  createdAt?: any;
  updatedAt?: any;
  [key: string]: any;
}

interface Filters {
  category: string;
  stockStatus: string;
  fieldId: string;
  expiringSoon: boolean;
  searchTerm: string;
}

interface FilterOption {
  value: string;
  label: string;
}

interface FilterOptions {
  category: FilterOption[];
  stockStatus: FilterOption[];
  field: FilterOption[];
}

interface ProductChange {
  field: string;
  label: string;
  oldValue: string;
  newValue: string;
  type?: string;
}

interface UseProductsControllerReturn {
  products: ControllerProduct[];
  fields: any[];
  warehouses: any[];
  loading: boolean;
  error: string;
  selectedProduct: ControllerProduct | null;
  dialogOpen: boolean;
  dialogType: string;
  filterOptions: FilterOptions;
  filters: Filters;
  handleAddProduct: () => void;
  handleEditProduct: (product: ControllerProduct) => void;
  handleViewProduct: (product: ControllerProduct) => void;
  handleDeleteProduct: (productId: string) => Promise<void>;
  handleSaveProduct: (productData: Partial<ControllerProduct>) => Promise<boolean>;
  handleFilterChange: (filterName: string, value: any) => void;
  handleSearch: (searchTerm: string) => void;
  handleCloseDialog: () => void;
  clearSpecialFilters: () => void;
  refreshData: () => Promise<void>;
}

const useProductsController = (): UseProductsControllerReturn => {
  const {
    products: stockProducts,
    fields,
    warehouses,
    loading: stockLoading,
    error: stockError,
    loadProducts,
    loadFields,
    loadWarehouses
  } = useStock();

  const { logProduct } = useActivityLogger();

  // Convertir productos del stock a nuestro tipo local
  const products: ControllerProduct[] = stockProducts.map(product => {
    const productAny = product as any;
    
    const baseProduct: ControllerProduct = {
      id: productAny.id || '',
      name: productAny.name,
      code: productAny.code,
      category: productAny.category,
      storageType: productAny.storageType,
      unit: productAny.unit,
      stock: productAny.stock,
      minStock: productAny.minStock,
      lotNumber: productAny.lotNumber,
      storageConditions: productAny.storageConditions,
      dimensions: productAny.dimensions,
      supplierCode: productAny.supplierCode,
      cost: productAny.cost,
      expirationDate: productAny.expirationDate,
      warehouseId: productAny.warehouseId,
      fieldId: productAny.fieldId,
      description: productAny.description,
      notes: productAny.notes,
      createdAt: productAny.createdAt,
      updatedAt: productAny.updatedAt
    };
    
    return baseProduct;
  });

  // Estados locales
  const [selectedProduct, setSelectedProduct] = useState<ControllerProduct | null>(null);
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [dialogType, setDialogType] = useState<string>(''); // 'add-product', 'edit-product', 'view-product'
  const [filters, setFilters] = useState<Filters>({
    category: 'all',
    stockStatus: 'all',
    fieldId: 'all',
    expiringSoon: false,
    searchTerm: ''
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [filteredProductsList, setFilteredProductsList] = useState<ControllerProduct[]>([]);

  // Effect para manejar filtros desde URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const filterParam = urlParams.get('filter');
    
    if (filterParam === 'stock-low') {
      setFilters(prev => ({ ...prev, stockStatus: 'low' }));
    } else if (filterParam === 'expiring-soon') {
      setFilters(prev => ({ ...prev, expiringSoon: true }));
    }
    
    if (filterParam) {
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, []);

  // Función para añadir un producto con logging
  const addProduct = useCallback(async (productData: Partial<ControllerProduct>): Promise<string> => {
    try {
      console.log('Datos recibidos para guardar:', productData);
      
      // Preparar datos para Firestore
      const dbProductData = {
        name: productData.name,
        code: productData.code || null,
        category: productData.category,
        storageType: productData.storageType,
        unit: productData.unit,
        stock: Number(productData.stock) || 0,
        minStock: Number(productData.minStock) || 0,
        lotNumber: productData.lotNumber || null,
        storageConditions: productData.storageConditions || null,
        dimensions: productData.dimensions || null,
        supplierCode: productData.supplierCode || null,
        cost: productData.cost ? Number(productData.cost) : null,
        expirationDate: productData.expirationDate ? 
          (productData.expirationDate instanceof Date ? 
            Timestamp.fromDate(productData.expirationDate) : 
            productData.expirationDate) : null,
        warehouseId: productData.warehouseId || null,
        fieldId: productData.fieldId || null,
        description: productData.description || null,
        notes: productData.notes || null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      console.log('Datos preparados para Firestore:', dbProductData);
      
      // Guardar en Firestore
      const docRef = await addDoc(collection(db, 'products'), dbProductData);
      console.log('Producto guardado con ID:', docRef.id);
      
      // Registrar actividad
      await logProduct('create', {
        id: docRef.id,
        name: productData.name || '',
        category: productData.category || ''
      }, {
        initialStock: productData.stock || 0,
        minStock: productData.minStock || 0,
        unit: productData.unit,
        cost: productData.cost,
        warehouse: warehouses.find((w: any) => w.id === productData.warehouseId)?.name,
        field: fields.find((f: any) => f.id === productData.fieldId)?.name,
        storageType: productData.storageType,
        lotNumber: productData.lotNumber
      });
      
      // Recargar productos
      await loadProducts();
      
      return docRef.id;
    } catch (error: any) {
      console.error('Error al añadir producto:', error);
      setError('Error al añadir producto: ' + error.message);
      throw error;
    }
  }, [loadProducts, logProduct, warehouses, fields]);

  // NUEVO: Función para detectar cambios entre productos
  const detectProductChanges = useCallback((currentProduct: ControllerProduct, newData: Partial<ControllerProduct>): ProductChange[] => {
    const changes: ProductChange[] = [];
    
    const fieldsToMonitor: Record<string, string> = {
      name: 'Nombre',
      code: 'Código',
      category: 'Categoría',
      stock: 'Stock',
      minStock: 'Stock mínimo',
      cost: 'Costo',
      unit: 'Unidad',
      lotNumber: 'Número de lote',
      storageConditions: 'Condiciones de almacenamiento',
      dimensions: 'Dimensiones',
      supplierCode: 'Código de proveedor',
      description: 'Descripción',
      notes: 'Notas'
    };
    
    for (const [field, label] of Object.entries(fieldsToMonitor)) {
      const oldValue = (currentProduct as any)[field];
      const newValue = (newData as any)[field];
      
      if (oldValue !== newValue && !(oldValue == null && newValue == null)) {
        changes.push({
          field,
          label,
          oldValue: formatProductValue(oldValue, field),
          newValue: formatProductValue(newValue, field),
          type: getProductChangeType(field, oldValue, newValue)
        });
      }
    }
    
    // Cambios en fecha de expiración
    const oldExpiration = currentProduct.expirationDate 
      ? new Date(currentProduct.expirationDate.seconds ? currentProduct.expirationDate.seconds * 1000 : currentProduct.expirationDate)
      : null;
    const newExpiration = newData.expirationDate 
      ? new Date(newData.expirationDate.seconds ? newData.expirationDate.seconds * 1000 : newData.expirationDate)
      : null;
      
    if (oldExpiration && newExpiration && oldExpiration.getTime() !== newExpiration.getTime()) {
      changes.push({
        field: 'expirationDate',
        label: 'Fecha de expiración',
        oldValue: oldExpiration.toLocaleDateString('es-ES'),
        newValue: newExpiration.toLocaleDateString('es-ES'),
        type: 'date'
      });
    }
    
    // Cambios en almacén
    if (currentProduct.warehouseId !== newData.warehouseId) {
      const oldWarehouse = warehouses.find((w: any) => w.id === currentProduct.warehouseId)?.name || 'Sin almacén';
      const newWarehouse = warehouses.find((w: any) => w.id === newData.warehouseId)?.name || 'Sin almacén';
      changes.push({
        field: 'warehouseId',
        label: 'Almacén',
        oldValue: oldWarehouse,
        newValue: newWarehouse,
        type: 'location'
      });
    }
    
    // Cambios en campo
    if (currentProduct.fieldId !== newData.fieldId) {
      const oldField = fields.find((f: any) => f.id === currentProduct.fieldId)?.name || 'Sin campo';
      const newField = fields.find((f: any) => f.id === newData.fieldId)?.name || 'Sin campo';
      changes.push({
        field: 'fieldId',
        label: 'Campo',
        oldValue: oldField,
        newValue: newField,
        type: 'location'
      });
    }
    
    return changes;
  }, [warehouses, fields]);

  // NUEVO: Función para formatear valores según el tipo de campo
  const formatProductValue = (value: any, field: string): string => {
    if (value == null) return 'Sin definir';
    
    switch (field) {
      case 'stock':
      case 'minStock':
        return `${value} unidades`;
      case 'cost':
        return `$${value}`;
      default:
        return String(value);
    }
  };

  // NUEVO: Función para determinar el tipo de cambio
  const getProductChangeType = (field: string, oldValue: any, newValue: any): string => {
    switch (field) {
      case 'stock':
      case 'minStock':
        const oldNum = Number(oldValue) || 0;
        const newNum = Number(newValue) || 0;
        if (newNum > oldNum) return 'increase';
        if (newNum < oldNum) return 'decrease';
        return 'update';
      case 'cost':
        const oldCost = Number(oldValue) || 0;
        const newCost = Number(newValue) || 0;
        if (newCost > oldCost) return 'increase';
        if (newCost < oldCost) return 'decrease';
        return 'update';
      case 'warehouseId':
      case 'fieldId':
        return 'location';
      default:
        return 'update';
    }
  };

  // NUEVO: Función para generar resumen de cambios
  const generateChangesSummary = (changes: ProductChange[]): string => {
    const summaryParts: string[] = [];
    
    changes.forEach(change => {
      switch (change.type) {
        case 'increase':
          summaryParts.push(`${change.label}: ${change.oldValue} → ${change.newValue} (⬆️)`);
          break;
        case 'decrease':
          summaryParts.push(`${change.label}: ${change.oldValue} → ${change.newValue} (⬇️)`);
          break;
        case 'location':
          summaryParts.push(`${change.label}: ${change.oldValue} → ${change.newValue} (📍)`);
          break;
        default:
          summaryParts.push(`${change.label}: ${change.oldValue} → ${change.newValue}`);
      }
    });
    
    return summaryParts.join(', ');
  };

  // Función para actualizar un producto con logging detallado
  const updateProduct = useCallback(async (productId: string, productData: Partial<ControllerProduct>): Promise<string> => {
    try {
      // Obtener producto actual para comparar cambios
      const currentProduct = products.find(p => p.id === productId);
      
      if (!currentProduct) {
        throw new Error('Producto no encontrado');
      }
      
      // Preparar datos para actualización
      const updateData: any = {
        updatedAt: serverTimestamp()
      };
      
      // Solo incluir campos que han cambiado
      Object.keys(productData).forEach(key => {
        if (key !== 'id' && productData[key as keyof ControllerProduct] !== undefined) {
          if (key === 'cost' || key === 'stock' || key === 'minStock') {
            updateData[key] = Number(productData[key as keyof ControllerProduct]) || 0;
          } else if (key === 'expirationDate' && productData.expirationDate) {
            updateData[key] = productData.expirationDate instanceof Date ? 
              Timestamp.fromDate(productData.expirationDate) : 
              productData.expirationDate;
          } else {
            updateData[key] = productData[key as keyof ControllerProduct];
          }
        }
      });
      
      // Actualizar en Firestore
      await updateDoc(doc(db, 'products', productId), updateData);
      
      // Detectar y registrar cambios
      const changes = detectProductChanges(currentProduct, productData);
      
      if (changes.length > 0) {
        await logProduct('update', {
          id: productId,
          name: productData.name || currentProduct.name || '',
          category: productData.category || currentProduct.category || ''
        }, {
          changes: changes,
          changesCount: changes.length,
          changesSummary: generateChangesSummary(changes),
          stock: productData.stock || currentProduct.stock,
          previousStock: currentProduct.stock,
          cost: productData.cost || currentProduct.cost,
          previousCost: currentProduct.cost,
          warehouse: warehouses.find((w: any) => w.id === (productData.warehouseId || currentProduct.warehouseId))?.name,
          field: fields.find((f: any) => f.id === (productData.fieldId || currentProduct.fieldId))?.name
        });
      }
      
      // Recargar productos
      await loadProducts();
      
      return productId;
    } catch (error: any) {
      console.error(`Error al actualizar producto ${productId}:`, error);
      setError('Error al actualizar producto: ' + error.message);
      throw error;
    }
  }, [products, loadProducts, logProduct, warehouses, fields, detectProductChanges]);

  // Función para eliminar un producto con logging
  const deleteProduct = useCallback(async (productId: string): Promise<boolean> => {
    try {
      // Obtener datos del producto antes de eliminarlo
      const productDoc = await getDoc(doc(db, 'products', productId));
      const productData = productDoc.data();
      
      if (productData) {
        // Eliminar el documento
        await deleteDoc(doc(db, 'products', productId));
        
        // Registrar actividad
        await logProduct('delete', {
          id: productId,
          name: productData.name,
          category: productData.category
        }, {
          finalStock: productData.stock || 0,
          unit: productData.unit,
          warehouse: warehouses.find((w: any) => w.id === productData.warehouseId)?.name,
          field: fields.find((f: any) => f.id === productData.fieldId)?.name
        });
      } else {
        await deleteDoc(doc(db, 'products', productId));
      }
      
      // Recargar productos
      await loadProducts();
      
      return true;
    } catch (error: any) {
      console.error(`Error al eliminar producto ${productId}:`, error);
      setError('Error al eliminar producto: ' + error.message);
      throw error;
    }
  }, [loadProducts, logProduct, warehouses, fields]);

  // Función para cargar datos
  const loadData = useCallback(async (): Promise<void> => {
    try {
      setError('');
      
      if (fields.length === 0) {
        await loadFields();
      }
      
      if (warehouses.length === 0) {
        await loadWarehouses();
      }
      
      await loadProducts();
    } catch (err: any) {
      console.error('Error al cargar datos:', err);
      setError('Error al cargar datos: ' + err.message);
    }
  }, [loadFields, loadWarehouses, loadProducts, fields.length, warehouses.length]);

  // Actualizar estado de carga y error
  useEffect(() => {
    setLoading(stockLoading);
    if (stockError) {
      setError(stockError);
    }
  }, [stockLoading, stockError]);

  // Cargar datos al iniciar
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filtrar productos según filtros aplicados
  const getFilteredProducts = useCallback((): ControllerProduct[] => {
    if (!Array.isArray(products) || products.length === 0) return [];
    
    return products.filter(product => {
      // Filtro por categoría
      if (filters.category !== 'all' && product.category !== filters.category) {
        return false;
      }
      
      // Filtro por estado de stock
      if (filters.stockStatus !== 'all') {
        const stock = product.stock || 0;
        const minStock = product.minStock || 0;
        
        switch (filters.stockStatus) {
          case 'low':
            if (stock > minStock) return false;
            break;
          case 'normal':
            if (stock <= minStock || stock === 0) return false;
            break;
          case 'zero':
            if (stock !== 0) return false;
            break;
        }
      }
      
      // Filtro por campo
      if (filters.fieldId !== 'all' && product.fieldId !== filters.fieldId) {
        return false;
      }
      
      // Filtro por productos próximos a vencer
      if (filters.expiringSoon) {
        if (!product.expirationDate) return false;
        
        const expirationDate = new Date(product.expirationDate.seconds ? 
          product.expirationDate.seconds * 1000 : 
          product.expirationDate);
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
        
        if (expirationDate > thirtyDaysFromNow) return false;
      }
      
      // Filtro por término de búsqueda
      if (filters.searchTerm) {
        const term = filters.searchTerm.toLowerCase();
        return (
          (product.name && product.name.toLowerCase().includes(term)) ||
          (product.code && product.code.toLowerCase().includes(term)) ||
          (product.category && product.category.toLowerCase().includes(term)) ||
          (product.lotNumber && product.lotNumber.toLowerCase().includes(term))
        );
      }
      
      return true;
    });
  }, [products, filters]);

  // Actualizar productos filtrados cuando cambian los filtros o productos
  useEffect(() => {
    setFilteredProductsList(getFilteredProducts());
  }, [getFilteredProducts]);

  // Abrir diálogo para añadir producto
  const handleAddProduct = useCallback((): void => {
    setSelectedProduct(null);
    setDialogType('add-product');
    setDialogOpen(true);
  }, []);

  // Abrir diálogo para editar producto
  const handleEditProduct = useCallback((product: ControllerProduct): void => {
    setSelectedProduct(product);
    setDialogType('edit-product');
    setDialogOpen(true);
  }, []);

  // Abrir diálogo para ver producto
  const handleViewProduct = useCallback((product: ControllerProduct): void => {
    setSelectedProduct(product);
    setDialogType('view-product');
    setDialogOpen(true);
  }, []);

  // Eliminar producto con confirmación
  const handleDeleteProduct = useCallback(async (productId: string): Promise<void> => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este producto? Esta acción no se puede deshacer.')) {
      try {
        await deleteProduct(productId);
        
        // Cerrar diálogo si estaba abierto para este producto
        if (selectedProduct && selectedProduct.id === productId) {
          setDialogOpen(false);
        }
      } catch (err: any) {
        console.error('Error al eliminar producto:', err);
        setError('Error al eliminar producto: ' + err.message);
      }
    }
  }, [deleteProduct, selectedProduct]);

  // Guardar producto (crear o actualizar)
  const handleSaveProduct = useCallback(async (productData: Partial<ControllerProduct>): Promise<boolean> => {
    try {
      setError('');
      
      if (dialogType === 'add-product') {
        await addProduct(productData);
      } else if (dialogType === 'edit-product' && selectedProduct) {
        await updateProduct(selectedProduct.id, productData);
      }
      
      setDialogOpen(false);
      await loadData();
      return true;
    } catch (err: any) {
      console.error('Error al guardar producto:', err);
      setError('Error al guardar producto: ' + err.message);
      throw err;
    }
  }, [dialogType, selectedProduct, addProduct, updateProduct, loadData]);

  // Cambiar filtros
  const handleFilterChange = useCallback((filterName: string, value: any): void => {
    setFilters(prev => ({
      ...prev,
      [filterName]: value
    }));
  }, []);

  // Buscar por texto
  const handleSearch = useCallback((searchTerm: string): void => {
    setFilters(prev => ({
      ...prev,
      searchTerm
    }));
  }, []);

  // Cerrar diálogo
  const handleCloseDialog = useCallback((): void => {
    setDialogOpen(false);
    setSelectedProduct(null);
  }, []);

  // Limpiar filtros especiales
  const clearSpecialFilters = useCallback((): void => {
    setFilters(prev => ({
      ...prev,
      stockStatus: 'all',
      expiringSoon: false
    }));
  }, []);

  // Obtener categorías únicas para filtros
  const getUniqueCategories = useCallback((): string[] => {
    const categories = new Set<string>();
    
    products.forEach(product => {
      if (product.category) {
        categories.add(product.category);
      }
    });
    
    return Array.from(categories).sort();
  }, [products]);

  // Opciones para filtros
  const filterOptions: FilterOptions = {
    category: [
      { value: 'all', label: 'Todas las categorías' },
      ...getUniqueCategories().map(category => ({ value: category, label: category }))
    ],
    stockStatus: [
      { value: 'all', label: 'Todos los estados' },
      { value: 'low', label: 'Stock bajo' },
      { value: 'normal', label: 'Stock normal' },
      { value: 'zero', label: 'Sin stock' }
    ],
    field: [
      { value: 'all', label: 'Todos los campos' },
      ...fields.map((field: any) => ({ value: field.id, label: field.name }))
    ]
  };

  return {
    products: filteredProductsList,
    fields: Array.isArray(fields) ? fields : [],
    warehouses: Array.isArray(warehouses) ? warehouses : [],
    loading,
    error,
    selectedProduct,
    dialogOpen,
    dialogType,
    filterOptions,
    filters,
    handleAddProduct,
    handleEditProduct,
    handleViewProduct,
    handleDeleteProduct,
    handleSaveProduct,
    handleFilterChange,
    handleSearch,
    handleCloseDialog,
    clearSpecialFilters,
    refreshData: loadData
  };
};

export default useProductsController;