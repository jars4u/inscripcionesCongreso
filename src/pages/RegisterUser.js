import { useState, useEffect } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { createSecondaryAuth, destroySecondaryApp } from '../firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { Container, Typography, TextField, Button, Box, Alert, InputAdornment, IconButton } from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function RegisterUser() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();

  const register = async () => {
    setError('');
    setSuccess('');
    setIsSubmitting(true);

    const { secondaryApp, secondaryAuth } = createSecondaryAuth();

    try {
      if (!email || !password) {
        throw new Error('Correo y contraseña son requeridos.');
      }

      if (password.length < 6) {
        throw new Error('La contraseña debe tener al menos 6 caracteres.');
      }

      if (password !== passwordConfirm) {
        throw new Error('Las contraseñas no coinciden.');
      }

      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
      console.log('createUserWithEmailAndPassword result:', userCredential);
      const createdUid = userCredential?.user?.uid;

      // Registrar en colección 'usuarios' para permitir listarlos desde la UI
      if (createdUid) {
        try {
          await setDoc(doc(db, 'usuarios', createdUid), {
            email,
            uid: createdUid,
            createdBy: user?.uid || null,
            createdAt: serverTimestamp(),
            provider: 'password',
          });
          console.log(`usuarios/${createdUid} written`);
        } catch (writeErr) {
          console.error('Failed writing usuarios doc:', writeErr);
          // don't fail the whole flow — surface a warning but continue
          setError(`Usuario creado pero no se pudo registrar en 'usuarios': ${writeErr?.message || String(writeErr)}`);
        }
      }

      setSuccess('Usuario creado exitosamente. Tu sesión como administrador se mantuvo activa.');
      setEmail('');
      setPassword('');
      setPasswordConfirm('');
      setShowPassword(false);
    } catch (err) {
      console.error('RegisterUser error:', err);
      // Firebase errors include a `code` property like 'auth/email-already-in-use' or 'auth/operation-not-allowed'
      const code = err?.code || err?.status || 'unknown';
      if (code === 'auth/operation-not-allowed' || (err && /operation-not-allowed/.test(String(err)))) {
        setError('El proveedor Email/Password no está habilitado en Firebase Auth. Habilítalo en la consola de Firebase.');
      } else if (code === 'auth/weak-password' || /weak-password/.test(String(err))) {
        setError('La contraseña es muy débil. Usa al menos 6 caracteres.');
      } else if (code === 'auth/email-already-in-use' || /email-already-in-use/.test(String(err))) {
        setError('El correo ya está en uso. Usa otro correo o borra la cuenta existente en Firebase Auth.');
      } else {
        setError(`${err?.message || 'No se pudo registrar el usuario.'} (${code})`);
      }
    } finally {
      await destroySecondaryApp(secondaryApp);
      setIsSubmitting(false);
    }
  };

  // Asegura que al montar el componente los campos estén limpios
  useEffect(() => {
    setEmail('');
    setPassword('');
    setPasswordConfirm('');
    setShowPassword(false);
    setError('');
    setSuccess('');
  }, []);

  if (!user || !isAdmin) {
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
      <Box component="form" mt={10} autoComplete="off">
        <Typography variant="h4" gutterBottom>Registrar Nuevo Usuario</Typography>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
        )}
        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>
        )}
        <TextField
          fullWidth
          label="Correo electrónico"
          name="register-email"
          autoComplete="off"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          margin="normal"
          disabled={isSubmitting}
        />
        <TextField
          fullWidth
          label="Contraseña"
          type={showPassword ? 'text' : 'password'}
          name="register-password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          margin="normal"
          disabled={isSubmitting}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  onClick={() => setShowPassword((s) => !s)}
                  edge="end"
                >
                  {showPassword ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            ),
          }}
        />
        <TextField
          fullWidth
          label="Confirmar contraseña"
          type={showPassword ? 'text' : 'password'}
          name="register-password-confirm"
          autoComplete="new-password"
          value={passwordConfirm}
          onChange={(e) => setPasswordConfirm(e.target.value)}
          margin="normal"
          disabled={isSubmitting}
          error={Boolean(passwordConfirm && password !== passwordConfirm)}
          helperText={passwordConfirm && password !== passwordConfirm ? 'Las contraseñas no coinciden' : ''}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  onClick={() => setShowPassword((s) => !s)}
                  edge="end"
                >
                  {showPassword ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            ),
          }}
        />
        <Button
          variant="contained"
          fullWidth
          onClick={register}
          sx={{ mt: 2 }}
          disabled={isSubmitting || !email || !password || !passwordConfirm || password !== passwordConfirm}
        >
          {isSubmitting ? 'Registrando...' : 'Registrar Usuario'}
        </Button>
        <Button
          variant="outlined"
          fullWidth
          sx={{ mt: 1 }}
          color="secondary"
          onClick={() => navigate(-1)}
          disabled={isSubmitting}
        >
          Volver atrás
        </Button>
      </Box>
    </Container>
  );
}
