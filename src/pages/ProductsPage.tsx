// src/pages/ProductsPage.tsx - Página principal de productos
import React from 'react';
import ProductsPanel from '../components/panels/Products/ProductsPanel';
import useProductsController from '../controllers/ProductsController';

const ProductsPage: React.FC = () => {
  const {
    products,
    fields,
    warehouses,
    loading,
    error,
    selectedProduct,
    dialogOpen,
    dialogType,
    filterOptions,
    filters,
    handleAddProduct,
    handleEditProduct,
    handleViewProduct,
    handleDeleteProduct,
    handleSaveProduct,
    handleFilterChange,
    handleSearch,
    handleCloseDialog,
    clearSpecialFilters,
    refreshData
  } = useProductsController();

  // Calcular estadísticas desde los productos
  const statistics = {
    totalProducts: products.length,
    lowStockProducts: products.filter(p => {
      const stock = p.stock || 0;
      const minStock = p.minStock || 0;
      return stock <= minStock && minStock > 0;
    }).length,
    expiringSoonProducts: products.filter(p => {
      if (!p.expirationDate) return false;
      
      try {
        const expiryDate = p.expirationDate.seconds 
          ? new Date(p.expirationDate.seconds * 1000) 
          : new Date(p.expirationDate);
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
        return expiryDate.getTime() <= thirtyDaysFromNow.getTime();
      } catch (error) {
        return false;
      }
    }).length,
    totalValue: products.reduce((total, p) => {
      const cost = p.cost || 0;
      const stock = p.stock || 0;
      return total + (cost * stock);
    }, 0)
  };

  return (
    <ProductsPanel
      products={products}
      fields={fields}
      warehouses={warehouses}
      loading={loading}
      error={error}
      selectedProduct={selectedProduct}
      dialogOpen={dialogOpen}
      dialogType={dialogType}
      filterOptions={filterOptions}
      filters={filters}
      statistics={statistics}
      handleAddProduct={handleAddProduct}
      handleEditProduct={handleEditProduct}
      handleViewProduct={handleViewProduct}
      handleDeleteProduct={handleDeleteProduct}
      handleSaveProduct={handleSaveProduct}
      handleFilterChange={handleFilterChange}
      handleSearch={handleSearch}
      handleCloseDialog={handleCloseDialog}
      clearSpecialFilters={clearSpecialFilters}
      refreshData={refreshData}
    />
  );
};

export default ProductsPage;