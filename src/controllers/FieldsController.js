// src/controllers/FieldsController.js - Controlador para campos con logging de actividades
import { useState, useEffect, useCallback } from 'react';
import { useStock } from '../contexts/StockContext';
import { useActivityLogger } from '../hooks/useActivityLogger'; // NUEVO: Hook para logging
import { collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../api/firebase';

const useFieldsController = () => {
  const { 
    fields, 
    loading: stockLoading, 
    error: stockError, 
    loadFields
  } = useStock();
  
  const { logField } = useActivityLogger(); // NUEVO: Hook de logging
  
  // Estados locales
  const [selectedField, setSelectedField] = useState(null);
  const [selectedLot, setSelectedLot] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState(''); // 'add-field', 'edit-field', 'view-field', 'add-lot', 'edit-lot'
  const [filters, setFilters] = useState({
    status: 'all',
    soilType: 'all',
    searchTerm: ''
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filteredFieldsList, setFilteredFieldsList] = useState([]);
  
  // MODIFICADO: Función para añadir un campo con logging
  const addField = useCallback(async (fieldData) => {
    try {
      // Añadir documento a la colección 'fields'
      const fieldRef = await addDoc(collection(db, 'fields'), {
        ...fieldData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      // NUEVO: Registrar actividad de creación
      await logField('create', {
        id: fieldRef.id,
        name: fieldData.name,
        location: fieldData.location
      }, {
        area: fieldData.area || 0,
        areaUnit: fieldData.areaUnit || 'ha',
        soilType: fieldData.soilType,
        owner: fieldData.owner,
        crops: fieldData.crops || [],
        irrigationType: fieldData.irrigationType,
        irrigationFrequency: fieldData.irrigationFrequency,
        status: fieldData.status || 'active',
        initialLotsCount: 0,
        notes: fieldData.notes
      });
      
      // Recargar campos
      await loadFields();
      
      return fieldRef.id;
    } catch (error) {
      console.error('Error al añadir campo:', error);
      setError('Error al añadir campo: ' + error.message);
      throw error;
    }
  }, [loadFields, logField]);
  
  // MODIFICADO: Función para actualizar un campo con logging detallado
  const updateField = useCallback(async (fieldId, fieldData) => {
    try {
      // Obtener datos actuales del campo para comparar
      const currentField = fields.find(f => f.id === fieldId);
      
      if (!currentField) {
        throw new Error('Campo no encontrado');
      }
      
      // Actualizar el documento en la colección 'fields'
      await updateDoc(doc(db, 'fields', fieldId), {
        ...fieldData,
        updatedAt: serverTimestamp()
      });
      
      // NUEVO: Detectar y registrar cambios específicos
      const changes = detectFieldChanges(currentField, fieldData);
      
      if (changes.length > 0) {
        await logField('update', {
          id: fieldId,
          name: fieldData.name,
          location: fieldData.location
        }, {
          changes: changes,
          changesCount: changes.length,
          changesSummary: generateFieldChangesSummary(changes),
          area: fieldData.area || 0,
          areaUnit: fieldData.areaUnit || 'ha',
          lotsCount: fieldData.lots?.length || 0,
          previousLotsCount: currentField.lots?.length || 0,
          soilType: fieldData.soilType,
          previousSoilType: currentField.soilType,
          status: fieldData.status,
          previousStatus: currentField.status,
          crops: fieldData.crops || [],
          previousCrops: currentField.crops || []
        });
      }
      
      // Recargar campos
      await loadFields();
      
      return fieldId;
    } catch (error) {
      console.error(`Error al actualizar campo ${fieldId}:`, error);
      setError('Error al actualizar campo: ' + error.message);
      throw error;
    }
  }, [loadFields, logField, fields]);
  
  // MODIFICADO: Función para eliminar un campo con logging
  const deleteField = useCallback(async (fieldId) => {
    try {
      // Obtener datos del campo antes de eliminarlo
      const fieldToDelete = fields.find(f => f.id === fieldId);
      
      // Eliminar el documento de la colección 'fields'
      await deleteDoc(doc(db, 'fields', fieldId));
      
      // NUEVO: Registrar actividad de eliminación
      if (fieldToDelete) {
        await logField('delete', {
          id: fieldId,
          name: fieldToDelete.name,
          location: fieldToDelete.location
        }, {
          finalArea: fieldToDelete.area || 0,
          areaUnit: fieldToDelete.areaUnit || 'ha',
          finalLotsCount: fieldToDelete.lots?.length || 0,
          soilType: fieldToDelete.soilType,
          owner: fieldToDelete.owner,
          crops: fieldToDelete.crops || [],
          status: fieldToDelete.status,
          hadLots: (fieldToDelete.lots?.length || 0) > 0,
          lotsNames: fieldToDelete.lots?.map(lot => lot.name) || []
        });
      }
      
      // Recargar campos
      await loadFields();
      
      return true;
    } catch (error) {
      console.error(`Error al eliminar campo ${fieldId}:`, error);
      setError('Error al eliminar campo: ' + error.message);
      throw error;
    }
  }, [loadFields, logField, fields]);

  // NUEVO: Función para detectar cambios entre campo actual y nuevos datos
  const detectFieldChanges = (currentField, newData) => {
    const changes = [];
    
    // Campos a monitorear con sus nombres legibles
    const fieldsToMonitor = {
      name: 'Nombre',
      area: 'Superficie',
      areaUnit: 'Unidad de superficie', 
      location: 'Ubicación',
      status: 'Estado',
      soilType: 'Tipo de suelo',
      owner: 'Propietario',
      irrigationType: 'Tipo de riego',
      irrigationFrequency: 'Frecuencia de riego',
      notes: 'Notas'
    };
    
    for (const [field, label] of Object.entries(fieldsToMonitor)) {
      const oldValue = currentField[field];
      const newValue = newData[field];
      
      // Comparar valores (considerar null y undefined como equivalentes)
      if (oldValue !== newValue && !(oldValue == null && newValue == null)) {
        changes.push({
          field,
          label,
          oldValue: formatFieldValue(oldValue, field),
          newValue: formatFieldValue(newValue, field),
          type: getFieldChangeType(field, oldValue, newValue)
        });
      }
    }
    
    // Verificar cambios en cultivos (array)
    const oldCrops = currentField.crops || [];
    const newCrops = newData.crops || [];
    
    if (JSON.stringify(oldCrops.sort()) !== JSON.stringify(newCrops.sort())) {
      changes.push({
        field: 'crops',
        label: 'Cultivos',
        oldValue: oldCrops.length > 0 ? oldCrops.join(', ') : 'Sin cultivos',
        newValue: newCrops.length > 0 ? newCrops.join(', ') : 'Sin cultivos',
        type: 'crops'
      });
    }
    
    // Verificar cambios en número de lotes
    const oldLotsCount = currentField.lots?.length || 0;
    const newLotsCount = newData.lots?.length || 0;
    
    if (oldLotsCount !== newLotsCount) {
      changes.push({
        field: 'lotsCount',
        label: 'Cantidad de lotes',
        oldValue: `${oldLotsCount} lotes`,
        newValue: `${newLotsCount} lotes`,
        type: newLotsCount > oldLotsCount ? 'increase' : 'decrease'
      });
    }
    
    return changes;
  };

  // NUEVO: Función para formatear valores según el tipo de campo
  const formatFieldValue = (value, field) => {
    if (value == null) return 'Sin definir';
    
    switch (field) {
      case 'area':
        return `${value} ha`;
      case 'status':
        const statusMap = {
          'active': 'Activo',
          'inactive': 'Inactivo',
          'prepared': 'Preparado',
          'sown': 'Sembrado',
          'fallow': 'En barbecho'
        };
        return statusMap[value] || value;
      case 'soilType':
        const soilTypeMap = {
          'sandy': 'Arenoso',
          'clay': 'Arcilloso',
          'loam': 'Franco',
          'silt': 'Limoso',
          'chalky': 'Calcáreo',
          'peat': 'Turboso'
        };
        return soilTypeMap[value] || value;
      case 'irrigationType':
        const irrigationMap = {
          'sprinkler': 'Aspersión',
          'drip': 'Goteo',
          'flood': 'Inundación',
          'furrow': 'Surco',
          'none': 'Sin riego'
        };
        return irrigationMap[value] || value;
      default:
        return String(value);
    }
  };

  // NUEVO: Función para determinar el tipo de cambio
  const getFieldChangeType = (field, oldValue, newValue) => {
    switch (field) {
      case 'area':
        const oldArea = Number(oldValue) || 0;
        const newArea = Number(newValue) || 0;
        if (newArea > oldArea) return 'increase';
        if (newArea < oldArea) return 'decrease';
        return 'update';
      case 'status':
        return 'status';
      case 'location':
        return 'location';
      default:
        return 'update';
    }
  };

  // NUEVO: Función para generar resumen de cambios
  const generateFieldChangesSummary = (changes) => {
    const summaryParts = [];
    
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
        case 'location':
          summaryParts.push(`${change.label}: ${change.oldValue} → ${change.newValue} (📍)`);
          break;
        case 'crops':
          summaryParts.push(`${change.label}: ${change.oldValue} → ${change.newValue} (🌱)`);
          break;
        default:
          summaryParts.push(`${change.label}: ${change.oldValue} → ${change.newValue}`);
      }
    });
    
    return summaryParts.join(', ');
  };
  
  // Función para cargar campos
  const loadData = useCallback(async () => {
    try {
      setError('');
      await loadFields();
    } catch (err) {
      console.error('Error al cargar campos:', err);
      setError('Error al cargar campos: ' + err.message);
    }
  }, [loadFields, setError]);
  
  // Actualizar estado de carga y error
  useEffect(() => {
    setLoading(stockLoading);
    if (stockError) {
      setError(stockError);
    }
  }, [stockLoading, stockError, setError]);
  
  // Cargar campos al iniciar
  useEffect(() => {
    loadData();
  }, [loadData]);
  
  // Filtrar campos según filtros aplicados
  const getFilteredFields = useCallback(() => {
    if (!fields || fields.length === 0) return [];
    
    return fields.filter(field => {
      // Filtro por estado
      if (filters.status !== 'all' && field.status !== filters.status) {
        return false;
      }
      
      // Filtro por tipo de suelo
      if (filters.soilType !== 'all' && field.soilType !== filters.soilType) {
        return false;
      }
      
      // Búsqueda por texto
      if (filters.searchTerm) {
        const term = filters.searchTerm.toLowerCase();
        return (
          field.name.toLowerCase().includes(term) ||
          (field.location && field.location.toLowerCase().includes(term)) ||
          (field.owner && field.owner.toLowerCase().includes(term))
        );
      }
      
      return true;
    });
  }, [fields, filters]);
  
  // Actualizar campos filtrados cuando cambian los filtros o los campos
  useEffect(() => {
    setFilteredFieldsList(getFilteredFields());
  }, [getFilteredFields]);
  
  // Convertir datos antiguos a formato nuevo al cargar campos
  useEffect(() => {
    // Si hay campos con currentCrop pero sin crops, convertirlos
    if (fields && fields.length > 0) {
      fields.forEach(field => {
        if (field.currentCrop && (!field.crops || field.crops.length === 0)) {
          // Este efecto no modifica el estado, solo adapta la visualización
          field.crops = [field.currentCrop];
        }
      });
    }
  }, [fields]);
  
  // Abrir diálogo para añadir campo
  const handleAddField = useCallback(() => {
    setSelectedField(null);
    setDialogType('add-field');
    setDialogOpen(true);
  }, []);
  
  // Abrir diálogo para editar campo
  const handleEditField = useCallback((field) => {
    setSelectedField(field);
    setDialogType('edit-field');
    setDialogOpen(true);
  }, []);
  
  // Abrir diálogo para ver detalles de un campo
  const handleViewField = useCallback((field) => {
    setSelectedField(field);
    setDialogType('view-field');
    setDialogOpen(true);
  }, []);
  
  // Abrir diálogo para añadir lote a un campo
  const handleAddLot = useCallback((field) => {
    setSelectedField(field);
    setSelectedLot(null);
    setDialogType('add-lot');
    setDialogOpen(true);
  }, []);
  
  // Abrir diálogo para editar lote
  const handleEditLot = useCallback((field, lot) => {
    setSelectedField(field);
    setSelectedLot(lot);
    setDialogType('edit-lot');
    setDialogOpen(true);
  }, []);
  
  // MODIFICADO: Confirmar eliminación de campo con logging
  const handleDeleteField = useCallback(async (fieldId) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este campo? Esta acción no se puede deshacer.')) {
      try {
        await deleteField(fieldId);
        // Cerrar el diálogo si estaba abierto para este campo
        if (selectedField && selectedField.id === fieldId) {
          setDialogOpen(false);
        }
      } catch (err) {
        console.error('Error al eliminar campo:', err);
        setError('Error al eliminar campo: ' + err.message);
      }
    }
  }, [deleteField, selectedField, setError]);
  
  // MODIFICADO: Guardar nuevo campo con logging
  const handleSaveField = useCallback(async (fieldData) => {
    try {
      if (dialogType === 'add-field') {
        await addField(fieldData);
      } else if (dialogType === 'edit-field' && selectedField) {
        await updateField(selectedField.id, fieldData);
      }
      
      setDialogOpen(false);
      await loadData();
      return true; // Indicar éxito para desactivar animación de carga
    } catch (err) {
      console.error('Error al guardar campo:', err);
      setError('Error al guardar campo: ' + err.message);
      throw err; // Propagar error para que el componente sepa que falló
    }
  }, [dialogType, selectedField, addField, updateField, loadData, setError]);
  
  // MODIFICADO: Guardar lote con logging (añadir o actualizar lote en un campo)
  const handleSaveLot = useCallback(async (lotData) => {
    try {
      if (!selectedField) return;
      
      // Obtener lotes actuales del campo
      const currentLots = selectedField.lots || [];
      
      let updatedLots = [];
      let lotAction = '';
      let lotInfo = {};
      
      if (dialogType === 'add-lot') {
        // Añadir nuevo lote con ID generado
        const newLot = {
          ...lotData,
          id: Date.now().toString(), // ID simple basado en timestamp
          createdAt: new Date()
        };
        updatedLots = [...currentLots, newLot];
        lotAction = 'lot-add';
        lotInfo = {
          lotName: newLot.name,
          lotArea: newLot.area || 0,
          lotAreaUnit: newLot.areaUnit || selectedField.areaUnit || 'ha',
          lotSoilType: newLot.soilType || selectedField.soilType,
          lotCrops: newLot.crops || [],
          newLotsCount: updatedLots.length,
          previousLotsCount: currentLots.length
        };
      } else if (dialogType === 'edit-lot' && selectedLot) {
        // Actualizar lote existente
        updatedLots = currentLots.map(lot => 
          lot.id === selectedLot.id 
            ? { ...lot, ...lotData, updatedAt: new Date() } 
            : lot
        );
        lotAction = 'lot-update';
        
        // Detectar cambios en el lote
        const lotChanges = detectLotChanges(selectedLot, lotData);
        
        lotInfo = {
          lotName: lotData.name,
          lotArea: lotData.area || 0,
          lotAreaUnit: lotData.areaUnit || selectedField.areaUnit || 'ha',
          previousLotName: selectedLot.name,
          lotChanges: lotChanges,
          lotChangesSummary: generateLotChangesSummary(lotChanges)
        };
      }
      
      // Actualizar campo con los nuevos lotes
      await updateField(selectedField.id, {
        ...selectedField,
        lots: updatedLots
      });
      
      // NUEVO: Registrar actividad específica de lote
      await logField(lotAction, {
        id: selectedField.id,
        name: selectedField.name,
        location: selectedField.location
      }, lotInfo);
      
      setDialogOpen(false);
      await loadData();
      return true; // Indicar éxito para desactivar animación de carga
    } catch (err) {
      console.error('Error al guardar lote:', err);
      setError('Error al guardar lote: ' + err.message);
      throw err; // Propagar error para que el componente sepa que falló
    }
  }, [dialogType, selectedField, selectedLot, updateField, loadData, setError, logField]);

  // NUEVO: Función para detectar cambios en lotes
  const detectLotChanges = (currentLot, newLotData) => {
    const changes = [];
    
    const fieldsToMonitor = {
      name: 'Nombre',
      area: 'Superficie',
      areaUnit: 'Unidad de superficie',
      status: 'Estado',
      soilType: 'Tipo de suelo',
      irrigationType: 'Tipo de riego',
      notes: 'Notas'
    };
    
    for (const [field, label] of Object.entries(fieldsToMonitor)) {
      const oldValue = currentLot[field];
      const newValue = newLotData[field];
      
      if (oldValue !== newValue && !(oldValue == null && newValue == null)) {
        changes.push({
          field,
          label,
          oldValue: formatFieldValue(oldValue, field),
          newValue: formatFieldValue(newValue, field)
        });
      }
    }
    
    // Verificar cambios en cultivos del lote
    const oldCrops = currentLot.crops || [];
    const newCrops = newLotData.crops || [];
    
    if (JSON.stringify(oldCrops.sort()) !== JSON.stringify(newCrops.sort())) {
      changes.push({
        field: 'crops',
        label: 'Cultivos',
        oldValue: oldCrops.length > 0 ? oldCrops.join(', ') : 'Sin cultivos',
        newValue: newCrops.length > 0 ? newCrops.join(', ') : 'Sin cultivos'
      });
    }
    
    return changes;
  };

  // NUEVO: Función para generar resumen de cambios en lotes
  const generateLotChangesSummary = (changes) => {
    return changes.map(change => 
      `${change.label}: ${change.oldValue} → ${change.newValue}`
    ).join(', ');
  };
  
  // MODIFICADO: Eliminar lote de un campo con logging
  const handleDeleteLot = useCallback(async (fieldId, lotId) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este lote? Esta acción no se puede deshacer.')) {
      try {
        const field = fields.find(f => f.id === fieldId);
        if (!field) return;
        
        // Obtener información del lote antes de eliminarlo
        const lotToDelete = field.lots.find(lot => lot.id === lotId);
        
        // Filtrar lotes para eliminar el deseado
        const updatedLots = field.lots.filter(lot => lot.id !== lotId);
        
        // Actualizar campo sin el lote eliminado
        await updateField(fieldId, {
          ...field,
          lots: updatedLots
        });
        
        // NUEVO: Registrar actividad de eliminación de lote
        if (lotToDelete) {
          await logField('lot-delete', {
            id: fieldId,
            name: field.name,
            location: field.location
          }, {
            deletedLotName: lotToDelete.name,
            deletedLotArea: lotToDelete.area || 0,
            deletedLotAreaUnit: lotToDelete.areaUnit || field.areaUnit || 'ha',
            deletedLotSoilType: lotToDelete.soilType,
            deletedLotCrops: lotToDelete.crops || [],
            newLotsCount: updatedLots.length,
            previousLotsCount: field.lots.length
          });
        }
        
        // Si estamos viendo ese lote, cerrar el diálogo
        if (selectedLot && selectedLot.id === lotId) {
          setDialogOpen(false);
        }
        
        await loadData();
      } catch (err) {
        console.error('Error al eliminar lote:', err);
        setError('Error al eliminar lote: ' + err.message);
      }
    }
  }, [fields, selectedLot, updateField, loadData, setError, logField]);
  
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
    setSelectedField(null);
    setSelectedLot(null);
  }, []);
  
  // Opciones para filtros
  const filterOptions = {
    status: [
      { value: 'all', label: 'Todos los estados' },
      { value: 'active', label: 'Activo' },
      { value: 'inactive', label: 'Inactivo' },
      { value: 'prepared', label: 'Preparado' },
      { value: 'sown', label: 'Sembrado' },
      { value: 'fallow', label: 'En barbecho' }
    ],
    soilType: [
      { value: 'all', label: 'Todos los tipos' },
      { value: 'sandy', label: 'Arenoso' },
      { value: 'clay', label: 'Arcilloso' },
      { value: 'loam', label: 'Franco' },
      { value: 'silt', label: 'Limoso' },
      { value: 'chalky', label: 'Calcáreo' },
      { value: 'peat', label: 'Turboso' }
    ]
  };
  
  return {
    fields: filteredFieldsList,
    loading,
    error,
    selectedField,
    selectedLot,
    dialogOpen,
    dialogType,
    filterOptions,
    handleAddField,
    handleEditField,
    handleViewField,
    handleDeleteField,
    handleAddLot,
    handleEditLot,
    handleDeleteLot,
    handleSaveField,
    handleSaveLot,
    handleFilterChange,
    handleSearch,
    handleCloseDialog,
    refreshData: loadData
  };
};

export default useFieldsController;