import React from "react";
import { Box, Button, TextField, MenuItem, IconButton, Typography, Paper, Chip } from "@mui/material";
import DeleteIcon from '@mui/icons-material/Delete';

function PaymentsList({ pagos = [], paymentMethods = [], addPayment, updatePayment, removePayment, disabled = false, exento = false, setExento }) {
  const handleAdd = () => {
    if (!addPayment) return;
    addPayment({ amountOriginal: 0, currency: "usd", methodName: "", reference: "", zelleInfo: "" });
  };

  // If there are no pagos but participant is exento, show a synthetic Exento line so user can view/edit it
  const syntheticExentoId = '__exento__';
  const displayLines = (pagos && pagos.length > 0) ? pagos : (exento ? [{ id: syntheticExentoId, amountOriginal: 0, currency: '', methodName: 'Exento', reference: '' }] : []);

  const handleMethodChange = (line) => (e) => {
    const val = e.target.value;
    if (val && val.toString().toLowerCase() === 'exento') {
      // mark participant as exento and zero out this line
      if (line.id === syntheticExentoId) {
        // already synthetic exento
        if (typeof setExento === 'function') setExento(true);
        return;
      }
      updatePayment && updatePayment(line.id, { methodName: 'Exento', amountOriginal: 0 });
      if (typeof setExento === 'function') setExento(true);
      return;
    }
    // selecting a real method: if we were exento, clear exento and create a real payment if needed
    if (typeof setExento === 'function') setExento(false);
    if (line.id === syntheticExentoId) {
      // create a real payment line using addPayment
      if (addPayment) addPayment({ amountOriginal: 0, currency: '', methodName: val, reference: '' });
      return;
    }
    updatePayment && updatePayment(line.id, { methodName: val });
  };

  const handleReferenceChange = (line) => (e) => {
    const val = e.target.value;
    if (line.id === syntheticExentoId) {
      if (typeof setExento === 'function') setExento(false);
      if (addPayment) addPayment({ amountOriginal: 0, currency: '', methodName: '', reference: val });
      return;
    }
    updatePayment && updatePayment(line.id, { reference: val });
  };

  return (
    <Paper sx={{ p: 2, mt: 1 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Typography variant="overline">Abonos</Typography>
        <Button size="small" onClick={handleAdd} disabled={disabled}>+ Agregar</Button>
      </Box>
      <Box sx={{ display: 'grid', gap: 1, mt: 1 }}>
        {displayLines && displayLines.length > 0 ? (
          displayLines.map((line) => (
            <Paper key={line.id} sx={{ p: 1, display: 'grid', gridTemplateColumns: { xs: '1fr', md: '140px 1fr 160px 120px' }, gap: 1, alignItems: 'center' }}>
              <TextField
                label="Monto"
                type="number"
                value={line.amountOriginal ?? ''}
                onChange={(e) => updatePayment && updatePayment(line.id, { amountOriginal: e.target.value.replace(/[^0-9.]/g, '') })}
                size="small"
                disabled={exento || (line.methodName && line.methodName.toString().toLowerCase() === 'exento')}
              />
              <TextField
                label="Forma de pago"
                select
                size="small"
                value={line.methodName || ''}
                onChange={handleMethodChange(line)}
              >
                <MenuItem value="">Seleccionar</MenuItem>
                <MenuItem value="Exento">Exento</MenuItem>
                {paymentMethods.map((m) => (
                  <MenuItem key={m.id} value={m.nombre}>{m.nombre} · {m.divisa === 'bs' ? 'Bs' : '$'}</MenuItem>
                ))}
              </TextField>
              <TextField
                label="Referencia"
                size="small"
                value={line.reference || ''}
                onChange={handleReferenceChange(line)}
                disabled={false}
              />
              <Box display="flex" alignItems="center" justifyContent="flex-end">
                {((line.methodName && line.methodName.toString().toLowerCase() === 'exento') || (exento && line.id === syntheticExentoId)) && (
                  <Chip label="Exento" size="small" sx={{ mr: 1, backgroundColor: '#EEE8D8', color: '#35584E', border: '1px solid #D4CCB7' }} />
                )}
                {line.id !== syntheticExentoId && (
                  <IconButton onClick={() => removePayment && removePayment(line.id)} aria-label="Eliminar abono">
                    <DeleteIcon />
                  </IconButton>
                )}
              </Box>
            </Paper>
          ))
        ) : (
          <Typography variant="body2" color="text.secondary">No hay abonos registrados.</Typography>
        )}
      </Box>
    </Paper>
  );
}

export default React.memo(PaymentsList);
