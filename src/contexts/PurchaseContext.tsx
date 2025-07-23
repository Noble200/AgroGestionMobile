// src/contexts/PurchaseContext.tsx - Contexto para gestión de compras - CORREGIDO
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

// Tipos para PurchaseContext
interface PurchaseProduct {
  productId: string;
  productName: string;
  category: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  unit: string;
  warehouseId?: string;
  warehouseName?: string;
  notes?: string;
}

interface DeliveryProduct {
  productId: string;
  productName: string;
  quantityOrdered: number;
  quantity: number;
  quantityReceived?: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  warehouseId?: string;
  warehouseName?: string;
  condition?: string;
  notes?: string;
}

interface Delivery {
  id: string;
  deliveryNumber: string;
  expectedDate: any;
  deliveredDate?: any;
  products: DeliveryProduct[];
  status: 'pending' | 'in_transit' | 'completed' | 'cancelled';
  transportCompany?: string;
  trackingNumber?: string;
  receivedBy?: string;
  notes?: string;
  cancelledAt?: any;
  cancellationReason?: string;
  createdAt: any;
  updatedAt: any;
}

interface Purchase {
  id: string;
  purchaseNumber: string;
  supplier: string;
  purchaseDate: any;
  products: PurchaseProduct[];
  totalProducts: number;
  freight: number;
  taxes: number;
  totalAmount: number;
  status: 'pending' | 'approved' | 'partial_delivered' | 'completed' | 'cancelled';
  deliveries: Delivery[];
  totalDelivered: number;
  totalPending: number;
  approvedBy?: string;
  approvedDate?: any;
  notes?: string;
  invoiceNumber?: string;
  invoiceDate?: any;
  createdBy: string;
  createdAt: any;
  updatedAt: any;
}

interface PurchaseData {
  purchaseNumber?: string;
  supplier: string;
  purchaseDate: any;
  products: PurchaseProduct[];
  totalProducts: number;
  freight?: number;
  taxes?: number;
  totalAmount: number;
  status?: 'pending' | 'approved' | 'partial_delivered' | 'completed' | 'cancelled';
  notes?: string;
  invoiceNumber?: string;
  invoiceDate?: any;
  [key: string]: any;
}

interface DeliveryData {
  expectedDate: any;
  products: DeliveryProduct[];
  transportCompany?: string;
  trackingNumber?: string;
  notes?: string;
}

interface PurchaseFilters {
  status?: string;
  supplier?: string;
  dateRange?: {
    start?: string;
    end?: string;
  };
  searchTerm?: string;
}

interface PurchaseProviderProps {
  children: React.ReactNode;
}

interface PurchaseContextType {
  purchases: Purchase[];
  loading: boolean;
  error: string;
  setError: (error: string) => void;
  loadPurchases: (filters?: PurchaseFilters) => Promise<Purchase[]>;
  addPurchase: (purchaseData: PurchaseData) => Promise<string>;
  updatePurchase: (purchaseId: string, purchaseData: Partial<PurchaseData>) => Promise<string>;
  deletePurchase: (purchaseId: string) => Promise<boolean>;
  createDelivery: (purchaseId: string, deliveryData: DeliveryData) => Promise<string>;
  completeDelivery: (purchaseId: string, deliveryId: string, receivedProducts?: DeliveryProduct[], receivedBy?: string) => Promise<boolean>;
  cancelDelivery: (purchaseId: string, deliveryId: string, reason?: string) => Promise<boolean>;
  generatePurchaseNumber: () => Promise<string>;
}

// Crear el contexto de compras
const PurchaseContext = createContext<PurchaseContextType | undefined>(undefined);

export function usePurchases() {
  const context = useContext(PurchaseContext);
  if (!context) {
    throw new Error('usePurchases must be used within a PurchaseProvider');
  }
  return context;
}

