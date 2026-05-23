import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import {
  Box,
  Container,
  Alert,
  Paper,
  Typography,
} from "@mui/material";
import { db } from "../firebase";
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
  const paymentMethods = getActivePaymentMethods(config);
  const costoCongreso = getEventCost(config);

  const { participant, setParticipant, capitalizeWords, validarCedula, errorCedula, setErrorCedula } = useParticipantForm();

  const [montoPagado, setMontoPagado] = useState("");
  const [montoPagado2, setMontoPagado2] = useState("");
  const [formaPago, setFormaPago] = useState("");
  const [referencia, setReferencia] = useState("");
  const [zelleInfo, setZelleInfo] = useState("");
  const [agregarSegundaForma, setAgregarSegundaForma] = useState(false);
  const [segundaFormaPago, setSegundaFormaPago] = useState("");
  const [referencia2, setReferencia2] = useState("");
  const [zelleInfo2, setZelleInfo2] = useState("");
  const [exento, setExento] = useState(false);
  const [errorCampos, setErrorCampos] = useState("");

  const handleRegister = async ({ participant: p, montoPagado: mp, montoPagado2: mp2, formaPago: fp, referencia: ref, zelleInfo: zi, agregarSegundaForma: addSecond, segundaFormaPago: sfp, referencia2: ref2, zelleInfo2: zi2, exento: isExento }) => {
    setErrorCampos("");
    if (!p.nombres || !p.apellidos || !p.ci || !p.telefonoMovil || !p.fechaNacimiento) {
      setErrorCampos("Por favor, completa todos los campos obligatorios.");
      return;
    }
    if (errorCedula) {
      setErrorCampos("Corrige el campo de cédula antes de continuar.");
      return;
    }
    try {
      const q = query(collection(db, "participantes"), where("ci", "==", p.ci));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        setErrorCampos("Ya existe un participante con esa cédula.");
        return;
      }
      let tasaBCVActual = 0;
      try {
        const resp = await fetch("https://pydolarve.org/api/v1/dollar?page=bcv&monitor=usd");
        const json = await resp.json();
        tasaBCVActual = json && json.price ? parseFloat(json.price) : 0;
      } catch (e) {
        tasaBCVActual = 0;
      }

      const paymentLine1 = buildPaymentLine({ amount: mp, methodName: fp, reference: ref, zelleInfo: zi, exchangeRate: tasaBCVActual, config });
      const paymentLine2 = addSecond ? buildPaymentLine({ amount: mp2, methodName: sfp, reference: ref2, zelleInfo: zi2, exchangeRate: tasaBCVActual, config }) : null;
      const paymentLines = [paymentLine1, paymentLine2].filter((line) => line && line.amountOriginal > 0);
      const { totalUsd: montoTotal } = summarizePayments(paymentLines);
      const monto1 = paymentLine1.amountUsd;
      const monto2 = paymentLine2?.amountUsd || 0;
      let pago = false;
      let excedente = 0;
      if (montoTotal >= costoCongreso) {
        pago = true;
        excedente = montoTotal > costoCongreso ? montoTotal - costoCongreso : 0;
      }
      const nuevoPago = { fecha: new Date().toISOString(), monto: montoTotal, lineas: paymentLines, tasaBCV: tasaBCVActual };
      await addDoc(collection(db, "participantes"), {
        ...p,
        pago,
        montoPagado: isExento ? 0 : montoTotal,
        excedente: isExento ? 0 : excedente,
        formaPago: isExento ? "Exento" : monto1 > 0 ? paymentLine1.methodName : "",
        referencia: isExento ? "" : monto1 > 0 ? paymentLine1.reference : "",
        zelleInfo: isExento ? "" : monto1 > 0 ? paymentLine1.zelleInfo : "",
        segundaFormaPago: isExento ? "" : paymentLine2?.amountUsd > 0 ? paymentLine2.methodName : "",
        montoPagado2: isExento ? 0 : monto2,
        referencia2: isExento ? "" : paymentLine2?.amountUsd > 0 ? paymentLine2.reference : "",
        zelleInfo2: isExento ? "" : paymentLine2?.amountUsd > 0 ? paymentLine2.zelleInfo : "",
        monedaPago: isExento ? "" : paymentLine1.currency,
        monedaPago2: isExento ? "" : paymentLine2?.currency || "",
        montoOriginalPago: isExento ? 0 : paymentLine1.amountOriginal,
        montoOriginalPago2: isExento ? 0 : paymentLine2?.amountOriginal || 0,
        pagosDetalle: isExento ? [] : paymentLines,
        registradoPor: user.email,
        exento: isExento,
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
          montoPagado={montoPagado}
          setMontoPagado={setMontoPagado}
          montoPagado2={montoPagado2}
          setMontoPagado2={setMontoPagado2}
          formaPago={formaPago}
          setFormaPago={setFormaPago}
          referencia={referencia}
          setReferencia={setReferencia}
          zelleInfo={zelleInfo}
          setZelleInfo={setZelleInfo}
          agregarSegundaForma={agregarSegundaForma}
          setAgregarSegundaForma={setAgregarSegundaForma}
          segundaFormaPago={segundaFormaPago}
          setSegundaFormaPago={setSegundaFormaPago}
          referencia2={referencia2}
          setReferencia2={setReferencia2}
          zelleInfo2={zelleInfo2}
          setZelleInfo2={setZelleInfo2}
          exento={exento}
          setExento={setExento}
          paymentMethods={paymentMethods}
          costoCongreso={costoCongreso}
          surfaceSx={surfaceSx}
          submitLabel="Registrar"
          onSubmit={handleRegister}
        />
      </Box>
    </Container>
  );
}
