import { getParticipantPaymentStatus } from "./paymentConfig";

const YES_NO = {
  true: "Si",
  false: "No",
};

const PAYMENT_STATUS_LABELS = {
  pagado: "Pagado",
  pendiente: "Pendiente",
  exento: "Exento",
};

const normalizeText = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const formatBoolean = (value) => YES_NO[String(Boolean(value))];

const formatDateValue = (value) => {
  if (!value) return "";

  try {
    if (typeof value?.toDate === "function") {
      return value.toDate().toLocaleString("es-VE", {
        dateStyle: "short",
        timeStyle: "short",
      });
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "";

    return parsed.toLocaleString("es-VE", {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch (_) {
    return "";
  }
};

const compactAddress = (residencia = {}) =>
  [
    residencia.zona,
    residencia.municipio,
    residencia.parroquia,
    residencia.sector,
    residencia.calle,
    residencia.avenida,
    residencia.urbanizacion,
    residencia.barrio,
    residencia.nroCasa,
    residencia.edificio,
    residencia.piso,
    residencia.apto,
  ]
    .filter(Boolean)
    .join(", ");

const buildPaymentStatusLabel = (participant, eventCostUsd) => {
  const status = getParticipantPaymentStatus(participant, eventCostUsd);
  if (status?.isLegacyPaid) return "Pagado legacy";
  return PAYMENT_STATUS_LABELS[status?.key] || "Sin definir";
};

const buildCampFlagValue = (field) => ({
  active: Boolean(field?.respuesta),
  label: formatBoolean(field?.respuesta),
  detail: String(field?.detalle || ""),
});

export const createDefaultParticipantReportFilters = () => ({
  search: "",
  statusFilter: "todos",
  tipoFilter: "todos",
  exentoFilter: "todos",
  minAge: "",
  maxAge: "",
  talla: "todos",
  afiliacion: "todos",
  municipio: "todos",
  zona: "todos",
  campMedicamento: "todos",
  campAlergiaAlimento: "todos",
  campAlergiaMedicamento: "todos",
  campEnfermedad: "todos",
  campActividad: "todos",
});

export const participantReportColumns = [
  { id: "fullName", label: "Nombre", defaultVisible: true, locked: true },
  { id: "ci", label: "Cedula", defaultVisible: true, locked: true },
  { id: "tipoRegistro", label: "Tipo", defaultVisible: true },
  { id: "paymentStatus", label: "Estado de pago", defaultVisible: true },
  { id: "exento", label: "Exento", defaultVisible: true },
  { id: "edad", label: "Edad", defaultVisible: true },
  { id: "telefonoMovil", label: "Telefono movil", defaultVisible: true },
  { id: "email", label: "Email", defaultVisible: true },
  { id: "afiliacion", label: "Iglesia", defaultVisible: true },
  { id: "municipio", label: "Municipio", defaultVisible: true },
  { id: "zona", label: "Zona", defaultVisible: true },
  { id: "talla", label: "Talla", defaultVisible: true },
  { id: "registradoPor", label: "Registrado por", defaultVisible: true },
  { id: "fechaRegistro", label: "Fecha de registro", defaultVisible: true },
  { id: "apellidos", label: "Apellidos" },
  { id: "telefonoFijo", label: "Telefono secundario" },
  { id: "fechaNacimiento", label: "Fecha de nacimiento" },
  { id: "estadoCivil", label: "Estado civil" },
  { id: "numHijos", label: "Hijos" },
  { id: "profesion", label: "Profesion" },
  { id: "ocupacion", label: "Ocupacion" },
  { id: "viveConPadres", label: "Vive con sus padres" },
  { id: "nombreRepresentante", label: "Representante" },
  { id: "telefonoRepresentante", label: "Telefono representante" },
  { id: "parroquia", label: "Parroquia" },
  { id: "sector", label: "Sector" },
  { id: "calle", label: "Calle" },
  { id: "avenida", label: "Avenida" },
  { id: "urbanizacion", label: "Urbanizacion" },
  { id: "barrio", label: "Barrio" },
  { id: "nroCasa", label: "Nro. casa" },
  { id: "puntoReferencia", label: "Punto de referencia" },
  { id: "edificio", label: "Edificio" },
  { id: "piso", label: "Piso" },
  { id: "apto", label: "Apto" },
  { id: "direccionResumen", label: "Direccion resumida" },
  { id: "bautizado", label: "Bautizado" },
  { id: "miembro", label: "Miembro" },
  { id: "bautismo", label: "Bautismo" },
  { id: "visitante", label: "Visitante" },
  { id: "cuantoTiempo", label: "Tiempo en iglesia" },
  { id: "sirveMinisterio", label: "Ministerio" },
  { id: "medicamentoDependiente", label: "Medicamento dependiente" },
  { id: "medicamentoDetalle", label: "Detalle medicamento" },
  { id: "alergicoAlimento", label: "Alergia alimento" },
  { id: "alergicoAlimentoDetalle", label: "Detalle alergia alimento" },
  { id: "alergicoMedicamento", label: "Alergia medicamento" },
  { id: "alergicoMedicamentoDetalle", label: "Detalle alergia medicamento" },
  { id: "enfermedad", label: "Enfermedad" },
  { id: "enfermedadDetalle", label: "Detalle enfermedad" },
  { id: "actividadFisica", label: "Actividad fisica" },
  { id: "actividadDetalle", label: "Detalle actividad" },
  { id: "montoPagado", label: "Monto pagado USD" },
  { id: "excedente", label: "Excedente USD" },
  { id: "historialPagos", label: "Historial de pagos" },
];

export const getDefaultParticipantReportColumnIds = () =>
  participantReportColumns
    .filter((column) => column.defaultVisible || column.locked)
    .map((column) => column.id);

export const buildParticipantReportRow = (participant, eventCostUsd) => {
  const residencia = participant?.residencia || {};
  const iglesia = participant?.iglesia || {};
  const medicamentoDependiente = buildCampFlagValue(
    participant?.campamento?.medicamentoDependiente
  );
  const alergicoAlimento = buildCampFlagValue(
    participant?.campamento?.alergicoAlimento
  );
  const alergicoMedicamento = buildCampFlagValue(
    participant?.campamento?.alergicoMedicamento
  );
  const enfermedad = buildCampFlagValue(participant?.campamento?.enfermedad);
  const actividadFisica = buildCampFlagValue(
    participant?.campamento?.actividadFisica
  );
  const fullName = [participant?.nombres, participant?.apellidos]
    .filter(Boolean)
    .join(" ")
    .trim();

  return {
    id: participant?.id || participant?._id || fullName || participant?.email || Math.random().toString(36),
    fullName,
    apellidos: participant?.apellidos || "",
    ci: participant?.ci || participant?.cedula || "",
    edad: Number(participant?.edad || 0) || "",
    telefonoMovil: participant?.telefonoMovil || participant?.telefono || "",
    telefonoFijo: participant?.telefonoFijo || "",
    email: participant?.email || "",
    fechaNacimiento: participant?.fechaNacimiento || "",
    estadoCivil:
      participant?.estadoCivil === "Otro"
        ? participant?.estadoCivilOtro || "Otro"
        : participant?.estadoCivil || "",
    numHijos: participant?.numHijos || "",
    profesion: participant?.profesion || "",
    ocupacion: participant?.ocupacion || "",
    viveConPadres: formatBoolean(participant?.viveConPadres),
    nombreRepresentante: participant?.nombreRepresentante || "",
    telefonoRepresentante: participant?.telefonoRepresentante || "",
    tipoRegistro: participant?.tipoRegistro || "Participante",
    zona: residencia?.zona || "",
    municipio: residencia?.municipio || "",
    parroquia: residencia?.parroquia || "",
    sector: residencia?.sector || "",
    calle: residencia?.calle || "",
    avenida: residencia?.avenida || "",
    urbanizacion: residencia?.urbanizacion || "",
    barrio: residencia?.barrio || "",
    nroCasa: residencia?.nroCasa || "",
    puntoReferencia: residencia?.puntoReferencia || "",
    edificio: residencia?.edificio || "",
    piso: residencia?.piso || "",
    apto: residencia?.apto || "",
    direccionResumen: compactAddress(residencia),
    bautizado: formatBoolean(iglesia?.bautizado),
    miembro: formatBoolean(iglesia?.miembro),
    afiliacion: iglesia?.afiliacion || "",
    bautismo: iglesia?.bautismo || "",
    visitante: iglesia?.visitante || "",
    cuantoTiempo: iglesia?.cuantoTiempo || "",
    sirveMinisterio: iglesia?.sirveMinisterio || "",
    talla: participant?.talla || "",
    medicamentoDependiente: medicamentoDependiente.label,
    medicamentoDetalle: medicamentoDependiente.detail,
    alergicoAlimento: alergicoAlimento.label,
    alergicoAlimentoDetalle: alergicoAlimento.detail,
    alergicoMedicamento: alergicoMedicamento.label,
    alergicoMedicamentoDetalle: alergicoMedicamento.detail,
    enfermedad: enfermedad.label,
    enfermedadDetalle: enfermedad.detail,
    actividadFisica: actividadFisica.label,
    actividadDetalle: actividadFisica.detail,
    paymentStatus: buildPaymentStatusLabel(participant, eventCostUsd),
    paymentStatusKey: getParticipantPaymentStatus(participant, eventCostUsd)?.key || "",
    exento: formatBoolean(participant?.exento),
    exentoFlag: Boolean(participant?.exento),
    montoPagado: Number(participant?.montoPagado || 0) || 0,
    excedente: Number(participant?.excedente || 0) || 0,
    historialPagos: Array.isArray(participant?.historialPagos)
      ? participant.historialPagos.length
      : 0,
    registradoPor: participant?.registradoPor || "",
    fechaRegistro: formatDateValue(participant?.timestamp),
    searchableText: normalizeText(
      [
        fullName,
        participant?.ci,
        participant?.email,
        participant?.telefonoMovil,
        participant?.telefonoFijo,
        iglesia?.afiliacion,
        residencia?.municipio,
        residencia?.zona,
        participant?.registradoPor,
      ].join(" ")
    ),
    flags: {
      campMedicamento: medicamentoDependiente.active,
      campAlergiaAlimento: alergicoAlimento.active,
      campAlergiaMedicamento: alergicoMedicamento.active,
      campEnfermedad: enfermedad.active,
      campActividad: actividadFisica.active,
    },
  };
};

const matchesToggle = (filterValue, currentValue) => {
  if (!filterValue || filterValue === "todos") return true;
  if (filterValue === "si") return Boolean(currentValue);
  if (filterValue === "no") return !currentValue;
  return true;
};

export const filterParticipantReportRows = (rows, filters) => {
  const search = normalizeText(filters?.search);
  const minAge = Number(filters?.minAge);
  const maxAge = Number(filters?.maxAge);

  return (Array.isArray(rows) ? rows : []).filter((row) => {
    if (search && !row.searchableText.includes(search)) return false;
    if (filters?.statusFilter && filters.statusFilter !== "todos") {
      if (row.paymentStatusKey !== filters.statusFilter) return false;
    }
    if (filters?.tipoFilter && filters.tipoFilter !== "todos") {
      if (row.tipoRegistro !== filters.tipoFilter) return false;
    }
    if (filters?.exentoFilter && filters.exentoFilter !== "todos") {
      if (!matchesToggle(filters.exentoFilter, row.exentoFlag)) return false;
    }
    if (filters?.talla && filters.talla !== "todos" && row.talla !== filters.talla) {
      return false;
    }
    if (filters?.afiliacion && filters.afiliacion !== "todos" && row.afiliacion !== filters.afiliacion) {
      return false;
    }
    if (filters?.municipio && filters.municipio !== "todos" && row.municipio !== filters.municipio) {
      return false;
    }
    if (filters?.zona && filters.zona !== "todos" && row.zona !== filters.zona) {
      return false;
    }
    if (Number.isFinite(minAge) && minAge > 0 && Number(row.edad || 0) < minAge) {
      return false;
    }
    if (Number.isFinite(maxAge) && maxAge > 0 && Number(row.edad || 0) > maxAge) {
      return false;
    }
    if (!matchesToggle(filters?.campMedicamento, row.flags?.campMedicamento)) return false;
    if (!matchesToggle(filters?.campAlergiaAlimento, row.flags?.campAlergiaAlimento)) return false;
    if (!matchesToggle(filters?.campAlergiaMedicamento, row.flags?.campAlergiaMedicamento)) return false;
    if (!matchesToggle(filters?.campEnfermedad, row.flags?.campEnfermedad)) return false;
    if (!matchesToggle(filters?.campActividad, row.flags?.campActividad)) return false;
    return true;
  });
};

export const getParticipantReportFilterOptions = (rows) => {
  const unique = (selector) =>
    Array.from(
      new Set((Array.isArray(rows) ? rows : []).map(selector).filter(Boolean))
    ).sort((a, b) => String(a).localeCompare(String(b), "es"));

  return {
    tallas: unique((row) => row.talla),
    afiliaciones: unique((row) => row.afiliacion),
    municipios: unique((row) => row.municipio),
    zonas: unique((row) => row.zona),
    tiposRegistro: unique((row) => row.tipoRegistro),
  };
};