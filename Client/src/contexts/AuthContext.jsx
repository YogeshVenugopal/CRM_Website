import React, { createContext, useContext, useState, useEffect } from 'react';
import { MOCK_USERS } from '../mock/mockData';
import { apiClient } from '../lib/apiClient';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('crm_current_user');
      return saved ? JSON.parse(saved) : MOCK_USERS[0];
    } catch (e) {
      return MOCK_USERS[0];
    }
  });

  const [loading, setLoading] = useState(false);

  // Sync user state with localStorage
  useEffect(() => {
    if (user) {
      localStorage.setItem('crm_current_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('crm_current_user');
    }
  }, [user]);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const res = await apiClient.post('/auth/login', { email, password });
      const loggedUser = res.data || MOCK_USERS.find((u) => u.email === email) || MOCK_USERS[0];
      setUser(loggedUser);
      return loggedUser;
    } catch (err) {
      // Fallback for offline demo
      const found = MOCK_USERS.find((u) => u.email === email) || MOCK_USERS[0];
      setUser(found);
      return found;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch (e) {
      console.log('Offline logout');
    } finally {
      setUser(null);
    }
  };

  /**
   * Role Switcher for instant testing across all 6 roles
   */
  const switchRole = (roleKey) => {
    const matchedUser = MOCK_USERS.find((u) => u.role === roleKey);
    if (matchedUser) {
      setUser(matchedUser);
    } else if (user) {
      setUser({ ...user, role: roleKey });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role || 'admin',
        loading,
        login,
        logout,
        switchRole,
        availableUsers: MOCK_USERS,
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
