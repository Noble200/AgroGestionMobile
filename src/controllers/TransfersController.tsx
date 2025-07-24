// src/controllers/TransfersController.tsx - Controlador para transferencias con logging de actividades
import { useState, useEffect, useCallback } from 'react';
import { useTransfers } from '../contexts/TransferContext';
import { useStock } from '../contexts/StockContext';
import { useAuth } from '../contexts/AuthContext';
import { useActivityLogger } from '../hooks/useActivityLogger';

// Interfaces para TypeScript - Redefinidas para evitar conflictos
interface ControllerProduct {
  id: string;
  name: string;
  quantity: number;
  unitPrice?: number;
  unit?: string;
  category?: string;
  [key: string]: any;
}

interface ControllerWarehouse {
  id: string;
  name: string;
  type?: string;
  capacity?: number;
  location?: string;
  [key: string]: any;
}

interface ControllerTransfer {
  id: string;
  transferNumber: string;
  requestDate: any; // Firebase Timestamp
  status: 'pending' | 'approved' | 'rejected' | 'shipped' | 'completed' | 'cancelled';
  sourceWarehouse: ControllerWarehouse;
  targetWarehouse: ControllerWarehouse;
  products: ControllerProduct[];
  requestedBy: string;
  approvedBy?: string;
  rejectedBy?: string;
  rejectionReason?: string;
  shippedBy?: string;
  shippedDate?: any;
  receivedBy?: string;
  receivedDate?: any;
  transferCost?: number;
  distance?: number;
  notes?: string;
  createdAt?: any;
  updatedAt?: any;
  [key: string]: any;
}

interface Filters {
  status: string;
  sourceWarehouse: string;
  targetWarehouse: string;
  dateRange: { start: Date | null; end: Date | null };
  searchTerm: string;
}

interface FilterOption {
  value: string;
  label: string;
}

interface FilterOptions {
  status: FilterOption[];
  dateRange: {
    start: Date | null;
    end: Date | null;
  };
}

interface User {
  displayName?: string;
  email?: string;
}

type DialogType = 'add-transfer' | 'edit-transfer' | 'view-transfer' | 'approve-transfer' | 'receive-transfer' | '';

interface UseTransfersControllerReturn {
  transfers: ControllerTransfer[];
  warehouses: ControllerWarehouse[];
  products: ControllerProduct[];
  loading: boolean;
  error: string;
  selectedTransfer: ControllerTransfer | null;
  dialogOpen: boolean;
  dialogType: DialogType;
  filterOptions: FilterOptions;
  handleAddTransfer: () => void;
  handleEditTransfer: (transfer: ControllerTransfer) => void;
  handleViewTransfer: (transfer: ControllerTransfer) => void;
  handleApproveTransfer: (transfer: ControllerTransfer) => void;
  handleReceiveTransfer: (transfer: ControllerTransfer) => void;
  handleDeleteTransfer: (transferId: string) => Promise<void>;
  handleSaveTransfer: (transferData: Partial<ControllerTransfer>) => Promise<boolean>;
  handleApproveTransferSubmit: (decision: string, reason?: string) => Promise<boolean>;
  handleShipTransfer: (transferId: string) => Promise<void>;
  handleReceiveTransferSubmit: (receivedData: any) => Promise<boolean>;
  handleFilterChange: (filterName: string, value: any) => void;
  handleSearch: (searchTerm: string) => void;
  handleCloseDialog: () => void;
  refreshData: () => Promise<void>;
}

