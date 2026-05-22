import { useState } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { createSecondaryAuth, destroySecondaryApp } from '../firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { Container, Typography, TextField, Button, Box, Alert } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function RegisterUser() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
      const createdUid = userCredential?.user?.uid;

      // Registrar en colección 'usuarios' para permitir listarlos desde la UI
      if (createdUid) {
        await setDoc(doc(db, 'usuarios', createdUid), {
          email,
          createdBy: user?.uid || null,
          createdAt: serverTimestamp(),
        });
      }

      setSuccess('Usuario creado exitosamente. Tu sesión como administrador se mantuvo activa.');
      setEmail('');
      setPassword('');
    } catch (err) {
      setError('No se pudo registrar el usuario. Verifica el correo y la contraseña e intenta nuevamente.');
    } finally {
      await destroySecondaryApp(secondaryApp);
      setIsSubmitting(false);
    }
  };

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
      <Box mt={10}>
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
        />
        <Button
          variant="contained"
          fullWidth
          onClick={register}
          sx={{ mt: 2 }}
          disabled={isSubmitting || !email || !password}
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
