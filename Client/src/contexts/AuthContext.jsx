import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../lib/api';
import { apiClient } from '../lib/apiClient';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // On mount: restore session via /auth/me
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const me = await authApi.getMe();
        setUser(me);
      } catch {
        // Not authenticated — redirect to login handled by ProtectedRoute
      } finally {
        setLoading(false);
      }
    };
    restoreSession();
  }, []);

  const login = useCallback(async (email, password) => {
    setLoading(true);
    try {
      const { user: loggedUser } = await authApi.login(email, password);
      setUser(loggedUser);
      return loggedUser;
    } finally {
      setLoading(false);
    }
  }, []);

  const register = useCallback(async (name, email, password, role) => {
    setLoading(true);
    try {
      const { user: newUser } = await authApi.register(name, email, password, role);
      setUser(newUser);
      return newUser;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // ignore — clear locally regardless
    } finally {
      setUser(null);
    }
  }, []);

  // Fetch available users from backend for login page quick-select
  const [availableUsers, setAvailableUsers] = useState([]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        // Fetch real seeded users from the public auth endpoint
        const res = await apiClient.get('/auth/public-users');
        const users = (res.data || []).map((u) => ({
          id: u.id || u._id,
          name: u.name,
          email: u.email,
          role: u.role || 'employee',
        }));
        if (users.length > 0) setAvailableUsers(users);
      } catch {
        // If backend is not running or users aren't seeded, use fallback
        setAvailableUsers([
          { id: '1', name: 'Alex Vance', email: 'admin@company.com', role: 'admin' },
          { id: '2', name: 'Eleanor Vance', email: 'management@company.com', role: 'management' },
          { id: '3', name: 'Marcus Sterling', email: 'sales@company.com', role: 'sales' },
          { id: '4', name: 'Sarah Jenkins', email: 'pm@company.com', role: 'project_manager' },
          { id: '5', name: 'David Chen', email: 'employee@company.com', role: 'employee' },
          { id: '6', name: 'Rachel Green', email: 'finance@company.com', role: 'finance' },
        ]);
      }
    };
    fetchUsers();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role || null,
        loading,
        login,
        register,
        logout,
        availableUsers,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
