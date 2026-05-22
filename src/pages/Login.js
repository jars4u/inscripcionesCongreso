import { useEffect, useState } from 'react';
import { signInWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import { Button, TextField, Container, Typography, Box, Divider, Paper, Alert } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const surfaceSx = {
  backgroundColor: '#FFFFFF',
  border: '1px solid #D8D1C2',
  borderRadius: 0,
  boxShadow: 'none',
};

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
    <Container maxWidth="lg" sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', py: { xs: 3, md: 6 } }}>
      <Box
        sx={{
          width: '100%',
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1.1fr) minmax(360px, 0.9fr)' },
          gap: 2,
        }}
      >
        <Paper
          sx={{
            ...surfaceSx,
            p: { xs: 3, md: 5 },
            background: 'linear-gradient(180deg, #F7F3E8 0%, #EEE8D8 100%)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minHeight: { xs: 'auto', md: 560 },
            gap: 3,
          }}
        >
          <Box>
            <Box
              mt={1}
              sx={{
                display: 'grid',
                gap: { xs: 2.5, md: 3 },
                justifyItems: { xs: 'start', md: 'center' },
              }}
            >
              <Box
                sx={{
                  display: 'grid',
                  gap: 1.25,
                  justifyItems: { xs: 'start', md: 'center' },
                }}
              >
                <Box
                  component="img"
                  src={process.env.PUBLIC_URL + '/Jovenes LOGO.png'}
                  alt="Logo Jovenes"
                  sx={{ width: { xs: 100, md: 150 }, maxWidth: '100%', display: 'block' }}
                />
                <Box
                  sx={{
                    width: { xs: '100%', sm: 280, md: 320 },
                    maxWidth: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 1,
                  }}
                >
                  <Box
                    component="img"
                    src={process.env.PUBLIC_URL + '/pnglogo-camp.png'}
                    alt="Logo Promovidos 2026"
                    sx={{ width: { xs: 150, md: 320 }, maxWidth: '100%', display: 'block' }}
                  />
                </Box>
              </Box>
              <Box sx={{ textAlign: { xs: 'left', md: 'center' } }}>
                <Typography variant="h4" fontWeight="bold" color="text.secondary" sx={{ mt: 1 }}>
                  SISTEMA DE INSCRIPCIONES
                </Typography>
              </Box>
            </Box>
          </Box>

          <Box>
            <Divider sx={{ my: 3 }} />
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, minmax(0, 1fr))' },
                gap: 1,
              }}
            >
              <Box sx={{ ...surfaceSx, p: 1.5, backgroundColor: '#FFFFFF' }}>
                <Typography variant="caption" color="text.secondary">Paso 1</Typography>
                <Typography variant="body2" fontWeight={700}>Identifica tu acceso</Typography>
              </Box>
              <Box sx={{ ...surfaceSx, p: 1.5, backgroundColor: '#FFFFFF' }}>
                <Typography variant="caption" color="text.secondary">Paso 2</Typography>
                <Typography variant="body2" fontWeight={700}>Entra con correo o Google</Typography>
              </Box>
              <Box sx={{ ...surfaceSx, p: 1.5, backgroundColor: '#FFFFFF' }}>
                <Typography variant="caption" color="text.secondary">Paso 3</Typography>
                <Typography variant="body2" fontWeight={700}>Continúa al dashboard</Typography>
              </Box>
            </Box>
          </Box>
        </Paper>

        <Paper sx={{ ...surfaceSx, p: { xs: 3, md: 4 }, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <Typography variant="overline" sx={{ color: 'text.secondary', letterSpacing: '0.12em' }}>
            Ingreso
          </Typography>
          <Typography variant="h4" sx={{ mt: 1 }}>Iniciar sesión</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 3 }}>
            Usa el método que ya tengas activo y entra sin pasos extra.
          </Typography>
          {error && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: 0 }}>
              {error}
            </Alert>
          )}
          <Box display="grid" gap={1.5}>
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
          </Box>
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
        </Paper>
      </Box>
    </Container>
  );
}
