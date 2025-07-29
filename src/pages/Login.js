import { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';
import { Button, TextField, Container, Typography, Box } from '@mui/material';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const login = async () => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      setError('');
      navigate('/dashboard');
    } catch (err) {
      setError('Correo o contraseña incorrectos');
    }
  };

  return (
    <Container maxWidth="sm">
        <Box mt={4} mb={4} textAlign="center">
            <img
                src={process.env.PUBLIC_URL + '/Jovenes LOGO.png'}
                alt="Logo Jovenes"
                style={{ width: 180, marginBottom: 16 }}
            />
            <Typography variant="h4" fontWeight="bold" color="text.secondary">
                PLEROMA 2025
            </Typography>
            <Typography variant="h5" fontWeight="bold" gutterBottom>
                SISTEMA DE INSCRIPCIONES
            </Typography>
            {/* <Typography variant="subtitle1" gutterBottom>
                Ministerios de Jovenes con propósito
            </Typography> */}
        </Box>
      <Box mt={10}>
        <Typography variant="h4" gutterBottom>Iniciar Sesión</Typography>
        {error && (
          <Typography color="error" sx={{ mb: 2 }}>{error}</Typography>
        )}
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
          onKeyDown={(e) => {
            if (e.key === 'Enter') login();
          }}
        />
        <Button variant="contained" fullWidth onClick={login} sx={{ mt: 2 }}>
          Entrar
        </Button>
      </Box>
    </Container>
  );
}
