// src/controllers/TransfersController.js - Controlador para transferencias con logging de actividades
import { useState, useEffect, useCallback } from 'react';
import { useTransfers } from '../contexts/TransferContext';
import { useStock } from '../contexts/StockContext';
import { useAuth } from '../contexts/AuthContext';
import { useActivityLogger } from '../hooks/useActivityLogger'; // NUEVO: Hook para logging

const useTransfersController = () => {
  const {
    transfers,
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
    warehouses = [],
    products = [],
    loading: stockLoading,
    error: stockError,
    loadWarehouses,
    loadProducts
  } = useStock();

  const { currentUser } = useAuth();
  const { logTransfer } = useActivityLogger(); // NUEVO: Hook de logging

  // Estados locales
  const [selectedTransfer, setSelectedTransfer] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState(''); // 'add-transfer', 'edit-transfer', 'view-transfer', 'approve-transfer', 'receive-transfer'
  const [filters, setFilters] = useState({
    status: 'all',
    sourceWarehouse: 'all',
    targetWarehouse: 'all',
    dateRange: { start: null, end: null },
    searchTerm: ''
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filteredTransfersList, setFilteredTransfersList] = useState([]);

  // Cargar datos necesarios
  const loadData = useCallback(async () => {
    try {
      setError('');
      
      // Cargar almacenes y productos si no están cargados
      await Promise.all([
        warehouses.length === 0 ? loadWarehouses() : Promise.resolve(),
        products.length === 0 ? loadProducts() : Promise.resolve(),
        loadTransfers()
      ]);
    } catch (err) {
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
  const getFilteredTransfers = useCallback(() => {
    if (!Array.isArray(transfers) || transfers.length === 0) return [];
    
    // Hacer una copia del array para no modificar el original
    const transfersWithWarehouseRefs = transfers.map(transfer => {
      // Si la transferencia ya tiene referencias completas a los almacenes, usarlas
      if (transfer.sourceWarehouse && typeof transfer.sourceWarehouse === 'object' && transfer.sourceWarehouse.name) {
        return transfer;
      }
      
      // Si no, buscar los almacenes por ID
      const sourceWarehouse = Array.isArray(warehouses) ? warehouses.find(w => w.id === transfer.sourceWarehouseId) : null;
      const targetWarehouse = Array.isArray(warehouses) ? warehouses.find(w => w.id === transfer.targetWarehouseId) : null;
      
      return {
        ...transfer,
        sourceWarehouse: sourceWarehouse ? { id: sourceWarehouse.id, name: sourceWarehouse.name } : { id: transfer.sourceWarehouseId || '', name: 'Almacén desconocido' },
        targetWarehouse: targetWarehouse ? { id: targetWarehouse.id, name: targetWarehouse.name } : { id: transfer.targetWarehouseId || '', name: 'Almacén desconocido' }
      };
    });
    
    return transfersWithWarehouseRefs.filter(transfer => {
      // Filtro por estado
      if (filters.status !== 'all' && transfer.status !== filters.status) {
        return false;
      }
      
      // Filtro por almacén origen
      if (filters.sourceWarehouse !== 'all' && transfer.sourceWarehouseId !== filters.sourceWarehouse) {
        return false;
      }
      
      // Filtro por almacén destino
      if (filters.targetWarehouse !== 'all' && transfer.targetWarehouseId !== filters.targetWarehouse) {
        return false;
      }
      
      // Filtro por fecha
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
        return (
          (transfer.transferNumber && transfer.transferNumber.toLowerCase().includes(term)) ||
          (transfer.requestedBy && transfer.requestedBy.toLowerCase().includes(term)) ||
          (transfer.sourceWarehouse.name && transfer.sourceWarehouse.name.toLowerCase().includes(term)) ||
          (transfer.targetWarehouse.name && transfer.targetWarehouse.name.toLowerCase().includes(term))
        );
      }
      
      return true;
    });
  }, [transfers, warehouses, filters]);

  // Actualizar transferencias filtradas cuando cambian los filtros, transferencias o almacenes
  useEffect(() => {
    setFilteredTransfersList(getFilteredTransfers());
  }, [getFilteredTransfers]);

  // Abrir diálogo para añadir transferencia
  const handleAddTransfer = useCallback(() => {
    setSelectedTransfer(null);
    setDialogType('add-transfer');
    setDialogOpen(true);
  }, []);

  // Abrir diálogo para editar transferencia
  const handleEditTransfer = useCallback((transfer) => {
    setSelectedTransfer(transfer);
    setDialogType('edit-transfer');
    setDialogOpen(true);
  }, []);

  // Abrir diálogo para ver detalles de transferencia
  const handleViewTransfer = useCallback((transfer) => {
    setSelectedTransfer(transfer);
    setDialogType('view-transfer');
    setDialogOpen(true);
  }, []);

  // Abrir diálogo para aprobar/rechazar transferencia
  const handleApproveTransfer = useCallback((transfer) => {
    setSelectedTransfer(transfer);
    setDialogType('approve-transfer');
    setDialogOpen(true);
  }, []);

  // Abrir diálogo para recibir transferencia
  const handleReceiveTransfer = useCallback((transfer) => {
    setSelectedTransfer(transfer);
    setDialogType('receive-transfer');
    setDialogOpen(true);
  }, []);

  // MODIFICADO: Confirmar eliminación de transferencia con logging
  const handleDeleteTransfer = useCallback(async (transferId) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar esta transferencia? Esta acción no se puede deshacer.')) {
      try {
        // Obtener datos de la transferencia antes de eliminarla
        const transferToDelete = transfers.find(t => t.id === transferId);
        
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
            requestedBy: transferToDelete.requestedBy
          });
        }
        
        // Cerrar el diálogo si estaba abierto para esta transferencia
        if (selectedTransfer && selectedTransfer.id === transferId) {
          setDialogOpen(false);
        }
      } catch (err) {
        console.error('Error al eliminar transferencia:', err);
        setError('Error al eliminar transferencia: ' + err.message);
      }
    }
  }, [deleteTransfer, selectedTransfer, transfers, logTransfer]);

  // MODIFICADO: Guardar transferencia con logging
  const handleSaveTransfer = useCallback(async (transferData) => {
    try {
      // Añadir información del usuario actual
      const dataWithUser = {
        ...transferData,
        requestedBy: currentUser?.displayName || currentUser?.email || 'Usuario desconocido'
      };

      let transferId;
      
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
      
      setDialogOpen(false);
      await loadTransfers();
      return true;
    } catch (err) {
      console.error('Error al guardar transferencia:', err);
      setError('Error al guardar transferencia: ' + err.message);
      throw err;
    }
  }, [dialogType, selectedTransfer, addTransfer, updateTransfer, loadTransfers, currentUser, logTransfer]);

  // MODIFICADO: Aprobar transferencia con logging
  const handleApproveTransferSubmit = useCallback(async (decision, reason = '') => {
    try {
      if (!selectedTransfer) return;
      
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
      
      setDialogOpen(false);
      await loadTransfers();
      return true;
    } catch (err) {
      console.error('Error al procesar aprobación:', err);
      setError('Error al procesar aprobación: ' + err.message);
      throw err;
    }
  }, [selectedTransfer, approveTransfer, rejectTransfer, loadTransfers, currentUser, logTransfer]);

  // MODIFICADO: Enviar transferencia con logging
  const handleShipTransfer = useCallback(async (transferId) => {
    if (window.confirm('¿Confirmas que deseas enviar esta transferencia? Esto descontará el stock del almacén origen.')) {
      try {
        const shipperName = currentUser?.displayName || currentUser?.email || 'Usuario desconocido';
        const transferToShip = transfers.find(t => t.id === transferId);
        
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
            stockDeducted: true,
            totalProducts: transferToShip.products?.reduce((sum, p) => sum + (p.quantity || 0), 0) || 0
          });
        }
      } catch (err) {
        console.error('Error al enviar transferencia:', err);
        setError('Error al enviar transferencia: ' + err.message);
      }
    }
  }, [shipTransfer, currentUser, transfers, logTransfer]);

  // MODIFICADO: Recibir transferencia con logging
  const handleReceiveTransferSubmit = useCallback(async (receivedProducts) => {
    try {
      if (!selectedTransfer) return;
      
      const receiverName = currentUser?.displayName || currentUser?.email || 'Usuario desconocido';
      
      await receiveTransfer(selectedTransfer.id, receiverName, receivedProducts);
      
      // NUEVO: Registrar actividad de recepción
      await logTransfer('receive', {
        id: selectedTransfer.id,
        transferNumber: selectedTransfer.transferNumber,
        sourceWarehouse: selectedTransfer.sourceWarehouse?.name || 'Almacén desconocido',
        targetWarehouse: selectedTransfer.targetWarehouse?.name || 'Almacén desconocido'
      }, {
        receivedBy: receiverName,
        productsReceived: receivedProducts?.length || selectedTransfer.products?.length || 0,
        totalQuantityReceived: receivedProducts?.reduce((sum, p) => sum + (p.quantityReceived || p.quantity || 0), 0) || 0,
        stockAdded: true,
        transferCompleted: true
      });
      
      setDialogOpen(false);
      await loadTransfers();
      return true;
    } catch (err) {
      console.error('Error al recibir transferencia:', err);
      setError('Error al recibir transferencia: ' + err.message);
      throw err;
    }
  }, [selectedTransfer, receiveTransfer, loadTransfers, currentUser, logTransfer]);

  // Cambiar filtros
  const handleFilterChange = useCallback((filterName, value) => {
    setFilters(prev => ({
      ...prev,
      [filterName]: value
    }));
  }, []);

  // Buscar por texto
  const handleSearch = useCallback((searchTerm) => {
    setFilters(prev => ({
      ...prev,
      searchTerm
    }));
  }, []);

  // Cerrar diálogo
  const handleCloseDialog = useCallback(() => {
    setDialogOpen(false);
    setSelectedTransfer(null);
  }, []);

  // Opciones para filtros
  const filterOptions = {
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
    warehouses: Array.isArray(warehouses) ? warehouses : [],
    products: Array.isArray(products) ? products : [],
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