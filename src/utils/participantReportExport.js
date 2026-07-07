import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

import { participantReportColumns } from "./participantReports";

const getColumnMap = () =>
  participantReportColumns.reduce((accumulator, column) => {
    accumulator[column.id] = column;
    return accumulator;
  }, {});

const truncatePdfValue = (value) => {
  const text = String(value ?? "");
  return text.length > 48 ? `${text.slice(0, 45)}...` : text;
};

const sanitizeFileName = (value) =>
  String(value || "lista-participantes")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-_]/g, "") || "lista-participantes";

const buildExportConfig = (selectedColumnIds) => {
  const columnMap = getColumnMap();
  return (Array.isArray(selectedColumnIds) ? selectedColumnIds : [])
    .map((columnId) => columnMap[columnId])
    .filter(Boolean);
};

export const exportParticipantsToExcel = ({ rows, selectedColumnIds, fileName }) => {
  const columns = buildExportConfig(selectedColumnIds);
  const exportRows = (Array.isArray(rows) ? rows : []).map((row) => {
    const nextRow = {};
    columns.forEach((column) => {
      nextRow[column.label] = row[column.id] ?? "";
    });
    return nextRow;
  });

  const worksheet = XLSX.utils.json_to_sheet(exportRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Participantes");
  XLSX.writeFile(workbook, `${sanitizeFileName(fileName)}.xlsx`);
};

export const exportParticipantsToPdf = ({ rows, selectedColumnIds, fileName }) => {
  const columns = buildExportConfig(selectedColumnIds);
  const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const head = [columns.map((column) => column.label)];
  const body = (Array.isArray(rows) ? rows : []).map((row) =>
    columns.map((column) => truncatePdfValue(row[column.id]))
  );

  pdf.setFontSize(14);
  pdf.text("Centro de exportacion de participantes", 40, 36);
  pdf.setFontSize(9);
  pdf.text(`Generado: ${new Date().toLocaleString("es-VE")}`, 40, 54);
  pdf.text(`Registros: ${body.length}`, 40, 68);

  autoTable(pdf, {
    head,
    body,
    startY: 84,
    styles: {
      fontSize: 6.5,
      cellPadding: 4,
      overflow: "linebreak",
      valign: "middle",
    },
    headStyles: {
      fillColor: [4, 101, 82],
      textColor: [247, 243, 232],
      fontSize: 7,
    },
    alternateRowStyles: {
      fillColor: [247, 243, 232],
    },
    margin: { left: 24, right: 24, top: 24, bottom: 24 },
    tableWidth: "auto",
  });

  pdf.save(`${sanitizeFileName(fileName)}.pdf`);
};