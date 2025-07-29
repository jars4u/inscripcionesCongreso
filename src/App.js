import { Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import { AuthProvider } from './contexts/AuthContext';
import RegisterUser from './pages/RegisterUser';
import RegisterParticipant from './pages/RegisterParticipant';
import EditParticipant from './pages/EditParticipant';


function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/registrar-usuario" element={<RegisterUser />} />
        <Route path="/registrar" element={<RegisterParticipant />} />
        <Route path="/editar/:id" element={<EditParticipant />} />
      </Routes>
    </AuthProvider>
  );
}
export default App;
