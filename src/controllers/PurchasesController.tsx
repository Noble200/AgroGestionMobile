// src/controllers/PurchasesController.tsx - Controlador para compras con logging de actividades
import { useState, useEffect, useCallback } from 'react';
import { usePurchases } from '../contexts/PurchaseContext';
import { useStock } from '../contexts/StockContext';
import { useAuth } from '../contexts/AuthContext';
import { useActivityLogger } from '../hooks/useActivityLogger';

// Interfaces para TypeScript - Redefinidas para evitar conflictos
interface ControllerProduct {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
  unit?: string;
}

interface ControllerDelivery {
  id: string;
  deliveryNumber: string;
  date: any; // Firebase Timestamp
  status: 'pending' | 'completed' | 'cancelled';
  products: ControllerProduct[];
  notes?: string;
}

interface ControllerPurchase {
  id: string;
  purchaseNumber: string;
  supplier: string;
  purchaseDate?: any; // Firebase Timestamp
  date?: any; // Firebase Timestamp
  status: 'pending' | 'approved' | 'partial_delivered' | 'completed' | 'cancelled';
  products: ControllerProduct[];
  deliveries?: ControllerDelivery[];
  totalAmount: number;
  totalProducts?: number;
  freight?: number;
  taxes?: number;
  notes?: string;
  totalDelivered?: number;
  totalPending?: number;
  totalFreightPaid?: number;
  approvedBy?: string;
  approvedDate?: any;
  invoiceNumber?: string;
  invoiceDate?: any;
  createdBy?: string;
  createdAt?: any;
  updatedAt?: any;
  [key: string]: any;
}

interface Filters {
  status: string;
  supplier: string;
  dateRange: { start: Date | null; end: Date | null };
  searchTerm: string;
}

interface FilterOption {
  value: string;
  label: string;
}

interface FilterOptions {
  status: FilterOption[];
  suppliers: string[];
  dateRange: {
    start: Date | null;
    end: Date | null;
  };
}

interface Statistics {
  totalPurchases: number;
  totalAmount: number;
  pendingPurchases: number;
  completedPurchases: number;
  partialDeliveries: number;
  totalFreightPaid: number;
}

interface PurchaseChange {
  field: string;
  label: string;
  oldValue: string;
  newValue: string;
  type?: string;
}

interface User {
  displayName?: string;
  email?: string;
}

type DialogType = 'add-purchase' | 'edit-purchase' | 'view-purchase' | 'add-delivery' | 'view-delivery' | '';

interface UsePurchasesControllerReturn {
  purchases: ControllerPurchase[];
  warehouses: any[];
  loading: boolean;
  error: string;
  selectedPurchase: ControllerPurchase | null;
  selectedDelivery: ControllerDelivery | null;
  dialogOpen: boolean;
  dialogType: DialogType;
  filterOptions: FilterOptions;
  statistics: Statistics;
  handleAddPurchase: () => void;
  handleEditPurchase: (purchase: ControllerPurchase) => void;
  handleViewPurchase: (purchase: ControllerPurchase) => void;
  handleAddDelivery: (purchase: ControllerPurchase) => void;
  handleViewDelivery: (purchase: ControllerPurchase, delivery: ControllerDelivery) => void;
  handleDeletePurchase: (purchaseId: string) => Promise<void>;
  handleSavePurchase: (purchaseData: Partial<ControllerPurchase>) => Promise<boolean>;
  handleCreateDelivery: (deliveryData: Partial<ControllerDelivery>) => Promise<boolean>;
  handleCompleteDelivery: (deliveryId: string) => Promise<void>;
  handleCancelDelivery: (deliveryId: string) => Promise<void>;
  handleFilterChange: (filterName: string, value: any) => void;
  handleSearch: (searchTerm: string) => void;
  handleCloseDialog: () => void;
  refreshData: () => Promise<void>;
}

