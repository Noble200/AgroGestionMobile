// src/contexts/HarvestContext.tsx - Contexto corregido con integración de stock
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
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
  Timestamp,
  runTransaction
} from 'firebase/firestore';
import { db } from '../api/firebase';
import { useAuth } from './AuthContext';

// Tipos para HarvestContext
interface Lot {
  id: string;
  name: string;
  surface: number;
  crop?: string;
  [key: string]: any;
}

interface Field {
  id: string;
  name: string;
  establishment: string;
  lots?: Lot[];
  [key: string]: any;
}

interface Machinery {
  id: string;
  name: string;
  type: string;
  hours?: number;
}

interface SelectedProduct {
  productId: string;
  productName: string;
  category: string;
  quantity: number;
  unit: string;
  warehouseId?: string;
  warehouseName?: string;
  notes?: string;
}

interface HarvestedProduct {
  name: string;
  category: string;
  quantity: number;
  unit: string;
  warehouseId?: string;
  warehouseName?: string;
  storageLevel?: string;
  estimatedValue?: number;
  notes?: string;
}

interface Harvest {
  id: string;
  field: Field;
  fieldId: string;
  crop: string;
  lots: Lot[];
  totalArea: number;
  areaUnit: string;
  plannedDate: any;
  harvestDate?: any | null;
  status: 'pending' | 'in-progress' | 'completed' | 'cancelled';
  estimatedYield: number;
  actualYield: number;
  yieldUnit: string;
  totalHarvested: number;
  totalHarvestedUnit: string;
  harvestMethod: string;
  machinery: Machinery[];
  workers: string;
  targetWarehouse: string;
  destination: string;
  qualityNotes: string;
  weatherConditions: string;
  selectedProducts?: SelectedProduct[];
  harvestedProducts?: HarvestedProduct[];
  createdBy: string;
  createdAt: any;
  updatedAt: any;
}

interface HarvestData {
  field?: Field;
  fieldId: string;
  crop: string;
  lots: Lot[];
  totalArea: number;
  areaUnit?: string;
  plannedDate: any;
  harvestDate?: any;
  status?: 'pending' | 'in-progress' | 'completed' | 'cancelled';
  estimatedYield: number;
  actualYield?: number;
  yieldUnit?: string;
  totalHarvested?: number;
  totalHarvestedUnit?: string;
  harvestMethod: string;
  machinery?: Machinery[];
  workers?: string;
  targetWarehouse?: string;
  destination?: string;
  qualityNotes?: string;
  weatherConditions?: string;
  selectedProducts?: SelectedProduct[];
  harvestedProducts?: HarvestedProduct[];
  [key: string]: any;
}

interface CompletionData {
  actualYield: number;
  totalHarvested: number;
  harvestDate?: Date;
  harvestedProducts?: HarvestedProduct[];
  qualityNotes?: string;
  weatherConditions?: string;
}

interface HarvestFilters {
  status?: string;
  field?: string;
  crop?: string;
  dateRange?: {
    start?: string;
    end?: string;
  };
  searchTerm?: string;
}

interface HarvestProviderProps {
  children: React.ReactNode;
}

interface HarvestContextType {
  harvests: Harvest[];
  loading: boolean;
  error: string;
  setError: (error: string) => void;
  loadHarvests: (filters?: HarvestFilters) => Promise<Harvest[]>;
  addHarvest: (harvestData: HarvestData) => Promise<string>;
  updateHarvest: (harvestId: string, harvestData: Partial<HarvestData>) => Promise<string>;
  deleteHarvest: (harvestId: string) => Promise<boolean>;
  completeHarvest: (harvestId: string, completionData?: CompletionData) => Promise<string>;
}

// Crear el contexto de cosechas
const HarvestContext = createContext<HarvestContextType | undefined>(undefined);

export function useHarvests() {
  const context = useContext(HarvestContext);
  if (!context) {
    throw new Error('useHarvests must be used within a HarvestProvider');
  }
  return context;
}

