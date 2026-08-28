import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { mockService } from '../mock/mockService';
import { socket } from '../lib/socket';

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [toasts, setToasts] = useState([]);

  // Fetch initial notifications
  const loadNotifications = useCallback(async () => {
    try {
      const data = await mockService.getNotifications();
      setNotifications(data || []);
    } catch (e) {
      console.error('Failed to load notifications', e);
    }
  }, []);

  useEffect(() => {
    loadNotifications();

    // Socket listeners
    try {
      socket.connect();
      socket.on('notification', (newNotif) => {
        setNotifications((prev) => [newNotif, ...prev]);
        addToast({ title: newNotif.title, message: newNotif.message, type: 'info' });
      });
    } catch (e) {
      console.warn('Socket connection optional fallback.');
    }

    return () => {
      try {
        socket.disconnect();
      } catch (e) {}
    };
  }, [loadNotifications]);

  const addToast = useCallback(({ title, message, type = 'success', action = null, duration = 4000 }) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    const newToast = { id, title, message, type, action };
    setToasts((prev) => [...prev, newToast]);

    setTimeout(() => {
      removeToast(id);
    }, duration);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const markAsRead = async (id) => {
    await mockService.markNotificationRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = async () => {
    await mockService.markAllNotificationsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        toasts,
        addToast,
        removeToast,
        markAsRead,
        markAllAsRead,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within NotificationProvider');
  }
  return context;
};
