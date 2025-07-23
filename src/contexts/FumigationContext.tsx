// src/contexts/FumigationContext.tsx - CORREGIDO: Transacción Firestore
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
  runTransaction,
  getDoc
} from 'firebase/firestore';
import { db } from '../api/firebase';
import { useAuth } from './AuthContext';

// Tipos para FumigationContext
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

interface SelectedProduct {
  productId: string;
  productName: string;
  category: string;
  dosePerHectare: number;
  unit: string;
  totalQuantity: number;
  warehouseId?: string;
  warehouseName?: string;
  notes?: string;
}

interface WeatherConditions {
  temperature?: number;
  humidity?: number;
  windSpeed?: number;
  windDirection?: string;
  pressure?: number;
  precipitation?: string;
}

interface Fumigation {
  id: string;
  orderNumber: string;
  applicationDate: any;
  establishment: string;
  applicator: string;
  field: Field;
  fieldId: string;
  crop: string;
  lots: Lot[];
  totalSurface: number;
  surfaceUnit: string;
  selectedProducts: SelectedProduct[];
  applicationMethod: string;
  flowRate: number;
  observations: string;
  status: 'pending' | 'in-progress' | 'completed' | 'cancelled';
  startDateTime?: any;
  endDateTime?: any;
  weatherConditions?: WeatherConditions;
  completionNotes?: string;
  createdBy: string;
  createdAt: any;
  updatedAt: any;
}

interface FumigationData {
  orderNumber?: string;
  applicationDate: any;
  establishment: string;
  applicator: string;
  field?: Field;
  fieldId: string;
  crop: string;
  lots: Lot[];
  totalSurface: number;
  surfaceUnit?: string;
  selectedProducts: SelectedProduct[];
  applicationMethod: string;
  flowRate?: number;
  observations?: string;
  status?: 'pending' | 'in-progress' | 'completed' | 'cancelled';
  [key: string]: any;
}

interface CompletionData {
  startDateTime?: Date;
  endDateTime?: Date;
  weatherConditions?: WeatherConditions;
  completionNotes?: string;
}

interface FumigationFilters {
  status?: string;
  establishment?: string;
  field?: string;
  crop?: string;
  dateRange?: {
    start?: string;
    end?: string;
  };
  searchTerm?: string;
}

interface FumigationProviderProps {
  children: React.ReactNode;
}

interface FumigationContextType {
  fumigations: Fumigation[];
  loading: boolean;
  error: string;
  setError: (error: string) => void;
  loadFumigations: (filters?: FumigationFilters) => Promise<Fumigation[]>;
  addFumigation: (fumigationData: FumigationData) => Promise<string>;
  updateFumigation: (fumigationId: string, fumigationData: Partial<FumigationData>) => Promise<string>;
  deleteFumigation: (fumigationId: string) => Promise<boolean>;
  completeFumigation: (fumigationId: string, completionData?: CompletionData) => Promise<string>;
  generateOrderNumber: () => Promise<string>;
}

// Crear el contexto de fumigaciones
const FumigationContext = createContext<FumigationContextType | undefined>(undefined);

export function useFumigations() {
  const context = useContext(FumigationContext);
  if (!context) {
    throw new Error('useFumigations must be used within a FumigationProvider');
  }
  return context;
}

