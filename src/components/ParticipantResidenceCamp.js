import React from "react";
import { Paper, Box, Typography, TextField, FormControlLabel, Checkbox } from "@mui/material";

export default function ParticipantResidenceCamp({ participant, setParticipant, surfaceSx }) {
  return (
    <>
      <Paper sx={{ ...surfaceSx, p: { xs: 1.5, md: 3 } }}>
        <Typography id="residencia-title" variant="overline" color="text.secondary" sx={{ fontSize: 18, fontWeight: "bold" }}   >
          Residencia
        </Typography>
        <Box role="group" aria-labelledby="residencia-title" sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" }, gap: { xs: 1.5, md: 2 } }}>
          <TextField placeholder="ZONA (EJ. CENTRO)" fullWidth label="Zona" value={participant.residencia?.zona || ""} onChange={e => setParticipant({ ...participant, residencia: { ...participant.residencia, zona: e.target.value.toUpperCase() } })} margin="normal" inputProps={{ 'aria-label': 'Zona', style: { textTransform: 'uppercase' } }} />
          <TextField placeholder="MUNICIPIO" fullWidth label="Municipio" value={participant.residencia?.municipio || ""} onChange={e => setParticipant({ ...participant, residencia: { ...participant.residencia, municipio: e.target.value.toUpperCase() } })} margin="normal" inputProps={{ 'aria-label': 'Municipio', style: { textTransform: 'uppercase' } }} />
          <TextField placeholder="PARROQUIA" fullWidth label="Parroquia" value={participant.residencia?.parroquia || ""} onChange={e => setParticipant({ ...participant, residencia: { ...participant.residencia, parroquia: e.target.value.toUpperCase() } })} margin="normal" inputProps={{ 'aria-label': 'Parroquia', style: { textTransform: 'uppercase' } }} />
          <TextField placeholder="SECTOR" fullWidth label="Sector" value={participant.residencia?.sector || ""} onChange={e => setParticipant({ ...participant, residencia: { ...participant.residencia, sector: e.target.value.toUpperCase() } })} margin="normal" inputProps={{ 'aria-label': 'Sector', style: { textTransform: 'uppercase' } }} />
          <TextField placeholder="CALLE" fullWidth label="Calle" value={participant.residencia?.calle || ""} onChange={e => setParticipant({ ...participant, residencia: { ...participant.residencia, calle: e.target.value.toUpperCase() } })} margin="normal" inputProps={{ 'aria-label': 'Calle', style: { textTransform: 'uppercase' } }} />
          <TextField placeholder="AVENIDA" fullWidth label="Avenida" value={participant.residencia?.avenida || ""} onChange={e => setParticipant({ ...participant, residencia: { ...participant.residencia, avenida: e.target.value.toUpperCase() } })} margin="normal" inputProps={{ 'aria-label': 'Avenida', style: { textTransform: 'uppercase' } }} />
          <TextField placeholder="URBANIZACIÓN" fullWidth label="Urbanización" value={participant.residencia?.urbanizacion || ""} onChange={e => setParticipant({ ...participant, residencia: { ...participant.residencia, urbanizacion: e.target.value.toUpperCase() } })} margin="normal" inputProps={{ 'aria-label': 'Urbanización', style: { textTransform: 'uppercase' } }} />
          <TextField placeholder="BARRIO" fullWidth label="Barrio" value={participant.residencia?.barrio || ""} onChange={e => setParticipant({ ...participant, residencia: { ...participant.residencia, barrio: e.target.value.toUpperCase() } })} margin="normal" inputProps={{ 'aria-label': 'Barrio', style: { textTransform: 'uppercase' } }} />
          <TextField placeholder="Número" fullWidth label="Nro. casa" value={participant.residencia?.nroCasa || ""} onChange={e => setParticipant({ ...participant, residencia: { ...participant.residencia, nroCasa: e.target.value } })} margin="normal" inputProps={{ 'aria-label': 'Nro. casa' }} />
          <TextField placeholder="PUNTO DE REFERENCIA" fullWidth label="Punto de referencia" value={participant.residencia?.puntoReferencia || ""} onChange={e => setParticipant({ ...participant, residencia: { ...participant.residencia, puntoReferencia: e.target.value.toUpperCase() } })} margin="normal" inputProps={{ 'aria-label': 'Punto de referencia', style: { textTransform: 'uppercase' } }} />
          <TextField placeholder="EDIFICIO" fullWidth label="Edificio" value={participant.residencia?.edificio || ""} onChange={e => setParticipant({ ...participant, residencia: { ...participant.residencia, edificio: e.target.value.toUpperCase() } })} margin="normal" inputProps={{ 'aria-label': 'Edificio', style: { textTransform: 'uppercase' } }} />
          <TextField placeholder="Piso" fullWidth label="Piso" value={participant.residencia?.piso || ""} onChange={e => setParticipant({ ...participant, residencia: { ...participant.residencia, piso: e.target.value } })} margin="normal" inputProps={{ 'aria-label': 'Piso' }} />
          <TextField placeholder="Apto" fullWidth label="Apto" value={participant.residencia?.apto || ""} onChange={e => setParticipant({ ...participant, residencia: { ...participant.residencia, apto: e.target.value } })} margin="normal" inputProps={{ 'aria-label': 'Apto' }} />
        </Box>
      </Paper>

      <Paper sx={{ ...surfaceSx, p: { xs: 1.5, md: 3 } }}>
        <Typography id="campamento-title" variant="overline" color="text.secondary" sx={{ fontSize: 18, fontWeight: "bold" }}   >
          Información de campamento
        </Typography>
        <Box role="group" aria-labelledby="campamento-title" sx={{ display: "grid", gap: 1 }}>
          <FormControlLabel control={<Checkbox inputProps={{ 'aria-label': 'Medicamento dependiente' }} checked={participant.campamento?.medicamentoDependiente?.respuesta || false} onChange={e => setParticipant({ ...participant, campamento: { ...participant.campamento, medicamentoDependiente: { ...participant.campamento?.medicamentoDependiente, respuesta: e.target.checked } } })} />} label="Medicamento dependiente" sx={{ m: 0, px: 1.5, py: 0.5 }} />
          {participant.campamento?.medicamentoDependiente?.respuesta && (
            <TextField placeholder="INDIQUE MEDICAMENTO Y DOSIS" fullWidth margin="normal" label="Detalle medicamento" value={participant.campamento.medicamentoDependiente.detalle} onChange={e => setParticipant({ ...participant, campamento: { ...participant.campamento, medicamentoDependiente: { ...participant.campamento.medicamentoDependiente, detalle: e.target.value.toUpperCase() } } })} inputProps={{ style: { textTransform: 'uppercase' } }} />
          )}

          <FormControlLabel control={<Checkbox inputProps={{ 'aria-label': 'Alergia a alimentos' }} checked={participant.campamento?.alergicoAlimento?.respuesta || false} onChange={e => setParticipant({ ...participant, campamento: { ...participant.campamento, alergicoAlimento: { ...participant.campamento?.alergicoAlimento, respuesta: e.target.checked } } })} />} label="Alergia a alimentos" sx={{ m: 0, px: 1.5, py: 0.5 }} />
          {participant.campamento?.alergicoAlimento?.respuesta && (
            <TextField placeholder="DESCRIBA ALIMENTOS Y REACCIONES" fullWidth margin="normal" label="Detalle alergia alimentaria" value={participant.campamento.alergicoAlimento.detalle} onChange={e => setParticipant({ ...participant, campamento: { ...participant.campamento, alergicoAlimento: { ...participant.campamento.alergicoAlimento, detalle: e.target.value.toUpperCase() } } })} inputProps={{ style: { textTransform: 'uppercase' } }} />
          )}

          <FormControlLabel control={<Checkbox inputProps={{ 'aria-label': 'Alergia a medicamentos' }} checked={participant.campamento?.alergicoMedicamento?.respuesta || false} onChange={e => setParticipant({ ...participant, campamento: { ...participant.campamento, alergicoMedicamento: { ...participant.campamento?.alergicoMedicamento, respuesta: e.target.checked } } })} />} label="Alergia a medicamentos" sx={{ m: 0, px: 1.5, py: 0.5 }} />
          {participant.campamento?.alergicoMedicamento?.respuesta && (
            <TextField placeholder="MEDICAMENTOS Y SÍNTOMAS" fullWidth margin="normal" label="Detalle alergia medicamentos" value={participant.campamento.alergicoMedicamento.detalle} onChange={e => setParticipant({ ...participant, campamento: { ...participant.campamento, alergicoMedicamento: { ...participant.campamento.alergicoMedicamento, detalle: e.target.value.toUpperCase() } } })} inputProps={{ style: { textTransform: 'uppercase' } }} />
          )}

          <FormControlLabel control={<Checkbox inputProps={{ 'aria-label': 'Enfermedad crónica' }} checked={participant.campamento?.enfermedad?.respuesta || false} onChange={e => setParticipant({ ...participant, campamento: { ...participant.campamento, enfermedad: { ...participant.campamento?.enfermedad, respuesta: e.target.checked } } })} />} label="Enfermedad" sx={{ m: 0, px: 1.5, py: 0.5 }} />
          {participant.campamento?.enfermedad?.respuesta && (
            <TextField placeholder="INDIQUE DIAGNÓSTICO Y TRATAMIENTO" fullWidth margin="normal" label="Detalle enfermedad" value={participant.campamento.enfermedad.detalle} onChange={e => setParticipant({ ...participant, campamento: { ...participant.campamento, enfermedad: { ...participant.campamento.enfermedad, detalle: e.target.value.toUpperCase() } } })} inputProps={{ style: { textTransform: 'uppercase' } }} />
          )}

          <FormControlLabel control={<Checkbox inputProps={{ 'aria-label': 'Actividad física' }} checked={participant.campamento?.actividadFisica?.respuesta || false} onChange={e => setParticipant({ ...participant, campamento: { ...participant.campamento, actividadFisica: { ...participant.campamento?.actividadFisica, respuesta: e.target.checked } } })} />} label="Actividad física" sx={{ m: 0, px: 1.5, py: 0.5 }} />
          {participant.campamento?.actividadFisica?.respuesta && (
            <TextField placeholder="TIPO DE ACTIVIDAD Y FRECUENCIA" fullWidth margin="normal" label="Detalle actividad" value={participant.campamento.actividadFisica.detalle} onChange={e => setParticipant({ ...participant, campamento: { ...participant.campamento, actividadFisica: { ...participant.campamento.actividadFisica, detalle: e.target.value.toUpperCase() } } })} inputProps={{ style: { textTransform: 'uppercase' } }} />
          )}
        </Box>
      </Paper>
    </>
  );
}
