import React from 'react';
import { Container, Typography, Box, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';

export default function AccesoDenegado() {
  const navigate = useNavigate();
  return (
    <Container maxWidth="sm">
      <Box mt={8} textAlign="center">
        <img src="/Access Denied.gif" alt="Access Denied" style={{ maxWidth: '220px', marginBottom: 24 }} />
        <Typography variant="h4" color="error" gutterBottom>
          Acceso Denegado
        </Typography>
        <Typography variant="body1" color="text.secondary" mb={3}>
          No tienes permiso para acceder a esta página. Por favor inicia sesión con un usuario autorizado.
        </Typography>
        <Button variant="outlined" color="primary" onClick={() => navigate('/')}>Ir a Login</Button>
      </Box>
    </Container>
  );
}