export function FumigationProvider({ children }: FumigationProviderProps) {
  const { currentUser } = useAuth();
  const [fumigations, setFumigations] = useState<Fumigation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Cargar fumigaciones
  const loadFumigations = useCallback(async (filters: FumigationFilters = {}): Promise<Fumigation[]> => {
    try {
      setLoading(true);
      setError('');
      
      // Crear consulta base
      const fumigationsQuery = query(collection(db, 'fumigations'), orderBy('applicationDate', 'desc'));
      const querySnapshot = await getDocs(fumigationsQuery);
      
      // Mapear documentos a objetos de fumigaciones
      let fumigationsData: Fumigation[] = [];
      querySnapshot.forEach((doc) => {
        const fumigationData = doc.data();
        fumigationsData.push({
          id: doc.id,
          orderNumber: fumigationData.orderNumber || '',
          applicationDate: fumigationData.applicationDate,
          establishment: fumigationData.establishment || '',
          applicator: fumigationData.applicator || '',
          field: fumigationData.field || {},
          fieldId: fumigationData.fieldId || '',
          crop: fumigationData.crop || '',
          lots: fumigationData.lots || [],
          totalSurface: fumigationData.totalSurface || 0,
          surfaceUnit: fumigationData.surfaceUnit || 'ha',
          selectedProducts: fumigationData.selectedProducts || [],
          applicationMethod: fumigationData.applicationMethod || '',
          flowRate: fumigationData.flowRate || 80,
          observations: fumigationData.observations || '',
          status: fumigationData.status || 'pending',
          startDateTime: fumigationData.startDateTime,
          endDateTime: fumigationData.endDateTime,
          weatherConditions: fumigationData.weatherConditions || {},
          completionNotes: fumigationData.completionNotes || '',
          createdBy: fumigationData.createdBy || '',
          createdAt: fumigationData.createdAt,
          updatedAt: fumigationData.updatedAt
        });
      });
      
      // Aplicar filtros si se proporcionan
      if (filters.status) {
        fumigationsData = fumigationsData.filter(fumigation => fumigation.status === filters.status);
      }
      
      if (filters.establishment) {
        fumigationsData = fumigationsData.filter(fumigation => 
          fumigation.establishment.toLowerCase().includes(filters.establishment!.toLowerCase())
        );
      }
      
      if (filters.field) {
        fumigationsData = fumigationsData.filter(fumigation => 
          fumigation.field?.name?.toLowerCase().includes(filters.field!.toLowerCase())
        );
      }
      
      if (filters.crop) {
        fumigationsData = fumigationsData.filter(fumigation => 
          fumigation.crop.toLowerCase().includes(filters.crop!.toLowerCase())
        );
      }
      
      if (filters.dateRange) {
        const { start, end } = filters.dateRange;
        fumigationsData = fumigationsData.filter(fumigation => {
          const appDate = fumigation.applicationDate
            ? new Date(fumigation.applicationDate.seconds ? fumigation.applicationDate.seconds * 1000 : fumigation.applicationDate)
            : null;
          
          if (!appDate) return false;
          
          return (!start || appDate >= new Date(start)) && 
                 (!end || appDate <= new Date(end));
        });
      }
      
      if (filters.searchTerm) {
        const term = filters.searchTerm.toLowerCase();
        fumigationsData = fumigationsData.filter(fumigation => 
          fumigation.orderNumber.toLowerCase().includes(term) ||
          fumigation.establishment.toLowerCase().includes(term) ||
          fumigation.applicator.toLowerCase().includes(term) ||
          fumigation.crop.toLowerCase().includes(term)
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

  // Generar número de orden automático
  const generateOrderNumber = useCallback(async (): Promise<string> => {
    try {
      const currentYear = new Date().getFullYear();
      const currentMonth = (new Date().getMonth() + 1).toString().padStart(2, '0');
      
      const fumigationsQuery = query(
        collection(db, 'fumigations'),
        where('orderNumber', '>=', `FUM-${currentYear}${currentMonth}-`),
        where('orderNumber', '<', `FUM-${currentYear}${currentMonth + 1}-`),
        orderBy('orderNumber', 'desc')
      );
      
      const querySnapshot = await getDocs(fumigationsQuery);
      
      let nextNumber = 1;
      if (!querySnapshot.empty) {
        const lastFumigation = querySnapshot.docs[0].data().orderNumber;
        const lastNumber = parseInt(lastFumigation.split('-')[2]) || 0;
        nextNumber = lastNumber + 1;
      }
      
      return `FUM-${currentYear}${currentMonth}-${nextNumber.toString().padStart(3, '0')}`;
    } catch (error: any) {
      console.error('Error al generar número de orden:', error);
      return `FUM-${new Date().getFullYear()}${(new Date().getMonth() + 1).toString().padStart(2, '0')}-001`;
    }
  }, []);

  // Añadir una fumigación
  const addFumigation = useCallback(async (fumigationData: FumigationData): Promise<string> => {
    try {
      setError('');
      
      console.log('Añadiendo fumigación con datos:', fumigationData); // Debug
      
      // Generar número de orden si no se proporciona
      if (!fumigationData.orderNumber) {
        fumigationData.orderNumber = await generateOrderNumber();
      }
      
      // Preparar datos de la fumigación
      const fumigationDocData = {
        ...fumigationData,
        status: fumigationData.status || 'pending',
        surfaceUnit: fumigationData.surfaceUnit || 'ha',
        flowRate: fumigationData.flowRate || 80,
        createdBy: currentUser?.uid || '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      // Convertir fecha si es necesario
      if (fumigationData.applicationDate instanceof Date) {
        fumigationDocData.applicationDate = Timestamp.fromDate(fumigationData.applicationDate);
      }
      
      // Crear fumigación en Firestore
      const docRef = await addDoc(collection(db, 'fumigations'), fumigationDocData);
      
      console.log('Fumigación creada con ID:', docRef.id); // Debug
      
      // Recargar fumigaciones
      await loadFumigations();
      
      return docRef.id;
    } catch (error: any) {
      console.error('Error al crear fumigación:', error);
      setError('Error al crear fumigación: ' + error.message);
      throw error;
    }
  }, [currentUser, generateOrderNumber, loadFumigations]);

  // Actualizar una fumigación
  const updateFumigation = useCallback(async (fumigationId: string, fumigationData: Partial<FumigationData>): Promise<string> => {
    try {
      setError('');
      
      console.log('Actualizando fumigación:', fumigationId, fumigationData); // Debug
      
      // Preparar datos de actualización
      const updateData = {
        ...fumigationData,
        updatedAt: serverTimestamp()
      };
      
      // Convertir fecha si es necesario
      if (fumigationData.applicationDate instanceof Date) {
        updateData.applicationDate = Timestamp.fromDate(fumigationData.applicationDate);
      }
      
      // Actualizar fumigación en Firestore
      await updateDoc(doc(db, 'fumigations', fumigationId), updateData);
      
      console.log('Fumigación actualizada:', fumigationId); // Debug
      
      // Recargar fumigaciones
      await loadFumigations();
      
      return fumigationId;
    } catch (error: any) {
      console.error(`Error al actualizar fumigación ${fumigationId}:`, error);
      setError('Error al actualizar fumigación: ' + error.message);
      throw error;
    }
  }, [loadFumigations]);

  // Eliminar una fumigación
  const deleteFumigation = useCallback(async (fumigationId: string): Promise<boolean> => {
    try {
      setError('');
      
      console.log('Eliminando fumigación:', fumigationId); // Debug
      
      // Eliminar fumigación de Firestore
      await deleteDoc(doc(db, 'fumigations', fumigationId));
      
      console.log('Fumigación eliminada:', fumigationId); // Debug
      
      // Recargar fumigaciones
      await loadFumigations();
      
      return true;
    } catch (error: any) {
      console.error(`Error al eliminar fumigación ${fumigationId}:`, error);
      setError('Error al eliminar fumigación: ' + error.message);
      throw error;
    }
  }, [loadFumigations]);

  // Completar una fumigación con descuento de stock
  const completeFumigation = useCallback(async (fumigationId: string, completionData: CompletionData = {}): Promise<string> => {
    try {
      setError('');
      
      console.log('Completando fumigación:', fumigationId, completionData); // Debug
      
      // Usar transacción para asegurar consistencia
      await runTransaction(db, async (transaction) => {
        // Obtener la fumigación actual
        const fumigationRef = doc(db, 'fumigations', fumigationId);
        const fumigationDoc = await transaction.get(fumigationRef);
        
        if (!fumigationDoc.exists()) {
          throw new Error('La fumigación no existe');
        }
        
        const fumigationData = fumigationDoc.data();
        
        console.log('Datos de fumigación:', fumigationData); // Debug
        
        // Descontar stock de productos utilizados
        if (fumigationData?.selectedProducts && fumigationData.selectedProducts.length > 0) {
          console.log('Descontando stock de productos...'); // Debug
          
          for (const selectedProduct of fumigationData.selectedProducts) {
            if (selectedProduct.productId && selectedProduct.totalQuantity > 0) {
              const productRef = doc(db, 'products', selectedProduct.productId);
              const productDoc = await transaction.get(productRef);
              
              if (productDoc.exists()) {
                const productData = productDoc.data();
                const currentStock = productData?.stock || 0;
                const quantityToDeduct = selectedProduct.totalQuantity || 0;
                
                console.log(`Producto: ${selectedProduct.productName}, Stock actual: ${currentStock}, Cantidad a descontar: ${quantityToDeduct}`); // Debug
                
                // Verificar que hay suficiente stock
                if (currentStock >= quantityToDeduct) {
                  const newStock = currentStock - quantityToDeduct;
                  transaction.update(productRef, {
                    stock: newStock,
                    updatedAt: serverTimestamp()
                  });
                  
                  console.log(`Stock actualizado: ${currentStock} -> ${newStock}`); // Debug
                } else {
                  console.warn(`Stock insuficiente para ${selectedProduct.productName}. Stock: ${currentStock}, Requerido: ${quantityToDeduct}`);
                  // Continuar sin lanzar error para no interrumpir la fumigación
                }
              }
            }
          }
        }
        
        // Preparar datos de actualización
        const updateData: any = {
          status: 'completed',
          updatedAt: serverTimestamp()
        };
        
        // Agregar datos de completado si se proporcionan
        if (Object.keys(completionData).length > 0) {
          if (completionData.startDateTime instanceof Date) {
            updateData.startDateTime = Timestamp.fromDate(completionData.startDateTime);
          }
          
          if (completionData.endDateTime instanceof Date) {
            updateData.endDateTime = Timestamp.fromDate(completionData.endDateTime);
          }
          
          updateData.weatherConditions = completionData.weatherConditions || {};
          updateData.completionNotes = completionData.completionNotes || '';
        }
        
        console.log('Actualizando fumigación con:', updateData); // Debug
        
        // Actualizar la fumigación
        transaction.update(fumigationRef, updateData);
        
        console.log('Transacción completada exitosamente'); // Debug
      });
      
      console.log('Fumigación completada, recargando datos...'); // Debug
      
      // Recargar fumigaciones
      await loadFumigations();
      
      console.log('Datos recargados'); // Debug
      
      return fumigationId;
    } catch (error: any) {
      console.error(`Error al completar fumigación ${fumigationId}:`, error);
      setError('Error al completar fumigación: ' + error.message);
      throw error;
    }
  }, [loadFumigations]);

  // Efecto para cargar datos iniciales
  useEffect(() => {
    if (!currentUser) {
      setFumigations([]);
      setLoading(false);
      return;
    }

    console.log('Cargando fumigaciones iniciales...'); // Debug
    
    loadFumigations()
      .then(() => {
        console.log('Fumigaciones cargadas exitosamente'); // Debug
      })
      .catch((err: any) => {
        console.error('Error al cargar datos iniciales de fumigaciones:', err);
        setError('Error al cargar datos: ' + err.message);
      });
  }, [currentUser, loadFumigations]);

  // Valor que se proporcionará a través del contexto
  const value: FumigationContextType = {
    fumigations,
    loading,
    error,
    setError,
    loadFumigations,
    addFumigation,
    updateFumigation,
    deleteFumigation,
    completeFumigation,
    generateOrderNumber
  };

  return (
    <FumigationContext.Provider value={value}>
      {children}
    </FumigationContext.Provider>
  );
}

export default FumigationContext;