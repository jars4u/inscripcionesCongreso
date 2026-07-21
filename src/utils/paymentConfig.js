import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { getDb } from "../firebase";

export const DEFAULT_PAYMENT_METHODS = [
  {
    id: "pago-movil",
    nombre: "Pago móvil",
    divisa: "bs",
    activa: true,
    requiereReferencia: true,
    requiereZelleInfo: false,
  },
  {
    id: "efectivo-usd",
    nombre: "Efectivo",
    divisa: "$",
    activa: true,
    requiereReferencia: false,
    requiereZelleInfo: false,
  },
  {
    id: "zelle",
    nombre: "Zelle",
    divisa: "$",
    activa: true,
    requiereReferencia: false,
    requiereZelleInfo: true,
  },
];

export const DEFAULT_APP_CONFIG = {
  costos: {
    eventoUsd: 8,
  },
  pagos: {
    formas: DEFAULT_PAYMENT_METHODS,
  },
};

const ADMIN_CONFIG_PATH = ["configuracion", "general"];
const PUBLIC_CONFIG_PATH = ["configuracion", "public"];

function normalizeMethod(method, index) {
  const nombre = String(method?.nombre || "").trim();
  const normalizedNombre = nombre || `Forma ${index + 1}`;

  return {
    id:
      String(method?.id || "").trim() ||
      normalizedNombre
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "") ||
      `forma-${index + 1}`,
    nombre: normalizedNombre,
    divisa: method?.divisa === "bs" ? "bs" : "$",
    activa: method?.activa !== false,
    requiereReferencia: Boolean(method?.requiereReferencia),
    requiereZelleInfo: Boolean(method?.requiereZelleInfo),
  };
}

export function normalizeConfig(config) {
  const rawMethods = Array.isArray(config?.pagos?.formas)
    ? config.pagos.formas
    : DEFAULT_PAYMENT_METHODS;

  const formas = rawMethods.map(normalizeMethod);
  const eventoUsd = Number(config?.costos?.eventoUsd);

  return {
    costos: {
      eventoUsd: Number.isFinite(eventoUsd) && eventoUsd > 0 ? eventoUsd : DEFAULT_APP_CONFIG.costos.eventoUsd,
    },
    pagos: {
      formas: formas.length > 0 ? formas : DEFAULT_PAYMENT_METHODS,
    },
  };
}

export async function getAppConfig() {
  try {
    const configRef = doc(getDb(), ...PUBLIC_CONFIG_PATH);
    const snapshot = await getDoc(configRef);

    if (!snapshot.exists()) {
      return normalizeConfig(DEFAULT_APP_CONFIG);
    }

    return normalizeConfig(snapshot.data());
  } catch (err) {
    console.error("getAppConfig error:", err);
    throw err;
  }
}

export async function saveAppConfig(config) {
  const normalized = normalizeConfig(config);
  try {
    // Write to both admin and public paths. Admin path may be protected by rules;
    // public path should be readable by regular users so UI updates for everyone.
    const adminRef = doc(getDb(), ...ADMIN_CONFIG_PATH);
    const publicRef = doc(getDb(), ...PUBLIC_CONFIG_PATH);
    await setDoc(adminRef, normalized, { merge: true });
    await setDoc(publicRef, normalized, { merge: true });
    return normalized;
  } catch (err) {
    console.error("saveAppConfig error:", err);
    throw err;
  }
}

export function getActivePaymentMethods(config) {
  return normalizeConfig(config).pagos.formas.filter((method) => method.activa);
}

export function findPaymentMethod(methodName, config) {
  if (!methodName) {
    return null;
  }

  const normalizedName = String(methodName).trim().toLowerCase();
  return normalizeConfig(config).pagos.formas.find(
    (method) => method.nombre.trim().toLowerCase() === normalizedName
  ) || null;
}

export function getEventCost(config) {
  return normalizeConfig(config).costos.eventoUsd;
}

export function normalizeAmountByCurrency(amount, currency, exchangeRate) {
  const numericAmount = Number(amount) || 0;

  if (currency === "bs") {
    const rate = Number(exchangeRate) || 0;
    if (rate <= 0) {
      return 0;
    }
    return numericAmount / rate;
  }

  return numericAmount;
}

export function buildPaymentLine({
  amount,
  methodName,
  reference,
  zelleInfo,
  exchangeRate,
  config,
}) {
  const method = findPaymentMethod(methodName, config);
  const currency = method?.divisa || "$";
  const originalAmount = Number(amount) || 0;
  const amountUsd = normalizeAmountByCurrency(originalAmount, currency, exchangeRate);

  return {
    methodId: method?.id || "",
    methodName: method?.nombre || methodName || "",
    currency,
    amountOriginal: originalAmount,
    amountUsd,
    exchangeRate: currency === "bs" ? Number(exchangeRate) || 0 : 0,
    reference: reference || "",
    zelleInfo: method?.requiereZelleInfo ? zelleInfo || "" : "",
  };
}

