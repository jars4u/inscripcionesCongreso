import React, { useState, useEffect } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Container,
  Divider,
  IconButton,
  InputAdornment,
  Paper,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import LogoutIcon from "@mui/icons-material/Logout";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import AddIcon from "@mui/icons-material/Add";
import AssessmentOutlinedIcon from "@mui/icons-material/AssessmentOutlined";
import PersonAddAltOutlinedIcon from "@mui/icons-material/PersonAddAltOutlined";
import ArrowOutwardIcon from "@mui/icons-material/ArrowOutward";
import SwapVertIcon from "@mui/icons-material/SwapVert";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import PeopleOutlineIcon from '@mui/icons-material/PeopleOutline';
import ChildCareIcon from '@mui/icons-material/ChildCare';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ChurchIcon from '@mui/icons-material/Church';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import LabelImportantIcon from '@mui/icons-material/LabelImportant';
import { getAuth, signOut } from "firebase/auth";
import { getDocs, collection, deleteDoc, doc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";
import { useAuth } from "../contexts/AuthContext";
import { getEventCost, getParticipantPaymentStatus } from "../utils/paymentConfig";
import { useConfig } from "../contexts/ConfigContext";

const surfaceSx = {
  backgroundColor: "#FFFFFF",
  border: "1px solid #D8D1C2",
  borderRadius: 0,
  boxShadow: "none",
};

const metricTileBaseSx = {
  p: { xs: 1.5, md: 2.5 },
  minHeight: { xs: 112, sm: 150 },
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
  cursor: "pointer",
  transition: "transform 0.2s ease, border-color 0.2s ease, background-color 0.2s ease",
  "&:hover": {
    transform: "translateY(-2px)",
  },
};

const compactIconButtonSx = {
  border: "1px solid #D8D1C2",
  width: 36,
  height: 36,
};

const statusStyles = {
  pagado: {
    backgroundColor: "#E2F0E8",
    color: "#0E4A35",
    borderColor: "#BFD4C6",
  },
  legacy: {
    backgroundColor: "#E7ECEA",
    color: "#35584E",
    borderColor: "#C7D1CD",
  },
  pendiente: {
    backgroundColor: "#FFF0C2",
    color: "#7A5400",
    borderColor: "#E5CA70",
  },
  exento: {
    backgroundColor: "#EEE8D8",
    color: "#35584E",
    borderColor: "#D4CCB7",
  },
};

function getParticipantStatus(participant, costoCongreso) {
  const paymentStatus = getParticipantPaymentStatus(participant, costoCongreso);
  const monto = parseFloat(participant.montoPagado) || 0;

  if (participant.exento) {
    return {
      key: "exento",
      label: "Exento",
      shortLabel: "Exento",
      sx: statusStyles.exento,
    };
  }

  if (paymentStatus.isLegacyPaid) {
    return {
      key: "pagado",
      label: "Pagado legacy",
      shortLabel: "Legacy",
      sx: statusStyles.legacy,
      helper: "Sin monto trazable",
    };
  }

  if (monto === 0) {
    return {
      key: "pendiente",
      label: `Pendiente $${costoCongreso.toFixed(2)}`,
      shortLabel: "Pendiente",
      sx: statusStyles.pendiente,
    };
  }

  if (monto < costoCongreso) {
    return {
      key: "pendiente",
      label: `Pendiente $${(costoCongreso - monto).toFixed(2)}`,
      shortLabel: "Pendiente",
      sx: statusStyles.pendiente,
    };
  }

  if (monto > costoCongreso) {
    return {
      key: "pagado",
      label: `Pagado +$${(monto - costoCongreso).toFixed(2)}`,
      shortLabel: "Pagado +",
      sx: statusStyles.pagado,
    };
  }

  return {
    key: "pagado",
    label: "Pagado",
    shortLabel: "Pagado",
    sx: statusStyles.pagado,
  };
}

const TIPO_OPTIONS = [
  "Participante",
  "Menor de edad",
  "Visitante",
  "Otra iglesia",
  "Servidor",
];

function getTipoRegistro(participant) {
  if (!participant) return "Participante";
  if (participant.tipoRegistro) return participant.tipoRegistro;
  const edad = participant.edad || (participant.fechaNacimiento ? (() => {
    try {
      const birth = new Date(participant.fechaNacimiento);
      const today = new Date();
      let age = today.getFullYear() - birth.getFullYear();
      const m = today.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
        age--;
      }
      return age;
    } catch (e) {
      return null;
    }
  })() : null);

  if (typeof edad === "number" && edad < 18) return "Participante menor de edad";
  return "Participante";
}

