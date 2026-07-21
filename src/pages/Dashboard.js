import React, { useState, useEffect, useRef } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Chip,
  Container,
  Divider,
  IconButton,
  InputAdornment,
  Link,
  LinearProgress,
  Paper,
  Pagination,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Skeleton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from "@mui/material";
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
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import SearchIcon from '@mui/icons-material/Search';
import PeopleOutlineIcon from '@mui/icons-material/PeopleOutline';
import ChildCareIcon from '@mui/icons-material/ChildCare';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ChurchIcon from '@mui/icons-material/Church';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import LabelImportantIcon from '@mui/icons-material/LabelImportant';
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';
// firestore operations handled by ParticipantsProvider
import { useNavigate, useSearchParams } from "react-router-dom";
import { getAuth } from "../firebase";
import { useAuth } from "../contexts/AuthContext";
import { useParticipants } from "../contexts/ParticipantsContext";
import { getEventCost, getParticipantPaymentStatus, computeFinancialSummary } from "../utils/paymentConfig";
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

function normalizeWhatsappPhone(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("58")) return digits;
  if (digits.startsWith("0")) return `58${digits.slice(1)}`;
  return digits;
}

function getWhatsappUrl(phone) {
  const normalized = normalizeWhatsappPhone(phone);
  return normalized ? `https://wa.me/${normalized}` : "";
}

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

function isAbonadoParticipant(participant, costoCongreso) {
  const paymentStatus = getParticipantPaymentStatus(participant, costoCongreso);
  const monto = Number(participant?.montoPagado) || 0;

  return !participant?.exento && !paymentStatus.isLegacyPaid && monto > 0 && monto < costoCongreso;
}

function PhoneLink({ phone }) {
  const whatsappUrl = getWhatsappUrl(phone);

  if (!phone) return "-";
  if (!whatsappUrl) return phone;

  return (
    <Box
      component={Link}
      href={whatsappUrl}
      target="_blank"
      rel="noreferrer"
      underline="none"
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 0.5,
        color: "#046552",
        fontWeight: 600,
        whiteSpace: "nowrap",
        verticalAlign: "middle",
        "&:hover": {
          color: "#00492F",
        },
      }}
    >
      <WhatsAppIcon sx={{ fontSize: 16 }} />
      <span>{phone}</span>
    </Box>
  );
}

const TIPO_OPTIONS = [
  "Participante",
  "Menor de edad",
  "Visitante",
  "Otra iglesia",
  "Servidor",
];

function getTipoRegistro(participant) {
  // Normalize any incoming tipoRegistro labels to canonical set used across the app.
  const canonical = (raw) => {
    if (!raw && raw !== "") return "";
    const s = String(raw || "").trim().toLowerCase();
    if (!s) return "";
    if (s.includes("menor")) return "Menor de edad";
    if (s.includes("participante")) return "Participante";
    if (s.includes("visitante")) return "Visitante";
    if (s.includes("otra iglesia") || s.includes("iglesia")) return "Otra iglesia";
    if (s.includes("servid")) return "Servidor";
    return raw;
  };

  if (!participant) return "Participante";
  if (participant.tipoRegistro) return canonical(participant.tipoRegistro);

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

  if (typeof edad === "number" && edad < 18) return "Menor de edad";
  return "Participante";
}

