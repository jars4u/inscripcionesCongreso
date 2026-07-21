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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  TextField,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { getDb } from "../firebase";
import { collection, getDocs, query as firestoreQuery, orderBy, limit as firestoreLimit } from "firebase/firestore";
// participants are consumed from ParticipantsProvider
import { useNavigate } from "react-router-dom";
import { useParticipants } from "../contexts/ParticipantsContext";
import { useAuth } from "../contexts/AuthContext";
import {
  getEventCost,
  getParticipantPaymentStatus,
} from "../utils/paymentConfig";
import { useConfig } from "../contexts/ConfigContext";
import ParticipantExportCenter from "../components/ParticipantExportCenter";

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

  const { participants: data, loading: loadingData, error: dataError, totalCount, globalCounts } = useParticipants();
  const { config } = useConfig();
  const [tasaBCV, setTasaBCV] = useState(null);
  const [loadingTasa, setLoadingTasa] = useState(true);
  const [activeTab, setActiveTab] = useState("financiero");
  const [openRecaudadoDialog, setOpenRecaudadoDialog] = useState(false);

  const openRecaudado = async () => {
    setOpenRecaudadoDialog(true);
    // fetch the full list in background
    try {
      await fetchAllPaidParticipants();
    } catch (_) {}
  };
  const closeRecaudado = () => setOpenRecaudadoDialog(false);
  const [paidParticipantsAll, setPaidParticipantsAll] = useState([]);
  const [loadingPaidList, setLoadingPaidList] = useState(false);

  const fetchAllPaidParticipants = async () => {
    if (!isAdmin) return;
    setLoadingPaidList(true);
    try {
      const col = collection(getDb(), 'participantes');
      const limitCount = typeof totalCount === 'number' && totalCount > 0 ? totalCount : 5000;
      const q = firestoreQuery(col, orderBy('timestamp', 'desc'), firestoreLimit(limitCount));
      const snapshot = await getDocs(q);
      const rows = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

      const list = rows
        .filter((p) => !isLegacy(p))
        .map((p) => {
          const paidUsd = getPaidUsd(p) || 0;
          return { p, paidUsd, paidBs: paidUsd * (tasaBCV || 0) };
        })
        .filter((x) => x.paidUsd > 0);

      setPaidParticipantsAll(list);
    } catch (e) {
      console.error('Error fetching all participants for paid list', e);
      setPaidParticipantsAll([]);
    } finally {
      setLoadingPaidList(false);
    }
  };

  // Load full paid participants list once auth and exchange-rate resolution finish
  // so Bs payments are converted consistently in global financial cards.
  useEffect(() => {
    if (authLoading || !isAdmin || loadingTasa) return;
    // fetch in background but don't block UI
    (async () => {
      try {
        await fetchAllPaidParticipants();
      } catch (_) {}
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, isAdmin, totalCount, loadingTasa, tasaBCV]);
  const [searchTerm, setSearchTerm] = useState("");

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
  const effectiveTotal = typeof globalCounts?.total === 'number' && globalCounts.total > 0
    ? globalCounts.total
    : (typeof totalCount === 'number' && totalCount > 0 ? totalCount : data.length);
  const totalParticipantes = effectiveTotal;
  const costoCongreso = getEventCost(config);

  // Helper: determine if participant is a legacy record (pagado flag but no monto trazable)
  const isLegacy = (participant) => getParticipantPaymentStatus(participant, costoCongreso).isLegacyPaid;

  // Helper: compute paid amount in USD for a participant.
  // - If participant is legacy, treat as 0 (we'll convert legacy to exento in calculations)
  // - If participant has pagosDetalle, sum amounts (convert Bs to USD using tasaBCV when possible)
  // - Fallback to legacy monto fields
  const getPaidUsd = (participant) => {
    if (!participant) return 0;
    if (isLegacy(participant)) return 0;
    let total = 0;
    try {
      if (Array.isArray(participant.pagosDetalle) && participant.pagosDetalle.length > 0) {
        participant.pagosDetalle.forEach((p) => {
          const amt = Number(p.amountOriginal || p.amount || 0) || 0;
          const currency = (p.currency || p.divisa || "").toString().toLowerCase();
          if (currency && currency.includes("bs")) {
            total += tasaBCV ? amt / tasaBCV : 0;
          } else {
            total += amt;
          }
        });
        return total;
      }

      // Fallback legacy-style fields
      const monto = Number(participant.montoPagado || participant.montoOriginalPago || participant.montoPagado2 || participant.montoOriginalPago2) || 0;
      const moneda = (participant.monedaPago || participant.monedaPago2 || "").toString().toLowerCase();
      if (moneda && moneda.includes("bs")) {
        return tasaBCV ? monto / tasaBCV : 0;
      }
      return monto;
    } catch (e) {
      return 0;
    }
  };

  // Treat legacy participants as exentos for counting and calculations (per decision)
  const exentos = data.filter((p) => p.exento || isLegacy(p));
  const exentosCount = typeof globalCounts?.exentos === 'number' ? globalCounts.exentos : exentos.length;

  // Recompute counts using legacy->exento rule
  let pagadosCount = 0;
  let pendientesCount = 0;
  data.forEach((p) => {
    if (isLegacy(p)) return; // counted as exento
    const status = getParticipantPaymentStatus(p, costoCongreso);
    if (status.key === "pagado") pagadosCount += 1;
    else if (status.key === "pendiente") pendientesCount += 1;
  });

  const montoExentos = exentosCount * costoCongreso;
  const montoExentosBs = montoExentos * (tasaBCV || 0);

  // Potencial alcanzable: (total inscritos - exentos) * costo
  const montoTotalAlcanzable = (totalParticipantes - exentosCount) * costoCongreso;
  const montoTotalAlcanzableBs = montoTotalAlcanzable * (tasaBCV || 0);

  const montoPagadoTotal = paidParticipantsAll.length > 0
    ? paidParticipantsAll.reduce((acc, item) => acc + (item.paidUsd || 0), 0)
    : data.reduce((acc, participant) => acc + getPaidUsd(participant), 0);
  const montoPagadoTotalBs = montoPagadoTotal * (tasaBCV || 0);

  const excedenteTotal = paidParticipantsAll.length > 0
    ? paidParticipantsAll.reduce((acc, item) => acc + ((item.paidUsd || 0) > costoCongreso ? (item.paidUsd || 0) - costoCongreso : 0), 0)
    : data.reduce((acc, participant) => {
        const paid = getPaidUsd(participant);
        return acc + (paid > costoCongreso ? paid - costoCongreso : 0);
      }, 0);
  const excedenteTotalBs = excedenteTotal * (tasaBCV || 0);

  // Pendiente: potencial - recaudado (no negativo)
  const montoPendiente = Math.max(0, montoTotalAlcanzable - montoPagadoTotal);
  const montoPendienteBs = montoPendiente * (tasaBCV || 0);

  const legacyPaidCount = typeof globalCounts?.legacy === 'number'
    ? globalCounts.legacy
    : data.filter((p) => getParticipantPaymentStatus(p, costoCongreso).isLegacyPaid).length;
  const montoLegacyEstimado = legacyPaidCount * costoCongreso;
  const montoLegacyEstimadoBs = montoLegacyEstimado * (tasaBCV || 0);

  // Lista de participantes con abonos trazables (excluye legacy que se trata como exento)
  const paidParticipants = data
    .filter((p) => !isLegacy(p))
    .map((p) => {
      const paidUsd = getPaidUsd(p) || 0;
      return { p, paidUsd, paidBs: paidUsd * (tasaBCV || 0) };
    })
    .filter((x) => x.paidUsd > 0);

  const filteredPaidParticipants = (paidParticipantsAll.length > 0 ? paidParticipantsAll : paidParticipants).filter(({ p }) => {
    const q = (searchTerm || "").trim().toLowerCase();
    if (!q) return true;
    const name = (`${p.nombres || ""} ${p.apellidos || ""}`.trim() || p.name || p.email || "").toLowerCase();
    const email = (p.email || "").toLowerCase();
    return name.includes(q) || email.includes(q);
  });

  const reportTabs = [
    { value: "financiero", label: "Financiero" },
    { value: "cobranza", label: "Cobranza" },
    { value: "participacion", label: "Participación" },
  ];

  const headlineCards = [
    {
      label: "Inscritos",
      value: totalParticipantes,
      helper: "Total de registros inscritos.",
      backgroundColor: "#00492F",
      color: "#F7F3E8",
    },
    {
      label: "Pagados",
      value: typeof globalCounts?.pagados === 'number' ? globalCounts.pagados : pagadosCount,
      helper: typeof globalCounts?.pagados === 'number' ? (globalCounts.legacy > 0 ? `Incluye ${globalCounts.legacy} legacy` : "Al dia") : (legacyPaidCount > 0 ? `Incluye ${legacyPaidCount} legacy` : "Al dia"),
      backgroundColor: "#046552",
      color: "#F7F3E8",
    },
    {
      label: "Pendientes",
      value: typeof globalCounts?.pendientes === 'number' ? globalCounts.pendientes : pendientesCount,
      helper: "Por cobrar",
      backgroundColor: "#FFBC00",
      color: "#1E1E1E",
    },
    {
      label: "Exentos",
      value: typeof globalCounts?.exentos === 'number' ? globalCounts.exentos : exentosCount,
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
                Consulta el estado financiero, deudas y otros indicadores relevantes.
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
                Tasa BCV actual: {tasaBCV ? `Bs. ${formatCurrency(tasaBCV)}` : "No disponible"}
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
                        <Paper
                          key={card.title}
                          sx={{
                            ...moneyCardSx,
                            cursor: card.title === "Recaudado exacto" ? "pointer" : "default",
                          }}
                          onClick={card.title === "Recaudado exacto" ? openRecaudado : undefined}
                        >
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
                        Tasa BCV actual: Bs. {formatCurrency(tasaBCV)}
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

                <Dialog open={openRecaudadoDialog} onClose={closeRecaudado} fullWidth maxWidth="md">
                  <DialogTitle>Recaudado exacto — Detalle de abonos</DialogTitle>
                  <DialogContent dividers>
                    {loadingPaidList ? (
                      <Box display="flex" alignItems="center" gap={2} p={2}>
                        <CircularProgress size={20} />
                        <Typography>Cargando abonos de todos los participantes...</Typography>
                      </Box>
                    ) : (
                      <>
                        <Box mb={2}>
                          <TextField
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Buscar por nombre o email"
                            size="small"
                            fullWidth
                          />
                        </Box>

                        {filteredPaidParticipants.length === 0 ? (
                          <Typography>No hay abonos trazables para mostrar.</Typography>
                        ) : (
                          <List>
                            {filteredPaidParticipants.map(({ p, paidUsd }) => (
                              <React.Fragment key={p.id || p._id || p.email || `${p.nombres || ""} ${p.apellidos || ""}`.trim() || Math.random()}>
                                <ListItem alignItems="flex-start">
                                  <ListItemText
                                    primary={
                                      <Box display="flex" justifyContent="space-between" alignItems="center">
                                        <span>{(`${p.nombres || ""} ${p.apellidos || ""}`.trim() || p.name || p.email || "(sin nombre)")}</span>
                                        <Typography component="span" sx={{ fontWeight: 600 }}>
                                          {'$'}{formatCurrency(paidUsd)} USD
                                        </Typography>
                                      </Box>
                                    }
                                    secondary={
                                      <>
                                        {Array.isArray(p.pagosDetalle) && p.pagosDetalle.length > 0 && (
                                          <div style={{ marginTop: 6 }}>
                                            <strong>Abonos:</strong>
                                            {p.pagosDetalle.map((pay, i) => {
                                              const amt = Number(pay.amountOriginal || pay.amount || 0) || 0;
                                              const currency = (pay.currency || pay.divisa || "").toString().toLowerCase();
                                              const amtUsd = currency && currency.includes("bs") ? (tasaBCV ? amt / tasaBCV : 0) : amt;
                                              return (
                                                <div key={i}>
                                                  {i + 1}. {amt} {pay.currency || pay.divisa || (currency && currency.includes('bs') ? 'Bs' : 'USD')} — ${formatCurrency(amtUsd)}
                                                </div>
                                              );
                                            })}
                                          </div>
                                        )}
                                      </>
                                    }
                                  />
                                </ListItem>
                                <Divider component="li" />
                              </React.Fragment>
                            ))}
                          </List>
                        )}
                      </>
                    )}
                  </DialogContent>
                  <DialogActions>
                    <Button onClick={closeRecaudado}>Cerrar</Button>
                  </DialogActions>
                </Dialog>
              </Box>
            ) : activeTab === "participacion" ? (
              <ParticipantExportCenter
                participants={data}
                totalCount={totalCount}
                costoCongreso={costoCongreso}
                surfaceSx={surfaceSx}
              />
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
