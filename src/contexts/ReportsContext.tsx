// src/contexts/ReportsContext.tsx - Contexto para gestión de reportes
import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { 
  collection, 
  getDocs, 
  query, 
  orderBy,
  where,
  Timestamp
} from 'firebase/firestore';
import { db } from '../api/firebase';
import { useAuth } from './AuthContext';

// Interfaces para TypeScript
interface ReportFilters {
  startDate?: string;
  endDate?: string;
  category?: string;
  status?: string;
}

interface Product {
  id: string;
  name: string;
  category: string;
  unit: string;
  stock: number;
  minStock: number;
  price: number;
  createdAt: Date | null;
  updatedAt: Date | null;
  expiryDate: Date | null;
}

interface Activity {
  id: string;
  type: string;
  description: string;
  date: Date;
  status: string;
  details: any;
}

interface InventoryReport {
  fields: any[];
  warehouses: any[];
}

interface ReportsContextType {
  loading: boolean;
  error: string;
  setError: (error: string) => void;
  getProductsReport: (filters?: ReportFilters) => Promise<Product[]>;
  getTransfersReport: (filters?: ReportFilters) => Promise<any[]>;
  getFumigationsReport: (filters?: ReportFilters) => Promise<any[]>;
  getHarvestsReport: (filters?: ReportFilters) => Promise<any[]>;
  getPurchasesReport: (filters?: ReportFilters) => Promise<any[]>;
  getExpensesReport: (filters?: ReportFilters) => Promise<any[]>;
  getActivitiesReport: (filters?: ReportFilters) => Promise<Activity[]>;
  getInventoryReport: () => Promise<InventoryReport>;
}

interface ReportsProviderProps {
  children: ReactNode;
}

// Crear el contexto de reportes
const ReportsContext = createContext<ReportsContextType | undefined>(undefined);

export function useReports(): ReportsContextType {
  const context = useContext(ReportsContext);
  if (context === undefined) {
    throw new Error('useReports must be used within a ReportsProvider');
  }
  return context;
}

