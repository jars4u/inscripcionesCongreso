import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from "./contexts/AuthContext";

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  // Si el contexto está cargando, no renderizar nada aún
  if (typeof loading !== "undefined" && loading) {
    return null;
  }
  if (!user) {
    return <Navigate to="/acceso-denegado" replace />;
  }
  return children;
}
