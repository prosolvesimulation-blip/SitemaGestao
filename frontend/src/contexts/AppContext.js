import React, { createContext, useContext, useState, useCallback } from 'react';

const AppContext = createContext();

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp deve ser usado dentro de AppProvider');
  }
  return context;
};

export const AppProvider = ({ children }) => {
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const showNotification = useCallback((message, type = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarOpen((prev) => !prev);
  }, []);

  const value = {
    loading,
    setLoading,
    notification,
    showNotification,
    sidebarOpen,
    toggleSidebar,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
      {notification && (
        <div className={`notification notification-${notification.type}`}>
          {notification.message}
        </div>
      )}
    </AppContext.Provider>
  );
};