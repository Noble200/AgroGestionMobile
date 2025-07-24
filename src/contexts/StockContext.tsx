// src/contexts/StockContext.tsx - Contexto corregido para productos
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy,
  where,
  serverTimestamp,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../api/firebase';
import { useAuth } from './AuthContext';

// Interfaces para TypeScript
interface Product {
  id: string;
  name: string;
  category: string;
  unit: string;
  stock: number;
  minStock: number;
  price: number;
  cost?: number;
  supplier?: string;
  code?: string;
  barcode?: string;
  lotNumber?: string;
  expiryDate?: any; // Timestamp de Firebase
  description?: string;
  notes?: string;
  status: string;
  createdAt?: any;
  updatedAt?: any;
  createdBy?: string;
}

interface Warehouse {
  id: string;
  name: string;
  type: string;
  location: string;
  fieldId: string;
  lotId: string;
  isFieldLevel: boolean;
  status: string;
  capacity: number;
  capacityUnit: string;
  storageCondition: string;
  temperature?: number | null;
  humidity?: number | null;
  supervisor: string;
  description: string;
  notes: string;
  createdAt?: any;
  updatedAt?: any;
}

interface Field {
  id: string;
  name: string;
  size: number;
  sizeUnit: string;
  location: string;
  soilType: string;
  cropType: string;
  status: string;
  lastActivity?: string;
  supervisor: string;
  description: string;
  notes: string;
  createdAt?: any;
  updatedAt?: any;
}

interface Transfer {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unit: string;
  fromLocationId: string;
  fromLocationName: string;
  fromLocationType: string;
  toLocationId: string;
  toLocationName: string;
  toLocationType: string;
  status: string;
  reason: string;
  notes: string;
  createdAt?: any;
  updatedAt?: any;
  createdBy?: string;
}

interface Fumigation {
  id: string;
  fieldId: string;
  fieldName: string;
  pestName: string;
  quantity: number;
  unit: string;
  method: string;
  date?: any;
  status: string;
  notes: string;
  createdAt?: any;
  updatedAt?: any;
  createdBy?: string;
}

interface Filters {
  category?: string;
  status?: string;
  lowStock?: boolean;
  searchTerm?: string;
  type?: string;
  fieldId?: string;
}

interface StockContextType {
  products: Product[];
  warehouses: Warehouse[];
  transfers: Transfer[];
  fumigations: Fumigation[];
  fields: Field[];
  loading: boolean;
  error: string;
  loadProducts: (filters?: Filters) => Promise<Product[]>;
  loadWarehouses: (filters?: Filters) => Promise<Warehouse[]>;
  loadFields: (filters?: Filters) => Promise<Field[]>;
  loadTransfers: (filters?: Filters) => Promise<Transfer[]>;
  loadFumigations: (filters?: Filters) => Promise<Fumigation[]>;
  createProduct: (productData: Partial<Product>) => Promise<string>;
  updateProduct: (productId: string, productData: Partial<Product>) => Promise<string>;
  deleteProduct: (productId: string) => Promise<boolean>;
  createWarehouse: (warehouseData: Partial<Warehouse>) => Promise<string>;
  updateWarehouse: (warehouseId: string, warehouseData: Partial<Warehouse>) => Promise<string>;
  deleteWarehouse: (warehouseId: string) => Promise<boolean>;
}

interface StockProviderProps {
  children: ReactNode;
}

// Crear el contexto de stock
const StockContext = createContext<StockContextType | undefined>(undefined);

export function useStock(): StockContextType {
  const context = useContext(StockContext);
  if (context === undefined) {
    throw new Error('useStock must be used within a StockProvider');
  }
  return context;
}

