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
  };
}
