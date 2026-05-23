import React, { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Divider,
  IconButton,
  Paper,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { getDocs, collection } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";
import { useAuth } from "../contexts/AuthContext";
import {
  getEventCost,
  getParticipantPaymentStatus,
} from "../utils/paymentConfig";
import { useConfig } from "../contexts/ConfigContext";

const surfaceSx = {
  backgroundColor: "#FFFFFF",
  border: "1px solid #D8D1C2",
  borderRadius: 0,
  boxShadow: "none",
};

const moneyCardSx = {
  ...surfaceSx,
  p: { xs: 1.5, md: 2 },
  minHeight: { xs: 120, md: 156 },
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
};

export default function FinancialReport() {
  const navigate = useNavigate();
  const { isAdmin, loading: authLoading } = useAuth();

  const [data, setData] = useState([]);
  const { config } = useConfig();
  const [loadingData, setLoadingData] = useState(true);
  const [dataError, setDataError] = useState("");
  const [tasaBCV, setTasaBCV] = useState(null);
  const [loadingTasa, setLoadingTasa] = useState(true);
  const [activeTab, setActiveTab] = useState("financiero");

  // Config provided by ConfigProvider

  useEffect(() => {
    if (authLoading || !isAdmin) {
      setLoadingData(false);
      return;
    }

    let cancelled = false;

    const cargarDatos = async () => {
      try {
        setLoadingData(true);
        setDataError("");
        const snapshot = await getDocs(collection(db, "participantes"));
        if (cancelled) return;

        const rows = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setData(rows);
      } catch (error) {
        if (cancelled) return;

        setData([]);
        if (error.code === "permission-denied") {
          setDataError(
            "No hay permisos para leer participantes en la base de datos."
          );
        } else {
          setDataError("No se pudieron cargar los participantes. Intenta nuevamente.");
        }
      } finally {
        if (!cancelled) {
          setLoadingData(false);
        }
      }
    };

    cargarDatos();

    return () => {
      cancelled = true;
    };
  }, [authLoading, isAdmin]);

  useEffect(() => {
    if (authLoading || !isAdmin) {
      setLoadingTasa(false);
      return;
    }

    let cancelled = false;

    const fetchTasaBCV = async () => {
      setLoadingTasa(true);

      try {
        const response = await fetch(
          "https://pydolarve.org/api/v1/dollar?page=bcv&monitor=usd"
        );
        const json = await response.json();

        if (json && json.price) {
          if (!cancelled) {
            setTasaBCV(parseFloat(json.price));
          }
          return;
        }

        throw new Error("No se obtuvo tasa del primer servicio");
      } catch (_) {
        try {
          const response = await fetch("https://ve.dolarapi.com/v1/dolares");
          const json = await response.json();
          const oficial = Array.isArray(json)
            ? json.find((item) => item.fuente === "oficial")
            : null;

          if (oficial && oficial.promedio) {
            if (!cancelled) {
              setTasaBCV(parseFloat(oficial.promedio));
            }
            return;
          }

          throw new Error("No se obtuvo tasa del segundo servicio");
        } catch (_) {
          if (!cancelled) {
            setTasaBCV(null);
          }
        } finally {
          if (!cancelled) {
            setLoadingTasa(false);
          }
        }
      } finally {
        if (!cancelled) {
          setLoadingTasa(false);
        }
      }
    };

    fetchTasaBCV();

    return () => {
      cancelled = true;
    };
  }, [authLoading, isAdmin]);

  const formatCurrency = (value) =>
    Number(value || 0).toLocaleString("de-DE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const totalParticipantes = data.length;
  const costoCongreso = getEventCost(config);
  const montoTotal = totalParticipantes * costoCongreso;
  const exentos = data.filter((participant) => participant.exento);
  const legacyPaidParticipants = data.filter(
    (participant) => getParticipantPaymentStatus(participant, costoCongreso).isLegacyPaid
  );
  const legacyPaidCount = legacyPaidParticipants.length;
  const pagados = data.filter(
    (participant) => getParticipantPaymentStatus(participant, costoCongreso).key === "pagado"
  ).length;
  const pendientes = data.filter(
    (participant) => getParticipantPaymentStatus(participant, costoCongreso).key === "pendiente"
  ).length;
  const montoExentos = exentos.length * costoCongreso;
  const montoExentosBs = montoExentos * (tasaBCV || 0);

  const montoRecaudadoSinExcedente = data.reduce((accumulator, participant) => {
    if (getParticipantPaymentStatus(participant, costoCongreso).isLegacyPaid) {
      return accumulator;
    }
    if (parseFloat(participant.montoPagado) > costoCongreso) {
      return accumulator + costoCongreso;
    }
    return accumulator + (parseFloat(participant.montoPagado) || 0);
  }, 0);

  const montoPagadoTotal = montoRecaudadoSinExcedente;
  const excedenteTotal = data.reduce(
    (accumulator, participant) =>
      accumulator +
      (parseFloat(participant.excedente) ||
        (parseFloat(participant.montoPagado) > costoCongreso
          ? parseFloat(participant.montoPagado) - costoCongreso
          : 0)),
    0
  );
  const montoPendiente = pendientes * costoCongreso;
  const montoPendienteBs = montoPendiente * (tasaBCV || 0);
  const montoPagadoTotalBs = montoPagadoTotal * (tasaBCV || 0);
  const montoTotalAlcanzable = montoTotal - montoExentos;
  const montoTotalAlcanzableBs = montoTotalAlcanzable * (tasaBCV || 0);
  const excedenteTotalBs = excedenteTotal * (tasaBCV || 0);
  const montoLegacyEstimado = legacyPaidCount * costoCongreso;
  const montoLegacyEstimadoBs = montoLegacyEstimado * (tasaBCV || 0);

  const reportTabs = [
    { value: "financiero", label: "Financiero" },
    { value: "cobranza", label: "Cobranza" },
    { value: "participacion", label: "Participación" },
  ];

  const headlineCards = [
    {
      label: "Inscritos",
      value: totalParticipantes,
      helper: "Base",
      backgroundColor: "#00492F",
      color: "#F7F3E8",
    },
    {
      label: "Pagados",
      value: pagados,
      helper: legacyPaidCount > 0 ? `Incluye ${legacyPaidCount} legacy` : "Al dia",
      backgroundColor: "#046552",
      color: "#F7F3E8",
    },
    {
      label: "Pendientes",
      value: pendientes,
      helper: "Por cobrar",
      backgroundColor: "#FFBC00",
      color: "#1E1E1E",
    },
    {
      label: "Exentos",
      value: exentos.length,
      helper: "Sin cobro",
      backgroundColor: "#EEE8D8",
      color: "#16302A",
    },
  ];

  const financialCards = [
    {
      title: "Recaudado exacto",
      usd: montoPagadoTotal,
      bs: montoPagadoTotalBs,
      caption: "Solo pagos con monto trazable.",
    },
    {
      title: "Pendiente",
      usd: montoPendiente,
      bs: montoPendienteBs,
      caption: "Aún por recibir.",
    },
    {
      title: "Potencial alcanzable",
      usd: montoTotalAlcanzable,
      bs: montoTotalAlcanzableBs,
      caption: "Meta real.",
    },
    {
      title: "Excedente",
      usd: excedenteTotal,
      bs: excedenteTotalBs,
      caption: "Cobro adicional.",
    },
  ];

  if (authLoading) {
    return (
      <Container maxWidth="sm">
        <Box
          minHeight="60vh"
          display="flex"
          alignItems="center"
          justifyContent="center"
          flexDirection="column"
          gap={2}
        >
          <CircularProgress />
          <Typography>Cargando reporte...</Typography>
        </Box>
      </Container>
    );
  }

  if (!isAdmin) {
    return (
      <Container maxWidth="sm" sx={{ py: 4 }}>
        <Paper sx={{ ...surfaceSx, p: 4 }}>
          <Typography variant="h5" fontWeight="bold" gutterBottom>
            Acceso restringido
          </Typography>
          <Alert severity="warning" sx={{ mb: 3, borderRadius: 0 }}>
            Este reporte financiero solo está disponible para administradores.
          </Alert>
          <Button
            variant="contained"
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate("/dashboard")}
          >
            Volver al dashboard
          </Button>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: { xs: 1.5, md: 4 } }}>
      <Box display="grid" gap={2}>
        <Paper sx={{ ...surfaceSx, p: { xs: 1.5, md: 3.5 } }}>
          <Box
            display="flex"
            flexDirection={{ xs: "column", lg: "row" }}
            justifyContent="space-between"
            gap={2}
          >
            <Box>
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <IconButton
                  color="primary"
                  aria-label="Volver al dashboard"
                  onClick={() => navigate("/dashboard")}
                  sx={{ border: "1px solid #D8D1C2" }}
                >
                  <ArrowBackIcon />
                </IconButton>
                <Typography variant="overline" sx={{ color: "primary.main", letterSpacing: "0.12em" }}>
                  Reportes
                </Typography>
              </Box>
              <Typography variant="h3" sx={{ fontSize: { xs: 30, md: 42 } }}>
                Centro de reportes
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mt: 1, maxWidth: 720, fontSize: { xs: 14, md: 16 } }}>
                Consulta el estado financiero y deja esta vista lista para nuevos reportes.
              </Typography>
            </Box>

            <Paper
              sx={{
                ...surfaceSx,
                p: { xs: 1.5, md: 2 },
                minWidth: { xs: "100%", lg: 320 },
                backgroundColor: "#F7F3E8",
              }}
            >
              <Typography variant="overline" color="text.secondary">
                Contexto de cálculo
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Valor base por participante: ${formatCurrency(costoCongreso)}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Tasa BCV usada: {tasaBCV ? `Bs. ${formatCurrency(tasaBCV)}` : "No disponible"}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Lista para nuevas pestañas sin cambiar la navegación principal.
              </Typography>
              {legacyPaidCount > 0 && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Legacy por conciliar: {legacyPaidCount} registros.
                </Typography>
              )}
            </Paper>
          </Box>
        </Paper>

        {dataError && (
          <Alert severity="error" sx={{ borderRadius: 0 }}>
            {dataError}
          </Alert>
        )}

        {(loadingData || loadingTasa) && (
          <Paper sx={{ ...surfaceSx, p: 4 }}>
            <Box display="flex" alignItems="center" justifyContent="center" gap={2}>
              <CircularProgress size={24} />
              <Typography>Cargando datos del reporte...</Typography>
            </Box>
          </Paper>
        )}

        {!loadingData && !loadingTasa && !dataError && (
          <Paper sx={{ ...surfaceSx, p: { xs: 1.5, md: 3 } }}>
            <Tabs
              value={activeTab}
              onChange={(_, value) => setActiveTab(value)}
              variant="scrollable"
              scrollButtons="auto"
              sx={{
                borderBottom: "1px solid #D8D1C2",
                mb: { xs: 2, md: 3 },
                minHeight: { xs: 40, md: 48 },
                "& .MuiTab-root": {
                  minHeight: { xs: 40, md: 48 },
                  px: { xs: 1, md: 1.5 },
                },
              }}
            >
              {reportTabs.map((tab) => (
                <Tab key={tab.value} value={tab.value} label={tab.label} />
              ))}
            </Tabs>

            {activeTab === "financiero" ? (
              <Box display="grid" gap={3}>
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: {
                      xs: "repeat(2, minmax(0, 1fr))",
                      lg: "repeat(4, minmax(0, 1fr))",
                    },
                    gap: 1.5,
                  }}
                >
                  {headlineCards.map((card) => (
                    <Paper
                      key={card.label}
                      sx={{
                        ...moneyCardSx,
                        backgroundColor: card.backgroundColor,
                        color: card.color,
                        borderColor: card.backgroundColor,
                      }}
                    >
                      <Typography variant="overline" sx={{ opacity: 0.9 }}>
                        {card.label}
                      </Typography>
                      <Typography variant="h3" sx={{ fontSize: { xs: 26, md: 42 }, lineHeight: 1 }}>
                        {card.value}
                      </Typography>
                      <Typography variant="body2" sx={{ opacity: 0.9, fontSize: { xs: 12, md: 14 } }}>
                        {card.helper}
                      </Typography>
                    </Paper>
                  ))}
                </Box>

                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", xl: "1.25fr 0.75fr" },
                    gap: 2,
                  }}
                >
                  <Paper sx={{ ...surfaceSx, p: { xs: 1.5, md: 2.5 } }}>
                    <Typography variant="overline" color="text.secondary">
                      Lectura del reporte
                    </Typography>
                    <Typography variant="h5" sx={{ mt: 0.5 }}>
                      Estado de cobro
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: { xs: 2, md: 2.5 } }}>
                      Resumen directo de recaudación, pendiente y capacidad real.
                    </Typography>
                    <Box
                      sx={{
                        display: "grid",
                        gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" },
                        gap: 1.5,
                      }}
                    >
                      {financialCards.map((card) => (
                        <Paper key={card.title} sx={moneyCardSx}>
                          <Box>
                            <Typography variant="overline" color="text.secondary">
                              {card.title}
                            </Typography>
                            <Typography variant="h5" sx={{ mt: 1 }}>
                              ${formatCurrency(card.usd)}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                              Bs. {formatCurrency(card.bs)}
                            </Typography>
                          </Box>
                          <Typography variant="body2" color="text.secondary">
                            {card.caption}
                          </Typography>
                        </Paper>
                      ))}
                    </Box>
                  </Paper>

                  <Box display="grid" gap={2}>
                    <Paper sx={{ ...surfaceSx, p: { xs: 1.5, md: 2.5 } }}>
                      <Typography variant="overline" color="text.secondary">
                        Observaciones
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
                        Déficit por exentos: ${formatCurrency(montoExentos)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        Bs. {formatCurrency(montoExentosBs)}
                      </Typography>
                      {legacyPaidCount > 0 && (
                        <>
                          <Divider sx={{ my: 2 }} />
                          <Typography variant="body2" color="text.secondary">
                            Pagados legacy por conciliar: {legacyPaidCount}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                            Estimado referencial: ${formatCurrency(montoLegacyEstimado)}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                            Bs. {formatCurrency(montoLegacyEstimadoBs)}
                          </Typography>
                        </>
                      )}
                      <Divider sx={{ my: 2 }} />
                      <Typography variant="body2" color="text.secondary">
                        Recaudado con excedente: ${formatCurrency(montoPagadoTotal + excedenteTotal)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        Bs. {formatCurrency(montoPagadoTotalBs + excedenteTotalBs)}
                      </Typography>
                    </Paper>

                    {legacyPaidCount > 0 ? (
                      <Alert severity="warning" sx={{ borderRadius: 0 }}>
                        La recaudación exacta excluye {legacyPaidCount} pagados legacy sin monto trazable. Se muestran aparte como referencia.
                      </Alert>
                    ) : tasaBCV ? (
                      <Alert severity="info" sx={{ borderRadius: 0 }}>
                        Tasa BCV usada: Bs. {formatCurrency(tasaBCV)}
                      </Alert>
                    ) : (
                      <Alert severity="warning" sx={{ borderRadius: 0 }}>
                        No se pudo obtener la tasa BCV. Los montos en bolívares se muestran en 0.
                      </Alert>
                    )}

                    <Paper sx={{ ...surfaceSx, p: { xs: 1.5, md: 2.5 }, backgroundColor: "#F7F3E8" }}>
                      <Typography variant="overline" color="text.secondary">
                        Próximos reportes
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
                        Esta vista ya puede crecer sin romper la lectura general.
                      </Typography>
                    </Paper>
                  </Box>
                </Box>

                <Button
                  variant="outlined"
                  startIcon={<ArrowBackIcon />}
                  onClick={() => navigate("/dashboard")}
                  sx={{ alignSelf: "flex-start", width: { xs: "100%", sm: "auto" } }}
                >
                  Volver al dashboard
                </Button>
              </Box>
            ) : (
              <Paper sx={{ ...surfaceSx, p: { xs: 1.5, md: 3 }, backgroundColor: "#F7F3E8" }}>
                <Typography variant="h6">{reportTabs.find((tab) => tab.value === activeTab)?.label}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Espacio reservado para próximos reportes dentro de esta misma vista.
                </Typography>
              </Paper>
            )}
          </Paper>
        )}
      </Box>
    </Container>
  );
}
