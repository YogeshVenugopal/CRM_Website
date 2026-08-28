import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../lib/api';

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

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // ignore — clear locally regardless
    } finally {
      setUser(null);
    }
  }, []);

  // Available users for login page demo selector
  const [availableUsers, setAvailableUsers] = useState([]);
  useEffect(() => {
    import('../mock/mockData')
      .then(({ MOCK_USERS }) => setAvailableUsers(MOCK_USERS))
      .catch(() => {});
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role || 'admin',
        loading,
        login,
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
