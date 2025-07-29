import { useState } from 'react';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import {
  Container,
  TextField,
  Typography,
  Button,
  Box,
  Checkbox,
  FormControlLabel,
  Select,
  MenuItem,
  InputLabel,
  FormControl
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function RegisterParticipant() {
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [cedula, setCedula] = useState('');
  const [telefono, setTelefono] = useState('');
  const [fechaNacimiento, setFechaNacimiento] = useState('');
  const [edad, setEdad] = useState('');
  const [pago, setPago] = useState(false);
  const [formaPago, setFormaPago] = useState('');
  const [referencia, setReferencia] = useState('');
  const [zelleInfo, setZelleInfo] = useState('');
  const [agregarSegundaForma, setAgregarSegundaForma] = useState(false);
  const [segundaFormaPago, setSegundaFormaPago] = useState('');
  const [referencia2, setReferencia2] = useState('');
  const [zelleInfo2, setZelleInfo2] = useState('');
  const { user } = useAuth();
  const navigate = useNavigate();

  // Calcular edad automáticamente
  const calcularEdad = (fecha) => {
    if (!fecha) return '';
    const hoy = new Date();
    const nacimiento = new Date(fecha);
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const m = hoy.getMonth() - nacimiento.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) {
      edad--;
    }
    return edad;
  };

  const handleFechaNacimiento = (e) => {
    setFechaNacimiento(e.target.value);
    setEdad(calcularEdad(e.target.value));
  };

  const handleSubmit = async () => {
    if (!nombre || !apellido || !cedula || !telefono) {
      // alert('Todos los campos son obligatorios');
      return;
    }

    try {
      await addDoc(collection(db, 'participantes'), {
        nombre,
        apellido,
        cedula,
        telefono,
        fechaNacimiento,
        edad,
        pago,
        formaPago: pago ? formaPago : '',
        referencia: pago && formaPago === 'Pago movil' ? referencia : '',
        zelleInfo: pago && formaPago === 'Zelle' ? zelleInfo : '',
        segundaFormaPago: agregarSegundaForma ? segundaFormaPago : '',
        referencia2: agregarSegundaForma && segundaFormaPago === 'Pago movil' ? referencia2 : '',
        zelleInfo2: agregarSegundaForma && segundaFormaPago === 'Zelle' ? zelleInfo2 : '',
        registradoPor: user.email,
        timestamp: serverTimestamp()
      });
      // alert('Participante registrado correctamente');
      navigate('/dashboard');
    } catch (error) {
      // alert('Error al registrar participante: ' + error.message);
    }
  };

  return (
    <Container maxWidth="sm">
      <Box mt={5}>
        <Typography variant="h4" gutterBottom>Registrar Participante</Typography>
        <TextField
          fullWidth
          label="Nombre"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          margin="normal"
        />
        <TextField
          fullWidth
          label="Apellido"
          value={apellido}
          onChange={(e) => setApellido(e.target.value)}
          margin="normal"
        />
        <TextField
          fullWidth
          label="Cédula"
          value={cedula}
          onChange={(e) => setCedula(e.target.value)}
          margin="normal"
        />
        <TextField
          fullWidth
          label="Teléfono"
          value={telefono}
          onChange={(e) => setTelefono(e.target.value)}
          margin="normal"
        />
        {/* Fecha de nacimiento y edad */}
        <Box display="flex" alignItems="center" gap={2}>
          <TextField
            type="date"
            label="Fecha de nacimiento"
            InputLabelProps={{ shrink: true }}
            value={fechaNacimiento}
            onChange={handleFechaNacimiento}
            margin="normal"
            sx={{ flex: 1 }}
          />
          <Typography sx={{ width: 120, ml: 1 }} variant="body1">
            Edad: {edad ? edad : '-'}
          </Typography>
        </Box>
        <FormControlLabel
          control={
            <Checkbox checked={pago} onChange={(e) => setPago(e.target.checked)} />
          }
          label="Pago cancelado"
        />
        {pago && (
          <>
            <FormControl fullWidth margin="normal">
              <InputLabel id="forma-pago-label">Forma de pago</InputLabel>
              <Select
                labelId="forma-pago-label"
                value={formaPago}
                label="Forma de pago"
                onChange={(e) => setFormaPago(e.target.value)}
              >
                <MenuItem value="Pago movil">Pago móvil</MenuItem>
                <MenuItem value="Efectivo">Efectivo</MenuItem>
                <MenuItem value="Zelle">Zelle</MenuItem>
              </Select>
            </FormControl>
            {formaPago === 'Pago movil' && (
              <TextField
                fullWidth
                margin="normal"
                label="Número de referencia"
                value={referencia}
                onChange={(e) => setReferencia(e.target.value)}
              />
            )}
            {formaPago === 'Zelle' && (
              <TextField
                fullWidth
                margin="normal"
                label="Número de confirmación o nombre del titular"
                value={zelleInfo}
                onChange={(e) => setZelleInfo(e.target.value)}
              />
            )}
            <FormControlLabel
              control={
                <Checkbox checked={agregarSegundaForma} onChange={(e) => setAgregarSegundaForma(e.target.checked)} />
              }
              label="Agregar segunda forma de pago"
              sx={{ mt: 2 }}
            />
            {agregarSegundaForma && (
              <>
                <FormControl fullWidth margin="normal">
                  <InputLabel id="segunda-forma-pago-label">Segunda forma de pago</InputLabel>
                  <Select
                    labelId="segunda-forma-pago-label"
                    value={segundaFormaPago}
                    label="Segunda forma de pago"
                    onChange={(e) => setSegundaFormaPago(e.target.value)}
                  >
                    {['Pago movil', 'Efectivo', 'Zelle'].filter(op => op !== formaPago).map(op => (
                      <MenuItem key={op} value={op}>{op === 'Pago movil' ? 'Pago móvil' : op}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                {segundaFormaPago === 'Pago movil' && (
                  <TextField
                    fullWidth
                    margin="normal"
                    label="Número de referencia (2da forma)"
                    value={referencia2}
                    onChange={(e) => setReferencia2(e.target.value)}
                  />
                )}
                {segundaFormaPago === 'Zelle' && (
                  <TextField
                    fullWidth
                    margin="normal"
                    label="Número de confirmación o nombre del titular (2da forma)"
                    value={zelleInfo2}
                    onChange={(e) => setZelleInfo2(e.target.value)}
                  />
                )}
              </>
            )}
          </>
        )}
        <Button variant="contained" fullWidth sx={{ mt: 2 }} onClick={handleSubmit}>
          Registrar
        </Button>
        <Button
          variant="outlined"
          fullWidth
          sx={{ mt: 1 }}
          color="secondary"
          onClick={() => navigate('/dashboard')}
        >
          Cancelar
        </Button>
      </Box>
    </Container>
  );
}
