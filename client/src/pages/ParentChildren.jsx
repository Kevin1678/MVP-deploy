import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
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

function autoSizeColumns(sheet, rows) {
  const headers = Object.keys(rows[0] || {});

  sheet["!cols"] = headers.map((header) => {
    const maxLength = Math.max(
      String(header).length,
      ...rows.map((row) => String(row[header] ?? "").length)
    );

    return { wch: Math.min(Math.max(maxLength + 2, 14), 45) };
  });
}

function appendJsonSheet(workbook, rows, sheetName) {
  const safeRows = rows.length ? rows : [{ Mensaje: "No hay datos disponibles." }];
  const sheet = XLSX.utils.json_to_sheet(safeRows);

  autoSizeColumns(sheet, safeRows);

  XLSX.utils.book_append_sheet(workbook, sheet, cleanSheetName(sheetName));
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

  function handleExportExcel() {
    if (!selectedChild) return;

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

    const generalRows = [
      { Indicador: "Alumno", Valor: selectedChild.name },
      { Indicador: "Grupo", Valor: selectedChild.group },
      { Indicador: "Relación", Valor: selectedChild.relationLabel },
      {
        Indicador: "Juego filtrado",
        Valor: selectedGameSummary?.gameLabel || "Todos los juegos"
      },
      { Indicador: "Partidas totales", Valor: totalPlays ?? 0 },
      { Indicador: "Partidas completadas", Valor: completedGames },
      { Indicador: "Partidas abandonadas", Valor: totalAbandoned },
      {
        Indicador: "Juegos distintos",
        Valor: isSingleGame ? 1 : selectedChild.summary.gamesPlayed
      },
      { Indicador: "Puntaje promedio", Valor: excelValue(avgScore) },
      {
        Indicador: "Aciertos / puntaje acumulado",
        Valor: excelValue(totalScore)
      },
      {
        Indicador: "Precisión / tasa de éxito promedio",
        Valor:
          avgSuccessRate !== null && avgSuccessRate !== undefined
            ? `${avgSuccessRate}%`
            : "Sin datos"
      },
      { Indicador: "Errores acumulados", Valor: excelValue(totalErrors) },
      { Indicador: "Errores promedio", Valor: excelValue(avgErrors) },
      {
        Indicador: "Progreso promedio",
        Valor:
          avgProgress !== null && avgProgress !== undefined
            ? `${avgProgress}%`
            : "Sin datos"
      },
      {
        Indicador: "Tiempo acumulado",
        Valor:
          totalDurationMs !== null && totalDurationMs !== undefined
            ? formatDuration(totalDurationMs)
            : "No disponible por juego"
      },
      { Indicador: "Mejor desempeño", Valor: bestGameLabel },
      { Indicador: "Mayor dificultad", Valor: hardestGameLabel },
      { Indicador: "Última actividad", Valor: formatExcelDate(activeLastPlayedAt) },
      { Indicador: "Fecha de exportación", Valor: formatExcelDate(new Date()) }
    ];

    const successRows = exportGames.map((game) => ({
      Juego: game.gameLabel,
      Partidas: game.plays ?? 0,
      "Partidas completadas":
        game.completedCount ??
        Math.max(0, Number(game.plays || 0) - Number(game.abandonedCount || 0)),
      Abandonos: game.abandonedCount ?? 0,
      "Tasa de éxito (%)": excelValue(getSuccessValue(game)),
      "Puntaje promedio": excelValue(game.avgScore),
      "Aciertos / puntaje acumulado": excelValue(getGameTotalScore(game)),
      "Mejor puntaje": excelValue(game.bestScore),
      "Progreso promedio (%)": excelValue(game.avgProgressPercent),
      "Última actividad": formatExcelDate(game.lastPlayedAt)
    }));

    const errorRows = exportGames.map((game) => ({
      Juego: game.gameLabel,
      Partidas: game.plays ?? 0,
      "Errores promedio": excelValue(game.avgErrorsCommitted),
      "Errores acumulados": excelValue(getGameTotalErrors(game)),
      Abandonos: game.abandonedCount ?? 0,
      "Tasa de éxito (%)": excelValue(getSuccessValue(game)),
      "Última actividad": formatExcelDate(game.lastPlayedAt)
    }));

    const workbook = XLSX.utils.book_new();

    appendJsonSheet(workbook, generalRows, "Resultados generales");
    appendJsonSheet(workbook, successRows, "Tasa de éxito por juego");
    appendJsonSheet(workbook, errorRows, "Errores promedio por juego");

    const today = new Date().toISOString().slice(0, 10);
    const studentName = cleanFileName(selectedChild.name);
    const gameName = cleanFileName(
      selectedGameSummary?.gameLabel || "todos_los_juegos"
    );

    XLSX.writeFile(
      workbook,
      `reporte_familiar_${studentName}_${gameName}_${today}.xlsx`
    );
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
            <button
              type="button"
              className="parent-export-button"
              onClick={handleExportExcel}
              disabled={!selectedChild}
              title="Exportar reporte del alumno en Excel"
            >
              Exportar Excel
            </button>
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
