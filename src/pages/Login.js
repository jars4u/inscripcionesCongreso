import { useEffect, useState } from 'react';
import { signInWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import { Button, TextField, Container, Typography, Box, Divider, Paper, Alert, InputAdornment, IconButton } from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
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
  const [showPassword, setShowPassword] = useState(false);
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
      console.error('Login error (email):', err);
      // Mostrar mensaje más informativo durante desarrollo
      const msg = err?.code ? `${err.code}: ${err.message}` : 'Correo o contraseña incorrectos';
      setError(msg);
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
      console.error('Login error (google):', err);
      if (err.code !== 'auth/popup-closed-by-user') {
        const msg = err?.code ? `${err.code}: ${err.message}` : 'No se pudo iniciar sesión con Google. Intenta nuevamente.';
        setError(msg);
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
          display: 'flex',
          justifyContent: 'center',
          gap: 2,
        }}
      >
        <Paper sx={{ ...surfaceSx, p: { xs: 3, md: 4 }, display: 'flex', flexDirection: 'column', justifyContent: 'center', width: '100%', maxWidth: 520, mx: 'auto' }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, mb: 1 }}>
            <Box sx={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Box component="img" src={process.env.PUBLIC_URL + '/Jovenes LOGO.png'} alt="Logo Jovenes" sx={{ width: { xs: 80, sm: 100 }, maxWidth: '100%', display: 'block' }} />
              <Box component="img" src={process.env.PUBLIC_URL + '/pnglogo-camp.png'} alt="Logo Promovidos 2026" sx={{ width: { xs: 120, sm: 160 }, maxWidth: '100%', display: 'block' }} />
            </Box>
            <Typography variant="h5" fontWeight="bold" color="text.secondary" sx={{ textAlign: 'center', letterSpacing: '0.12em'   }}>
              SISTEMA DE INSCRIPCIONES
            </Typography>
          </Box>
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
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              margin="normal"
              disabled={isSubmitting}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isSubmitting) login();
              }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                      onClick={() => setShowPassword((s) => !s)}
                      edge="end"
                      size="large"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
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