export function PurchaseProvider({ children }: PurchaseProviderProps) {
  const { currentUser } = useAuth();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Cargar compras
  const loadPurchases = useCallback(async (filters: PurchaseFilters = {}): Promise<Purchase[]> => {
    try {
      setLoading(true);
      setError('');
      
      console.log('Cargando compras desde Firestore...'); // Debug
      
      // Crear consulta base
      const purchasesQuery = query(collection(db, 'purchases'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(purchasesQuery);
      
      // Mapear documentos a objetos de compras
      let purchasesData: Purchase[] = [];
      querySnapshot.forEach((doc) => {
        const purchaseData = doc.data();
        purchasesData.push({
          id: doc.id,
          purchaseNumber: purchaseData.purchaseNumber || '',
          supplier: purchaseData.supplier || '',
          purchaseDate: purchaseData.purchaseDate,
          products: purchaseData.products || [],
          totalProducts: purchaseData.totalProducts || 0,
          freight: purchaseData.freight || 0,
          taxes: purchaseData.taxes || 0,
          totalAmount: purchaseData.totalAmount || 0,
          status: purchaseData.status || 'pending',
          deliveries: purchaseData.deliveries || [],
          totalDelivered: purchaseData.totalDelivered || 0,
          totalPending: purchaseData.totalPending || 0,
          approvedBy: purchaseData.approvedBy || '',
          approvedDate: purchaseData.approvedDate,
          notes: purchaseData.notes || '',
          invoiceNumber: purchaseData.invoiceNumber || '',
          invoiceDate: purchaseData.invoiceDate,
          createdBy: purchaseData.createdBy || '',
          createdAt: purchaseData.createdAt,
          updatedAt: purchaseData.updatedAt
        });
      });
      
      console.log('Total compras cargadas:', purchasesData.length); // Debug
      
      // Aplicar filtros si se proporcionan
      if (filters.status) {
        purchasesData = purchasesData.filter(purchase => purchase.status === filters.status);
      }
      
      if (filters.supplier) {
        purchasesData = purchasesData.filter(purchase => 
          purchase.supplier.toLowerCase().includes(filters.supplier!.toLowerCase())
        );
      }
      
      if (filters.dateRange) {
        const { start, end } = filters.dateRange;
        purchasesData = purchasesData.filter(purchase => {
          const purchaseDate = purchase.purchaseDate
            ? new Date(purchase.purchaseDate.seconds ? purchase.purchaseDate.seconds * 1000 : purchase.purchaseDate)
            : null;
          
          if (!purchaseDate) return false;
          
          return (!start || purchaseDate >= new Date(start)) && 
                 (!end || purchaseDate <= new Date(end));
        });
      }
      
      if (filters.searchTerm) {
        const term = filters.searchTerm.toLowerCase();
        purchasesData = purchasesData.filter(purchase => 
          purchase.purchaseNumber.toLowerCase().includes(term) ||
          purchase.supplier.toLowerCase().includes(term) ||
          (purchase.invoiceNumber && purchase.invoiceNumber.toLowerCase().includes(term))
        );
      }
      
      setPurchases(purchasesData);
      return purchasesData;
    } catch (error: any) {
      console.error('Error al cargar compras:', error);
      setError('Error al cargar compras: ' + error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // Generar número de compra automático
  const generatePurchaseNumber = useCallback(async (): Promise<string> => {
    try {
      const currentYear = new Date().getFullYear();
      const currentMonth = (new Date().getMonth() + 1).toString().padStart(2, '0');
      
      const purchasesQuery = query(
        collection(db, 'purchases'),
        where('purchaseNumber', '>=', `COMP-${currentYear}${currentMonth}-`),
        where('purchaseNumber', '<', `COMP-${currentYear}${currentMonth + 1}-`),
        orderBy('purchaseNumber', 'desc')
      );
      
      const querySnapshot = await getDocs(purchasesQuery);
      
      let nextNumber = 1;
      if (!querySnapshot.empty) {
        const lastPurchase = querySnapshot.docs[0].data().purchaseNumber;
        const lastNumber = parseInt(lastPurchase.split('-')[2]) || 0;
        nextNumber = lastNumber + 1;
      }
      
      return `COMP-${currentYear}${currentMonth}-${nextNumber.toString().padStart(4, '0')}`;
    } catch (error: any) {
      console.error('Error al generar número de compra:', error);
      return `COMP-${new Date().getFullYear()}${(new Date().getMonth() + 1).toString().padStart(2, '0')}-0001`;
    }
  }, []);

  // Añadir una compra
  const addPurchase = useCallback(async (purchaseData: PurchaseData): Promise<string> => {
    try {
      setError('');
      
      console.log('Añadiendo compra con datos:', purchaseData); // Debug
      
      // Generar número de compra si no se proporciona
      if (!purchaseData.purchaseNumber) {
        purchaseData.purchaseNumber = await generatePurchaseNumber();
      }
      
      // Preparar datos de la compra
      const purchaseDocData = {
        ...purchaseData,
        status: purchaseData.status || 'pending',
        freight: purchaseData.freight || 0,
        taxes: purchaseData.taxes || 0,
        deliveries: [],
        totalDelivered: 0,
        totalPending: purchaseData.totalProducts,
        createdBy: currentUser?.uid || '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      // Convertir fechas si es necesario
      if (purchaseData.purchaseDate instanceof Date) {
        purchaseDocData.purchaseDate = Timestamp.fromDate(purchaseData.purchaseDate);
      }
      
      if (purchaseData.invoiceDate instanceof Date) {
        purchaseDocData.invoiceDate = Timestamp.fromDate(purchaseData.invoiceDate);
      }
      
      // Crear compra en Firestore
      const docRef = await addDoc(collection(db, 'purchases'), purchaseDocData);
      
      console.log('Compra creada con ID:', docRef.id); // Debug
      
      // Recargar compras
      await loadPurchases();
      
      return docRef.id;
    } catch (error: any) {
      console.error('Error al crear compra:', error);
      setError('Error al crear compra: ' + error.message);
      throw error;
    }
  }, [currentUser, generatePurchaseNumber, loadPurchases]);

  // Actualizar una compra
  const updatePurchase = useCallback(async (purchaseId: string, purchaseData: Partial<PurchaseData>): Promise<string> => {
    try {
      setError('');
      
      console.log('Actualizando compra:', purchaseId, purchaseData); // Debug
      
      // Preparar datos de actualización
      const updateData = {
        ...purchaseData,
        updatedAt: serverTimestamp()
      };
      
      // Convertir fechas si es necesario
      if (purchaseData.purchaseDate instanceof Date) {
        updateData.purchaseDate = Timestamp.fromDate(purchaseData.purchaseDate);
      }
      
      if (purchaseData.invoiceDate instanceof Date) {
        updateData.invoiceDate = Timestamp.fromDate(purchaseData.invoiceDate);
      }
      
      // Actualizar compra en Firestore
      await updateDoc(doc(db, 'purchases', purchaseId), updateData);
      
      console.log('Compra actualizada:', purchaseId); // Debug
      
      // Recargar compras
      await loadPurchases();
      
      return purchaseId;
    } catch (error: any) {
      console.error(`Error al actualizar compra ${purchaseId}:`, error);
      setError('Error al actualizar compra: ' + error.message);
      throw error;
    }
  }, [loadPurchases]);

  // Eliminar una compra
  const deletePurchase = useCallback(async (purchaseId: string): Promise<boolean> => {
    try {
      setError('');
      
      console.log('Eliminando compra:', purchaseId); // Debug
      
      // Eliminar compra de Firestore
      await deleteDoc(doc(db, 'purchases', purchaseId));
      
      console.log('Compra eliminada:', purchaseId); // Debug
      
      // Recargar compras
      await loadPurchases();
      
      return true;
    } catch (error: any) {
      console.error(`Error al eliminar compra ${purchaseId}:`, error);
      setError('Error al eliminar compra: ' + error.message);
      throw error;
    }
  }, [loadPurchases]);

  // Crear una entrega
  const createDelivery = useCallback(async (purchaseId: string, deliveryData: DeliveryData): Promise<string> => {
    try {
      setError('');
      
      console.log('Creando entrega para compra:', purchaseId, deliveryData); // Debug
      
      // Usar transacción para asegurar consistencia
      const deliveryId = await runTransaction(db, async (transaction) => {
        const purchaseRef = doc(db, 'purchases', purchaseId);
        const purchaseDoc = await transaction.get(purchaseRef);
        
        if (!purchaseDoc.exists()) {
          throw new Error('La compra no existe');
        }
        
        const purchaseData = purchaseDoc.data();
        const currentTimestamp = new Date();
        
        // Crear nueva entrega
        const newDelivery: Delivery = {
          id: `delivery-${Date.now()}`,
          deliveryNumber: `ENT-${purchaseData?.purchaseNumber}-${(purchaseData?.deliveries?.length || 0) + 1}`,
          expectedDate: deliveryData.expectedDate instanceof Date 
            ? Timestamp.fromDate(deliveryData.expectedDate) 
            : deliveryData.expectedDate,
          products: deliveryData.products,
          status: 'pending',
          transportCompany: deliveryData.transportCompany || '',
          trackingNumber: deliveryData.trackingNumber || '',
          notes: deliveryData.notes || '',
          createdAt: Timestamp.fromDate(currentTimestamp),
          updatedAt: Timestamp.fromDate(currentTimestamp)
        };
        
        // Añadir la nueva entrega
        const updatedDeliveries = [...(purchaseData?.deliveries || []), newDelivery];
        
        transaction.update(purchaseRef, {
          deliveries: updatedDeliveries,
          updatedAt: serverTimestamp()
        });
        
        return newDelivery.id;
      });
      
      console.log('Entrega creada con ID:', deliveryId); // Debug
      
      // Recargar compras
      await loadPurchases();
      
      return deliveryId;
    } catch (error: any) {
      console.error(`Error al crear entrega para compra ${purchaseId}:`, error);
      setError('Error al crear entrega: ' + error.message);
      throw error;
    }
  }, [loadPurchases]);

  // Completar una entrega (añadir productos al inventario)
  const completeDelivery = useCallback(async (
    purchaseId: string, 
    deliveryId: string, 
    receivedProducts?: DeliveryProduct[], 
    receivedBy?: string
  ): Promise<boolean> => {
    try {
      setError('');
      
      console.log('Completando entrega:', deliveryId, 'de compra:', purchaseId); // Debug
      
      // Usar transacción para asegurar consistencia
      await runTransaction(db, async (transaction) => {
        const purchaseRef = doc(db, 'purchases', purchaseId);
        const purchaseDoc = await transaction.get(purchaseRef);
        
        if (!purchaseDoc.exists()) {
          throw new Error('La compra no existe');
        }
        
        const purchaseData = purchaseDoc.data();
        const currentTimestamp = new Date();
        
        // Encontrar y actualizar la entrega
        const updatedDeliveries = purchaseData?.deliveries?.map((d: any) => 
          d.id === deliveryId 
            ? { 
                ...d, 
                status: 'completed', 
                deliveredDate: Timestamp.fromDate(currentTimestamp),
                receivedBy: receivedBy || currentUser?.uid || '',
                products: receivedProducts || d.products
              }
            : d
        );
        
        // Añadir productos al inventario
        if (receivedProducts && receivedProducts.length > 0) {
          for (const product of receivedProducts) {
            if (product.quantityReceived && product.quantityReceived > 0) {
              const productRef = doc(db, 'products', product.productId);
              const productDoc = await transaction.get(productRef);
              
              if (productDoc.exists()) {
                const productData = productDoc.data();
                const currentStock = productData?.stock || 0;
                const newStock = currentStock + product.quantityReceived;
                
                transaction.update(productRef, {
                  stock: newStock,
                  warehouseId: product.warehouseId || productData?.warehouseId,
                  updatedAt: serverTimestamp()
                });
              }
            }
          }
        }
        
        // Recalcular totales
        const totalDelivered = updatedDeliveries
          ?.filter((delivery: any) => delivery.status === 'completed')
          .reduce((sum: number, delivery: any) => {
            return sum + delivery.products.reduce((prodSum: number, product: any) => 
              prodSum + (product.quantityReceived || product.quantity || 0), 0);
          }, 0) || 0;
        
        const totalPurchased = purchaseData?.totalProducts || 0;
        const totalPending = totalPurchased - totalDelivered;
        
        // Determinar nuevo estado
        let newStatus = 'approved';
        if (totalDelivered === totalPurchased) {
          newStatus = 'completed';
        } else if (totalDelivered > 0) {
          newStatus = 'partial_delivered';
        }
        
        transaction.update(purchaseRef, {
          deliveries: updatedDeliveries,
          totalDelivered: totalDelivered,
          totalPending: totalPending,
          status: newStatus,
          updatedAt: serverTimestamp()
        });
      });
      
      await loadPurchases();
      return true;
    } catch (error: any) {
      console.error(`Error al completar entrega ${deliveryId}:`, error);
      setError('Error al completar entrega: ' + error.message);
      throw error;
    }
  }, [currentUser, loadPurchases]);

  // Cancelar una entrega
  const cancelDelivery = useCallback(async (purchaseId: string, deliveryId: string, reason?: string): Promise<boolean> => {
    try {
      setError('');
      
      console.log('Cancelando entrega:', deliveryId, 'Razón:', reason); // Debug
      
      // Usar transacción para asegurar consistencia
      await runTransaction(db, async (transaction) => {
        const purchaseRef = doc(db, 'purchases', purchaseId);
        const purchaseDoc = await transaction.get(purchaseRef);
        
        if (!purchaseDoc.exists()) {
          throw new Error('La compra no existe');
        }
        
        const purchaseData = purchaseDoc.data();
        const currentTimestamp = new Date();
        
        // Actualizar la entrega cancelada
        const updatedDeliveries = purchaseData?.deliveries?.map((d: any) => 
          d.id === deliveryId 
            ? { 
                ...d, 
                status: 'cancelled', 
                cancelledAt: Timestamp.fromDate(currentTimestamp),
                cancellationReason: reason 
              }
            : d
        );
        
        // Recalcular totales
        const totalDelivered = updatedDeliveries
          ?.filter((delivery: any) => delivery.status === 'completed')
          .reduce((sum: number, delivery: any) => {
            return sum + delivery.products.reduce((prodSum: number, product: any) => prodSum + (product.quantity || 0), 0);
          }, 0) || 0;
        
        const totalInTransit = updatedDeliveries
          ?.filter((delivery: any) => delivery.status === 'in_transit')
          .reduce((sum: number, delivery: any) => {
            return sum + delivery.products.reduce((prodSum: number, product: any) => prodSum + (product.quantity || 0), 0);
          }, 0) || 0;
        
        const totalPurchased = purchaseData?.totalProducts || 0;
        const totalPending = totalPurchased - totalDelivered - totalInTransit;
        
        // Determinar nuevo estado
        let newStatus = 'approved';
        if (totalDelivered === totalPurchased) {
          newStatus = 'completed';
        } else if (totalDelivered > 0) {
          newStatus = 'partial_delivered';
        }
        
        transaction.update(purchaseRef, {
          deliveries: updatedDeliveries,
          totalDelivered: totalDelivered,
          totalPending: totalPending,
          status: newStatus,
          updatedAt: serverTimestamp()
        });
      });
      
      await loadPurchases();
      return true;
    } catch (error: any) {
      console.error(`Error al cancelar entrega ${deliveryId}:`, error);
      setError('Error al cancelar entrega: ' + error.message);
      throw error;
    }
  }, [loadPurchases]);

  // Efecto para cargar datos iniciales
  useEffect(() => {
    if (!currentUser) {
      setPurchases([]);
      setLoading(false);
      return;
    }

    console.log('Cargando compras iniciales...'); // Debug
    
    loadPurchases()
      .then(() => {
        console.log('Compras cargadas exitosamente'); // Debug
      })
      .catch((err: any) => {
        console.error('Error al cargar datos iniciales de compras:', err);
        setError('Error al cargar datos: ' + err.message);
      });
  }, [currentUser, loadPurchases]);

  // Valor que se proporcionará a través del contexto
  const value: PurchaseContextType = {
    purchases,
    loading,
    error,
    setError,
    loadPurchases,
    addPurchase,
    updatePurchase,
    deletePurchase,
    createDelivery,
    completeDelivery,
    cancelDelivery,
    generatePurchaseNumber
  };

  return (
    <PurchaseContext.Provider value={value}>
      {children}
    </PurchaseContext.Provider>
  );
}

export default PurchaseContext;