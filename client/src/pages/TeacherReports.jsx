import { useEffect, useMemo, useState } from "react";
import "../styles/teacherReports.css";

const GAME_OPTIONS = [
  { value: "ALL", label: "Todos los juegos" },
  { value: "MEMORAMA", label: "Memorama" },
  { value: "COUNT_PICK", label: "Contar y elegir" },
  { value: "LIGHTS_SEQUENCE", label: "Secuencia de luces" },
];

function formatMetric(value, suffix = "") {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `${value}${suffix}`;
}

function formatMs(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  if (value >= 1000) return `${(value / 1000).toFixed(1)} s`;
  return `${Math.round(value)} ms`;
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
  const cleanItems = items.filter((item) => typeof item[valueKey] === "number");
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
              <div className="teacher-report-bars__row" key={`${title}-${item.gameType || item.student || item.date}`}>
                <div className="teacher-report-bars__top">
                  <span>{item.gameLabel || item.student || item.date}</span>
                  <strong>{formatMetric(value, suffix)}</strong>
                </div>
                <div className="teacher-report-bars__track">
                  <div className="teacher-report-bars__fill" style={{ width: `${width}%` }} />
                </div>
                <small>
                  {item.games ?? 0} partidas
                  {typeof item.abandonedGames === "number" ? ` · ${item.abandonedGames} abandonos` : ""}
                </small>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="teacher-report-empty">{emptyText || "No hay datos suficientes."}</div>
      )}
    </article>
  );
}

