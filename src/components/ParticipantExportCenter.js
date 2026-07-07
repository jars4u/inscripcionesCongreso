import React, { useEffect, useMemo, useState } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  FormControlLabel,
  Paper,
  TextField,
  Typography,
} from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import GridOnIcon from "@mui/icons-material/GridOn";
import { collection, getDocs, limit as firestoreLimit, orderBy, query as firestoreQuery } from "firebase/firestore";

import { getDb } from "../firebase";
import ParticipantReportFilters from "./ParticipantReportFilters";
import ParticipantReportTable from "./ParticipantReportTable";
import {
  buildParticipantReportRow,
  createDefaultParticipantReportFilters,
  filterParticipantReportRows,
  getDefaultParticipantReportColumnIds,
  getParticipantReportFilterOptions,
  participantReportColumns,
} from "../utils/participantReports";
import {
  exportParticipantsToExcel,
  exportParticipantsToPdf,
} from "../utils/participantReportExport";

const COLUMN_GROUPS = [
  {
    id: "basicas",
    title: "Columnas base",
    description: "Identidad, contacto y seguimiento principal.",
    columnIds: [
      "fullName",
      "ci",
      "tipoRegistro",
      "paymentStatus",
      "exento",
      "edad",
      "telefonoMovil",
      "email",
      "registradoPor",
      "fechaRegistro",
      "montoPagado",
      "excedente",
      "historialPagos",
    ],
  },
  {
    id: "personales",
    title: "Datos personales",
    description: "Campos del formulario principal y representante.",
    columnIds: [
      "apellidos",
      "telefonoFijo",
      "fechaNacimiento",
      "estadoCivil",
      "numHijos",
      "profesion",
      "ocupacion",
      "viveConPadres",
      "nombreRepresentante",
      "telefonoRepresentante",
      "talla",
    ],
  },
  {
    id: "residencia",
    title: "Residencia",
    description: "Ubicacion resumida y detalle de direccion.",
    columnIds: [
      "zona",
      "municipio",
      "parroquia",
      "sector",
      "calle",
      "avenida",
      "urbanizacion",
      "barrio",
      "nroCasa",
      "puntoReferencia",
      "edificio",
      "piso",
      "apto",
      "direccionResumen",
    ],
  },
  {
    id: "iglesia",
    title: "Iglesia",
    description: "Afiliacion, bautismo y servicio.",
    columnIds: [
      "afiliacion",
      "bautizado",
      "miembro",
      "bautismo",
      "visitante",
      "cuantoTiempo",
      "sirveMinisterio",
    ],
  },
  {
    id: "campamento",
    title: "Campamento y salud",
    description: "Banderas de cuidado y sus detalles.",
    columnIds: [
      "medicamentoDependiente",
      "medicamentoDetalle",
      "alergicoAlimento",
      "alergicoAlimentoDetalle",
      "alergicoMedicamento",
      "alergicoMedicamentoDetalle",
      "enfermedad",
      "enfermedadDetalle",
      "actividadFisica",
      "actividadDetalle",
    ],
  },
];

