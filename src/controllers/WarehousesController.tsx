// src/controllers/WarehousesController.tsx - Controlador para almacenes con logging de actividades
import { useState, useEffect, useCallback } from 'react';
import { useStock } from '../contexts/StockContext';
import { useAuth } from '../contexts/AuthContext';
import { useActivityLogger } from '../hooks/useActivityLogger';
import { collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../api/firebase';

// Interfaces para TypeScript - Redefinidas para evitar conflictos
interface ControllerWarehouse {
  id: string;
  name: string;
  type: 'silo' | 'shed' | 'barn' | 'cellar' | 'coldroom' | 'outdoor' | 'other';
  status: 'active' | 'inactive' | 'maintenance' | 'full';
  capacity: number;
  capacityUnit: 'ton' | 'kg' | 'm3' | 'l';
  location?: string;
  fieldId?: string;
  description?: string;
  storageCondition?: string;
  temperature?: number;
  humidity?: number;
  supervisor?: string;
  isFieldLevel?: boolean;
  createdBy?: string;
  createdAt?: any; // Firebase Timestamp
  updatedAt?: any; // Firebase Timestamp
  [key: string]: any;
}

interface ControllerField {
  id: string;
  name: string;
  location?: string;
  [key: string]: any;
}

interface Filters {
  status: string;
  type: string;
  fieldId: string;
  searchTerm: string;
}

interface FilterOption {
  value: string;
  label: string;
}

interface FilterOptions {
  status: FilterOption[];
  warehouseTypes: FilterOption[];
}

interface WarehouseChange {
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

type DialogType = 'add-warehouse' | 'edit-warehouse' | 'view-warehouse' | '';

interface UseWarehousesControllerReturn {
  warehouses: ControllerWarehouse[];
  fields: ControllerField[];
  loading: boolean;
  error: string;
  selectedWarehouse: ControllerWarehouse | null;
  dialogOpen: boolean;
  dialogType: DialogType;
  filterOptions: FilterOptions;
  handleAddWarehouse: () => void;
  handleEditWarehouse: (warehouse: ControllerWarehouse) => void;
  handleViewWarehouse: (warehouse: ControllerWarehouse) => void;
  handleDeleteWarehouse: (warehouseId: string) => Promise<void>;
  handleSaveWarehouse: (warehouseData: Partial<ControllerWarehouse>) => Promise<boolean>;
  handleFilterChange: (filterName: string, value: string) => void;
  handleSearch: (searchTerm: string) => void;
  handleCloseDialog: () => void;
  handleToggleWarehouseStatus: (warehouseId: string, newStatus: string) => Promise<void>;
  refreshData: () => Promise<void>;
}

const useWarehousesController = (): UseWarehousesControllerReturn => {
  const {
    warehouses: stockWarehouses,
    fields: stockFields,
    loading: stockLoading,
    error: stockError,
    loadWarehouses,
    loadFields
  } = useStock();

  const { currentUser } = useAuth();
  const { logWarehouse } = useActivityLogger();

  // Convertir almacenes del contexto a nuestro tipo local
  const warehouses: ControllerWarehouse[] = stockWarehouses.map(warehouse => {
    const warehouseAny = warehouse as any;
    
    const baseWarehouse: ControllerWarehouse = {
      id: warehouseAny.id || '',
      name: warehouseAny.name || '',
      type: warehouseAny.type || 'other',
      status: warehouseAny.status || 'active',
      capacity: warehouseAny.capacity || 0,
      capacityUnit: warehouseAny.capacityUnit || 'ton',
      location: warehouseAny.location,
      fieldId: warehouseAny.fieldId,
      description: warehouseAny.description,
      storageCondition: warehouseAny.storageCondition,
      temperature: warehouseAny.temperature,
      humidity: warehouseAny.humidity,
      supervisor: warehouseAny.supervisor,
      isFieldLevel: warehouseAny.isFieldLevel,
      createdBy: warehouseAny.createdBy,
      createdAt: warehouseAny.createdAt,
      updatedAt: warehouseAny.updatedAt
    };
    
    return baseWarehouse;
  });

  // Convertir campos del contexto a nuestro tipo local
  const fields: ControllerField[] = stockFields.map(field => {
    const fieldAny = field as any;
    
    const baseField: ControllerField = {
      id: fieldAny.id || '',
      name: fieldAny.name || '',
      location: fieldAny.location
    };
    
    return baseField;
  });

  // Estados locales
  const [selectedWarehouse, setSelectedWarehouse] = useState<ControllerWarehouse | null>(null);
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [dialogType, setDialogType] = useState<DialogType>('');
  const [filters, setFilters] = useState<Filters>({
    status: 'all',
    type: 'all',
    fieldId: 'all',
    searchTerm: ''
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [filteredWarehousesList, setFilteredWarehousesList] = useState<ControllerWarehouse[]>([]);

  // MODIFICADO: Función para añadir un almacén con logging
  const addWarehouse = useCallback(async (warehouseData: Partial<ControllerWarehouse>): Promise<string> => {
    try {
      // Añadir documento a la colección 'warehouses'
      const warehouseRef = await addDoc(collection(db, 'warehouses'), {
        ...warehouseData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      // NUEVO: Registrar actividad de creación
      const fieldName = fields.find((f: ControllerField) => f.id === warehouseData.fieldId)?.name || null;
      
      await logWarehouse('create', {
        id: warehouseRef.id,
        name: warehouseData.name || '',
        type: warehouseData.type || 'other'
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
    } catch (error: any) {
      console.error('Error al añadir almacén:', error);
      setError('Error al añadir almacén: ' + error.message);
      throw error;
    }
  }, [loadWarehouses, logWarehouse, fields, currentUser]);

  // NUEVO: Función para detectar cambios en almacenes
  const detectWarehouseChanges = useCallback((oldWarehouse: ControllerWarehouse, newWarehouse: Partial<ControllerWarehouse>): WarehouseChange[] => {
    const changes: WarehouseChange[] = [];
    
    const fieldsToMonitor: Record<string, string> = {
      name: 'Nombre',
      type: 'Tipo',
      capacity: 'Capacidad',
      capacityUnit: 'Unidad de capacidad',
      location: 'Ubicación',
      description: 'Descripción',
      storageCondition: 'Condiciones de almacenamiento',
      temperature: 'Temperatura',
      humidity: 'Humedad',
      supervisor: 'Supervisor',
      status: 'Estado'
    };
    
    for (const [field, label] of Object.entries(fieldsToMonitor)) {
      const oldValue = (oldWarehouse as any)[field];
      const newValue = (newWarehouse as any)[field];
      
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
    
    // Cambios en campo
    if (oldWarehouse.fieldId !== newWarehouse.fieldId) {
      const oldField = fields.find((f: ControllerField) => f.id === oldWarehouse.fieldId)?.name || 'Sin campo';
      const newField = fields.find((f: ControllerField) => f.id === newWarehouse.fieldId)?.name || 'Sin campo';
      changes.push({
        field: 'fieldId',
        label: 'Campo',
        oldValue: oldField,
        newValue: newField,
        type: 'location'
      });
    }
    
    return changes;
  }, [fields]);

  // NUEVO: Función para formatear valores según el tipo de campo
  const formatWarehouseValue = (value: any, field: string): string => {
    if (value == null) return 'Sin definir';
    
    switch (field) {
      case 'capacity':
        return `${value} unidades`;
      case 'temperature':
        return `${value}°C`;
      case 'humidity':
        return `${value}%`;
      case 'status':
        const statusMap: Record<string, string> = {
          'active': 'Activo',
          'inactive': 'Inactivo',
          'maintenance': 'En mantenimiento',
          'full': 'Lleno'
        };
        return statusMap[value] || value;
      case 'type':
        const typeMap: Record<string, string> = {
          'silo': 'Silo',
          'shed': 'Galpón',
          'barn': 'Granero',
          'cellar': 'Depósito',
          'coldroom': 'Cámara frigorífica',
          'outdoor': 'Almacenamiento exterior',
          'other': 'Otro'
        };
        return typeMap[value] || value;
      case 'isFieldLevel':
        return value ? 'Campo completo' : 'Lote específico';
      default:
        return String(value);
    }
  };

  // NUEVO: Función para determinar el tipo de cambio
  const getWarehouseChangeType = (field: string, oldValue: any, newValue: any): string => {
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
  const generateChangesSummary = (changes: WarehouseChange[]): string => {
    const summaryParts: string[] = [];
    
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

  // MODIFICADO: Función para actualizar un almacén con logging
  const updateWarehouse = useCallback(async (warehouseId: string, warehouseData: Partial<ControllerWarehouse>): Promise<string> => {
    try {
      // Obtener datos actuales para comparar cambios
      const currentWarehouse = warehouses.find((w: ControllerWarehouse) => w.id === warehouseId);
      
      // Actualizar el documento en la colección 'warehouses'
      await updateDoc(doc(db, 'warehouses', warehouseId), {
        ...warehouseData,
        updatedAt: serverTimestamp()
      });
      
      // NUEVO: Detectar y registrar cambios
      if (currentWarehouse) {
        const changes = detectWarehouseChanges(currentWarehouse, warehouseData);
        const fieldName = fields.find((f: ControllerField) => f.id === warehouseData.fieldId)?.name || null;
        
        await logWarehouse('update', {
          id: warehouseId,
          name: warehouseData.name || currentWarehouse.name,
          type: warehouseData.type || currentWarehouse.type
        }, {
          changes: changes,
          changesCount: changes.length,
          changesSummary: generateChangesSummary(changes),
          capacity: warehouseData.capacity || currentWarehouse.capacity,
          capacityUnit: warehouseData.capacityUnit || currentWarehouse.capacityUnit,
          location: warehouseData.location || currentWarehouse.location,
          field: fieldName,
          fieldId: warehouseData.fieldId || currentWarehouse.fieldId,
          storageCondition: warehouseData.storageCondition || currentWarehouse.storageCondition,
          status: warehouseData.status || currentWarehouse.status,
          updatedBy: currentUser?.displayName || currentUser?.email || 'Usuario desconocido'
        });
      }
      
      // Recargar almacenes
      await loadWarehouses();
      
      return warehouseId;
    } catch (error: any) {
      console.error(`Error al actualizar almacén ${warehouseId}:`, error);
      setError('Error al actualizar almacén: ' + error.message);
      throw error;
    }
  }, [warehouses, loadWarehouses, logWarehouse, fields, currentUser, detectWarehouseChanges]);

  // MODIFICADO: Función para eliminar un almacén con logging
  const deleteWarehouse = useCallback(async (warehouseId: string): Promise<boolean> => {
    try {
      // Obtener datos del almacén antes de eliminarlo
      const warehouseToDelete = warehouses.find((w: ControllerWarehouse) => w.id === warehouseId);
      
      // Eliminar el documento de la colección 'warehouses'
      await deleteDoc(doc(db, 'warehouses', warehouseId));
      
      // NUEVO: Registrar actividad de eliminación
      if (warehouseToDelete) {
        const fieldName = fields.find((f: ControllerField) => f.id === warehouseToDelete.fieldId)?.name || null;
        
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
    } catch (error: any) {
      console.error(`Error al eliminar almacén ${warehouseId}:`, error);
      setError('Error al eliminar almacén: ' + error.message);
      throw error;
    }
  }, [warehouses, loadWarehouses, logWarehouse, fields, currentUser]);

  // Función para cargar datos
  const loadData = useCallback(async (): Promise<void> => {
    try {
      setError('');
      
      // Cargar campos si no están cargados
      if (fields.length === 0) {
        await loadFields();
      }
      
      // Cargar almacenes
      await loadWarehouses();
    } catch (err: any) {
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
  const getFilteredWarehouses = useCallback((): ControllerWarehouse[] => {
    if (!warehouses || warehouses.length === 0) return [];
    
    return warehouses.filter((warehouse: ControllerWarehouse) => {
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
        const searchableFields = [
          warehouse.name,
          warehouse.description,
          warehouse.location
        ].filter(Boolean);
        
        return searchableFields.some(field => 
          field && field.toString().toLowerCase().includes(term)
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
  const handleAddWarehouse = useCallback((): void => {
    setSelectedWarehouse(null);
    setDialogType('add-warehouse');
    setDialogOpen(true);
  }, []);

  // Abrir diálogo para editar almacén
  const handleEditWarehouse = useCallback((warehouse: ControllerWarehouse): void => {
    setSelectedWarehouse(warehouse);
    setDialogType('edit-warehouse');
    setDialogOpen(true);
  }, []);

  // Abrir diálogo para ver detalles de almacén
  const handleViewWarehouse = useCallback((warehouse: ControllerWarehouse): void => {
    setSelectedWarehouse(warehouse);
    setDialogType('view-warehouse');
    setDialogOpen(true);
  }, []);

  // MODIFICADO: Confirmar eliminación de almacén con logging
  const handleDeleteWarehouse = useCallback(async (warehouseId: string): Promise<void> => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este almacén? Esta acción no se puede deshacer.')) {
      try {
        setError('');
        
        await deleteWarehouse(warehouseId);
        
        // Cerrar el diálogo si estaba abierto para este almacén
        if (selectedWarehouse && selectedWarehouse.id === warehouseId) {
          setDialogOpen(false);
          setSelectedWarehouse(null);
        }
        
        // Recargar datos
        await loadData();
      } catch (err: any) {
        console.error('Error al eliminar almacén:', err);
        setError('Error al eliminar almacén: ' + err.message);
      }
    }
  }, [deleteWarehouse, selectedWarehouse, loadData]);

  // MODIFICADO: Guardar almacén con logging
  const handleSaveWarehouse = useCallback(async (warehouseData: Partial<ControllerWarehouse>): Promise<boolean> => {
    try {
      setError('');
      
      if (dialogType === 'add-warehouse') {
        // Crear nuevo almacén
        await addWarehouse(warehouseData);
      } else if (dialogType === 'edit-warehouse' && selectedWarehouse) {
        // Actualizar almacén existente
        await updateWarehouse(selectedWarehouse.id, warehouseData);
      }
      
      // Cerrar diálogo y recargar datos
      setDialogOpen(false);
      setSelectedWarehouse(null);
      await loadData();
      return true;
    } catch (err: any) {
      console.error('Error al guardar almacén:', err);
      setError('Error al guardar almacén: ' + err.message);
      throw err;
    }
  }, [dialogType, selectedWarehouse, addWarehouse, updateWarehouse, loadData]);

  // Cambiar filtros
  const handleFilterChange = useCallback((filterName: string, value: string): void => {
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
    setSelectedWarehouse(null);
  }, []);

  // NUEVO: Función de conveniencia para activar/desactivar almacén
  const handleToggleWarehouseStatus = useCallback(async (warehouseId: string, newStatus: string): Promise<void> => {
    try {
      const warehouse = warehouses.find((w: ControllerWarehouse) => w.id === warehouseId);
      if (!warehouse) return;

      await updateWarehouse(warehouseId, {
        ...warehouse,
        status: newStatus as any
      });

      // El logging se maneja automáticamente en updateWarehouse
    } catch (err: any) {
      console.error('Error al cambiar estado del almacén:', err);
      setError('Error al cambiar estado del almacén: ' + err.message);
    }
  }, [warehouses, updateWarehouse]);

  // Opciones para filtros
  const filterOptions: FilterOptions = {
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
    handleToggleWarehouseStatus,
    refreshData: loadData
  };
};

export default useWarehousesController;