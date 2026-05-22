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
  Alert,
  Box,
  Button,
  Checkbox,
  Container,
  Divider,
  Paper,
  TextField,
  Typography,
  FormControlLabel,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
} from "@mui/material";
import { db } from "../firebase";
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

export default function EditParticipant() {
  const [config, setConfig] = useState(DEFAULT_APP_CONFIG);
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
  const paymentMethods = getActivePaymentMethods(config);
  const costoCongreso = getEventCost(config);

  const [loading, setLoading] = useState(true);
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [cedula, setCedula] = useState("");
  const [telefono, setTelefono] = useState("");
  const [fechaNacimiento, setFechaNacimiento] = useState("");
  const [edad, setEdad] = useState("");
  const [montoPagado, setMontoPagado] = useState("");
  const [montoPagado2, setMontoPagado2] = useState("");
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
        const nextConfig = await getAppConfig();
        setConfig(nextConfig);
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
            setMontoPagado(String(getEventCost(nextConfig)));
          } else {
            setMontoPagado(
              data.montoOriginalPago !== undefined
                ? String(data.montoOriginalPago)
                : data.montoPagado !== undefined
                ? String(data.montoPagado)
                : ""
            );
          }
          setMontoPagado2(
            data.montoOriginalPago2 !== undefined
              ? String(data.montoOriginalPago2)
              : data.montoPagado2 !== undefined
              ? String(data.montoPagado2)
              : ""
          );
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
      const paymentLine1 = buildPaymentLine({
        amount: montoPagado,
        methodName: formaPago,
        reference: referencia,
        zelleInfo,
        exchangeRate: 0,
        config,
      });
      let tasaBCVActual = 0;
      const paymentLine2 = agregarSegundaForma
        ? buildPaymentLine({
            amount: montoPagado2,
            methodName: segundaFormaPago,
            reference: referencia2,
            zelleInfo: zelleInfo2,
            exchangeRate: 0,
            config,
          })
        : null;
      const requiresBcv = [paymentLine1, paymentLine2].some(
        (line) => line?.currency === "bs"
      );
      if (requiresBcv) {
        try {
          const resp = await fetch(
            "https://pydolarve.org/api/v1/dollar?page=bcv&monitor=usd"
          );
          const json = await resp.json();
          tasaBCVActual = json && json.price ? parseFloat(json.price) : 0;
        } catch (e) {
          tasaBCVActual = 0;
        }
      }
      const normalizedLine1 = buildPaymentLine({
        amount: montoPagado,
        methodName: formaPago,
        reference: referencia,
        zelleInfo,
        exchangeRate: tasaBCVActual,
        config,
      });
      const normalizedLine2 = agregarSegundaForma
        ? buildPaymentLine({
            amount: montoPagado2,
            methodName: segundaFormaPago,
            reference: referencia2,
            zelleInfo: zelleInfo2,
            exchangeRate: tasaBCVActual,
            config,
          })
        : null;
      const paymentLines = [normalizedLine1, normalizedLine2].filter(
        (line) => line && line.amountOriginal > 0
      );
      const { totalUsd: montoTotal } = summarizePayments(paymentLines);
      const monto1 = normalizedLine1.amountUsd;
      const monto2 = normalizedLine2?.amountUsd || 0;
      let pago = false;
      let excedente = 0;
      if (montoTotal >= costoCongreso) {
        pago = true;
        excedente = montoTotal > costoCongreso ? montoTotal - costoCongreso : 0;
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
            montoPagado: exento ? 0 : montoTotal,
            excedente: exento ? 0 : excedente,
            formaPago: exento ? "Exento" : monto1 > 0 ? normalizedLine1.methodName : "",
            referencia: exento
              ? ""
              : monto1 > 0
              ? normalizedLine1.reference
              : "",
            zelleInfo: exento
              ? ""
              : monto1 > 0
              ? normalizedLine1.zelleInfo
              : "",
            segundaFormaPago: exento
              ? ""
              : normalizedLine2?.amountUsd > 0
              ? normalizedLine2.methodName
              : "",
            montoPagado2: exento ? 0 : monto2,
            referencia2: exento
              ? ""
              : normalizedLine2?.amountUsd > 0
              ? normalizedLine2.reference
              : "",
            zelleInfo2: exento
              ? ""
              : normalizedLine2?.amountUsd > 0
              ? normalizedLine2.zelleInfo
              : "",
            monedaPago: exento ? "" : normalizedLine1.currency,
            monedaPago2: exento ? "" : normalizedLine2?.currency || "",
            montoOriginalPago: exento ? 0 : normalizedLine1.amountOriginal,
            montoOriginalPago2: exento ? 0 : normalizedLine2?.amountOriginal || 0,
            pagosDetalle: exento ? [] : paymentLines,
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
      if (montoTotal > 0 && montoTotal !== montoAnterior) {
             const nuevoPago = {
               fecha: new Date().toISOString(),
               monto: montoTotal,
               lineas: paymentLines,
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
      <Container maxWidth="sm" sx={{ py: { xs: 2, md: 4 } }}>
        <Paper sx={{ ...surfaceSx, p: 4, textAlign: "center" }}>
          <Typography variant="h6">Cargando datos...</Typography>
        </Paper>
      </Container>
    );
  }

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
                Edición
              </Typography>
              <Typography variant="h3" sx={{ fontSize: { xs: 28, md: 40 }, mt: 0.5 }}>
                Editar participante
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mt: 1, maxWidth: 620, fontSize: { xs: 14, md: 16 } }}>
                Actualiza el registro sin perder trazabilidad de pago.
              </Typography>
            </Box>

            <Paper sx={{ ...surfaceSx, p: { xs: 1.5, md: 2 }, minWidth: { xs: "100%", lg: 340 }, backgroundColor: "#F7F3E8" }}>
              <Typography variant="overline" color="text.secondary">
                Historial de pagos
              </Typography>
              {historialPagos && historialPagos.length > 0 ? (
                <Box sx={{ mt: 1.5, display: "grid", gap: 1 }}>
                  {historialPagos.map((h, idx) => (
                    <Box key={idx} sx={{ ...surfaceSx, p: 1.5, backgroundColor: "#FFFFFF" }}>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(h.fecha).toLocaleString("es-VE", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </Typography>
                      <Typography variant="body2" sx={{ mt: 0.5 }}>
                        Monto: ${h.monto.toFixed(2)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Tasa BCV: Bs. {h.tasaBCV
                          ? h.tasaBCV.toLocaleString("de-DE", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })
                          : "No disponible"}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
                  Aún no hay historial de pagos registrado para este participante.
                </Typography>
              )}
            </Paper>
          </Box>
        </Paper>

        {(errores.nombre || errores.apellido || errores.cedula || errores.telefono) && (
          <Alert severity="error" sx={{ borderRadius: 0 }}>
            Revisa los campos obligatorios antes de guardar.
          </Alert>
        )}

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
            error={!!errores.nombre}
            helperText={errores.nombre}
          />
          <TextField
            fullWidth
            label="Apellido"
            value={apellido}
            onChange={(e) => setApellido(capitalizeWords(e.target.value))}
            margin="normal"
            error={!!errores.apellido}
            helperText={errores.apellido}
          />
        </Box>
        <Box
          sx={{
            mt: 0,
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" },
            gap: { xs: 1.5, md: 2 },
          }}
        >
          <TextField
            fullWidth
            label="Cédula"
            value={cedula}
            onChange={handleCedula}
            margin="normal"
            error={!!errores.cedula}
            helperText={errores.cedula}
          />
          <TextField
            fullWidth
            label="Teléfono"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            margin="normal"
            error={!!errores.telefono}
            helperText={errores.telefono}
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
          {(!pago || (parseFloat(montoPagado) || 0) < costoCongreso) && (
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
          )}
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
              label="Segunda forma de pago"
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
          <Box
            sx={{
              mt: 2,
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              gap: 1,
            }}
          >
            <Button
              variant="contained"
              fullWidth
              onClick={handleGuardar}
            >
              Guardar cambios
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
