// src/components/panels/Users/UserDialog.js - Diálogo corregido sin actividades obligatorias
import React, { useState, useEffect } from 'react';

const UserDialog = ({
  open = false,
  type = 'add-user', // 'add-user', 'edit-user', 'view-user'
  user = null,
  onSave,
  onClose
}) => {
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    displayName: '',
    password: '',
    confirmPassword: '',
    role: 'user',
    permissions: {
      dashboard: true, // SOLO este es obligatorio
      activities: false, // CORREGIDO: No obligatorio
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
      admin: false
    }
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const isViewMode = type === 'view-user';
  const isEditMode = type === 'edit-user';
  const isAddMode = type === 'add-user';

  // Cargar datos del usuario al editar o ver
  useEffect(() => {
    if (user && (isEditMode || isViewMode)) {
      setFormData({
        email: user.email || '',
        username: user.username || '',
        displayName: user.displayName || '',
        password: '',
        confirmPassword: '',
        role: user.role || 'user',
        permissions: {
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
          ...user.permissions // Sobreescribir con los permisos actuales del usuario
        }
      });
    } else if (isAddMode) {
      // Resetear formulario para nuevo usuario
      setFormData({
        email: '',
        username: '',
        displayName: '',
        password: '',
        confirmPassword: '',
        role: 'user',
        permissions: {
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
          admin: false
        }
      });
    }
    setErrors({});
  }, [user, type, isEditMode, isViewMode, isAddMode]);

  // CORREGIDO: Función de permisos por rol sin actividades automáticas
  const getRolePermissions = (role) => {
    const basePermissions = {
      dashboard: true // SOLO dashboard obligatorio
    };

    switch (role) {
      case 'admin':
        return {
          dashboard: true,
          admin: true,
          products: true,
          transfers: true,
          purchases: true,
          expenses: true,
          fumigations: true,
          harvests: true,
          fields: true,
          warehouses: true,
          reports: true,
          users: true,
          activities: true // Solo para admin se sugiere actividades
        };
      
      case 'manager':
        return {
          dashboard: true,
          products: true,
          transfers: true,
          purchases: true,
          expenses: true,
          fumigations: true,
          harvests: true,
          fields: true,
          warehouses: true,
          reports: true,
          activities: true, // Sugerido para managers
          users: false,
          admin: false
        };
      
      case 'operator':
        return {
          dashboard: true,
          products: true,
          transfers: true,
          fumigations: true,
          harvests: true,
          activities: false, // CORREGIDO: No automático para operadores
          purchases: false,
          expenses: false,
          fields: false,
          warehouses: false,
          reports: false,
          users: false,
          admin: false
        };
      
      case 'viewer':
        return {
          dashboard: true,
          products: true,
          activities: false, // CORREGIDO: No automático para viewers
          transfers: false,
          purchases: false,
          expenses: false,
          fumigations: false,
          harvests: false,
          fields: false,
          warehouses: false,
          reports: false,
          users: false,
          admin: false
        };
      
      default: // 'user'
        return {
          dashboard: true,
          products: false, // CORREGIDO: Usuario básico no tiene productos automáticamente
          activities: false, // CORREGIDO: No automático
          transfers: false,
          purchases: false,
          expenses: false,
          fumigations: false,
          harvests: false,
          fields: false,
          warehouses: false,
          reports: false,
          users: false,
          admin: false
        };
    }
  };

  // Actualizar permisos según el rol seleccionado
  useEffect(() => {
    const rolePermissions = getRolePermissions(formData.role);
    setFormData(prev => ({
      ...prev,
      permissions: rolePermissions
    }));
  }, [formData.role]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Limpiar error del campo
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handlePermissionChange = (permission, value) => {
    // Dashboard no se puede desactivar
    if (permission === 'dashboard' && !value) {
      return;
    }

    setFormData(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [permission]: value
      }
    }));
  };

  const validateForm = () => {
    const newErrors = {};

    // Validar email
    if (!formData.email) {
      newErrors.email = 'El email es obligatorio';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'El formato del email no es válido';
    }

    // Validar username
    if (!formData.username) {
      newErrors.username = 'El nombre de usuario es obligatorio';
    } else if (formData.username.length < 3) {
      newErrors.username = 'El nombre de usuario debe tener al menos 3 caracteres';
    }

    // Validar displayName
    if (!formData.displayName) {
      newErrors.displayName = 'El nombre para mostrar es obligatorio';
    }

    // Validar contraseña (solo para nuevos usuarios)
    if (isAddMode) {
      if (!formData.password) {
        newErrors.password = 'La contraseña es obligatoria';
      } else if (formData.password.length < 6) {
        newErrors.password = 'La contraseña debe tener al menos 6 caracteres';
      }

      if (!formData.confirmPassword) {
        newErrors.confirmPassword = 'Confirma la contraseña';
      } else if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Las contraseñas no coinciden';
      }
    }

    // CORREGIDO: Validar que dashboard esté activo (es el único obligatorio)
    if (!formData.permissions.dashboard) {
      newErrors.permissions = 'El usuario debe tener acceso al Panel Principal';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    
    try {
      const submitData = { ...formData };
      
      // Para edición, no incluir contraseña vacía
      if (isEditMode && !submitData.password) {
        delete submitData.password;
        delete submitData.confirmPassword;
      }
      
      await onSave(submitData);
    } catch (error) {
      console.error('Error al guardar usuario:', error);
      setErrors({ submit: error.message });
    } finally {
      setLoading(false);
    }
  };

  const getDialogTitle = () => {
    switch (type) {
      case 'add-user':
        return 'Nuevo Usuario';
      case 'edit-user':
        return 'Editar Usuario';
      case 'view-user':
        return 'Detalles del Usuario';
      default:
        return 'Usuario';
    }
  };

  const roleOptions = [
    { value: 'user', label: 'Usuario básico', description: 'Solo acceso al dashboard' },
    { value: 'viewer', label: 'Visualizador', description: 'Solo lectura de productos e información' },
    { value: 'operator', label: 'Operador', description: 'Gestión de productos, transferencias y fumigaciones' },
    { value: 'manager', label: 'Gerente', description: 'Acceso completo excepto gestión de usuarios' },
    { value: 'admin', label: 'Administrador', description: 'Acceso completo a todas las funciones' }
  ];

  // CORREGIDO: Permisos sin actividades obligatorias
  const permissionGroups = [
    {
      title: 'Acceso Básico',
      icon: 'fas fa-home',
      permissions: [
        { key: 'dashboard', label: 'Panel Principal', icon: 'fas fa-tachometer-alt', required: true },
        { key: 'activities', label: 'Historial de Actividades', icon: 'fas fa-history', required: false } // CORREGIDO
      ]
    },
    {
      title: 'Gestión de Inventario',
      icon: 'fas fa-boxes',
      permissions: [
        { key: 'products', label: 'Productos', icon: 'fas fa-box' },
        { key: 'transfers', label: 'Transferencias', icon: 'fas fa-exchange-alt' },
        { key: 'purchases', label: 'Compras', icon: 'fas fa-shopping-cart' },
        { key: 'expenses', label: 'Gastos', icon: 'fas fa-receipt' }
      ]
    },
    {
      title: 'Gestión de Producción',
      icon: 'fas fa-seedling',
      permissions: [
        { key: 'fumigations', label: 'Fumigaciones', icon: 'fas fa-spray-can' },
        { key: 'harvests', label: 'Cosechas', icon: 'fas fa-tractor' },
        { key: 'fields', label: 'Campos', icon: 'fas fa-seedling' }
      ]
    },
    {
      title: 'Administración',
      icon: 'fas fa-cogs',
      permissions: [
        { key: 'warehouses', label: 'Almacenes', icon: 'fas fa-warehouse' },
        { key: 'reports', label: 'Reportes', icon: 'fas fa-chart-bar' },
        { key: 'users', label: 'Gestión de Usuarios', icon: 'fas fa-users', dangerous: true },
        { key: 'admin', label: 'Acceso Administrativo', icon: 'fas fa-crown', dangerous: true }
      ]
    }
  ];

  const getActivePermissionsCount = () => {
    return Object.values(formData.permissions).filter(p => p === true).length;
  };

  const getTotalPermissionsCount = () => {
    return permissionGroups.reduce((total, group) => total + group.permissions.length, 0);
  };

  if (!open) return null;

  return (
    <div className="dialog user-dialog">
      <div className="dialog-header">
        <h2 className="dialog-title">
          <i className="fas fa-user"></i>
          {getDialogTitle()}
        </h2>
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
        {errors.submit && (
          <div className="alert alert-error">
            <i className="fas fa-exclamation-circle"></i>
            {errors.submit}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-sections">
            
            {/* Información básica */}
            <div className="form-section">
              <h3 className="section-title">
                <i className="fas fa-user-circle"></i>
                Información básica
              </h3>

              <div className="form-grid">
                {/* Email */}
                <div className="form-group">
                  <label htmlFor="email" className="form-label required">Email</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    className={`form-control ${errors.email ? 'is-invalid' : ''}`}
                    value={formData.email}
                    onChange={handleInputChange}
                    disabled={isViewMode || loading}
                    placeholder="usuario@empresa.com"
                  />
                  {errors.email && (
                    <div className="invalid-feedback">{errors.email}</div>
                  )}
                </div>

                {/* Username */}
                <div className="form-group">
                  <label htmlFor="username" className="form-label required">Nombre de usuario</label>
                  <input
                    type="text"
                    id="username"
                    name="username"
                    className={`form-control ${errors.username ? 'is-invalid' : ''}`}
                    value={formData.username}
                    onChange={handleInputChange}
                    disabled={isViewMode || loading}
                    placeholder="nombreusuario"
                  />
                  {errors.username && (
                    <div className="invalid-feedback">{errors.username}</div>
                  )}
                </div>

                {/* Display Name */}
                <div className="form-group">
                  <label htmlFor="displayName" className="form-label required">Nombre para mostrar</label>
                  <input
                    type="text"
                    id="displayName"
                    name="displayName"
                    className={`form-control ${errors.displayName ? 'is-invalid' : ''}`}
                    value={formData.displayName}
                    onChange={handleInputChange}
                    disabled={isViewMode || loading}
                    placeholder="Nombre Apellido"
                  />
                  {errors.displayName && (
                    <div className="invalid-feedback">{errors.displayName}</div>
                  )}
                </div>

                {/* Role */}
                <div className="form-group">
                  <label htmlFor="role" className="form-label">Rol</label>
                  <select
                    id="role"
                    name="role"
                    className="form-control"
                    value={formData.role}
                    onChange={handleInputChange}
                    disabled={isViewMode || loading}
                    style={{ height: 'auto', minHeight: '40px', paddingTop: '8px', paddingBottom: '8px' }}
                  >
                    {roleOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <div className="form-text">
                    {roleOptions.find(r => r.value === formData.role)?.description}
                  </div>
                </div>
              </div>
            </div>

            {/* Contraseñas (solo para nuevos usuarios o edición) */}
            {(isAddMode || isEditMode) && (
              <div className="form-section">
                <h3 className="section-title">
                  <i className="fas fa-lock"></i>
                  {isAddMode ? 'Configuración de contraseña' : 'Cambiar contraseña (opcional)'}
                </h3>

                <div className="form-grid">
                  <div className="form-group">
                    <label htmlFor="password" className={`form-label ${isAddMode ? 'required' : ''}`}>
                      {isAddMode ? 'Contraseña' : 'Nueva contraseña'}
                    </label>
                    <input
                      type="password"
                      id="password"
                      name="password"
                      className={`form-control ${errors.password ? 'is-invalid' : ''}`}
                      value={formData.password}
                      onChange={handleInputChange}
                      disabled={loading}
                      placeholder={isAddMode ? 'Mínimo 6 caracteres' : 'Dejar vacío para mantener actual'}
                    />
                    {errors.password && (
                      <div className="invalid-feedback">{errors.password}</div>
                    )}
                  </div>

                  <div className="form-group">
                    <label htmlFor="confirmPassword" className={`form-label ${isAddMode ? 'required' : ''}`}>
                      Confirmar contraseña
                    </label>
                    <input
                      type="password"
                      id="confirmPassword"
                      name="confirmPassword"
                      className={`form-control ${errors.confirmPassword ? 'is-invalid' : ''}`}
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      disabled={loading}
                      placeholder={isAddMode ? 'Repetir contraseña' : 'Confirmar nueva contraseña'}
                    />
                    {errors.confirmPassword && (
                      <div className="invalid-feedback">{errors.confirmPassword}</div>
                    )}
                  </div>
                </div>

                {isEditMode && (
                  <div className="form-text">
                    <i className="fas fa-info-circle"></i>
                    Deja los campos de contraseña vacíos para mantener la contraseña actual
                  </div>
                )}
              </div>
            )}

            {/* Permisos */}
            <div className="form-section">
              <h3 className="section-title">
                <i className="fas fa-key"></i>
                Permisos y accesos
                <span className="permissions-summary">
                  ({getActivePermissionsCount()} de {getTotalPermissionsCount()} permisos activos)
                </span>
              </h3>

              {errors.permissions && (
                <div className="alert alert-error">
                  <i className="fas fa-exclamation-circle"></i>
                  {errors.permissions}
                </div>
              )}

              {formData.role === 'admin' && (
                <div className="alert alert-info">
                  <i className="fas fa-crown"></i>
                  <strong>Rol de Administrador:</strong> Este usuario tendrá acceso completo automáticamente a todas las funciones del sistema.
                </div>
              )}

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
                          className={`permission-card ${formData.permissions[permission.key] ? 'active' : ''} ${permission.dangerous ? 'dangerous' : ''} ${permission.required ? 'required' : ''}`}
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
                                    <span className="required-badge">Requerido</span>
                                  )}
                                  {permission.dangerous && (
                                    <span className="dangerous-badge">Crítico</span>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            <div className="permission-card-toggle">
                              <input
                                type="checkbox"
                                checked={formData.permissions[permission.key] || false}
                                onChange={(e) => handlePermissionChange(permission.key, e.target.checked)}
                                disabled={
                                  isViewMode || 
                                  loading || 
                                  permission.required ||
                                  formData.role === 'admin'
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

              {formData.role !== 'admin' && (
                <div className="form-text">
                  <i className="fas fa-info-circle"></i>
                  Los permisos se configuran automáticamente según el rol seleccionado, pero puedes ajustarlos manualmente si es necesario. Solo el Panel Principal es obligatorio.
                </div>
              )}
            </div>

          </div>
        </form>
      </div>

      <div className="dialog-footer">
        <button
          type="button"
          className="btn btn-outline"
          onClick={onClose}
          disabled={loading}
        >
          {isViewMode ? 'Cerrar' : 'Cancelar'}
        </button>
        
        {!isViewMode && (
          <button
            type="submit"
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm mr-2"></span>
                Guardando...
              </>
            ) : (
              <>
                <i className="fas fa-save"></i>
                {isAddMode ? 'Crear Usuario' : 'Guardar Cambios'}
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};

export default UserDialog;