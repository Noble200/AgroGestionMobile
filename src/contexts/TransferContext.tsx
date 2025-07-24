// src/contexts/TransferContext.tsx - Contexto para gestión de transferencias
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
  Timestamp,
  runTransaction
} from 'firebase/firestore';
import { db } from '../api/firebase';
import { useAuth } from './AuthContext';

// Interfaces para TypeScript
interface Warehouse {
  id: string;
  name: string;
  type: string;
  location: string;
  capacity?: number;
  capacityUnit?: string;
}

interface TransferProduct {
  id?: string;
  productId: string;
  productName: string;
  quantity: number;
  quantityReceived?: number;
  unit: string;
  unitPrice?: number;
  totalValue?: number;
  notes?: string;
}

interface DateRange {
  start: string | null;
  end: string | null;
}

interface TransferFilters {
  status?: string;
  sourceWarehouse?: string;
  targetWarehouse?: string;
  dateRange?: DateRange;
  searchTerm?: string;
}

interface Transfer {
  id: string;
  transferNumber: string;
  sourceWarehouseId: string;
  targetWarehouseId: string;
  sourceWarehouse: Warehouse;
  targetWarehouse: Warehouse;
  products: TransferProduct[];
  distance: number;
  distanceUnit: string;
  transferCost: number;
  costPerUnit: number;
  status: string;
  requestedBy: string;
  requestDate: any; // Firebase Timestamp
  approvedBy: string;
  approvedDate: any | null;
  shippedBy: string;
  shippedDate: any | null;
  receivedBy: string;
  receivedDate: any | null;
  notes: string;
  rejectionReason: string;
  createdAt?: any;
  updatedAt?: any;
}

interface TransferContextType {
  transfers: Transfer[];
  loading: boolean;
  error: string;
  setError: (error: string) => void;
  loadTransfers: (filters?: TransferFilters) => Promise<Transfer[]>;
  addTransfer: (transferData: Partial<Transfer>) => Promise<string>;
  updateTransfer: (transferId: string, transferData: Partial<Transfer>) => Promise<string>;
  deleteTransfer: (transferId: string) => Promise<boolean>;
  approveTransfer: (transferId: string, approvedBy: string) => Promise<string>;
  rejectTransfer: (transferId: string, rejectionReason: string, rejectedBy: string) => Promise<string>;
  shipTransfer: (transferId: string, shippedBy: string) => Promise<string>;
  receiveTransfer: (transferId: string, receivedBy: string, receivedProducts?: TransferProduct[]) => Promise<string>;
  generateTransferNumber: () => string;
}

interface TransferProviderProps {
  children: ReactNode;
}

// Crear el contexto de transferencias
const TransferContext = createContext<TransferContextType | undefined>(undefined);

export function useTransfers(): TransferContextType {
  const context = useContext(TransferContext);
  if (context === undefined) {
    throw new Error('useTransfers must be used within a TransferProvider');
  }
  return context;
}

