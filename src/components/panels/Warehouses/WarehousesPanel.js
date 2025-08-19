// src/components/panels/Warehouses/WarehousesPanel.js - Panel principal para gestión de almacenes
import React from 'react';
import './warehouses.css';
import WarehouseDialog from './WarehouseDialog';
import WarehouseDetailDialog from './WarehouseDetailDialog';

const WarehousesPanel = ({
  warehouses,
  fields,
  loading,
  error,
  selectedWarehouse,
  dialogOpen,
  dialogType,
  filterOptions,
  onAddWarehouse,
  onEditWarehouse,
  onViewWarehouse,
  onDeleteWarehouse,
  onSaveWarehouse,
  onFilterChange,
  onSearch,
  onCloseDialog,
  onRefresh
}) => {
  // Función para mostrar el campo asociado
  const getFieldName = (warehouse) => {
    if (!warehouse.fieldId) return 'No asignado';
    
    const field = fields.find(f => f.id === warehouse.fieldId);
    return field ? field.name : 'Campo desconocido';
  };

  // Función para mostrar el lote asociado
  const getLotName = (warehouse) => {
    if (!warehouse.lotId) return warehouse.isFieldLevel ? 'Todo el campo' : 'No asignado';
    
    // Buscar el campo primero
    const field = fields.find(f => f.id === warehouse.fieldId);
    if (!field) return 'Lote desconocido';
    
    // Buscar el lote dentro del campo
    const lot = field.lots.find(l => l.id === warehouse.lotId);
    return lot ? lot.name : 'Lote desconocido';
  };

  // NUEVA: Función para mostrar la asignación (campo/lote o proveedor)
  const getAssignmentDisplay = (warehouse) => {
    if (warehouse.assignmentType === 'supplier' || warehouse.supplierName) {
      return {
        type: 'supplier',
        primary: warehouse.supplierName || 'Proveedor sin nombre',
        secondary: warehouse.supplierContact || 'Sin contacto'
      };
    } else if (warehouse.fieldId) {
      return {
        type: 'field',
        primary: getFieldName(warehouse),
        secondary: getLotName(warehouse)
      };
    } else {
      return {
        type: 'none',
        primary: 'Sin asignar',
        secondary: ''
      };
    }
  };

  // NUEVA: Función para renderizar el icono de asignación
  const getAssignmentIcon = (assignmentType) => {
    switch (assignmentType) {
      case 'supplier':
        return 'fas fa-truck';
      case 'field':
        return 'fas fa-seedling';
      default:
        return 'fas fa-question-circle';
    }
  };

  // Función para obtener el icono según el tipo de almacén
  const getWarehouseIcon = (type) => {
    switch (type) {
      case 'silo':
        return 'fas fa-silo';
      case 'shed':
        return 'fas fa-warehouse';
      case 'barn':
        return 'fas fa-home';
      case 'cellar':
        return 'fas fa-box';
      case 'coldroom':
        return 'fas fa-snowflake';
      case 'outdoor':
        return 'fas fa-cloud-sun';
      default:
        return 'fas fa-warehouse';
    }
  };

  // Función para renderizar el estado como chip
  const renderStatusChip = (status) => {
    let chipClass = '';
    let statusText = '';

    switch (status) {
      case 'active':
        chipClass = 'chip-success';
        statusText = 'Activo';
        break;
      case 'inactive':
        chipClass = 'chip-danger';
        statusText = 'Inactivo';
        break;
      case 'maintenance':
        chipClass = 'chip-warning';
        statusText = 'En Mantenimiento';
        break;
      case 'full':
        chipClass = 'chip-info';
        statusText = 'Lleno';
        break;
      default:
        chipClass = 'chip-primary';
        statusText = status || 'Desconocido';
    }

    return <span className={`chip ${chipClass}`}>{statusText}</span>;
  };

  // Función para formatear capacidad con unidad
  const formatCapacity = (capacity, unit) => {
    if (!capacity && capacity !== 0) return 'No especificada';
    return `${capacity} ${unit}`;
  };

  // Mostrar estado de carga
  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Cargando almacenes...</p>
      </div>
    );
  }

  return (
    <div className="warehouses-container">
      {/* Encabezado */}
      <div className="warehouses-header">
        <h1 className="warehouses-title">Gestión de Almacenes</h1>
        <div className="warehouses-actions">
          <button
            className="btn btn-primary"
            onClick={onAddWarehouse}
          >
            <i className="fas fa-plus"></i> Nuevo Almacén
          </button>
          <button
            className="btn btn-icon"
            onClick={onRefresh}
            title="Actualizar datos"
          >
            <i className="fas fa-sync-alt"></i>
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="filters-container">
        <div className="filters-group">
          <div className="filter-item">
            <label htmlFor="statusFilter">Estado:</label>
            <select
              id="statusFilter"
              className="form-control"
              onChange={(e) => onFilterChange('status', e.target.value)}
              style={{ height: 'auto', minHeight: '40px', paddingTop: '8px', paddingBottom: '8px' }}
            >
              {filterOptions.status.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          
          <div className="filter-item">
            <label htmlFor="typeFilter">Tipo de almacén:</label>
            <select
              id="typeFilter"
              className="form-control"
              onChange={(e) => onFilterChange('type', e.target.value)}
              style={{ height: 'auto', minHeight: '40px', paddingTop: '8px', paddingBottom: '8px' }}
            >
              {filterOptions.warehouseTypes.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          
          <div className="filter-item">
            <label htmlFor="fieldFilter">Campo:</label>
            <select
              id="fieldFilter"
              className="form-control"
              onChange={(e) => onFilterChange('fieldId', e.target.value)}
              style={{ height: 'auto', minHeight: '40px', paddingTop: '8px', paddingBottom: '8px' }}
            >
              <option value="all">Todos los campos</option>
              {fields.map((field) => (
                <option key={field.id} value={field.id}>
                  {field.name}
                </option>
              ))}
            </select>
          </div>
          <div className="filter-item">
            <label htmlFor="assignmentTypeFilter">Asignación:</label>
            <select
              id="assignmentTypeFilter"
              className="form-control"
              value={filterOptions.assignmentType || 'all'}
              onChange={(e) => onFilterChange('assignmentType', e.target.value)}
              style={{ height: 'auto', minHeight: '40px', paddingTop: '8px', paddingBottom: '8px' }}
            >
              <option value="all">Todas las asignaciones</option>
              <option value="field">Campo/Lote</option>
              <option value="supplier">Proveedor</option>
              <option value="none">Sin asignar</option>
            </select>
          </div>
        </div>
        
        <div className="search-container">
          <div className="search-input">
            <i className="fas fa-search"></i>
            <input
              type="text"
              placeholder="Buscar almacenes..."
              onChange={(e) => onSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Mensaje de error si existe */}
      {error && (
        <div className="alert alert-error">
          <i className="fas fa-exclamation-circle"></i> {error}
          <button className="btn btn-sm" onClick={onRefresh}>
            <i className="fas fa-sync-alt"></i> Reintentar
          </button>
        </div>
      )}

      {/* Grid de almacenes */}
      {warehouses.length > 0 ? (
        <div className="warehouses-grid">
          {warehouses.map((warehouse) => (
            <div key={warehouse.id} className="warehouse-card">
              <div className="warehouse-header">
                <div className="warehouse-icon">
                  <i className={getWarehouseIcon(warehouse.type)}></i>
                </div>
                <div className="warehouse-title-container">
                  <h3 className="warehouse-title">{warehouse.name}</h3>
                  {renderStatusChip(warehouse.status)}
                </div>
              </div>
              
              <div className="warehouse-content">
                <div className="warehouse-details">
                  <div className="warehouse-detail">
                    <span className="detail-label">Tipo</span>
                    <span className="detail-value">
                      {filterOptions.warehouseTypes.find(t => t.value === warehouse.type)?.label || warehouse.type}
                    </span>
                  </div>
                  
                  {(() => {
                    const assignment = getAssignmentDisplay(warehouse);
                    return (
                      <>
                        <div className="warehouse-detail">
                          <span className="detail-label">
                            <i className={getAssignmentIcon(assignment.type)}></i>
                            {assignment.type === 'supplier' ? 'Proveedor' : 
                            assignment.type === 'field' ? 'Campo' : 'Asignación'}
                          </span>
                          <span className="detail-value">{assignment.primary}</span>
                        </div>
                        
                        {assignment.secondary && (
                          <div className="warehouse-detail">
                            <span className="detail-label">
                              {assignment.type === 'supplier' ? 'Contacto' : 'Lote'}
                            </span>
                            <span className="detail-value">{assignment.secondary}</span>
                          </div>
                        )}
                      </>
                    );
                  })()}
                  
                  <div className="warehouse-detail">
                    <span className="detail-label">Capacidad</span>
                    <span className="detail-value">{formatCapacity(warehouse.capacity, warehouse.capacityUnit)}</span>
                  </div>
                </div>

                {/* Tipo de almacenamiento */}
                <div className="storage-conditions">
                  <div className="condition-item">
                    <i className={warehouse.storageCondition === 'refrigerated' ? 'fas fa-snowflake' : 
                               warehouse.storageCondition === 'controlled_atmosphere' ? 'fas fa-wind' :
                               warehouse.storageCondition === 'ventilated' ? 'fas fa-fan' : 'fas fa-thermometer-half'}></i>
                    <span>
                      {warehouse.storageCondition === 'normal' && 'Ambiente normal'}
                      {warehouse.storageCondition === 'refrigerated' && 'Refrigerado'}
                      {warehouse.storageCondition === 'controlled_atmosphere' && 'Atmósfera controlada'}
                      {warehouse.storageCondition === 'ventilated' && 'Ventilado'}
                      {!warehouse.storageCondition && 'Condición estándar'}
                    </span>
                  </div>
                  
                  {warehouse.temperature && (
                    <div className="condition-item">
                      <i className="fas fa-thermometer-half"></i>
                      <span>{warehouse.temperature} °C</span>
                    </div>
                  )}
                  
                  {warehouse.humidity && (
                    <div className="condition-item">
                      <i className="fas fa-tint"></i>
                      <span>{warehouse.humidity}% humedad</span>
                    </div>
                  )}
                </div>

                {/* Información adicional del proveedor si aplica */}
                {getAssignmentDisplay(warehouse).type === 'supplier' && (
                  <div className="supplier-info">
                    {warehouse.supplierPhone && (
                      <div className="supplier-detail">
                        <i className="fas fa-phone"></i>
                        <span>{warehouse.supplierPhone}</span>
                      </div>
                    )}
                    {warehouse.supplierEmail && (
                      <div className="supplier-detail">
                        <i className="fas fa-envelope"></i>
                        <span>{warehouse.supplierEmail}</span>
                      </div>
                    )}
                  </div>
                )}
                
                <div className="warehouse-actions">
                  <button
                    className="btn btn-sm btn-outline"
                    onClick={() => onViewWarehouse(warehouse)}
                    title="Ver detalles"
                  >
                    <i className="fas fa-eye"></i> Detalles
                  </button>
                  
                  <button
                    className="btn-icon btn-icon-sm"
                    onClick={() => onEditWarehouse(warehouse)}
                    title="Editar almacén"
                  >
                    <i className="fas fa-edit"></i>
                  </button>
                  
                  <button
                    className="btn-icon btn-icon-sm btn-icon-danger"
                    onClick={() => {
                      if (window.confirm('¿Estás seguro de que deseas eliminar este almacén?')) {
                        onDeleteWarehouse(warehouse.id);
                      }
                    }}
                    title="Eliminar almacén"
                  >
                    <i className="fas fa-trash"></i>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-icon">
            <i className="fas fa-warehouse"></i>
          </div>
          <h2 className="empty-title">No hay almacenes registrados</h2>
          <p className="empty-description">
            Comienza añadiendo un nuevo almacén para gestionar el almacenamiento de tus productos.
          </p>
          <button className="btn btn-primary" onClick={onAddWarehouse}>
            <i className="fas fa-plus"></i> Añadir almacén
          </button>
        </div>
      )}

      {/* Diálogos */}
      {dialogOpen && (
        <div className="dialog-overlay">
          {dialogType === 'add-warehouse' || dialogType === 'edit-warehouse' ? (
            <WarehouseDialog
              warehouse={selectedWarehouse}
              fields={fields}
              isNew={dialogType === 'add-warehouse'}
              onSave={onSaveWarehouse}
              onClose={onCloseDialog}
            />
          ) : dialogType === 'view-warehouse' ? (
            <WarehouseDetailDialog
              warehouse={selectedWarehouse}
              fields={fields}
              onClose={onCloseDialog}
              onEditWarehouse={onEditWarehouse}
              onDeleteWarehouse={onDeleteWarehouse}
            />
          ) : null}
        </div>
      )}
    </div>
  );
};

export default WarehousesPanel;