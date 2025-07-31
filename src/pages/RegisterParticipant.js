import { useState } from 'react';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp, getDocs, query, where } from 'firebase/firestore';
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
  const [bautizado, setBautizado] = useState(false);
  const [miembro, setMiembro] = useState(false);
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  // Función para capitalizar cada palabra
  const capitalizeWords = (str) => str.replace(/\b\w+/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
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
  const [errorCedula, setErrorCedula] = useState('');
  const [errorCampos, setErrorCampos] = useState('');
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
    setErrorCampos('');
    if (!nombre || !apellido || !cedula || !telefono || !fechaNacimiento) {
      setErrorCampos('Por favor, completa todos los campos obligatorios.');
      return;
    }
    if (errorCedula) {
      setErrorCampos('Corrige el campo de cédula antes de continuar.');
      return;
    }
    try {
      // Validar que la cédula no esté repetida
      const q = query(collection(db, 'participantes'), where('cedula', '==', cedula));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        setErrorCampos('Ya existe un participante con esa cédula.');
        return;
      }
      await addDoc(collection(db, 'participantes'), {
        nombre,
        apellido,
        cedula,
        telefono,
        fechaNacimiento,
        edad,
        miembro,
        bautizado,
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
      navigate('/dashboard');
    } catch (error) {
      setErrorCampos('Error al registrar participante.');
    }
  };

  return (
    <Container maxWidth="sm">
      <Box mt={5}>
        <Typography variant="h4" gutterBottom>Registrar Participante</Typography>
        <Box display="flex" gap={2} mb={2}>
          <TextField
            fullWidth
            label="Nombre"
            value={nombre}
            onChange={(e) => setNombre(capitalizeWords(e.target.value))}
            margin="normal"
          />
          <TextField
            fullWidth
            label="Apellido"
            value={apellido}
            onChange={(e) => setApellido(capitalizeWords(e.target.value))}
            margin="normal"
          />
        </Box>
        <Box display="flex" gap={2} mb={2}>
          <TextField
            fullWidth
            label="Cédula"
            value={cedula}
            error={!!errorCedula}
            helperText={errorCedula}
            onChange={(e) => {
              const val = e.target.value;
              if (/[^0-9]/.test(val)) {
                setErrorCedula('Solo se permiten números, sin letras ni puntuación');
              } else {
                setErrorCedula('');
              }
              setCedula(val.replace(/[^0-9]/g, ''));
            }}
            margin="normal"
            inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }}
          />
          <TextField
            fullWidth
            label="Teléfono"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            margin="normal"
          />
        </Box>
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
        {/* Opción de miembro y bautizado */}
        <Box display="flex" gap={2} mb={1}>
          <FormControlLabel
            control={
              <Checkbox checked={miembro} onChange={(e) => setMiembro(e.target.checked)} />
            }
            label="Miembro"
          />
          <FormControlLabel
            control={
              <Checkbox checked={bautizado} onChange={(e) => setBautizado(e.target.checked)} />
            }
            label="Bautizado"
          />
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
        {errorCampos && (
          <Typography color="error" sx={{ mb: 2 }}>{errorCampos}</Typography>
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
