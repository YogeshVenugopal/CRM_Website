import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { hasPermission } from '../../utils/rbac';

export const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FC] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#3B5BFD] border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium text-[#8A8FA3]">Loading...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !hasPermission(role, allowedRoles)) {
    return (
      <div className="p-8 text-center space-y-4">
        <h2 className="text-xl font-bold font-display text-[#EF4444]">
          403 — Access Denied
        </h2>
        <p className="text-sm text-[#8A8FA3]">
          You don't have permission to view this section.
          Your role: <span className="font-mono font-bold text-[#16181D]">{role}</span>
        </p>
      </div>
    );
  }

  return children;
};
