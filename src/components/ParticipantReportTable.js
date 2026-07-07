import React from "react";
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";

export default function ParticipantReportTable({
  rows,
  columns,
  surfaceSx,
}) {
  return (
    <Paper sx={{ ...surfaceSx, p: { xs: 1, md: 2 }, width: "100%", maxWidth: "100%", overflow: "hidden" }}>
      <Box display="flex" justifyContent="space-between" gap={2} mb={1.5}>
        <Box>
          <Typography variant="overline" color="text.secondary">
            Resultados
          </Typography>
          <Typography variant="body2" color="text.secondary">
            La tabla refleja exactamente lo que se exportara.
          </Typography>
        </Box>
      </Box>

      <TableContainer
        sx={{
          width: "100%",
          maxWidth: "100%",
          border: "1px solid #D8D1C2",
          maxHeight: 560,
          overflowX: "auto",
          overflowY: "auto",
        }}
      >
        <Table stickyHeader size="small" sx={{ minWidth: Math.max(960, columns.length * 140) }}>
          <TableHead>
            <TableRow>
              {columns.map((column) => (
                <TableCell
                  key={column.id}
                  sx={{
                    backgroundColor: "#F7F3E8",
                    fontWeight: 700,
                    whiteSpace: "nowrap",
                  }}
                >
                  {column.label}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length}>
                  <Typography variant="body2" color="text.secondary">
                    No hay resultados para los filtros seleccionados.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id} hover>
                  {columns.map((column) => (
                    <TableCell
                      key={`${row.id}-${column.id}`}
                      sx={{
                        whiteSpace: "nowrap",
                        maxWidth: 280,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {row[column.id] || "-"}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
}