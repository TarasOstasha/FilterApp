// src/components/ProtectedRoute/ProtectedRoute.tsx
import React from 'react';
import { Navigate } from 'react-router-dom';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const token = localStorage.getItem('authToken');
  
  // If no token is found, redirect to login
  if (!token) {
    return <Navigate to="/login" />;
  }

  // Otherwise, render the protected component
  return <>{children}</>;
};

export default ProtectedRoute;