export function HarvestProvider({ children }: HarvestProviderProps) {
  const { currentUser } = useAuth();
  const [harvests, setHarvests] = useState<Harvest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Cargar cosechas
  const loadHarvests = useCallback(async (filters: HarvestFilters = {}): Promise<Harvest[]> => {
    try {
      setLoading(true);
      setError('');
      
      console.log('Cargando cosechas desde Firestore...'); // Debug
      
      // Crear consulta base
      const harvestsQuery = query(collection(db, 'harvests'), orderBy('plannedDate', 'desc'));
      const querySnapshot = await getDocs(harvestsQuery);
      
      // Mapear documentos a objetos de cosechas
      let harvestsData: Harvest[] = [];
      querySnapshot.forEach((doc) => {
        const harvestData = doc.data();
        harvestsData.push({
          id: doc.id,
          field: harvestData.field || {},
          fieldId: harvestData.fieldId || '',
          crop: harvestData.crop || '',
          lots: harvestData.lots || [],
          totalArea: harvestData.totalArea || 0,
          areaUnit: harvestData.areaUnit || 'ha',
          plannedDate: harvestData.plannedDate,
          harvestDate: harvestData.harvestDate || null,
          status: harvestData.status || 'pending',
          estimatedYield: harvestData.estimatedYield || 0,
          actualYield: harvestData.actualYield || 0,
          yieldUnit: harvestData.yieldUnit || 'kg/ha',
          totalHarvested: harvestData.totalHarvested || 0,
          totalHarvestedUnit: harvestData.totalHarvestedUnit || 'kg',
          harvestMethod: harvestData.harvestMethod || '',
          machinery: harvestData.machinery || [],
          workers: harvestData.workers || '',
          targetWarehouse: harvestData.targetWarehouse || '',
          destination: harvestData.destination || '',
          qualityNotes: harvestData.qualityNotes || '',
          weatherConditions: harvestData.weatherConditions || '',
          selectedProducts: harvestData.selectedProducts || [],
          harvestedProducts: harvestData.harvestedProducts || [],
          createdBy: harvestData.createdBy || '',
          createdAt: harvestData.createdAt,
          updatedAt: harvestData.updatedAt
        });
      });
      
      console.log('Total cosechas cargadas:', harvestsData.length); // Debug
      
      // Aplicar filtros si se proporcionan
      if (filters.status) {
        harvestsData = harvestsData.filter(harvest => harvest.status === filters.status);
      }
      
      if (filters.field) {
        harvestsData = harvestsData.filter(harvest => 
          harvest.field?.name?.toLowerCase().includes(filters.field!.toLowerCase())
        );
      }
      
      if (filters.crop) {
        harvestsData = harvestsData.filter(harvest => 
          harvest.crop.toLowerCase().includes(filters.crop!.toLowerCase())
        );
      }
      
      if (filters.dateRange) {
        const { start, end } = filters.dateRange;
        harvestsData = harvestsData.filter(harvest => {
          const plannedDate = harvest.plannedDate
            ? new Date(harvest.plannedDate.seconds ? harvest.plannedDate.seconds * 1000 : harvest.plannedDate) 
            : null;
          
          if (!plannedDate) return false;
          
          return (!start || plannedDate >= new Date(start)) && 
                 (!end || plannedDate <= new Date(end));
        });
      }
      
      if (filters.searchTerm) {
        const term = filters.searchTerm.toLowerCase();
        harvestsData = harvestsData.filter(harvest => 
          (harvest.crop && harvest.crop.toLowerCase().includes(term)) || 
          (harvest.field && harvest.field.name && harvest.field.name.toLowerCase().includes(term)) ||
          (harvest.harvestMethod && harvest.harvestMethod.toLowerCase().includes(term))
        );
      }
      
      setHarvests(harvestsData);
      return harvestsData;
    } catch (error: any) {
      console.error('Error al cargar cosechas:', error);
      setError('Error al cargar cosechas: ' + error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // CORREGIDO: Añadir una cosecha con descuento de stock automático
  const addHarvest = useCallback(async (harvestData: HarvestData): Promise<string> => {
    try {
      setError('');
      
      console.log('Añadiendo cosecha con datos:', harvestData); // Debug
      
      // Usar transacción para asegurar consistencia
      const harvestId = await runTransaction(db, async (transaction) => {
        // Verificar y descontar stock de productos seleccionados
        if (harvestData.selectedProducts && harvestData.selectedProducts.length > 0) {
          console.log('Verificando stock de productos seleccionados...'); // Debug
          
          for (const selectedProduct of harvestData.selectedProducts) {
            const productRef = doc(db, 'products', selectedProduct.productId);
            const productDoc = await transaction.get(productRef);
            
            if (!productDoc.exists()) {
              throw new Error(`El producto con ID ${selectedProduct.productId} no existe`);
            }
            
            const productData = productDoc.data();
            const currentStock = productData?.stock || 0;
            const quantityToUse = selectedProduct.quantity || 0;
            
            console.log(`Producto: ${productData?.name}, Stock actual: ${currentStock}, Cantidad a usar: ${quantityToUse}`); // Debug
            
            // Verificar que hay suficiente stock
            if (currentStock < quantityToUse) {
              throw new Error(`No hay suficiente stock del producto ${productData?.name}. Stock disponible: ${currentStock}, requerido: ${quantityToUse}`);
            }
            
            // Descontar stock
            const newStock = currentStock - quantityToUse;
            transaction.update(productRef, {
              stock: newStock,
              updatedAt: serverTimestamp()
            });
            
            console.log(`Stock actualizado: ${currentStock} -> ${newStock}`); // Debug
          }
        }
        
        // Preparar datos de la cosecha
        const harvestDocData = {
          ...harvestData,
          status: harvestData.status || 'pending',
          areaUnit: harvestData.areaUnit || 'ha',
          yieldUnit: harvestData.yieldUnit || 'kg/ha',
          totalHarvestedUnit: harvestData.totalHarvestedUnit || 'kg',
          machinery: harvestData.machinery || [],
          selectedProducts: harvestData.selectedProducts || [],
          harvestedProducts: harvestData.harvestedProducts || [],
          createdBy: currentUser?.uid || '',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };
        
        // Convertir fechas si es necesario
        if (harvestData.plannedDate instanceof Date) {
          harvestDocData.plannedDate = Timestamp.fromDate(harvestData.plannedDate);
        }
        
        if (harvestData.harvestDate instanceof Date) {
          harvestDocData.harvestDate = Timestamp.fromDate(harvestData.harvestDate);
        }
        
        // Crear cosecha
        const harvestRef = doc(collection(db, 'harvests'));
        transaction.set(harvestRef, harvestDocData);
        
        return harvestRef.id;
      });
      
      console.log('Cosecha creada con ID:', harvestId); // Debug
      
      // Recargar cosechas
      await loadHarvests();
      
      return harvestId;
    } catch (error: any) {
      console.error('Error al crear cosecha:', error);
      setError('Error al crear cosecha: ' + error.message);
      throw error;
    }
  }, [currentUser, loadHarvests]);

  // Actualizar una cosecha
  const updateHarvest = useCallback(async (harvestId: string, harvestData: Partial<HarvestData>): Promise<string> => {
    try {
      setError('');
      
      console.log('Actualizando cosecha:', harvestId, harvestData); // Debug
      
      // Preparar datos de actualización
      const updateData = {
        ...harvestData,
        updatedAt: serverTimestamp()
      };
      
      // Convertir fechas si es necesario
      if (harvestData.plannedDate instanceof Date) {
        updateData.plannedDate = Timestamp.fromDate(harvestData.plannedDate);
      }
      
      if (harvestData.harvestDate instanceof Date) {
        updateData.harvestDate = Timestamp.fromDate(harvestData.harvestDate);
      }
      
      // Actualizar cosecha en Firestore
      await updateDoc(doc(db, 'harvests', harvestId), updateData);
      
      console.log('Cosecha actualizada:', harvestId); // Debug
      
      // Recargar cosechas
      await loadHarvests();
      
      return harvestId;
    } catch (error: any) {
      console.error(`Error al actualizar cosecha ${harvestId}:`, error);
      setError('Error al actualizar cosecha: ' + error.message);
      throw error;
    }
  }, [loadHarvests]);

  // Eliminar una cosecha
  const deleteHarvest = useCallback(async (harvestId: string): Promise<boolean> => {
    try {
      setError('');
      
      console.log('Eliminando cosecha:', harvestId); // Debug
      
      // Eliminar cosecha de Firestore
      await deleteDoc(doc(db, 'harvests', harvestId));
      
      console.log('Cosecha eliminada:', harvestId); // Debug
      
      // Recargar cosechas
      await loadHarvests();
      
      return true;
    } catch (error: any) {
      console.error(`Error al eliminar cosecha ${harvestId}:`, error);
      setError('Error al eliminar cosecha: ' + error.message);
      throw error;
    }
  }, [loadHarvests]);

  // Completar una cosecha con ingreso de productos al inventario
  const completeHarvest = useCallback(async (harvestId: string, completionData: CompletionData = {} as CompletionData): Promise<string> => {
    try {
      setError('');
      
      console.log('Completando cosecha:', harvestId, completionData); // Debug
      
      // Usar transacción para asegurar consistencia
      await runTransaction(db, async (transaction) => {
        // Obtener la cosecha actual
        const harvestRef = doc(db, 'harvests', harvestId);
        const harvestDoc = await transaction.get(harvestRef);
        
        if (!harvestDoc.exists()) {
          throw new Error('La cosecha no existe');
        }
        
        const harvestData = harvestDoc.data();
        
        console.log('Datos de cosecha:', harvestData); // Debug
        
        // Preparar datos de actualización
        const updateData: any = {
          status: 'completed',
          actualYield: completionData.actualYield || harvestData?.actualYield || 0,
          totalHarvested: completionData.totalHarvested || harvestData?.totalHarvested || 0,
          updatedAt: serverTimestamp()
        };
        
        // Agregar fecha de cosecha si se proporciona
        if (completionData.harvestDate instanceof Date) {
          updateData.harvestDate = Timestamp.fromDate(completionData.harvestDate);
        }
        
        // Agregar productos cosechados y notas si se proporcionan
        if (completionData.harvestedProducts) {
          updateData.harvestedProducts = completionData.harvestedProducts;
        }
        
        if (completionData.qualityNotes) {
          updateData.qualityNotes = completionData.qualityNotes;
        }
        
        if (completionData.weatherConditions) {
          updateData.weatherConditions = completionData.weatherConditions;
        }
        
        // Añadir productos cosechados al inventario
        if (completionData.harvestedProducts && completionData.harvestedProducts.length > 0) {
          console.log('Añadiendo productos al inventario...'); // Debug
          
          for (const harvestedProduct of completionData.harvestedProducts) {
            // Crear nuevo producto en el inventario
            const newProductData = {
              name: harvestedProduct.name,
              code: `COSECHA-${harvestId.substring(0, 8)}`,
              category: harvestedProduct.category || 'Cosecha',
              storageType: 'dry',
              unit: harvestedProduct.unit || 'kg',
              stock: harvestedProduct.quantity || 0,
              minStock: 0,
              storageConditions: 'Ambiente',
              warehouseId: harvestedProduct.warehouseId || harvestData?.targetWarehouse || '',
              storageLevel: harvestedProduct.storageLevel || 'warehouse',
              lotNumber: `COSECHA-${harvestId.substring(0, 8)}-${Date.now()}`,
              tags: ['cosecha', harvestData?.crop || 'cultivo'],
              notes: `Producto obtenido de cosecha de ${harvestData?.crop || 'cultivo'} el ${new Date().toLocaleDateString()}`,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            };
            
            console.log('Datos del nuevo producto:', newProductData); // Debug
            
            // Insertar nuevo producto
            const productRef = doc(collection(db, 'products'));
            transaction.set(productRef, newProductData);
            
            console.log('Producto añadido al inventario:', harvestedProduct.name); // Debug
          }
        }
        
        // Actualizar la cosecha
        transaction.update(harvestRef, updateData);
        
        console.log('Cosecha completada exitosamente'); // Debug
      });
      
      // Recargar cosechas
      await loadHarvests();
      
      return harvestId;
    } catch (error: any) {
      console.error(`Error al completar cosecha ${harvestId}:`, error);
      setError('Error al completar cosecha: ' + error.message);
      throw error;
    }
  }, [loadHarvests]);

  // Efecto para cargar datos iniciales
  useEffect(() => {
    if (!currentUser) {
      setHarvests([]);
      setLoading(false);
      return;
    }

    loadHarvests()
      .catch((err: any) => {
        console.error('Error al cargar datos iniciales de cosechas:', err);
        setError('Error al cargar datos: ' + err.message);
      });
  }, [currentUser, loadHarvests]);

  // Valor que se proporcionará a través del contexto
  const value: HarvestContextType = {
    harvests,
    loading,
    error,
    setError,
    loadHarvests,
    addHarvest,
    updateHarvest,
    deleteHarvest,
    completeHarvest
  };

  return (
    <HarvestContext.Provider value={value}>
      {children}
    </HarvestContext.Provider>
  );
}

export default HarvestContext;