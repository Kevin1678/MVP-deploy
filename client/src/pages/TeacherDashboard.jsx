import { useEffect, useMemo, useState } from "react";
import "../styles/teacherDashboard.css";

function formatMetric(value, suffix = "") {
  return value === null || value === undefined ? "—" : `${value}${suffix}`;
}

function formatDate(value) {
  if (!value) return "Sin registros";

  try {
    return new Intl.DateTimeFormat("es-MX", {
      dateStyle: "medium"
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export default function TeacherDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const res = await fetch("/api/teacher/dashboard");
        const json = await res.json();

        if (!res.ok) {
          throw new Error(json.message || "No se pudo cargar el panel.");
        }

        if (active) {
          setData(json);
        }
      } catch (err) {
        if (active) {
          setError(err.message || "No se pudo cargar el panel.");
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

  const summaryCards = useMemo(() => {
    if (!data) return [];

    return [
      {
        label: "Alumnos inscritos",
        value: data.summary.totalStudents
      },
      {
        label: "Grupos activos",
        value: data.summary.totalGroups
      },
      {
        label: "Partidas registradas",
        value: data.summary.totalGames
      },
      {
        label: "Promedio general",
        value: formatMetric(data.summary.avgPerformance, "%")
      }
    ];
  }, [data]);

  if (loading) {
    return (
      <div className="teacher-dashboard">
        <div className="teacher-dashboard__header">
          <div>
            <h2 className="teacher-dashboard__title">Resumen general</h2>
            <p className="teacher-dashboard__subtitle">
              Cargando información real del docente...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="teacher-dashboard">
        <div className="teacher-empty teacher-empty--error">
          <h2>No se pudo cargar el panel</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="teacher-dashboard">
      <div className="teacher-dashboard__header">
        <div>
          <h2 className="teacher-dashboard__title">Resumen general</h2>
          <p className="teacher-dashboard__subtitle">
            Resultados reales de alumnos y grupos.
          </p>
        </div>

        <div className="teacher-dashboard__badge">{data.teacher.name}</div>
      </div>

      <section className="teacher-dashboard__cards">
        {summaryCards.map((card) => (
          <article key={card.label} className="teacher-card">
            <span className="teacher-card__label">{card.label}</span>
            <strong className="teacher-card__value">{card.value}</strong>
          </article>
        ))}
      </section>

      <section className="teacher-dashboard__grid">
        <article className="teacher-panel">
          <div className="teacher-panel__header">
            <h2>Promedio por grupo</h2>
            <span>
              Última actividad: {formatDate(data.summary.lastActivity)}
            </span>
          </div>

          {data.groupStats.length ? (
            <div className="teacher-bars">
              {data.groupStats.map((item) => (
                <div key={item.name} className="teacher-bars__row">
                  <div className="teacher-bars__top">
                    <span>{item.name}</span>
                    <span>{formatMetric(item.avgPerformance, "%")}</span>
                  </div>

                  <div className="teacher-bars__track">
                    <div
                      className="teacher-bars__fill"
                      style={{ width: `${item.avgPerformance ?? 0}%` }}
                    />
                  </div>

                  <div className="teacher-bars__meta">
                    <small>
                      {item.games} partidas · {item.students} alumnos
                    </small>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="teacher-empty">
              <p>No hay grupos con actividad todavía.</p>
            </div>
          )}
        </article>

        <article className="teacher-panel">
          <div className="teacher-panel__header">
            <h2>Resumen por grupo</h2>
            <span>Datos reales</span>
          </div>

          {data.groupStats.length ? (
            <div className="teacher-subject-list">
              {data.groupStats.map((item) => (
                <div key={item.name} className="teacher-subject-item">
                  <div>
                    <strong>Grupo {item.name}</strong>
                    <p>
                      {item.students} alumnos · {item.games} partidas
                    </p>
                  </div>

                  <div className="teacher-subject-item__score">
                    {formatMetric(item.avgPerformance, "%")}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="teacher-empty">
              <p>No hay datos suficientes para mostrar grupos.</p>
            </div>
          )}
        </article>
      </section>

      <section className="teacher-panel teacher-panel--table">
        <div className="teacher-panel__header">
          <h2>Resultados generales de alumnos</h2>
          <span>Total mostrados: {data.studentResults.length}</span>
        </div>

        {data.studentResults.length ? (
          <div className="teacher-table-wrap">
            <table className="teacher-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Alumno</th>
                  <th>Grupo</th>
                  <th>Promedio</th>
                  <th>Partidas</th>
                  <th>Última actividad</th>
                </tr>
              </thead>
              <tbody>
                {data.studentResults.map((row) => (
                  <tr key={row.id}>
                    <td>{row.id}</td>
                    <td>{row.student}</td>
                    <td>{row.group}</td>
                    <td>{formatMetric(row.avgPerformance, "%")}</td>
                    <td>{row.games}</td>
                    <td>{formatDate(row.lastActivity)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="teacher-empty">
            <p>Este docente todavía no tiene alumnos con partidas registradas.</p>
          </div>
        )}
      </section>
    </div>
  );
}
