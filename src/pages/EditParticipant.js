import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  doc,
  getDoc,
  updateDoc,
  getDocs,
  collection,
  query,
  where,
} from "firebase/firestore";
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
  FormControl,
} from "@mui/material";
import { db } from "../firebase";

export default function EditParticipant() {
  const [pago, setPago] = useState(false);
  const [exento, setExento] = useState(false);
  const [miembro, setMiembro] = useState(false);
  const [bautizado, setBautizado] = useState(false);
  // Función para capitalizar cada palabra
  const capitalizeWords = (str) =>
    str.replace(
      /\b\w+/g,
      (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
    );
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [cedula, setCedula] = useState("");
  const [telefono, setTelefono] = useState("");
  const [fechaNacimiento, setFechaNacimiento] = useState("");
  const [edad, setEdad] = useState("");
  const [montoPagado, setMontoPagado] = useState("");
  const [fechaPago, setFechaPago] = useState("");
  const [tasaBCVPago, setTasaBCVPago] = useState("");
  const [historialPagos, setHistorialPagos] = useState([]);
  const [formaPago, setFormaPago] = useState("");
  const [referencia, setReferencia] = useState("");
  const [zelleInfo, setZelleInfo] = useState("");
  const [agregarSegundaForma, setAgregarSegundaForma] = useState(false);
  const [segundaFormaPago, setSegundaFormaPago] = useState("");
  const [referencia2, setReferencia2] = useState("");
  const [zelleInfo2, setZelleInfo2] = useState("");
  const [errores, setErrores] = useState({});

  // Calcular edad automáticamente
  const calcularEdad = (fecha) => {
    if (!fecha) return "";
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
      setErrores((prev) => ({ ...prev, cedula: "Solo números permitidos" }));
    }
  };

  // Validar campos obligatorios y cédula única
  const validarCampos = async () => {
    let nuevosErrores = {};
    if (!nombre) nuevosErrores.nombre = "El nombre es obligatorio";
    if (!apellido) nuevosErrores.apellido = "El apellido es obligatorio";
    if (!cedula) nuevosErrores.cedula = "La cédula es obligatoria";
    if (!telefono) nuevosErrores.telefono = "El teléfono es obligatorio";
    // Validar cédula única (excepto el mismo participante)
    const q = query(
      collection(db, "participantes"),
      where("cedula", "==", cedula)
    );
    const snapshot = await getDocs(q);
    if (!cedula) {
      // ya validado arriba
    } else if (snapshot.docs.length > 0 && snapshot.docs[0].id !== id) {
      nuevosErrores.cedula = "Ya existe un participante con esa cédula";
    }
    setErrores(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  };

  useEffect(() => {
    const cargarParticipante = async () => {
      try {
        const docRef = doc(db, "participantes", id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setNombre(data.nombre || "");
          setApellido(data.apellido || "");
          setCedula(data.cedula || "");
          setTelefono(data.telefono || "");
          setFechaNacimiento(data.fechaNacimiento || "");
          setEdad(
            data.edad ||
              (data.fechaNacimiento ? calcularEdad(data.fechaNacimiento) : "")
          );
          setMiembro(!!data.miembro);
          setBautizado(!!data.bautizado);
          setExento(!!data.exento);
          setPago(!!data.pago);
          // Si es pagado antiguo, mostrar 8 en el input
          if (
            data.pago &&
            (!data.montoPagado || parseFloat(data.montoPagado) === 0)
          ) {
            setMontoPagado("8");
          } else {
            setMontoPagado(
              data.montoPagado !== undefined ? String(data.montoPagado) : ""
            );
          }
          setFechaPago(data.fechaPago || "");
          setTasaBCVPago(data.tasaBCVPago || "");
          setHistorialPagos(data.historialPagos || []);
          setFormaPago(data.formaPago || "");
          setReferencia(data.referencia || "");
          setZelleInfo(data.zelleInfo || "");
          setAgregarSegundaForma(!!data.segundaFormaPago);
          setSegundaFormaPago(data.segundaFormaPago || "");
          setReferencia2(data.referencia2 || "");
          setZelleInfo2(data.zelleInfo2 || "");
        } else {
          // alert("Participante no encontrado");
          navigate("/dashboard");
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
      const monto = parseFloat(montoPagado) || 0;
      let pago = false;
      let excedente = 0;
      if (monto >= 8) {
        pago = true;
        excedente = monto > 8 ? monto - 8 : 0;
      }
      const docRef = doc(db, "participantes", id);
      // Leer el participante actual para comparar montoPagado
      const docSnap = await getDoc(docRef);
      let updateData = {
        nombre,
        apellido,
        cedula,
        telefono,
        fechaNacimiento,
        edad,
        miembro,
        bautizado,
        pago,
        montoPagado: exento ? 0 : monto,
        excedente: exento ? 0 : excedente,
        formaPago: exento ? "Exento" : monto > 0 ? formaPago : "",
        referencia: exento
          ? ""
          : monto > 0 && formaPago === "Pago movil"
          ? referencia
          : "",
        zelleInfo: exento
          ? ""
          : monto > 0 && formaPago === "Zelle"
          ? zelleInfo
          : "",
        segundaFormaPago: exento
          ? ""
          : agregarSegundaForma
          ? segundaFormaPago
          : "",
        referencia2: exento
          ? ""
          : agregarSegundaForma && segundaFormaPago === "Pago movil"
          ? referencia2
          : "",
        zelleInfo2: exento
          ? ""
          : agregarSegundaForma && segundaFormaPago === "Zelle"
          ? zelleInfo2
          : "",
        exento,
      };
      let montoAnterior = 0;
      let historialAnterior = [];
      if (docSnap.exists()) {
        const data = docSnap.data();
        montoAnterior = parseFloat(data.montoPagado) || 0;
        historialAnterior = Array.isArray(data.historialPagos)
          ? data.historialPagos
          : [];
      }
      // Si el montoPagado cambió y es mayor a 0, registrar fecha y tasa BCV en historial
      if (monto > 0 && monto !== montoAnterior) {
        let tasaBCVActual = 0;
        try {
          const resp = await fetch(
            "https://pydolarve.org/api/v1/dollar?page=bcv&monitor=usd"
          );
          const json = await resp.json();
          tasaBCVActual = json && json.price ? parseFloat(json.price) : 0;
        } catch (e) {
          tasaBCVActual = 0;
        }
        const nuevoPago = {
          fecha: new Date().toISOString(),
          monto,
          tasaBCV: tasaBCVActual,
        };
        updateData.fechaPago = nuevoPago.fecha;
        updateData.tasaBCVPago = tasaBCVActual;
        updateData.historialPagos = [...historialAnterior, nuevoPago];
      } else {
        updateData.historialPagos = historialAnterior;
      }
      await updateDoc(docRef, updateData);
      navigate("/dashboard");
    } catch (error) {
      // alert("Error al actualizar participante: " + error.message);
    }
  };

  if (loading) {
    return (
      <Typography variant="h6" align="center" mt={4}>
        Cargando datos...
      </Typography>
    );
  }

  return (
    <Container maxWidth="sm" sx={{ px: { xs: 1, sm: 2 } }}>
      <Box mt={{ xs: 2, sm: 5 }}>
        <Typography variant="h5" sx={{ fontSize: { xs: 20, sm: 28 } }}>
          Editar Participante
        </Typography>
        {/* Historial de pagos/abonos con fecha y tasa BCV */}
        {!loading && historialPagos && historialPagos.length > 0 && (
          <Box mb={2}>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontSize: 12 }}
            >
              Historial de pagos/abonos:
            </Typography>
            <Box>
              {historialPagos.map((h, idx) => (
                <Typography
                  key={idx}
                  variant="caption"
                  color="text.secondary"
                  sx={{ fontSize: 12, display: "block" }}
                >
                  {new Date(h.fecha).toLocaleString("es-VE", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}{" "}
                  | Monto: ${h.monto.toFixed(2)} | Tasa BCV: Bs.{" "}
                  {h.tasaBCV
                    ? h.tasaBCV.toLocaleString("de-DE", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })
                    : "No disponible"}
                </Typography>
              ))}
            </Box>
          </Box>
        )}
        <Box display="flex" gap={2} mb={2}>
          <TextField
            fullWidth
            label="Nombre"
            value={nombre}
            onChange={(e) => setNombre(capitalizeWords(e.target.value))}
            margin="normal"
            error={!!errores.nombre}
            helperText={errores.nombre}
            sx={{ fontSize: { xs: 12, sm: 16 } }}
          />
          <TextField
            fullWidth
            label="Apellido"
            value={apellido}
            onChange={(e) => setApellido(capitalizeWords(e.target.value))}
            margin="normal"
            error={!!errores.apellido}
            helperText={errores.apellido}
            sx={{ fontSize: { xs: 12, sm: 16 } }}
          />
        </Box>
        <Box display="flex" gap={2} mb={2}>
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
        </Box>
        <Box
          display="flex"
          flexDirection={{ xs: "column", sm: "row" }}
          alignItems={{ xs: "stretch", sm: "center" }}
          gap={2}
        >
          <TextField
            type="date"
            label="Fecha de nacimiento"
            InputLabelProps={{ shrink: true }}
            value={fechaNacimiento}
            onChange={handleFechaNacimiento}
            margin="normal"
            sx={{ flex: 1, fontSize: { xs: 12, sm: 16 } }}
          />
          <Typography
            sx={{
              width: { xs: "100%", sm: 120 },
              ml: { xs: 0, sm: 1 },
              fontSize: { xs: 12, sm: 16 },
              textAlign: { xs: "left", sm: "center" },
            }}
            variant="body1"
          >
            Edad: {edad ? edad : "-"}
          </Typography>
        </Box>
        {/* Opción de miembro y bautizado */}
        <Box display="flex" gap={2} mb={1}>
          <FormControlLabel
            control={
              <Checkbox
                checked={miembro}
                onChange={(e) => setMiembro(e.target.checked)}
              />
            }
            label="Miembro"
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={bautizado}
                onChange={(e) => setBautizado(e.target.checked)}
              />
            }
            label="Bautizado"
          />
          {(!pago || parseFloat(montoPagado) < 8) && (
            <FormControlLabel
              control={
                <Checkbox
                  checked={exento}
                  onChange={(e) => setExento(e.target.checked)}
                  color="primary"
                />
              }
              label="Exento de pago"
            />
          )}
        </Box>
        {!exento && (
          <>
            <Box display="flex" gap={2} mb={2} alignItems="center">
              <TextField
                fullWidth
                type="number"
                label="Monto pagado ($)"
                value={montoPagado}
                onChange={(e) =>
                  setMontoPagado(e.target.value.replace(/[^0-9.]/g, ""))
                }
                margin="normal"
                inputProps={{ min: 0, step: "0.01" }}
                sx={{ fontSize: { xs: 12, sm: 16 } }}
              />
              <FormControl
                fullWidth
                margin="normal"
                sx={{ fontSize: { xs: 12, sm: 16 } }}
              >
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
            </Box>
            {formaPago === "Pago movil" && (
              <TextField
                fullWidth
                margin="normal"
                label="Número de referencia"
                value={referencia}
                onChange={(e) => setReferencia(e.target.value)}
                sx={{ fontSize: { xs: 12, sm: 16 } }}
              />
            )}
            {formaPago === "Zelle" && (
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
                <Checkbox
                  checked={agregarSegundaForma}
                  onChange={(e) => setAgregarSegundaForma(e.target.checked)}
                  size="small"
                />
              }
              label="Segunda forma de pago"
              sx={{ mt: 2, fontSize: { xs: 12, sm: 16 } }}
            />
            {agregarSegundaForma && (
              <>
                <FormControl
                  fullWidth
                  margin="normal"
                  sx={{ fontSize: { xs: 12, sm: 16 } }}
                >
                  <InputLabel id="segunda-forma-pago-label">
                    Segunda forma de pago
                  </InputLabel>
                  <Select
                    labelId="segunda-forma-pago-label"
                    value={segundaFormaPago}
                    label="Segunda forma de pago"
                    onChange={(e) => setSegundaFormaPago(e.target.value)}
                    sx={{ fontSize: { xs: 12, sm: 16 } }}
                  >
                    {["Pago movil", "Efectivo", "Zelle"]
                      .filter((op) => op !== formaPago)
                      .map((op) => (
                        <MenuItem key={op} value={op}>
                          {op === "Pago movil" ? "Pago móvil" : op}
                        </MenuItem>
                      ))}
                  </Select>
                </FormControl>
                {segundaFormaPago === "Pago movil" && (
                  <TextField
                    fullWidth
                    margin="normal"
                    label="Número de referencia (2da forma)"
                    value={referencia2}
                    onChange={(e) => setReferencia2(e.target.value)}
                    sx={{ fontSize: { xs: 12, sm: 16 } }}
                  />
                )}
                {segundaFormaPago === "Zelle" && (
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
        <Button
          variant="contained"
          fullWidth
          sx={{ mt: 2, fontSize: { xs: 12, sm: 16 }, py: { xs: 0.5, sm: 1 } }}
          onClick={handleGuardar}
        >
          Guardar cambios
        </Button>
        <Button
          variant="outlined"
          fullWidth
          sx={{ mt: 1, fontSize: { xs: 12, sm: 16 }, py: { xs: 0.5, sm: 1 } }}
          color="secondary"
          onClick={() => navigate("/dashboard")}
        >
          Cancelar
        </Button>
      </Box>
    </Container>
  );
}
