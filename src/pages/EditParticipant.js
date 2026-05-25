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
import { Alert, Box, Container, Paper, Typography } from "@mui/material";
import { db } from "../firebase";
import {
  buildPaymentLine,
  getActivePaymentMethods,
  getEventCost,
  summarizePayments,
} from "../utils/paymentConfig";
import { useConfig } from "../contexts/ConfigContext";
import useParticipantForm from "../hooks/useParticipantForm";
import ParticipantForm from "../components/ParticipantForm";

const surfaceSx = {
  backgroundColor: "#FFFFFF",
  border: "1px solid #D8D1C2",
  borderRadius: 0,
  boxShadow: "none",
};

export default function EditParticipant() {
  const { config } = useConfig();
  const [exento, setExento] = useState(false);
  const { participant, setParticipant, capitalizeWords, calcularEdad, pagos, setPagos, normalizePaymentsFromDoc } = useParticipantForm();
  const { id } = useParams();
  const navigate = useNavigate();
  const paymentMethods = getActivePaymentMethods(config);
  const costoCongreso = getEventCost(config);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
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

  

  // Nota: validación de cédula gestionada por el formulario compartido

  // Validar campos obligatorios y cédula única
  const validarCampos = async () => {
    let nuevosErrores = {};
    if (!participant.nombres) nuevosErrores.nombre = "El nombre es obligatorio";
    if (!participant.apellidos) nuevosErrores.apellido = "El apellido es obligatorio";
    if (!participant.ci) nuevosErrores.cedula = "La cédula es obligatoria";
    if (!participant.telefonoMovil) nuevosErrores.telefono = "El teléfono es obligatorio";
    // Validar cédula única (excepto el mismo participante)
    const q = query(
      collection(db, "participantes"),
      where("ci", "==", participant.ci)
    );
    const snapshot = await getDocs(q);
    if (!participant.ci) {
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
          const edadVal = data.edad || (data.fechaNacimiento ? calcularEdad(data.fechaNacimiento) : 0);
          setParticipant({
            nombres: data.nombres || data.nombre || "",
            apellidos: data.apellidos || data.apellido || "",
            ci: data.ci || data.cedula || "",
            edad: edadVal,
            telefonoMovil: data.telefonoMovil || data.telefono || "",
            telefonoFijo: data.telefonoFijo || "",
            email: data.email || "",
            fechaNacimiento: data.fechaNacimiento || "",
            estadoCivil: data.estadoCivil || "Soltero",
            estadoCivilOtro: data.estadoCivilOtro || "",
            numHijos: data.numHijos || 0,
            profesion: data.profesion || "",
            ocupacion: data.ocupacion || "",
            viveConPadres: data.viveConPadres || false,
            nombreRepresentante: data.nombreRepresentante || "",
            telefonoRepresentante: data.telefonoRepresentante || "",
            sirveMinisterio: data.sirveMinisterio || data.sirveMinisterio || "",
            residencia: {
              zona: data.residencia?.zona || data.zona || "",
              municipio: data.residencia?.municipio || "",
              parroquia: data.residencia?.parroquia || "",
              sector: data.residencia?.sector || "",
              calle: data.residencia?.calle || "",
              avenida: data.residencia?.avenida || "",
              urbanizacion: data.residencia?.urbanizacion || "",
              barrio: data.residencia?.barrio || "",
              nroCasa: data.residencia?.nroCasa || "",
              puntoReferencia: data.residencia?.puntoReferencia || "",
              edificio: data.residencia?.edificio || "",
              piso: data.residencia?.piso || "",
              apto: data.residencia?.apto || "",
            },
            iglesia: {
              bautizado: data.iglesia?.bautizado || data.bautizado || false,
              miembro: data.iglesia?.miembro || data.miembro || false,
              afiliacion: data.iglesia?.afiliacion || "",
              bautismo: data.iglesia?.bautismo || "",
              visitante: data.iglesia?.visitante || "",
              cuantoTiempo: data.iglesia?.cuantoTiempo || "",
            },
            campamento: data.campamento || {
              medicamentoDependiente: { respuesta: false, detalle: "" },
              alergicoAlimento: { respuesta: false, detalle: "" },
              alergicoMedicamento: { respuesta: false, detalle: "" },
              enfermedad: { respuesta: false, detalle: "" },
              actividadFisica: { respuesta: false, detalle: "" },
            },
            tipoRegistro: data.tipoRegistro || (edadVal < 18 ? "Participante menor de edad" : "Participante"),
          });
          // miembro/bautizado están dentro de participant.iglesia
          setExento(!!data.exento);
          // pago state removed; mantenemos pago dentro del documento actualizado
          // Si es pagado antiguo, mostrar costo en el input
          if (data.pago && (!data.montoPagado || parseFloat(data.montoPagado) === 0)) {
            setMontoPagado(String(getEventCost(config)));
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
          // normalize pagosDetalle or legacy fields into pagos state
          setPagos(normalizePaymentsFromDoc(data));
          setFormaPago(data.formaPago || "");
          setReferencia(data.referencia || "");
          setZelleInfo(data.zelleInfo || "");
          setAgregarSegundaForma(!!data.segundaFormaPago);
          setSegundaFormaPago(data.segundaFormaPago || "");
          setReferencia2(data.referencia2 || "");
          setZelleInfo2(data.zelleInfo2 || "");
        } else {
          navigate("/dashboard");
        }
      } catch (error) {
        console.error("Error al cargar participante:", error);
      } finally {
        setLoading(false);
      }
    };

    cargarParticipante();
    return () => {};
  }, [id, navigate, config]);

  const handleGuardar = async ({ participant: p, pagos: pagosArr = [], exento: isExento }) => {
    if (submitting) return;
    setSubmitting(true);
    if (!(await validarCampos())) {
      setSubmitting(false);
      return;
    }
    try {
      let tasaBCVActual = 0;
      const requiresBcv = (pagosArr || []).some((line) => (line.currency === 'bs' || (line.methodName && line.methodName.toLowerCase().includes('bs'))));
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
      const normalizedLines = (pagosArr || []).map((line) => buildPaymentLine({ amount: line.amountOriginal, methodName: line.methodName, reference: line.reference, zelleInfo: line.zelleInfo, exchangeRate: tasaBCVActual, config }));
      const paymentLines = normalizedLines.filter((line) => line && line.amountOriginal > 0);
      const { totalUsd: montoTotal } = summarizePayments(paymentLines);
      const monto1 = normalizedLines[0]?.amountUsd || 0;
      const monto2 = normalizedLines[1]?.amountUsd || 0;
      let pago = false;
      let excedente = 0;
      if (montoTotal >= costoCongreso) {
        pago = true;
        excedente = montoTotal > costoCongreso ? montoTotal - costoCongreso : 0;
      }
      const docRef = doc(db, "participantes", id);
      // Normalizar texto a mayúsculas antes de actualizar (excepto campos excluidos)
      const EXCLUDE_UPPER = new Set(["email", "zelleInfo", "zelleInfo2", "referencia", "referencia2", "registradoPor"]);
      const deepUppercase = (value) => {
        if (value == null) return value;
        if (Array.isArray(value)) return value.map((v) => deepUppercase(v));
        if (typeof value === "object") {
          const out = {};
          Object.entries(value).forEach(([k, v]) => {
            out[k] = EXCLUDE_UPPER.has(k) ? v : deepUppercase(v);
          });
          return out;
        }
        if (typeof value === "string") return value.toUpperCase();
        return value;
      };
      const normalizedParticipant = deepUppercase(p);
      // Leer el participante actual para comparar montoPagado
      const docSnap = await getDoc(docRef);
          let updateData = {
            ...normalizedParticipant,
            miembro: !!participant.iglesia?.miembro,
            bautizado: !!participant.iglesia?.bautizado,
            pago,
            montoPagado: exento ? 0 : montoTotal,
            excedente: exento ? 0 : excedente,
            formaPago: exento ? "Exento" : monto1 > 0 ? normalizedLines[0]?.methodName || "" : "",
            referencia: exento
              ? ""
              : monto1 > 0
              ? normalizedLines[0]?.reference || ""
              : "",
            zelleInfo: exento
              ? ""
              : monto1 > 0
              ? normalizedLines[0]?.zelleInfo || ""
              : "",
            segundaFormaPago: exento
              ? ""
              : normalizedLines[1]?.amountUsd > 0
              ? normalizedLines[1]?.methodName
              : "",
            montoPagado2: exento ? 0 : monto2,
            referencia2: exento
              ? ""
              : normalizedLines[1]?.amountUsd > 0
              ? normalizedLines[1]?.reference || ""
              : "",
            zelleInfo2: exento
              ? ""
              : normalizedLines[1]?.amountUsd > 0
              ? normalizedLines[1]?.zelleInfo || ""
              : "",
            monedaPago: exento ? "" : normalizedLines[0]?.currency || "",
            monedaPago2: exento ? "" : normalizedLines[1]?.currency || "",
            montoOriginalPago: exento ? 0 : normalizedLines[0]?.amountOriginal || 0,
            montoOriginalPago2: exento ? 0 : normalizedLines[1]?.amountOriginal || 0,
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
    } finally {
      setSubmitting(false);
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

        <ParticipantForm
          participant={participant}
          setParticipant={setParticipant}
          capitalizeWords={capitalizeWords}
          validarCedula={() => { /* use existing validation flow in this page */ }}
          errorCedula={null}
          setErrorCedula={() => {}}
          pagos={pagos}
          addPayment={(p) => setPagos((cur) => [...cur, p])}
          updatePayment={(id, patch) => setPagos((cur) => cur.map((l) => (l.id === id ? { ...l, ...patch } : l)))}
          removePayment={(id) => setPagos((cur) => cur.filter((l) => l.id !== id))}
          exento={exento}
          setExento={setExento}
          paymentMethods={paymentMethods}
          costoCongreso={costoCongreso}
          surfaceSx={surfaceSx}
          submitLabel="Guardar cambios"
          submitting={submitting}
          onSubmit={handleGuardar}
        />
      </Box>
    </Container>
  );
}
