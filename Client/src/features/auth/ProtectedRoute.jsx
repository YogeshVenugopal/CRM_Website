import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { hasPermission } from '../../utils/rbac';

export const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAF7] dark:bg-[#132A20] flex items-center justify-center text-sm font-mono text-[#6B7168]">
        Authenticating...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !hasPermission(role, allowedRoles)) {
    return (
      <div className="p-8 text-center space-y-4">
        <h2 className="text-xl font-bold font-display text-[#B5533E]">
          403 — Access Forbidden
        </h2>
        <p className="text-sm text-[#6B7168] dark:text-[#95A99B]">
          You don't have permission to view this section with role: <span className="font-mono font-bold">{role}</span>.
        </p>
      </div>
    );
  }

  return children;
};
