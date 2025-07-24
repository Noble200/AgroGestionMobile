// src/controllers/DashboardController.tsx - Controlador del Dashboard sin actividades recientes
import { useState, useEffect, useCallback } from 'react';
import { useStock } from '../contexts/StockContext';
import { useHarvests } from '../contexts/HarvestContext';
import { useFumigations } from '../contexts/FumigationContext';
import { useTransfers } from '../contexts/TransferContext';

// Interfaces para TypeScript
interface Product {
  id: string;
  name: string;
  stock?: number;
  minStock?: number;
  expiryDate?: any; // Firebase Timestamp
  category?: string;
  unit?: string;
  price?: number;
  warehouseId?: string;
  [key: string]: any;
}

interface Warehouse {
  id: string;
  name: string;
  type?: string;
  location?: string;
  capacity?: number;
  [key: string]: any;
}

interface Transfer {
  id: string;
  status: string;
  productName?: string;
  sourceWarehouseId?: string;
  targetWarehouseId?: string;
  quantity?: number;
  unit?: string;
  requestDate?: any;
  [key: string]: any;
}

interface Fumigation {
  id: string;
  status: string;
  fieldName?: string;
  pestName?: string;
  applicationDate?: any;
  plannedDate?: any;
  [key: string]: any;
}

interface Harvest {
  id: string;
  status: string;
  productName?: string;
  fieldName?: string;
  harvestDate?: any;
  plannedDate?: any;
  estimatedQuantity?: number;
  [key: string]: any;
}

interface DashboardStats {
  totalProducts: number;
  lowStockCount: number;
  expiringCount: number;
  warehouseCount: number;
  pendingTransfersCount: number;
  pendingFumigationsCount: number;
  upcomingHarvestsCount: number;
}

interface UseDashboardControllerReturn {
  stats: DashboardStats;
  lowStockProducts: Product[];
  expiringSoonProducts: Product[];
  pendingTransfers: Transfer[];
  pendingFumigations: Fumigation[];
  upcomingHarvests: Harvest[];
  loading: boolean;
  error: string;
  refreshData: () => Promise<void>;
}

