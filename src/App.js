import React, { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import { AuthProvider } from './contexts/AuthContext';
import { ParticipantsProvider, useParticipants } from './contexts/ParticipantsContext';
import Alert from '@mui/material/Alert';
import ProtectedRoute from './ProtectedRoute';
import AccesoDenegado from './pages/AccesoDenegado';
import CircularProgress from '@mui/material/CircularProgress';

// Lazy-loaded pages (route-level splitting)
const Dashboard = lazy(() => import('./pages/Dashboard'));
const FinancialReport = lazy(() => import('./pages/FinancialReport'));
const RegisterUser = lazy(() => import('./pages/RegisterUser'));
const RegisterParticipant = lazy(() => import('./pages/RegisterParticipant'));
const EditParticipant = lazy(() => import('./pages/EditParticipant'));
const Configuration = lazy(() => import('./pages/Configuration'));


function App() {
  return (
    <AuthProvider>
      <ParticipantsProvider>
        <Suspense fallback={<div style={{display:'flex',justifyContent:'center',padding:24}}><CircularProgress /></div>}>
          {/* Global provider error banner */}
          <ParticipantsErrorBanner />
          <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/acceso-denegado" element={<AccesoDenegado />} />
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />
          <Route path="/reporte-financiero" element={
            <ProtectedRoute>
              <FinancialReport />
            </ProtectedRoute>
          } />
          <Route path="/registrar-usuario" element={
            <ProtectedRoute>
              <RegisterUser />
            </ProtectedRoute>
          } />
          <Route path="/registrar" element={
            <ProtectedRoute>
              <RegisterParticipant />
            </ProtectedRoute>
          } />
          <Route path="/editar/:id" element={
            <ProtectedRoute>
              <EditParticipant />
            </ProtectedRoute>
          } />
          <Route path="/configuracion" element={
            <ProtectedRoute>
              <Configuration />
            </ProtectedRoute>
          } />
        </Routes>
        </Suspense>
      </ParticipantsProvider>
    </AuthProvider>
  );
}
export default App;

function ParticipantsErrorBanner() {
  const { error } = useParticipants();
  if (!error) return null;
  return <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>;
}
