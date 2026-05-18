import { useEffect, useMemo, useState } from "react";
import ExcelJS from "exceljs";
import { jsPDF } from "jspdf";
import "../styles/teacherReports.css";

const GAME_OPTIONS = [
  { value: "ALL", label: "Todos los juegos" },
  { value: "MEMORAMA", label: "Memorama" },
  { value: "COUNT_PICK", label: "Contar y elegir" },
  { value: "LIGHTS_SEQUENCE", label: "Secuencia de luces" },
];

function formatMetric(value, suffix = "") {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "—";
  }

  return `${value}${suffix}`;
}

function formatMs(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "—";
  }

  const n = Number(value);

  if (n >= 1000) {
    return `${(n / 1000).toFixed(1)} s`;
  }

  return `${Math.round(n)} ms`;
}

function formatDate(value) {
  if (!value) return "Sin registros";

  try {
    return new Intl.DateTimeFormat("es-MX", {
      dateStyle: "medium",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function formatDateTime(value) {
  if (!value) return "Sin registros";

  try {
    return new Intl.DateTimeFormat("es-MX", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function buildQuery(filters) {
  const params = new URLSearchParams();

  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (filters.group !== "ALL") params.set("group", filters.group);
  if (filters.studentId !== "ALL") params.set("studentId", filters.studentId);
  if (filters.gameType !== "ALL") params.set("gameType", filters.gameType);

  const query = params.toString();
  return query ? `?${query}` : "";
}

function cleanExcelValue(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "number" && Number.isNaN(value)) return "";
  return value;
}

function formatExcelDate(value) {
  if (!value) return "";

  try {
    return new Intl.DateTimeFormat("es-MX", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function getTimeValue(value) {
  if (!value) return 0;

  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function setColumns(sheet, columns) {
  sheet.columns = columns.map((column) => ({
    header: column.header,
    key: column.key,
    width: column.width || 18,
  }));

  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.alignment = { vertical: "middle", horizontal: "center" };

  headerRow.eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE5E7EB" },
    };

    cell.border = {
      bottom: {
        style: "thin",
        color: { argb: "FFCBD5E1" },
      },
    };
  });
}

function autosizeRows(sheet) {
  sheet.eachRow((row) => {
    row.height = 22;

    row.eachCell((cell) => {
      cell.alignment = {
        vertical: "middle",
        wrapText: true,
      };
    });
  });
}

function downloadExcelBuffer(buffer, filename) {
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");

  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();

  a.remove();
  window.URL.revokeObjectURL(url);
}

function drawPieChartImage({ title, successRate }) {
  const canvas = document.createElement("canvas");
  canvas.width = 540;
  canvas.height = 350;

  const ctx = canvas.getContext("2d");

  const success = Math.max(0, Math.min(100, Number(successRate) || 0));
  const missing = 100 - success;

  const cx = 165;
  const cy = 180;
  const radius = 98;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#111827";
  ctx.font = "bold 24px Arial";
  ctx.fillText(title, 24, 36);

  ctx.fillStyle = "#475569";
  ctx.font = "16px Arial";
  ctx.fillText("Tasa de éxito promedio del juego", 24, 62);

  let start = -Math.PI / 2;
  const successAngle = (success / 100) * Math.PI * 2;

  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.arc(cx, cy, radius, start, start + successAngle);
  ctx.closePath();
  ctx.fillStyle = "#2563eb";
  ctx.fill();

  start += successAngle;

  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.arc(cx, cy, radius, start, start + (missing / 100) * Math.PI * 2);
  ctx.closePath();
  ctx.fillStyle = "#f97316";
  ctx.fill();

  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 4;
  ctx.stroke();

  ctx.fillStyle = "#111827";
  ctx.font = "bold 28px Arial";
  ctx.textAlign = "center";
  ctx.fillText(`${success.toFixed(1)}%`, cx, cy + 8);

  ctx.textAlign = "left";

  ctx.fillStyle = "#2563eb";
  ctx.fillRect(315, 135, 18, 18);
  ctx.fillStyle = "#111827";
  ctx.font = "16px Arial";
  ctx.fillText(`Éxito promedio: ${success.toFixed(1)}%`, 343, 150);

  ctx.fillStyle = "#f97316";
  ctx.fillRect(315, 172, 18, 18);
  ctx.fillStyle = "#111827";
  ctx.fillText(`Falta / error: ${missing.toFixed(1)}%`, 343, 187);

  return canvas.toDataURL("image/png");
}

function addPieChartsByGame(workbook, sheet, byGame) {
  const games = byGame.filter(
    (game) => typeof game.avgSuccessRate === "number"
  );

  sheet.getCell("K1").value = "Gráficas por juego";
  sheet.getCell("K1").font = { bold: true, size: 14 };

  if (!games.length) {
    sheet.getCell("K2").value = "No hay datos suficientes para generar gráficas.";
    return;
  }

  games.forEach((game, index) => {
    const imageBase64 = drawPieChartImage({
      title: game.gameLabel,
      successRate: game.avgSuccessRate,
    });

    const imageId = workbook.addImage({
      base64: imageBase64,
      extension: "png",
    });

    const row = 2 + index * 18;

    sheet.addImage(imageId, {
      tl: { col: 10, row },
      ext: { width: 410, height: 265 },
    });
  });
}

function drawBarChartImage({
  title,
  subtitle,
  items,
  labelKey,
  valueKey,
  suffix = "%",
}) {
  const safeItems = Array.isArray(items) ? items : [];

  const rows = safeItems
    .map((item) => ({
      label: String(item[labelKey] || "Sin nombre"),
      value: Number(item[valueKey]),
    }))
    .filter((item) => Number.isFinite(item.value));

  const barHeight = 26;
  const gap = 12;
  const topArea = 88;
  const bottomArea = 44;
  const chartHeight = Math.max(
    300,
    topArea + rows.length * (barHeight + gap) + bottomArea
  );

  const canvas = document.createElement("canvas");
  canvas.width = 900;
  canvas.height = chartHeight;

  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#111827";
  ctx.font = "bold 24px Arial";
  ctx.fillText(title, 24, 36);

  ctx.fillStyle = "#475569";
  ctx.font = "16px Arial";
  ctx.fillText(subtitle, 24, 62);

  if (!rows.length) {
    ctx.fillStyle = "#64748b";
    ctx.font = "16px Arial";
    ctx.fillText("No hay datos suficientes para generar la gráfica.", 24, 115);
    return canvas.toDataURL("image/png");
  }

  const labelX = 24;
  const barX = 265;
  const barMaxW = 520;
  const valueX = barX + barMaxW + 18;
  const maxValue = Math.max(100, ...rows.map((item) => item.value));

  rows.forEach((item, index) => {
    const y = topArea + index * (barHeight + gap);
    const width = Math.max(4, (item.value / maxValue) * barMaxW);

    let label = item.label;

    if (label.length > 28) {
      label = `${label.slice(0, 25)}...`;
    }

    ctx.fillStyle = "#111827";
    ctx.font = "15px Arial";
    ctx.fillText(label, labelX, y + 18);

    ctx.fillStyle = "#e5e7eb";
    ctx.fillRect(barX, y, barMaxW, barHeight);

    ctx.fillStyle = "#2563eb";
    ctx.fillRect(barX, y, width, barHeight);

    ctx.fillStyle = "#111827";
    ctx.font = "bold 15px Arial";
    ctx.fillText(`${Number(item.value).toFixed(1)}${suffix}`, valueX, y + 18);
  });

  ctx.fillStyle = "#64748b";
  ctx.font = "14px Arial";
  ctx.fillText(
    "Nota: gráfica generada como imagen dentro del reporte.",
    24,
    chartHeight - 18
  );

  return canvas.toDataURL("image/png");
}

function addBarChartToSheet(workbook, sheet, options) {
  const imageBase64 = drawBarChartImage(options);

  const imageId = workbook.addImage({
    base64: imageBase64,
    extension: "png",
  });

  const itemCount = Array.isArray(options.items) ? options.items.length : 0;
  const imageHeight = Math.max(300, 130 + itemCount * 38);

  sheet.addImage(imageId, {
    tl: { col: 13, row: 1 },
    ext: { width: 680, height: imageHeight },
  });
}

function getLast15StudentsForChart(students) {
  return [...(students || [])]
    .filter((student) => typeof student.avgSuccessRate === "number")
    .sort((a, b) => getTimeValue(b.lastPlayedAt) - getTimeValue(a.lastPlayedAt))
    .slice(0, 15);
}

function getLast15DatesForChart(timeline) {
  return [...(timeline || [])]
    .filter((item) => typeof item.avgSuccessRate === "number")
    .sort((a, b) => String(a.date).localeCompare(String(b.date)))
    .slice(-15);
}

async function exportTeacherReportToExcel(report, filters) {
  if (!report) return;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Plataforma educativa";
  workbook.created = new Date();

  const summarySheet = workbook.addWorksheet("Resumen general");

  setColumns(summarySheet, [
    { header: "Indicador", key: "indicador", width: 34 },
    { header: "Valor", key: "valor", width: 42 },
  ]);

  summarySheet.addRows([
    { indicador: "Docente", valor: report.teacher?.name || "" },
    { indicador: "Fecha de exportación", valor: formatExcelDate(new Date()) },
    { indicador: "Filtro desde", valor: filters.from || "Todos" },
    { indicador: "Filtro hasta", valor: filters.to || "Todos" },
    {
      indicador: "Filtro grupo",
      valor: filters.group === "ALL" ? "Todos" : filters.group,
    },
    {
      indicador: "Filtro alumno",
      valor: filters.studentId === "ALL" ? "Todos" : filters.studentId,
    },
    {
      indicador: "Filtro juego",
      valor: filters.gameType === "ALL" ? "Todos" : filters.gameType,
    },
    {
      indicador: "Total de alumnos",
      valor: cleanExcelValue(report.summary?.totalStudents),
    },
    {
      indicador: "Total de partidas",
      valor: cleanExcelValue(report.summary?.totalResults),
    },
    {
      indicador: "Partidas completadas",
      valor: cleanExcelValue(report.summary?.completedResults),
    },
    {
      indicador: "Partidas abandonadas",
      valor: cleanExcelValue(report.summary?.abandonedResults),
    },
    {
      indicador: "Porcentaje de abandono",
      valor: cleanExcelValue(report.summary?.abandonmentRate),
    },
    {
      indicador: "Tasa de éxito promedio",
      valor: cleanExcelValue(report.summary?.avgSuccessRate),
    },
    {
      indicador: "Progreso promedio",
      valor: cleanExcelValue(report.summary?.avgProgressPercent),
    },
    {
      indicador: "Errores promedio",
      valor: cleanExcelValue(report.summary?.avgErrorsCommitted),
    },
    {
      indicador: "Tiempo de reacción promedio ms",
      valor: cleanExcelValue(report.summary?.avgReactionTimeMs),
    },
    {
      indicador: "Duración promedio ms",
      valor: cleanExcelValue(report.summary?.avgDurationMs),
    },
    {
      indicador: "Mejor desempeño",
      valor: report.summary?.bestGame
        ? `${report.summary.bestGame.gameLabel} (${report.summary.bestGame.avgSuccessRate}%)`
        : "",
    },
    {
      indicador: "Mayor dificultad",
      valor: report.summary?.hardestGame
        ? `${report.summary.hardestGame.gameLabel} (${report.summary.hardestGame.avgSuccessRate}%)`
        : "",
    },
  ]);

  autosizeRows(summarySheet);

  const gameSheet = workbook.addWorksheet("Resultados por juego");

  setColumns(gameSheet, [
    { header: "Juego", key: "juego", width: 24 },
    { header: "Total de partidas", key: "total", width: 18 },
    { header: "Completadas", key: "completadas", width: 16 },
    { header: "Abandonadas", key: "abandonadas", width: 16 },
    { header: "Éxito promedio (%)", key: "exito", width: 20 },
    { header: "Progreso promedio (%)", key: "progreso", width: 22 },
    { header: "Errores promedio", key: "errores", width: 18 },
    { header: "Reacción promedio (ms)", key: "reaccion", width: 22 },
    { header: "Duración promedio (ms)", key: "duracion", width: 22 },
  ]);

  gameSheet.addRows(
    (report.byGame || []).map((game) => ({
      juego: game.gameLabel,
      total: cleanExcelValue(game.totalResults),
      completadas: cleanExcelValue(game.completed),
      abandonadas: cleanExcelValue(game.abandoned),
      exito: cleanExcelValue(game.avgSuccessRate),
      progreso: cleanExcelValue(game.avgProgressPercent),
      errores: cleanExcelValue(game.avgErrorsCommitted),
      reaccion: cleanExcelValue(game.avgReactionTimeMs),
      duracion: cleanExcelValue(game.avgDurationMs),
    }))
  );

  autosizeRows(gameSheet);
  gameSheet.views = [{ state: "frozen", ySplit: 1 }];
  addPieChartsByGame(workbook, gameSheet, report.byGame || []);

  const studentSheet = workbook.addWorksheet("Resultados por alumno");

  setColumns(studentSheet, [
    { header: "Alumno", key: "alumno", width: 28 },
    { header: "Correo", key: "correo", width: 30 },
    { header: "Grupo", key: "grupo", width: 12 },
    { header: "Total de partidas", key: "total", width: 18 },
    { header: "Completadas", key: "completadas", width: 14 },
    { header: "Abandonadas", key: "abandonadas", width: 14 },
    { header: "Éxito promedio (%)", key: "exito", width: 20 },
    { header: "Progreso promedio (%)", key: "progreso", width: 22 },
    { header: "Errores promedio", key: "errores", width: 18 },
    { header: "Reacción promedio (ms)", key: "reaccion", width: 22 },
    { header: "Duración promedio (ms)", key: "duracion", width: 22 },
    { header: "Última actividad", key: "ultima", width: 22 },
  ]);

  const studentRows = (report.byStudent || []).map((student) => ({
    alumno: student.studentName,
    correo: student.email,
    grupo: student.group,
    total: cleanExcelValue(student.totalResults),
    completadas: cleanExcelValue(student.completed),
    abandonadas: cleanExcelValue(student.abandoned),
    exito: cleanExcelValue(student.avgSuccessRate),
    progreso: cleanExcelValue(student.avgProgressPercent),
    errores: cleanExcelValue(student.avgErrorsCommitted),
    reaccion: cleanExcelValue(student.avgReactionTimeMs),
    duracion: cleanExcelValue(student.avgDurationMs),
    ultima: formatExcelDate(student.lastPlayedAt),
  }));

  studentSheet.addRows(studentRows);
  autosizeRows(studentSheet);
  studentSheet.views = [{ state: "frozen", ySplit: 1 }];

  addBarChartToSheet(workbook, studentSheet, {
    title: "Tasa de éxito por alumno",
    subtitle: "Últimos 15 alumnos con actividad registrada.",
    items: getLast15StudentsForChart(report.byStudent || []),
    labelKey: "studentName",
    valueKey: "avgSuccessRate",
    suffix: "%",
  });

  const timelineSheet = workbook.addWorksheet("Progreso por fecha");

  setColumns(timelineSheet, [
    { header: "Fecha", key: "fecha", width: 16 },
    { header: "Total de partidas", key: "total", width: 18 },
    { header: "Éxito promedio (%)", key: "exito", width: 20 },
    { header: "Progreso promedio (%)", key: "progreso", width: 22 },
    { header: "Errores promedio", key: "errores", width: 18 },
    { header: "Abandonadas", key: "abandonadas", width: 16 },
  ]);

  const timelineRows = (report.timeline || []).map((item) => ({
    fecha: item.date,
    total: cleanExcelValue(item.totalResults),
    exito: cleanExcelValue(item.avgSuccessRate),
    progreso: cleanExcelValue(item.avgProgressPercent),
    errores: cleanExcelValue(item.avgErrorsCommitted),
    abandonadas: cleanExcelValue(item.abandoned),
  }));

  timelineSheet.addRows(timelineRows);
  autosizeRows(timelineSheet);
  timelineSheet.views = [{ state: "frozen", ySplit: 1 }];

  addBarChartToSheet(workbook, timelineSheet, {
    title: "Progreso por fecha",
    subtitle: "Últimas 15 fechas con partidas registradas.",
    items: getLast15DatesForChart(report.timeline || []),
    labelKey: "date",
    valueKey: "avgSuccessRate",
    suffix: "%",
  });

  const today = new Date().toISOString().slice(0, 10);
  const buffer = await workbook.xlsx.writeBuffer();

  downloadExcelBuffer(buffer, `reporte-docente-${today}.xlsx`);
}

function pdfValue(value, suffix = "") {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "—";
  }

  return `${value}${suffix}`;
}

function pdfDate(value) {
  if (!value) return "Sin registros";

  try {
    return new Intl.DateTimeFormat("es-MX", {
      dateStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function addPdfFooter(doc, pageNumber) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);

  doc.text(`Página ${pageNumber}`, pageWidth - 18, pageHeight - 10, {
    align: "right",
  });

  doc.text("Reporte generado por la plataforma educativa", 14, pageHeight - 10);
}

function addPdfSectionTitle(doc, title, y) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(17, 24, 39);
  doc.text(title, 14, y);

  doc.setDrawColor(203, 213, 225);
  doc.line(14, y + 3, 202, y + 3);

  return y + 11;
}

function addPdfKeyValueTable(doc, rows, startY) {
  let y = startY;

  rows.forEach((row, index) => {
    const bg = index % 2 === 0 ? [248, 250, 252] : [255, 255, 255];

    doc.setFillColor(...bg);
    doc.rect(14, y - 5, 188, 9, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(51, 65, 85);
    doc.text(row.label, 17, y);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(15, 23, 42);
    doc.text(String(row.value), 88, y);

    y += 9;
  });

  return y + 4;
}

function addPdfSimpleTable(doc, columns, rows, startY, options = {}) {
  const { maxRows = 15, columnWidths = [] } = options;

  let y = startY;
  const selectedRows = rows.slice(0, maxRows);

  doc.setFillColor(229, 231, 235);
  doc.rect(14, y - 6, 188, 9, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);

  let x = 16;

  columns.forEach((column, index) => {
    doc.text(column.label, x, y);
    x += columnWidths[index] || 25;
  });

  y += 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);

  selectedRows.forEach((row, rowIndex) => {
    const bg = rowIndex % 2 === 0 ? [248, 250, 252] : [255, 255, 255];

    doc.setFillColor(...bg);
    doc.rect(14, y - 6, 188, 8, "F");

    x = 16;

    columns.forEach((column, index) => {
      let value = row[column.key];

      if (value === null || value === undefined || value === "") {
        value = "—";
      }

      const text = String(value);
      const maxChars = column.maxChars || 18;
      const clipped =
        text.length > maxChars ? `${text.slice(0, maxChars - 3)}...` : text;

      doc.text(clipped, x, y);
      x += columnWidths[index] || 25;
    });

    y += 8;
  });

  return y + 4;
}

function getImageHeightMm(imageData, targetWidthMm) {
  const img = new Image();
  img.src = imageData;

  const ratio = img.height && img.width ? img.height / img.width : 0.55;
  return targetWidthMm * ratio;
}

function addPdfImage(doc, imageData, x, y, width, maxHeight) {
  const height = Math.min(getImageHeightMm(imageData, width), maxHeight);
  doc.addImage(imageData, "PNG", x, y, width, height);
  return y + height;
}

async function exportTeacherReportToPdf(report, filters) {
  if (!report) return;

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "letter",
  });

  let page = 1;
  let y = 48;

  const today = new Date();
  const studentChartItems = getLast15StudentsForChart(report.byStudent || []);
  const timelineChartItems = getLast15DatesForChart(report.timeline || []);

  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, 216, 34, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(255, 255, 255);
  doc.text("Reporte docente", 14, 20);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Seguimiento de desempeño en videojuegos educativos", 14, 28);

  doc.setTextColor(15, 23, 42);

  y = addPdfSectionTitle(doc, "Datos del reporte", y);

  y = addPdfKeyValueTable(
    doc,
    [
      { label: "Docente", value: report.teacher?.name || "Docente" },
      { label: "Fecha de generación", value: formatExcelDate(today) },
      { label: "Filtro desde", value: filters.from || "Todos" },
      { label: "Filtro hasta", value: filters.to || "Todos" },
      {
        label: "Filtro grupo",
        value: filters.group === "ALL" ? "Todos" : filters.group,
      },
      {
        label: "Filtro alumno",
        value: filters.studentId === "ALL" ? "Todos" : filters.studentId,
      },
      {
        label: "Filtro juego",
        value: filters.gameType === "ALL" ? "Todos" : filters.gameType,
      },
    ],
    y
  );

  y = addPdfSectionTitle(doc, "Resumen general", y);

  y = addPdfKeyValueTable(
    doc,
    [
      {
        label: "Total de alumnos",
        value: pdfValue(report.summary?.totalStudents),
      },
      {
        label: "Total de partidas",
        value: pdfValue(report.summary?.totalResults),
      },
      {
        label: "Partidas completadas",
        value: pdfValue(report.summary?.completedResults),
      },
      {
        label: "Partidas abandonadas",
        value: pdfValue(report.summary?.abandonedResults),
      },
      {
        label: "Tasa de éxito promedio",
        value: pdfValue(report.summary?.avgSuccessRate, "%"),
      },
      {
        label: "Progreso promedio",
        value: pdfValue(report.summary?.avgProgressPercent, "%"),
      },
      {
        label: "Errores promedio",
        value: pdfValue(report.summary?.avgErrorsCommitted),
      },
      {
        label: "Tiempo de reacción promedio",
        value: formatMs(report.summary?.avgReactionTimeMs),
      },
      {
        label: "Mejor desempeño",
        value: report.summary?.bestGame
          ? `${report.summary.bestGame.gameLabel} (${report.summary.bestGame.avgSuccessRate}%)`
          : "—",
      },
      {
        label: "Mayor dificultad",
        value: report.summary?.hardestGame
          ? `${report.summary.hardestGame.gameLabel} (${report.summary.hardestGame.avgSuccessRate}%)`
          : "—",
      },
    ],
    y
  );

  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(
    "Nota: estos indicadores no representan un diagnóstico. Solo apoyan el seguimiento docente.",
    14,
    255
  );

  addPdfFooter(doc, page);

  doc.addPage();
  page += 1;
  y = 20;
  y = addPdfSectionTitle(doc, "Tasa de éxito por juego", y);

  const byGameSuccessImage = drawBarChartImage({
    title: "Tasa de éxito por juego",
    subtitle: "Comparación del éxito promedio por videojuego.",
    items: report.byGame || [],
    labelKey: "gameLabel",
    valueKey: "avgSuccessRate",
    suffix: "%",
  });

  y = addPdfImage(doc, byGameSuccessImage, 14, y, 188, 95);

  y += 10;
  y = addPdfSectionTitle(doc, "Errores promedio por juego", y);

  const byGameErrorsImage = drawBarChartImage({
    title: "Errores promedio por juego",
    subtitle: "Promedio de errores registrados por videojuego.",
    items: report.byGame || [],
    labelKey: "gameLabel",
    valueKey: "avgErrorsCommitted",
    suffix: "",
  });

  addPdfImage(doc, byGameErrorsImage, 14, y, 188, 95);

  addPdfFooter(doc, page);

  doc.addPage();
  page += 1;
  y = 20;
  y = addPdfSectionTitle(doc, "Progreso por fecha", y);

  const timelineImage = drawBarChartImage({
    title: "Progreso por fecha",
    subtitle: "Últimas 15 fechas con partidas registradas.",
    items: timelineChartItems,
    labelKey: "date",
    valueKey: "avgSuccessRate",
    suffix: "%",
  });

  addPdfImage(doc, timelineImage, 14, y, 188, 200);

  addPdfFooter(doc, page);

  doc.addPage();
  page += 1;
  y = 20;
  y = addPdfSectionTitle(doc, "Tasa de éxito por alumno", y);

  const studentImage = drawBarChartImage({
    title: "Tasa de éxito por alumno",
    subtitle: "Últimos 15 alumnos con actividad registrada.",
    items: studentChartItems,
    labelKey: "studentName",
    valueKey: "avgSuccessRate",
    suffix: "%",
  });

  addPdfImage(doc, studentImage, 14, y, 188, 200);

  addPdfFooter(doc, page);

  doc.addPage();
  page += 1;
  y = 20;

  y = addPdfSectionTitle(doc, "Resumen por alumno", y);

  const studentRows = [...(report.byStudent || [])]
    .sort((a, b) => getTimeValue(b.lastPlayedAt) - getTimeValue(a.lastPlayedAt))
    .slice(0, 15)
    .map((student) => ({
      alumno: student.studentName,
      grupo: student.group,
      partidas: student.totalResults,
      exito: pdfValue(student.avgSuccessRate, "%"),
      progreso: pdfValue(student.avgProgressPercent, "%"),
      errores: pdfValue(student.avgErrorsCommitted),
      abandonos: student.abandoned,
      ultima: pdfDate(student.lastPlayedAt),
    }));

  y = addPdfSimpleTable(
    doc,
    [
      { label: "Alumno", key: "alumno", maxChars: 22 },
      { label: "Grupo", key: "grupo", maxChars: 8 },
      { label: "Part.", key: "partidas", maxChars: 6 },
      { label: "Éxito", key: "exito", maxChars: 8 },
      { label: "Prog.", key: "progreso", maxChars: 8 },
      { label: "Err.", key: "errores", maxChars: 6 },
      { label: "Aband.", key: "abandonos", maxChars: 6 },
      { label: "Última", key: "ultima", maxChars: 12 },
    ],
    studentRows,
    y,
    {
      maxRows: 15,
      columnWidths: [42, 17, 15, 20, 20, 14, 18, 32],
    }
  );

  y += 8;
  y = addPdfSectionTitle(doc, "Alumnos que requieren revisión", y);

  const reviewRows = (report.studentsToReview || []).slice(0, 10).map((student) => {
    const abandonmentRate =
      student.totalResults > 0
        ? Number(((student.abandoned / student.totalResults) * 100).toFixed(1))
        : null;

    const lowSuccess =
      typeof student.avgSuccessRate === "number" && student.avgSuccessRate < 60;

    const highAbandonment =
      typeof abandonmentRate === "number" && abandonmentRate >= 30;

    let reason = "Revisar desempeño";

    if (lowSuccess && highAbandonment) {
      reason = "Baja tasa y abandono";
    } else if (lowSuccess) {
      reason = "Baja tasa de éxito";
    } else if (highAbandonment) {
      reason = "Abandono frecuente";
    }

    return {
      alumno: student.studentName,
      grupo: student.group,
      exito: pdfValue(student.avgSuccessRate, "%"),
      abandono: pdfValue(abandonmentRate, "%"),
      motivo: reason,
    };
  });

  if (reviewRows.length) {
    addPdfSimpleTable(
      doc,
      [
        { label: "Alumno", key: "alumno", maxChars: 26 },
        { label: "Grupo", key: "grupo", maxChars: 8 },
        { label: "Éxito", key: "exito", maxChars: 8 },
        { label: "Abandono", key: "abandono", maxChars: 10 },
        { label: "Motivo", key: "motivo", maxChars: 28 },
      ],
      reviewRows,
      y,
      {
        maxRows: 10,
        columnWidths: [52, 18, 22, 26, 62],
      }
    );
  } else {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(
      "No hay alumnos marcados para revisión con los filtros actuales.",
      14,
      y
    );
  }

  addPdfFooter(doc, page);

  const fileDate = new Date().toISOString().slice(0, 10);
  doc.save(`reporte-docente-${fileDate}.pdf`);
}

function SummaryCard({ label, value, hint }) {
  return (
    <article className="teacher-report-card">
      <span className="teacher-report-card__label">{label}</span>
      <strong className="teacher-report-card__value">{value}</strong>
      {hint && <small>{hint}</small>}
    </article>
  );
}

function BarList({ title, subtitle, items, valueKey, suffix = "%", emptyText }) {
  const safeItems = Array.isArray(items) ? items : [];
  const cleanItems = safeItems.filter(
    (item) => typeof item[valueKey] === "number"
  );
  const max = Math.max(100, ...cleanItems.map((item) => item[valueKey] || 0));

  return (
    <article className="teacher-report-panel">
      <div className="teacher-report-panel__header">
        <div>
          <h3>{title}</h3>
          {subtitle && <p>{subtitle}</p>}
        </div>
      </div>

      {cleanItems.length ? (
        <div className="teacher-report-bars">
          {cleanItems.map((item) => {
            const value = item[valueKey] || 0;
            const width = Math.max(4, Math.min(100, (value / max) * 100));

            return (
              <div
                className="teacher-report-bars__row"
                key={`${title}-${item.gameType || item.studentName || item.date}`}
              >
                <div className="teacher-report-bars__top">
                  <span>{item.gameLabel || item.studentName || item.date}</span>
                  <strong>{formatMetric(value, suffix)}</strong>
                </div>

                <div className="teacher-report-bars__track">
                  <div
                    className="teacher-report-bars__fill"
                    style={{ width: `${width}%` }}
                  />
                </div>

                <small>
                  {item.totalResults ?? item.games ?? 0} partidas
                  {typeof item.abandoned === "number"
                    ? ` · ${item.abandoned} abandonos`
                    : ""}
                </small>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="teacher-report-empty">
          {emptyText || "No hay datos suficientes."}
        </div>
      )}
    </article>
  );
}

function LineChart({ title, subtitle, data }) {
  const safeData = Array.isArray(data) ? data : [];
  const points = safeData.filter(
    (item) => typeof item.avgSuccessRate === "number"
  );
  const width = 640;
  const height = 220;
  const pad = 28;

  const polyline = useMemo(() => {
    if (!points.length) return "";

    const maxIndex = Math.max(1, points.length - 1);

    return points
      .map((item, index) => {
        const x = pad + (index / maxIndex) * (width - pad * 2);
        const y =
          height -
          pad -
          ((item.avgSuccessRate || 0) / 100) * (height - pad * 2);

        return `${x},${y}`;
      })
      .join(" ");
  }, [points]);

  return (
    <article className="teacher-report-panel teacher-report-panel--wide">
      <div className="teacher-report-panel__header">
        <div>
          <h3>{title}</h3>
          {subtitle && <p>{subtitle}</p>}
        </div>
      </div>

      {points.length ? (
        <div className="teacher-report-line-wrap">
          <svg
            className="teacher-report-line"
            viewBox={`0 0 ${width} ${height}`}
            role="img"
            aria-label={title}
          >
            <line
              x1={pad}
              y1={height - pad}
              x2={width - pad}
              y2={height - pad}
            />
            <line x1={pad} y1={pad} x2={pad} y2={height - pad} />
            <polyline points={polyline} />

            {points.map((item, index) => {
              const maxIndex = Math.max(1, points.length - 1);
              const x = pad + (index / maxIndex) * (width - pad * 2);
              const y =
                height -
                pad -
                ((item.avgSuccessRate || 0) / 100) * (height - pad * 2);

              return <circle key={item.date} cx={x} cy={y} r="4" />;
            })}
          </svg>

          <div className="teacher-report-line__legend">
            <span>{formatDate(points[0]?.date)}</span>
            <span>{formatDate(points[points.length - 1]?.date)}</span>
          </div>
        </div>
      ) : (
        <div className="teacher-report-empty">
          No hay suficientes partidas para mostrar progreso.
        </div>
      )}
    </article>
  );
}

export default function TeacherReports() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [error, setError] = useState("");

  const [filters, setFilters] = useState({
    from: "",
    to: "",
    group: "ALL",
    studentId: "ALL",
    gameType: "ALL",
  });

  useEffect(() => {
    let active = true;

    async function loadReport() {
      setLoading(true);
      setError("");

      try {
        const res = await fetch(`/api/teacher/report${buildQuery(filters)}`);
        const contentType = res.headers.get("content-type") || "";

        if (!contentType.includes("application/json")) {
          throw new Error(
            "La ruta del reporte no devolvió JSON. Revisa que exista /api/teacher/report."
          );
        }

        const json = await res.json();

        if (!res.ok) {
          throw new Error(json.message || "No se pudo cargar el reporte docente.");
        }

        if (active) setReport(json);
      } catch (err) {
        if (active) {
          setError(err.message || "No se pudo cargar el reporte docente.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadReport();

    return () => {
      active = false;
    };
  }, [filters]);

  function updateFilter(name, value) {
    setFilters((prev) => {
      const next = { ...prev, [name]: value };

      if (name === "group") {
        next.studentId = "ALL";
      }

      return next;
    });
  }

  function clearFilters() {
    setFilters({
      from: "",
      to: "",
      group: "ALL",
      studentId: "ALL",
      gameType: "ALL",
    });
  }

  async function handleExportExcel() {
    if (!report || exportingExcel) return;

    setExportingExcel(true);

    try {
      await exportTeacherReportToExcel(report, filters);
    } catch (err) {
      setError(err.message || "No se pudo exportar el Excel.");
    } finally {
      setExportingExcel(false);
    }
  }

  async function handleExportPdf() {
    if (!report || exportingPdf) return;

    setExportingPdf(true);

    try {
      await exportTeacherReportToPdf(report, filters);
    } catch (err) {
      setError(err.message || "No se pudo exportar el PDF.");
    } finally {
      setExportingPdf(false);
    }
  }

  const groupOptions = useMemo(() => {
    const groups = new Set();

    for (const student of report?.byStudent || []) {
      if (student.group) groups.add(student.group);
    }

    return Array.from(groups).sort((a, b) => a.localeCompare(b, "es"));
  }, [report]);

  const studentsBySelectedGroup = useMemo(() => {
    const students = report?.byStudent || [];

    if (filters.group === "ALL") {
      return students;
    }

    return students.filter((student) => student.group === filters.group);
  }, [report, filters.group]);

  if (loading && !report) {
    return (
      <div className="teacher-report-page">
        <div className="teacher-report-empty">Cargando reporte docente...</div>
      </div>
    );
  }

  if (error && !report) {
    return (
      <div className="teacher-report-page">
        <div className="teacher-report-empty teacher-report-empty--error">
          {error}
        </div>
      </div>
    );
  }

  if (!report) return null;

  return (
    <div className="teacher-report-page">
      <header className="teacher-report-header">
        <div>
          <h2>Reporte docente</h2>
          <p>
            Seguimiento de desempeño por alumno, juego, fecha, errores, progreso
            y abandono.
          </p>
        </div>

        <div className="teacher-report-header__actions">
          <div className="teacher-report-header__teacher">
            {report.teacher?.name || "Docente"}
          </div>

          <button
            type="button"
            className="teacher-report-export-btn"
            onClick={handleExportExcel}
            disabled={exportingExcel}
          >
            {exportingExcel ? "Generando..." : "Exportar Excel"}
          </button>

          <button
            type="button"
            className="teacher-report-export-btn teacher-report-export-btn--pdf"
            onClick={handleExportPdf}
            disabled={exportingPdf}
          >
            {exportingPdf ? "Generando..." : "Exportar PDF"}
          </button>
        </div>
      </header>

      <section className="teacher-report-filters">
        <label>
          Desde
          <input
            type="date"
            value={filters.from}
            onChange={(e) => updateFilter("from", e.target.value)}
          />
        </label>

        <label>
          Hasta
          <input
            type="date"
            value={filters.to}
            onChange={(e) => updateFilter("to", e.target.value)}
          />
        </label>

        <label>
          Grupo
          <select
            value={filters.group}
            onChange={(e) => updateFilter("group", e.target.value)}
          >
            <option value="ALL">Todos los grupos</option>
            {groupOptions.map((group) => (
              <option key={group} value={group}>
                Grupo {group}
              </option>
            ))}
          </select>
        </label>

        <label>
          Alumno
          <select
            value={filters.studentId}
            onChange={(e) => updateFilter("studentId", e.target.value)}
          >
            <option value="ALL">Todos los alumnos</option>
            {studentsBySelectedGroup.map((student) => (
              <option key={student.studentId} value={student.studentId}>
                {student.studentName}
              </option>
            ))}
          </select>
        </label>

        <label>
          Juego
          <select
            value={filters.gameType}
            onChange={(e) => updateFilter("gameType", e.target.value)}
          >
            {GAME_OPTIONS.map((game) => (
              <option key={game.value} value={game.value}>
                {game.label}
              </option>
            ))}
          </select>
        </label>

        <button type="button" onClick={clearFilters}>
          Limpiar filtros
        </button>
      </section>

      {error && (
        <div className="teacher-report-empty teacher-report-empty--error">
          {error}
        </div>
      )}

      <section className="teacher-report-cards">
        <SummaryCard
          label="Alumnos"
          value={formatMetric(report.summary.totalStudents)}
          hint="según filtros"
        />

        <SummaryCard
          label="Partidas"
          value={formatMetric(report.summary.totalResults)}
          hint={`${formatMetric(report.summary.completedResults)} completadas`}
        />

        <SummaryCard
          label="Tasa de éxito"
          value={formatMetric(report.summary.avgSuccessRate, "%")}
          hint="promedio general"
        />

        <SummaryCard
          label="Errores"
          value={formatMetric(report.summary.avgErrorsCommitted)}
          hint="promedio por partida"
        />

        <SummaryCard
          label="Reacción"
          value={formatMs(report.summary.avgReactionTimeMs)}
          hint="promedio"
        />

        <SummaryCard
          label="Abandono"
          value={formatMetric(report.summary.abandonmentRate, "%")}
          hint={`${formatMetric(report.summary.abandonedResults)} partidas`}
        />
      </section>

      <section className="teacher-report-insights">
        <article>
          <span>Mejor desempeño</span>
          <strong>
            {report.summary.bestGame
              ? `${report.summary.bestGame.gameLabel} (${report.summary.bestGame.avgSuccessRate}%)`
              : "—"}
          </strong>
        </article>

        <article>
          <span>Mayor dificultad</span>
          <strong>
            {report.summary.hardestGame
              ? `${report.summary.hardestGame.gameLabel} (${report.summary.hardestGame.avgSuccessRate}%)`
              : "—"}
          </strong>
        </article>
      </section>

      <section className="teacher-report-grid">
        <BarList
          title="Tasa de éxito por juego"
          subtitle="Compara el desempeño promedio de los tres juegos."
          items={report.byGame || []}
          valueKey="avgSuccessRate"
        />

        <BarList
          title="Errores promedio por juego"
          subtitle="Ayuda a ubicar qué actividad genera más dificultad."
          items={report.byGame || []}
          valueKey="avgErrorsCommitted"
          suffix=""
        />
      </section>

      <LineChart
        title="Progreso por fecha"
        subtitle="Muestra si el desempeño mejora, baja o se mantiene."
        data={report.timeline || []}
      />

      {(report.studentsToReview || []).length > 0 && (
        <section className="teacher-report-panel">
          <div className="teacher-report-panel__header">
            <div>
              <h3>Alumnos que requieren revisión</h3>
              <p>
                Baja tasa de éxito o abandono alto. No es diagnóstico, solo una
                señal para revisar.
              </p>
            </div>
          </div>

          <div className="teacher-report-attention">
            {report.studentsToReview.map((student) => {
              const abandonmentRate =
                student.totalResults > 0
                  ? Number(
                      ((student.abandoned / student.totalResults) * 100).toFixed(
                        1
                      )
                    )
                  : null;

              return (
                <article key={student.studentId}>
                  <strong>{student.studentName}</strong>
                  <span>{student.group}</span>
                  <small>
                    Éxito: {formatMetric(student.avgSuccessRate, "%")} ·
                    Abandono: {formatMetric(abandonmentRate, "%")}
                  </small>
                </article>
              );
            })}
          </div>
        </section>
      )}

      <section className="teacher-report-panel teacher-report-panel--table">
        <div className="teacher-report-panel__header">
          <div>
            <h3>Resumen por alumno</h3>
            <p>Vista general de desempeño individual.</p>
          </div>
        </div>

        {(report.byStudent || []).length ? (
          <div className="teacher-report-table-wrap">
            <table className="teacher-report-table">
              <thead>
                <tr>
                  <th>Alumno</th>
                  <th>Grupo</th>
                  <th>Partidas</th>
                  <th>Éxito</th>
                  <th>Progreso</th>
                  <th>Errores</th>
                  <th>Reacción</th>
                  <th>Abandonos</th>
                  <th>Última actividad</th>
                </tr>
              </thead>

              <tbody>
                {report.byStudent.map((student) => (
                  <tr key={student.studentId}>
                    <td>{student.studentName}</td>
                    <td>{student.group}</td>
                    <td>{formatMetric(student.totalResults)}</td>
                    <td>{formatMetric(student.avgSuccessRate, "%")}</td>
                    <td>{formatMetric(student.avgProgressPercent, "%")}</td>
                    <td>{formatMetric(student.avgErrorsCommitted)}</td>
                    <td>{formatMs(student.avgReactionTimeMs)}</td>
                    <td>{formatMetric(student.abandoned)}</td>
                    <td>{formatDate(student.lastPlayedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="teacher-report-empty">
            No hay alumnos con resultados para estos filtros.
          </div>
        )}
      </section>

      <section className="teacher-report-panel teacher-report-panel--table">
        <div className="teacher-report-panel__header">
          <div>
            <h3>Partidas recientes</h3>
            <p>Últimos 15 registros con los filtros aplicados.</p>
          </div>
        </div>

        {(report.recentResults || []).length ? (
          <div className="teacher-report-table-wrap">
            <table className="teacher-report-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Alumno</th>
                  <th>Grupo</th>
                  <th>Juego</th>
                  <th>Nivel</th>
                  <th>Éxito</th>
                  <th>Errores</th>
                  <th>Tiempo</th>
                  <th>Estado</th>
                </tr>
              </thead>

              <tbody>
                {report.recentResults.map((result) => (
                  <tr key={result.id}>
                    <td>{formatDateTime(result.playedAt)}</td>
                    <td>{result.studentName}</td>
                    <td>{result.group}</td>
                    <td>{result.gameLabel}</td>
                    <td>{result.level || "—"}</td>
                    <td>{formatMetric(result.successRate, "%")}</td>
                    <td>{formatMetric(result.errorsCommitted)}</td>
                    <td>{formatMs(result.durationMs)}</td>
                    <td>{result.abandoned ? "Abandonada" : "Completada"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="teacher-report-empty">
            No hay partidas recientes para estos filtros.
          </div>
        )}
      </section>
    </div>
  );
}