const useDashboardController = (): UseDashboardControllerReturn => {
  const { 
    products = [], 
    warehouses = [], 
    loading: stockLoading, 
    error: stockError, 
    loadProducts,
    loadWarehouses
  } = useStock();
  
  const {
    harvests = [],
    loading: harvestsLoading,
    error: harvestsError,
    loadHarvests
  } = useHarvests();

  const {
    fumigations = [],
    loading: fumigationsLoading,
    error: fumigationsError,
    loadFumigations
  } = useFumigations();

  const {
    transfers = [],
    loading: transfersLoading,
    error: transfersError,
    loadTransfers
  } = useTransfers();
  
  const [stats, setStats] = useState<DashboardStats>({
    totalProducts: 0,
    lowStockCount: 0,
    expiringCount: 0,
    warehouseCount: 0,
    pendingTransfersCount: 0,
    pendingFumigationsCount: 0,
    upcomingHarvestsCount: 0
  });
  
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);
  const [expiringSoonProducts, setExpiringSoonProducts] = useState<Product[]>([]);
  const [pendingTransfers, setPendingTransfers] = useState<Transfer[]>([]);
  const [pendingFumigations, setPendingFumigations] = useState<Fumigation[]>([]);
  const [upcomingHarvests, setUpcomingHarvests] = useState<Harvest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  
  // Calcular estadísticas y listas filtradas con verificación de arrays
  const processData = useCallback(() => {
    console.log('Procesando datos del dashboard...'); // Debug
    
    // Verificar que products sea un array antes de usar filter
    if (!Array.isArray(products)) {
      console.warn('Products no es un array:', products);
      setLowStockProducts([]);
      setExpiringSoonProducts([]);
      setStats(prev => ({ ...prev, totalProducts: 0, lowStockCount: 0, expiringCount: 0 }));
      return;
    }
    
    // Calcular productos con stock bajo usando casting temporal
    const lowStock = products.filter(product => {
      const productAny = product as any;
      const currentStock = productAny.stock || 0;
      const minStock = productAny.minStock || 0;
      return currentStock <= minStock && minStock > 0;
    }).slice(0, 5);
    
    // Calcular productos próximos a vencer (próximos 30 días)
    const currentDate = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(currentDate.getDate() + 30);
    
    const expiringSoon = products
      .filter(product => {
        const productAny = product as any;
        const expiryDate = productAny.expiryDate 
          ? new Date(productAny.expiryDate.seconds ? productAny.expiryDate.seconds * 1000 : productAny.expiryDate)
          : null;
        
        return expiryDate && expiryDate <= thirtyDaysFromNow && expiryDate >= currentDate;
      })
      .sort((a, b) => {
        const aAny = a as any;
        const bAny = b as any;
        const dateA = aAny.expiryDate 
          ? new Date(aAny.expiryDate.seconds ? aAny.expiryDate.seconds * 1000 : aAny.expiryDate)
          : new Date(0);
        const dateB = bAny.expiryDate 
          ? new Date(bAny.expiryDate.seconds ? bAny.expiryDate.seconds * 1000 : bAny.expiryDate)
          : new Date(0);
        return dateA.getTime() - dateB.getTime();
      })
      .slice(0, 5);
    
    // Verificar que transfers sea un array
    let pendingTransfs: Transfer[] = [];
    if (Array.isArray(transfers)) {
      pendingTransfs = transfers.filter(transfer => {
        const transferAny = transfer as any;
        return transferAny.status === 'pending' || transferAny.status === 'approved';
      }).slice(0, 5);
    }
    
    // Verificar que fumigations sea un array
    let pendingFumigs: Fumigation[] = [];
    if (Array.isArray(fumigations)) {
      pendingFumigs = fumigations.filter(fumigation => {
        const fumigationAny = fumigation as any;
        return fumigationAny.status === 'planned' || fumigationAny.status === 'pending';
      }).slice(0, 5);
    }
    
    // Verificar que harvests sea un array
    let upcoming: Harvest[] = [];
    if (Array.isArray(harvests)) {
      upcoming = harvests.filter(harvest => {
        const harvestAny = harvest as any;
        return harvestAny.status === 'planned' || harvestAny.status === 'pending';
      }).slice(0, 5);
    }
    
    setLowStockProducts(lowStock as Product[]);
    setExpiringSoonProducts(expiringSoon as Product[]);
    setPendingTransfers(pendingTransfs);
    setPendingFumigations(pendingFumigs);
    setUpcomingHarvests(upcoming);
    
    setStats({
      totalProducts: products.length,
      lowStockCount: products.filter(product => {
        const productAny = product as any;
        const currentStock = productAny.stock || 0;
        const minStock = productAny.minStock || 0;
        return currentStock <= minStock && minStock > 0;
      }).length,
      expiringCount: expiringSoon.length,
      warehouseCount: Array.isArray(warehouses) ? warehouses.length : 0,
      pendingTransfersCount: pendingTransfs.length,
      pendingFumigationsCount: pendingFumigs.length,
      upcomingHarvestsCount: upcoming.length
    });
    
  }, [products, warehouses, transfers, fumigations, harvests]);
  
  // Función para obtener el nombre de un almacén por ID
  const getWarehouseName = useCallback((warehouseId: string): string => {
    if (!Array.isArray(warehouses) || !warehouseId) {
      return 'Almacén desconocido';
    }
    
    const warehouse = warehouses.find(w => {
      const warehouseAny = w as any;
      return warehouseAny.id === warehouseId;
    });
    
    return warehouse ? (warehouse as any).name : 'Almacén desconocido';
  }, [warehouses]);
  
  // Evaluar estados de carga y error
  useEffect(() => {
    const isLoading = stockLoading || harvestsLoading || fumigationsLoading || transfersLoading;
    setLoading(isLoading);
    
    if (stockError) {
      setError(stockError);
    } else if (harvestsError) {
      setError(harvestsError);
    } else if (fumigationsError) {
      setError(fumigationsError);
    } else if (transfersError) {
      setError(transfersError);
    } else {
      setError('');
    }
  }, [stockLoading, harvestsLoading, fumigationsLoading, transfersLoading,
      stockError, harvestsError, fumigationsError, transfersError]);
  
  // Cargar datos cuando cambien las dependencias
  useEffect(() => {
    if (!loading) {
      processData();
    }
  }, [products, warehouses, transfers, fumigations, harvests, loading, processData]);
  
  // Función para recargar datos
  const refreshData = useCallback(async (): Promise<void> => {
    try {
      setError('');
      await Promise.all([
        loadProducts(),
        loadWarehouses(),
        loadHarvests(),
        loadFumigations(),
        loadTransfers()
      ]);
    } catch (err: any) {
      console.error('Error al recargar datos:', err);
      setError('Error al cargar datos: ' + err.message);
    }
  }, [loadProducts, loadWarehouses, loadHarvests, loadFumigations, loadTransfers]);
  
  // Cargar datos al montar el componente
  useEffect(() => {
    refreshData();
  }, [refreshData]);
  
  // Retornar estados y funciones necesarias para el componente visual
  return {
    stats,
    lowStockProducts,
    expiringSoonProducts,
    pendingTransfers,
    pendingFumigations,
    upcomingHarvests,
    loading,
    error,
    refreshData
  };
};

export default useDashboardController;