import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string;
  requiredRoles?: string[];
  requiredPermission?: string;
  requiredPermissions?: string[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children,
  requiredRole,
  requiredRoles,
  requiredPermission,
  requiredPermissions,
}) => {
  const { isAuthenticated, user } = useAuthStore();

  // Check authentication
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Check single role
  if (requiredRole && user?.role !== requiredRole) {
    return <Navigate to="/unauthorized" replace />;
  }

  // Check multiple roles (user must have at least one)
  if (requiredRoles && requiredRoles.length > 0) {
    const hasRole = user?.role && requiredRoles.includes(user.role);
    if (!hasRole) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  // Check single permission
  if (requiredPermission) {
    const hasPermission = user?.permissions?.includes(requiredPermission);
    if (!hasPermission) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  // Check multiple permissions (user must have all)
  if (requiredPermissions && requiredPermissions.length > 0) {
    const hasAllPermissions = requiredPermissions.every(
      permission => user?.permissions?.includes(permission)
    );
    if (!hasAllPermissions) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  return <>{children}</>;
};