export function StockProvider({ children }: StockProviderProps) {
  const { currentUser } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [fumigations, setFumigations] = useState<Fumigation[]>([]);
  const [fields, setFields] = useState<Field[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  // Cargar productos - CORREGIDO
  const loadProducts = useCallback(async (filters: Filters = {}): Promise<Product[]> => {
    try {
      setLoading(true);
      setError('');
      
      console.log('Cargando productos desde Firestore...'); // Debug
      
      // Crear consulta base
      const productsQuery = query(collection(db, 'products'), orderBy('name'));
      const querySnapshot = await getDocs(productsQuery);
      
      // Mapear documentos a objetos de productos
      let productsData: Product[] = [];
      querySnapshot.forEach((doc) => {
        const productData = doc.data();
        productsData.push({
          id: doc.id,
          name: productData.name || '',
          category: productData.category || '',
          unit: productData.unit || 'kg',
          stock: productData.stock || 0,
          minStock: productData.minStock || 0,
          price: productData.price || 0,
          cost: productData.cost || 0,
          supplier: productData.supplier || '',
          code: productData.code || '',
          barcode: productData.barcode || '',
          lotNumber: productData.lotNumber || '',
          expiryDate: productData.expiryDate || null,
          description: productData.description || '',
          notes: productData.notes || '',
          status: productData.status || 'active',
          createdAt: productData.createdAt,
          updatedAt: productData.updatedAt,
          createdBy: productData.createdBy || ''
        });
      });
      
      console.log(`Productos cargados: ${productsData.length}`); // Debug
      
      // Aplicar filtros si se proporcionan
      if (filters.category) {
        productsData = productsData.filter(product => product.category === filters.category);
      }
      
      if (filters.status) {
        productsData = productsData.filter(product => product.status === filters.status);
      }
      
      if (filters.lowStock) {
        productsData = productsData.filter(product => product.stock <= product.minStock);
      }
      
      if (filters.searchTerm) {
        const term = filters.searchTerm.toLowerCase();
        productsData = productsData.filter(product => 
          product.name.toLowerCase().includes(term) || 
          (product.code && product.code.toLowerCase().includes(term)) ||
          (product.lotNumber && product.lotNumber.toLowerCase().includes(term))
        );
      }
      
      setProducts(productsData);
      return productsData;
    } catch (error: any) {
      console.error('Error al cargar productos:', error);
      setError('Error al cargar productos: ' + error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // Cargar almacenes
  const loadWarehouses = useCallback(async (filters: Filters = {}): Promise<Warehouse[]> => {
    try {
      setLoading(true);
      setError('');
      
      // Crear consulta base
      const warehousesQuery = query(collection(db, 'warehouses'), orderBy('name'));
      const querySnapshot = await getDocs(warehousesQuery);
      
      // Mapear documentos a objetos de almacenes
      let warehousesData: Warehouse[] = [];
      querySnapshot.forEach((doc) => {
        const warehouseData = doc.data();
        warehousesData.push({
          id: doc.id,
          name: warehouseData.name || '',
          type: warehouseData.type || 'shed',
          location: warehouseData.location || '',
          fieldId: warehouseData.fieldId || '',
          lotId: warehouseData.lotId || '',
          isFieldLevel: warehouseData.isFieldLevel !== undefined ? warehouseData.isFieldLevel : true,
          status: warehouseData.status || 'active',
          capacity: warehouseData.capacity || 0,
          capacityUnit: warehouseData.capacityUnit || 'ton',
          storageCondition: warehouseData.storageCondition || 'normal',
          temperature: warehouseData.temperature || null,
          humidity: warehouseData.humidity || null,
          supervisor: warehouseData.supervisor || '',
          description: warehouseData.description || '',
          notes: warehouseData.notes || '',
          createdAt: warehouseData.createdAt,
          updatedAt: warehouseData.updatedAt
        });
      });
      
      // Aplicar filtros si se proporcionan
      if (filters.status) {
        warehousesData = warehousesData.filter(warehouse => warehouse.status === filters.status);
      }
      
      if (filters.type) {
        warehousesData = warehousesData.filter(warehouse => warehouse.type === filters.type);
      }
      
      if (filters.fieldId) {
        warehousesData = warehousesData.filter(warehouse => warehouse.fieldId === filters.fieldId);
      }
      
      if (filters.searchTerm) {
        const term = filters.searchTerm.toLowerCase();
        warehousesData = warehousesData.filter(warehouse => 
          warehouse.name.toLowerCase().includes(term) || 
          warehouse.location.toLowerCase().includes(term)
        );
      }
      
      setWarehouses(warehousesData);
      return warehousesData;
    } catch (error: any) {
      console.error('Error al cargar almacenes:', error);
      setError('Error al cargar almacenes: ' + error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // Cargar campos
  const loadFields = useCallback(async (filters: Filters = {}): Promise<Field[]> => {
    try {
      setLoading(true);
      setError('');
      
      // Crear consulta base
      const fieldsQuery = query(collection(db, 'fields'), orderBy('name'));
      const querySnapshot = await getDocs(fieldsQuery);
      
      // Mapear documentos a objetos de campos
      let fieldsData: Field[] = [];
      querySnapshot.forEach((doc) => {
        const fieldData = doc.data();
        fieldsData.push({
          id: doc.id,
          name: fieldData.name || '',
          size: fieldData.size || 0,
          sizeUnit: fieldData.sizeUnit || 'hectares',
          location: fieldData.location || '',
          soilType: fieldData.soilType || '',
          cropType: fieldData.cropType || '',
          status: fieldData.status || 'active',
          lastActivity: fieldData.lastActivity || '',
          supervisor: fieldData.supervisor || '',
          description: fieldData.description || '',
          notes: fieldData.notes || '',
          createdAt: fieldData.createdAt,
          updatedAt: fieldData.updatedAt
        });
      });
      
      // Aplicar filtros si se proporcionan
      if (filters.status) {
        fieldsData = fieldsData.filter(field => field.status === filters.status);
      }
      
      if (filters.searchTerm) {
        const term = filters.searchTerm.toLowerCase();
        fieldsData = fieldsData.filter(field => 
          field.name.toLowerCase().includes(term) || 
          field.location.toLowerCase().includes(term) ||
          field.cropType.toLowerCase().includes(term)
        );
      }
      
      setFields(fieldsData);
      return fieldsData;
    } catch (error: any) {
      console.error('Error al cargar campos:', error);
      setError('Error al cargar campos: ' + error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // Cargar transferencias
  const loadTransfers = useCallback(async (filters: Filters = {}): Promise<Transfer[]> => {
    try {
      setLoading(true);
      setError('');
      
      // Crear consulta base
      const transfersQuery = query(collection(db, 'transfers'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(transfersQuery);
      
      // Mapear documentos a objetos de transferencias
      let transfersData: Transfer[] = [];
      querySnapshot.forEach((doc) => {
        const transferData = doc.data();
        transfersData.push({
          id: doc.id,
          productId: transferData.productId || '',
          productName: transferData.productName || '',
          quantity: transferData.quantity || 0,
          unit: transferData.unit || 'kg',
          fromLocationId: transferData.fromLocationId || '',
          fromLocationName: transferData.fromLocationName || '',
          fromLocationType: transferData.fromLocationType || '',
          toLocationId: transferData.toLocationId || '',
          toLocationName: transferData.toLocationName || '',
          toLocationType: transferData.toLocationType || '',
          status: transferData.status || 'pending',
          reason: transferData.reason || '',
          notes: transferData.notes || '',
          createdAt: transferData.createdAt,
          updatedAt: transferData.updatedAt,
          createdBy: transferData.createdBy || ''
        });
      });
      
      // Aplicar filtros si se proporcionan
      if (filters.status) {
        transfersData = transfersData.filter(transfer => transfer.status === filters.status);
      }
      
      if (filters.searchTerm) {
        const term = filters.searchTerm.toLowerCase();
        transfersData = transfersData.filter(transfer => 
          transfer.productName.toLowerCase().includes(term) || 
          transfer.fromLocationName.toLowerCase().includes(term) ||
          transfer.toLocationName.toLowerCase().includes(term)
        );
      }
      
      setTransfers(transfersData);
      return transfersData;
    } catch (error: any) {
      console.error('Error al cargar transferencias:', error);
      setError('Error al cargar transferencias: ' + error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // Cargar fumigaciones
  const loadFumigations = useCallback(async (filters: Filters = {}): Promise<Fumigation[]> => {
    try {
      setLoading(true);
      setError('');
      
      // Crear consulta base
      const fumigationsQuery = query(collection(db, 'fumigations'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(fumigationsQuery);
      
      // Mapear documentos a objetos de fumigaciones
      let fumigationsData: Fumigation[] = [];
      querySnapshot.forEach((doc) => {
        const fumigationData = doc.data();
        fumigationsData.push({
          id: doc.id,
          fieldId: fumigationData.fieldId || '',
          fieldName: fumigationData.fieldName || '',
          pestName: fumigationData.pestName || '',
          quantity: fumigationData.quantity || 0,
          unit: fumigationData.unit || 'L',
          method: fumigationData.method || '',
          date: fumigationData.date,
          status: fumigationData.status || 'planned',
          notes: fumigationData.notes || '',
          createdAt: fumigationData.createdAt,
          updatedAt: fumigationData.updatedAt,
          createdBy: fumigationData.createdBy || ''
        });
      });
      
      // Aplicar filtros si se proporcionan
      if (filters.status) {
        fumigationsData = fumigationsData.filter(fumigation => fumigation.status === filters.status);
      }
      
      if (filters.fieldId) {
        fumigationsData = fumigationsData.filter(fumigation => fumigation.fieldId === filters.fieldId);
      }
      
      if (filters.searchTerm) {
        const term = filters.searchTerm.toLowerCase();
        fumigationsData = fumigationsData.filter(fumigation => 
          fumigation.fieldName.toLowerCase().includes(term) || 
          fumigation.pestName.toLowerCase().includes(term)
        );
      }
      
      setFumigations(fumigationsData);
      return fumigationsData;
    } catch (error: any) {
      console.error('Error al cargar fumigaciones:', error);
      setError('Error al cargar fumigaciones: ' + error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // Crear producto
  const createProduct = useCallback(async (productData: Partial<Product>): Promise<string> => {
    try {
      setError('');
      const newProductRef = await addDoc(collection(db, 'products'), {
        ...productData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: currentUser?.uid
      });
      await loadProducts();
      return newProductRef.id;
    } catch (error: any) {
      setError('Error al crear producto: ' + error.message);
      throw error;
    }
  }, [currentUser?.uid, loadProducts]);

  // Actualizar producto
  const updateProduct = useCallback(async (productId: string, productData: Partial<Product>): Promise<string> => {
    try {
      setError('');
      await updateDoc(doc(db, 'products', productId), {
        ...productData,
        updatedAt: serverTimestamp()
      });
      await loadProducts();
      return productId;
    } catch (error: any) {
      setError('Error al actualizar producto: ' + error.message);
      throw error;
    }
  }, [loadProducts]);

  // Eliminar producto
  const deleteProduct = useCallback(async (productId: string): Promise<boolean> => {
    try {
      setError('');
      await deleteDoc(doc(db, 'products', productId));
      await loadProducts();
      return true;
    } catch (error: any) {
      setError('Error al eliminar producto: ' + error.message);
      throw error;
    }
  }, [loadProducts]);

  // Crear almacén
  const createWarehouse = useCallback(async (warehouseData: Partial<Warehouse>): Promise<string> => {
    try {
      setError('');
      const newWarehouseRef = await addDoc(collection(db, 'warehouses'), {
        ...warehouseData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      await loadWarehouses();
      return newWarehouseRef.id;
    } catch (error: any) {
      setError('Error al crear almacén: ' + error.message);
      throw error;
    }
  }, [loadWarehouses]);

  // Actualizar almacén
  const updateWarehouse = useCallback(async (warehouseId: string, warehouseData: Partial<Warehouse>): Promise<string> => {
    try {
      setError('');
      await updateDoc(doc(db, 'warehouses', warehouseId), {
        ...warehouseData,
        updatedAt: serverTimestamp()
      });
      await loadWarehouses();
      return warehouseId;
    } catch (error: any) {
      setError('Error al actualizar almacén: ' + error.message);
      throw error;
    }
  }, [loadWarehouses]);

  // Eliminar almacén
  const deleteWarehouse = useCallback(async (warehouseId: string): Promise<boolean> => {
    try {
      setError('');
      await deleteDoc(doc(db, 'warehouses', warehouseId));
      await loadWarehouses();
      return true;
    } catch (error: any) {
      setError('Error al eliminar almacén: ' + error.message);
      throw error;
    }
  }, [loadWarehouses]);

  // Cargar datos iniciales cuando el componente se monta
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoading(true);
        await Promise.all([
          loadProducts(),
          loadWarehouses(),
          loadFields()
        ]);
      } catch (error: any) {
        console.error('Error al cargar datos iniciales:', error);
        setError('Error al cargar datos: ' + error.message);
      } finally {
        setLoading(false);
      }
    };

    if (currentUser) {
      loadInitialData();
    }
  }, [currentUser, loadProducts, loadWarehouses, loadFields]);

  // Valor que se proporcionará a través del contexto
  const value: StockContextType = {
    products,
    warehouses,
    transfers,
    fumigations,
    fields,
    loading,
    error,
    loadProducts,
    loadWarehouses,
    loadFields,
    loadTransfers,
    loadFumigations,
    createProduct,
    updateProduct,
    deleteProduct,
    createWarehouse,
    updateWarehouse,
    deleteWarehouse
  };

  return (
    <StockContext.Provider value={value}>
      {children}
    </StockContext.Provider>
  );
}

export default StockContext;