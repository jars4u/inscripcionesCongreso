import { useEffect, useState } from "react";
import { db } from "../firebase";
import {
  collection,
  addDoc,
  serverTimestamp,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import {
  Alert,
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
  Paper,
  Divider,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import {
  DEFAULT_APP_CONFIG,
  buildPaymentLine,
  getActivePaymentMethods,
  getAppConfig,
  getEventCost,
  summarizePayments,
} from "../utils/paymentConfig";

const surfaceSx = {
  backgroundColor: "#FFFFFF",
  border: "1px solid #D8D1C2",
  borderRadius: 0,
  boxShadow: "none",
};

export default function RegisterParticipant() {
  const [config, setConfig] = useState(DEFAULT_APP_CONFIG);
  const [bautizado, setBautizado] = useState(false);
  const [miembro, setMiembro] = useState(false);
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  // Función para capitalizar cada palabra
  const capitalizeWords = (str) =>
    str.replace(
      /\b\w+/g,
      (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
    );
  const [cedula, setCedula] = useState("");
  const [telefono, setTelefono] = useState("");
  const [fechaNacimiento, setFechaNacimiento] = useState("");
  const [edad, setEdad] = useState("");
  const [montoPagado, setMontoPagado] = useState("");
  const [montoPagado2, setMontoPagado2] = useState("");
  const [formaPago, setFormaPago] = useState("");
  const [referencia, setReferencia] = useState("");
  const [zelleInfo, setZelleInfo] = useState("");
  const [agregarSegundaForma, setAgregarSegundaForma] = useState(false);
  const [segundaFormaPago, setSegundaFormaPago] = useState("");
  const [referencia2, setReferencia2] = useState("");
  const [zelleInfo2, setZelleInfo2] = useState("");
  const [errorCedula, setErrorCedula] = useState("");
  const [errorCampos, setErrorCampos] = useState("");
  const [exento, setExento] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const paymentMethods = getActivePaymentMethods(config);
  const costoCongreso = getEventCost(config);

  useEffect(() => {
    let cancelled = false;

    const cargarConfiguracion = async () => {
      try {
        const nextConfig = await getAppConfig();
        if (!cancelled) {
          setConfig(nextConfig);
        }
      } catch (_) {
        if (!cancelled) {
          setConfig(DEFAULT_APP_CONFIG);
        }
      }
    };

    cargarConfiguracion();

    return () => {
      cancelled = true;
    };
  }, []);

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

  const handleSubmit = async () => {
    setErrorCampos("");
    if (!nombre || !apellido || !cedula || !telefono || !fechaNacimiento) {
      setErrorCampos("Por favor, completa todos los campos obligatorios.");
      return;
    }
    if (errorCedula) {
      setErrorCampos("Corrige el campo de cédula antes de continuar.");
      return;
    }
    try {
      // Validar que la cédula no esté repetida
      const q = query(
        collection(db, "participantes"),
        where("cedula", "==", cedula)
      );
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        setErrorCampos("Ya existe un participante con esa cédula.");
        return;
      }
      // Obtener tasa BCV actual para historial
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

      const paymentLine1 = buildPaymentLine({
        amount: montoPagado,
        methodName: formaPago,
        reference: referencia,
        zelleInfo,
        exchangeRate: tasaBCVActual,
        config,
      });
      const paymentLine2 = agregarSegundaForma
        ? buildPaymentLine({
            amount: montoPagado2,
            methodName: segundaFormaPago,
            reference: referencia2,
            zelleInfo: zelleInfo2,
            exchangeRate: tasaBCVActual,
            config,
          })
        : null;
      const paymentLines = [paymentLine1, paymentLine2].filter(
        (line) => line && line.amountOriginal > 0
      );
      const { totalUsd: montoTotal } = summarizePayments(paymentLines);
      const monto1 = paymentLine1.amountUsd;
      const monto2 = paymentLine2?.amountUsd || 0;
      let pago = false;
      let excedente = 0;
      if (montoTotal >= costoCongreso) {
        pago = true;
        excedente = montoTotal > costoCongreso ? montoTotal - costoCongreso : 0;
      }

      const nuevoPago = {
        fecha: new Date().toISOString(),
        monto: montoTotal,
        lineas: paymentLines,
        tasaBCV: tasaBCVActual,
      };
      await addDoc(collection(db, "participantes"), {
        nombre,
        apellido,
        cedula,
        telefono,
        fechaNacimiento,
        edad,
        miembro,
        bautizado,
        pago,
        montoPagado: exento ? 0 : montoTotal,
        excedente: exento ? 0 : excedente,
        formaPago: exento ? "Exento" : monto1 > 0 ? paymentLine1.methodName : "",
        referencia: exento
          ? ""
          : monto1 > 0
          ? paymentLine1.reference
          : "",
        zelleInfo: exento
          ? ""
          : monto1 > 0
          ? paymentLine1.zelleInfo
          : "",
        segundaFormaPago: exento
          ? ""
          : paymentLine2?.amountUsd > 0
          ? paymentLine2.methodName
          : "",
        montoPagado2: exento ? 0 : monto2,
        referencia2: exento
          ? ""
          : paymentLine2?.amountUsd > 0
          ? paymentLine2.reference
          : "",
        zelleInfo2: exento
          ? ""
          : paymentLine2?.amountUsd > 0
          ? paymentLine2.zelleInfo
          : "",
        monedaPago: exento ? "" : paymentLine1.currency,
        monedaPago2: exento ? "" : paymentLine2?.currency || "",
        montoOriginalPago: exento ? 0 : paymentLine1.amountOriginal,
        montoOriginalPago2: exento ? 0 : paymentLine2?.amountOriginal || 0,
        pagosDetalle: exento ? [] : paymentLines,
        registradoPor: user.email,
        exento,
        fechaPago: nuevoPago.fecha,
        tasaBCVPago: tasaBCVActual,
        historialPagos: [nuevoPago],
        timestamp: serverTimestamp(),
      });
      navigate("/dashboard");
    } catch (error) {
      setErrorCampos("Error al registrar participante.");
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 1.5, md: 4 } }}>
      <Box display="grid" gap={2}>
        <Paper sx={{ ...surfaceSx, p: { xs: 1.5, md: 3.5 } }}>
          <Box
            display="flex"
            flexDirection={{ xs: "column", lg: "row" }}
            justifyContent="space-between"
            gap={2}
          >
            <Box>
              <Typography variant="overline" sx={{ color: "primary.main", letterSpacing: "0.12em" }}>
                Registro
              </Typography>
              <Typography variant="h3" sx={{ fontSize: { xs: 28, md: 40 }, mt: 0.5 }}>
                Registrar participante
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mt: 1, maxWidth: 620, fontSize: { xs: 14, md: 16 } }}>
                Completa los datos esenciales y registra el pago en una sola vista.
              </Typography>
            </Box>
            <Paper sx={{ ...surfaceSx, p: { xs: 1.5, md: 2 }, minWidth: { xs: "100%", lg: 300 }, backgroundColor: "#F7F3E8" }}>
              <Typography variant="overline" color="text.secondary">
                Registro de pago
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                El pago se registrará con la fecha:
              </Typography>
              <Typography variant="subtitle2" sx={{ mt: 0.5, fontWeight: 700 }}>
                {new Date().toLocaleString("es-VE", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                y a la tasa BCV actual.
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Costo actual del evento: ${costoCongreso.toFixed(2)}
              </Typography>
            </Paper>
          </Box>
        </Paper>

        <Paper sx={{ ...surfaceSx, p: { xs: 1.5, md: 3 } }}>
          <Typography variant="overline" color="text.secondary">
            Datos personales
          </Typography>
          <Box
            sx={{
              mt: 2,
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" },
              gap: { xs: 1.5, md: 2 },
            }}
          >
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
            <TextField
              fullWidth
              label="Cédula"
              value={cedula}
              error={!!errorCedula}
              helperText={errorCedula}
              onChange={(e) => {
                const val = e.target.value;
                if (/[^0-9]/.test(val)) {
                  setErrorCedula(
                    "Solo se permiten números, sin letras ni puntuación"
                  );
                } else {
                  setErrorCedula("");
                }
                setCedula(val.replace(/[^0-9]/g, ""));
              }}
              margin="normal"
              inputProps={{ inputMode: "numeric", pattern: "[0-9]*" }}
            />
            <TextField
              fullWidth
              label="Teléfono"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              margin="normal"
            />
          </Box>

          <Box
            sx={{
              mt: 1,
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "minmax(0, 1fr) 180px" },
              gap: { xs: 1.5, md: 2 },
              alignItems: "center",
            }}
          >
            <TextField
              type="date"
              label="Fecha de nacimiento"
              InputLabelProps={{ shrink: true }}
              value={fechaNacimiento}
              onChange={handleFechaNacimiento}
              margin="normal"
            />
            <Paper sx={{ ...surfaceSx, p: 2, backgroundColor: "#F7F3E8" }}>
              <Typography variant="caption" color="text.secondary">
                Edad calculada
              </Typography>
              <Typography variant="h6" sx={{ mt: 0.5 }}>
                {edad ? edad : "-"}
              </Typography>
            </Paper>
          </Box>

          <Divider sx={{ my: { xs: 2, md: 2.5 } }} />

          <Box display="flex" flexWrap="wrap" gap={1}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={miembro}
                  onChange={(e) => setMiembro(e.target.checked)}
                />
              }
              label="Miembro"
              sx={{ ...surfaceSx, m: 0, px: 1.5, py: 0.5 }}
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={bautizado}
                  onChange={(e) => setBautizado(e.target.checked)}
                />
              }
              label="Bautizado"
              sx={{ ...surfaceSx, m: 0, px: 1.5, py: 0.5 }}
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={exento}
                  onChange={(e) => setExento(e.target.checked)}
                  color="primary"
                />
              }
              label="Exento"
              sx={{ ...surfaceSx, m: 0, px: 1.5, py: 0.5 }}
            />
          </Box>
        </Paper>

        {!exento && (
          <Paper sx={{ ...surfaceSx, p: { xs: 1.5, md: 3 } }}>
            <Typography variant="overline" color="text.secondary">
              Pago
            </Typography>
            <Box
              sx={{
                mt: 2,
                display: "grid",
                gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" },
                gap: { xs: 1.5, md: 2 },
                alignItems: "start",
              }}
            >
              <TextField
                fullWidth
                type="number"
                label={`Monto pagado (${formaPago ? paymentMethods.find((method) => method.nombre === formaPago)?.divisa || "$" : "$"})`}
                value={montoPagado}
                onChange={(e) =>
                  setMontoPagado(e.target.value.replace(/[^0-9.]/g, ""))
                }
                margin="normal"
                inputProps={{ min: 0, step: "0.01" }}
              />
              <FormControl fullWidth margin="normal">
                <InputLabel id="forma-pago-label">Forma de pago</InputLabel>
                <Select
                  labelId="forma-pago-label"
                  value={formaPago}
                  label="Forma de pago"
                  onChange={(e) => setFormaPago(e.target.value)}
                >
                  {paymentMethods.map((method) => (
                    <MenuItem key={method.id} value={method.nombre}>
                      {method.nombre} · {method.divisa === "bs" ? "Bs" : "$"}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            {paymentMethods.find((method) => method.nombre === formaPago)?.requiereReferencia && (
              <TextField
                fullWidth
                margin="normal"
                label="Número de referencia"
                value={referencia}
                onChange={(e) => setReferencia(e.target.value)}
              />
            )}
            {paymentMethods.find((method) => method.nombre === formaPago)?.requiereZelleInfo && (
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
                <Checkbox
                  checked={agregarSegundaForma}
                  onChange={(e) => setAgregarSegundaForma(e.target.checked)}
                />
              }
              label="Agregar segunda forma de pago"
              sx={{ ...surfaceSx, mt: 2, mx: 0, px: 1.5, py: 0.5 }}
            />

            {agregarSegundaForma && (
              <Box
                sx={{
                  mt: 1,
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" },
                  gap: { xs: 1.5, md: 2 },
                  alignItems: "start",
                }}
              >
                <TextField
                  fullWidth
                  type="number"
                    label={`Monto pagado 2do abono (${segundaFormaPago ? paymentMethods.find((method) => method.nombre === segundaFormaPago)?.divisa || "$" : "$"})`}
                  value={montoPagado2}
                  onChange={(e) =>
                    setMontoPagado2(e.target.value.replace(/[^0-9.]/g, ""))
                  }
                  margin="normal"
                  inputProps={{ min: 0, step: "0.01" }}
                />
                <FormControl fullWidth margin="normal">
                  <InputLabel id="segunda-forma-pago-label">Segunda forma de pago</InputLabel>
                  <Select
                    labelId="segunda-forma-pago-label"
                    value={segundaFormaPago}
                    label="Segunda forma de pago"
                    onChange={(e) => setSegundaFormaPago(e.target.value)}
                  >
                    {paymentMethods
                      .filter((method) => method.nombre !== formaPago)
                      .map((method) => (
                        <MenuItem key={method.id} value={method.nombre}>
                          {method.nombre} · {method.divisa === "bs" ? "Bs" : "$"}
                        </MenuItem>
                      ))}
                  </Select>
                </FormControl>
              </Box>
            )}
            {agregarSegundaForma && paymentMethods.find((method) => method.nombre === segundaFormaPago)?.requiereReferencia && (
              <TextField
                fullWidth
                margin="normal"
                label="Número de referencia (2da forma)"
                value={referencia2}
                onChange={(e) => setReferencia2(e.target.value)}
              />
            )}
            {agregarSegundaForma && paymentMethods.find((method) => method.nombre === segundaFormaPago)?.requiereZelleInfo && (
              <TextField
                fullWidth
                margin="normal"
                label="Número de confirmación o nombre del titular (2da forma)"
                value={zelleInfo2}
                onChange={(e) => setZelleInfo2(e.target.value)}
              />
            )}
          </Paper>
        )}

        <Paper sx={{ ...surfaceSx, p: { xs: 1.5, md: 3 } }}>
          <Typography variant="overline" color="text.secondary">
            Confirmación
          </Typography>
          {errorCampos && (
            <Alert severity="error" sx={{ mt: 2, borderRadius: 0 }}>
              {errorCampos}
            </Alert>
          )}
          <Box
            sx={{
              mt: 2,
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              gap: 1,
            }}
          >
            <Button
              variant="contained"
              fullWidth
              onClick={handleSubmit}
            >
              Registrar
            </Button>
            <Button
              variant="outlined"
              fullWidth
              color="secondary"
              onClick={() => navigate("/dashboard")}
            >
              Cancelar
            </Button>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
}
