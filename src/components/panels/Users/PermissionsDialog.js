// src/components/panels/Users/PermissionsDialog.js - CORREGIDO: Solo dashboard obligatorio
import React, { useState, useEffect } from 'react';

const PermissionsDialog = ({
  open = false,
  user = null,
  onSave,
  onClose
}) => {
  const [permissions, setPermissions] = useState({});
  const [loading, setLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // CORREGIDO: Configuración de permisos sin actividades obligatorias
  const permissionGroups = [
    {
      title: 'Acceso Básico',
      icon: 'fas fa-home',
      permissions: [
        {
          key: 'dashboard',
          label: 'Panel Principal',
          description: 'Ver el panel principal con estadísticas generales',
          icon: 'fas fa-tachometer-alt',
          required: true // SOLO este es obligatorio
        },
        {
          key: 'activities',
          label: 'Historial de Actividades',
          description: 'Ver el registro de actividades del sistema',
          icon: 'fas fa-history',
          required: false // CORREGIDO: NO obligatorio
        }
      ]
    },
    {
      title: 'Gestión de Inventario',
      icon: 'fas fa-boxes',
      permissions: [
        {
          key: 'products',
          label: 'Productos',
          description: 'Gestionar el inventario de productos',
          icon: 'fas fa-box'
        },
        {
          key: 'transfers',
          label: 'Transferencias',
          description: 'Crear y gestionar transferencias entre almacenes',
          icon: 'fas fa-exchange-alt'
        },
        {
          key: 'purchases',
          label: 'Compras',
          description: 'Registrar y gestionar compras a proveedores',
          icon: 'fas fa-shopping-cart'
        },
        {
          key: 'expenses',
          label: 'Gastos',
          description: 'Registrar gastos y ventas de productos',
          icon: 'fas fa-receipt'
        }
      ]
    },
    {
      title: 'Gestión de Producción',
      icon: 'fas fa-seedling',
      permissions: [
        {
          key: 'fumigations',
          label: 'Fumigaciones',
          description: 'Programar y gestionar aplicaciones fitosanitarias',
          icon: 'fas fa-spray-can'
        },
        {
          key: 'harvests',
          label: 'Cosechas',
          description: 'Planificar y registrar cosechas',
          icon: 'fas fa-tractor'
        },
        {
          key: 'fields',
          label: 'Campos',
          description: 'Gestionar campos y lotes agrícolas',
          icon: 'fas fa-seedling'
        }
      ]
    },
    {
      title: 'Administración',
      icon: 'fas fa-cogs',
      permissions: [
        {
          key: 'warehouses',
          label: 'Almacenes',
          description: 'Gestionar almacenes y ubicaciones',
          icon: 'fas fa-warehouse'
        },
        {
          key: 'reports',
          label: 'Reportes',
          description: 'Generar y descargar reportes del sistema',
          icon: 'fas fa-chart-bar'
        },
        {
          key: 'users',
          label: 'Gestión de Usuarios',
          description: 'Crear y gestionar usuarios y permisos',
          icon: 'fas fa-users',
          dangerous: true
        },
        {
          key: 'admin',
          label: 'Acceso Administrativo',
          description: 'Acceso completo a todas las funciones del sistema',
          icon: 'fas fa-crown',
          dangerous: true
        }
      ]
    }
  ];

  // CORREGIDO: Cargar permisos del usuario sin forzar actividades
  useEffect(() => {
    if (user && open) {
      // CORREGIDO: Crear permisos iniciales sin actividades obligatorias
      const initialPermissions = {
        dashboard: true, // SOLO este obligatorio
        activities: false, // CORREGIDO: Por defecto false
        products: false,
        transfers: false,
        purchases: false,
        expenses: false,
        fumigations: false,
        harvests: false,
        fields: false,
        warehouses: false,
        reports: false,
        users: false,
        admin: false,
        ...user.permissions // Sobreescribir con los permisos reales del usuario
      };
      
      // CORREGIDO: Solo asegurar que dashboard esté activo
      initialPermissions.dashboard = true;
      
      setPermissions(initialPermissions);
      setHasChanges(false);
    }
  }, [user, open]);

  const handlePermissionChange = (permissionKey, value) => {
    // CORREGIDO: Solo dashboard no se puede desactivar
    if (permissionKey === 'dashboard' && !value) {
      return; // No permitir desactivar dashboard
    }

    setPermissions(prev => {
      const newPermissions = {
        ...prev,
        [permissionKey]: value
      };
      
      // Si se activa admin, activar todos los permisos
      if (permissionKey === 'admin' && value) {
        permissionGroups.forEach(group => {
          group.permissions.forEach(permission => {
            newPermissions[permission.key] = true;
          });
        });
      }
      
      // CORREGIDO: Si se desactiva admin, no hacer nada automático
      // El administrador debe elegir qué permisos mantener
      
      return newPermissions;
    });
    setHasChanges(true);
  };

  const handleSelectAll = () => {
    const allPermissions = {};
    permissionGroups.forEach(group => {
      group.permissions.forEach(permission => {
        allPermissions[permission.key] = true;
      });
    });
    setPermissions(allPermissions);
    setHasChanges(true);
  };

  const handleClearAll = () => {
    // CORREGIDO: Al limpiar todo, solo mantener dashboard activo
    const minimalPermissions = {};
    permissionGroups.forEach(group => {
      group.permissions.forEach(permission => {
        if (permission.key === 'dashboard') {
          minimalPermissions[permission.key] = true; // Dashboard siempre activo
        } else {
          minimalPermissions[permission.key] = false;
        }
      });
    });
    setPermissions(minimalPermissions);
    setHasChanges(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    setLoading(true);
    
    try {
      // CORREGIDO: Asegurar que dashboard esté siempre activo antes de guardar
      const finalPermissions = {
        ...permissions,
        dashboard: true // Forzar dashboard siempre activo
      };
      
      await onSave(finalPermissions);
    } catch (error) {
      console.error('Error al guardar permisos:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActivePermissionsCount = () => {
    return Object.values(permissions).filter(p => p === true).length;
  };

  const getTotalPermissionsCount = () => {
    return permissionGroups.reduce((total, group) => total + group.permissions.length, 0);
  };

  if (!open || !user) return null;

  return (
    <div className="dialog dialog-xl">
      <div className="dialog-header">
        <div className="dialog-title-section">
          <h2 className="dialog-title">
            <i className="fas fa-key"></i>
            Gestionar Permisos
          </h2>
          <p className="dialog-subtitle">
            Usuario: <strong>{user.displayName || user.username}</strong>
            <span className="permissions-summary">
              ({getActivePermissionsCount()} de {getTotalPermissionsCount()} permisos activos)
            </span>
          </p>
        </div>
        <button
          type="button"
          className="dialog-close"
          onClick={onClose}
          disabled={loading}
        >
          <i className="fas fa-times"></i>
        </button>
      </div>

      <div className="dialog-body">
        <form onSubmit={handleSubmit}>
          {/* Controles rápidos */}
          <div className="permissions-quick-actions">
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={handleSelectAll}
              disabled={loading}
            >
              <i className="fas fa-check-double"></i>
              Seleccionar todo
            </button>
            
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={handleClearAll}
              disabled={loading}
            >
              <i className="fas fa-times"></i>
              Solo Panel Principal
            </button>
          </div>

          {/* CORREGIDO: Advertencia sobre el único permiso obligatorio */}
          <div className="alert alert-info">
            <i className="fas fa-info-circle"></i>
            <strong>Panel Principal obligatorio:</strong> Este es el único permiso que no se puede desactivar. Todos los demás permisos son opcionales y se pueden quitar según sea necesario.
          </div>

          {/* Grupos de permisos */}
          <div className="permissions-groups">
            {permissionGroups.map((group, groupIndex) => (
              <div key={groupIndex} className="permission-group">
                <div className="permission-group-header">
                  <i className={group.icon}></i>
                  <h4>{group.title}</h4>
                </div>
                
                <div className="permission-group-content">
                  {group.permissions.map((permission) => (
                    <div 
                      key={permission.key} 
                      className={`permission-card ${permissions[permission.key] ? 'active' : ''} ${permission.dangerous ? 'dangerous' : ''} ${permission.required ? 'required' : ''}`}
                    >
                      <label className="permission-card-label">
                        <div className="permission-card-header">
                          <div className="permission-card-icon">
                            <i className={permission.icon}></i>
                          </div>
                          
                          <div className="permission-card-info">
                            <div className="permission-card-title">
                              {permission.label}
                              {permission.required && (
                                <span className="required-badge">Obligatorio</span>
                              )}
                              {permission.dangerous && (
                                <span className="dangerous-badge">Crítico</span>
                              )}
                            </div>
                            <div className="permission-card-description">
                              {permission.description}
                            </div>
                          </div>
                        </div>
                        
                        <div className="permission-card-toggle">
                          <input
                            type="checkbox"
                            checked={permissions[permission.key] || false}
                            onChange={(e) => handlePermissionChange(permission.key, e.target.checked)}
                            disabled={
                              loading || 
                              permission.required || // SOLO dashboard está marcado como required
                              (permission.key === 'dashboard') // Doble seguridad para dashboard
                            }
                            className="permission-checkbox"
                          />
                          <span className="permission-toggle-slider"></span>
                        </div>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Advertencias */}
          {permissions.admin && (
            <div className="alert alert-warning">
              <i className="fas fa-exclamation-triangle"></i>
              <strong>Acceso Administrativo:</strong> Este usuario tendrá acceso completo a todas las funciones del sistema, incluyendo la gestión de otros usuarios.
            </div>
          )}
          
          {permissions.users && !permissions.admin && (
            <div className="alert alert-info">
              <i className="fas fa-info-circle"></i>
              <strong>Gestión de Usuarios:</strong> Este usuario podrá crear y gestionar otros usuarios del sistema.
            </div>
          )}

          {/* CORREGIDO: Solo mostrar advertencia si NO hay permisos útiles (solo dashboard) */}
          {getActivePermissionsCount() === 1 && permissions.dashboard && (
            <div className="alert alert-warning">
              <i className="fas fa-exclamation-triangle"></i>
              <strong>Acceso limitado:</strong> Este usuario solo tendrá acceso al Panel Principal. Considera asignar permisos adicionales según sus responsabilidades.
            </div>
          )}
        </form>
      </div>

      <div className="dialog-footer">
        <div className="dialog-footer-info">
          <span className="permissions-count">
            {getActivePermissionsCount()} de {getTotalPermissionsCount()} permisos seleccionados
          </span>
          {hasChanges && (
            <span className="changes-indicator">
              <i className="fas fa-circle text-warning"></i>
              Cambios sin guardar
            </span>
          )}
        </div>
        
        <div className="dialog-footer-actions">
          <button
            type="button"
            className="btn btn-outline"
            onClick={onClose}
            disabled={loading}
          >
            Cancelar
          </button>
          
          <button
            type="submit"
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={loading || !hasChanges}
          >
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm mr-2"></span>
                Guardando...
              </>
            ) : (
              <>
                <i className="fas fa-save"></i>
                Guardar Permisos
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PermissionsDialog;