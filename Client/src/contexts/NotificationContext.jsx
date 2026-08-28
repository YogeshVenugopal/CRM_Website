import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { notificationsApi } from '../lib/api';
import { socket } from '../lib/socket';

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [toasts, setToasts] = useState([]);

  const loadNotifications = useCallback(async () => {
    try {
      const { data } = await notificationsApi.list({ limit: 50 });
      setNotifications(data || []);
    } catch {
      // Not authenticated yet or server error — silently ignore
    }
  }, []);

  useEffect(() => {
    loadNotifications();

    // Socket.IO real-time connection
    try {
      socket.connect();

      socket.on('connect', () => {
        console.log('[Socket] Connected');
      });

      socket.on('notification', (newNotif) => {
        setNotifications((prev) => [newNotif, ...prev]);
        addToast({
          title: newNotif.title || 'New notification',
          message: newNotif.message || '',
          type: 'info',
        });
      });

      socket.on('disconnect', () => {
        console.log('[Socket] Disconnected');
      });

      socket.on('connect_error', () => {
        // Socket connection failed — non-critical, app works without real-time
      });
    } catch {
      // Socket.IO not available — app works without real-time
    }

    return () => {
      try {
        socket.off('notification');
        socket.disconnect();
      } catch {
        // ignore
      }
    };
  }, [loadNotifications]);

  const addToast = useCallback(
    ({ title, message, type = 'success', action = null, duration = 4000 }) => {
      const id = `toast-${Date.now()}-${Math.random()}`;
      const newToast = { id, title, message, type, action };
      setToasts((prev) => [...prev, newToast]);

      setTimeout(() => {
        removeToast(id);
      }, duration);
    },
    [],
  );

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const markAsRead = useCallback(async (id) => {
    try {
      await notificationsApi.markRead(id);
    } catch {
      // ignore
    }
    setNotifications((prev) =>
      prev.map((n) => ((n.id === id || n._id === id) ? { ...n, read: true, isRead: true } : n)),
    );
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await notificationsApi.markAllRead();
    } catch {
      // ignore
    }
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true, isRead: true })));
  }, []);

  const unreadCount = notifications.filter((n) => !n.read && !n.isRead).length;

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
