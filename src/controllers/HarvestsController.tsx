// src/controllers/HarvestsController.js - Controlador CORREGIDO con logging de actividades
import { useState, useEffect, useCallback } from 'react';
import { useHarvests } from '../contexts/HarvestContext';
import { useStock } from '../contexts/StockContext';
import { useAuth } from '../contexts/AuthContext';
import { useActivityLogger } from '../hooks/useActivityLogger'; // NUEVO: Hook para logging

const useHarvestsController = () => {
  const {
    harvests,
    loading: harvestsLoading,
    error: harvestsError,
    loadHarvests,
    addHarvest,
    updateHarvest,
    deleteHarvest,
    completeHarvest
  } = useHarvests();
  
  const {
    fields = [], // CORREGIDO: Valor por defecto como array vacío
    products = [], // CORREGIDO: Valor por defecto como array vacío
    warehouses = [], // CORREGIDO: Valor por defecto como array vacío
    loading: fieldsLoading,
    error: fieldsError,
    loadFields,
    loadProducts,
    loadWarehouses
  } = useStock();

  const { currentUser } = useAuth(); // NUEVO: Para obtener usuario actual
  const { logHarvest } = useActivityLogger(); // NUEVO: Hook de logging

  // Estados locales
  const [selectedHarvest, setSelectedHarvest] = useState(null);
  const [selectedField, setSelectedField] = useState(null);
  const [selectedLots, setSelectedLots] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState(''); // 'add-harvest', 'edit-harvest', 'view-harvest', 'complete-harvest'
  const [filters, setFilters] = useState({
    status: 'all',
    crop: 'all',
    field: 'all',
    dateRange: { start: null, end: null },
    searchTerm: ''
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filteredHarvestsList, setFilteredHarvestsList] = useState([]);

  // CORREGIDO: Cargar campos, productos y almacenes al iniciar
  const loadData = useCallback(async () => {
    try {
      setError('');
      
      // Cargar todos los datos necesarios
      await Promise.all([
        loadFields(),
        loadProducts(), 
        loadWarehouses(),
        loadHarvests()
      ]);
    } catch (err) {
      console.error('Error al cargar datos:', err);
      setError('Error al cargar datos: ' + err.message);
    }
  }, [loadFields, loadProducts, loadWarehouses, loadHarvests]);

  // Actualizar estado de carga y error
  useEffect(() => {
    const isLoading = harvestsLoading || fieldsLoading;
    setLoading(isLoading);
    
    // Establecer mensaje de error si lo hay
    if (harvestsError) {
      setError(harvestsError);
    } else if (fieldsError) {
      setError(fieldsError);
    } else {
      setError('');
    }
  }, [harvestsLoading, fieldsLoading, harvestsError, fieldsError]);

  // Cargar datos al iniciar
  useEffect(() => {
    loadData();
  }, [loadData]);

  // CORREGIDO: Filtrar cosechas con verificación de arrays
  const getFilteredHarvests = useCallback(() => {
    // CORREGIDO: Verificar que harvests sea un array
    if (!Array.isArray(harvests) || harvests.length === 0) return [];
    
    // Hacer una copia del array para no modificar el original
    const harvestsWithFieldRefs = harvests.map(harvest => {
      // Si el harvest ya tiene una referencia completa al campo, usarla
      if (harvest.field && typeof harvest.field === 'object') {
        return harvest;
      }
      
      // CORREGIDO: Verificar que fields sea un array antes de usar find
      if (!Array.isArray(fields)) {
        return {
          ...harvest,
          field: { id: harvest.fieldId || '', name: 'Campo desconocido' }
        };
      }
      
      // Si no, buscar el campo por ID
      const field = fields.find(f => f.id === harvest.fieldId);
      return {
        ...harvest,
        field: field ? { id: field.id, name: field.name } : { id: harvest.fieldId || '', name: 'Campo desconocido' }
      };
    });
    
    return harvestsWithFieldRefs.filter(harvest => {
      // Filtro por estado
      if (filters.status !== 'all' && harvest.status !== filters.status) {
        return false;
      }
      
      // Filtro por cultivo
      if (filters.crop !== 'all' && harvest.crop !== filters.crop) {
        return false;
      }
      
      // Filtro por campo
      if (filters.field !== 'all' && harvest.fieldId !== filters.field) {
        return false;
      }
      
      // Filtro por fecha
      if (filters.dateRange.start || filters.dateRange.end) {
        const plannedDate = harvest.plannedDate
          ? new Date(harvest.plannedDate.seconds ? harvest.plannedDate.seconds * 1000 : harvest.plannedDate)
          : null;
        
        if (!plannedDate) return false;
        
        if (filters.dateRange.start) {
          const startDate = new Date(filters.dateRange.start);
          if (plannedDate < startDate) return false;
        }
        
        if (filters.dateRange.end) {
          const endDate = new Date(filters.dateRange.end);
          endDate.setHours(23, 59, 59, 999); // Ajustar al final del día
          if (plannedDate > endDate) return false;
        }
      }
      
      // Búsqueda por texto
      if (filters.searchTerm) {
        const term = filters.searchTerm.toLowerCase();
        return (
          (harvest.crop && harvest.crop.toLowerCase().includes(term)) ||
          (harvest.field && harvest.field.name && harvest.field.name.toLowerCase().includes(term)) ||
          (harvest.harvestMethod && harvest.harvestMethod.toLowerCase().includes(term))
        );
      }
      
      return true;
    });
  }, [harvests, fields, filters]);

  // Actualizar cosechas filtradas cuando cambian los filtros, cosechas o campos
  useEffect(() => {
    setFilteredHarvestsList(getFilteredHarvests());
  }, [getFilteredHarvests]);

  // Abrir diálogo para añadir cosecha
  const handleAddHarvest = useCallback(() => {
    setSelectedHarvest(null);
    setSelectedField(null);
    setSelectedLots([]);
    setDialogType('add-harvest');
    setDialogOpen(true);
  }, []);

  // Abrir diálogo para añadir cosecha desde un campo específico
  const handleAddHarvestFromField = useCallback((field, lots = []) => {
    setSelectedHarvest(null);
    setSelectedField(field);
    setSelectedLots(lots);
    setDialogType('add-harvest');
    setDialogOpen(true);
  }, []);

  // Abrir diálogo para editar cosecha
  const handleEditHarvest = useCallback((harvest) => {
    setSelectedHarvest(harvest);
    setSelectedField(null);
    setSelectedLots([]);
    setDialogType('edit-harvest');
    setDialogOpen(true);
  }, []);

  // Abrir diálogo para ver detalles de cosecha
  const handleViewHarvest = useCallback((harvest) => {
    setSelectedHarvest(harvest);
    setDialogType('view-harvest');
    setDialogOpen(true);
  }, []);

  // Abrir diálogo para completar cosecha
  const handleCompleteHarvest = useCallback((harvest) => {
    setSelectedHarvest(harvest);
    setDialogType('complete-harvest');
    setDialogOpen(true);
  }, []);

  // MODIFICADO: Confirmar eliminación de cosecha con logging
  const handleDeleteHarvest = useCallback(async (harvestId) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar esta cosecha? Esta acción no se puede deshacer.')) {
      try {
        // Obtener datos de la cosecha antes de eliminarla
        const harvestToDelete = harvests.find(h => h.id === harvestId);
        
        await deleteHarvest(harvestId);
        
        // NUEVO: Registrar actividad de eliminación
        if (harvestToDelete) {
          await logHarvest('delete', {
            id: harvestId,
            crop: harvestToDelete.crop,
            field: harvestToDelete.field
          }, {
            area: harvestToDelete.totalArea,
            areaUnit: harvestToDelete.areaUnit,
            estimatedYield: harvestToDelete.estimatedYield,
            status: harvestToDelete.status,
            plannedDate: harvestToDelete.plannedDate,
            deletedBy: currentUser?.displayName || currentUser?.email || 'Usuario desconocido',
            reason: 'Eliminación manual desde panel de cosechas'
          });
        }
        
        // Cerrar el diálogo si estaba abierto para esta cosecha
        if (selectedHarvest && selectedHarvest.id === harvestId) {
          setDialogOpen(false);
        }
      } catch (err) {
        console.error('Error al eliminar cosecha:', err);
        setError('Error al eliminar cosecha: ' + err.message);
      }
    }
  }, [deleteHarvest, selectedHarvest, harvests, logHarvest, currentUser]);

  // MODIFICADO: Guardar cosecha con logging
  const handleSaveHarvest = useCallback(async (harvestData) => {
    try {
      let harvestId;
      
      if (dialogType === 'add-harvest') {
        // Crear nueva cosecha
        harvestId = await addHarvest(harvestData);
        
        // NUEVO: Registrar actividad de creación
        const fieldName = fields.find(f => f.id === harvestData.fieldId)?.name || 'Campo desconocido';
        const productsUsed = harvestData.selectedProducts?.length || 0;
        const totalProducts = harvestData.selectedProducts?.reduce((sum, p) => sum + (p.quantity || 0), 0) || 0;
        
        await logHarvest('create', {
          id: harvestId,
          crop: harvestData.crop,
          field: { name: fieldName }
        }, {
          area: harvestData.totalArea,
          areaUnit: harvestData.areaUnit,
          estimatedYield: harvestData.estimatedYield,
          yieldUnit: harvestData.yieldUnit,
          plannedDate: harvestData.plannedDate,
          harvestMethod: harvestData.harvestMethod,
          productsUsed: productsUsed,
          totalProducts: totalProducts,
          targetWarehouse: warehouses.find(w => w.id === harvestData.targetWarehouse)?.name,
          machinery: harvestData.machinery?.length || 0,
          qualityParameters: harvestData.qualityParameters?.length || 0,
          createdBy: currentUser?.displayName || currentUser?.email || 'Usuario desconocido'
        });
        
      } else if (dialogType === 'edit-harvest' && selectedHarvest) {
        // Actualizar cosecha existente
        harvestId = await updateHarvest(selectedHarvest.id, harvestData);
        
        // NUEVO: Registrar actividad de actualización
        const fieldName = fields.find(f => f.id === harvestData.fieldId)?.name || 'Campo desconocido';
        const changes = detectHarvestChanges(selectedHarvest, harvestData);
        
        await logHarvest('update', {
          id: selectedHarvest.id,
          crop: harvestData.crop,
          field: { name: fieldName }
        }, {
          area: harvestData.totalArea,
          areaUnit: harvestData.areaUnit,
          previousStatus: selectedHarvest.status,
          newStatus: harvestData.status,
          changes: changes,
          changesCount: changes.length,
          changesSummary: changes.join(', '),
          updatedBy: currentUser?.displayName || currentUser?.email || 'Usuario desconocido'
        });
      }
      
      setDialogOpen(false);
      await loadHarvests();
      return true;
    } catch (err) {
      console.error('Error al guardar cosecha:', err);
      setError('Error al guardar cosecha: ' + err.message);
      throw err;
    }
  }, [dialogType, selectedHarvest, addHarvest, updateHarvest, loadHarvests, fields, warehouses, currentUser, logHarvest]);

  // NUEVO: Función para detectar cambios en cosechas
  const detectHarvestChanges = useCallback((oldHarvest, newHarvest) => {
    const changes = [];
    
    if (oldHarvest.crop !== newHarvest.crop) {
      changes.push(`Cultivo: ${oldHarvest.crop} → ${newHarvest.crop}`);
    }
    
    if (oldHarvest.totalArea !== newHarvest.totalArea) {
      changes.push(`Superficie: ${oldHarvest.totalArea} → ${newHarvest.totalArea} ${newHarvest.areaUnit || 'ha'}`);
    }
    
    if (oldHarvest.estimatedYield !== newHarvest.estimatedYield) {
      changes.push(`Rendimiento estimado: ${oldHarvest.estimatedYield || 0} → ${newHarvest.estimatedYield || 0} ${newHarvest.yieldUnit || 'kg/ha'}`);
    }
    
    if (oldHarvest.status !== newHarvest.status) {
      const statusMap = {
        'pending': 'Pendiente',
        'scheduled': 'Programada',
        'in_progress': 'En proceso',
        'completed': 'Completada',
        'cancelled': 'Cancelada'
      };
      changes.push(`Estado: ${statusMap[oldHarvest.status]} → ${statusMap[newHarvest.status]}`);
    }
    
    if (oldHarvest.harvestMethod !== newHarvest.harvestMethod) {
      changes.push(`Método: ${oldHarvest.harvestMethod || 'No especificado'} → ${newHarvest.harvestMethod || 'No especificado'}`);
    }
    
    if ((oldHarvest.selectedProducts?.length || 0) !== (newHarvest.selectedProducts?.length || 0)) {
      changes.push(`Productos: ${oldHarvest.selectedProducts?.length || 0} → ${newHarvest.selectedProducts?.length || 0}`);
    }
    
    return changes;
  }, []);

  // MODIFICADO: Completar cosecha con logging detallado
  const handleCompleteHarvestSubmit = useCallback(async (harvestData) => {
    try {
      if (!selectedHarvest) return;
      
      await completeHarvest(selectedHarvest.id, harvestData);
      
      // NUEVO: Registrar actividad de completar cosecha con detalles completos
      const fieldName = fields.find(f => f.id === selectedHarvest.fieldId)?.name || 'Campo desconocido';
      const targetWarehouseName = warehouses.find(w => w.id === selectedHarvest.targetWarehouse)?.name || 'Almacén desconocido';
      
      // Calcular totales de productos cosechados
      const productsHarvestedCount = harvestData.productsHarvested?.length || 0;
      const totalHarvestedProducts = harvestData.productsHarvested?.reduce((sum, p) => sum + (p.quantity || 0), 0) || 0;
      
      await logHarvest('complete', {
        id: selectedHarvest.id,
        crop: selectedHarvest.crop,
        field: { name: fieldName }
      }, {
        area: selectedHarvest.totalArea,
        areaUnit: selectedHarvest.areaUnit,
        estimatedYield: selectedHarvest.estimatedYield,
        actualYield: harvestData.actualYield,
        yieldUnit: harvestData.yieldUnit || selectedHarvest.yieldUnit,
        totalHarvested: harvestData.totalHarvested,
        totalHarvestedUnit: harvestData.totalHarvestedUnit,
        harvestDate: harvestData.harvestDate,
        destination: harvestData.destination,
        targetWarehouse: targetWarehouseName,
        productsHarvestedCount: productsHarvestedCount,
        totalHarvestedProducts: totalHarvestedProducts,
        harvestEfficiency: selectedHarvest.estimatedYield && harvestData.actualYield 
          ? ((harvestData.actualYield / selectedHarvest.estimatedYield) * 100).toFixed(1) + '%'
          : null,
        qualityResults: harvestData.qualityResults?.length || 0,
        harvestNotes: harvestData.harvestNotes,
        completedBy: currentUser?.displayName || currentUser?.email || 'Usuario desconocido',
        inventoryUpdated: true, // Los productos se añaden al inventario
        stockAdded: totalHarvestedProducts > 0
      });
      
      setDialogOpen(false);
      await loadHarvests();
      return true;
    } catch (err) {
      console.error('Error al completar cosecha:', err);
      setError('Error al completar cosecha: ' + err.message);
      throw err;
    }
  }, [selectedHarvest, completeHarvest, loadHarvests, fields, warehouses, currentUser, logHarvest]);

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
    setSelectedHarvest(null);
    setSelectedField(null);
    setSelectedLots([]);
  }, []);

  // Opciones para filtros
  const filterOptions = {
    status: [
      { value: 'all', label: 'Todos los estados' },
      { value: 'pending', label: 'Pendiente' },
      { value: 'scheduled', label: 'Programada' },
      { value: 'in_progress', label: 'En proceso' },
      { value: 'completed', label: 'Completada' },
      { value: 'cancelled', label: 'Cancelada' }
    ],
    crops: [
      { value: 'all', label: 'Todos los cultivos' },
      { value: 'maiz', label: 'Maíz' },
      { value: 'soja', label: 'Soja' },
      { value: 'trigo', label: 'Trigo' },
      { value: 'girasol', label: 'Girasol' },
      { value: 'alfalfa', label: 'Alfalfa' },
      { value: 'otro', label: 'Otro' }
    ],
    dateRange: {
      start: null,
      end: null
    }
  };

  return {
    harvests: filteredHarvestsList,
    fields: Array.isArray(fields) ? fields : [], // CORREGIDO: Asegurar que sea un array
    products: Array.isArray(products) ? products : [], // CORREGIDO: Asegurar que sea un array
    warehouses: Array.isArray(warehouses) ? warehouses : [], // CORREGIDO: Asegurar que sea un array
    loading,
    error,
    selectedHarvest,
    selectedField,
    selectedLots,
    dialogOpen,
    dialogType,
    filterOptions,
    handleAddHarvest,
    handleAddHarvestFromField,
    handleEditHarvest,
    handleViewHarvest,
    handleCompleteHarvest,
    handleDeleteHarvest,
    handleSaveHarvest,
    handleCompleteHarvestSubmit,
    handleFilterChange,
    handleSearch,
    handleCloseDialog,
    refreshData: loadData
  };
};

export default useHarvestsController;