const usePurchasesController = (): UsePurchasesControllerReturn => {
  const {
    purchases: stockPurchases,
    loading: purchasesLoading,
    error: purchasesError,
    loadPurchases,
    addPurchase,
    updatePurchase,
    deletePurchase,
    createDelivery,
    completeDelivery,
    cancelDelivery
  } = usePurchases();
  
  const {
    warehouses = [],
    loading: warehousesLoading,
    error: warehousesError,
    loadWarehouses
  } = useStock();

  const { currentUser } = useAuth();
  const { logPurchase } = useActivityLogger();

  // Convertir compras del stock a nuestro tipo local
  const purchases: ControllerPurchase[] = stockPurchases.map(purchase => {
    const purchaseAny = purchase as any;
    
    const basePurchase: ControllerPurchase = {
      id: purchaseAny.id || '',
      purchaseNumber: purchaseAny.purchaseNumber || '',
      supplier: purchaseAny.supplier || '',
      purchaseDate: purchaseAny.purchaseDate,
      date: purchaseAny.date,
      status: purchaseAny.status || 'pending',
      products: purchaseAny.products || [],
      deliveries: purchaseAny.deliveries || [],
      totalAmount: purchaseAny.totalAmount || 0,
      totalProducts: purchaseAny.totalProducts,
      freight: purchaseAny.freight,
      taxes: purchaseAny.taxes,
      notes: purchaseAny.notes,
      totalDelivered: purchaseAny.totalDelivered,
      totalPending: purchaseAny.totalPending,
      totalFreightPaid: purchaseAny.totalFreightPaid,
      approvedBy: purchaseAny.approvedBy,
      approvedDate: purchaseAny.approvedDate,
      invoiceNumber: purchaseAny.invoiceNumber,
      invoiceDate: purchaseAny.invoiceDate,
      createdBy: purchaseAny.createdBy,
      createdAt: purchaseAny.createdAt,
      updatedAt: purchaseAny.updatedAt
    };
    
    return basePurchase;
  });

  // Estados locales
  const [selectedPurchase, setSelectedPurchase] = useState<ControllerPurchase | null>(null);
  const [selectedDelivery, setSelectedDelivery] = useState<ControllerDelivery | null>(null);
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [dialogType, setDialogType] = useState<DialogType>('');
  const [filters, setFilters] = useState<Filters>({
    status: 'all',
    supplier: '',
    dateRange: { start: null, end: null },
    searchTerm: ''
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [filteredPurchasesList, setFilteredPurchasesList] = useState<ControllerPurchase[]>([]);

  // Cargar datos necesarios
  const loadData = useCallback(async (): Promise<void> => {
    try {
      setError('');
      
      // Cargar almacenes y compras
      await Promise.all([
        warehouses.length === 0 ? loadWarehouses() : Promise.resolve(),
        loadPurchases()
      ]);
      
    } catch (err: any) {
      console.error('Error al cargar datos:', err);
      setError('Error al cargar datos: ' + err.message);
    }
  }, [loadWarehouses, loadPurchases, warehouses.length]);

  // Actualizar estado de carga y error
  useEffect(() => {
    const isLoading = purchasesLoading || warehousesLoading;
    setLoading(isLoading);
    
    // Establecer mensaje de error si lo hay
    if (purchasesError) {
      setError(purchasesError);
    } else if (warehousesError) {
      setError(warehousesError);
    } else {
      setError('');
    }
  }, [purchasesLoading, warehousesLoading, purchasesError, warehousesError]);

  // Cargar datos al iniciar
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filtrar compras según filtros aplicados
  const getFilteredPurchases = useCallback((): ControllerPurchase[] => {
    if (!Array.isArray(purchases) || purchases.length === 0) return [];
    
    return purchases.filter((purchase: ControllerPurchase) => {
      // Filtro por estado
      if (filters.status !== 'all' && purchase.status !== filters.status) {
        return false;
      }

      // Filtro por proveedor
      if (filters.supplier && filters.supplier !== 'all') {
        if (!purchase.supplier.toLowerCase().includes(filters.supplier.toLowerCase())) {
          return false;
        }
      }

      // Filtro por rango de fechas
      if (filters.dateRange.start || filters.dateRange.end) {
        const purchaseDate = purchase.purchaseDate || purchase.date;
        if (!purchaseDate) return false;
        
        const date = purchaseDate.seconds 
          ? new Date(purchaseDate.seconds * 1000)
          : new Date(purchaseDate);
        
        const start = filters.dateRange.start;
        const end = filters.dateRange.end;
        
        if (start && date < start) return false;
        if (end && date > end) return false;
      }

      // Filtro por término de búsqueda
      if (filters.searchTerm) {
        const term = filters.searchTerm.toLowerCase();
        const searchableFields = [
          purchase.purchaseNumber,
          purchase.supplier,
          ...(purchase.products?.map((p: ControllerProduct) => p.name) || [])
        ].filter(Boolean);
        
        const matchesSearch = searchableFields.some(field => 
          field && field.toString().toLowerCase().includes(term)
        );
        
        if (!matchesSearch) return false;
      }

      return true;
    });
  }, [purchases, filters]);

  // Actualizar lista filtrada cuando cambien las compras o filtros
  useEffect(() => {
    setFilteredPurchasesList(getFilteredPurchases());
  }, [getFilteredPurchases]);

  // Handlers para diálogos
  const handleAddPurchase = useCallback((): void => {
    setSelectedPurchase(null);
    setDialogType('add-purchase');
    setDialogOpen(true);
  }, []);

  const handleEditPurchase = useCallback((purchase: ControllerPurchase): void => {
    setSelectedPurchase(purchase);
    setDialogType('edit-purchase');
    setDialogOpen(true);
  }, []);

  const handleViewPurchase = useCallback((purchase: ControllerPurchase): void => {
    setSelectedPurchase(purchase);
    setDialogType('view-purchase');
    setDialogOpen(true);
  }, []);

  const handleAddDelivery = useCallback((purchase: ControllerPurchase): void => {
    setSelectedPurchase(purchase);
    setSelectedDelivery(null);
    setDialogType('add-delivery');
    setDialogOpen(true);
  }, []);

  const handleViewDelivery = useCallback((purchase: ControllerPurchase, delivery: ControllerDelivery): void => {
    setSelectedPurchase(purchase);
    setSelectedDelivery(delivery);
    setDialogType('view-delivery');
    setDialogOpen(true);
  }, []);

  // Eliminar compra con confirmación y logging
  const handleDeletePurchase = useCallback(async (purchaseId: string): Promise<void> => {
    if (window.confirm('¿Estás seguro de que deseas eliminar esta compra? Esta acción no se puede deshacer.')) {
      try {
        setError('');
        
        // Obtener datos de la compra antes de eliminarla
        const purchaseToDelete = purchases.find((p: ControllerPurchase) => p.id === purchaseId);
        
        await deletePurchase(purchaseId);
        
        // NUEVO: Registrar actividad de eliminación
        if (purchaseToDelete) {
          await logPurchase('delete', {
            id: purchaseId,
            purchaseNumber: purchaseToDelete.purchaseNumber,
            supplier: purchaseToDelete.supplier
          }, {
            totalAmount: purchaseToDelete.totalAmount,
            productsCount: purchaseToDelete.products?.length || 0,
            status: purchaseToDelete.status,
            deliveriesCount: purchaseToDelete.deliveries?.length || 0,
            deletedBy: currentUser?.displayName || currentUser?.email || 'Usuario desconocido'
          });
        }
        
        // Cerrar el diálogo si estaba abierto para esta compra
        if (selectedPurchase && selectedPurchase.id === purchaseId) {
          setDialogOpen(false);
        }
        
        // Recargar datos
        await loadData();
      } catch (err: any) {
        console.error('Error al eliminar compra:', err);
        setError('Error al eliminar compra: ' + err.message);
      }
    }
  }, [purchases, deletePurchase, logPurchase, currentUser, selectedPurchase, loadData]);

  // NUEVO: Función para detectar cambios en compras
  const detectPurchaseChanges = useCallback((oldPurchase: ControllerPurchase, newPurchase: Partial<ControllerPurchase>): PurchaseChange[] => {
    const changes: PurchaseChange[] = [];
    
    if (oldPurchase.supplier !== newPurchase.supplier) {
      changes.push({
        field: 'supplier',
        label: 'Proveedor',
        oldValue: oldPurchase.supplier,
        newValue: newPurchase.supplier || '',
        type: 'update'
      });
    }
    
    if (oldPurchase.totalAmount !== newPurchase.totalAmount) {
      changes.push({
        field: 'totalAmount',
        label: 'Monto total',
        oldValue: `$${oldPurchase.totalAmount?.toLocaleString()}`,
        newValue: `$${newPurchase.totalAmount?.toLocaleString()}`,
        type: (newPurchase.totalAmount || 0) > oldPurchase.totalAmount ? 'increase' : 'decrease'
      });
    }
    
    if (oldPurchase.status !== newPurchase.status) {
      const statusMap: Record<string, string> = {
        'pending': 'Pendiente',
        'approved': 'Aprobada',
        'partial_delivered': 'Entrega parcial',
        'completed': 'Completada',
        'cancelled': 'Cancelada'
      };
      changes.push({
        field: 'status',
        label: 'Estado',
        oldValue: statusMap[oldPurchase.status] || oldPurchase.status,
        newValue: statusMap[newPurchase.status || ''] || newPurchase.status || '',
        type: 'status'
      });
    }
    
    if ((oldPurchase.products?.length || 0) !== (newPurchase.products?.length || 0)) {
      changes.push({
        field: 'products',
        label: 'Productos',
        oldValue: `${oldPurchase.products?.length || 0} productos`,
        newValue: `${newPurchase.products?.length || 0} productos`,
        type: 'update'
      });
    }
    
    return changes;
  }, []);

  // NUEVO: Función para generar resumen de cambios
  const generatePurchaseChangesSummary = (changes: PurchaseChange[]): string => {
    const summaryParts: string[] = [];
    
    changes.forEach(change => {
      switch (change.type) {
        case 'increase':
          summaryParts.push(`${change.label}: ${change.oldValue} → ${change.newValue} (⬆️)`);
          break;
        case 'decrease':
          summaryParts.push(`${change.label}: ${change.oldValue} → ${change.newValue} (⬇️)`);
          break;
        case 'status':
          summaryParts.push(`${change.label}: ${change.oldValue} → ${change.newValue} (📊)`);
          break;
        default:
          summaryParts.push(`${change.label}: ${change.oldValue} → ${change.newValue}`);
      }
    });
    
    return summaryParts.join(', ');
  };

  // MODIFICADO: Guardar compra con logging
  const handleSavePurchase = useCallback(async (purchaseData: Partial<ControllerPurchase>): Promise<boolean> => {
    try {
      setError('');
      let purchaseId: string;
      
      if (dialogType === 'add-purchase') {
        // Convertir datos para el contexto
        const contextPurchaseData: any = {
          purchaseNumber: purchaseData.purchaseNumber,
          supplier: purchaseData.supplier,
          purchaseDate: purchaseData.purchaseDate || purchaseData.date,
          products: purchaseData.products,
          totalAmount: purchaseData.totalAmount,
          totalProducts: purchaseData.totalProducts,
          freight: purchaseData.freight,
          taxes: purchaseData.taxes,
          status: purchaseData.status || 'pending',
          notes: purchaseData.notes
        };
        
        // Crear nueva compra
        purchaseId = await addPurchase(contextPurchaseData);
        
        // NUEVO: Registrar actividad de creación
        await logPurchase('create', {
          id: purchaseId,
          purchaseNumber: purchaseData.purchaseNumber || 'Generado automáticamente',
          supplier: purchaseData.supplier || ''
        }, {
          totalAmount: purchaseData.totalAmount || 0,
          productsCount: purchaseData.products?.length || 0,
          totalProducts: purchaseData.totalProducts || 0,
          freight: purchaseData.freight || 0,
          taxes: purchaseData.taxes || 0,
          status: purchaseData.status || 'pending',
          createdBy: currentUser?.displayName || currentUser?.email || 'Usuario desconocido',
          notes: purchaseData.notes
        });
        
      } else if (dialogType === 'edit-purchase' && selectedPurchase) {
        // Convertir datos para el contexto
        const contextPurchaseData: any = {
          purchaseNumber: purchaseData.purchaseNumber,
          supplier: purchaseData.supplier,
          purchaseDate: purchaseData.purchaseDate || purchaseData.date,
          products: purchaseData.products,
          totalAmount: purchaseData.totalAmount,
          totalProducts: purchaseData.totalProducts,
          freight: purchaseData.freight,
          taxes: purchaseData.taxes,
          status: purchaseData.status,
          notes: purchaseData.notes
        };
        
        // Actualizar compra existente
        purchaseId = await updatePurchase(selectedPurchase.id, contextPurchaseData);
        
        // NUEVO: Registrar actividad de actualización con detección de cambios
        const changes = detectPurchaseChanges(selectedPurchase, purchaseData);
        
        await logPurchase('update', {
          id: selectedPurchase.id,
          purchaseNumber: purchaseData.purchaseNumber || selectedPurchase.purchaseNumber,
          supplier: purchaseData.supplier || selectedPurchase.supplier
        }, {
          totalAmount: purchaseData.totalAmount || 0,
          productsCount: purchaseData.products?.length || 0,
          previousStatus: selectedPurchase.status,
          newStatus: purchaseData.status,
          previousAmount: selectedPurchase.totalAmount,
          newAmount: purchaseData.totalAmount,
          changes: changes,
          changesCount: changes.length,
          changesSummary: changes.length > 0 ? 
            generatePurchaseChangesSummary(changes) : 
            'Sin cambios detectados',
          updatedBy: currentUser?.displayName || currentUser?.email || 'Usuario desconocido'
        });
      }
      
      // Cerrar diálogo y recargar datos
      setDialogOpen(false);
      setSelectedPurchase(null);
      await loadData();
      return true;
    } catch (err: any) {
      console.error('Error al guardar compra:', err);
      setError('Error al guardar compra: ' + err.message);
      throw err;
    }
  }, [dialogType, selectedPurchase, addPurchase, updatePurchase, logPurchase, currentUser, loadData, detectPurchaseChanges]);

  // MODIFICADO: Crear entrega con logging
  const handleCreateDelivery = useCallback(async (deliveryData: Partial<ControllerDelivery>): Promise<boolean> => {
    if (!selectedPurchase) return false;
    
    try {
      setError('');
      
      // Convertir datos para el contexto
      const contextDeliveryData: any = {
        deliveryNumber: deliveryData.deliveryNumber,
        date: deliveryData.date,
        status: deliveryData.status || 'pending',
        products: deliveryData.products,
        notes: deliveryData.notes
      };
      
      await createDelivery(selectedPurchase.id, contextDeliveryData);
      
      // NUEVO: Registrar actividad de creación de entrega
      await logPurchase('delivery_created', {
        id: selectedPurchase.id,
        purchaseNumber: selectedPurchase.purchaseNumber,
        supplier: selectedPurchase.supplier
      }, {
        deliveryNumber: deliveryData.deliveryNumber,
        deliveryDate: deliveryData.date,
        productsCount: deliveryData.products?.length || 0,
        createdBy: currentUser?.displayName || currentUser?.email || 'Usuario desconocido',
        notes: deliveryData.notes
      });
      
      // Cerrar diálogo y recargar datos
      setDialogOpen(false);
      setSelectedDelivery(null);
      await loadData();
      return true;
    } catch (err: any) {
      console.error('Error al crear entrega:', err);
      setError('Error al crear entrega: ' + err.message);
      throw err;
    }
  }, [selectedPurchase, createDelivery, logPurchase, currentUser, loadData]);

  // MODIFICADO: Completar entrega con logging
  const handleCompleteDelivery = useCallback(async (deliveryId: string): Promise<void> => {
    if (!selectedPurchase) return;
    
    try {
      setError('');
      
      await completeDelivery(selectedPurchase.id, deliveryId);
      
      // NUEVO: Registrar actividad de completar entrega
      await logPurchase('delivery_completed', {
        id: selectedPurchase.id,
        purchaseNumber: selectedPurchase.purchaseNumber,
        supplier: selectedPurchase.supplier
      }, {
        deliveryId,
        completedBy: currentUser?.displayName || currentUser?.email || 'Usuario desconocido'
      });
      
      await loadData();
    } catch (err: any) {
      console.error('Error al completar entrega:', err);
      setError('Error al completar entrega: ' + err.message);
    }
  }, [selectedPurchase, completeDelivery, logPurchase, currentUser, loadData]);

  // MODIFICADO: Cancelar entrega con logging
  const handleCancelDelivery = useCallback(async (deliveryId: string): Promise<void> => {
    if (!selectedPurchase) return;
    
    try {
      setError('');
      
      await cancelDelivery(selectedPurchase.id, deliveryId);
      
      // NUEVO: Registrar actividad de cancelar entrega
      await logPurchase('delivery_cancelled', {
        id: selectedPurchase.id,
        purchaseNumber: selectedPurchase.purchaseNumber,
        supplier: selectedPurchase.supplier
      }, {
        deliveryId,
        cancelledBy: currentUser?.displayName || currentUser?.email || 'Usuario desconocido'
      });
      
      await loadData();
    } catch (err: any) {
      console.error('Error al cancelar entrega:', err);
      setError('Error al cancelar entrega: ' + err.message);
    }
  }, [selectedPurchase, cancelDelivery, logPurchase, currentUser, loadData]);

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
    setSelectedPurchase(null);
    setSelectedDelivery(null);
  }, []);

  // Obtener proveedores únicos de todas las compras para el filtro
  const getUniqueSuppliers = useCallback((): string[] => {
    const suppliers = new Set<string>();
    purchases.forEach((purchase: ControllerPurchase) => {
      if (purchase.supplier) {
        suppliers.add(purchase.supplier);
      }
    });
    return Array.from(suppliers).sort();
  }, [purchases]);

  // Calcular estadísticas de compras
  const getStatistics = useCallback((): Statistics => {
    const totalPurchases = purchases.length;
    const totalAmount = purchases.reduce((sum: number, purchase: ControllerPurchase) => sum + purchase.totalAmount, 0);
    const pendingPurchases = purchases.filter((p: ControllerPurchase) => p.status === 'pending').length;
    const completedPurchases = purchases.filter((p: ControllerPurchase) => p.status === 'completed').length;
    const partialDeliveries = purchases.filter((p: ControllerPurchase) => p.status === 'partial_delivered').length;
    const totalFreightPaid = purchases.reduce((sum: number, purchase: ControllerPurchase) => sum + (purchase.totalFreightPaid || 0), 0);
    
    return {
      totalPurchases,
      totalAmount,
      pendingPurchases,
      completedPurchases,
      partialDeliveries,
      totalFreightPaid
    };
  }, [purchases]);

  // Opciones para filtros
  const filterOptions: FilterOptions = {
    status: [
      { value: 'all', label: 'Todos los estados' },
      { value: 'pending', label: 'Pendiente' },
      { value: 'approved', label: 'Aprobada' },
      { value: 'partial_delivered', label: 'Entrega parcial' },
      { value: 'completed', label: 'Completada' },
      { value: 'cancelled', label: 'Cancelada' }
    ],
    suppliers: getUniqueSuppliers(),
    dateRange: {
      start: null,
      end: null
    }
  };

  return {
    purchases: filteredPurchasesList,
    warehouses: Array.isArray(warehouses) ? warehouses : [],
    loading,
    error,
    selectedPurchase,
    selectedDelivery,
    dialogOpen,
    dialogType,
    filterOptions,
    statistics: getStatistics(),
    handleAddPurchase,
    handleEditPurchase,
    handleViewPurchase,
    handleAddDelivery,
    handleViewDelivery,
    handleDeletePurchase,
    handleSavePurchase,
    handleCreateDelivery,
    handleCompleteDelivery,
    handleCancelDelivery,
    handleFilterChange,
    handleSearch,
    handleCloseDialog,
    refreshData: loadData
  };
};

export default usePurchasesController;