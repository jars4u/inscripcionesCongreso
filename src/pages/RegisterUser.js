import { useState } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';
import { Container, Typography, TextField, Button, Box, Alert } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function RegisterUser() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { user } = useAuth();
  const navigate = useNavigate();

  // Cambia este email por el ADMINISTRADOR que puede registrar usuarios
  const adminEmail = ["jars4u2@gmail.com", "carlosurdaneta@gmail.com"];

  const register = async () => {
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      // alert('Usuario creado exitosamente');
      navigate('/dashboard');
    } catch (err) {
      // alert('Error al registrar usuario: ' + err.message);
    }
  };

  if (!user || user.email !== adminEmail) {
    return (
      <Container maxWidth="sm">
        <Box mt={10}>
          <Alert severity="error">No tienes permiso para registrar usuarios.</Alert>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm">
      <Box mt={10}>
        <Typography variant="h4" gutterBottom>Registrar Nuevo Usuario</Typography>
        <TextField
          fullWidth
          label="Correo electrónico"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          margin="normal"
        />
        <TextField
          fullWidth
          label="Contraseña"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          margin="normal"
        />
        <Button variant="contained" fullWidth onClick={register} sx={{ mt: 2 }}>
          Registrar Usuario
        </Button>
        <Button
          variant="outlined"
          fullWidth
          sx={{ mt: 1 }}
          color="secondary"
          onClick={() => navigate(-1)}
        >
          Volver atrás
        </Button>
      </Box>
    </Container>
  );
}
