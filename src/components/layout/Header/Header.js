import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import './header.css';

const Header = ({ title, sidebarCollapsed, toggleSidebar, mobileSidebar }) => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);

  // Cerrar menú al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(event) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setUserMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Obtener la primera letra del nombre del usuario
  const getInitials = () => {
    if (!currentUser) return 'U';
    return currentUser.displayName?.charAt(0)?.toUpperCase() || currentUser.email?.charAt(0)?.toUpperCase() || 'U';
  };

  // Manejar cierre de sesión
  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  // Manejar acceso al manual (preparado para futuro)
  const handleManual = () => {
    // Por ahora solo cerramos el menú, el manual se implementará más tarde
    setUserMenuOpen(false);
    console.log('Manual - Funcionalidad pendiente de implementar');
    // TODO: Implementar navegación al manual cuando esté listo
  };

  return (
    <header className={`header ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <div className="header-left">
        {/* Botón de menú para móviles */}
        <button className="mobile-menu-button" onClick={mobileSidebar}>
          <i className="fas fa-bars"></i>
        </button>

        {/* Título de la página */}
        <h1 className="header-title">{title}</h1>
      </div>

      {/* Acciones de usuario */}
      <div className="header-actions">
        {/* Menú de usuario simplificado */}
        <div className="user-menu" ref={userMenuRef}>
          <button className="user-button" onClick={() => setUserMenuOpen(!userMenuOpen)}>
            <div className="user-avatar">{getInitials()}</div>
            <div className="user-info">
              <div className="user-name">{currentUser?.displayName}</div>
              <div className="user-email">{currentUser?.email}</div>
            </div>
            <i className={`fas fa-chevron-${userMenuOpen ? 'up' : 'down'}`}></i>
          </button>

          {/* Menú desplegable de usuario - SIMPLIFICADO */}
          <div className={`user-menu-dropdown ${userMenuOpen ? 'open' : ''}`}>
            <a 
              href="#manual" 
              className="dropdown-item"
              onClick={(e) => { 
                e.preventDefault(); 
                handleManual(); 
              }}
            >
              <i className="fas fa-book"></i>
              <span>Manual de Usuario</span>
            </a>
            <div className="dropdown-divider"></div>
            <a 
              href="#logout" 
              className="dropdown-item" 
              onClick={(e) => { 
                e.preventDefault(); 
                handleLogout(); 
              }}
            >
              <i className="fas fa-sign-out-alt"></i>
              <span>Cerrar Sesión</span>
            </a>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;