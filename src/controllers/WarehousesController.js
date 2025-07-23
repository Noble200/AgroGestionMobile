// src/controllers/WarehousesController.js - Controlador para almacenes con logging de actividades
import { useState, useEffect, useCallback } from 'react';
import { useStock } from '../contexts/StockContext';
import { useAuth } from '../contexts/AuthContext';
import { useActivityLogger } from '../hooks/useActivityLogger'; // NUEVO: Hook para logging
import { collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../api/firebase';

const useWarehousesController = () => {
  const {
    warehouses,
    fields,
    loading: stockLoading,
    error: stockError,
    loadWarehouses,
    loadFields
  } = useStock();

  const { currentUser } = useAuth();
  const { logWarehouse } = useActivityLogger(); // NUEVO: Hook de logging

  // Estados locales
  const [selectedWarehouse, setSelectedWarehouse] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState(''); // 'add-warehouse', 'edit-warehouse', 'view-warehouse'
  const [filters, setFilters] = useState({
    status: 'all',
    type: 'all',
    fieldId: 'all',
    searchTerm: ''
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filteredWarehousesList, setFilteredWarehousesList] = useState([]);

  // MODIFICADO: Función para añadir un almacén con logging
  const addWarehouse = useCallback(async (warehouseData) => {
    try {
      // Añadir documento a la colección 'warehouses'
      const warehouseRef = await addDoc(collection(db, 'warehouses'), {
        ...warehouseData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      // NUEVO: Registrar actividad de creación
      const fieldName = fields.find(f => f.id === warehouseData.fieldId)?.name || null;
      
      await logWarehouse('create', {
        id: warehouseRef.id,
        name: warehouseData.name,
        type: warehouseData.type
      }, {
        capacity: warehouseData.capacity || 0,
        capacityUnit: warehouseData.capacityUnit || 'ton',
        location: warehouseData.location,
        field: fieldName,
        fieldId: warehouseData.fieldId,
        storageCondition: warehouseData.storageCondition,
        temperature: warehouseData.temperature,
        humidity: warehouseData.humidity,
        supervisor: warehouseData.supervisor,
        status: warehouseData.status || 'active',
        isFieldLevel: warehouseData.isFieldLevel,
        createdBy: currentUser?.displayName || currentUser?.email || 'Usuario desconocido'
      });
      
      // Recargar almacenes
      await loadWarehouses();
      
      return warehouseRef.id;
    } catch (error) {
      console.error('Error al añadir almacén:', error);
      setError('Error al añadir almacén: ' + error.message);
      throw error;
    }
  }, [loadWarehouses, logWarehouse, fields, currentUser]);

  // MODIFICADO: Función para actualizar un almacén con logging
  const updateWarehouse = useCallback(async (warehouseId, warehouseData) => {
    try {
      // Obtener datos actuales para comparar cambios
      const currentWarehouse = warehouses.find(w => w.id === warehouseId);
      
      // Actualizar el documento en la colección 'warehouses'
      await updateDoc(doc(db, 'warehouses', warehouseId), {
        ...warehouseData,
        updatedAt: serverTimestamp()
      });
      
      // NUEVO: Detectar y registrar cambios
      if (currentWarehouse) {
        const changes = detectWarehouseChanges(currentWarehouse, warehouseData);
        const fieldName = fields.find(f => f.id === warehouseData.fieldId)?.name || null;
        
        await logWarehouse('update', {
          id: warehouseId,
          name: warehouseData.name,
          type: warehouseData.type
        }, {
          changes: changes,
          changesCount: changes.length,
          changesSummary: generateChangesSummary(changes),
          capacity: warehouseData.capacity || 0,
          capacityUnit: warehouseData.capacityUnit || 'ton',
          location: warehouseData.location,
          field: fieldName,
          fieldId: warehouseData.fieldId,
          previousStatus: currentWarehouse.status,
          newStatus: warehouseData.status,
          updatedBy: currentUser?.displayName || currentUser?.email || 'Usuario desconocido'
        });
      } else {
        // Si no se encuentran los datos actuales, registrar actualización simple
        await logWarehouse('update', {
          id: warehouseId,
          name: warehouseData.name,
          type: warehouseData.type
        }, {
          updatedBy: currentUser?.displayName || currentUser?.email || 'Usuario desconocido'
        });
      }
      
      // Recargar almacenes
      await loadWarehouses();
      
      return warehouseId;
    } catch (error) {
      console.error(`Error al actualizar almacén ${warehouseId}:`, error);
      setError('Error al actualizar almacén: ' + error.message);
      throw error;
    }
  }, [loadWarehouses, logWarehouse, warehouses, fields, currentUser]);

  // NUEVO: Función para detectar cambios entre almacén actual y nuevos datos
  const detectWarehouseChanges = (currentWarehouse, newData) => {
    const changes = [];
    
    // Campos a monitorear con sus nombres legibles
    const fieldsToMonitor = {
      name: 'Nombre',
      type: 'Tipo',
      status: 'Estado',
      capacity: 'Capacidad',
      location: 'Ubicación',
      fieldId: 'Campo asignado',
      storageCondition: 'Condición de almacenamiento',
      temperature: 'Temperatura',
      humidity: 'Humedad',
      supervisor: 'Responsable',
      isFieldLevel: 'Nivel de asignación'
    };
    
    for (const [field, label] of Object.entries(fieldsToMonitor)) {
      const oldValue = currentWarehouse[field];
      const newValue = newData[field];
      
      // Comparar valores (considerar null y undefined como equivalentes)
      if (oldValue !== newValue && !(oldValue == null && newValue == null)) {
        changes.push({
          field,
          label,
          oldValue: formatWarehouseValue(oldValue, field),
          newValue: formatWarehouseValue(newValue, field),
          type: getWarehouseChangeType(field, oldValue, newValue)
        });
      }
    }
    
    return changes;
  };

  // NUEVO: Función para formatear valores según el tipo de campo
  const formatWarehouseValue = (value, field) => {
    if (value == null) return 'Sin definir';
    
    switch (field) {
      case 'capacity':
        return `${value} ton`;
      case 'temperature':
        return `${value}°C`;
      case 'humidity':
        return `${value}%`;
      case 'fieldId':
        const field_obj = fields.find(f => f.id === value);
        return field_obj ? field_obj.name : 'Campo desconocido';
      case 'type':
        const typeLabels = {
          'silo': 'Silo',
          'shed': 'Galpón',
          'barn': 'Granero',
          'cellar': 'Depósito',
          'coldroom': 'Cámara frigorífica',
          'outdoor': 'Almacenamiento exterior',
          'other': 'Otro'
        };
        return typeLabels[value] || value;
      case 'status':
        const statusLabels = {
          'active': 'Activo',
          'inactive': 'Inactivo',
          'maintenance': 'En mantenimiento',
          'full': 'Lleno'
        };
        return statusLabels[value] || value;
      case 'storageCondition':
        const conditionLabels = {
          'normal': 'Ambiente normal',
          'refrigerated': 'Refrigerado',
          'controlled_atmosphere': 'Atmósfera controlada',
          'ventilated': 'Ventilado'
        };
        return conditionLabels[value] || value;
      case 'isFieldLevel':
        return value ? 'Campo completo' : 'Lote específico';
      default:
        return String(value);
    }
  };

  // NUEVO: Función para determinar el tipo de cambio
  const getWarehouseChangeType = (field, oldValue, newValue) => {
    switch (field) {
      case 'capacity':
        const oldCapacity = Number(oldValue) || 0;
        const newCapacity = Number(newValue) || 0;
        if (newCapacity > oldCapacity) return 'increase';
        if (newCapacity < oldCapacity) return 'decrease';
        return 'update';
      case 'status':
        if (newValue === 'active' && oldValue !== 'active') return 'activation';
        if (newValue === 'inactive' && oldValue !== 'inactive') return 'deactivation';
        return 'status_change';
      case 'fieldId':
        return 'location';
      default:
        return 'update';
    }
  };

  // NUEVO: Función para generar resumen de cambios
  const generateChangesSummary = (changes) => {
    const summaryParts = [];
    
    changes.forEach(change => {
      switch (change.type) {
        case 'increase':
          summaryParts.push(`${change.label}: ${change.oldValue} → ${change.newValue} (⬆️)`);
          break;
        case 'decrease':
          summaryParts.push(`${change.label}: ${change.oldValue} → ${change.newValue} (⬇️)`);
          break;
        case 'activation':
          summaryParts.push(`${change.label}: ${change.oldValue} → ${change.newValue} (✅)`);
          break;
        case 'deactivation':
          summaryParts.push(`${change.label}: ${change.oldValue} → ${change.newValue} (❌)`);
          break;
        case 'location':
          summaryParts.push(`${change.label}: ${change.oldValue} → ${change.newValue} (📍)`);
          break;
        default:
          summaryParts.push(`${change.label}: ${change.oldValue} → ${change.newValue}`);
      }
    });
    
    return summaryParts.join(', ');
  };

  // MODIFICADO: Función para eliminar un almacén con logging
  const deleteWarehouse = useCallback(async (warehouseId) => {
    try {
      // Obtener datos del almacén antes de eliminarlo
      const warehouseToDelete = warehouses.find(w => w.id === warehouseId);
      
      // Eliminar el documento de la colección 'warehouses'
      await deleteDoc(doc(db, 'warehouses', warehouseId));
      
      // NUEVO: Registrar actividad de eliminación
      if (warehouseToDelete) {
        const fieldName = fields.find(f => f.id === warehouseToDelete.fieldId)?.name || null;
        
        await logWarehouse('delete', {
          id: warehouseId,
          name: warehouseToDelete.name,
          type: warehouseToDelete.type
        }, {
          capacity: warehouseToDelete.capacity || 0,
          capacityUnit: warehouseToDelete.capacityUnit || 'ton',
          location: warehouseToDelete.location,
          field: fieldName,
          fieldId: warehouseToDelete.fieldId,
          status: warehouseToDelete.status,
          storageCondition: warehouseToDelete.storageCondition,
          supervisor: warehouseToDelete.supervisor,
          deletedBy: currentUser?.displayName || currentUser?.email || 'Usuario desconocido',
          deletionReason: 'Eliminación manual desde panel de almacenes'
        });
      }
      
      // Recargar almacenes
      await loadWarehouses();
      
      return true;
    } catch (error) {
      console.error(`Error al eliminar almacén ${warehouseId}:`, error);
      setError('Error al eliminar almacén: ' + error.message);
      throw error;
    }
  }, [loadWarehouses, logWarehouse, warehouses, fields, currentUser]);

  // Función para cargar datos
  const loadData = useCallback(async () => {
    try {
      setError('');
      
      // Cargar campos si no están cargados
      if (fields.length === 0) {
        await loadFields();
      }
      
      // Cargar almacenes
      await loadWarehouses();
    } catch (err) {
      console.error('Error al cargar datos:', err);
      setError('Error al cargar datos: ' + err.message);
    }
  }, [loadFields, loadWarehouses, fields.length]);

  // Actualizar estado de carga y error
  useEffect(() => {
    setLoading(stockLoading);
    if (stockError) {
      setError(stockError);
    }
  }, [stockLoading, stockError]);

  // Cargar datos al iniciar
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filtrar almacenes según filtros aplicados
  const getFilteredWarehouses = useCallback(() => {
    if (!warehouses || warehouses.length === 0) return [];
    
    return warehouses.filter(warehouse => {
      // Filtro por estado
      if (filters.status !== 'all' && warehouse.status !== filters.status) {
        return false;
      }
      
      // Filtro por tipo
      if (filters.type !== 'all' && warehouse.type !== filters.type) {
        return false;
      }
      
      // Filtro por campo
      if (filters.fieldId !== 'all' && warehouse.fieldId !== filters.fieldId) {
        return false;
      }
      
      // Búsqueda por texto
      if (filters.searchTerm) {
        const term = filters.searchTerm.toLowerCase();
        return (
          warehouse.name.toLowerCase().includes(term) ||
          (warehouse.description && warehouse.description.toLowerCase().includes(term)) ||
          (warehouse.location && warehouse.location.toLowerCase().includes(term))
        );
      }
      
      return true;
    });
  }, [warehouses, filters]);

  // Actualizar almacenes filtrados cuando cambian los filtros o los almacenes
  useEffect(() => {
    setFilteredWarehousesList(getFilteredWarehouses());
  }, [getFilteredWarehouses]);

  // Abrir diálogo para añadir almacén
  const handleAddWarehouse = useCallback(() => {
    setSelectedWarehouse(null);
    setDialogType('add-warehouse');
    setDialogOpen(true);
  }, []);

  // Abrir diálogo para editar almacén
  const handleEditWarehouse = useCallback((warehouse) => {
    setSelectedWarehouse(warehouse);
    setDialogType('edit-warehouse');
    setDialogOpen(true);
  }, []);

  // Abrir diálogo para ver detalles de almacén
  const handleViewWarehouse = useCallback((warehouse) => {
    setSelectedWarehouse(warehouse);
    setDialogType('view-warehouse');
    setDialogOpen(true);
  }, []);

  // MODIFICADO: Confirmar eliminación de almacén con logging
  const handleDeleteWarehouse = useCallback(async (warehouseId) => {
    try {
      await deleteWarehouse(warehouseId);
      
      // Cerrar el diálogo si estaba abierto para este almacén
      if (selectedWarehouse && selectedWarehouse.id === warehouseId) {
        setDialogOpen(false);
      }
    } catch (err) {
      console.error('Error al eliminar almacén:', err);
      setError('Error al eliminar almacén: ' + err.message);
    }
  }, [deleteWarehouse, selectedWarehouse]);

  // MODIFICADO: Guardar almacén con logging
  const handleSaveWarehouse = useCallback(async (warehouseData) => {
    try {
      if (dialogType === 'add-warehouse') {
        // Crear nuevo almacén
        await addWarehouse(warehouseData);
      } else if (dialogType === 'edit-warehouse' && selectedWarehouse) {
        // Actualizar almacén existente
        await updateWarehouse(selectedWarehouse.id, warehouseData);
      }
      
      setDialogOpen(false);
      await loadWarehouses();
      return true;
    } catch (err) {
      console.error('Error al guardar almacén:', err);
      setError('Error al guardar almacén: ' + err.message);
      throw err;
    }
  }, [dialogType, selectedWarehouse, addWarehouse, updateWarehouse, loadWarehouses]);

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
    setSelectedWarehouse(null);
  }, []);

  // NUEVO: Función de conveniencia para activar/desactivar almacén
  const handleToggleWarehouseStatus = useCallback(async (warehouseId, newStatus) => {
    try {
      const warehouse = warehouses.find(w => w.id === warehouseId);
      if (!warehouse) return;

      await updateWarehouse(warehouseId, {
        ...warehouse,
        status: newStatus
      });

      // El logging se maneja automáticamente en updateWarehouse
    } catch (err) {
      console.error('Error al cambiar estado del almacén:', err);
      setError('Error al cambiar estado del almacén: ' + err.message);
    }
  }, [warehouses, updateWarehouse]);

  // Opciones para filtros
  const filterOptions = {
    status: [
      { value: 'all', label: 'Todos los estados' },
      { value: 'active', label: 'Activo' },
      { value: 'inactive', label: 'Inactivo' },
      { value: 'maintenance', label: 'En mantenimiento' },
      { value: 'full', label: 'Lleno' }
    ],
    warehouseTypes: [
      { value: 'all', label: 'Todos los tipos' },
      { value: 'silo', label: 'Silo' },
      { value: 'shed', label: 'Galpón' },
      { value: 'barn', label: 'Granero' },
      { value: 'cellar', label: 'Depósito' },
      { value: 'coldroom', label: 'Cámara frigorífica' },
      { value: 'outdoor', label: 'Almacenamiento exterior' },
      { value: 'other', label: 'Otro' }
    ]
  };

  return {
    warehouses: filteredWarehousesList,
    fields,
    loading,
    error,
    selectedWarehouse,
    dialogOpen,
    dialogType,
    filterOptions,
    handleAddWarehouse,
    handleEditWarehouse,
    handleViewWarehouse,
    handleDeleteWarehouse,
    handleSaveWarehouse,
    handleFilterChange,
    handleSearch,
    handleCloseDialog,
    handleToggleWarehouseStatus, // NUEVO: Función de conveniencia
    refreshData: loadData
  };
};

export default useWarehousesController;