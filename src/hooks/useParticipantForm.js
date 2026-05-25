import { useState } from "react";

const initialParticipantTemplate = {
  nombres: "",
  apellidos: "",
  ci: "",
  edad: 0,
  telefonoMovil: "",
  telefonoFijo: "",
  email: "",
  fechaNacimiento: "",
  estadoCivil: "Soltero(a)",
  estadoCivilOtro: "",
  numHijos: 0,
  profesion: "",
  ocupacion: "",
  viveConPadres: false,
  nombreRepresentante: "",
  telefonoRepresentante: "",
  sirveMinisterio: "",
  tipoRegistro: "Participante",
  residencia: {
    zona: "",
    municipio: "",
    parroquia: "",
    sector: "",
    calle: "",
    avenida: "",
    urbanizacion: "",
    barrio: "",
    nroCasa: "",
    puntoReferencia: "",
    edificio: "",
    piso: "",
    apto: "",
  },
  iglesia: {
    bautizado: false,
    miembro: false,
    afiliacion: "",
    bautismo: "",
    visitante: "",
    cuantoTiempo: "",
  },
  campamento: {
    medicamentoDependiente: { respuesta: false, detalle: "" },
    alergicoAlimento: { respuesta: false, detalle: "" },
    alergicoMedicamento: { respuesta: false, detalle: "" },
    enfermedad: { respuesta: false, detalle: "" },
    actividadFisica: { respuesta: false, detalle: "" },
  },
};

export default function useParticipantForm(initial = null) {
  const [participant, setParticipant] = useState(initial || initialParticipantTemplate);
  const [errorCedula, setErrorCedula] = useState("");
  const [pagos, setPagos] = useState([]);

  const normalizePaymentsFromDoc = (data) => {
    // If doc already has pagosDetalle, use it
    if (Array.isArray(data.pagosDetalle) && data.pagosDetalle.length > 0) {
      return data.pagosDetalle.map((line, idx) => ({ id: line.id || `${Date.now()}-${idx}`, ...line }));
    }
    // Fallback: map legacy fields (montoPagado, montoPagado2, formaPago, segundaFormaPago, referencia, referencia2, zelleInfo, zelleInfo2)
    const lines = [];
    if (data.montoOriginalPago || data.montoPagado) {
      lines.push({
        id: `legacy-1`,
        amountOriginal: data.montoOriginalPago ?? data.montoPagado ?? 0,
        currency: data.monedaPago || (data.formaPago ? (data.formaPago.toLowerCase().includes('bs') ? 'bs' : 'usd') : 'usd'),
        methodName: data.formaPago || '',
        reference: data.referencia || '',
        zelleInfo: data.zelleInfo || '',
      });
    }
    if (data.montoOriginalPago2 || data.montoPagado2) {
      lines.push({
        id: `legacy-2`,
        amountOriginal: data.montoOriginalPago2 ?? data.montoPagado2 ?? 0,
        currency: data.monedaPago2 || (data.segundaFormaPago ? (data.segundaFormaPago.toLowerCase().includes('bs') ? 'bs' : 'usd') : 'usd'),
        methodName: data.segundaFormaPago || '',
        reference: data.referencia2 || '',
        zelleInfo: data.zelleInfo2 || '',
      });
    }
    return lines.map((l, idx) => ({ id: l.id || `${Date.now()}-${idx}`, ...l }));
  };

  const addPayment = (payment) => {
    const newLine = { id: `${Date.now()}-${Math.random().toString(36).slice(2,8)}`, ...payment };
    setPagos((p) => [...p, newLine]);
    return newLine.id;
  };

  const updatePayment = (id, patch) => {
    setPagos((p) => p.map((line) => (line.id === id ? { ...line, ...patch } : line)));
  };

  const removePayment = (id) => {
    setPagos((p) => p.filter((line) => line.id !== id));
  };

  const capitalizeWords = (str = "") =>
    String(str).replace(/\b\w+/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());

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
    const fecha = e.target.value;
    const edadCalc = calcularEdad(fecha);
    setParticipant({ ...participant, fechaNacimiento: fecha, edad: edadCalc });
  };

  const validarCedula = () => {
    const ci = (participant.ci || "").trim();
    if (!ci) {
      setErrorCedula("Cédula requerida");
      return;
    }
    const re = /^[VEJPG]-?\d+$/i;
    if (!re.test(ci)) {
      setErrorCedula("Formato inválido. Ej: V-12345678");
    } else {
      setErrorCedula("");
    }
  };

  return {
    participant,
    setParticipant,
    capitalizeWords,
    calcularEdad,
    handleFechaNacimiento,
    validarCedula,
    errorCedula,
    setErrorCedula,
    pagos,
    setPagos,
    addPayment,
    updatePayment,
    removePayment,
    normalizePaymentsFromDoc,
  };
}