export default function ParticipantExportCenter({
  participants,
  totalCount,
  costoCongreso,
  surfaceSx,
}) {
  const [filters, setFilters] = useState(createDefaultParticipantReportFilters);
  const [selectedColumnIds, setSelectedColumnIds] = useState(
    getDefaultParticipantReportColumnIds
  );
  const [documentName, setDocumentName] = useState("lista-participantes");
  const [allParticipants, setAllParticipants] = useState(participants || []);
  const [loadingAll, setLoadingAll] = useState(false);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const fetchAllParticipants = async () => {
      setLoadingAll(true);
      setLoadError("");

      try {
        const col = collection(getDb(), "participantes");
        const limitCount = typeof totalCount === "number" && totalCount > 0 ? totalCount : 5000;
        const query = firestoreQuery(
          col,
          orderBy("timestamp", "desc"),
          firestoreLimit(limitCount)
        );
        const snapshot = await getDocs(query);
        const rows = snapshot.docs.map((docItem) => ({ id: docItem.id, ...docItem.data() }));
        if (!cancelled) {
          setAllParticipants(rows);
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Error fetching participants for export center", error);
          setLoadError("No se pudo cargar la base completa para exportacion.");
        }
      } finally {
        if (!cancelled) {
          setLoadingAll(false);
        }
      }
    };

    fetchAllParticipants();

    return () => {
      cancelled = true;
    };
  }, [totalCount]);

  useEffect(() => {
    if (!loadingAll && Array.isArray(participants) && participants.length > allParticipants.length) {
      setAllParticipants(participants);
    }
  }, [participants, loadingAll, allParticipants.length]);

  const reportRows = useMemo(
    () => (Array.isArray(allParticipants) ? allParticipants : []).map((participant) => buildParticipantReportRow(participant, costoCongreso)),
    [allParticipants, costoCongreso]
  );

  const filterOptions = useMemo(
    () => getParticipantReportFilterOptions(reportRows),
    [reportRows]
  );

  const filteredRows = useMemo(
    () => filterParticipantReportRows(reportRows, filters),
    [reportRows, filters]
  );

  const visibleColumns = useMemo(() => {
    const selectedSet = new Set(selectedColumnIds);
    return participantReportColumns.filter((column) => selectedSet.has(column.id));
  }, [selectedColumnIds]);

  const columnGroups = useMemo(() => {
    const columnMap = participantReportColumns.reduce((accumulator, column) => {
      accumulator[column.id] = column;
      return accumulator;
    }, {});

    return COLUMN_GROUPS.map((group) => ({
      ...group,
      columns: group.columnIds.map((columnId) => columnMap[columnId]).filter(Boolean),
    }));
  }, []);

  const handleToggleColumn = (columnId) => (event) => {
    const targetColumn = participantReportColumns.find((column) => column.id === columnId);
    if (targetColumn?.locked) return;

    if (event.target.checked) {
      setSelectedColumnIds((currentValue) => [...currentValue, columnId]);
      return;
    }

    setSelectedColumnIds((currentValue) =>
      currentValue.filter((currentColumnId) => currentColumnId !== columnId)
    );
  };

  const handleResetFilters = () => {
    setFilters(createDefaultParticipantReportFilters());
  };

  const handleExportExcel = () => {
    exportParticipantsToExcel({
      rows: filteredRows,
      selectedColumnIds,
      fileName: documentName,
    });
  };

  const handleExportPdf = () => {
    exportParticipantsToPdf({
      rows: filteredRows,
      selectedColumnIds,
      fileName: documentName,
    });
  };

  const exportDisabled = filteredRows.length === 0 || visibleColumns.length === 0;

  return (
    <Box display="grid" gap={2} sx={{ width: "100%", maxWidth: "100%", overflowX: "clip" }}>
      <Paper sx={{ ...surfaceSx, p: { xs: 1.5, md: 2.5 }, width: "100%", maxWidth: "100%", overflow: "hidden" }}>
        <Box
          display="flex"
          flexDirection={{ xs: "column", xl: "row" }}
          justifyContent="space-between"
          gap={2}
          sx={{ minWidth: 0 }}
        >
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography variant="overline" color="text.secondary">
              Participacion
            </Typography>
            <Typography variant="h5" sx={{ mt: 0.5 }}>
              Centro de exportacion documental
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1, maxWidth: 720 }}>
              Filtra la base completa, revisa la tabla compacta y exporta la misma vista a Excel o PDF.
            </Typography>
          </Box>

          <Paper
            sx={{
              ...surfaceSx,
              p: { xs: 1.5, md: 2 },
              width: { xs: "100%", xl: 380 },
              maxWidth: "100%",
              flexShrink: 0,
              minWidth: 0,
              backgroundColor: "#F7F3E8",
            }}
          >
            <Typography variant="overline" color="text.secondary">
              Documento
            </Typography>
            <TextField
              size="small"
              fullWidth
              sx={{ mt: 1.5 }}
              label="Nombre del archivo"
              value={documentName}
              onChange={(event) => setDocumentName(event.target.value)}
            />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
              {filteredRows.length} filas y {visibleColumns.length} columnas activas.
            </Typography>
            <Box display="flex" flexWrap="wrap" gap={1} sx={{ mt: 2 }}>
              <Button
                variant="contained"
                startIcon={<GridOnIcon />}
                disabled={exportDisabled}
                onClick={handleExportExcel}
              >
                Exportar Excel
              </Button>
              <Button
                variant="outlined"
                startIcon={<PictureAsPdfIcon />}
                disabled={exportDisabled}
                onClick={handleExportPdf}
              >
                Exportar PDF
              </Button>
            </Box>
          </Paper>
        </Box>
      </Paper>

      {loadError && <Alert severity="warning" sx={{ borderRadius: 0 }}>{loadError}</Alert>}

      {loadingAll ? (
        <Paper sx={{ ...surfaceSx, p: 4 }}>
          <Box display="flex" alignItems="center" justifyContent="center" gap={2}>
            <CircularProgress size={24} />
            <Typography>Cargando base completa de participantes...</Typography>
          </Box>
        </Paper>
      ) : (
        <>
          <ParticipantReportFilters
            filters={filters}
            options={filterOptions}
            onChange={setFilters}
            onReset={handleResetFilters}
            surfaceSx={surfaceSx}
            resultCount={filteredRows.length}
          />

          <Paper sx={{ ...surfaceSx, p: { xs: 1.5, md: 2.5 }, width: "100%", maxWidth: "100%", overflow: "hidden" }}>
            <Box
              display="flex"
              justifyContent="space-between"
              alignItems={{ xs: "flex-start", md: "center" }}
              flexDirection={{ xs: "column", md: "row" }}
              gap={2}
              sx={{ minWidth: 0 }}
            >
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="overline" color="text.secondary">
                  Columnas
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  Las columnas activas controlan tanto la tabla como los archivos exportados.
                </Typography>
              </Box>
              <Button
                variant="text"
                startIcon={<DownloadIcon />}
                onClick={() => setSelectedColumnIds(getDefaultParticipantReportColumnIds())}
              >
                Restaurar columnas base
              </Button>
            </Box>

            <Box sx={{ mt: 2, display: "grid", gap: 1.25, minWidth: 0, width: "100%", maxWidth: "100%" }}>
              {columnGroups.map((group) => (
                <Accordion
                  key={group.id}
                  disableGutters
                  defaultExpanded={group.id === "basicas"}
                  elevation={0}
                  sx={{
                    border: "1px solid #D8D1C2",
                    borderRadius: 0,
                    backgroundColor: "#FFFFFF",
                    width: "100%",
                    maxWidth: "100%",
                    overflow: "hidden",
                    "&:before": { display: "none" },
                  }}
                >
                  <AccordionSummary
                    expandIcon={<ExpandMoreIcon />}
                    sx={{
                      minHeight: 56,
                      "& .MuiAccordionSummary-content": {
                        my: 1,
                        minWidth: 0,
                      },
                    }}
                  >
                    <Box sx={{ minWidth: 0, maxWidth: "100%" }}>
                      <Typography variant="subtitle2">{group.title}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {group.description}
                      </Typography>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Box
                      sx={{
                        display: "grid",
                        gridTemplateColumns: {
                          xs: "1fr",
                          md: "repeat(2, minmax(0, 1fr))",
                          xl: "repeat(2, minmax(0, 1fr))",
                        },
                        gap: 0.5,
                        width: "100%",
                        minWidth: 0,
                      }}
                    >
                      {group.columns.map((column) => {
                        const checked = selectedColumnIds.includes(column.id);
                        return (
                          <FormControlLabel
                            key={column.id}
                            control={
                              <Checkbox
                                size="small"
                                checked={checked}
                                disabled={column.locked}
                                onChange={handleToggleColumn(column.id)}
                              />
                            }
                            label={column.locked ? `${column.label} (fija)` : column.label}
                            sx={{ m: 0, minWidth: 0, maxWidth: "100%" }}
                          />
                        );
                      })}
                    </Box>
                  </AccordionDetails>
                </Accordion>
              ))}
            </Box>
          </Paper>

          <ParticipantReportTable
            rows={filteredRows}
            columns={visibleColumns}
            surfaceSx={surfaceSx}
          />
        </>
      )}
    </Box>
  );
}