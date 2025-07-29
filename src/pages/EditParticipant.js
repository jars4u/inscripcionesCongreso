import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  doc,
  getDoc,
  updateDoc,
  getDocs,
  collection,
  query,
  where
} from 'firebase/firestore';
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
import { db } from '../firebase';

export default function EditParticipant() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
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
  const [errores, setErrores] = useState({});

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

  // Validar cédula solo números
  const handleCedula = (e) => {
    const valor = e.target.value;
    if (/^\d*$/.test(valor)) {
      setCedula(valor);
      setErrores((prev) => ({ ...prev, cedula: undefined }));
    } else {
      setErrores((prev) => ({ ...prev, cedula: 'Solo números permitidos' }));
    }
  };

  // Validar campos obligatorios y cédula única
  const validarCampos = async () => {
    let nuevosErrores = {};
    if (!nombre) nuevosErrores.nombre = 'El nombre es obligatorio';
    if (!apellido) nuevosErrores.apellido = 'El apellido es obligatorio';
    if (!cedula) nuevosErrores.cedula = 'La cédula es obligatoria';
    if (!telefono) nuevosErrores.telefono = 'El teléfono es obligatorio';
    // Validar cédula única (excepto el mismo participante)
    const q = query(collection(db, 'participantes'), where('cedula', '==', cedula));
    const snapshot = await getDocs(q);
    if (!cedula) {
      // ya validado arriba
    } else if (snapshot.docs.length > 0 && snapshot.docs[0].id !== id) {
      nuevosErrores.cedula = 'Ya existe un participante con esa cédula';
    }
    setErrores(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  };

  useEffect(() => {
    const cargarParticipante = async () => {
      try {
        const docRef = doc(db, 'participantes', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setNombre(data.nombre || '');
          setApellido(data.apellido || '');
          setCedula(data.cedula || '');
          setTelefono(data.telefono || '');
          setFechaNacimiento(data.fechaNacimiento || '');
          setEdad(data.edad || (data.fechaNacimiento ? calcularEdad(data.fechaNacimiento) : ''));
          setPago(data.pago || false);
          setFormaPago(data.formaPago || '');
          setReferencia(data.referencia || '');
          setZelleInfo(data.zelleInfo || '');
          setAgregarSegundaForma(!!data.segundaFormaPago);
          setSegundaFormaPago(data.segundaFormaPago || '');
          setReferencia2(data.referencia2 || '');
          setZelleInfo2(data.zelleInfo2 || '');
        } else {
          // alert("Participante no encontrado");
          navigate('/dashboard');
        }
      } catch (error) {
        console.error("Error al cargar participante:", error);
      } finally {
        setLoading(false);
      }
    };

    cargarParticipante();
  }, [id, navigate]);

  const handleGuardar = async () => {
    if (!(await validarCampos())) {
      return;
    }
    try {
      const docRef = doc(db, 'participantes', id);
      await updateDoc(docRef, {
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
      });
      // alert("Participante actualizado correctamente");
      navigate('/dashboard');
    } catch (error) {
      // alert("Error al actualizar participante: " + error.message);
    }
  };

  if (loading) {
    return <Typography variant="h6" align="center" mt={4}>Cargando datos...</Typography>;
  }

  return (
    <Container maxWidth="sm" sx={{ px: { xs: 1, sm: 2 } }}>
      <Box mt={{ xs: 2, sm: 5 }}>
        <Typography variant="h5" gutterBottom sx={{ fontSize: { xs: 20, sm: 28 } }}>Editar Participante</Typography>
        <TextField
          fullWidth
          label="Nombre"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          margin="normal"
          error={!!errores.nombre}
          helperText={errores.nombre}
          sx={{ fontSize: { xs: 12, sm: 16 } }}
        />
        <TextField
          fullWidth
          label="Apellido"
          value={apellido}
          onChange={(e) => setApellido(e.target.value)}
          margin="normal"
          error={!!errores.apellido}
          helperText={errores.apellido}
          sx={{ fontSize: { xs: 12, sm: 16 } }}
        />
        <TextField
          fullWidth
          label="Cédula"
          value={cedula}
          onChange={handleCedula}
          margin="normal"
          error={!!errores.cedula}
          helperText={errores.cedula}
          sx={{ fontSize: { xs: 12, sm: 16 } }}
        />
        <TextField
          fullWidth
          label="Teléfono"
          value={telefono}
          onChange={(e) => setTelefono(e.target.value)}
          margin="normal"
          error={!!errores.telefono}
          helperText={errores.telefono}
          sx={{ fontSize: { xs: 12, sm: 16 } }}
        />
        <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'stretch', sm: 'center' }} gap={2}>
          <TextField
            type="date"
            label="Fecha de nacimiento"
            InputLabelProps={{ shrink: true }}
            value={fechaNacimiento}
            onChange={handleFechaNacimiento}
            margin="normal"
            sx={{ flex: 1, fontSize: { xs: 12, sm: 16 } }}
          />
          <Typography sx={{ width: { xs: '100%', sm: 120 }, ml: { xs: 0, sm: 1 }, fontSize: { xs: 12, sm: 16 }, textAlign: { xs: 'left', sm: 'center' } }} variant="body1">
            Edad: {edad ? edad : '-'}
          </Typography>
        </Box>
        <FormControlLabel
          control={
            <Checkbox checked={pago} onChange={(e) => setPago(e.target.checked)} size="small" />
          }
          label="Pago cancelado"
          sx={{ mt: 1, fontSize: { xs: 12, sm: 16 } }}
        />
        {pago && (
          <>
            <FormControl fullWidth margin="normal" sx={{ fontSize: { xs: 12, sm: 16 } }}>
              <InputLabel id="forma-pago-label">Forma de pago</InputLabel>
              <Select
                labelId="forma-pago-label"
                value={formaPago}
                label="Forma de pago"
                onChange={(e) => setFormaPago(e.target.value)}
                sx={{ fontSize: { xs: 12, sm: 16 } }}
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
                sx={{ fontSize: { xs: 12, sm: 16 } }}
              />
            )}
            {formaPago === 'Zelle' && (
              <TextField
                fullWidth
                margin="normal"
                label="Número de confirmación o nombre del titular"
                value={zelleInfo}
                onChange={(e) => setZelleInfo(e.target.value)}
                sx={{ fontSize: { xs: 12, sm: 16 } }}
              />
            )}
            <FormControlLabel
              control={
                <Checkbox checked={agregarSegundaForma} onChange={(e) => setAgregarSegundaForma(e.target.checked)} size="small" />
              }
              label="Segunda forma de pago"
              sx={{ mt: 2, fontSize: { xs: 12, sm: 16 } }}
            />
            {agregarSegundaForma && (
              <>
                <FormControl fullWidth margin="normal" sx={{ fontSize: { xs: 12, sm: 16 } }}>
                  <InputLabel id="segunda-forma-pago-label">Segunda forma de pago</InputLabel>
                  <Select
                    labelId="segunda-forma-pago-label"
                    value={segundaFormaPago}
                    label="Segunda forma de pago"
                    onChange={(e) => setSegundaFormaPago(e.target.value)}
                    sx={{ fontSize: { xs: 12, sm: 16 } }}
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
                    sx={{ fontSize: { xs: 12, sm: 16 } }}
                  />
                )}
                {segundaFormaPago === 'Zelle' && (
                  <TextField
                    fullWidth
                    margin="normal"
                    label="Número de confirmación o nombre del titular (2da forma)"
                    value={zelleInfo2}
                    onChange={(e) => setZelleInfo2(e.target.value)}
                    sx={{ fontSize: { xs: 12, sm: 16 } }}
                  />
                )}
              </>
            )}
          </>
        )}
        <Button variant="contained" fullWidth sx={{ mt: 2, fontSize: { xs: 12, sm: 16 }, py: { xs: 0.5, sm: 1 } }} onClick={handleGuardar}>
          Guardar cambios
        </Button>
        <Button
          variant="outlined"
          fullWidth
          sx={{ mt: 1, fontSize: { xs: 12, sm: 16 }, py: { xs: 0.5, sm: 1 } }}
          color="secondary"
          onClick={() => navigate('/dashboard')}
        >
          Cancelar
        </Button>
      </Box>
    </Container>
  );
}
