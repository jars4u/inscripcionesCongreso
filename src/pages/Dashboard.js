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
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import LogoutIcon from "@mui/icons-material/Logout";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { getAuth, signOut } from "firebase/auth";
import { getDocs, collection, deleteDoc, doc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { PieChart, Pie, Tooltip, ResponsiveContainer } from "recharts";

import { db } from "../firebase";
import { useAuth } from "../contexts/AuthContext";

export default function Dashboard() {
  const [data, setData] = useState([]);
  const [filtro, setFiltro] = useState("");
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
      // alert("Participante eliminado");
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
  const datosFiltrados = data.filter((p) =>
    (p.nombre + " " + p.apellido + " " + p.cedula)
      .toLowerCase()
      .includes(filtro.toLowerCase())
  );

  const totalParticipantes = data.length;
  const pagados = data.filter((p) => p.pago).length;
  const pendientes = totalParticipantes - pagados;

  const formasPagoData = [
    {
      name: "Pago móvil",
      value: data.filter((p) => p.formaPago === "Pago movil").length,
    },
    {
      name: "Efectivo",
      value: data.filter((p) => p.formaPago === "Efectivo").length,
    },
    {
      name: "Zelle",
      value: data.filter((p) => p.formaPago === "Zelle").length,
    },
  ].filter((f) => f.value > 0);

  return (
    <Container maxWidth="lg">
      <Box
        mt={5}
        mb={2}
        display="flex"
        justifyContent="space-between"
        alignItems="center"
      >
        <Typography variant="h4">Participantes Registrados</Typography>
        <Button
          variant="outlined"
          startIcon={<LogoutIcon />}
          onClick={handleLogout}
        >
          Cerrar sesión
        </Button>
      </Box>

      {/* RESUMEN NUMÉRICO */}
      <Box display="flex" gap={4} mb={4}>
        <Box>
          <Typography variant="h6">Total participantes</Typography>
          <Typography variant="h5">{totalParticipantes}</Typography>
        </Box>
        <Box>
          <Typography variant="h6" color="success.main">
            Pagados
          </Typography>
          <Typography variant="h5">{pagados}</Typography>
        </Box>
        <Box>
          <Typography variant="h6" color="warning.main">
            Pendientes
          </Typography>
          <Typography variant="h5">{pendientes}</Typography>
        </Box>
      </Box>

      {/* GRÁFICO DE FORMAS DE PAGO */}
      {/* {pagados > 0 && formasPagoData.length > 0 && (
        <Box mb={5} height={300}>
          <Typography variant="h6" gutterBottom>Formas de pago entre participantes que ya pagaron</Typography>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={formasPagoData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                fill="#1976d2"
                label
              />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Box>
      )} */}

      {/* BOTONES SUPERIORES */}
      <Box display="flex" gap={2} mb={2}>
        <Button variant="contained" onClick={() => navigate("/registrar")}>
          Registrar participante
        </Button>
        {user?.email && adminEmail.includes(user.email) && (
          <Button
            variant="outlined"
            color="secondary"
            onClick={() => navigate("/registrar-usuario")}
          >
            Registrar usuario
          </Button>
        )}
      </Box>

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

      {/* TABLA */}
      <Table>
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
              <TableCell>{p.edad ? p.edad : '-'}</TableCell>
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
              {/* <TableCell>
                {p.pago
                  ? (p.formaPago === "Pago movil"
                      ? p.referencia
                      : p.formaPago === "Zelle"
                      ? p.zelleInfo
                      : "-")
                  : "-"}
              </TableCell> */}
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
    </Container>
  );
}
