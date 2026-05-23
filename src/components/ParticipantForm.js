import React from "react";
import { Box, Paper, Typography, TextField, MenuItem, Select, InputLabel, FormControl, Button, FormControlLabel, Checkbox } from "@mui/material";
import ParticipantResidenceCamp from "./ParticipantResidenceCamp";

const ESTADO_OPTIONS = ["Soltero(a)", "Casado(a)", "Viudo(a)", "Divorciado(a)", "Otro"];

const normalizeOption = (val, options) => {
  if (!val && val !== "") return "";
  if (!val) return "";
  const found = options.find((o) => String(o).toLowerCase() === String(val).toLowerCase());
  return found || "";
};

export default function ParticipantForm({
  participant,
  setParticipant,
  capitalizeWords,
  errorCedula,
  setErrorCedula,
  validarCedula,
  // payment props
  montoPagado,
  setMontoPagado,
  montoPagado2,
  setMontoPagado2,
  formaPago,
  setFormaPago,
  referencia,
  setReferencia,
  zelleInfo,
  setZelleInfo,
  agregarSegundaForma,
  setAgregarSegundaForma,
  segundaFormaPago,
  setSegundaFormaPago,
  referencia2,
  setReferencia2,
  zelleInfo2,
  setZelleInfo2,
  exento,
  setExento,
  paymentMethods,
  costoCongreso,
  surfaceSx,
  submitLabel = "Registrar",
  onSubmit,
}) {
  return (
    <>
      <Paper sx={{ ...surfaceSx, p: { xs: 1.5, md: 3.5 } }}>
        <Typography id="registro-title" variant="overline" sx={{ color: "primary.main", letterSpacing: "0.12em", fontSize: 18, fontWeight: "bold" }}>
          Datos personales
        </Typography>
        <Box role="group" aria-labelledby="registro-title"
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" },
            gap: { xs: 1.5, md: 2 },
          }}
        >
          <TextField placeholder="Ej: JUAN" inputProps={{ 'aria-label': 'Nombres', style: { textTransform: 'uppercase' } }} fullWidth label="Nombres" value={participant.nombres} onChange={e => setParticipant({ ...participant, nombres: e.target.value.toUpperCase() })} margin="normal" required />
          <TextField placeholder="Ej: PÉREZ" inputProps={{ 'aria-label': 'Apellidos', style: { textTransform: 'uppercase' } }} fullWidth label="Apellidos" value={participant.apellidos} onChange={e => setParticipant({ ...participant, apellidos: e.target.value.toUpperCase() })} margin="normal" required />
          <TextField
            placeholder="Ej: V-12345678"
            inputProps={{ 'aria-label': 'Cédula', style: { textTransform: 'uppercase' } }}
            fullWidth
            label="Cédula"
            value={participant.ci}
            onChange={e => { setParticipant({ ...participant, ci: e.target.value.toUpperCase() }); setErrorCedula(""); }}
            onBlur={validarCedula}
            margin="normal"
            required
            error={!!errorCedula}
            helperText={errorCedula || "Formato sin puntos"}
          />
          <TextField placeholder="Ej: 04141234567" inputProps={{ 'aria-label': 'Teléfono móvil' }} fullWidth label="Teléfono móvil" value={participant.telefonoMovil} onChange={e => setParticipant({ ...participant, telefonoMovil: e.target.value })} margin="normal" required />
          <TextField placeholder="Ej: 02121234567" inputProps={{ 'aria-label': 'Teléfono secundario' }} fullWidth label="Teléfono secundario" value={participant.telefonoFijo} onChange={e => setParticipant({ ...participant, telefonoFijo: e.target.value })} margin="normal" />
          <TextField placeholder="correo@ejemplo.com" inputProps={{ 'aria-label': 'Correo electrónico' }} fullWidth label="Correo electrónico" value={participant.email} onChange={e => setParticipant({ ...participant, email: e.target.value })} margin="normal" />
          <TextField placeholder="AAAA-MM-DD" fullWidth label="Fecha de nacimiento" type="date" value={participant.fechaNacimiento} onChange={(e) => { const fecha = e.target.value; const hoy = new Date(); const nacimiento = new Date(fecha); let edad = hoy.getFullYear() - nacimiento.getFullYear(); const m = hoy.getMonth() - nacimiento.getMonth(); if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) { edad--; } setParticipant({ ...participant, fechaNacimiento: fecha, edad }); }} margin="normal" InputLabelProps={{ shrink: true }} inputProps={{ 'aria-label': 'Fecha de nacimiento' }} required />
          <TextField placeholder="Edad calculada" fullWidth label="Edad" value={participant.edad} margin="normal" disabled inputProps={{ 'aria-label': 'Edad' }} />
          <TextField
            placeholder="Seleccione estado civil"
            fullWidth
            label="Estado civil"
            value={normalizeOption(participant.estadoCivil, ESTADO_OPTIONS)}
            onChange={e => setParticipant({ ...participant, estadoCivil: e.target.value })}
            margin="normal"
            select
            inputProps={{ 'aria-label': 'Estado civil' }}
          >
            {ESTADO_OPTIONS.map((opt) => (
              <MenuItem key={opt} value={opt}>{opt}</MenuItem>
            ))}
          </TextField>
          {normalizeOption(participant.estadoCivil, ESTADO_OPTIONS) === "Otro" && (
            <TextField placeholder="ESPECIFIQUE ESTADO CIVIL" fullWidth label="¿Cuál?" value={participant.estadoCivilOtro} onChange={e => setParticipant({ ...participant, estadoCivilOtro: e.target.value.toUpperCase() })} margin="normal" inputProps={{ style: { textTransform: 'uppercase' } }} />
          )}
          <TextField placeholder="0" fullWidth label="Número de hijos" type="number" value={participant.numHijos} onChange={e => setParticipant({ ...participant, numHijos: e.target.value.replace(/[^0-9]/g, "") })} margin="normal" inputProps={{ 'aria-label': 'Número de hijos', min: 0 }} />
          <TextField placeholder="Ej: INGENIERO" fullWidth label="Profesión" value={participant.profesion} onChange={e => setParticipant({ ...participant, profesion: e.target.value.toUpperCase() })} margin="normal" inputProps={{ 'aria-label': 'Profesión', style: { textTransform: 'uppercase' } }} />
          <TextField placeholder="Ej: PROFESOR" fullWidth label="Ocupación" value={participant.ocupacion} onChange={e => setParticipant({ ...participant, ocupacion: e.target.value.toUpperCase() })} margin="normal" inputProps={{ 'aria-label': 'Ocupación', style: { textTransform: 'uppercase' } }} />
          <FormControlLabel control={<Checkbox inputProps={{ 'aria-label': 'Vive con sus padres' }} checked={participant.viveConPadres} onChange={e => setParticipant({ ...participant, viveConPadres: e.target.checked })} />} label="¿Vive con sus padres?" sx={{ m: 0, px: 1.5, py: 0.5 }} />
          <TextField placeholder="Ej: MARÍA PÉREZ" fullWidth label="Nombre de un representante" value={participant.nombreRepresentante} onChange={e => setParticipant({ ...participant, nombreRepresentante: e.target.value.toUpperCase() })} margin="normal" inputProps={{ 'aria-label': 'Nombre representante', style: { textTransform: 'uppercase' } }} />
          <TextField placeholder="Ej: 04141234567" fullWidth label="Teléfono móvil (representante)" value={participant.telefonoRepresentante} onChange={e => setParticipant({ ...participant, telefonoRepresentante: e.target.value })} margin="normal" inputProps={{ 'aria-label': 'Teléfono representante' }} />
          <TextField placeholder="MINISTERIO / SERVICIO" fullWidth label="¿Sirve en algún ministerio?" value={participant.sirveMinisterio} onChange={e => setParticipant({ ...participant, sirveMinisterio: e.target.value.toUpperCase() })} margin="normal" inputProps={{ 'aria-label': 'Sirve ministerio', style: { textTransform: 'uppercase' } }} />
        </Box>
      </Paper>

      <ParticipantResidenceCamp participant={participant} setParticipant={setParticipant} surfaceSx={surfaceSx} />

      <Paper sx={{ ...surfaceSx, p: { xs: 1.5, md: 3 } }}>
        <Typography id="iglesia-title" variant="overline" color="text.secondary" sx={{ fontSize: 18, fontWeight: "bold" }}>
          Datos de iglesia
        </Typography>
        <Box role="group" aria-labelledby="iglesia-title" sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" }, gap: { xs: 1.5, md: 2 } }}>
          <FormControlLabel control={<Checkbox inputProps={{ 'aria-label': 'Bautizado' }} checked={participant.iglesia.bautizado} onChange={e => setParticipant({ ...participant, iglesia: { ...participant.iglesia, bautizado: e.target.checked } })} />} label="¿Está bautizado?" sx={{ m: 0, px: 1.5, py: 0.5 }} />
          <FormControlLabel control={<Checkbox inputProps={{ 'aria-label': 'Miembro' }} checked={participant.iglesia.miembro} onChange={e => setParticipant({ ...participant, iglesia: { ...participant.iglesia, miembro: e.target.checked } })} />} label="¿Es miembro?" sx={{ m: 0, px: 1.5, py: 0.5 }} />
          <TextField placeholder="NOMBRE DE LA IGLESIA" fullWidth label="Afiliación / Iglesia local" value={participant.iglesia.afiliacion} onChange={e => setParticipant({ ...participant, iglesia: { ...participant.iglesia, afiliacion: e.target.value.toUpperCase() } })} margin="normal" inputProps={{ 'aria-label': 'Afiliación iglesia', style: { textTransform: 'uppercase' } }} />
          <TextField placeholder="LUGAR / FECHA" fullWidth label="Bautismo (detalle)" value={participant.iglesia.bautismo} onChange={e => setParticipant({ ...participant, iglesia: { ...participant.iglesia, bautismo: e.target.value.toUpperCase() } })} margin="normal" inputProps={{ 'aria-label': 'Bautismo detalle', style: { textTransform: 'uppercase' } }} />
          <TextField placeholder="SÍ / NO / OBSERVACIONES" fullWidth label="Visitante (sí/no o detalle)" value={participant.iglesia.visitante} onChange={e => setParticipant({ ...participant, iglesia: { ...participant.iglesia, visitante: e.target.value.toUpperCase() } })} margin="normal" inputProps={{ 'aria-label': 'Visitante', style: { textTransform: 'uppercase' } }} />
          <TextField placeholder="Ej: 2 AÑOS" fullWidth label="¿Cuánto tiempo?" value={participant.iglesia.cuantoTiempo} onChange={e => setParticipant({ ...participant, iglesia: { ...participant.iglesia, cuantoTiempo: e.target.value.toUpperCase() } })} margin="normal" inputProps={{ 'aria-label': 'Cuánto tiempo en la iglesia', style: { textTransform: 'uppercase' } }} />
        </Box>
      </Paper>

      {!exento && (
        <Paper sx={{ ...surfaceSx, p: { xs: 1.5, md: 3 } }}>
          <Typography variant="overline" color="text.secondary" sx={{ fontSize: 18, fontWeight: "bold" }}>
            Pago
          </Typography>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" },
              gap: { xs: 1.5, md: 2 },
              alignItems: "start",
            }}
          >
            <TextField
              placeholder="0.00"
              fullWidth
              type="number"
              label={`Monto pagado (${formaPago ? paymentMethods.find((method) => method.nombre === formaPago)?.divisa || "$" : "$"})`}
              value={montoPagado}
              onChange={(e) =>
                setMontoPagado(e.target.value.replace(/[^0-9.]/g, ""))
              }
              margin="normal"
              inputProps={{ min: 0, step: "0.01", 'aria-label': 'Monto pagado' }}
            />
            <FormControl fullWidth margin="normal">
              <InputLabel id="forma-pago-label">Forma de pago</InputLabel>
              <Select
                labelId="forma-pago-label"
                value={formaPago}
                label="Forma de pago"
                onChange={(e) => setFormaPago(e.target.value)}
              >
                {paymentMethods.map((method) => (
                  <MenuItem key={method.id} value={method.nombre}>
                    {method.nombre} · {method.divisa === "bs" ? "Bs" : "$"}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
          {paymentMethods.find((method) => method.nombre === formaPago)?.requiereReferencia && (
            <TextField
              placeholder="Ej: 123456"
              fullWidth
              margin="normal"
              label="Número de referencia"
              value={referencia}
              onChange={(e) => setReferencia(e.target.value)}
              inputProps={{ 'aria-label': 'Número de referencia' }}
            />
          )}
          {paymentMethods.find((method) => method.nombre === formaPago)?.requiereZelleInfo && (
            <TextField
              placeholder="Titular o confirmación"
              fullWidth
              margin="normal"
              label="Número de confirmación o nombre del titular"
              value={zelleInfo}
              onChange={(e) => setZelleInfo(e.target.value)}
              inputProps={{ 'aria-label': 'Zelle o confirmación' }}
            />
          )}

          <FormControlLabel
            control={<Checkbox inputProps={{ 'aria-label': 'Exento' }} checked={exento} onChange={(e) => setExento(e.target.checked)} />}
            label="Exento (no paga)"
            sx={{ m: 0, px: 1.5, py: 0.5 }}
          />

          <FormControlLabel
            control={
              <Checkbox
                checked={agregarSegundaForma}
                onChange={(e) => setAgregarSegundaForma(e.target.checked)}
              />
            }
            label="Agregar segunda forma de pago"
            sx={{ ...surfaceSx, mt: 2, mx: 0, px: 1.5, py: 0.5 }}
          />

          {agregarSegundaForma && (
            <Box
              sx={{
                mt: 1,
                display: "grid",
                gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" },
                gap: { xs: 1.5, md: 2 },
                alignItems: "start",
              }}
            >
              <TextField
                placeholder="0.00"
                fullWidth
                type="number"
                label={`Monto pagado 2do abono (${segundaFormaPago ? paymentMethods.find((method) => method.nombre === segundaFormaPago)?.divisa || "$" : "$"})`}
                value={montoPagado2}
                onChange={(e) =>
                  setMontoPagado2(e.target.value.replace(/[^0-9.]/g, ""))
                }
                margin="normal"
                inputProps={{ min: 0, step: "0.01" }}
              />
              <FormControl fullWidth margin="normal">
                <InputLabel id="segunda-forma-pago-label">Segunda forma de pago</InputLabel>
                <Select
                  labelId="segunda-forma-pago-label"
                  value={segundaFormaPago}
                  label="Segunda forma de pago"
                  onChange={(e) => setSegundaFormaPago(e.target.value)}
                >
                  {paymentMethods
                    .filter((method) => method.nombre !== formaPago)
                    .map((method) => (
                      <MenuItem key={method.id} value={method.nombre}>
                        {method.nombre} · {method.divisa === "bs" ? "Bs" : "$"}
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>
            </Box>
          )}
          {agregarSegundaForma && paymentMethods.find((method) => method.nombre === segundaFormaPago)?.requiereReferencia && (
            <TextField
              placeholder="Ej: 123456"
              fullWidth
              margin="normal"
              label="Número de referencia (2da forma)"
              value={referencia2}
              onChange={(e) => setReferencia2(e.target.value)}
            />
          )}
          {agregarSegundaForma && paymentMethods.find((method) => method.nombre === segundaFormaPago)?.requiereZelleInfo && (
            <TextField
              placeholder="Titular o confirmación"
              fullWidth
              margin="normal"
              label="Número de confirmación o nombre del titular (2da forma)"
              value={zelleInfo2}
              onChange={(e) => setZelleInfo2(e.target.value)}
            />
          )}
        </Paper>
      )}

      <Paper sx={{ ...surfaceSx, p: { xs: 1.5, md: 3 } }}>
        <Typography id="confirmacion-title" variant="overline" color="text.secondary">
          Confirmación
        </Typography>
        <Box role="group" aria-labelledby="confirmacion-title"
          sx={{
            mt: 2,
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            gap: 1,
          }}
        >
          <Button
            variant="contained"
            fullWidth
            onClick={() => onSubmit && onSubmit({ participant, montoPagado, montoPagado2, formaPago, referencia, zelleInfo, agregarSegundaForma, segundaFormaPago, referencia2, zelleInfo2, exento })}
          >
            {submitLabel}
          </Button>
          <Button
            variant="outlined"
            fullWidth
            color="secondary"
            onClick={() => window.history.back()}
          >
            Cancelar
          </Button>
        </Box>
      </Paper>
    </>
  );
}