export function TransferProvider({ children }: TransferProviderProps) {
  const { currentUser } = useAuth();
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  // Cargar transferencias
  const loadTransfers = useCallback(async (filters: TransferFilters = {}): Promise<Transfer[]> => {
    try {
      setLoading(true);
      setError('');
      
      console.log('Cargando transferencias desde Firestore...'); // Debug
      
      // Crear consulta base
      const transfersQuery = query(collection(db, 'transfers'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(transfersQuery);
      
      // Mapear documentos a objetos de transferencias
      let transfersData: Transfer[] = [];
      querySnapshot.forEach((doc) => {
        const transferData = doc.data();
        transfersData.push({
          id: doc.id,
          transferNumber: transferData.transferNumber || '',
          sourceWarehouseId: transferData.sourceWarehouseId || '',
          targetWarehouseId: transferData.targetWarehouseId || '',
          sourceWarehouse: transferData.sourceWarehouse || {} as Warehouse,
          targetWarehouse: transferData.targetWarehouse || {} as Warehouse,
          products: transferData.products || [],
          distance: transferData.distance || 0,
          distanceUnit: transferData.distanceUnit || 'km',
          transferCost: transferData.transferCost || 0,
          costPerUnit: transferData.costPerUnit || 0, // Calculado automáticamente
          status: transferData.status || 'pending',
          requestedBy: transferData.requestedBy || '',
          requestDate: transferData.requestDate,
          approvedBy: transferData.approvedBy || '',
          approvedDate: transferData.approvedDate || null,
          shippedBy: transferData.shippedBy || '',
          shippedDate: transferData.shippedDate || null,
          receivedBy: transferData.receivedBy || '',
          receivedDate: transferData.receivedDate || null,
          notes: transferData.notes || '',
          rejectionReason: transferData.rejectionReason || '',
          createdAt: transferData.createdAt,
          updatedAt: transferData.updatedAt
        });
      });
      
      console.log('Total transferencias cargadas:', transfersData.length); // Debug
      
      // Aplicar filtros si se proporcionan
      if (filters.status) {
        transfersData = transfersData.filter(transfer => transfer.status === filters.status);
      }
      
      if (filters.sourceWarehouse) {
        transfersData = transfersData.filter(transfer => transfer.sourceWarehouseId === filters.sourceWarehouse);
      }

      if (filters.targetWarehouse) {
        transfersData = transfersData.filter(transfer => transfer.targetWarehouseId === filters.targetWarehouse);
      }
      
      if (filters.dateRange) {
        const { start, end } = filters.dateRange;
        transfersData = transfersData.filter(transfer => {
          const requestDate = transfer.requestDate
            ? new Date(transfer.requestDate.seconds ? transfer.requestDate.seconds * 1000 : transfer.requestDate)
            : null;
          
          if (!requestDate) return false;
          
          const startDate = start ? new Date(start) : null;
          const endDate = end ? new Date(end) : null;
          
          if (startDate && requestDate < startDate) return false;
          if (endDate && requestDate > endDate) return false;
          
          return true;
        });
      }
      
      if (filters.searchTerm) {
        const term = filters.searchTerm.toLowerCase();
        transfersData = transfersData.filter(transfer => 
          transfer.transferNumber.toLowerCase().includes(term) ||
          transfer.sourceWarehouse.name?.toLowerCase().includes(term) ||
          transfer.targetWarehouse.name?.toLowerCase().includes(term) ||
          transfer.requestedBy.toLowerCase().includes(term)
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

  // Generar número único de transferencia
  const generateTransferNumber = useCallback((): string => {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `TR-${timestamp}-${random}`;
  }, []);

  // Agregar nueva transferencia
  const addTransfer = useCallback(async (transferData: Partial<Transfer>): Promise<string> => {
    try {
      setError('');
      
      // Calcular costo por unidad si no está definido
      const totalQuantity = transferData.products?.reduce((sum, product) => sum + product.quantity, 0) || 1;
      const costPerUnit = (transferData.transferCost || 0) / totalQuantity;
      
      const newTransferData = {
        ...transferData,
        transferNumber: transferData.transferNumber || generateTransferNumber(),
        costPerUnit,
        status: 'pending',
        requestedBy: currentUser?.displayName || currentUser?.email || 'Usuario',
        requestDate: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      const newTransferRef = await addDoc(collection(db, 'transfers'), newTransferData);
      await loadTransfers();
      return newTransferRef.id;
    } catch (error: any) {
      console.error('Error al crear transferencia:', error);
      setError('Error al crear transferencia: ' + error.message);
      throw error;
    }
  }, [currentUser, generateTransferNumber, loadTransfers]);

  // Actualizar transferencia
  const updateTransfer = useCallback(async (transferId: string, transferData: Partial<Transfer>): Promise<string> => {
    try {
      setError('');
      
      // Recalcular costo por unidad si se actualizan productos o costo
      const updatedData = { ...transferData };
      if (transferData.products || transferData.transferCost !== undefined) {
        const totalQuantity = transferData.products?.reduce((sum, product) => sum + product.quantity, 0) || 1;
        updatedData.costPerUnit = (transferData.transferCost || 0) / totalQuantity;
      }
      
      await updateDoc(doc(db, 'transfers', transferId), {
        ...updatedData,
        updatedAt: serverTimestamp()
      });
      
      await loadTransfers();
      return transferId;
    } catch (error: any) {
      console.error('Error al actualizar transferencia:', error);
      setError('Error al actualizar transferencia: ' + error.message);
      throw error;
    }
  }, [loadTransfers]);

  // Eliminar transferencia
  const deleteTransfer = useCallback(async (transferId: string): Promise<boolean> => {
    try {
      setError('');
      await deleteDoc(doc(db, 'transfers', transferId));
      await loadTransfers();
      return true;
    } catch (error: any) {
      console.error('Error al eliminar transferencia:', error);
      setError('Error al eliminar transferencia: ' + error.message);
      throw error;
    }
  }, [loadTransfers]);

  // Aprobar transferencia
  const approveTransfer = useCallback(async (transferId: string, approvedBy: string): Promise<string> => {
    try {
      setError('');
      
      await updateDoc(doc(db, 'transfers', transferId), {
        status: 'approved',
        approvedBy: approvedBy,
        approvedDate: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      await loadTransfers();
      return transferId;
    } catch (error: any) {
      console.error('Error al aprobar transferencia:', error);
      setError('Error al aprobar transferencia: ' + error.message);
      throw error;
    }
  }, [loadTransfers]);

  // Rechazar transferencia
  const rejectTransfer = useCallback(async (transferId: string, rejectionReason: string, rejectedBy: string): Promise<string> => {
    try {
      setError('');
      
      await updateDoc(doc(db, 'transfers', transferId), {
        status: 'rejected',
        rejectionReason: rejectionReason,
        rejectedBy: rejectedBy,
        rejectedDate: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      await loadTransfers();
      return transferId;
    } catch (error: any) {
      console.error('Error al rechazar transferencia:', error);
      setError('Error al rechazar transferencia: ' + error.message);
      throw error;
    }
  }, [loadTransfers]);

  // Enviar transferencia (marcar como enviada)
  const shipTransfer = useCallback(async (transferId: string, shippedBy: string): Promise<string> => {
    try {
      setError('');
      
      // Realizar transacción para reducir stock del almacén origen
      await runTransaction(db, async (transaction) => {
        const transferRef = doc(db, 'transfers', transferId);
        const transferDoc = await transaction.get(transferRef);
        
        if (!transferDoc.exists()) {
          throw new Error('La transferencia no existe');
        }
        
        const transferData = transferDoc.data() as Transfer;
        
        // Reducir stock de productos en el almacén origen
        if (transferData.products && transferData.products.length > 0) {
          for (const transferProduct of transferData.products) {
            const productRef = doc(db, 'products', transferProduct.productId);
            const productDoc = await transaction.get(productRef);
            
            if (productDoc.exists()) {
              const productData = productDoc.data();
              const currentStock = productData.stock || 0;
              const quantityToShip = transferProduct.quantity || 0;
              
              // Verificar que hay suficiente stock
              if (currentStock < quantityToShip) {
                throw new Error(`Stock insuficiente para ${transferProduct.productName}. Disponible: ${currentStock}, Requerido: ${quantityToShip}`);
              }
              
              // Reducir stock
              const newStock = currentStock - quantityToShip;
              transaction.update(productRef, {
                stock: newStock,
                updatedAt: serverTimestamp()
              });
            }
          }
        }
        
        // Actualizar la transferencia
        transaction.update(transferRef, {
          status: 'shipped',
          shippedBy: shippedBy,
          shippedDate: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      });
      
      // Recargar transferencias
      await loadTransfers();
      
      return transferId;
    } catch (error: any) {
      console.error(`Error al enviar transferencia ${transferId}:`, error);
      setError('Error al enviar transferencia: ' + error.message);
      throw error;
    }
  }, [loadTransfers]);

  // Recibir transferencia
  const receiveTransfer = useCallback(async (
    transferId: string, 
    receivedBy: string, 
    receivedProducts?: TransferProduct[]
  ): Promise<string> => {
    try {
      setError('');
      
      // Realizar transacción para añadir stock al almacén destino
      await runTransaction(db, async (transaction) => {
        const transferRef = doc(db, 'transfers', transferId);
        const transferDoc = await transaction.get(transferRef);
        
        if (!transferDoc.exists()) {
          throw new Error('La transferencia no existe');
        }
        
        const transferData = transferDoc.data() as Transfer;
    
        // Usar productos recibidos o productos originales
        const productsToReceive = receivedProducts || transferData.products || [];
        
        // Añadir stock a productos en el almacén destino
        if (productsToReceive.length > 0) {
          for (const transferProduct of productsToReceive) {
            const productRef = doc(db, 'products', transferProduct.productId);
            const productDoc = await transaction.get(productRef);
            
            if (productDoc.exists()) {
              const productData = productDoc.data();
              const currentStock = productData.stock || 0;
              const quantityReceived = transferProduct.quantityReceived || transferProduct.quantity || 0;
              
              // Añadir al stock
              const newStock = currentStock + quantityReceived;
              transaction.update(productRef, {
                stock: newStock,
                // Actualizar almacén del producto al destino
                warehouseId: transferData.targetWarehouseId,
                updatedAt: serverTimestamp()
              });
            }
          }
        }
        
        // Actualizar la transferencia
        transaction.update(transferRef, {
          status: 'completed',
          receivedBy: receivedBy,
          receivedDate: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      });
      
      // Recargar transferencias
      await loadTransfers();
      
      return transferId;
    } catch (error: any) {
      console.error(`Error al recibir transferencia ${transferId}:`, error);
      setError('Error al recibir transferencia: ' + error.message);
      throw error;
    }
  }, [loadTransfers]);

  // Efecto para cargar datos iniciales
  useEffect(() => {
    if (!currentUser) {
      setTransfers([]);
      setLoading(false);
      return;
    }

    loadTransfers()
      .catch((err: any) => {
        console.error('Error al cargar datos iniciales de transferencias:', err);
        setError('Error al cargar datos: ' + err.message);
      });
  }, [currentUser, loadTransfers]);

  // Valor que se proporcionará a través del contexto
  const value: TransferContextType = {
    transfers,
    loading,
    error,
    setError,
    loadTransfers,
    addTransfer,
    updateTransfer,
    deleteTransfer,
    approveTransfer,
    rejectTransfer,
    shipTransfer,
    receiveTransfer,
    generateTransferNumber
  };

  return (
    <TransferContext.Provider value={value}>
      {children}
    </TransferContext.Provider>
  );
}

export default TransferContext;