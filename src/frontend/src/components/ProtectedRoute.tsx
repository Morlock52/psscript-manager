import React, { useContext } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import AuthContext from '../contexts/AuthContext';
import LoadingSpinner from './LoadingSpinner';

interface ProtectedRouteProps {
  children?: React.ReactNode;
  requiredRole?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredRole 
}) => {
  const { user, token, isLoading } = useContext(AuthContext);
  const location = useLocation();

  // Show loading spinner while authentication state is being determined
  if (isLoading) {
    return <LoadingSpinner />;
  }

  // Redirect to login if not authenticated
  if (!token || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check role-based access if required
  if (requiredRole && user.role !== requiredRole && user.role !== 'admin') {
    return <Navigate to="/unauthorized" replace />;
  }

  // Render children if provided, otherwise render Outlet for nested routes
  return children ? <>{children}</> : <Outlet />;
};

export default ProtectedRoute;