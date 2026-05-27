import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";
import {
  Box,
  Container,
  Alert,
  Paper,
  Typography,
} from "@mui/material";
import { getDb } from "../firebase";
import { useParticipants } from "../contexts/ParticipantsContext";
import ParticipantForm from "../components/ParticipantForm";
import useParticipantForm from "../hooks/useParticipantForm";
import { buildPaymentLine, getActivePaymentMethods, getEventCost, summarizePayments } from "../utils/paymentConfig";
import { useConfig } from "../contexts/ConfigContext";
import { useAuth } from "../contexts/AuthContext";

const surfaceSx = {
  backgroundColor: "#FFFFFF",
  border: "1px solid #D8D1C2",
  borderRadius: 0,
  boxShadow: "none",
};

export default function RegisterParticipant() {
  const navigate = useNavigate();
  const { config } = useConfig();
  const { user } = useAuth();
  const { addParticipant } = useParticipants();
  const paymentMethods = getActivePaymentMethods(config);
  const costoCongreso = getEventCost(config);

  const { participant, setParticipant, capitalizeWords, validarCedula, errorCedula, setErrorCedula, pagos, setPagos } = useParticipantForm();

  const [submitting, setSubmitting] = useState(false);
  const [exento, setExento] = useState(false);
  const [errorCampos, setErrorCampos] = useState("");

  const handleRegister = async ({ participant: p, pagos: pagosArr = [], exento: isExento }) => {
    if (submitting) return;
    setSubmitting(true);
    setErrorCampos("");
    if (!p.nombres || !p.apellidos || !p.ci || !p.telefonoMovil || !p.fechaNacimiento) {
      setErrorCampos("Por favor, completa todos los campos obligatorios.");
      setSubmitting(false);
      return;
    }
    if (errorCedula) {
      setErrorCampos("Corrige el campo de cédula antes de continuar.");
      setSubmitting(false);
      return;
    }
    try {
      const q = query(collection(getDb(), "participantes"), where("ci", "==", p.ci));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        setErrorCampos("Ya existe un participante con esa cédula.");
        setSubmitting(false);
        return;
      }
      let tasaBCVActual = 0;
      const requiresBcv = (pagosArr || []).some((line) => (line.currency === 'bs' || (line.methodName && line.methodName.toLowerCase().includes('bs'))));
      if (requiresBcv) {
        try {
          const resp = await fetch("https://pydolarve.org/api/v1/dollar?page=bcv&monitor=usd");
          const json = await resp.json();
          tasaBCVActual = json && json.price ? parseFloat(json.price) : 0;
        } catch (e) {
          tasaBCVActual = 0;
        }
      }

      const paymentLines = (pagosArr || [])
        .map((line) => buildPaymentLine({ amount: line.amountOriginal, methodName: line.methodName, reference: line.reference, zelleInfo: line.zelleInfo, exchangeRate: tasaBCVActual, config }))
        .filter((pl) => pl && pl.amountOriginal > 0);

      const { totalUsd: montoTotal } = summarizePayments(paymentLines);
      const monto1 = paymentLines[0]?.amountUsd || 0;
      let pago = false;
      let excedente = 0;
      if (montoTotal >= costoCongreso) {
        pago = true;
        excedente = montoTotal > costoCongreso ? montoTotal - costoCongreso : 0;
      }
      const nuevoPago = { fecha: new Date().toISOString(), monto: montoTotal, lineas: paymentLines, tasaBCV: tasaBCVActual };

      // Normalizar texto a mayúsculas antes de guardar (excepto campos excluidos)
      const EXCLUDE_UPPER = new Set(["email", "zelleInfo", "zelleInfo2", "referencia", "referencia2", "registradoPor", "tipoRegistro"]);
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

      const participantToSave = deepUppercase(p);

      await addParticipant({
        ...participantToSave,
        pago,
        montoPagado: isExento ? 0 : montoTotal,
        excedente: isExento ? 0 : excedente,
        formaPago: isExento ? "Exento" : monto1 > 0 ? paymentLines[0].methodName : "",
        referencia: isExento ? "" : paymentLines[0]?.reference || "",
        zelleInfo: isExento ? "" : paymentLines[0]?.zelleInfo || "",
        segundaFormaPago: isExento ? "" : paymentLines[1]?.amountUsd > 0 ? paymentLines[1].methodName : "",
        montoPagado2: isExento ? 0 : paymentLines[1]?.amountUsd || 0,
        referencia2: isExento ? "" : paymentLines[1]?.reference || "",
        zelleInfo2: isExento ? "" : paymentLines[1]?.zelleInfo || "",
        monedaPago: isExento ? "" : paymentLines[0]?.currency || "",
        monedaPago2: isExento ? "" : paymentLines[1]?.currency || "",
        montoOriginalPago: isExento ? 0 : paymentLines[0]?.amountOriginal || 0,
        montoOriginalPago2: isExento ? 0 : paymentLines[1]?.amountOriginal || 0,
        pagosDetalle: isExento ? [] : paymentLines,
        registradoPor: user.email,
        exento: isExento,
        fechaPago: nuevoPago.fecha,
        tasaBCVPago: tasaBCVActual,
        historialPagos: [nuevoPago],
        timestamp: serverTimestamp(),
      });
      // navigate to dashboard after optimistic add
      navigate(`/dashboard`);
    } catch (error) {
      console.error('RegisterParticipant error:', error);
      setErrorCampos(error?.message || "Error al registrar participante.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 1.5, md: 4 } }}>
      <Box display="grid" gap={2}>
        <Paper sx={{ ...surfaceSx, p: { xs: 1.5, md: 3.5 } }}>
          <Typography variant="overline" sx={{ color: "primary.main", letterSpacing: "0.12em" }}>
            Registro
          </Typography>
          <Typography variant="h3" sx={{ fontSize: { xs: 28, md: 40 }, mt: 0.5 }}>
            Registrar participante
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mt: 1, maxWidth: 620 }}>
            Completa los datos para registrar un nuevo participante.
          </Typography>
        </Paper>

        {errorCampos && (
          <Alert severity="error">{errorCampos}</Alert>
        )}

        <ParticipantForm
          participant={participant}
          setParticipant={setParticipant}
          capitalizeWords={capitalizeWords}
          errorCedula={errorCedula}
          setErrorCedula={setErrorCedula}
          validarCedula={validarCedula}
          pagos={pagos}
          addPayment={(p) => setPagos((cur) => [...cur, p])}
          updatePayment={(id, patch) => setPagos((cur) => cur.map((l) => (l.id === id ? { ...l, ...patch } : l)))}
          removePayment={(id) => setPagos((cur) => cur.filter((l) => l.id !== id))}
          exento={exento}
          setExento={setExento}
          paymentMethods={paymentMethods}
          costoCongreso={costoCongreso}
          surfaceSx={surfaceSx}
          submitLabel="Registrar"
          submitting={submitting}
          onSubmit={handleRegister}
        />
      </Box>
    </Container>
  );
}
