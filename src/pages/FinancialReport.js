import React, { useEffect, useState } from "react";
import {
  Container,
  Box,
  Typography,
  Button,
  Alert,
  Divider,
  Paper,
  CircularProgress,
  IconButton,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { getDocs, collection } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";
import { useAuth } from "../contexts/AuthContext";

export default function FinancialReport() {
  const navigate = useNavigate();
  const { isAdmin, loading: authLoading } = useAuth();

  const [data, setData] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [dataError, setDataError] = useState("");
  const [tasaBCV, setTasaBCV] = useState(null);
  const [loadingTasa, setLoadingTasa] = useState(true);

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
  const costoCongreso = 8;
  const montoTotal = totalParticipantes * costoCongreso;
  const exentos = data.filter((participant) => participant.exento);
  const pagadosAntiguos = data.filter(
    (participant) =>
      participant.pago &&
      (!participant.montoPagado || parseFloat(participant.montoPagado) === 0) &&
      !participant.exento
  );
  const pagadosNuevos = data.filter(
    (participant) =>
      parseFloat(participant.montoPagado) === costoCongreso && !participant.exento
  );
  const pagadosExcedente = data.filter(
    (participant) =>
      parseFloat(participant.montoPagado) > costoCongreso && !participant.exento
  );
  const pagados =
    pagadosAntiguos.length + pagadosNuevos.length + pagadosExcedente.length;
  const pendientes = data.filter(
    (participant) =>
      !participant.exento &&
      (!participant.pago || parseFloat(participant.montoPagado) < costoCongreso)
  ).length;
  const montoExentos = exentos.length * costoCongreso;
  const montoExentosBs = montoExentos * (tasaBCV || 0);

  const montoRecaudadoSinExcedente = data.reduce((accumulator, participant) => {
    if (
      participant.pago &&
      (!participant.montoPagado || parseFloat(participant.montoPagado) === 0)
    ) {
      return accumulator + costoCongreso;
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
      <Container maxWidth="sm">
        <Box py={6}>
          <Paper sx={{ p: 4, borderRadius: 3 }}>
            <Typography variant="h5" fontWeight="bold" gutterBottom>
              Acceso restringido
            </Typography>
            <Alert severity="warning" sx={{ mb: 3 }}>
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
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm">
      <Box py={4}>
        <Box display="flex" alignItems="center" gap={1} mb={2}>
          <IconButton
            color="primary"
            aria-label="Volver al dashboard"
            onClick={() => navigate("/dashboard")}
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h4" fontWeight="bold">
            Reporte Financiero
          </Typography>
        </Box>

        {dataError && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {dataError}
          </Alert>
        )}

        {(loadingData || loadingTasa) && (
          <Paper sx={{ p: 4, borderRadius: 3, mb: 3 }}>
            <Box display="flex" alignItems="center" justifyContent="center" gap={2}>
              <CircularProgress size={24} />
              <Typography>Cargando datos del reporte...</Typography>
            </Box>
          </Paper>
        )}

        {!loadingData && !loadingTasa && !dataError && (
          <Paper
            sx={{
              p: 4,
              borderRadius: 3,
              boxShadow: 6,
            }}
          >
            <Typography
              variant="h5"
              fontWeight="bold"
              gutterBottom
              color="primary.main"
            >
              Reporte Financiero del Congreso
            </Typography>

            <Divider sx={{ mb: 2 }} />

            <Box mb={2}>
              <Typography variant="body1">
                <b>Participantes inscritos:</b> {totalParticipantes}
              </Typography>
              <Typography variant="body1" color="success.main">
                <b>Pagados:</b> {pagados}
              </Typography>
              <Typography variant="body1" color="warning.main">
                <b>Pendientes:</b> {pendientes}
              </Typography>
              <Typography variant="body1" sx={{ color: "#616161" }}>
                <b>Exentos:</b> {exentos.length}
                {exentos.length > 0 && (
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    component="span"
                    sx={{ marginLeft: 1 }}
                  >
                    (Deficit: ${formatCurrency(montoExentos)}
                    <span style={{ color: "#616161", marginLeft: 4 }}>
                      Bs. {formatCurrency(montoExentosBs)}
                    </span>
                    )
                  </Typography>
                )}
              </Typography>
            </Box>

            <Divider sx={{ mb: 2 }} />

            <Box mb={2}>
              <Typography variant="body1">
                <b>Monto recaudado (total abonos):</b> ${formatCurrency(montoPagadoTotal)}
                <br />
                <Typography variant="caption" color="text.secondary">
                  (Bs. {formatCurrency(montoPagadoTotalBs)})
                </Typography>
              </Typography>

              <Typography variant="body1" sx={{ mt: 1.5 }}>
                <b>Monto pendiente:</b> ${formatCurrency(montoPendiente)}
                <br />
                <Typography variant="caption" color="text.secondary">
                  (Bs. {formatCurrency(montoPendienteBs)})
                  {montoExentos > 0 && (
                    <span style={{ color: "#616161", marginLeft: 8 }}>
                      Deficit por exentos: ${formatCurrency(montoExentos)}
                      (Bs. {formatCurrency(montoExentosBs)})
                    </span>
                  )}
                </Typography>
              </Typography>

              <Typography variant="body1" color="primary" sx={{ mt: 1.5 }}>
                <b>Total potencial:</b> ${formatCurrency(montoTotalAlcanzable)}
                <br />
                <Typography variant="caption" color="text.secondary">
                  (Bs. {formatCurrency(montoTotalAlcanzableBs)})
                  {montoExentos > 0 && (
                    <span style={{ color: "#616161", marginLeft: 8 }}>
                      Menos deficit por exentos: ${formatCurrency(montoExentos)}
                      (Bs. {formatCurrency(montoExentosBs)})
                    </span>
                  )}
                </Typography>
              </Typography>

              <Typography variant="body1" color="success.main" sx={{ mt: 1.5 }}>
                <b>Recaudado con excedente:</b> $
                {formatCurrency(montoPagadoTotal + excedenteTotal)}
                <span style={{ color: "#1976d2", fontWeight: "normal" }}>
                  {" "}
                  (+{formatCurrency(excedenteTotal)})
                </span>
                <br />
                <Typography variant="caption" color="text.secondary">
                  (Bs. {formatCurrency(montoPagadoTotalBs + excedenteTotalBs)}
                  <span style={{ color: "#1976d2", fontWeight: "normal" }}>
                    {" "}
                    (+{formatCurrency(excedenteTotalBs)})
                  </span>
                  )
                </Typography>
              </Typography>
            </Box>

            <Divider sx={{ mb: 2 }} />

            {tasaBCV ? (
              <Alert severity="info" sx={{ mb: 2 }}>
                Tasa BCV usada: Bs. {formatCurrency(tasaBCV)}
              </Alert>
            ) : (
              <Alert severity="warning" sx={{ mb: 2 }}>
                No se pudo obtener la tasa BCV. Los montos en bolivares se muestran en 0.
              </Alert>
            )}

            <Button
              variant="contained"
              fullWidth
              startIcon={<ArrowBackIcon />}
              onClick={() => navigate("/dashboard")}
            >
              Volver al dashboard
            </Button>
          </Paper>
        )}
      </Box>
    </Container>
  );
}
