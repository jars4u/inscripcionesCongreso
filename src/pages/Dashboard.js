import React, { useState, useEffect } from "react";
import {
  Container,
  Box,
  Typography,
  Button,
  TextField,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  IconButton,
  Chip,
  InputAdornment,
  Modal,
  Paper,
  Divider,
  CircularProgress,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import LogoutIcon from "@mui/icons-material/Logout";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import { getAuth, signOut } from "firebase/auth";
import { getDocs, collection, deleteDoc, doc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";
import { useAuth } from "../contexts/AuthContext";

export default function Dashboard() {
  const [data, setData] = useState([]);
  const [filtro, setFiltro] = useState("");
  const [openReporte, setOpenReporte] = useState(false);
  const [sortColumn, setSortColumn] = useState("nombre");
  const [sortDirection, setSortDirection] = useState("asc");

  // --- Estado para la tasa de cambio ---
  const [tasaBCV, setTasaBCV] = useState(null);
  const [loadingTasa, setLoadingTasa] = useState(true);

  const navigate = useNavigate();
  const auth = getAuth();
  const { user } = useAuth();
  const adminEmail = ["jars4u2@gmail.com", "carlosurdaneta@gmail.com"];

  const cargarDatos = async () => {
    const snapshot = await getDocs(collection(db, "participantes"));
    const rows = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    setData(rows);
  };

  // --- Función para obtener la tasa del BCV ---
  const fetchTasaBCV = async () => {
    setLoadingTasa(true);
    try {
      // Usamos el proxy local para obtener la tasa del BCV y evitar CORS
      const response = await fetch("http://localhost:4000/api/tasa-bcv");
      const data = await response.json();
      if (data && data.price) {
        setTasaBCV(data.price);
      } else {
        setTasaBCV(0);
      }
    } catch (error) {
      console.error("Error al obtener la tasa del BCV:", error);
      setTasaBCV(0); // Manejar el error, por ejemplo, estableciendo la tasa en 0
    } finally {
      setLoadingTasa(false);
    }
  };

  useEffect(() => {
    cargarDatos();
    fetchTasaBCV(); // Llamamos a la función al cargar el componente
  }, []);

  const eliminarParticipante = async (id) => {
    // Se ha eliminado window.confirm para compatibilidad
    if (window.confirm("¿Estás seguro de eliminar este participante?")) {
      await deleteDoc(doc(db, "participantes", id));
      cargarDatos();
    }
  };

  const handleLogout = () => {
    signOut(auth)
      .then(() => {
        navigate("/");
      })
      .catch((error) => {
        console.error("Error al cerrar sesión:", error);
      });
  };

  // Filtrar y ordenar datos
  const datosFiltrados = data
    .filter((p) =>
      (p.nombre + " " + p.apellido + " " + p.cedula)
        .toLowerCase()
        .includes(filtro.toLowerCase())
    )
    .sort((a, b) => {
      let valA = a[sortColumn];
      let valB = b[sortColumn];
      if (
        ["edad", "cedula", "telefono", "pagados", "pendientes"].includes(
          sortColumn
        )
      ) {
        valA = Number(valA) || 0;
        valB = Number(valB) || 0;
      } else {
        valA = (valA || "").toString().toLowerCase();
        valB = (valB || "").toString().toLowerCase();
      }
      if (valA < valB) return sortDirection === "asc" ? -1 : 1;
      if (valA > valB) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

  const totalParticipantes = data.length;
  const pagados = data.filter((p) => p.pago).length;
  const pendientes = totalParticipantes - pagados;
  const costoCongreso = 8;
  const montoRecaudado = pagados * costoCongreso;
  const montoPendiente = pendientes * costoCongreso;
  const montoTotal = totalParticipantes * costoCongreso;

  // --- Cálculos en Bolívares ---
  const montoRecaudadoBs = montoRecaudado * (tasaBCV || 0);
  const montoPendienteBs = montoPendiente * (tasaBCV || 0);
  const montoTotalBs = montoTotal * (tasaBCV || 0);

  return (
    <Container maxWidth="lg">
      <Box
        mt={5}
        mb={2}
        display="flex"
        flexDirection={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "stretch", sm: "center" }}
        gap={2}
      >
        <Typography
          variant="h4"
          order={{ xs: 2, sm: 1 }}
          sx={{
            whiteSpace: "nowrap",
            fontSize: { xs: 28, sm: 32, md: 36 },
            textAlign: { xs: "center", sm: "inherit" },
            fontWeight: "bold",
          }}
        >
          Participantes Registrados
        </Typography>
        <Box
          display="flex"
          alignItems="center"
          gap={2}
          order={{ xs: 1, sm: 2 }}
          justifyContent={{ xs: "flex-end", sm: "flex-end" }}
          width="100%"
        >
          {user?.email && (
            <Box display="flex" alignItems="center" gap={1}>
              <AccountCircleIcon fontSize="small" color="action" />
              <Typography variant="body2" color="text.secondary">
                {user.email}
              </Typography>
            </Box>
          )}
          <Button
            variant="outlined"
            startIcon={<LogoutIcon />}
            onClick={handleLogout}
          >
            Cerrar sesión
          </Button>
        </Box>
      </Box>

      <Divider orientation="horizontal" flexItem />

      {/* --- Sección para mostrar la Tasa BCV --- */}
      <Box
        my={2}
        p={2}
        sx={{
          border: "1px solid #ddd",
          borderRadius: 2,
          backgroundColor: "#f9f9f9",
          textAlign: "center",
        }}
      >
        <Typography variant="h6" fontWeight="bold">
          Tasa de Cambio BCV
        </Typography>
        {loadingTasa ? (
          <CircularProgress size={24} />
        ) : (
          <Typography variant="h5" color="primary.main">
            Bs.{" "}
            {tasaBCV
              ? tasaBCV.toLocaleString("de-DE", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })
              : "No disponible"}
          </Typography>
        )}
        <Typography variant="caption" color="text.secondary">
          Fuente: Banco Central de Venezuela (BCV)
        </Typography>
      </Box>

      <Box
        display="flex"
        gap={2}
        my={4}
        flexDirection="row"
        justifyContent="center"
        alignItems="center"
        sx={{ whiteSpace: "nowrap", overflowX: "auto" }}
      >
        <Typography
          variant="h6"
          sx={{ fontSize: { xs: 14, sm: 18 }, fontWeight: "bold" }}
        >
          Total participantes:
          <span style={{ fontWeight: "normal", marginLeft: 6 }}>
            {totalParticipantes}
          </span>
        </Typography>
        <Divider orientation="vertical" flexItem sx={{ mx: 2 }} />
        <Typography
          variant="h6"
          color="success.main"
          sx={{ fontSize: { xs: 14, sm: 18 }, fontWeight: "bold" }}
        >
          Pagados:
          <span style={{ fontWeight: "normal", marginLeft: 6 }}>{pagados}</span>
        </Typography>
        <Divider orientation="vertical" flexItem sx={{ mx: 2 }} />
        <Typography
          variant="h6"
          color="warning.main"
          sx={{ fontSize: { xs: 14, sm: 18 }, fontWeight: "bold" }}
        >
          Pendientes:
          <span style={{ fontWeight: "normal", marginLeft: 6 }}>
            {pendientes}
          </span>
        </Typography>
      </Box>

      <Box
        display="flex"
        gap={2}
        mb={2}
        justifyContent="center"
        alignItems="center"
      >
        <Button variant="contained" onClick={() => navigate("/registrar")}>
          Registrar participante
        </Button>
        {user?.email && adminEmail.includes(user.email) && (
          <>
            <Button
              variant="outlined"
              color="primary"
              onClick={() => setOpenReporte(true)}
            >
              Ver reporte financiero
            </Button>
            <Button
              variant="outlined"
              color="secondary"
              onClick={() => navigate("/registrar-usuario")}
            >
              Registrar usuario
            </Button>
          </>
        )}
      </Box>

      {/* --- MODAL ACTUALIZADO con montos en Bs. --- */}
      {user?.email && adminEmail.includes(user.email) && (
        <Modal open={openReporte} onClose={() => setOpenReporte(false)}>
          <Paper
            sx={{
              maxWidth: 450,
              mx: "auto",
              mt: 10,
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
            </Box>
            <Divider sx={{ mb: 2 }} />
            <Box mb={2}>
              <Typography variant="body1">
                <b>Monto recaudado:</b> $
                {montoRecaudado.toLocaleString("de-DE", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
                <br />
                <Typography variant="caption" color="text.secondary">
                  (Bs.{" "}
                  {montoRecaudadoBs.toLocaleString("de-DE", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                  )
                </Typography>
              </Typography>
              <Typography variant="body1">
                <b>Monto pendiente:</b> $
                {montoPendiente.toLocaleString("de-DE", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
                <br />
                <Typography variant="caption" color="text.secondary">
                  (Bs.{" "}
                  {montoPendienteBs.toLocaleString("de-DE", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                  )
                </Typography>
              </Typography>
              <Typography variant="body1" color="primary">
                <b>Total potencial:</b> $
                {montoTotal.toLocaleString("de-DE", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
                <br />
                <Typography variant="caption" color="text.secondary">
                  (Bs.{" "}
                  {montoTotalBs.toLocaleString("de-DE", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                  )
                </Typography>
              </Typography>
            </Box>
            <Divider sx={{ mb: 2 }} />
            <Button
              variant="contained"
              color="primary"
              fullWidth
              onClick={() => setOpenReporte(false)}
            >
              Cerrar
            </Button>
          </Paper>
        </Modal>
      )}

      <Box display="flex" gap={2} mb={2} flexWrap="nowrap" alignItems="center" width="100%">
        <TextField
          label="Buscar por nombre, apellido o cédula"
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
          margin="normal"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ flex: 2, minWidth: 120 }}
        />
        <TextField
          select
          label="Ordenar por"
          value={sortColumn}
          onChange={(e) => setSortColumn(e.target.value)}
          SelectProps={{ native: true }}
          size="small"
          sx={{ flex: 1, minWidth: 100 }}
        >
          <option value="nombre">Nombre</option>
          <option value="apellido">Apellido</option>
          <option value="cedula">Cédula</option>
          <option value="telefono">Teléfono</option>
          <option value="edad">Edad</option>
          <option value="pago">Pago</option>
          <option value="formaPago">Forma de pago</option>
          <option value="registradoPor">Registrado por</option>
        </TextField>
        <TextField
          select
          label="Dirección"
          value={sortDirection}
          onChange={(e) => setSortDirection(e.target.value)}
          SelectProps={{ native: true }}
          size="small"
          sx={{ flex: 1, minWidth: 100 }}
        >
          <option value="asc">Ascendente</option>
          <option value="desc">Descendente</option>
        </TextField>
      </Box>

      <Box sx={{ width: "100%", overflowX: "auto" }}>
        <Table sx={{ minWidth: 650 }}>
          <TableHead>
            <TableRow>
              <TableCell>Nombre</TableCell>
              <TableCell>Cédula</TableCell>
              <TableCell>Teléfono</TableCell>
              <TableCell>Edad</TableCell>
              <TableCell>Pago</TableCell>
              <TableCell>Forma de pago</TableCell>
              <TableCell>Registrado por</TableCell>
              <TableCell>Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {datosFiltrados.map((p) => (
              <TableRow key={p.id}>
                <TableCell>
                  {p.nombre} {p.apellido}
                </TableCell>
                <TableCell>{p.cedula}</TableCell>
                <TableCell>{p.telefono}</TableCell>
                <TableCell>{p.edad ? p.edad : "-"}</TableCell>
                <TableCell>
                  {p.pago ? (
                    <Chip label="Pagado" color="success" />
                  ) : (
                    <Chip label="Pendiente" color="warning" />
                  )}
                </TableCell>
                <TableCell>
                  {p.pago
                    ? p.segundaFormaPago
                      ? `${p.formaPago} / ${p.segundaFormaPago}`
                      : p.formaPago
                    : "-"}
                </TableCell>
                <TableCell>{p.registradoPor}</TableCell>
                <TableCell>
                  <IconButton onClick={() => navigate(`/editar/${p.id}`)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    color="error"
                    onClick={() => eliminarParticipante(p.id)}
                  >
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>
    </Container>
  );
}
