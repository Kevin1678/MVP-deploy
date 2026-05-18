import { useEffect, useMemo, useState } from "react";
import ExcelJS from "exceljs";
import { jsPDF } from "jspdf";
import "../styles/parentDashboard.css";
import "../styles/parentChildren.css";

const ALL_GAMES = "ALL";

function formatDate(value) {
  if (!value) return "Sin registros";

  try {
    return new Intl.DateTimeFormat("es-MX", {
      dateStyle: "medium",
      timeStyle: "short"
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function formatDateOnly(value) {
  if (!value) return "Sin registros";

  try {
    return new Intl.DateTimeFormat("es-MX", {
      dateStyle: "medium"
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function formatExcelDate(value) {
  if (!value) return "Sin registros";

  try {
    return new Intl.DateTimeFormat("es-MX", {
      dateStyle: "medium",
      timeStyle: "short"
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function formatMetric(value, suffix = "") {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "—";
  }

  return `${value}${suffix}`;
}

function excelValue(value, fallback = "Sin datos") {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return fallback;
  }

  return value;
}

function formatDuration(ms) {
  if (!ms || ms < 0) return "—";

  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (!minutes) return `${seconds}s`;
  return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
}

function cleanSheetName(name) {
  const safeName = String(name || "Hoja")
    .replace(/[:\\/?*\[\]]/g, " ")
    .trim();

  return safeName.slice(0, 31) || "Hoja";
}

function cleanFileName(value) {
  return String(value || "alumno")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();
}

function getSuccessValue(game) {
  if (typeof game?.avgSuccessRate === "number") return game.avgSuccessRate;
  if (typeof game?.avgAccuracy === "number") return game.avgAccuracy;
  if (typeof game?.avgProgressPercent === "number") return game.avgProgressPercent;
  return null;
}

function getGameTotalScore(game) {
  if (typeof game?.totalScore === "number") return game.totalScore;

  if (typeof game?.avgScore === "number" && typeof game?.plays === "number") {
    return Number((game.avgScore * game.plays).toFixed(1));
  }

  return null;
}

function getGameTotalErrors(game) {
  if (typeof game?.totalErrorsCommitted === "number") {
    return game.totalErrorsCommitted;
  }

  if (
    typeof game?.avgErrorsCommitted === "number" &&
    typeof game?.plays === "number"
  ) {
    return Number((game.avgErrorsCommitted * game.plays).toFixed(1));
  }

  return null;
}

function sumValues(items, getter) {
  const values = items
    .map(getter)
    .filter((value) => typeof value === "number" && !Number.isNaN(value));

  if (!values.length) return null;

  return Number(values.reduce((sum, value) => sum + value, 0).toFixed(1));
}

function cleanExcelValue(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "number" && Number.isNaN(value)) return "";
  return value;
}

function setColumns(sheet, columns) {
  sheet.columns = columns.map((column) => ({
    header: column.header,
    key: column.key,
    width: column.width || 18
  }));

  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: "FF111827" } };
  headerRow.alignment = { vertical: "middle", horizontal: "center" };
  headerRow.height = 24;

  headerRow.eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE5E7EB" }
    };

    cell.border = {
      bottom: {
        style: "thin",
        color: { argb: "FFCBD5E1" }
      }
    };
  });
}

function autosizeRows(sheet) {
  sheet.eachRow((row) => {
    row.height = 22;

    row.eachCell((cell) => {
      cell.alignment = {
        vertical: "middle",
        wrapText: true
      };
    });
  });
}

function downloadExcelBuffer(buffer, filename) {
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
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

function drawBarChartImage({
  title,
  subtitle,
  items,
  labelKey,
  valueKey,
  suffix = "",
  maxFixed = null
}) {
  const safeItems = Array.isArray(items) ? items : [];

  const rows = safeItems
    .map((item) => ({
      label: String(item[labelKey] || "Sin nombre"),
      value: Number(item[valueKey])
    }))
    .filter((item) => Number.isFinite(item.value));

  const barHeight = 28;
  const gap = 16;
  const topArea = 92;
  const bottomArea = 44;
  const chartHeight = Math.max(
    320,
    topArea + rows.length * (barHeight + gap) + bottomArea
  );

  const canvas = document.createElement("canvas");
  canvas.width = 920;
  canvas.height = chartHeight;

  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#111827";
  ctx.font = "bold 26px Arial";
  ctx.fillText(title, 26, 38);

  ctx.fillStyle = "#475569";
  ctx.font = "17px Arial";
  ctx.fillText(subtitle, 26, 66);

  if (!rows.length) {
    ctx.fillStyle = "#64748b";
    ctx.font = "17px Arial";
    ctx.fillText("No hay datos suficientes para generar la gráfica.", 26, 120);
    return canvas.toDataURL("image/png");
  }

  const labelX = 26;
  const barX = 285;
  const barMaxW = 525;
  const valueX = barX + barMaxW + 18;
  const maxValue = maxFixed ?? Math.max(1, ...rows.map((item) => item.value));

  rows.forEach((item, index) => {
    const y = topArea + index * (barHeight + gap);
    const width = Math.max(5, Math.min(barMaxW, (item.value / maxValue) * barMaxW));

    let label = item.label;

    if (label.length > 30) {
      label = `${label.slice(0, 27)}...`;
    }

    ctx.fillStyle = "#111827";
    ctx.font = "bold 16px Arial";
    ctx.fillText(label, labelX, y + 20);

    ctx.fillStyle = "#e5e7eb";
    ctx.fillRect(barX, y, barMaxW, barHeight);

    const gradient = ctx.createLinearGradient(barX, y, barX + barMaxW, y);
    gradient.addColorStop(0, "#38bdf8");
    gradient.addColorStop(1, "#818cf8");
    ctx.fillStyle = gradient;
    ctx.fillRect(barX, y, width, barHeight);

    ctx.fillStyle = "#111827";
    ctx.font = "bold 16px Arial";
    ctx.fillText(`${Number(item.value).toFixed(1)}${suffix}`, valueX, y + 20);
  });

  return canvas.toDataURL("image/png");
}

function drawSummaryChartImage({
  studentName,
  gameLabel,
  totalPlays,
  completedGames,
  totalAbandoned,
  avgScore,
  avgSuccessRate,
  totalErrors
}) {
  const canvas = document.createElement("canvas");
  canvas.width = 900;
  canvas.height = 360;

  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#111827";
  ctx.font = "bold 26px Arial";
  ctx.fillText("Resumen visual del alumno", 26, 40);

  ctx.fillStyle = "#475569";
  ctx.font = "17px Arial";
  ctx.fillText(`${studentName} · ${gameLabel}`, 26, 68);

  const cards = [
    { label: "Partidas", value: totalPlays ?? 0 },
    { label: "Completadas", value: completedGames ?? 0 },
    { label: "Abandonadas", value: totalAbandoned ?? 0 },
    { label: "Puntaje promedio", value: avgScore ?? "—" },
    {
      label: "Éxito promedio",
      value: typeof avgSuccessRate === "number" ? `${avgSuccessRate}%` : "—"
    },
    { label: "Errores", value: totalErrors ?? "—" }
  ];

  const cardW = 260;
  const cardH = 88;
  const gap = 20;
  const startX = 26;
  const startY = 105;

  cards.forEach((card, index) => {
    const col = index % 3;
    const row = Math.floor(index / 3);
    const x = startX + col * (cardW + gap);
    const y = startY + row * (cardH + gap);

    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(x, y, cardW, cardH);
    ctx.strokeStyle = "#cbd5e1";
    ctx.strokeRect(x, y, cardW, cardH);

    ctx.fillStyle = "#475569";
    ctx.font = "16px Arial";
    ctx.fillText(card.label, x + 16, y + 30);

    ctx.fillStyle = "#111827";
    ctx.font = "bold 25px Arial";
    ctx.fillText(String(card.value), x + 16, y + 64);
  });

  return canvas.toDataURL("image/png");
}

function addImageToSheet(workbook, sheet, imageBase64, position) {
  const imageId = workbook.addImage({
    base64: imageBase64,
    extension: "png"
  });

  sheet.addImage(imageId, position);
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
      timeStyle: "short"
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function addPdfFooter(doc, pageNumber) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(`Página ${pageNumber}`, pageWidth - 18, pageHeight - 10, {
    align: "right"
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
    doc.text(String(row.label), 17, y);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(15, 23, 42);
    doc.text(String(row.value), 88, y, { maxWidth: 110 });

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

  if (!selectedRows.length) {
    doc.setTextColor(100, 116, 139);
    doc.text("No hay datos disponibles.", 16, y);
    return y + 10;
  }

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

      doc.setTextColor(15, 23, 42);
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

function getLast15DatesForChart(timeline) {
  return [...(timeline || [])]
    .filter((item) => typeof item.avgSuccessRate === "number")
    .sort((a, b) => String(a.date).localeCompare(String(b.date)))
    .slice(-15);
}

function SummaryCard({ label, value }) {
  return (
    <article className="parent-card">
      <span className="parent-card__label">{label}</span>
      <strong className="parent-card__value">{value}</strong>
    </article>
  );
}

function InsightCards({ bestGame, hardestGame }) {
  return (
    <section className="parent-report-insights">
      <article>
        <span>Mejor desempeño</span>
        <strong>
          {bestGame
            ? `${bestGame.gameLabel} (${formatMetric(getSuccessValue(bestGame), "%")})`
            : "—"}
        </strong>
      </article>

      <article>
        <span>Mayor dificultad</span>
        <strong>
          {hardestGame
            ? `${hardestGame.gameLabel} (${formatMetric(getSuccessValue(hardestGame), "%")})`
            : "—"}
        </strong>
      </article>
    </section>
  );
}

function BarList({ title, subtitle, items, valueKey, suffix = "%", emptyText }) {
  const cleanItems = items.filter((item) => {
    const value = valueKey === "success" ? getSuccessValue(item) : item[valueKey];

    return typeof value === "number" && !Number.isNaN(value);
  });

  const values = cleanItems.map((item) =>
    valueKey === "success" ? getSuccessValue(item) : item[valueKey]
  );

  const max = valueKey === "success" ? 100 : Math.max(1, ...values);

  return (
    <article className="parent-report-panel">
      <div className="parent-report-panel__header">
        <div>
          <h3>{title}</h3>
          {subtitle && <p>{subtitle}</p>}
        </div>
      </div>

      {cleanItems.length ? (
        <div className="parent-report-bars">
          {cleanItems.map((item) => {
            const value =
              valueKey === "success" ? getSuccessValue(item) : item[valueKey];

            const width = Math.max(4, Math.min(100, (value / max) * 100));

            return (
              <div
                className="parent-report-bars__row"
                key={`${title}-${item.gameType}`}
              >
                <div className="parent-report-bars__top">
                  <span>{item.gameLabel}</span>
                  <strong>{formatMetric(value, suffix)}</strong>
                </div>

                <div className="parent-report-bars__track">
                  <div
                    className="parent-report-bars__fill"
                    style={{ width: `${width}%` }}
                  />
                </div>

                <small>
                  {formatMetric(item.plays)} partidas ·{" "}
                  {formatMetric(item.abandonedCount || 0)} abandonos
                </small>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="parent-report-empty">
          {emptyText || "No hay datos suficientes."}
        </div>
      )}
    </article>
  );
}

function LineChart({ title, subtitle, data }) {
  const points = data.filter(
    (item) =>
      typeof item.avgSuccessRate === "number" &&
      !Number.isNaN(item.avgSuccessRate)
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
    <article className="parent-report-panel parent-report-panel--wide">
      <div className="parent-report-panel__header">
        <div>
          <h3>{title}</h3>
          {subtitle && <p>{subtitle}</p>}
        </div>
      </div>

      {points.length ? (
        <div className="parent-report-line-wrap">
          <svg
            className="parent-report-line"
            viewBox={`0 0 ${width} ${height}`}
            role="img"
            aria-label={title}
          >
            <line x1={pad} y1={height - pad} x2={width - pad} y2={height - pad} />
            <line x1={pad} y1={pad} x2={pad} y2={height - pad} />
            <polyline points={polyline} />

            {points.map((item, index) => {
              const maxIndex = Math.max(1, points.length - 1);
              const x = pad + (index / maxIndex) * (width - pad * 2);
              const y =
                height -
                pad -
                ((item.avgSuccessRate || 0) / 100) * (height - pad * 2);

              return <circle key={`${item.date}-${index}`} cx={x} cy={y} r="4" />;
            })}
          </svg>

          <div className="parent-report-line__legend">
            <span>{formatDateOnly(points[0]?.date)}</span>
            <span>{formatDateOnly(points[points.length - 1]?.date)}</span>
          </div>
        </div>
      ) : (
        <div className="parent-report-empty">
          No hay suficientes partidas para mostrar progreso.
        </div>
      )}
    </article>
  );
}

export default function ParentChildren() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedChildId, setSelectedChildId] = useState("");
  const [selectedGameType, setSelectedGameType] = useState(ALL_GAMES);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const res = await fetch("/api/parent/dashboard");
        const json = await res.json();

        if (!res.ok) {
          throw new Error(json.message || "No se pudo cargar la información.");
        }

        if (!active) return;

        setData(json);

        if (json.children?.length) {
          setSelectedChildId(String(json.children[0].id));
        }
      } catch (err) {
        if (active) {
          setError(err.message || "No se pudo cargar la información.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      active = false;
    };
  }, []);

  const selectedChild = useMemo(() => {
    if (!data?.children?.length) return null;

    return (
      data.children.find((child) => String(child.id) === String(selectedChildId)) ||
      data.children[0]
    );
  }, [data, selectedChildId]);

  const gameOptions = useMemo(() => {
    return selectedChild?.byGame || [];
  }, [selectedChild]);

  const selectedGameSummary = useMemo(() => {
    if (!selectedChild || selectedGameType === ALL_GAMES) return null;

    return (
      selectedChild.byGame?.find(
        (game) => String(game.gameType) === String(selectedGameType)
      ) || null
    );
  }, [selectedChild, selectedGameType]);

  useEffect(() => {
    if (!selectedChild || selectedGameType === ALL_GAMES) return;

    const gameExists = selectedChild.byGame?.some(
      (game) => String(game.gameType) === String(selectedGameType)
    );

    if (!gameExists) {
      setSelectedGameType(ALL_GAMES);
    }
  }, [selectedChild, selectedGameType]);

  const visibleGames = useMemo(() => {
    if (!selectedChild) return [];
    if (selectedGameSummary) return [selectedGameSummary];
    return selectedChild.byGame || [];
  }, [selectedChild, selectedGameSummary]);

  const bestGame = useMemo(() => {
    const validGames = visibleGames.filter(
      (game) => typeof getSuccessValue(game) === "number"
    );

    if (!validGames.length) return null;

    return [...validGames].sort(
      (a, b) => getSuccessValue(b) - getSuccessValue(a)
    )[0];
  }, [visibleGames]);

  const hardestGame = useMemo(() => {
    const validGames = visibleGames.filter(
      (game) => typeof getSuccessValue(game) === "number"
    );

    if (!validGames.length) return null;

    return [...validGames].sort(
      (a, b) => getSuccessValue(a) - getSuccessValue(b)
    )[0];
  }, [visibleGames]);

  const activeTimeline = useMemo(() => {
    if (selectedGameSummary) return selectedGameSummary.timeline || [];
    return selectedChild?.timeline || [];
  }, [selectedChild, selectedGameSummary]);

  const summaryCards = useMemo(() => {
    if (!selectedChild) return [];

    if (selectedGameSummary) {
      return [
        {
          label: "Partidas registradas",
          value: selectedGameSummary.plays
        },
        {
          label: "Juego seleccionado",
          value: selectedGameSummary.gameLabel
        },
        {
          label: "Puntaje promedio",
          value: formatMetric(selectedGameSummary.avgScore)
        },
        {
          label: "Precisión promedio",
          value: formatMetric(
            selectedGameSummary.avgSuccessRate ?? selectedGameSummary.avgAccuracy,
            "%"
          )
        },
        {
          label: "Mejor puntaje",
          value: selectedGameSummary.bestScore ?? "—"
        }
      ];
    }

    return [
      {
        label: "Partidas registradas",
        value: selectedChild.summary.totalResults
      },
      {
        label: "Juegos distintos",
        value: selectedChild.summary.gamesPlayed
      },
      {
        label: "Puntaje promedio",
        value: formatMetric(selectedChild.summary.avgScore)
      },
      {
        label: "Precisión promedio",
        value: formatMetric(
          selectedChild.summary.avgSuccessRate ?? selectedChild.summary.avgAccuracy,
          "%"
        )
      },
      {
        label: "Tiempo acumulado",
        value: formatDuration(selectedChild.summary.totalDurationMs)
      }
    ];
  }, [selectedChild, selectedGameSummary]);

  const activeLastPlayedAt =
    selectedGameSummary?.lastPlayedAt || selectedChild?.summary?.lastPlayedAt;

  const effectiveSelectedGameType = selectedGameSummary
    ? selectedGameType
    : ALL_GAMES;

  function handleChildChange(event) {
    setSelectedChildId(event.target.value);
    setSelectedGameType(ALL_GAMES);
  }

  function buildExportData() {
    if (!selectedChild) return null;

    const exportGames = visibleGames.length ? visibleGames : [];
    const isSingleGame = Boolean(selectedGameSummary);

    const totalPlays = isSingleGame
      ? selectedGameSummary.plays
      : selectedChild.summary.totalResults;

    const totalAbandoned = isSingleGame
      ? selectedGameSummary.abandonedCount || 0
      : selectedChild.summary.abandonedGames || 0;

    const completedGames = isSingleGame
      ? selectedGameSummary.completedCount ??
        Math.max(0, Number(totalPlays || 0) - Number(totalAbandoned || 0))
      : selectedChild.summary.completedGames ??
        Math.max(0, Number(totalPlays || 0) - Number(totalAbandoned || 0));

    const avgScore = isSingleGame
      ? selectedGameSummary.avgScore
      : selectedChild.summary.avgScore;

    const avgSuccessRate = isSingleGame
      ? getSuccessValue(selectedGameSummary)
      : selectedChild.summary.avgSuccessRate ?? selectedChild.summary.avgAccuracy;

    const totalScore = isSingleGame
      ? getGameTotalScore(selectedGameSummary)
      : selectedChild.summary.totalScore ?? sumValues(exportGames, getGameTotalScore);

    const totalErrors = isSingleGame
      ? getGameTotalErrors(selectedGameSummary)
      : selectedChild.summary.totalErrorsCommitted ??
        sumValues(exportGames, getGameTotalErrors);

    const avgErrors = isSingleGame
      ? selectedGameSummary.avgErrorsCommitted
      : selectedChild.summary.avgErrorsCommitted;

    const avgProgress = isSingleGame
      ? selectedGameSummary.avgProgressPercent
      : selectedChild.summary.avgProgressPercent;

    const totalDurationMs = isSingleGame
      ? selectedGameSummary.totalDurationMs ?? null
      : selectedChild.summary.totalDurationMs;

    const bestGameLabel = bestGame
      ? `${bestGame.gameLabel} (${formatMetric(getSuccessValue(bestGame), "%")})`
      : "Sin datos";

    const hardestGameLabel = hardestGame
      ? `${hardestGame.gameLabel} (${formatMetric(getSuccessValue(hardestGame), "%")})`
      : "Sin datos";

    const gameLabel = selectedGameSummary?.gameLabel || "Todos los juegos";

    return {
      exportGames,
      isSingleGame,
      totalPlays,
      totalAbandoned,
      completedGames,
      avgScore,
      avgSuccessRate,
      totalScore,
      totalErrors,
      avgErrors,
      avgProgress,
      totalDurationMs,
      bestGameLabel,
      hardestGameLabel,
      gameLabel
    };
  }

  async function handleExportPdf() {
    if (!selectedChild || exportingPdf) return;

    setExportingPdf(true);

    try {
      const exportData = buildExportData();

      if (!exportData) return;

      const {
        exportGames,
        totalPlays,
        totalAbandoned,
        completedGames,
        avgScore,
        avgSuccessRate,
        totalScore,
        totalErrors,
        avgErrors,
        avgProgress,
        totalDurationMs,
        bestGameLabel,
        hardestGameLabel,
        gameLabel
      } = exportData;

      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "letter"
      });

      let page = 1;
      let y = 48;
      const today = new Date();
      const timelineChartItems = getLast15DatesForChart(activeTimeline || []);

      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, 216, 34, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.setTextColor(255, 255, 255);
      doc.text("Reporte familiar", 14, 20);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text("Seguimiento de desempeño por alumno y videojuego", 14, 28);

      doc.setTextColor(15, 23, 42);

      y = addPdfSectionTitle(doc, "Datos del reporte", y);
      y = addPdfKeyValueTable(
        doc,
        [
          { label: "Familiar", value: data.parent?.name || "Familiar" },
          { label: "Alumno", value: selectedChild.name },
          { label: "Grupo", value: selectedChild.group },
          { label: "Relación", value: selectedChild.relationLabel },
          { label: "Juego filtrado", value: gameLabel },
          { label: "Fecha de generación", value: formatExcelDate(today) }
        ],
        y
      );

      y = addPdfSectionTitle(doc, "Resultados generales", y);
      y = addPdfKeyValueTable(
        doc,
        [
          { label: "Partidas totales", value: pdfValue(totalPlays) },
          { label: "Partidas completadas", value: pdfValue(completedGames) },
          { label: "Partidas abandonadas", value: pdfValue(totalAbandoned) },
          { label: "Puntaje promedio", value: pdfValue(avgScore) },
          { label: "Aciertos / puntaje acumulado", value: pdfValue(totalScore) },
          { label: "Tasa de éxito promedio", value: pdfValue(avgSuccessRate, "%") },
          { label: "Errores acumulados", value: pdfValue(totalErrors) },
          { label: "Errores promedio", value: pdfValue(avgErrors) },
          { label: "Progreso promedio", value: pdfValue(avgProgress, "%") },
          {
            label: "Tiempo acumulado",
            value:
              totalDurationMs !== null && totalDurationMs !== undefined
                ? formatDuration(totalDurationMs)
                : "No disponible por juego"
          },
          { label: "Mejor desempeño", value: bestGameLabel },
          { label: "Mayor dificultad", value: hardestGameLabel },
          { label: "Última actividad", value: formatDate(activeLastPlayedAt) }
        ],
        y
      );

      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(
        "Nota: estos indicadores no representan un diagnóstico. Solo apoyan el seguimiento familiar.",
        14,
        255
      );

      addPdfFooter(doc, page);

      doc.addPage();
      page += 1;
      y = 20;
      y = addPdfSectionTitle(doc, "Resumen visual", y);
      y = addPdfImage(
        doc,
        drawSummaryChartImage({
          studentName: selectedChild.name,
          gameLabel,
          totalPlays,
          completedGames,
          totalAbandoned,
          avgScore,
          avgSuccessRate,
          totalErrors
        }),
        14,
        y,
        188,
        85
      );

      y += 8;
      y = addPdfSectionTitle(doc, "Tasa de éxito por juego", y);
      y = addPdfImage(
        doc,
        drawBarChartImage({
          title: "Tasa de éxito por juego",
          subtitle: "Comparación del éxito promedio por videojuego.",
          items: exportGames.map((game) => ({
            ...game,
            successValue: getSuccessValue(game)
          })),
          labelKey: "gameLabel",
          valueKey: "successValue",
          suffix: "%",
          maxFixed: 100
        }),
        14,
        y,
        188,
        82
      );

      addPdfFooter(doc, page);

      doc.addPage();
      page += 1;
      y = 20;
      y = addPdfSectionTitle(doc, "Errores promedio por juego", y);
      y = addPdfImage(
        doc,
        drawBarChartImage({
          title: "Errores promedio por juego",
          subtitle: "Promedio de errores registrados por videojuego.",
          items: exportGames.map((game) => ({
            ...game,
            errorValue: game.avgErrorsCommitted
          })),
          labelKey: "gameLabel",
          valueKey: "errorValue",
          suffix: ""
        }),
        14,
        y,
        188,
        95
      );

      y += 10;
      y = addPdfSectionTitle(doc, "Progreso por fecha", y);
      addPdfImage(
        doc,
        drawBarChartImage({
          title: "Progreso por fecha",
          subtitle: "Últimas 15 fechas con partidas registradas.",
          items: timelineChartItems,
          labelKey: "date",
          valueKey: "avgSuccessRate",
          suffix: "%",
          maxFixed: 100
        }),
        14,
        y,
        188,
        82
      );

      addPdfFooter(doc, page);

      doc.addPage();
      page += 1;
      y = 20;
      y = addPdfSectionTitle(doc, "Tasa de éxito por juego", y);

      const successRows = exportGames.map((game) => ({
        juego: game.gameLabel,
        partidas: game.plays ?? 0,
        completadas:
          game.completedCount ??
          Math.max(0, Number(game.plays || 0) - Number(game.abandonedCount || 0)),
        abandonos: game.abandonedCount ?? 0,
        exito: pdfValue(getSuccessValue(game), "%"),
        puntaje: pdfValue(game.avgScore),
        progreso: pdfValue(game.avgProgressPercent, "%")
      }));

      y = addPdfSimpleTable(
        doc,
        [
          { label: "Juego", key: "juego", maxChars: 24 },
          { label: "Part.", key: "partidas", maxChars: 6 },
          { label: "Comp.", key: "completadas", maxChars: 6 },
          { label: "Aband.", key: "abandonos", maxChars: 7 },
          { label: "Éxito", key: "exito", maxChars: 8 },
          { label: "Puntaje", key: "puntaje", maxChars: 8 },
          { label: "Prog.", key: "progreso", maxChars: 8 }
        ],
        successRows,
        y,
        {
          maxRows: 10,
          columnWidths: [48, 17, 18, 20, 23, 25, 24]
        }
      );

      y += 8;
      y = addPdfSectionTitle(doc, "Errores promedio por juego", y);

      const errorRows = exportGames.map((game) => ({
        juego: game.gameLabel,
        partidas: game.plays ?? 0,
        erroresPromedio: pdfValue(game.avgErrorsCommitted),
        erroresAcumulados: pdfValue(getGameTotalErrors(game)),
        abandonos: game.abandonedCount ?? 0,
        exito: pdfValue(getSuccessValue(game), "%")
      }));

      addPdfSimpleTable(
        doc,
        [
          { label: "Juego", key: "juego", maxChars: 24 },
          { label: "Part.", key: "partidas", maxChars: 6 },
          { label: "Err. prom.", key: "erroresPromedio", maxChars: 10 },
          { label: "Err. acum.", key: "erroresAcumulados", maxChars: 10 },
          { label: "Aband.", key: "abandonos", maxChars: 7 },
          { label: "Éxito", key: "exito", maxChars: 8 }
        ],
        errorRows,
        y,
        {
          maxRows: 10,
          columnWidths: [52, 18, 30, 30, 24, 28]
        }
      );

      addPdfFooter(doc, page);

      const fileDate = new Date().toISOString().slice(0, 10);
      const studentName = cleanFileName(selectedChild.name);
      const gameName = cleanFileName(selectedGameSummary?.gameLabel || "todos_los_juegos");

      doc.save(`reporte-familiar-${studentName}-${gameName}-${fileDate}.pdf`);
    } catch (err) {
      setError(err.message || "No se pudo exportar el PDF.");
    } finally {
      setExportingPdf(false);
    }
  }

  async function handleExportExcel() {
    if (!selectedChild || exportingExcel) return;

    setExportingExcel(true);

    try {

    const exportGames = visibleGames.length ? visibleGames : [];
    const isSingleGame = Boolean(selectedGameSummary);

    const totalPlays = isSingleGame
      ? selectedGameSummary.plays
      : selectedChild.summary.totalResults;

    const totalAbandoned = isSingleGame
      ? selectedGameSummary.abandonedCount || 0
      : selectedChild.summary.abandonedGames || 0;

    const completedGames = isSingleGame
      ? selectedGameSummary.completedCount ??
        Math.max(0, Number(totalPlays || 0) - Number(totalAbandoned || 0))
      : selectedChild.summary.completedGames ??
        Math.max(0, Number(totalPlays || 0) - Number(totalAbandoned || 0));

    const avgScore = isSingleGame
      ? selectedGameSummary.avgScore
      : selectedChild.summary.avgScore;

    const avgSuccessRate = isSingleGame
      ? getSuccessValue(selectedGameSummary)
      : selectedChild.summary.avgSuccessRate ?? selectedChild.summary.avgAccuracy;

    const totalScore = isSingleGame
      ? getGameTotalScore(selectedGameSummary)
      : selectedChild.summary.totalScore ?? sumValues(exportGames, getGameTotalScore);

    const totalErrors = isSingleGame
      ? getGameTotalErrors(selectedGameSummary)
      : selectedChild.summary.totalErrorsCommitted ??
        sumValues(exportGames, getGameTotalErrors);

    const avgErrors = isSingleGame
      ? selectedGameSummary.avgErrorsCommitted
      : selectedChild.summary.avgErrorsCommitted;

    const avgProgress = isSingleGame
      ? selectedGameSummary.avgProgressPercent
      : selectedChild.summary.avgProgressPercent;

    const totalDurationMs = isSingleGame
      ? selectedGameSummary.totalDurationMs ?? null
      : selectedChild.summary.totalDurationMs;

    const bestGameLabel = bestGame
      ? `${bestGame.gameLabel} (${formatMetric(getSuccessValue(bestGame), "%")})`
      : "Sin datos";

    const hardestGameLabel = hardestGame
      ? `${hardestGame.gameLabel} (${formatMetric(getSuccessValue(hardestGame), "%")})`
      : "Sin datos";

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Plataforma educativa";
    workbook.created = new Date();

    const summarySheet = workbook.addWorksheet(cleanSheetName("Resultados generales"));

    setColumns(summarySheet, [
      { header: "Indicador", key: "indicador", width: 34 },
      { header: "Valor", key: "valor", width: 42 }
    ]);

    summarySheet.addRows([
      { indicador: "Alumno", valor: selectedChild.name },
      { indicador: "Grupo", valor: selectedChild.group },
      { indicador: "Relación", valor: selectedChild.relationLabel },
      {
        indicador: "Juego filtrado",
        valor: selectedGameSummary?.gameLabel || "Todos los juegos"
      },
      { indicador: "Partidas totales", valor: cleanExcelValue(totalPlays ?? 0) },
      { indicador: "Partidas completadas", valor: cleanExcelValue(completedGames) },
      { indicador: "Partidas abandonadas", valor: cleanExcelValue(totalAbandoned) },
      {
        indicador: "Juegos distintos",
        valor: cleanExcelValue(isSingleGame ? 1 : selectedChild.summary.gamesPlayed)
      },
      { indicador: "Puntaje promedio", valor: cleanExcelValue(avgScore) },
      {
        indicador: "Aciertos / puntaje acumulado",
        valor: cleanExcelValue(totalScore)
      },
      {
        indicador: "Precisión / tasa de éxito promedio (%)",
        valor: cleanExcelValue(avgSuccessRate)
      },
      { indicador: "Errores acumulados", valor: cleanExcelValue(totalErrors) },
      { indicador: "Errores promedio", valor: cleanExcelValue(avgErrors) },
      { indicador: "Progreso promedio (%)", valor: cleanExcelValue(avgProgress) },
      {
        indicador: "Tiempo acumulado",
        valor:
          totalDurationMs !== null && totalDurationMs !== undefined
            ? formatDuration(totalDurationMs)
            : "No disponible por juego"
      },
      { indicador: "Mejor desempeño", valor: bestGameLabel },
      { indicador: "Mayor dificultad", valor: hardestGameLabel },
      { indicador: "Última actividad", valor: formatExcelDate(activeLastPlayedAt) },
      { indicador: "Fecha de exportación", valor: formatExcelDate(new Date()) }
    ]);

    autosizeRows(summarySheet);
    summarySheet.views = [{ state: "frozen", ySplit: 1 }];

    addImageToSheet(
      workbook,
      summarySheet,
      drawSummaryChartImage({
        studentName: selectedChild.name,
        gameLabel: selectedGameSummary?.gameLabel || "Todos los juegos",
        totalPlays,
        completedGames,
        totalAbandoned,
        avgScore,
        avgSuccessRate,
        totalErrors
      }),
      {
        tl: { col: 3, row: 1 },
        ext: { width: 680, height: 270 }
      }
    );

    const successRows = exportGames.map((game) => ({
      juego: game.gameLabel,
      partidas: game.plays ?? 0,
      completadas:
        game.completedCount ??
        Math.max(0, Number(game.plays || 0) - Number(game.abandonedCount || 0)),
      abandonos: game.abandonedCount ?? 0,
      exito: cleanExcelValue(getSuccessValue(game)),
      puntajePromedio: cleanExcelValue(game.avgScore),
      puntajeAcumulado: cleanExcelValue(getGameTotalScore(game)),
      mejorPuntaje: cleanExcelValue(game.bestScore),
      progreso: cleanExcelValue(game.avgProgressPercent),
      ultima: formatExcelDate(game.lastPlayedAt)
    }));

    const successSheet = workbook.addWorksheet(cleanSheetName("Tasa de éxito por juego"));

    setColumns(successSheet, [
      { header: "Juego", key: "juego", width: 24 },
      { header: "Partidas", key: "partidas", width: 14 },
      { header: "Partidas completadas", key: "completadas", width: 22 },
      { header: "Abandonos", key: "abandonos", width: 14 },
      { header: "Tasa de éxito (%)", key: "exito", width: 20 },
      { header: "Puntaje promedio", key: "puntajePromedio", width: 20 },
      { header: "Aciertos / puntaje acumulado", key: "puntajeAcumulado", width: 28 },
      { header: "Mejor puntaje", key: "mejorPuntaje", width: 18 },
      { header: "Progreso promedio (%)", key: "progreso", width: 22 },
      { header: "Última actividad", key: "ultima", width: 24 }
    ]);

    if (successRows.length) {
      successSheet.addRows(successRows);
    } else {
      successSheet.addRow({ juego: "No hay datos disponibles" });
    }

    autosizeRows(successSheet);
    successSheet.views = [{ state: "frozen", ySplit: 1 }];

    addImageToSheet(
      workbook,
      successSheet,
      drawBarChartImage({
        title: "Tasa de éxito por juego",
        subtitle: "Imagen generada automáticamente con los datos actuales.",
        items: exportGames.map((game) => ({
          ...game,
          successValue: getSuccessValue(game)
        })),
        labelKey: "gameLabel",
        valueKey: "successValue",
        suffix: "%",
        maxFixed: 100
      }),
      {
        tl: { col: 11, row: 1 },
        ext: { width: 700, height: Math.max(300, 130 + exportGames.length * 42) }
      }
    );

    const errorRows = exportGames.map((game) => ({
      juego: game.gameLabel,
      partidas: game.plays ?? 0,
      erroresPromedio: cleanExcelValue(game.avgErrorsCommitted),
      erroresAcumulados: cleanExcelValue(getGameTotalErrors(game)),
      abandonos: game.abandonedCount ?? 0,
      exito: cleanExcelValue(getSuccessValue(game)),
      ultima: formatExcelDate(game.lastPlayedAt)
    }));

    const errorSheet = workbook.addWorksheet(cleanSheetName("Errores promedio por juego"));

    setColumns(errorSheet, [
      { header: "Juego", key: "juego", width: 24 },
      { header: "Partidas", key: "partidas", width: 14 },
      { header: "Errores promedio", key: "erroresPromedio", width: 20 },
      { header: "Errores acumulados", key: "erroresAcumulados", width: 22 },
      { header: "Abandonos", key: "abandonos", width: 14 },
      { header: "Tasa de éxito (%)", key: "exito", width: 20 },
      { header: "Última actividad", key: "ultima", width: 24 }
    ]);

    if (errorRows.length) {
      errorSheet.addRows(errorRows);
    } else {
      errorSheet.addRow({ juego: "No hay datos disponibles" });
    }

    autosizeRows(errorSheet);
    errorSheet.views = [{ state: "frozen", ySplit: 1 }];

    addImageToSheet(
      workbook,
      errorSheet,
      drawBarChartImage({
        title: "Errores promedio por juego",
        subtitle: "Imagen generada automáticamente con los datos actuales.",
        items: exportGames.map((game) => ({
          ...game,
          errorValue: game.avgErrorsCommitted
        })),
        labelKey: "gameLabel",
        valueKey: "errorValue",
        suffix: ""
      }),
      {
        tl: { col: 8, row: 1 },
        ext: { width: 700, height: Math.max(300, 130 + exportGames.length * 42) }
      }
    );

    const today = new Date().toISOString().slice(0, 10);
    const studentName = cleanFileName(selectedChild.name);
    const gameName = cleanFileName(
      selectedGameSummary?.gameLabel || "todos_los_juegos"
    );

    const buffer = await workbook.xlsx.writeBuffer();

    downloadExcelBuffer(
      buffer,
      `reporte_familiar_${studentName}_${gameName}_${today}.xlsx`
    );
    } catch (err) {
      setError(err.message || "No se pudo exportar el Excel.");
    } finally {
      setExportingExcel(false);
    }
  }

  if (loading) {
    return (
      <div className="parent-dashboard">
        <div className="parent-dashboard__header">
          <div>
            <h2 className="parent-dashboard__title">Datos por hijo</h2>
            <p className="parent-dashboard__subtitle">Cargando información…</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="parent-dashboard">
        <div className="parent-empty parent-empty--error">
          <h2>No se pudo cargar el panel</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  if (!data.children.length) {
    return (
      <div className="parent-dashboard">
        <div className="parent-dashboard__header">
          <div>
            <h2 className="parent-dashboard__title">Datos por hijo</h2>
            <p className="parent-dashboard__subtitle">
              Aquí podrá revisar el detalle individual de cada alumno.
            </p>
          </div>
        </div>

        <div className="parent-empty">
          <h2>No hay hijos vinculados</h2>
          <p>
            La cuenta existe, pero todavía no tiene alumnos asociados desde el
            panel del docente.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="parent-dashboard">
      <div className="parent-dashboard__header">
        <div>
          <h2 className="parent-dashboard__title">Datos por hijo</h2>
          <p className="parent-dashboard__subtitle">
            Aquí puede revisar la información específica de cada alumno.
          </p>
        </div>

        <div className="parent-dashboard__badge">{data.parent.name}</div>
      </div>

      <section className="parent-panel parent-filter-panel">
        <div className="parent-panel__header">
          <h2>Filtros de información</h2>
          <span>
            {data.children.length > 1
              ? "Seleccione un alumno y filtre sus resultados por juego"
              : "Filtre la información del alumno por juego"}
          </span>
        </div>

        <div className="parent-filter-grid">
          <div className="parent-select-box">
            <span>Alumno</span>

            {data.children.length > 1 ? (
              <select
                className="parent-select"
                value={selectedChild ? String(selectedChild.id) : ""}
                onChange={handleChildChange}
              >
                {data.children.map((child) => (
                  <option key={child.id} value={String(child.id)}>
                    {child.name}
                  </option>
                ))}
              </select>
            ) : (
              <div className="parent-static-child">
                <strong>{selectedChild?.name}</strong>
              </div>
            )}
          </div>

          <label className="parent-select-box">
            <span>Juego</span>
            <select
              className="parent-select"
              value={effectiveSelectedGameType}
              onChange={(event) => setSelectedGameType(event.target.value)}
              disabled={!gameOptions.length}
            >
              <option value={ALL_GAMES}>Todos los juegos</option>

              {gameOptions.map((game) => (
                <option key={game.gameType} value={game.gameType}>
                  {game.gameLabel}
                </option>
              ))}
            </select>
          </label>

          <div className="parent-export-box">
            <span>Exportación</span>
            <div className="parent-export-actions">
              <button
                type="button"
                className="parent-export-button"
                onClick={handleExportExcel}
                disabled={!selectedChild || exportingExcel}
                title="Exportar reporte del alumno en Excel"
              >
                {exportingExcel ? "Generando..." : "Exportar Excel"}
              </button>

              <button
                type="button"
                className="parent-export-button parent-export-button--pdf"
                onClick={handleExportPdf}
                disabled={!selectedChild || exportingPdf}
                title="Exportar reporte del alumno en PDF"
              >
                {exportingPdf ? "Generando..." : "Exportar PDF"}
              </button>
            </div>
          </div>
        </div>
      </section>

      {selectedChild && (
        <>
          <section className="parent-child-focus">
            <div className="parent-child-focus__header">
              <div>
                <h3>{selectedChild.name}</h3>
                <p>
                  Grupo: <strong>{selectedChild.group}</strong> · Relación:{" "}
                  <strong>{selectedChild.relationLabel}</strong> · Juego:{" "}
                  <strong>
                    {selectedGameSummary?.gameLabel || "Todos los juegos"}
                  </strong>
                </p>
              </div>

              <span className="parent-child-card__last">
                Última actividad: {formatDate(activeLastPlayedAt)}
              </span>
            </div>

            <div className="parent-dashboard__cards parent-dashboard__cards--five">
              {summaryCards.map((card) => (
                <SummaryCard
                  key={card.label}
                  label={card.label}
                  value={card.value}
                />
              ))}
            </div>
          </section>

          <InsightCards bestGame={bestGame} hardestGame={hardestGame} />

          <section className="parent-report-grid">
            <BarList
              title="Tasa de éxito por juego"
              subtitle="Compara el desempeño promedio de los juegos."
              items={visibleGames}
              valueKey="success"
              suffix="%"
              emptyText="No hay datos de éxito para mostrar."
            />

            <BarList
              title="Errores promedio por juego"
              subtitle="Ayuda a ubicar qué actividad genera más dificultad."
              items={visibleGames}
              valueKey="avgErrorsCommitted"
              suffix=""
              emptyText="No hay datos de errores para mostrar."
            />
          </section>

          <LineChart
            title="Progreso por fecha"
            subtitle="Muestra si el desempeño mejora, baja o se mantiene."
            data={activeTimeline}
          />
        </>
      )}
    </div>
  );
}
