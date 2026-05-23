import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Container,
  Divider,
  FormControlLabel,
  IconButton,
  MenuItem,
  Paper,
  TextField,
  Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import PaymentsOutlinedIcon from "@mui/icons-material/PaymentsOutlined";
import SettingsSuggestOutlinedIcon from "@mui/icons-material/SettingsSuggestOutlined";
import AddIcon from "@mui/icons-material/Add";
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";
import TuneOutlinedIcon from "@mui/icons-material/TuneOutlined";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import {
  DEFAULT_APP_CONFIG,
  getAppConfig,
  normalizeConfig,
  saveAppConfig,
} from "../utils/paymentConfig";
import { collection, doc, getDocs, onSnapshot, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

const surfaceSx = {
  backgroundColor: "#FFFFFF",
  border: "1px solid #D8D1C2",
  borderRadius: 0,
  boxShadow: "none",
};

const sectionIconSx = {
  width: 42,
  height: 42,
  border: "1px solid #D8D1C2",
  color: "primary.main",
  backgroundColor: "#F7F3E8",
};

export default function Configuration() {
  const navigate = useNavigate();
  const { isAdmin, loading: authLoading, user } = useAuth();

  const [config, setConfig] = useState(DEFAULT_APP_CONFIG);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isDirty, setIsDirty] = useState(false);
  const [usersList, setUsersList] = useState([]);
  const [adminsSet, setAdminsSet] = useState(new Set());

  useEffect(() => {
    let cancelled = false;

    const loadConfig = async () => {
      if (!isAdmin) {
        setLoadingConfig(false);
        return;
      }

      try {
        setLoadingConfig(true);
        setError("");
        const nextConfig = await getAppConfig();

        if (!cancelled) {
          setConfig(nextConfig);
          setIsDirty(false);
        }
      } catch (loadError) {
        if (!cancelled) {
          console.error("Error loading config:", loadError);
          setError(`No se pudo cargar la configuración: ${loadError?.message || String(loadError)}`);
        }
      } finally {
        if (!cancelled) {
          setLoadingConfig(false);
        }
      }
    };

    if (!authLoading) {
      loadConfig();
    }

    return () => {
      cancelled = true;
    };
  }, [authLoading, isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;

    // Suscribirse a usuarios en tiempo real
    const usuariosCol = collection(db, 'usuarios');
    const unsubscribeUsers = onSnapshot(usuariosCol, (snap) => {
      const next = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setUsersList(next);
    }, (err) => {
      console.error('usuarios onSnapshot error:', err);
    });

    // Leer admins actuales
    (async () => {
      try {
        const adminsSnap = await getDocs(collection(db, 'admins'));
        const s = new Set(adminsSnap.docs.map((d) => d.id));
        setAdminsSet(s);
      } catch (err) {
        console.error('error loading admins:', err);
      }
    })();

    return () => {
      unsubscribeUsers();
    };
  }, [isAdmin]);

  const handleCostChange = (value) => {
    setConfig((currentConfig) => ({
      ...currentConfig,
      costos: {
        ...currentConfig.costos,
        eventoUsd: value,
      },
    }));
  };

  // marcar dirty al cambiar costos
  const markDirty = () => setIsDirty(true);

  const handleMethodChange = (index, field, value) => {
    setConfig((currentConfig) => ({
      ...currentConfig,
      pagos: {
        ...currentConfig.pagos,
        formas: currentConfig.pagos.formas.map((method, methodIndex) =>
          methodIndex === index ? { ...method, [field]: value } : method
        ),
      },
    }));
    markDirty();
  };

  const handleAddMethod = () => {
    setConfig((currentConfig) => ({
      ...currentConfig,
      pagos: {
        ...currentConfig.pagos,
        formas: [
          ...currentConfig.pagos.formas,
          {
            id: `forma-${currentConfig.pagos.formas.length + 1}`,
            nombre: "",
            divisa: "$",
            activa: true,
            requiereReferencia: false,
            requiereZelleInfo: false,
          },
        ],
      },
    }));
    markDirty();
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError("");
      setSuccess("");
      const normalized = normalizeConfig({
        ...config,
        costos: {
          ...config.costos,
          eventoUsd: Number(config.costos.eventoUsd) || DEFAULT_APP_CONFIG.costos.eventoUsd,
        },
      });

      const saved = await saveAppConfig(normalized);
      setConfig(saved);
      setIsDirty(false);
      setSuccess("Configuración guardada correctamente.");
    } catch (saveError) {
      console.error("Error saving config:", saveError);
      setError(`No se pudo guardar la configuración: ${saveError?.message || String(saveError)}`);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleAdmin = async (uid, makeAdmin) => {
    try {
      setError('');
      setSuccess('');

      if (makeAdmin) {
        await setDoc(doc(db, 'admins', uid), {
          grantedBy: (user && user.uid) || null,
          grantedAt: serverTimestamp(),
        });
        setAdminsSet((prev) => new Set(prev).add(uid));
        setSuccess('Privilegio de administrador concedido.');
      } else {
        if (user && user.uid === uid) {
          setError('No puedes revocar tu propio rol de administrador desde aquí.');
          return;
        }
        await deleteDoc(doc(db, 'admins', uid));
        setAdminsSet((prev) => {
          const copy = new Set(prev);
          copy.delete(uid);
          return copy;
        });
        setSuccess('Privilegio de administrador revocado.');
      }
    } catch (err) {
      console.error('Error toggling admin:', err);
      setError(`No se pudo actualizar rol de admin: ${err?.message || String(err)}`);
    }
  };

  if (authLoading || loadingConfig) {
    return (
      <Container maxWidth="lg" sx={{ py: { xs: 2, md: 4 } }}>
        <Paper sx={{ ...surfaceSx, p: 4, textAlign: "center" }}>
          <Typography variant="h6">Cargando configuración...</Typography>
        </Paper>
      </Container>
    );
  }

  if (!isAdmin) {
    return (
      <Container maxWidth="sm" sx={{ py: { xs: 2, md: 4 } }}>
        <Paper sx={{ ...surfaceSx, p: 4 }}>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            Acceso restringido
          </Typography>
          <Alert severity="warning" sx={{ mt: 2, borderRadius: 0 }}>
            Solo administradores pueden editar la configuración global.
          </Alert>
          <Button
            variant="contained"
            startIcon={<ArrowBackIcon />}
            sx={{ mt: 3 }}
            onClick={() => navigate("/dashboard")}
          >
            Volver al dashboard
          </Button>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 1.5, md: 4 } }}>
      <Box display="grid" gap={2}>
        <Paper sx={{ ...surfaceSx, p: { xs: 1.5, md: 3.5 } }}>
          <Box
            display="flex"
            flexDirection={{ xs: "column", md: "row" }}
            justifyContent="space-between"
            gap={2}
          >
            <Box>
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <IconButton
                  aria-label="Volver al dashboard"
                  onClick={() => navigate("/dashboard")}
                  sx={{ border: "1px solid #D8D1C2" }}
                >
                  <ArrowBackIcon />
                </IconButton>
                <Typography variant="overline" sx={{ color: "primary.main", letterSpacing: "0.12em" }}>
                  Configuración
                </Typography>
              </Box>
              <Typography variant="h3" sx={{ fontSize: { xs: 28, md: 40 } }}>
                Reglas globales
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mt: 1, maxWidth: 640 }}>
                Centraliza costos y catálogo de cobro para que dashboard, registro, edición y reportes usen la misma base.
              </Typography>
            </Box>

            <Paper sx={{ ...surfaceSx, p: { xs: 1.5, md: 2 }, minWidth: { xs: "100%", md: 280 }, backgroundColor: "#F7F3E8" }}>
              <Typography variant="overline" color="text.secondary">
                Alcance actual
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Primera sección activa: costos y formas de pago.
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
                Cada nueva sección seguirá el mismo patrón con icono y divisor.
              </Typography>
            </Paper>
          </Box>
        </Paper>

        {error && (
          <Alert severity="error" sx={{ borderRadius: 0 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ borderRadius: 0 }}>
            {success}
          </Alert>
        )}

        <Paper sx={{ ...surfaceSx, p: { xs: 1.5, md: 3 } }}>
          <Box display="flex" alignItems="center" justifyContent="space-between" gap={1.5}>
            <Box display="flex" alignItems="center" gap={1.5}>
              <Box sx={{ ...sectionIconSx, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <SettingsSuggestOutlinedIcon fontSize="small" />
              </Box>
              <Box>
                <Typography variant="h5">Costos</Typography>
              </Box>
            </Box>
            <Box>
              <Button
                variant="contained"
                startIcon={<SaveOutlinedIcon />}
                onClick={handleSave}
                disabled={saving || !isDirty}
              >
                {saving ? "Guardando..." : "Guardar cambios"}
              </Button>
            </Box>
          </Box>

          <Divider sx={{ my: { xs: 2, md: 2.5 } }} />

          <Box display="grid" gap={2.5}>
            <Box display="grid" gap={1.5}>
              <Box display="flex" alignItems="center" gap={1.5}>
                <Box sx={{ ...sectionIconSx, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <AttachMoneyIcon fontSize="small" />
                </Box>
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                    Costo del evento
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Valor base usado para cobranza, dashboard y reportes.
                  </Typography>
                </Box>
              </Box>
              <TextField
                label="Costo del evento en USD"
                type="number"
                value={config.costos.eventoUsd}
                onChange={(event) => { handleCostChange(event.target.value); markDirty(); }}
                inputProps={{ min: 0, step: "0.01" }}
                sx={{ maxWidth: 280 }}
              />
            </Box>

            <Divider />

            <Box display="grid" gap={1.5}>
              <Box display="flex" alignItems="center" gap={1.5}>
                <Box sx={{ ...sectionIconSx, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <PaymentsOutlinedIcon fontSize="small" />
                </Box>
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                    Formas de pago
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Crea el catálogo reutilizable y define la divisa principal de cada forma.
                  </Typography>
                </Box>
              </Box>

              <Box display="grid" gap={1}>
                {config.pagos.formas.map((method, index) => (
                  <Paper
                    key={`${method.id}-${index}`}
                    sx={{ ...surfaceSx, p: { xs: 1.25, md: 1.5 }, backgroundColor: "#FFFDFC" }}
                  >
                    <Box
                      sx={{
                        display: "grid",
                        gridTemplateColumns: { xs: "1fr", md: "minmax(0, 1fr) 96px 96px minmax(0, 260px)", lg: "minmax(0, 1fr) 100px 96px minmax(0, 300px)" },
                        gap: 1,
                        alignItems: "center",
                      }}
                    >
                      <TextField
                        fullWidth
                        label="Nombre"
                        value={method.nombre}
                        onChange={(event) => handleMethodChange(index, "nombre", event.target.value)}
                      />
                      <TextField
                        fullWidth
                        select
                        label="Divisa"
                        value={method.divisa}
                        onChange={(event) => handleMethodChange(index, "divisa", event.target.value)}
                      >
                        <MenuItem value="$">$</MenuItem>
                        <MenuItem value="bs">Bs</MenuItem>
                      </TextField>
                      <TextField
                        fullWidth
                        select
                        label="Estado"
                        value={method.activa ? "activa" : "inactiva"}
                        onChange={(event) => handleMethodChange(index, "activa", event.target.value === "activa")}
                      >
                        <MenuItem value="activa">Activa</MenuItem>
                        <MenuItem value="inactiva">Inactiva</MenuItem>
                      </TextField>

                      <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', flexWrap: 'nowrap', justifyContent: 'flex-start', width: '100%' }}>
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={Boolean(method.requiereReferencia)}
                              onChange={(event) =>
                                handleMethodChange(index, "requiereReferencia", event.target.checked)
                              }
                            />
                          }
                          label="Referencia"
                          sx={{ ...surfaceSx, m: 0, px: 0.5, py: 0.25, fontSize: 12 }}
                        />
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={Boolean(method.requiereZelleInfo)}
                              onChange={(event) =>
                                handleMethodChange(index, "requiereZelleInfo", event.target.checked)
                              }
                            />
                          }
                          label="Confirmación"
                          sx={{ ...surfaceSx, m: 0, px: 0.5, py: 0.25, fontSize: 12 }}
                        />
                      </Box>
                    </Box>
                    <Box display="flex" alignItems="center" gap={1} mt={1.25}>
                      <TuneOutlinedIcon sx={{ fontSize: 18, color: "text.secondary" }} />
                      <Typography variant="caption" color="text.secondary">
                        Controla aquí si la forma debe pedir referencia o detalle de confirmación en registro y edición.
                      </Typography>
                    </Box>
                  </Paper>
                ))}
              </Box>

              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={handleAddMethod}
                sx={{ alignSelf: "flex-start", width: { xs: "100%", sm: "auto" } }}
              >
                Agregar forma de pago
              </Button>
            </Box>
          </Box>
        </Paper>

        

        {/* Sección Usuarios */}
        <Paper sx={{ ...surfaceSx, p: { xs: 1.5, md: 3 } }}>
          <Box display="flex" alignItems="center" gap={1.5} mb={1}>
            <Box sx={{ ...sectionIconSx, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <SettingsSuggestOutlinedIcon fontSize="small" />
            </Box>
            <Box>
              <Typography variant="h5">Gestión de usuarios</Typography>
            </Box>
          </Box>

          <Divider sx={{ my: 2 }} />

          <Box>
            <Typography variant="body2" color="text.secondary" mb={1}>
              Lista de usuarios registrados. Aquí puedes conceder o revocar permisos de administrador.
            </Typography>

            <Box>
              {usersList.length === 0 ? (
                <Typography variant="body2" color="text.secondary">No hay usuarios registrados.</Typography>
              ) : (
                <Box display="grid" gap={1}>
                  {usersList.map((u) => (
                    <Paper key={u.id} sx={{ ...surfaceSx, p: 1 }}>
                      <Box display="flex" alignItems="center" justifyContent="space-between">
                        <Box>
                          <Typography sx={{ fontWeight: 700 }}>{u.email}</Typography>
                          <Typography variant="caption" color="text.secondary">{u.id} — {u.createdAt?.toDate ? new Date(u.createdAt.toDate()).toLocaleString() : ''}</Typography>
                        </Box>
                        <Box>
                          <Button
                            variant={adminsSet.has(u.id) ? 'contained' : 'outlined'}
                            color={adminsSet.has(u.id) ? 'primary' : 'inherit'}
                            onClick={() => handleToggleAdmin(u.id, !adminsSet.has(u.id))}
                            disabled={user && user.uid === u.id}
                          >
                            {adminsSet.has(u.id) ? 'Administrador' : 'Conceder admin'}
                          </Button>
                        </Box>
                      </Box>
                    </Paper>
                  ))}
                </Box>
              )}
            </Box>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
}