export function summarizePayments(lines) {
  return (Array.isArray(lines) ? lines : []).reduce(
    (summary, line) => {
      summary.totalUsd += Number(line?.amountUsd) || 0;
      summary.totalOriginal += Number(line?.amountOriginal) || 0;
      return summary;
    },
    { totalUsd: 0, totalOriginal: 0 }
  );
}

export function getParticipantPaymentStatus(participant, eventCostUsd) {
  const monto = Number(participant?.montoPagado) || 0;

  if (participant?.exento) {
    return {
      key: "exento",
      balanceUsd: 0,
    };
  }

  if (participant?.pago && (!participant?.montoPagado || monto === 0)) {
    return {
      key: "pagado",
      balanceUsd: 0,
      isLegacyPaid: true,
    };
  }

  if (monto < eventCostUsd) {
    return {
      key: "pendiente",
      balanceUsd: Number((eventCostUsd - monto).toFixed(2)),
    };
  }

  if (monto > eventCostUsd) {
    return {
      key: "pagado",
      balanceUsd: Number((monto - eventCostUsd).toFixed(2)),
      hasSurplus: true,
    };
  }

  return {
    key: "pagado",
    balanceUsd: 0,
  };
}

export function subscribeAppConfig(callback) {
  try {
    const configRef = doc(getDb(), ...PUBLIC_CONFIG_PATH);
    const unsubscribe = onSnapshot(
      configRef,
      (snap) => {
        try {
          const data = snap.exists() ? normalizeConfig(snap.data()) : normalizeConfig(DEFAULT_APP_CONFIG);
          callback(null, data);
        } catch (err) {
          callback(err);
        }
      },
      (err) => {
        callback(err);
      }
    );

    return unsubscribe;
  } catch (err) {
    // synchronous error
    setTimeout(() => callback(err), 0);
    return () => {};
  }
}

export function getParticipantPaidUsd(participant, exchangeRate) {
  if (!participant) return 0;
  // legacy-like check: pago true but no montoPagado should be treated as 0 here
  const monto = Number(participant.montoPagado) || 0;
  if (participant?.pago && monto === 0) return 0;

  // prefer pagosDetalle structured lines
  try {
    if (Array.isArray(participant.pagosDetalle) && participant.pagosDetalle.length > 0) {
      return participant.pagosDetalle.reduce((acc, line) => {
        const amt = Number(line?.amountOriginal || line?.amount || 0) || 0;
        const currency = (line?.currency || line?.divisa || "").toString().toLowerCase();
        return acc + normalizeAmountByCurrency(amt, currency === 'bs' ? 'bs' : '$', exchangeRate);
      }, 0);
    }

    // fallback to legacy fields
    const legacyAmt = Number(participant.montoPagado || participant.montoOriginalPago || participant.montoPagado2 || participant.montoOriginalPago2) || 0;
    const moneda = (participant.monedaPago || participant.monedaPago2 || "").toString().toLowerCase();
    return normalizeAmountByCurrency(legacyAmt, moneda && moneda.includes('bs') ? 'bs' : '$', exchangeRate);
  } catch (e) {
    return 0;
  }
}

export function computeFinancialSummary(participants = [], eventCostUsd = 0, exchangeRate = 0) {
  const totalParticipants = participants.length;
  let exentosCount = 0;
  let pagadosCount = 0;
  let abonadosCount = 0;
  let pendientesCount = 0;
  let montoPagadoTotal = 0;
  let excedenteTotal = 0;

  participants.forEach((p) => {
    const paid = getParticipantPaidUsd(p, exchangeRate);
    const status = getParticipantPaymentStatus(p, eventCostUsd);
    // treat legacy (pago true + monto 0) as exento
    const isLegacy = status.isLegacyPaid;
    if (p.exento || isLegacy) {
      exentosCount += 1;
      return;
    }

    montoPagadoTotal += paid;
    const monto = Number(p?.montoPagado) || 0;
    if (status.key === 'pagado') pagadosCount += 1;
    else if (status.key === 'pendiente') {
      // "pendiente" del status base cubre todo monto < costo; aquí lo dividimos:
      // con abono parcial => abonado, sin ningún abono => pendiente.
      if (monto > 0) abonadosCount += 1;
      else pendientesCount += 1;
    }

    if (paid > eventCostUsd) excedenteTotal += paid - eventCostUsd;
  });

  const montoTotalAlcanzable = Math.max(0, (totalParticipants - exentosCount) * eventCostUsd);
  const montoPendiente = Math.max(0, montoTotalAlcanzable - montoPagadoTotal);

  return {
    totalParticipants,
    exentosCount,
    pagadosCount,
    abonadosCount,
    pendientesCount,
    montoPagadoTotal,
    excedenteTotal,
    montoTotalAlcanzable,
    montoPendiente,
  };
}