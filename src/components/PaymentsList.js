import React from "react";
import { Box, Button, TextField, MenuItem, IconButton, Typography, Paper } from "@mui/material";
import DeleteIcon from '@mui/icons-material/Delete';

function PaymentsList({ pagos = [], paymentMethods = [], addPayment, updatePayment, removePayment, disabled = false }) {
  const handleAdd = () => {
    if (!addPayment) return;
    addPayment({ amountOriginal: 0, currency: "usd", methodName: "", reference: "", zelleInfo: "" });
  };

  return (
    <Paper sx={{ p: 2, mt: 1 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Typography variant="overline">Abonos</Typography>
        <Button size="small" onClick={handleAdd} disabled={disabled}>+ Agregar</Button>
      </Box>
      <Box sx={{ display: 'grid', gap: 1, mt: 1 }}>
        {pagos && pagos.length > 0 ? (
          pagos.map((line) => (
            <Paper key={line.id} sx={{ p: 1, display: 'grid', gridTemplateColumns: { xs: '1fr', md: '140px 1fr 160px 80px' }, gap: 1, alignItems: 'center' }}>
              <TextField
                label="Monto"
                type="number"
                value={line.amountOriginal ?? ''}
                onChange={(e) => updatePayment && updatePayment(line.id, { amountOriginal: e.target.value.replace(/[^0-9.]/g, '') })}
                size="small"
              />
              <TextField
                label="Forma de pago"
                select
                size="small"
                value={line.methodName || ''}
                onChange={(e) => updatePayment && updatePayment(line.id, { methodName: e.target.value })}
              >
                <MenuItem value="">Seleccionar</MenuItem>
                {paymentMethods.map((m) => (
                  <MenuItem key={m.id} value={m.nombre}>{m.nombre} · {m.divisa === 'bs' ? 'Bs' : '$'}</MenuItem>
                ))}
              </TextField>
              <TextField
                label="Referencia"
                size="small"
                value={line.reference || ''}
                onChange={(e) => updatePayment && updatePayment(line.id, { reference: e.target.value })}
              />
              <Box display="flex" alignItems="center" justifyContent="flex-end">
                <IconButton onClick={() => removePayment && removePayment(line.id)} aria-label="Eliminar abono">
                  <DeleteIcon />
                </IconButton>
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
