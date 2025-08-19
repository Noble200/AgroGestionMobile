// src/pages/Users.js - Página completa de gestión de usuarios
import React from 'react';
import UsersPanel from '../components/panels/Users/UsersPanel';
import useUsersController from '../controllers/UsersController';

const Users = () => {
  // Usar el controlador para obtener datos y funciones
  const {
    users,
    loading,
    error,
    selectedUser,
    dialogOpen,
    dialogType,
    filterOptions,
    statistics,
    handleAddUser,
    handleEditUser,
    handleViewUser,
    handleManagePermissions,
    handleDeleteUser,
    handleSaveUser,
    handleSavePermissions,
    handleFilterChange,
    handleSearch,
    handleCloseDialog,
    refreshData
  } = useUsersController();

  // Renderizar el componente visual con los datos del controlador
  return (
    <UsersPanel
      users={users}
      loading={loading}
      error={error}
      selectedUser={selectedUser}
      dialogOpen={dialogOpen}
      dialogType={dialogType}
      filterOptions={filterOptions}
      statistics={statistics}
      onAddUser={handleAddUser}
      onEditUser={handleEditUser}
      onViewUser={handleViewUser}
      onManagePermissions={handleManagePermissions}
      onDeleteUser={handleDeleteUser}
      onSaveUser={handleSaveUser}
      onSavePermissions={handleSavePermissions}
      onFilterChange={handleFilterChange}
      onSearch={handleSearch}
      onCloseDialog={handleCloseDialog}
      onRefresh={refreshData}
    />
  );
};

export default Users;