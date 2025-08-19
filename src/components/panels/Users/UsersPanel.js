// src/components/panels/Users/UsersPanel.js - Panel simplificado con lista de usuarios
import React from 'react';
import UserDialog from './UserDialog';
import PermissionsDialog from './PermissionsDialog';
import './users.css';

const UsersPanel = ({
  users = [],
  loading = false,
  error = '',
  selectedUser = null,
  dialogOpen = false,
  dialogType = '',
  onAddUser,
  onEditUser,
  onViewUser,
  onManagePermissions,
  onDeleteUser,
  onSaveUser,
  onSavePermissions,
  onSearch,
  onCloseDialog,
  onRefresh
}) => {
  // Función para formatear fecha
  const formatDate = (date) => {
    if (!date) return 'Nunca';
    
    try {
      const d = date.seconds ? new Date(date.seconds * 1000) : new Date(date);
      return d.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Fecha inválida';
    }
  };

  // Función para obtener el badge del rol
  const getRoleBadge = (role) => {
    const roleConfig = {
      admin: { label: 'Administrador', class: 'badge-danger', icon: 'fas fa-crown' },
      manager: { label: 'Gerente', class: 'badge-primary', icon: 'fas fa-user-tie' },
      operator: { label: 'Operador', class: 'badge-info', icon: 'fas fa-user-cog' },
      viewer: { label: 'Visualizador', class: 'badge-warning', icon: 'fas fa-eye' },
      user: { label: 'Usuario', class: 'badge-secondary', icon: 'fas fa-user' }
    };

    const config = roleConfig[role] || roleConfig.user;
    
    return (
      <span className={`badge ${config.class}`}>
        <i className={config.icon}></i>
        {config.label}
      </span>
    );
  };

  // Función para contar permisos activos
  const getActivePermissions = (permissions = {}) => {
    return Object.values(permissions).filter(p => p === true).length;
  };

  // Función para obtener lista de permisos activos
  const getActivePermissionsList = (permissions = {}) => {
    const permissionLabels = {
      dashboard: 'Dashboard',
      activities: 'Actividades',
      products: 'Productos',
      transfers: 'Transferencias',
      purchases: 'Compras',
      expenses: 'Gastos',
      fumigations: 'Fumigaciones',
      harvests: 'Cosechas',
      fields: 'Campos',
      warehouses: 'Almacenes',
      reports: 'Reportes',
      users: 'Usuarios',
      admin: 'Admin'
    };

    return Object.entries(permissions)
      .filter(([key, value]) => value === true)
      .map(([key]) => permissionLabels[key] || key)
      .join(', ');
  };

  // Mostrar estado de carga
  if (loading) {
    return (
      <div className="users-panel">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Cargando usuarios...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="users-panel">
      {/* Encabezado */}
      <div className="users-header">
        <div className="users-header-content">
          <div className="users-title-section">
            <h1 className="users-title">
              <i className="fas fa-users"></i>
              Gestión de Usuarios
            </h1>
            <p className="users-subtitle">
              Administra usuarios, roles y permisos del sistema
            </p>
          </div>
          
          <div className="users-actions">
            <button 
              className="btn btn-outline"
              onClick={onRefresh}
              disabled={loading}
              title="Actualizar lista"
            >
              <i className="fas fa-sync-alt"></i>
              Actualizar
            </button>
            
            <button 
              className="btn btn-primary"
              onClick={onAddUser}
              disabled={loading}
            >
              <i className="fas fa-plus"></i>
              Nuevo Usuario
            </button>
          </div>
        </div>
      </div>

      {/* Barra de búsqueda */}
      <div className="users-search">
        <div className="search-input">
          <i className="fas fa-search"></i>
          <input
            type="text"
            placeholder="Buscar por nombre, usuario o email..."
            onChange={(e) => onSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Mensaje de error */}
      {error && (
        <div className="alert alert-error">
          <i className="fas fa-exclamation-circle"></i>
          {error}
        </div>
      )}

      {/* Lista de usuarios */}
      <div className="users-content">
        {users.length > 0 ? (
          <div className="users-table-container">
            <table className="users-table">
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Email</th>
                  <th>Permisos</th>
                  <th>Última conexión</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div className="user-info">
                        <div className="user-avatar">
                          {(user.displayName || user.username || user.email).charAt(0).toUpperCase()}
                        </div>
                        <div className="user-details">
                          <div className="user-name">
                            {user.displayName || user.username}
                          </div>
                          <div className="user-role">
                            {getRoleBadge(user.role)}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="user-email">{user.email}</span>
                    </td>
                    <td>
                      <div className="permissions-info">
                        <div className="permissions-count">
                          {getActivePermissions(user.permissions)} permisos activos
                        </div>
                        <div className="permissions-list" title={getActivePermissionsList(user.permissions)}>
                          {getActivePermissionsList(user.permissions)}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="last-login">
                        {formatDate(user.lastLoginAt)}
                      </span>
                    </td>
                    <td>
                      <div className="row-actions">
                        <button
                          className="btn-icon btn-icon-primary"
                          onClick={() => onViewUser(user)}
                          title="Ver detalles"
                        >
                          <i className="fas fa-eye"></i>
                        </button>
                        
                        <button
                          className="btn-icon"
                          onClick={() => onEditUser(user)}
                          title="Editar usuario"
                        >
                          <i className="fas fa-edit"></i>
                        </button>
                        
                        <button
                          className="btn-icon btn-icon-warning"
                          onClick={() => onManagePermissions(user)}
                          title="Gestionar permisos"
                        >
                          <i className="fas fa-key"></i>
                        </button>
                        
                        <button
                          className="btn-icon btn-icon-danger"
                          onClick={() => onDeleteUser(user.id)}
                          title="Eliminar usuario"
                        >
                          <i className="fas fa-trash"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">
              <i className="fas fa-users"></i>
            </div>
            <h2 className="empty-title">No hay usuarios registrados</h2>
            <p className="empty-description">
              Comienza añadiendo un nuevo usuario para gestionar el acceso al sistema.
            </p>
            <button className="btn btn-primary" onClick={onAddUser}>
              <i className="fas fa-plus"></i> Añadir usuario
            </button>
          </div>
        )}
      </div>

      {/* Diálogos */}
      {dialogOpen && (dialogType === 'add-user' || dialogType === 'edit-user' || dialogType === 'view-user') && (
        <div className="dialog-overlay">
          <UserDialog
            open={dialogOpen}
            type={dialogType}
            user={selectedUser}
            onSave={onSaveUser}
            onClose={onCloseDialog}
          />
        </div>
      )}

      {dialogOpen && dialogType === 'permissions' && (
        <div className="dialog-overlay">
          <PermissionsDialog
            open={dialogOpen}
            user={selectedUser}
            onSave={onSavePermissions}
            onClose={onCloseDialog}
          />
        </div>
      )}
    </div>
  );
};

export default UsersPanel;