export function ReportsProvider({ children }: ReportsProviderProps) {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  // Función para obtener datos de productos con filtros
  const getProductsReport = useCallback(async (filters: ReportFilters = {}): Promise<Product[]> => {
    try {
      setLoading(true);
      setError('');
      
      console.log('Generando reporte de productos con filtros:', filters);
      
      let productsQuery = query(collection(db, 'products'), orderBy('name'));
      
      // Aplicar filtros de fecha si existen
      if (filters.startDate && filters.endDate) {
        const startDate = Timestamp.fromDate(new Date(filters.startDate));
        const endDate = Timestamp.fromDate(new Date(filters.endDate));
        
        productsQuery = query(
          collection(db, 'products'),
          where('createdAt', '>=', startDate),
          where('createdAt', '<=', endDate),
          orderBy('createdAt', 'desc')
        );
      }
      
      const querySnapshot = await getDocs(productsQuery);
      const products: Product[] = [];
      
      querySnapshot.forEach((doc) => {
        const productData = doc.data();
        products.push({
          id: doc.id,
          ...productData,
          // Convertir timestamps a fechas
          createdAt: productData.createdAt ? new Date(productData.createdAt.seconds * 1000) : null,
          updatedAt: productData.updatedAt ? new Date(productData.updatedAt.seconds * 1000) : null,
          expiryDate: productData.expiryDate ? new Date(productData.expiryDate.seconds * 1000) : null
        } as Product);
      });
      
      return products;
    } catch (error: any) {
      console.error('Error al generar reporte de productos:', error);
      setError('Error al generar reporte: ' + error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // Función para obtener datos de transferencias con filtros
  const getTransfersReport = useCallback(async (filters: ReportFilters = {}): Promise<any[]> => {
    try {
      setLoading(true);
      setError('');
      
      let transfersQuery = query(collection(db, 'transfers'), orderBy('createdAt', 'desc'));
      
      // Aplicar filtros de fecha si existen
      if (filters.startDate && filters.endDate) {
        const startDate = Timestamp.fromDate(new Date(filters.startDate));
        const endDate = Timestamp.fromDate(new Date(filters.endDate));
        
        transfersQuery = query(
          collection(db, 'transfers'),
          where('createdAt', '>=', startDate),
          where('createdAt', '<=', endDate),
          orderBy('createdAt', 'desc')
        );
      }
      
      const querySnapshot = await getDocs(transfersQuery);
      const transfers: any[] = [];
      
      querySnapshot.forEach((doc) => {
        const transferData = doc.data();
        transfers.push({
          id: doc.id,
          ...transferData,
          createdAt: transferData.createdAt ? new Date(transferData.createdAt.seconds * 1000) : null,
          updatedAt: transferData.updatedAt ? new Date(transferData.updatedAt.seconds * 1000) : null
        });
      });
      
      return transfers;
    } catch (error: any) {
      console.error('Error al generar reporte de transferencias:', error);
      setError('Error al generar reporte: ' + error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // Función para obtener datos de fumigaciones con filtros
  const getFumigationsReport = useCallback(async (filters: ReportFilters = {}): Promise<any[]> => {
    try {
      setLoading(true);
      setError('');
      
      let fumigationsQuery = query(collection(db, 'fumigations'), orderBy('createdAt', 'desc'));
      
      // Aplicar filtros de fecha si existen
      if (filters.startDate && filters.endDate) {
        const startDate = Timestamp.fromDate(new Date(filters.startDate));
        const endDate = Timestamp.fromDate(new Date(filters.endDate));
        
        fumigationsQuery = query(
          collection(db, 'fumigations'),
          where('createdAt', '>=', startDate),
          where('createdAt', '<=', endDate),
          orderBy('createdAt', 'desc')
        );
      }
      
      const querySnapshot = await getDocs(fumigationsQuery);
      const fumigations: any[] = [];
      
      querySnapshot.forEach((doc) => {
        const fumigationData = doc.data();
        fumigations.push({
          id: doc.id,
          ...fumigationData,
          createdAt: fumigationData.createdAt ? new Date(fumigationData.createdAt.seconds * 1000) : null,
          updatedAt: fumigationData.updatedAt ? new Date(fumigationData.updatedAt.seconds * 1000) : null,
          date: fumigationData.date ? new Date(fumigationData.date.seconds * 1000) : null
        });
      });
      
      return fumigations;
    } catch (error: any) {
      console.error('Error al generar reporte de fumigaciones:', error);
      setError('Error al generar reporte: ' + error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // Función para obtener datos de cosechas con filtros
  const getHarvestsReport = useCallback(async (filters: ReportFilters = {}): Promise<any[]> => {
    try {
      setLoading(true);
      setError('');
      
      let harvestsQuery = query(collection(db, 'harvests'), orderBy('createdAt', 'desc'));
      
      // Aplicar filtros de fecha si existen
      if (filters.startDate && filters.endDate) {
        const startDate = Timestamp.fromDate(new Date(filters.startDate));
        const endDate = Timestamp.fromDate(new Date(filters.endDate));
        
        harvestsQuery = query(
          collection(db, 'harvests'),
          where('createdAt', '>=', startDate),
          where('createdAt', '<=', endDate),
          orderBy('createdAt', 'desc')
        );
      }
      
      const querySnapshot = await getDocs(harvestsQuery);
      const harvests: any[] = [];
      
      querySnapshot.forEach((doc) => {
        const harvestData = doc.data();
        harvests.push({
          id: doc.id,
          ...harvestData,
          createdAt: harvestData.createdAt ? new Date(harvestData.createdAt.seconds * 1000) : null,
          updatedAt: harvestData.updatedAt ? new Date(harvestData.updatedAt.seconds * 1000) : null,
          date: harvestData.date ? new Date(harvestData.date.seconds * 1000) : null
        });
      });
      
      return harvests;
    } catch (error: any) {
      console.error('Error al generar reporte de cosechas:', error);
      setError('Error al generar reporte: ' + error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // Función para obtener datos de compras con filtros
  const getPurchasesReport = useCallback(async (filters: ReportFilters = {}): Promise<any[]> => {
    try {
      setLoading(true);
      setError('');
      
      let purchasesQuery = query(collection(db, 'purchases'), orderBy('createdAt', 'desc'));
      
      // Aplicar filtros de fecha si existen
      if (filters.startDate && filters.endDate) {
        const startDate = Timestamp.fromDate(new Date(filters.startDate));
        const endDate = Timestamp.fromDate(new Date(filters.endDate));
        
        purchasesQuery = query(
          collection(db, 'purchases'),
          where('createdAt', '>=', startDate),
          where('createdAt', '<=', endDate),
          orderBy('createdAt', 'desc')
        );
      }
      
      const querySnapshot = await getDocs(purchasesQuery);
      const purchases: any[] = [];
      
      querySnapshot.forEach((doc) => {
        const purchaseData = doc.data();
        purchases.push({
          id: doc.id,
          ...purchaseData,
          createdAt: purchaseData.createdAt ? new Date(purchaseData.createdAt.seconds * 1000) : null,
          updatedAt: purchaseData.updatedAt ? new Date(purchaseData.updatedAt.seconds * 1000) : null
        });
      });
      
      return purchases;
    } catch (error: any) {
      console.error('Error al generar reporte de compras:', error);
      setError('Error al generar reporte: ' + error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // Función para obtener datos de gastos con filtros
  const getExpensesReport = useCallback(async (filters: ReportFilters = {}): Promise<any[]> => {
    try {
      setLoading(true);
      setError('');
      
      let expensesQuery = query(collection(db, 'expenses'), orderBy('createdAt', 'desc'));
      
      // Aplicar filtros de fecha si existen
      if (filters.startDate && filters.endDate) {
        const startDate = Timestamp.fromDate(new Date(filters.startDate));
        const endDate = Timestamp.fromDate(new Date(filters.endDate));
        
        expensesQuery = query(
          collection(db, 'expenses'),
          where('createdAt', '>=', startDate),
          where('createdAt', '<=', endDate),
          orderBy('createdAt', 'desc')
        );
      }
      
      const querySnapshot = await getDocs(expensesQuery);
      const expenses: any[] = [];
      
      querySnapshot.forEach((doc) => {
        const expenseData = doc.data();
        expenses.push({
          id: doc.id,
          ...expenseData,
          createdAt: expenseData.createdAt ? new Date(expenseData.createdAt.seconds * 1000) : null,
          updatedAt: expenseData.updatedAt ? new Date(expenseData.updatedAt.seconds * 1000) : null
        });
      });
      
      return expenses;
    } catch (error: any) {
      console.error('Error al generar reporte de gastos:', error);
      setError('Error al generar reporte: ' + error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // Función para obtener un reporte unificado de todas las actividades
  const getActivitiesReport = useCallback(async (filters: ReportFilters = {}): Promise<Activity[]> => {
    try {
      setLoading(true);
      setError('');
      
      console.log('Generando reporte de actividades...');
      
      // Obtener datos de todas las actividades
      const [transfers, fumigations, harvests, purchases, expenses] = await Promise.all([
        getTransfersReport(filters),
        getFumigationsReport(filters),
        getHarvestsReport(filters),
        getPurchasesReport(filters),
        getExpensesReport(filters)
      ]);
      
      const activities: Activity[] = [];
      
      // Procesar transferencias
      transfers.forEach(transfer => {
        activities.push({
          id: transfer.id,
          type: 'transfer',
          description: `Transferencia de ${transfer.quantity} ${transfer.unit} de ${transfer.productName}`,
          date: transfer.createdAt || new Date(),
          status: transfer.status || 'completed',
          details: {
            productName: transfer.productName,
            quantity: transfer.quantity,
            unit: transfer.unit,
            from: transfer.fromLocationName,
            to: transfer.toLocationName,
            createdBy: transfer.createdBy
          }
        });
      });
      
      // Procesar fumigaciones
      fumigations.forEach(fumigation => {
        activities.push({
          id: fumigation.id,
          type: 'fumigation',
          description: `Fumigación en ${fumigation.fieldName} - ${fumigation.pestName}`,
          date: fumigation.date || fumigation.createdAt || new Date(),
          status: fumigation.status || 'completed',
          details: {
            fieldName: fumigation.fieldName,
            pestName: fumigation.pestName,
            quantity: fumigation.quantity,
            unit: fumigation.unit,
            method: fumigation.method,
            createdBy: fumigation.createdBy
          }
        });
      });
      
      // Procesar cosechas
      harvests.forEach(harvest => {
        activities.push({
          id: harvest.id,
          type: 'harvest',
          description: `Cosecha de ${harvest.quantity} ${harvest.unit} de ${harvest.productName}`,
          date: harvest.date || harvest.createdAt || new Date(),
          status: harvest.status || 'completed',
          details: {
            productName: harvest.productName,
            quantity: harvest.quantity,
            unit: harvest.unit,
            fieldName: harvest.fieldName,
            quality: harvest.quality,
            createdBy: harvest.createdBy
          }
        });
      });
      
      // Procesar compras
      purchases.forEach(purchase => {
        activities.push({
          id: purchase.id,
          type: 'purchase',
          description: `Compra de ${purchase.quantity} ${purchase.unit} de ${purchase.productName}`,
          date: purchase.createdAt || new Date(),
          status: 'completed',
          details: {
            productName: purchase.productName,
            quantity: purchase.quantity,
            unit: purchase.unit,
            totalAmount: purchase.totalAmount,
            supplier: purchase.supplier,
            createdBy: purchase.createdBy
          }
        });
      });
      
      // Procesar gastos
      expenses.forEach(expense => {
        activities.push({
          id: expense.id,
          type: 'expense',
          description: expense.type === 'product' ? 
            `Venta de ${expense.productName}` 
            : expense.description,
          date: expense.date || expense.createdAt || new Date(),
          status: 'completed',
          details: {
            type: expense.type,
            amount: expense.type === 'product' ? expense.totalAmount : expense.amount,
            category: expense.category || expense.productCategory,
            createdBy: expense.createdBy
          }
        });
      });
      
      // Ordenar actividades por fecha descendente
      activities.sort((a, b) => {
        const dateA = a.date ? new Date(a.date) : new Date(0);
        const dateB = b.date ? new Date(b.date) : new Date(0);
        return dateB.getTime() - dateA.getTime();
      });
      
      return activities;
    } catch (error: any) {
      console.error('Error al generar reporte de actividades:', error);
      setError('Error al generar reporte: ' + error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [getTransfersReport, getFumigationsReport, getHarvestsReport, getPurchasesReport, getExpensesReport]);

  // Función para obtener datos de campos y almacenes
  const getInventoryReport = useCallback(async (): Promise<InventoryReport> => {
    try {
      setLoading(true);
      setError('');
      
      // Obtener campos
      const fieldsSnapshot = await getDocs(query(collection(db, 'fields'), orderBy('name')));
      const fields: any[] = [];
      fieldsSnapshot.forEach(doc => {
        fields.push({ id: doc.id, ...doc.data() });
      });
      
      // Obtener almacenes
      const warehousesSnapshot = await getDocs(query(collection(db, 'warehouses'), orderBy('name')));
      const warehouses: any[] = [];
      warehousesSnapshot.forEach(doc => {
        warehouses.push({ id: doc.id, ...doc.data() });
      });
      
      return { fields, warehouses };
    } catch (error: any) {
      console.error('Error al generar reporte de inventario:', error);
      setError('Error al generar reporte: ' + error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // Valor que se proporcionará a través del contexto
  const value: ReportsContextType = {
    loading,
    error,
    setError,
    getProductsReport,
    getTransfersReport,
    getFumigationsReport,
    getHarvestsReport,
    getPurchasesReport,
    getExpensesReport,
    getActivitiesReport,
    getInventoryReport
  };

  return (
    <ReportsContext.Provider value={value}>
      {children}
    </ReportsContext.Provider>
  );
}

export default ReportsContext;