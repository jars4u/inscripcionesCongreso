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
  const [openPendientes, setOpenPendientes] = useState(false);
  // ...existing code...
  const [openExentos, setOpenExentos] = useState(false);
  const [data, setData] = useState([]);
  const [filtro, setFiltro] = useState("");
  const [openReporte, setOpenReporte] = useState(false);
  const [sortColumn, setSortColumn] = useState("nombre");
  const [sortDirection, setSortDirection] = useState("asc");

  // --- Estado para la tasa de cambio ---
  const [tasaBCV, setTasaBCV] = useState(() => {
    const stored = sessionStorage.getItem("tasaBCVManual");
    return stored ? parseFloat(stored) : null;
  });
  const [loadingTasa, setLoadingTasa] = useState(true);
  const [tasaManual, setTasaManual] = useState("");
  const [mostrarInputTasa, setMostrarInputTasa] = useState(false);

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
    setMostrarInputTasa(false);
    try {
      // Primer intento: pydolarve.org
      const response = await fetch(
        "https://pydolarve.org/api/v1/dollar?page=bcv&monitor=usd"
      );
      const data = await response.json();
      if (data && data.price) {
        setTasaBCV(data.price);
        console.log(
          "Tasa BCV utilizada (automática, pydolarve.org):",
          data.price
        );
        // Solo borro la tasa manual si la API responde correctamente Y no hay tasa manual activa
        if (!sessionStorage.getItem("tasaBCVManual")) {
          sessionStorage.removeItem("tasaBCVManual");
        }
      } else {
        throw new Error("No se obtuvo tasa del primer servicio");
      }
    } catch (error) {
      console.error("Error al obtener la tasa del BCV (pydolarve.org):", error);
      // Segundo intento: ve.dolarapi.com
      try {
        const resp2 = await fetch("https://ve.dolarapi.com/v1/dolares");
        const json2 = await resp2.json();
        // Buscar el objeto con fuente "oficial"
        const oficialObj = Array.isArray(json2)
          ? json2.find((d) => d.fuente === "oficial")
          : null;
        if (oficialObj && oficialObj.promedio) {
          setTasaBCV(oficialObj.promedio);
          console.log(
            "Tasa BCV utilizada (automática, ve.dolarapi.com):",
            oficialObj.promedio
          );
          if (!sessionStorage.getItem("tasaBCVManual")) {
            sessionStorage.removeItem("tasaBCVManual");
          }
        } else {
          // Si hay una tasa manual guardada, usarla
          const stored = sessionStorage.getItem("tasaBCVManual");
          if (stored) {
            setTasaBCV(parseFloat(stored));
            setMostrarInputTasa(false);
            console.log("Tasa BCV utilizada (manual):", stored);
          } else {
            setTasaBCV(null);
            setMostrarInputTasa(true);
          }
        }
      } catch (error2) {
        console.error(
          "Error al obtener la tasa del BCV (dolarapi.com):",
          error2
        );
        // Si hay una tasa manual guardada, usarla
        const stored = sessionStorage.getItem("tasaBCVManual");
        if (stored) {
          setTasaBCV(parseFloat(stored));
          setMostrarInputTasa(false);
          console.log("Tasa BCV utilizada (manual):", stored);
        } else {
          setTasaBCV(null);
          setMostrarInputTasa(true);
        }
      }
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
  const montoTotal = totalParticipantes * costoCongreso;
  // Lista de pendientes para el modal (ahora sí después de costoCongreso)
  const pendientesList = data.filter(
    (p) => !p.exento && (!p.pago || parseFloat(p.montoPagado) < costoCongreso)
  );
  // Suma de pagos y excedentes
  // Considerar pagados antiguos (p.pago === true y montoPagado vacío o 0)
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
  const montoExentos = exentos.length * costoCongreso;
  const montoExentosBs = montoExentos * (tasaBCV || 0);

  // Monto recaudado: suma de todos los abonos (pagos completos y abonos parciales) + pagados antiguos (8$ por cada uno), pero sin excedentes
  const montoRecaudadoSinExcedente = data.reduce((acc, p) => {
    if (p.pago && (!p.montoPagado || parseFloat(p.montoPagado) === 0)) {
      return acc + costoCongreso;
    }
    if (parseFloat(p.montoPagado) > costoCongreso) {
      return acc + costoCongreso;
    }
    // Suma pagos completos y abonos parciales
    return acc + (parseFloat(p.montoPagado) || 0);
  }, 0);
  const montoPagadoTotal = montoRecaudadoSinExcedente;
  const excedenteTotal = data.reduce(
    (acc, p) =>
      acc +
      (parseFloat(p.excedente) ||
        (parseFloat(p.montoPagado) > costoCongreso
          ? parseFloat(p.montoPagado) - costoCongreso
          : 0)),
    0
  );
  // El monto pendiente es solo el total de pendientes * costoCongreso
  const montoPendiente = pendientes * costoCongreso;
  const montoPendienteBs = montoPendiente * (tasaBCV || 0);
  const montoPagadoTotalBs = montoPagadoTotal * (tasaBCV || 0);
  const montoTotalAlcanzable = montoTotal - montoExentos;
  const montoTotalAlcanzableBs = montoTotalAlcanzable * (tasaBCV || 0);
  const montoTotalBs = montoTotal * (tasaBCV || 0);
  const excedenteTotalBs = excedenteTotal * (tasaBCV || 0);

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
        ) : mostrarInputTasa ? (
          <Box>
            <Typography variant="body2" color="error" sx={{ mb: 1 }}>
              No se pudo obtener la tasa automáticamente. Ingresa el valor
              manualmente:
            </Typography>
            <TextField
              label="Tasa BCV manual"
              type="number"
              value={tasaManual}
              onChange={(e) =>
                setTasaManual(e.target.value.replace(/[^0-9.]/g, ""))
              }
              size="small"
              sx={{ maxWidth: 180, mx: "auto" }}
              inputProps={{
                inputMode: "decimal",
                pattern: "[0-9.]*",
                step: "0.01",
                min: 0,
                style: { MozAppearance: "textfield" },
              }}
            />
            <Button
              variant="contained"
              color="primary"
              size="small"
              sx={{ mt: 1, ml: 1 }}
              disabled={!tasaManual}
              onClick={() => {
                setTasaBCV(parseFloat(tasaManual));
                sessionStorage.setItem("tasaBCVManual", tasaManual);
                setMostrarInputTasa(false);
                console.log("Tasa BCV utilizada (manual):", tasaManual);
              }}
            >
              Usar tasa
            </Button>
          </Box>
        ) : (
          <>
            <Typography variant="h5" color="primary.main">
              Bs.{" "}
              {tasaBCV
                ? tasaBCV.toLocaleString("de-DE", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })
                : "No disponible"}
            </Typography>
            {sessionStorage.getItem("tasaBCVManual") &&
              tasaBCV ===
                parseFloat(sessionStorage.getItem("tasaBCVManual")) && (
                <Typography
                  variant="caption"
                  color="warning.main"
                  sx={{ display: "block", mt: 1 }}
                >
                  Usando tasa BCV manual ingresada por el usuario durante esta
                  sesión.
                </Typography>
              )}
          </>
        )}
        <Typography variant="caption" color="text.secondary">
          Fuente: Banco Central de Venezuela (BCV)
        </Typography>
      </Box>

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
        {user?.email && adminEmail.includes(user.email) && (
          <>
            <Button
              variant="outlined"
              color="primary"
              onClick={() => setOpenReporte(true)}
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

      {/* --- MODAL ACTUALIZADO con montos en Bs. y excedente --- */}
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
              <Typography variant="body1" sx={{ color: "#616161" }}>
                <b>Exentos:</b> {exentos.length}
                {exentos.length > 0 && (
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    component="span"
                    sx={{ marginLeft: 1 }}
                  >
                    (Déficit: $
                    {montoExentos.toLocaleString("de-DE", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                    <span style={{ color: "#616161", marginLeft: 4 }}>
                      Bs.{" "}
                      {montoExentosBs.toLocaleString("de-DE", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                    )
                  </Typography>
                )}
              </Typography>
            </Box>
            <Divider sx={{ mb: 2 }} />
            <Box mb={2}>
              <Typography variant="body1">
                <b>Monto recaudado (total abonos):</b> $
                {montoPagadoTotal.toLocaleString("de-DE", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
                <br />
                <Typography variant="caption" color="text.secondary">
                  (Bs.{" "}
                  {montoPagadoTotalBs.toLocaleString("de-DE", {
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
                  {montoExentos > 0 && (
                    <span style={{ color: "#616161", marginLeft: 8 }}>
                      Déficit por exentos: $
                      {montoExentos.toLocaleString("de-DE", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                      (Bs.{" "}
                      {montoExentosBs.toLocaleString("de-DE", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                      )
                    </span>
                  )}
                </Typography>
              </Typography>
              <Typography variant="body1" color="primary">
                <b>Total potencial:</b> $
                {montoTotalAlcanzable.toLocaleString("de-DE", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
                <br />
                <Typography variant="caption" color="text.secondary">
                  (Bs.{" "}
                  {montoTotalAlcanzableBs.toLocaleString("de-DE", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                  )
                  {montoExentos > 0 && (
                    <span style={{ color: "#616161", marginLeft: 8 }}>
                      Menos déficit por exentos: $
                      {montoExentos.toLocaleString("de-DE", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                      (Bs.{" "}
                      {montoExentosBs.toLocaleString("de-DE", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                      )
                    </span>
                  )}
                </Typography>
              </Typography>
              <Typography variant="body1" color="success.main">
                <b>Recaudado con excedente:</b> $
                {(montoPagadoTotal + excedenteTotal).toLocaleString("de-DE", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
                <span style={{ color: "#1976d2", fontWeight: "normal" }}>
                  {" "}
                  ( +
                  {excedenteTotal.toLocaleString("de-DE", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}{" "}
                  )
                </span>
                <br />
                <Typography variant="caption" color="text.secondary">
                  (Bs.{" "}
                  {(montoPagadoTotalBs + excedenteTotalBs).toLocaleString(
                    "de-DE",
                    {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    }
                  )}
                  <span style={{ color: "#1976d2", fontWeight: "normal" }}>
                    {" "}
                    ( +
                    {excedenteTotalBs.toLocaleString("de-DE", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{" "}
                    )
                  </span>
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
