import { Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import { AuthProvider } from './contexts/AuthContext';
import RegisterUser from './pages/RegisterUser';
import RegisterParticipant from './pages/RegisterParticipant';
import EditParticipant from './pages/EditParticipant';
import ProtectedRoute from './ProtectedRoute';
import AccesoDenegado from './pages/AccesoDenegado';


function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/acceso-denegado" element={<AccesoDenegado />} />
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Dashboard />
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
      </Routes>
    </AuthProvider>
  );
}
export default App;