export default function Dashboard() {
  const participantsCtx = useParticipants();
  const { config } = useConfig();
  const [filtro, setFiltro] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [tipoFilter, setTipoFilter] = useState("todos");
  const [sortColumn, setSortColumn] = useState("nombre");
  const [sortDirection, setSortDirection] = useState("asc");
  const [searchParams, setSearchParams] = useSearchParams();
  const pageParam = parseInt(searchParams.get('page')) || 1;
  const [currentPage, setCurrentPage] = useState(pageParam);
  const UI_PAGE_SIZE = 50;
  const SKELETON_ROWS = 8;
  // Move keyboard focus onto the active summary card when the status filter
  // changes (skips the initial mount so it doesn't steal focus on page load).
  const activeCardRef = useRef(null);
  const statusFilterMountedRef = useRef(false);

  const navigate = useNavigate();
  const auth = getAuth();
  const { user, isAdmin } = useAuth();

  if (!participantsCtx || typeof participantsCtx !== 'object') {
    console.error('useParticipants returned invalid context in Dashboard:', participantsCtx);
  }
  const {
    participants: data = [],
    loading: loadingData = false,
    error: dataError = '',
    deleteParticipant = async () => {},
    loadPage = async () => {},
    loadingMore = false,
    totalCount = null,
    globalCounts = { total: null, pagados: null, pendientes: null, exentos: null, legacy: null, abonados: null, loading: false },
  } = participantsCtx || {};

  // participants are provided in real-time by ParticipantsProvider

  // Config is provided by ConfigProvider via useConfig

  const eliminarParticipante = async (id) => {
    // Open confirm dialog instead (handled via state)
    setConfirmTarget({ id, name: getDisplayName(data.find(p => p.id === id) || {}) });
    setConfirmOpen(true);
  };

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState(null);

  const handleConfirmClose = () => {
    setConfirmOpen(false);
    setConfirmTarget(null);
  };

  const handleConfirmDelete = async () => {
    if (!confirmTarget || !confirmTarget.id) return handleConfirmClose();
    const id = confirmTarget.id;
    try {
      await deleteParticipant(id);
    } catch (error) {
      console.error("Error al eliminar participante:", error);
    } finally {
      handleConfirmClose();
    }
  };

  const handleLogout = async () => {
    navigate("/");
    try {
      const { signOut } = await import('firebase/auth');
      await signOut(auth);
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
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

  // Sync URL page param when filters change: reset to page 1 and include search/filters
  useEffect(() => {
    const params = {};
    if (filtro) params.search = filtro;
    if (statusFilter && statusFilter !== 'todos') params.status = statusFilter;
    if (tipoFilter && tipoFilter !== 'todos') params.tipo = tipoFilter;
    params.page = 1;
    setSearchParams(params);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtro, statusFilter, tipoFilter, sortColumn, sortDirection]);

  // Keep local currentPage in sync with URL
  useEffect(() => {
    setCurrentPage(pageParam);
  }, [pageParam]);

  // Focus the active summary card when the status filter changes (not on mount).
  useEffect(() => {
    if (!statusFilterMountedRef.current) {
      statusFilterMountedRef.current = true;
      return;
    }
    const node = activeCardRef.current;
    if (!node) return;
    try {
      node.focus({ preventScroll: true });
    } catch (_) {
      node.focus();
    }
  }, [statusFilter]);

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
        if (statusFilter === "abonado") {
          if (!isAbonadoParticipant(participant, costoCongreso)) return false;
        } else if (getParticipantStatus(participant, costoCongreso).key !== statusFilter) {
          return false;
        }
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

  
  const summary = computeFinancialSummary(data, costoCongreso, 0);
  const legacyPaidCount = data.filter((participant) => getParticipantPaymentStatus(participant, costoCongreso).isLegacyPaid).length;
  const abonadosCount = data.filter((participant) => isAbonadoParticipant(participant, costoCongreso)).length;
  const exentosCount = typeof globalCounts.exentos === 'number' ? globalCounts.exentos : summary.exentosCount;
  const pagados = typeof globalCounts.pagados === 'number' ? globalCounts.pagados : summary.pagadosCount;
  const pendientes = typeof globalCounts.pendientes === 'number' ? globalCounts.pendientes : summary.pendientesCount;

  // `globalCounts` is provided by ParticipantsContext

  const totalParticipantes = typeof globalCounts.total === 'number' && globalCounts.total > 0
    ? globalCounts.total
    : (typeof totalCount === 'number' && totalCount > 0 ? totalCount : data.length);

  // When any filter/search is active the provider holds the FULL dataset, so we
  // filter (datosFiltrados) and paginate the COMPLETE matching set here. This
  // keeps every match together on contiguous pages instead of scattering them
  // across server pages. With no filters we keep efficient server-side paging.
  const clientMode = Boolean(filtro) || statusFilter !== "todos" || tipoFilter !== "todos";

  const serverHasTotal = (typeof globalCounts.total === 'number' && globalCounts.total > 0) || (typeof totalCount === 'number' && totalCount > 0);
  const visibleRows = clientMode
    ? datosFiltrados.slice((currentPage - 1) * UI_PAGE_SIZE, (currentPage - 1) * UI_PAGE_SIZE + UI_PAGE_SIZE)
    : (serverHasTotal
        ? datosFiltrados
        : datosFiltrados.slice((currentPage - 1) * UI_PAGE_SIZE, (currentPage - 1) * UI_PAGE_SIZE + UI_PAGE_SIZE));

  // Pagination helpers for MUI Pagination control. In client mode the page count
  // reflects the filtered result set; otherwise the provider's server-side total.
  const effectiveTotal = clientMode
    ? datosFiltrados.length
    : (typeof globalCounts.total === 'number' && globalCounts.total > 0 ? globalCounts.total : (typeof totalCount === 'number' && totalCount > 0 ? totalCount : data.length));
  const pageCount = Math.max(1, Math.ceil(effectiveTotal / UI_PAGE_SIZE));

  useEffect(() => {
    if (currentPage > pageCount) setCurrentPage(pageCount);
  }, [pageCount, currentPage]);

  const handlePageChange = async (_e, value) => {
    // update URL param; effect will trigger loadPage
    const params = {};
    if (filtro) params.search = filtro;
    if (statusFilter && statusFilter !== 'todos') params.status = statusFilter;
    if (tipoFilter && tipoFilter !== 'todos') params.tipo = tipoFilter;
    params.page = value;
    setSearchParams(params);
    try {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (_) {}
  };

  // Trigger data loading when relevant params change. When a filter/search is
  // active the provider loads the full dataset once and reuses it (see
  // holdsFullRef in ParticipantsContext), so switching filters or turning pages
  // within a filtered view does not re-fetch; the client filters & paginates it.
  useEffect(() => {
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || (statusFilter !== 'todos' ? statusFilter : null);
    const tipo = searchParams.get('tipo') || (tipoFilter !== 'todos' ? tipoFilter : null);
    const page = parseInt(searchParams.get('page')) || 1;
    const opts = { pageNumber: page, search, statusFilter: status, tipoFilter: tipo, sortColumn, sortDirection };
    (async () => {
      try {
        if (typeof loadPage === 'function') await loadPage(opts);
      } catch (e) {
        console.error('Error al cargar página (effect):', e);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, sortColumn, sortDirection]);

  const summaryCards = [
    {
      key: "todos",
      title: "Total registrados",
      icon: <PeopleOutlineIcon fontSize="small" />,
      value: totalParticipantes,
      caption: clientMode ? `${datosFiltrados.length} coinciden con el filtro` : (typeof globalCounts.total === 'number' && globalCounts.total > 0 ? `Base: ${data.length} en esta página · ${globalCounts.total} total` : (typeof totalCount === 'number' && totalCount > 0 ? `Base: ${data.length} en esta página · ${totalCount} total` : "Base completa")),
      backgroundColor: "#00492F",
      color: "#F7F3E8",
      borderColor: "#00492F",
    },
    {
      key: "pagado",
      title: "Pagados",
      icon: <AttachMoneyIcon fontSize="small" />,
      value: typeof globalCounts.pagados === 'number' ? globalCounts.pagados : pagados,
      caption: typeof globalCounts.pagados === 'number' ? (globalCounts.legacy > 0 ? `Incluye ${globalCounts.legacy} legacy` : "Pago completo o mayor") : (legacyPaidCount > 0 ? `Incluye ${legacyPaidCount} legacy` : "Pago completo o mayor"),
      backgroundColor: "#046552",
      color: "#F7F3E8",
      borderColor: "#046552",
    },
    {
      key: "pendiente",
      title: "Pendientes",
      icon: <PendingActionsIcon fontSize="small" />,
      value: typeof globalCounts.pendientes === 'number' ? globalCounts.pendientes : pendientes,
      caption: "Requieren seguimiento",
      backgroundColor: "#FFBC00",
      color: "#1E1E1E",
      borderColor: "#D7A100",
    },
    {
      key: "abonado",
      title: "Abonados",
      icon: <PaymentsOutlinedIcon fontSize="small" />,
      value: typeof globalCounts.abonados === 'number' ? globalCounts.abonados : abonadosCount,
      caption: "Pago parcial registrado",
      backgroundColor: "#C96F12",
      color: "#FFF7ED",
      borderColor: "#A95C10",
    },
    {
      key: "exento",
      title: "Exentos",
      icon: <LabelImportantIcon fontSize="small" />,
      value: typeof globalCounts.exentos === 'number' ? globalCounts.exentos : exentosCount,
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
      <Dialog
        open={confirmOpen}
        onClose={handleConfirmClose}
        aria-labelledby="confirm-delete-title"
      >
        <DialogTitle id="confirm-delete-title">Confirmar eliminación</DialogTitle>
        <DialogContent>
          <DialogContentText>
            ¿Estás seguro de eliminar a {confirmTarget?.name || 'este participante'}? Esta acción no se puede deshacer.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleConfirmClose}>Cancelar</Button>
          <Button color="error" onClick={handleConfirmDelete}>Eliminar</Button>
        </DialogActions>
      </Dialog>
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
                  xl: "repeat(5, minmax(0, 1fr))",
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
                    ref={isActive ? activeCardRef : null}
                    role="button"
                    tabIndex={0}
                    aria-pressed={isActive}
                    aria-label={`Filtrar por ${card.title}`}
                    onClick={() => toggleStatusFilter(card.key)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        toggleStatusFilter(card.key);
                      }
                    }}
                    sx={{
                      ...metricTileBaseSx,
                      backgroundColor: card.backgroundColor,
                      color: card.color,
                      border: "2px solid",
                      borderColor: isActive ? "#16302A" : card.borderColor,
                      transform: isActive ? "translateY(-2px)" : "none",
                      boxShadow: isActive
                        ? "0 0 0 2px #16302A, 0 8px 20px rgba(0, 73, 47, 0.28)"
                        : "none",
                      outline: "none",
                      "&:focus-visible": {
                        borderColor: "#16302A",
                        boxShadow: "0 0 0 3px rgba(22, 48, 42, 0.55)",
                      },
                    }}
                  >
                    <Box display="flex" alignItems="center" justifyContent="space-between" gap={1}>
                      <Typography variant="overline" sx={{ opacity: 0.9 }}>
                        {card.title}
                      </Typography>
                      <Box component="span" sx={{ display: "inline-flex", opacity: 0.9 }}>
                        {card.icon}
                      </Box>
                    </Box>
                    {globalCounts && globalCounts.loading ? (
                      <>
                        <Skeleton variant="text" width={160} height={48} />
                        <Skeleton variant="text" width={200} />
                      </>
                    ) : (
                      <>
                        <Typography
                          variant="h3"
                          sx={{ fontSize: { xs: 28, md: 42 }, lineHeight: 1 }}
                        >
                          {card.value}
                        </Typography>
                        <Typography variant="body2" sx={{ opacity: 0.9, fontSize: { xs: 12, md: 14 } }}>
                          {card.caption}
                        </Typography>
                      </>
                    )}
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
              if (tipo === "Menor de edad") Icon = ChildCareIcon;
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
            {loadingData ? (
              Array.from({ length: SKELETON_ROWS }).map((_, i) => (
                <Paper key={`sk-card-${i}`} sx={{ ...surfaceSx, p: 1.5 }}>
                  <Box display="flex" justifyContent="space-between" gap={1.5}>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Skeleton variant="text" width="60%" height={24} />
                      <Skeleton variant="text" width="45%" />
                      <Skeleton variant="text" width="50%" />
                      <Skeleton variant="text" width="40%" />
                    </Box>
                    <Skeleton variant="rounded" width={72} height={36} />
                  </Box>
                  <Box display="flex" alignItems="center" justifyContent="space-between" mt={1.5}>
                    <Skeleton variant="rounded" width={90} height={24} />
                    <Skeleton variant="text" width={80} />
                  </Box>
                </Paper>
              ))
            ) : datosFiltrados.length === 0 ? (
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
              visibleRows.map((participant) => {
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
                            Teléfono: <PhoneLink phone={participant.telefonoMovil || participant.telefonoFijo || participant.telefono || ""} />
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
                {loadingData ? (
                  Array.from({ length: SKELETON_ROWS }).map((_, i) => (
                    <TableRow key={`sk-row-${i}`} sx={{ "& td": { borderBottomColor: "#E4DDCE", py: 1.25 } }}>
                      <TableCell sx={{ minWidth: { xs: 190, sm: 220 } }}>
                        <Skeleton variant="text" width="70%" height={24} />
                      </TableCell>
                      <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>
                        <Skeleton variant="text" width="80%" />
                      </TableCell>
                      <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>
                        <Skeleton variant="text" width="80%" />
                      </TableCell>
                      <TableCell sx={{ display: { xs: "none", lg: "table-cell" } }}>
                        <Skeleton variant="text" width={32} />
                      </TableCell>
                      <TableCell sx={{ minWidth: 150 }}>
                        <Skeleton variant="rounded" width={110} height={24} />
                      </TableCell>
                      <TableCell sx={{ display: { xs: "none", lg: "table-cell" } }}>
                        <Skeleton variant="text" width="70%" />
                      </TableCell>
                      <TableCell align="right">
                        <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 0.5 }}>
                          <Skeleton variant="rounded" width={36} height={36} />
                          <Skeleton variant="rounded" width={36} height={36} />
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                ) : datosFiltrados.length === 0 ? (
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
                  (() => {
                    return visibleRows.map((p) => {
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
                              Teléfono: <PhoneLink phone={p.telefonoMovil || p.telefonoFijo || p.telefono || ""} />
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
                          <PhoneLink phone={p.telefonoMovil || p.telefonoFijo || p.telefono || ""} />
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
                    });
                  })()
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
              {typeof globalCounts.pendientes === 'number' ? globalCounts.pendientes : pendientes} pendientes, {typeof globalCounts.exentos === 'number' ? globalCounts.exentos : exentosCount} exentos y {typeof globalCounts.legacy === 'number' ? globalCounts.legacy : legacyPaidCount} legacy en total.
            </Typography>
            <Box display="flex" alignItems="center" gap={1}>
              {pageCount > 1 && (
                <Box display="flex" alignItems="center" gap={1}>
                  <Pagination
                    count={pageCount}
                    page={currentPage}
                    onChange={handlePageChange}
                    color="primary"
                    siblingCount={1}
                    boundaryCount={1}
                    size="small"
                  />
                  {loadingMore && <CircularProgress size={16} />}
                </Box>
              )}
              <Button
                variant="text"
                endIcon={<ArrowOutwardIcon fontSize="small" />}
                onClick={() => navigate("/registrar")}
              >
                Nuevo registro
              </Button>
            </Box>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
}
