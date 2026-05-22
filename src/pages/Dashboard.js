import React, { useState, useEffect } from "react";
import {
  Container,
  Box,
  Typography,
  Button,
  Alert,
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
  const [openPendientes, setOpenPendientes] = useState(false);
  // ...existing code...
  const [openExentos, setOpenExentos] = useState(false);
  const [data, setData] = useState([]);
  const [dataError, setDataError] = useState("");
  const [filtro, setFiltro] = useState("");
  const [sortColumn, setSortColumn] = useState("nombre");
  const [sortDirection, setSortDirection] = useState("asc");

  const navigate = useNavigate();
  const auth = getAuth();
  const { user, isAdmin } = useAuth();

  const cargarDatos = async () => {
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
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

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
  // ...existing code...

  const totalParticipantes = data.length;
  const costoCongreso = 8;
  const pendientesList = data.filter(
    (p) => !p.exento && (!p.pago || parseFloat(p.montoPagado) < costoCongreso)
  );
  const exentos = data.filter((p) => p.exento);
  const pagadosAntiguos = data.filter(
    (p) =>
      p.pago && (!p.montoPagado || parseFloat(p.montoPagado) === 0) && !p.exento
  );
  const pagadosNuevos = data.filter(
    (p) => parseFloat(p.montoPagado) === costoCongreso && !p.exento
  );
  const pagadosExcedente = data.filter(
    (p) => parseFloat(p.montoPagado) > costoCongreso && !p.exento
  );
  const pagados =
    pagadosAntiguos.length + pagadosNuevos.length + pagadosExcedente.length;
  const pendientes = data.filter(
    (p) => !p.exento && (!p.pago || parseFloat(p.montoPagado) < costoCongreso)
  ).length;

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

      {dataError && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {dataError}
        </Alert>
      )}

      <Box
        display="flex"
        my={{ xs: 2, sm: 4 }}
        flexDirection={{ xs: "column", sm: "row" }}
        justifyContent="center"
        alignItems={{ xs: "center", sm: "center" }}
        sx={{ whiteSpace: { xs: "normal", sm: "nowrap" }, overflowX: "auto" }}
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
          sx={{
            fontSize: { xs: 14, sm: 18 },
            fontWeight: "bold",
            cursor: pendientes > 0 ? "pointer" : "default",
            textDecoration: pendientes > 0 ? "underline" : "none",
          }}
          onClick={() => pendientes > 0 && setOpenPendientes(true)}
        >
          Pendientes:
          <span style={{ fontWeight: "normal", marginLeft: 6 }}>
            {pendientes}
          </span>
        </Typography>
        {/* Modal para mostrar los nombres de los pendientes */}
        <Modal open={openPendientes} onClose={() => setOpenPendientes(false)}>
          <Paper
            sx={{
              maxWidth: 400,
              mx: "auto",
              mt: 10,
              p: 3,
              borderRadius: 2,
              boxShadow: 6,
            }}
          >
            <Typography
              variant="h6"
              fontWeight="bold"
              gutterBottom
              color="warning.main"
            >
              Participantes Pendientes
            </Typography>
            <Divider sx={{ mb: 2 }} />
            {pendientesList.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No hay participantes pendientes.
              </Typography>
            ) : (
              <Box sx={{ maxHeight: 300, overflowY: "auto", mb: 2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Nombre</TableCell>
                      <TableCell>Apellido</TableCell>
                      <TableCell>Teléfono</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {pendientesList
                      .slice()
                      .sort((a, b) => (a.nombre || "").localeCompare(b.nombre || ""))
                      .map((p, idx) => (
                        <TableRow key={p.id || idx}>
                          <TableCell>{p.nombre}</TableCell>
                          <TableCell>{p.apellido}</TableCell>
                          <TableCell>{p.telefono}</TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </Box>
            )}
            <Button
              variant="contained"
              color="primary"
              fullWidth
              sx={{ mt: 2 }}
              onClick={() => setOpenPendientes(false)}
            >
              Cerrar
            </Button>
          </Paper>
        </Modal>
        <Divider orientation="vertical" flexItem sx={{ mx: 2 }} />
        <Typography
          variant="h6"
          color="text.secondary"
          sx={{
            fontSize: { xs: 14, sm: 18 },
            fontWeight: "bold",
            cursor: "pointer",
            textDecoration: exentos.length > 0 ? "underline" : "none",
          }}
          onClick={() => exentos.length > 0 && setOpenExentos(true)}
        >
          Exentos:
          <span style={{ fontWeight: "normal", marginLeft: 6 }}>
            {exentos.length}
          </span>
        </Typography>
        {/* Modal para mostrar los nombres de los exentos */}
        <Modal open={openExentos} onClose={() => setOpenExentos(false)}>
          <Paper
            sx={{
              maxWidth: 400,
              mx: "auto",
              mt: 10,
              p: 3,
              borderRadius: 2,
              boxShadow: 6,
            }}
          >
            <Typography
              variant="h6"
              fontWeight="bold"
              gutterBottom
              color="text.secondary"
            >
              Participantes Exentos
            </Typography>
            <Divider sx={{ mb: 2 }} />
            {exentos.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No hay participantes exentos.
              </Typography>
            ) : (
              <Box sx={{ maxHeight: 300, overflowY: "auto", mb: 2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Nombre</TableCell>
                      <TableCell>Apellido</TableCell>
                      <TableCell>Teléfono</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {exentos
                      .slice() // copia para no mutar el array original
                      .sort((a, b) => (a.nombre || "").localeCompare(b.nombre || ""))
                      .map((p, idx) => (
                        <TableRow key={p.id || idx}>
                          <TableCell>{p.nombre}</TableCell>
                          <TableCell>{p.apellido}</TableCell>
                          <TableCell>{p.telefono}</TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </Box>
            )}
            <Button
              variant="contained"
              color="primary"
              fullWidth
              sx={{ mt: 2 }}
              onClick={() => setOpenExentos(false)}
            >
              Cerrar
            </Button>
          </Paper>
        </Modal>
      </Box>

      <Box
        display="flex"
        gap={2}
        mb={2}
        justifyContent="center"
        alignItems="center"
        sx={{ mx: { xs: 1, sm: 4 } }}
      >
        <Button
          variant="contained"
          onClick={() => navigate("/registrar")}
          sx={{
            fontSize: { xs: 11, sm: 14 },
            minWidth: 100,
            py: { xs: 0.5, sm: 0.8 },
            px: { xs: 1, sm: 2 },
            mx: 0.5,
          }}
        >
          Registrar participante
        </Button>
        {isAdmin && (
          <>
            <Button
              variant="outlined"
              color="primary"
              onClick={() => navigate("/reporte-financiero")}
              sx={{
                fontSize: { xs: 11, sm: 14 },
                minWidth: 100,
                py: { xs: 0.5, sm: 0.8 },
                px: { xs: 1, sm: 2 },
                mx: 0.5,
              }}
            >
              Ver reporte financiero
            </Button>
            <Button
              variant="outlined"
              color="secondary"
              onClick={() => navigate("/registrar-usuario")}
              sx={{
                fontSize: { xs: 11, sm: 14 },
                minWidth: 100,
                py: { xs: 0.5, sm: 0.8 },
                px: { xs: 1, sm: 2 },
                mx: 0.5,
              }}
            >
              Registrar usuario
            </Button>
          </>
        )}
      </Box>

      <Box
        display="flex"
        gap={2}
        mb={2}
        pt={2}
        flexWrap="nowrap"
        alignItems="flex-start"
        width="100%"
      >
        <TextField
          label="Buscar por nombre, apellido o cédula"
          value={filtro}
          size="small"
          onChange={(e) => setFiltro(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
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
                  <span className="material-icons" style={{ fontSize: 20 }}>
                    x
                  </span>
                </IconButton>
              </InputAdornment>
            ) : null,
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
              <TableCell>Estado</TableCell>
              <TableCell>Pago</TableCell>
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
                  {(() => {
                    const monto = parseFloat(p.montoPagado) || 0;
                    if (p.exento) {
                      return (
                        <Chip
                          label="Exento"
                          sx={{ backgroundColor: "#9b70d7ff", color: "#ffffffff" }}
                        />
                      );
                    }
                    // Si el registro tiene el campo pago en true y no tiene montoPagado, es un pagado antiguo
                    if (p.pago && (!p.montoPagado || monto === 0)) {
                      return <Chip label="Pagado" color="success" />;
                    }
                    if (monto === 0) {
                      return (
                        <Chip
                          label={`Pendiente $${costoCongreso.toFixed(2)}`}
                          color="warning"
                        />
                      );
                    }
                    if (monto < costoCongreso) {
                      return (
                        <Chip
                          label={`Pendiente $${(costoCongreso - monto).toFixed(
                            2
                          )}`}
                          color="warning"
                        />
                      );
                    }
                    if (monto === costoCongreso) {
                      return <Chip label="Pagado" color="success" />;
                    }
                    if (monto > costoCongreso) {
                      return (
                        <Chip
                          label={`Pagado +$${(monto - costoCongreso).toFixed(
                            2
                          )}`}
                          color="info"
                        />
                      );
                    }
                  })()}
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
