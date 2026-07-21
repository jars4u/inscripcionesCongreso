import React from "react";
import {
  Box,
  Button,
  MenuItem,
  Paper,
  TextField,
  Typography,
} from "@mui/material";

const statusOptions = [
  { value: "todos", label: "Todos" },
  { value: "pagado", label: "Pagado" },
  { value: "abonado", label: "Abonado" },
  { value: "pendiente", label: "Pendiente" },
  { value: "exento", label: "Exento" },
];

const toggleOptions = [
  { value: "todos", label: "Todos" },
  { value: "si", label: "Si" },
  { value: "no", label: "No" },
];

const renderSelectOptions = (items) => [
  <MenuItem key="todos" value="todos">
    Todos
  </MenuItem>,
  ...items.map((item) => (
    <MenuItem key={item} value={item}>
      {item}
    </MenuItem>
  )),
];

export default function ParticipantReportFilters({
  filters,
  options,
  onChange,
  onReset,
  surfaceSx,
  resultCount,
}) {
  const updateField = (field) => (event) => {
    onChange({ ...filters, [field]: event.target.value });
  };

  const fieldSx = {
    minWidth: 0,
    width: "100%",
    maxWidth: "100%",
    "& .MuiInputBase-root": {
      minWidth: 0,
    },
  };

  return (
    <Paper sx={{ ...surfaceSx, p: { xs: 1.5, md: 2.5 }, width: "100%", maxWidth: "100%", overflow: "hidden" }}>
      <Box
        display="flex"
        flexDirection={{ xs: "column", md: "row" }}
        justifyContent="space-between"
        gap={2}
        sx={{ minWidth: 0 }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="overline" color="text.secondary">
            Filtros de lista
          </Typography>
          <Typography variant="h6" sx={{ mt: 0.5 }}>
            Configura el documento antes de exportar
          </Typography>
        </Box>
        <Box textAlign={{ xs: "left", md: "right" }}>
          <Typography variant="body2" color="text.secondary">
            {resultCount} registros coinciden con la configuracion actual.
          </Typography>
          <Button sx={{ mt: 1 }} variant="text" onClick={onReset}>
            Limpiar filtros
          </Button>
        </Box>
      </Box>

      <Box
        sx={{
          mt: 2,
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            md: "repeat(2, minmax(0, 1fr))",
            xl: "repeat(3, minmax(0, 1fr))",
          },
          gap: 1.5,
          width: "100%",
          maxWidth: "100%",
          minWidth: 0,
        }}
      >
        <TextField
          label="Buscar"
          placeholder="Nombre, cedula, telefono, email"
          value={filters.search}
          onChange={updateField("search")}
          size="small"
          fullWidth
          sx={fieldSx}
        />
        <TextField
          select
          label="Estado de pago"
          value={filters.statusFilter}
          onChange={updateField("statusFilter")}
          size="small"
          fullWidth
          sx={fieldSx}
        >
          {statusOptions.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label="Tipo de registro"
          value={filters.tipoFilter}
          onChange={updateField("tipoFilter")}
          size="small"
          fullWidth
          sx={fieldSx}
        >
          {renderSelectOptions(options.tiposRegistro || [])}
        </TextField>
        <TextField
          select
          label="Exento"
          value={filters.exentoFilter}
          onChange={updateField("exentoFilter")}
          size="small"
          fullWidth
          sx={fieldSx}
        >
          {toggleOptions.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          label="Edad minima"
          type="number"
          value={filters.minAge}
          onChange={updateField("minAge")}
          size="small"
          fullWidth
          sx={fieldSx}
        />
        <TextField
          label="Edad maxima"
          type="number"
          value={filters.maxAge}
          onChange={updateField("maxAge")}
          size="small"
          fullWidth
          sx={fieldSx}
        />
        <TextField
          select
          label="Talla"
          value={filters.talla}
          onChange={updateField("talla")}
          size="small"
          fullWidth
          sx={fieldSx}
        >
          {renderSelectOptions(options.tallas || [])}
        </TextField>
        <TextField
          select
          label="Iglesia"
          value={filters.afiliacion}
          onChange={updateField("afiliacion")}
          size="small"
          fullWidth
          sx={fieldSx}
        >
          {renderSelectOptions(options.afiliaciones || [])}
        </TextField>
        <TextField
          select
          label="Municipio"
          value={filters.municipio}
          onChange={updateField("municipio")}
          size="small"
          fullWidth
          sx={fieldSx}
        >
          {renderSelectOptions(options.municipios || [])}
        </TextField>
        <TextField
          select
          label="Zona"
          value={filters.zona}
          onChange={updateField("zona")}
          size="small"
          fullWidth
          sx={fieldSx}
        >
          {renderSelectOptions(options.zonas || [])}
        </TextField>
        <TextField
          select
          label="Medicamento dependiente"
          value={filters.campMedicamento}
          onChange={updateField("campMedicamento")}
          size="small"
          fullWidth
          sx={fieldSx}
        >
          {toggleOptions.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label="Alergia a alimentos"
          value={filters.campAlergiaAlimento}
          onChange={updateField("campAlergiaAlimento")}
          size="small"
          fullWidth
          sx={fieldSx}
        >
          {toggleOptions.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label="Alergia a medicamentos"
          value={filters.campAlergiaMedicamento}
          onChange={updateField("campAlergiaMedicamento")}
          size="small"
          fullWidth
          sx={fieldSx}
        >
          {toggleOptions.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label="Enfermedad"
          value={filters.campEnfermedad}
          onChange={updateField("campEnfermedad")}
          size="small"
          fullWidth
          sx={fieldSx}
        >
          {toggleOptions.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label="Actividad fisica"
          value={filters.campActividad}
          onChange={updateField("campActividad")}
          size="small"
          fullWidth
          sx={fieldSx}
        >
          {toggleOptions.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </TextField>
      </Box>
    </Paper>
  );
}