const useTransfersController = (): UseTransfersControllerReturn => {
  const {
    transfers: stockTransfers,
    loading: transfersLoading,
    error: transfersError,
    loadTransfers,
    addTransfer,
    updateTransfer,
    deleteTransfer,
    approveTransfer,
    rejectTransfer,
    shipTransfer,
    receiveTransfer
  } = useTransfers();
  
  const {
    warehouses: stockWarehouses = [],
    products: stockProducts = [],
    loading: stockLoading,
    error: stockError,
    loadWarehouses,
    loadProducts
  } = useStock();

  const { currentUser } = useAuth();
  const { logTransfer } = useActivityLogger();

  // Convertir transferencias del contexto a nuestro tipo local
  const transfers: ControllerTransfer[] = stockTransfers.map(transfer => {
    const transferAny = transfer as any;
    
    const baseTransfer: ControllerTransfer = {
      id: transferAny.id || '',
      transferNumber: transferAny.transferNumber || '',
      requestDate: transferAny.requestDate,
      status: transferAny.status || 'pending',
      sourceWarehouse: transferAny.sourceWarehouse || { id: '', name: '' },
      targetWarehouse: transferAny.targetWarehouse || { id: '', name: '' },
      products: transferAny.products || [],
      requestedBy: transferAny.requestedBy || '',
      approvedBy: transferAny.approvedBy,
      rejectedBy: transferAny.rejectedBy,
      rejectionReason: transferAny.rejectionReason,
      shippedBy: transferAny.shippedBy,
      shippedDate: transferAny.shippedDate,
      receivedBy: transferAny.receivedBy,
      receivedDate: transferAny.receivedDate,
      transferCost: transferAny.transferCost,
      distance: transferAny.distance,
      notes: transferAny.notes,
      createdAt: transferAny.createdAt,
      updatedAt: transferAny.updatedAt
    };
    
    return baseTransfer;
  });

  // Convertir almacenes del contexto a nuestro tipo local
  const warehouses: ControllerWarehouse[] = stockWarehouses.map(warehouse => {
    const warehouseAny = warehouse as any;
    
    const baseWarehouse: ControllerWarehouse = {
      id: warehouseAny.id || '',
      name: warehouseAny.name || '',
      type: warehouseAny.type,
      capacity: warehouseAny.capacity,
      location: warehouseAny.location
    };
    
    return baseWarehouse;
  });

  // Convertir productos del contexto a nuestro tipo local
  const products: ControllerProduct[] = stockProducts.map(product => {
    const productAny = product as any;
    
    const baseProduct: ControllerProduct = {
      id: productAny.id || '',
      name: productAny.name || '',
      quantity: productAny.quantity || 0,
      unitPrice: productAny.unitPrice,
      unit: productAny.unit,
      category: productAny.category
    };
    
    return baseProduct;
  });

  // Estados locales
  const [selectedTransfer, setSelectedTransfer] = useState<ControllerTransfer | null>(null);
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [dialogType, setDialogType] = useState<DialogType>('');
  const [filters, setFilters] = useState<Filters>({
    status: 'all',
    sourceWarehouse: 'all',
    targetWarehouse: 'all',
    dateRange: { start: null, end: null },
    searchTerm: ''
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [filteredTransfersList, setFilteredTransfersList] = useState<ControllerTransfer[]>([]);

  // Cargar datos necesarios
  const loadData = useCallback(async (): Promise<void> => {
    try {
      setError('');
      
      // Cargar almacenes y productos si no están cargados
      await Promise.all([
        warehouses.length === 0 ? loadWarehouses() : Promise.resolve(),
        products.length === 0 ? loadProducts() : Promise.resolve(),
        loadTransfers()
      ]);
      
    } catch (err: any) {
      console.error('Error al cargar datos:', err);
      setError('Error al cargar datos: ' + err.message);
    }
  }, [loadWarehouses, loadProducts, loadTransfers, warehouses.length, products.length]);

  // Actualizar estado de carga y error
  useEffect(() => {
    const isLoading = transfersLoading || stockLoading;
    setLoading(isLoading);
    
    // Establecer mensaje de error si lo hay
    if (transfersError) {
      setError(transfersError);
    } else if (stockError) {
      setError(stockError);
    } else {
      setError('');
    }
  }, [transfersLoading, stockLoading, transfersError, stockError]);

  // Cargar datos al iniciar
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filtrar transferencias según filtros aplicados
  const getFilteredTransfers = useCallback((): ControllerTransfer[] => {
    if (!Array.isArray(transfers) || transfers.length === 0) return [];
    
    return transfers.filter((transfer: ControllerTransfer) => {
      // Filtro por estado
      if (filters.status !== 'all' && transfer.status !== filters.status) {
        return false;
      }
      
      // Filtro por almacén origen
      if (filters.sourceWarehouse !== 'all' && transfer.sourceWarehouse.id !== filters.sourceWarehouse) {
        return false;
      }
      
      // Filtro por almacén destino
      if (filters.targetWarehouse !== 'all' && transfer.targetWarehouse.id !== filters.targetWarehouse) {
        return false;
      }
      
      // Filtro por rango de fechas
      if (filters.dateRange.start || filters.dateRange.end) {
        const requestDate = transfer.requestDate 
          ? new Date(transfer.requestDate.seconds ? transfer.requestDate.seconds * 1000 : transfer.requestDate)
          : null;
        
        if (!requestDate) return false;
        
        if (filters.dateRange.start) {
          const startDate = new Date(filters.dateRange.start);
          if (requestDate < startDate) return false;
        }
        
        if (filters.dateRange.end) {
          const endDate = new Date(filters.dateRange.end);
          endDate.setHours(23, 59, 59, 999); // Ajustar al final del día
          if (requestDate > endDate) return false;
        }
      }
      
      // Búsqueda por texto
      if (filters.searchTerm) {
        const term = filters.searchTerm.toLowerCase();
        const searchableFields = [
          transfer.transferNumber,
          transfer.requestedBy,
          transfer.sourceWarehouse.name,
          transfer.targetWarehouse.name
        ].filter(Boolean);
        
        const matchesSearch = searchableFields.some(field => 
          field && field.toString().toLowerCase().includes(term)
        );
        
        if (!matchesSearch) return false;
      }
      
      return true;
    });
  }, [transfers, filters]);

  // Actualizar transferencias filtradas cuando cambien los filtros o transferencias
  useEffect(() => {
    setFilteredTransfersList(getFilteredTransfers());
  }, [getFilteredTransfers]);

  // Abrir diálogo para añadir transferencia
  const handleAddTransfer = useCallback((): void => {
    setSelectedTransfer(null);
    setDialogType('add-transfer');
    setDialogOpen(true);
  }, []);

  // Abrir diálogo para editar transferencia
  const handleEditTransfer = useCallback((transfer: ControllerTransfer): void => {
    setSelectedTransfer(transfer);
    setDialogType('edit-transfer');
    setDialogOpen(true);
  }, []);

  // Abrir diálogo para ver detalles de transferencia
  const handleViewTransfer = useCallback((transfer: ControllerTransfer): void => {
    setSelectedTransfer(transfer);
    setDialogType('view-transfer');
    setDialogOpen(true);
  }, []);

  // Abrir diálogo para aprobar/rechazar transferencia
  const handleApproveTransfer = useCallback((transfer: ControllerTransfer): void => {
    setSelectedTransfer(transfer);
    setDialogType('approve-transfer');
    setDialogOpen(true);
  }, []);

  // Abrir diálogo para recibir transferencia
  const handleReceiveTransfer = useCallback((transfer: ControllerTransfer): void => {
    setSelectedTransfer(transfer);
    setDialogType('receive-transfer');
    setDialogOpen(true);
  }, []);

  // MODIFICADO: Confirmar eliminación de transferencia con logging
  const handleDeleteTransfer = useCallback(async (transferId: string): Promise<void> => {
    if (window.confirm('¿Estás seguro de que deseas eliminar esta transferencia? Esta acción no se puede deshacer.')) {
      try {
        setError('');
        
        // Obtener datos de la transferencia antes de eliminarla
        const transferToDelete = transfers.find((t: ControllerTransfer) => t.id === transferId);
        
        await deleteTransfer(transferId);
        
        // NUEVO: Registrar actividad de eliminación
        if (transferToDelete) {
          await logTransfer('delete', {
            id: transferId,
            transferNumber: transferToDelete.transferNumber,
            sourceWarehouse: transferToDelete.sourceWarehouse?.name || 'Almacén desconocido',
            targetWarehouse: transferToDelete.targetWarehouse?.name || 'Almacén desconocido'
          }, {
            productsCount: transferToDelete.products?.length || 0,
            status: transferToDelete.status,
            requestedBy: transferToDelete.requestedBy,
            deletedBy: currentUser?.displayName || currentUser?.email || 'Usuario desconocido'
          });
        }
        
        // Cerrar el diálogo si estaba abierto para esta transferencia
        if (selectedTransfer && selectedTransfer.id === transferId) {
          setDialogOpen(false);
        }
        
        // Recargar datos
        await loadData();
      } catch (err: any) {
        console.error('Error al eliminar transferencia:', err);
        setError('Error al eliminar transferencia: ' + err.message);
      }
    }
  }, [deleteTransfer, selectedTransfer, transfers, logTransfer, currentUser, loadData]);

  // MODIFICADO: Guardar transferencia con logging
  const handleSaveTransfer = useCallback(async (transferData: Partial<ControllerTransfer>): Promise<boolean> => {
    try {
      setError('');
      
      // Añadir información del usuario actual
      const dataWithUser: any = {
        ...transferData,
        requestedBy: currentUser?.displayName || currentUser?.email || 'Usuario desconocido'
      };

      let transferId: string;
      
      if (dialogType === 'add-transfer') {
        // Crear nueva transferencia
        transferId = await addTransfer(dataWithUser);
        
        // NUEVO: Registrar actividad de creación
        await logTransfer('create', {
          id: transferId,
          transferNumber: dataWithUser.transferNumber,
          sourceWarehouse: dataWithUser.sourceWarehouse?.name || 'Almacén desconocido',
          targetWarehouse: dataWithUser.targetWarehouse?.name || 'Almacén desconocido'
        }, {
          productsCount: dataWithUser.products?.length || 0,
          totalDistance: dataWithUser.distance || 0,
          transferCost: dataWithUser.transferCost || 0,
          requestedBy: dataWithUser.requestedBy
        });
        
      } else if (dialogType === 'edit-transfer' && selectedTransfer) {
        // Actualizar transferencia existente
        transferId = await updateTransfer(selectedTransfer.id, dataWithUser);
        
        // NUEVO: Registrar actividad de actualización
        await logTransfer('update', {
          id: selectedTransfer.id,
          transferNumber: dataWithUser.transferNumber,
          sourceWarehouse: dataWithUser.sourceWarehouse?.name || 'Almacén desconocido',
          targetWarehouse: dataWithUser.targetWarehouse?.name || 'Almacén desconocido'
        }, {
          productsCount: dataWithUser.products?.length || 0,
          previousStatus: selectedTransfer.status,
          newStatus: dataWithUser.status,
          updatedBy: currentUser?.displayName || currentUser?.email || 'Usuario desconocido'
        });
      }
      
      // Cerrar diálogo y recargar datos
      setDialogOpen(false);
      setSelectedTransfer(null);
      await loadData();
      return true;
    } catch (err: any) {
      console.error('Error al guardar transferencia:', err);
      setError('Error al guardar transferencia: ' + err.message);
      throw err;
    }
  }, [dialogType, selectedTransfer, addTransfer, updateTransfer, currentUser, logTransfer, loadData]);

  // MODIFICADO: Aprobar transferencia con logging
  const handleApproveTransferSubmit = useCallback(async (decision: string, reason: string = ''): Promise<boolean> => {
    try {
      if (!selectedTransfer) return false;
      
      setError('');
      const approverName = currentUser?.displayName || currentUser?.email || 'Usuario desconocido';
      
      if (decision === 'approve') {
        await approveTransfer(selectedTransfer.id, approverName);
        
        // NUEVO: Registrar actividad de aprobación
        await logTransfer('approve', {
          id: selectedTransfer.id,
          transferNumber: selectedTransfer.transferNumber,
          sourceWarehouse: selectedTransfer.sourceWarehouse?.name || 'Almacén desconocido',
          targetWarehouse: selectedTransfer.targetWarehouse?.name || 'Almacén desconocido'
        }, {
          approvedBy: approverName,
          productsCount: selectedTransfer.products?.length || 0,
          transferCost: selectedTransfer.transferCost || 0
        });
        
      } else {
        await rejectTransfer(selectedTransfer.id, reason, approverName);
        
        // NUEVO: Registrar actividad de rechazo
        await logTransfer('reject', {
          id: selectedTransfer.id,
          transferNumber: selectedTransfer.transferNumber,
          sourceWarehouse: selectedTransfer.sourceWarehouse?.name || 'Almacén desconocido',
          targetWarehouse: selectedTransfer.targetWarehouse?.name || 'Almacén desconocido'
        }, {
          rejectedBy: approverName,
          rejectionReason: reason,
          productsCount: selectedTransfer.products?.length || 0
        });
      }
      
      // Cerrar diálogo y recargar datos
      setDialogOpen(false);
      setSelectedTransfer(null);
      await loadData();
      return true;
    } catch (err: any) {
      console.error('Error al procesar aprobación:', err);
      setError('Error al procesar aprobación: ' + err.message);
      throw err;
    }
  }, [selectedTransfer, approveTransfer, rejectTransfer, currentUser, logTransfer, loadData]);

  // MODIFICADO: Enviar transferencia con logging
  const handleShipTransfer = useCallback(async (transferId: string): Promise<void> => {
    if (window.confirm('¿Confirmas que deseas enviar esta transferencia? Esto descontará el stock del almacén origen.')) {
      try {
        setError('');
        
        // Obtener datos de la transferencia antes de enviar
        const transferToShip = transfers.find((t: ControllerTransfer) => t.id === transferId);
        const shipperName = currentUser?.displayName || currentUser?.email || 'Usuario desconocido';
        
        await shipTransfer(transferId, shipperName);
        
        // NUEVO: Registrar actividad de envío
        if (transferToShip) {
          await logTransfer('ship', {
            id: transferId,
            transferNumber: transferToShip.transferNumber,
            sourceWarehouse: transferToShip.sourceWarehouse?.name || 'Almacén desconocido',
            targetWarehouse: transferToShip.targetWarehouse?.name || 'Almacén desconocido'
          }, {
            shippedBy: shipperName,
            productsCount: transferToShip.products?.length || 0,
            transferCost: transferToShip.transferCost || 0
          });
        }
        
        await loadData();
      } catch (err: any) {
        console.error('Error al enviar transferencia:', err);
        setError('Error al enviar transferencia: ' + err.message);
      }
    }
  }, [transfers, shipTransfer, currentUser, logTransfer, loadData]);

  // MODIFICADO: Recibir transferencia con logging
  const handleReceiveTransferSubmit = useCallback(async (receivedData: any): Promise<boolean> => {
    try {
      if (!selectedTransfer) return false;
      
      setError('');
      
      const receiverName = currentUser?.displayName || currentUser?.email || 'Usuario desconocido';
      
      // Convertir datos para el contexto
      const contextReceivedData: any = {
        ...receivedData,
        receivedBy: receiverName
      };
      
      await receiveTransfer(selectedTransfer.id, contextReceivedData);
      
      // NUEVO: Registrar actividad de recepción
      await logTransfer('receive', {
        id: selectedTransfer.id,
        transferNumber: selectedTransfer.transferNumber,
        sourceWarehouse: selectedTransfer.sourceWarehouse?.name || 'Almacén desconocido',
        targetWarehouse: selectedTransfer.targetWarehouse?.name || 'Almacén desconocido'
      }, {
        receivedBy: receiverName,
        productsCount: selectedTransfer.products?.length || 0,
        receivedProductsCount: receivedData.products?.length || 0,
        notes: receivedData.notes,
        quality: receivedData.quality
      });
      
      // Cerrar diálogo y recargar datos
      setDialogOpen(false);
      setSelectedTransfer(null);
      await loadData();
      return true;
    } catch (err: any) {
      console.error('Error al recibir transferencia:', err);
      setError('Error al recibir transferencia: ' + err.message);
      throw err;
    }
  }, [selectedTransfer, receiveTransfer, currentUser, logTransfer, loadData]);

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
    setSelectedTransfer(null);
  }, []);

  // Opciones para filtros
  const filterOptions: FilterOptions = {
    status: [
      { value: 'all', label: 'Todos los estados' },
      { value: 'pending', label: 'Pendiente' },
      { value: 'approved', label: 'Aprobada' },
      { value: 'rejected', label: 'Rechazada' },
      { value: 'shipped', label: 'Enviada' },
      { value: 'completed', label: 'Completada' },
      { value: 'cancelled', label: 'Cancelada' }
    ],
    dateRange: {
      start: null,
      end: null
    }
  };

  return {
    transfers: filteredTransfersList,
    warehouses,
    products,
    loading,
    error,
    selectedTransfer,
    dialogOpen,
    dialogType,
    filterOptions,
    handleAddTransfer,
    handleEditTransfer,
    handleViewTransfer,
    handleApproveTransfer,
    handleReceiveTransfer,
    handleDeleteTransfer,
    handleSaveTransfer,
    handleApproveTransferSubmit,
    handleShipTransfer,
    handleReceiveTransferSubmit,
    handleFilterChange,
    handleSearch,
    handleCloseDialog,
    refreshData: loadData
  };
};

export default useTransfersController;
