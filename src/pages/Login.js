import { useEffect, useState } from 'react';
import { signInWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import { Button, TextField, Container, Typography, Box, Divider } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [activeMethod, setActiveMethod] = useState('');
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard', { replace: true });
    }
  }, [loading, navigate, user]);

  const login = async () => {
    setActiveMethod('email');
    try {
      await signInWithEmailAndPassword(auth, email, password);
      setError('');
    } catch (err) {
      setError('Correo o contraseña incorrectos');
    } finally {
      setActiveMethod('');
    }
  };

  const loginWithGoogle = async () => {
    setActiveMethod('google');
    try {
      await signInWithPopup(auth, googleProvider);
      setError('');
    } catch (err) {
      if (err.code !== 'auth/popup-closed-by-user') {
        setError('No se pudo iniciar sesión con Google. Intenta nuevamente.');
      }
    } finally {
      setActiveMethod('');
    }
  };

  const isSubmitting = activeMethod !== '';

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
          disabled={isSubmitting}
        />
        <TextField
          fullWidth
          label="Contraseña"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          margin="normal"
          disabled={isSubmitting}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !isSubmitting) login();
          }}
        />
        <Button
          variant="contained"
          fullWidth
          onClick={login}
          sx={{ mt: 2 }}
          disabled={isSubmitting || !email || !password}
        >
          {activeMethod === 'email' ? 'Ingresando...' : 'Entrar con correo'}
        </Button>
        <Divider sx={{ my: 3 }}>o</Divider>
        <Button
          variant="outlined"
          fullWidth
          onClick={loginWithGoogle}
          disabled={isSubmitting}
        >
          {activeMethod === 'google' ? 'Conectando...' : 'Entrar con Google'}
        </Button>
      </Box>
    </Container>
  );
}