function LineChart({ title, subtitle, data }) {
  const points = data.filter((item) => typeof item.avgSuccessRate === "number");
  const width = 640;
  const height = 220;
  const pad = 28;

  const polyline = useMemo(() => {
    if (!points.length) return "";

    const maxIndex = Math.max(1, points.length - 1);

    return points
      .map((item, index) => {
        const x = pad + (index / maxIndex) * (width - pad * 2);
        const y = height - pad - ((item.avgSuccessRate || 0) / 100) * (height - pad * 2);
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
          <svg className="teacher-report-line" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={title}>
            <line x1={pad} y1={height - pad} x2={width - pad} y2={height - pad} />
            <line x1={pad} y1={pad} x2={pad} y2={height - pad} />
            <polyline points={polyline} />
            {points.map((item, index) => {
              const maxIndex = Math.max(1, points.length - 1);
              const x = pad + (index / maxIndex) * (width - pad * 2);
              const y = height - pad - ((item.avgSuccessRate || 0) / 100) * (height - pad * 2);
              return <circle key={item.date} cx={x} cy={y} r="4" />;
            })}
          </svg>

          <div className="teacher-report-line__legend">
            <span>{formatDate(points[0]?.date)}</span>
            <span>{formatDate(points[points.length - 1]?.date)}</span>
          </div>
        </div>
      ) : (
        <div className="teacher-report-empty">No hay suficientes partidas para mostrar progreso.</div>
      )}
    </article>
  );
}

export default function TeacherReports() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
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
        const json = await res.json();

        if (!res.ok) {
          throw new Error(json.message || "No se pudo cargar el reporte docente.");
        }

        if (active) setReport(json);
      } catch (err) {
        if (active) setError(err.message || "No se pudo cargar el reporte docente.");
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
    setFilters((prev) => ({ ...prev, [name]: value }));
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

  const studentsBySelectedGroup = useMemo(() => {
    const students = report?.filters?.students || [];
    if (filters.group === "ALL") return students;
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
        <div className="teacher-report-empty teacher-report-empty--error">{error}</div>
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
            Seguimiento de desempeño por alumno, juego, fecha, errores, progreso y abandono.
          </p>
        </div>
        <div className="teacher-report-header__teacher">{report.teacher.name}</div>
      </header>

      <section className="teacher-report-filters">
        <label>
          Desde
          <input type="date" value={filters.from} onChange={(e) => updateFilter("from", e.target.value)} />
        </label>

        <label>
          Hasta
          <input type="date" value={filters.to} onChange={(e) => updateFilter("to", e.target.value)} />
        </label>

        <label>
          Grupo
          <select value={filters.group} onChange={(e) => updateFilter("group", e.target.value)}>
            <option value="ALL">Todos los grupos</option>
            {(report.filters.groups || []).map((group) => (
              <option key={group.id} value={group.name}>Grupo {group.name}</option>
            ))}
          </select>
        </label>

        <label>
          Alumno
          <select value={filters.studentId} onChange={(e) => updateFilter("studentId", e.target.value)}>
            <option value="ALL">Todos los alumnos</option>
            {studentsBySelectedGroup.map((student) => (
              <option key={student.id} value={student.id}>{student.name}</option>
            ))}
          </select>
        </label>

        <label>
          Juego
          <select value={filters.gameType} onChange={(e) => updateFilter("gameType", e.target.value)}>
            {GAME_OPTIONS.map((game) => (
              <option key={game.value} value={game.value}>{game.label}</option>
            ))}
          </select>
        </label>

        <button type="button" onClick={clearFilters}>Limpiar filtros</button>
      </section>

      {error && <div className="teacher-report-empty teacher-report-empty--error">{error}</div>}

      <section className="teacher-report-cards">
        <SummaryCard label="Alumnos" value={report.summary.totalStudents} hint="según filtros" />
        <SummaryCard label="Partidas" value={report.summary.totalGames} hint={`${report.summary.completedGames} completadas`} />
        <SummaryCard label="Tasa de éxito" value={formatMetric(report.summary.avgSuccessRate, "%")} hint="promedio general" />
        <SummaryCard label="Errores" value={formatMetric(report.summary.avgErrorsCommitted)} hint="promedio por partida" />
        <SummaryCard label="Reacción" value={formatMs(report.summary.avgReactionTimeMs)} hint="promedio" />
        <SummaryCard label="Abandono" value={formatMetric(report.summary.abandonmentRate, "%")} hint={`${report.summary.abandonedGames} partidas`} />
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
          items={report.byGame}
          valueKey="avgSuccessRate"
        />

        <BarList
          title="Errores promedio por juego"
          subtitle="Ayuda a ubicar qué actividad genera más dificultad."
          items={report.byGame}
          valueKey="avgErrorsCommitted"
          suffix=""
        />
      </section>

      <LineChart
        title="Progreso por fecha"
        subtitle="Muestra si el desempeño mejora, baja o se mantiene."
        data={report.timeline}
      />

      {report.attentionStudents.length > 0 && (
        <section className="teacher-report-panel">
          <div className="teacher-report-panel__header">
            <div>
              <h3>Alumnos que requieren revisión</h3>
              <p>Baja tasa de éxito o abandono alto. No es diagnóstico, solo una señal para revisar.</p>
            </div>
          </div>

          <div className="teacher-report-attention">
            {report.attentionStudents.map((student) => (
              <article key={student.id}>
                <strong>{student.student}</strong>
                <span>{student.group}</span>
                <small>
                  Éxito: {formatMetric(student.avgSuccessRate, "%")} · Abandono: {formatMetric(student.abandonmentRate, "%")}
                </small>
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="teacher-report-panel teacher-report-panel--table">
        <div className="teacher-report-panel__header">
          <div>
            <h3>Resumen por alumno</h3>
            <p>Ordenado por cantidad de partidas.</p>
          </div>
        </div>

        {report.byStudent.length ? (
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
                  <th>Abandono</th>
                  <th>Última actividad</th>
                </tr>
              </thead>
              <tbody>
                {report.byStudent.map((student) => (
                  <tr key={student.id}>
                    <td>{student.student}</td>
                    <td>{student.group}</td>
                    <td>{student.games}</td>
                    <td>{formatMetric(student.avgSuccessRate, "%")}</td>
                    <td>{formatMetric(student.avgProgressPercent, "%")}</td>
                    <td>{formatMetric(student.avgErrorsCommitted)}</td>
                    <td>{formatMs(student.avgReactionTimeMs)}</td>
                    <td>{formatMetric(student.abandonmentRate, "%")}</td>
                    <td>{formatDate(student.lastActivity)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="teacher-report-empty">No hay alumnos con resultados para estos filtros.</div>
        )}
      </section>

      <section className="teacher-report-panel teacher-report-panel--table">
        <div className="teacher-report-panel__header">
          <div>
            <h3>Partidas recientes</h3>
            <p>Últimos 15 registros con los filtros aplicados.</p>
          </div>
        </div>

        {report.recentResults.length ? (
          <div className="teacher-report-table-wrap">
            <table className="teacher-report-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Alumno</th>
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
                    <td>{result.student}</td>
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
          <div className="teacher-report-empty">No hay partidas recientes para estos filtros.</div>
        )}
      </section>
    </div>
  );
}
