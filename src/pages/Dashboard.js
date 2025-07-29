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
  const navigate = useNavigate();
  const auth = getAuth();
  const { user } = useAuth();
  const adminEmail = ["jars4u2@gmail.com", "carlosurdaneta@gmail.com"];

  const cargarDatos = async () => {
    const snapshot = await getDocs(collection(db, "participantes"));
    const rows = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    setData(rows);
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const eliminarParticipante = async (id) => {
    const confirmar = window.confirm(
      "¿Estás seguro de eliminar este participante?"
    );
    if (confirmar) {
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

  // Filtros y datos procesados
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
      // Si es número, comparar como número
      if (["edad", "cedula", "telefono", "pagados", "pendientes"].includes(sortColumn)) {
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

      {/* RESUMEN NUMÉRICO */}
      <Divider orientation="horizontal" flexItem />
      <Box
        display="flex"
        gap={4}
        my={4}
        flexDirection="row"
        sx={{
          whiteSpace: "nowrap",
          overflowX: "auto",
          justifyContent: { xs: "center", sm: "flex-start" },
        }}
      >
        <Box sx={{ textAlign: { xs: "center", sm: "left" } }}>
          <Typography
            variant="h6"
            sx={{
              fontSize: { xs: 14, sm: 18 },
              textAlign: { xs: "center", sm: "left" },
            }}
          >
            Total participantes
          </Typography>
          <Typography
            variant="h5"
            sx={{
              fontSize: { xs: 18, sm: 24 },
              textAlign: { xs: "left", sm: "left" },
            }}
          >
            {totalParticipantes}
          </Typography>
        </Box>
        <Box sx={{ textAlign: { xs: "center", sm: "left" } }}>
          <Typography
            variant="h6"
            color="success.main"
            sx={{
              fontSize: { xs: 14, sm: 18 },
              textAlign: { xs: "center", sm: "left" },
            }}
          >
            Pagados
          </Typography>
          <Typography
            variant="h5"
            sx={{
              fontSize: { xs: 18, sm: 24 },
              textAlign: { xs: "left", sm: "left" },
            }}
          >
            {pagados}
          </Typography>
        </Box>
        <Box sx={{ textAlign: { xs: "center", sm: "left" } }}>
          <Typography
            variant="h6"
            color="warning.main"
            sx={{
              fontSize: { xs: 14, sm: 18 },
              textAlign: { xs: "center", sm: "left" },
            }}
          >
            Pendientes
          </Typography>
          <Typography
            variant="h5"
            sx={{
              fontSize: { xs: 18, sm: 24 },
              textAlign: { xs: "left", sm: "left" },
            }}
          >
            {pendientes}
          </Typography>
        </Box>
      </Box>

      {/* BOTONES SUPERIORES */}
      <Box display="flex" gap={2} mb={2}>
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
      {/* MODAL DE REPORTE SOLO PARA ADMIN */}
      {user?.email && adminEmail.includes(user.email) && (
        <Modal open={openReporte} onClose={() => setOpenReporte(false)}>
          <Paper
            sx={{
              maxWidth: 400,
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
              Reporte financiero del Congreso
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
              </Typography>
              <Typography variant="body1">
                <b>Monto pendiente:</b> $
                {montoPendiente.toLocaleString("de-DE", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </Typography>
              <Typography variant="body1" color="primary">
                <b>Total potencial:</b> $
                {montoTotal.toLocaleString("de-DE", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
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

      {/* FILTRO */}
      <TextField
        fullWidth
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
      />

      {/* FILTROS DE ORDENAMIENTO */}
      <Box display="flex" gap={2} mb={2} flexWrap="wrap">
        <TextField
          select
          label="Ordenar por"
          value={sortColumn}
          onChange={e => setSortColumn(e.target.value)}
          SelectProps={{ native: true }}
          size="small"
          sx={{ minWidth: 120 }}
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
          onChange={e => setSortDirection(e.target.value)}
          SelectProps={{ native: true }}
          size="small"
          sx={{ minWidth: 120 }}
        >
          <option value="asc">Ascendente</option>
          <option value="desc">Descendente</option>
        </TextField>
      </Box>
      {/* TABLA */}
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
              {/* <TableCell>Referencia/Zelle</TableCell> */}
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