export default function Dashboard() {
  const [data, setData] = useState([]);
  const [dataError, setDataError] = useState("");
  const [loadingData, setLoadingData] = useState(true);
  const { config } = useConfig();
  const [filtro, setFiltro] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [tipoFilter, setTipoFilter] = useState("todos");
  const [sortColumn, setSortColumn] = useState("nombre");
  const [sortDirection, setSortDirection] = useState("asc");

  const navigate = useNavigate();
  const auth = getAuth();
  const { user, isAdmin } = useAuth();

  const cargarDatos = async () => {
    setLoadingData(true);
    try {
      setDataError("");
      const snapshot = await getDocs(collection(db, "participantes"));
      const rows = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setData(rows);
    } catch (error) {
      console.error("Error al cargar participantes:", error);
      setData([]);
      if (error.code === "permission-denied") {
        setDataError(
          "No hay permisos para leer participantes en la nueva base de datos. Revisa las reglas de Firestore del proyecto Firebase."
        );
        return;
      }

      setDataError("No se pudieron cargar los participantes. Intenta nuevamente.");
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  // Config is provided by ConfigProvider via useConfig

  const eliminarParticipante = async (id) => {
    // Se ha eliminado window.confirm para compatibilidad
    if (window.confirm("¿Estás seguro de eliminar este participante?")) {
      try {
        await deleteDoc(doc(db, "participantes", id));
        cargarDatos();
      } catch (error) {
        console.error("Error al eliminar participante:", error);
        setDataError(
          error.code === "permission-denied"
            ? "No hay permisos para eliminar participantes en la nueva base de datos."
            : "No se pudo eliminar el participante."
        );
      }
    }
  };

  const handleLogout = () => {
    navigate("/");
    signOut(auth).catch((error) => {
      console.error("Error al cerrar sesión:", error);
    });
  };

  const toggleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection((currentDirection) =>
        currentDirection === "asc" ? "desc" : "asc"
      );
      return;
    }

    setSortColumn(column);
    setSortDirection("asc");
  };

  const toggleStatusFilter = (value) => {
    setStatusFilter((currentValue) =>
      currentValue === value || value === "todos" ? "todos" : value
    );
  };

  const toggleTipoFilter = (value) => {
    setTipoFilter((currentValue) =>
      currentValue === value || value === "todos" ? "todos" : value
    );
  };

  const costoCongreso = getEventCost(config);

  const getField = (p, col) => {
    if (!p) return "";
    switch (col) {
      case "nombre":
        return (p.nombres || p.nombre || "").toString();
      case "apellido":
        return (p.apellidos || p.apellido || "").toString();
      case "cedula":
        return (p.ci || p.cedula || "").toString();
      case "telefono":
        return (p.telefonoMovil || p.telefonoFijo || p.telefono || "").toString();
      case "edad":
        return (p.edad || p.edadActual || 0).toString();
      case "formaPago":
        return (p.formaPago || "").toString();
      case "registradoPor":
        return (p.registradoPor || p.registrado_por || p.registrado_por_email || "").toString();
      default:
        return (p[col] || "").toString();
    }
  };

  const getDisplayName = (p) => {
    const first = p.nombres || p.nombre || "";
    const last = p.apellidos || p.apellido || "";
    return `${first} ${last}`.trim();
  };

  // Filtrar y ordenar datos
  const datosFiltrados = data
    .filter((participant) => {
      const fullText = `${participant.nombres || participant.nombre || ""} ${participant.apellidos || participant.apellido || ""} ${participant.ci || participant.cedula || ""}`
        .toLowerCase()
        .includes(filtro.toLowerCase());

      if (!fullText) {
        return false;
      }

      // filtro por estado de pago (si aplica)
      if (statusFilter !== "todos") {
        if (getParticipantStatus(participant, costoCongreso).key !== statusFilter) return false;
      }

      // filtro por tipoRegistro (si aplica)
      if (tipoFilter !== "todos") {
        if (getTipoRegistro(participant) !== tipoFilter) return false;
      }

      return true;
    })
    .sort((a, b) => {
      let rawA = getField(a, sortColumn);
      let rawB = getField(b, sortColumn);
      let valA, valB;
      if (["edad", "cedula", "telefono", "pagados", "pendientes"].includes(sortColumn)) {
        valA = Number(rawA) || 0;
        valB = Number(rawB) || 0;
      } else {
        valA = (rawA || "").toString().toLowerCase();
        valB = (rawB || "").toString().toLowerCase();
      }
      if (valA < valB) return sortDirection === "asc" ? -1 : 1;
      if (valA > valB) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

  const totalParticipantes = data.length;
  const pendientesList = data.filter(
    (participant) => getParticipantPaymentStatus(participant, costoCongreso).key === "pendiente"
  );
  const legacyPaidCount = data.filter(
    (participant) => getParticipantPaymentStatus(participant, costoCongreso).isLegacyPaid
  ).length;
  const exentos = data.filter((p) => p.exento);
  const pagados = data.filter(
    (participant) => getParticipantPaymentStatus(participant, costoCongreso).key === "pagado"
  ).length;
  const pendientes = pendientesList.length;

  const summaryCards = [
    {
      key: "todos",
      title: "Total registrados",
      icon: <PeopleOutlineIcon fontSize="small" />,
      value: totalParticipantes,
      caption: "Base completa",
      backgroundColor: "#00492F",
      color: "#F7F3E8",
      borderColor: "#00492F",
    },
    {
      key: "pagado",
      title: "Pagados",
      icon: <AttachMoneyIcon fontSize="small" />,
      value: pagados,
      caption: legacyPaidCount > 0 ? `Incluye ${legacyPaidCount} legacy` : "Pago completo o mayor",
      backgroundColor: "#046552",
      color: "#F7F3E8",
      borderColor: "#046552",
    },
    {
      key: "pendiente",
      title: "Pendientes",
      icon: <PendingActionsIcon fontSize="small" />,
      value: pendientes,
      caption: "Requieren seguimiento",
      backgroundColor: "#FFBC00",
      color: "#1E1E1E",
      borderColor: "#D7A100",
    },
    {
      key: "exento",
      title: "Exentos",
      icon: <LabelImportantIcon fontSize="small" />,
      value: exentos.length,
      caption: "Sin cobro requerido",
      backgroundColor: "#EEE8D8",
      color: "#16302A",
      borderColor: "#D4CCB7",
    },
  ];

  const sortOptions = [
    ["nombre", "Nombre"],
    ["apellido", "Apellido"],
    ["cedula", "Cédula"],
    ["telefono", "Teléfono"],
    ["edad", "Edad"],
    ["formaPago", "Forma de pago"],
    ["registradoPor", "Registrado por"],
  ];

  // Nota: se eliminó `activeSortLabel` porque causaba una advertencia de eslint en CI

  const renderParticipantActions = (participant) => (
    <Box
      sx={{
        display: "flex",
        justifyContent: "flex-end",
        gap: 0.5,
      }}
    >
      <IconButton
        aria-label={`Editar participante ${getDisplayName(participant)}`}
        onClick={() => navigate(`/editar/${participant.id}`)}
        sx={compactIconButtonSx}
      >
        <EditIcon fontSize="small" />
      </IconButton>
      <IconButton
        aria-label={`Eliminar participante ${getDisplayName(participant)}`}
        color="error"
        onClick={() => eliminarParticipante(participant.id)}
        sx={{ ...compactIconButtonSx, borderColor: "currentColor" }}
      >
        <DeleteIcon fontSize="small" />
      </IconButton>
    </Box>
  );

  return (
    <Container maxWidth="xl" sx={{ py: { xs: 1.5, md: 4 } }}>
      <Box
        display="flex"
        flexDirection={{ xs: "column", lg: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "stretch", lg: "flex-start" }}
        gap={{ xs: 2, md: 3 }}
        mb={{ xs: 2, md: 3 }}
      >
        <Box
          sx={{
            ...surfaceSx,
            flex: 1,
            p: { xs: 1.5, md: 3 },
            display: "flex",
            flexDirection: "column",
            gap: { xs: 2, md: 3 },
          }}
        >
          <Box
            display="flex"
            flexDirection={{ xs: "column", md: "row" }}
            justifyContent="space-between"
            gap={3}
          >
            <Box sx={{ maxWidth: 720 }}>
              <Typography
                variant="overline"
                sx={{ color: "primary.main", letterSpacing: "0.12em" }}
              >
                Panel operativo
              </Typography>
              <Typography
                variant="h3"
                sx={{
                  fontSize: { xs: 30, md: 42 },
                  lineHeight: 1,
                  mt: 0.5,
                }}
              >
                Participantes registrados
              </Typography>
            </Box>
            <Box
              sx={{
                minWidth: { xs: "100%", md: 280 },
                display: "flex",
                flexDirection: "column",
                alignItems: { xs: "stretch", md: "flex-end" },
                gap: 1.5,
              }}
            >
              {user?.email && (
                <Box display="flex" alignItems="center" gap={1}>
                  {isAdmin && (
                    <IconButton
                      aria-label="Abrir configuración"
                      onClick={() => navigate("/configuracion")}
                      sx={compactIconButtonSx}
                    >
                      <SettingsOutlinedIcon fontSize="small" />
                    </IconButton>
                  )}
                  <AccountCircleIcon fontSize="small" color="action" />
                  <Typography variant="body2" color="text.secondary">
                    {user.email}
                  </Typography>
                </Box>
              )}
              <Button
                variant="outlined"
                color="inherit"
                startIcon={<LogoutIcon />}
                onClick={handleLogout}
                sx={{
                  alignSelf: { xs: "stretch", md: "flex-end" },
                  borderColor: "divider",
                  color: "text.primary",
                }}
              >
                Cerrar sesión
              </Button>
            </Box>
          </Box>

          <Divider />

          <Box
            display="flex"
            flexDirection={{ xs: "column", xl: "row" }}
            justifyContent="space-between"
            gap={2}
          >
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "repeat(2, minmax(0, 1fr))",
                  sm: "repeat(2, minmax(0, 1fr))",
                  xl: "repeat(4, minmax(0, 1fr))",
                },
                gap: 1.5,
                flex: 1,
                order: { xs: 2, xl: 1 },
              }}
            >
              {summaryCards.map((card) => {
                const isActive =
                  (statusFilter === "todos" && card.key === "todos") ||
                  statusFilter === card.key;

                return (
                  <Paper
                    key={card.key}
                    onClick={() => toggleStatusFilter(card.key)}
                    sx={{
                      ...metricTileBaseSx,
                      backgroundColor: card.backgroundColor,
                      color: card.color,
                      border: "1px solid",
                      borderColor: isActive ? "#16302A" : card.borderColor,
                    }}
                  >
                    <Typography variant="overline" sx={{ opacity: 0.9 }}>
                      {card.title}
                    </Typography>
                    <Typography
                      variant="h3"
                      sx={{ fontSize: { xs: 28, md: 42 }, lineHeight: 1 }}
                    >
                      {card.value}
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9, fontSize: { xs: 12, md: 14 } }}>
                      {card.caption}
                    </Typography>
                  </Paper>
                );
              })}
            </Box>

            <Paper
              sx={{
                ...surfaceSx,
                width: { xs: "100%", xl: 280 },
                p: { xs: 1.5, md: 2 },
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                gap: 1,
                order: { xs: 1, xl: 2 },
              }}
            >
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => navigate("/registrar")}
                fullWidth
              >
                Registrar participante
              </Button>
              {isAdmin && (
                <Box display="flex" flexDirection="column" gap={1}>
                  <Button
                    variant="outlined"
                    startIcon={<AssessmentOutlinedIcon />}
                    onClick={() => navigate("/reporte-financiero")}
                    fullWidth
                  >
                    Ver reportes
                  </Button>
                  <Button
                    variant="outlined"
                    color="secondary"
                    startIcon={<PersonAddAltOutlinedIcon />}
                    onClick={() => navigate("/registrar-usuario")}
                    fullWidth
                  >
                    Registrar usuario
                  </Button>
                </Box>
              )}
            </Paper>
          </Box>
        </Box>
      </Box>

      {dataError && (
        <Alert severity="error" sx={{ mt: 2, borderRadius: 0 }}>
          {dataError}
        </Alert>
      )}

      {legacyPaidCount > 0 && (
        <Alert severity="warning" sx={{ mt: 2, borderRadius: 0 }}>
          Hay {legacyPaidCount} pagados legacy sin monto trazable. Se muestran marcados para revisión operativa.
        </Alert>
      )}

      <Paper sx={{ ...surfaceSx, mt: 3 }}>
        {loadingData && <LinearProgress />}
        <Box
          sx={{
            p: { xs: 1.5, md: 3 },
            display: "flex",
            flexDirection: "column",
                gap: 1,
          }}
        >
          <Box
            display="flex"
            flexDirection={{ xs: "column", lg: "row" }}
            justifyContent="space-between"
            gap={2}
          >
            <Box>
              <Typography variant="h5">Participantes</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {tipoFilter !== "todos"
                  ? `${tipoFilter}: ${datosFiltrados.length} resultados.`
                  : statusFilter === "todos"
                  ? `Mostrando ${datosFiltrados.length} participantes de ${totalParticipantes}.`
                  : `${summaryCards.find((card) => card.key === statusFilter)?.title || "Estado"}: ${datosFiltrados.length} resultados.`}
              </Typography>
            </Box>
            <Box
              display="flex"
              flexDirection={{ xs: "column", sm: "row" }}
              gap={1}
              alignItems={{ xs: "stretch", sm: "center" }}
              flexWrap="wrap"
            >
              <TextField
                label="Buscar participante"
                placeholder="Nombre o cédula"
                value={filtro}
                size="small"
                onChange={(e) => setFiltro(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" />
                    </InputAdornment>
                  ),
                  endAdornment: filtro ? (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="Limpiar búsqueda"
                        size="small"
                        onClick={() => setFiltro("")}
                        edge="end"
                      >
                        <Typography variant="caption" fontWeight={700}>
                          Limpiar
                        </Typography>
                      </IconButton>
                    </InputAdornment>
                  ) : null,
                }}
                sx={{ minWidth: { xs: "100%", sm: 300 } }}
              />
              <Box
                sx={{
                  display: "flex",
                  gap: 1,
                  flexWrap: "wrap",
                  justifyContent: { xs: "space-between", sm: "flex-end" },
                }}
              >
                <TextField
                  select
                  label="Orden"
                  value={sortColumn}
                  onChange={(e) => setSortColumn(e.target.value)}
                  SelectProps={{ native: true }}
                  size="small"
                  sx={{ minWidth: 180 }}
                >
                  {sortOptions.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </TextField>
                <Button
                  variant="outlined"
                  startIcon={<SwapVertIcon />}
                  onClick={() =>
                    setSortDirection((currentDirection) =>
                      currentDirection === "asc" ? "desc" : "asc"
                    )
                  }
                  sx={{ whiteSpace: "nowrap" }}
                >
                  {sortDirection === "asc" ? "Ascendente" : "Descendente"}
                </Button>
              </Box>
            </Box>
          </Box>

          <Box
            display="flex"
            gap={1}
            justifyContent={{ xs: "space-between", sm: "flex-start" }}
            sx={{
              flexWrap: { xs: "nowrap", sm: "wrap" },
              overflowX: { xs: "auto", sm: "visible" },
              px: { xs: 1, sm: 0 },
            }}
          >
            <Button
              key="todos-button"
              size="small"
              aria-label="Todos"
              variant={tipoFilter === "todos" && statusFilter === "todos" ? "contained" : "outlined"}
              onClick={() => {
                setTipoFilter("todos");
                setStatusFilter("todos");
              }}
              sx={{
                px: 1,
                py: 0.5,
                minWidth: 56,
                height: 32,
                fontSize: "0.8rem",
                color: tipoFilter === "todos" && statusFilter === "todos" ? "primary.contrastText" : "text.primary",
                backgroundColor: tipoFilter === "todos" && statusFilter === "todos" ? "primary.main" : "transparent",
                borderColor: tipoFilter === "todos" && statusFilter === "todos" ? "primary.main" : "divider",
                "&:hover": {
                  backgroundColor: tipoFilter === "todos" && statusFilter === "todos" ? "primary.dark" : "#EEE8D8",
                  borderColor: tipoFilter === "todos" && statusFilter === "todos" ? "primary.dark" : "#D8D1C2",
                },
                whiteSpace: "nowrap",
              }}
            >
              <Box display="inline-flex" alignItems="center" gap={1}>
                <PeopleOutlineIcon fontSize="small" />
                <Typography component="span" sx={{ display: { xs: "none", sm: "inline" } }}>Todos</Typography>
              </Box>
            </Button>

            {TIPO_OPTIONS.map((tipo) => {
              const isActive = tipoFilter === tipo;

              let Icon = PeopleOutlineIcon;
              if (tipo === "Participante") Icon = PersonAddAltOutlinedIcon;
              if (tipo === "Participante menor de edad") Icon = ChildCareIcon;
              if (tipo === "Visitante") Icon = VisibilityIcon;
              if (tipo === "Otra iglesia") Icon = ChurchIcon;
              if (tipo === "Servidor") Icon = AdminPanelSettingsIcon;

              return (
                <Button
                  key={tipo}
                  size="small"
                  aria-label={tipo}
                  variant={isActive ? "contained" : "outlined"}
                  onClick={() => toggleTipoFilter(tipo)}
                  sx={{
                    px: 1,
                    py: 0.5,
                    minWidth: 56,
                    height: 32,
                    fontSize: "0.8rem",
                    color: isActive ? "primary.contrastText" : "text.primary",
                    backgroundColor: isActive ? "primary.main" : "transparent",
                    borderColor: isActive ? "primary.main" : "divider",
                    "&:hover": {
                      backgroundColor: isActive ? "primary.dark" : "#EEE8D8",
                      borderColor: isActive ? "primary.dark" : "#D8D1C2",
                    },
                    whiteSpace: "nowrap",
                  }}
                >
                  <Box display="inline-flex" alignItems="center" gap={1}>
                    <Icon fontSize="small" />
                    <Typography component="span" sx={{ display: { xs: "none", sm: "inline" } }}>{tipo}</Typography>
                  </Box>
                </Button>
              );
            })}
            {/* <Typography variant="caption" color="text.secondary" sx={{ ml: { xs: 0, sm: 1 } }}>
              Orden: {activeSortLabel} · {sortDirection === "asc" ? "asc" : "desc"}
            </Typography> */}
          </Box>

          <Box sx={{ display: { xs: "grid", sm: "none" }, gap: 1 }}>
            {datosFiltrados.length === 0 ? (
              <Paper sx={{ ...surfaceSx, p: 2, textAlign: "center" }}>
                <Typography variant="h6">Sin resultados</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Ajusta la búsqueda o limpia el filtro para volver a ver participantes.
                </Typography>
                {(filtro || statusFilter !== "todos" || tipoFilter !== "todos") && (
                  <Button
                    variant="text"
                    sx={{ mt: 1.5 }}
                    onClick={() => {
                      setFiltro("");
                      setStatusFilter("todos");
                      setTipoFilter("todos");
                    }}
                  >
                    Limpiar vista
                  </Button>
                )}
              </Paper>
            ) : (
              datosFiltrados.map((participant) => {
                const status = getParticipantStatus(participant, costoCongreso);
                const paymentStatus = getParticipantPaymentStatus(participant, costoCongreso);
                const paymentLabel = participant.pago
                  ? participant.segundaFormaPago
                    ? `${participant.formaPago} / ${participant.segundaFormaPago}`
                    : participant.formaPago
                  : "-";

                return (
                  <Paper key={participant.id} sx={{ ...surfaceSx, p: 1.5 }}>
                    <Box display="flex" justifyContent="space-between" gap={1.5}>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                          {getDisplayName(participant)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
                          Cédula: {participant.ci || participant.cedula || "Sin cédula"}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.25 }}>
                          Teléfono: {participant.telefonoMovil || participant.telefonoFijo || participant.telefono || "-"}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.25 }}>
                          Registro: {participant.registradoPor || "-"}
                        </Typography>
                      </Box>
                      {renderParticipantActions(participant)}
                    </Box>
                    <Box display="flex" alignItems="center" justifyContent="space-between" gap={1} mt={1.5}>
                      <Chip label={status.shortLabel} sx={status.sx} />
                      <Box sx={{ textAlign: "right" }}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                          Pago: {paymentLabel}
                        </Typography>
                        {paymentStatus.isLegacyPaid && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.25 }}>
                            Registro heredado sin monto exacto.
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  </Paper>
                );
              })
            )}
          </Box>

          <Box sx={{ display: { xs: "none", sm: "block" }, width: "100%", overflowX: "auto", border: "1px solid #D8D1C2" }}>
            <Table sx={{ minWidth: 760 }}>
              <TableHead>
                <TableRow>
                  <TableCell>
                    <Button color="inherit" onClick={() => toggleSort("nombre")}>
                      Nombre
                    </Button>
                  </TableCell>
                  <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>
                    <Button color="inherit" onClick={() => toggleSort("cedula")}>
                      Cédula
                    </Button>
                  </TableCell>
                  <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>
                    <Button color="inherit" onClick={() => toggleSort("telefono")}>
                      Teléfono
                    </Button>
                  </TableCell>
                  <TableCell sx={{ display: { xs: "none", lg: "table-cell" } }}>
                    <Button color="inherit" onClick={() => toggleSort("edad")}>
                      Edad
                    </Button>
                  </TableCell>
                  <TableCell>Estado</TableCell>
                  {/* <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>
                    <Button color="inherit" onClick={() => toggleSort("formaPago")}>
                      Pago
                    </Button>
                  </TableCell> */}
                  <TableCell sx={{ display: { xs: "none", lg: "table-cell" } }}>
                    <Button color="inherit" onClick={() => toggleSort("registradoPor")}>
                      Registrado por
                    </Button>
                  </TableCell>
                  <TableCell align="right">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {datosFiltrados.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} sx={{ py: 6, textAlign: "center" }}>
                      <Typography variant="h6">Sin resultados</Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        Ajusta la búsqueda o limpia el filtro para volver a ver participantes.
                      </Typography>
                      {(filtro || statusFilter !== "todos" || tipoFilter !== "todos") && (
                        <Button
                          variant="text"
                          sx={{ mt: 2 }}
                          onClick={() => {
                            setFiltro("");
                            setStatusFilter("todos");
                            setTipoFilter("todos");
                          }}
                        >
                          Limpiar vista
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ) : (
                  datosFiltrados.map((p) => {
                    const status = getParticipantStatus(p, costoCongreso);
                    const paymentStatus = getParticipantPaymentStatus(p, costoCongreso);

                    return (
                      <TableRow
                        key={p.id}
                        hover
                        sx={{
                          "& td": {
                            borderBottomColor: "#E4DDCE",
                            py: 1.25,
                            verticalAlign: "top",
                          },
                        }}
                      >
                        <TableCell sx={{ minWidth: { xs: 190, sm: 220 } }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                            {getDisplayName(p)}
                          </Typography>
                          <Box
                            sx={{
                              mt: 0.5,
                              display: "grid",
                              gap: 0.25,
                              color: "text.secondary",
                            }}
                          >
                            <Typography variant="caption" sx={{ display: { xs: "block", sm: "none" } }}>
                              Cédula: {p.ci || p.cedula || "Sin cédula"}
                            </Typography>
                            <Typography variant="caption" sx={{ display: { xs: "block", md: "none" } }}>
                              Teléfono: {p.telefonoMovil || p.telefonoFijo || p.telefono || "-"}
                            </Typography>
                            <Typography variant="caption" sx={{ display: { xs: "block", lg: "none" } }}>
                              Registro: {p.registradoPor || "-"}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>
                          {p.ci || p.cedula}
                        </TableCell>
                        <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>
                          {p.telefonoMovil || p.telefonoFijo || p.telefono}
                        </TableCell>
                        <TableCell sx={{ display: { xs: "none", lg: "table-cell" } }}>
                          {p.edad || "-"}
                        </TableCell>
                        <TableCell sx={{ minWidth: 150 }}>
                          <Chip
                            label={status.shortLabel}
                            sx={{ ...status.sx, display: { xs: "inline-flex", sm: "none" } }}
                          />
                          <Chip
                            label={status.label}
                            sx={{ ...status.sx, display: { xs: "none", sm: "inline-flex" } }}
                          />
                          {paymentStatus.isLegacyPaid && (
                            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
                              Sin monto trazable
                            </Typography>
                          )}
                        </TableCell>
                        {/* <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>
                          <Typography variant="body2">{paymentLabel}</Typography>
                          {paymentStatus.isLegacyPaid && (
                            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
                              Legacy por conciliar
                            </Typography>
                          )}
                        </TableCell> */}
                        <TableCell sx={{ display: { xs: "none", lg: "table-cell" } }}>
                          <Typography variant="body2">{p.registradoPor || "-"}</Typography>
                        </TableCell>
                        <TableCell align="right">
                          {renderParticipantActions(p)}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </Box>

          <Box
            display="flex"
            flexDirection={{ xs: "column", md: "row" }}
            justifyContent="space-between"
            alignItems={{ xs: "flex-start", md: "center" }}
            gap={1.5}
          >
            <Typography variant="body2" color="text.secondary">
              {pendientesList.length} pendientes, {exentos.length} exentos y {legacyPaidCount} legacy en total.
            </Typography>
            <Button
              variant="text"
              endIcon={<ArrowOutwardIcon fontSize="small" />}
              onClick={() => navigate("/registrar")}
            >
              Nuevo registro
            </Button>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
}
