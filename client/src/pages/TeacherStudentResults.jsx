import { useEffect, useMemo, useState } from "react";
import "../styles/teacherDashboard.css";
import "../styles/teacherStudentResults.css";

function formatMetric(value, suffix = "") {
  return value === null || value === undefined ? "—" : `${value}${suffix}`;
}

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

function formatDuration(ms) {
  if (!ms || ms < 0) return "—";

  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (!minutes) return `${seconds}s`;

  return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
}

export default function TeacherStudentResults() {
  const [data, setData] = useState(null);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const res = await fetch("/api/teacher/student-results");
        const json = await res.json();

        if (!res.ok) {
          throw new Error(json.message || "No se pudieron cargar los resultados.");
        }

        if (!active) return;

        setData(json);

        if (json.students?.length) {
          setSelectedStudentId(String(json.students[0].id));
        }
      } catch (err) {
        if (active) {
          setError(err.message || "No se pudieron cargar los resultados.");
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

  const selectedStudent = useMemo(() => {
    if (!data?.students?.length) return null;

    return (
      data.students.find(
        (student) => String(student.id) === String(selectedStudentId)
      ) || data.students[0]
    );
  }, [data, selectedStudentId]);

  const summaryCards = useMemo(() => {
    if (!selectedStudent) return [];

    return [
      {
        label: "Partidas registradas",
        value: selectedStudent.summary.totalResults
      },
      {
        label: "Juegos distintos",
        value: selectedStudent.summary.gamesPlayed
      },
      {
        label: "Puntaje promedio",
        value: formatMetric(selectedStudent.summary.avgScore)
      },
      {
        label: "Precisión promedio",
        value: formatMetric(selectedStudent.summary.avgAccuracy, "%")
      },
      {
        label: "Tiempo acumulado",
        value: formatDuration(selectedStudent.summary.totalDurationMs)
      }
    ];
  }, [selectedStudent]);

  if (loading) {
    return (
      <div className="teacher-dashboard">
        <div className="teacher-dashboard__header">
          <div>
            <h2 className="teacher-dashboard__title">Resultados por alumno</h2>
            <p className="teacher-dashboard__subtitle">
              Cargando información individual...
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
          <h2>No se pudo cargar la información</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  if (!data.students.length) {
    return (
      <div className="teacher-dashboard">
        <div className="teacher-dashboard__header">
          <div>
            <h2 className="teacher-dashboard__title">Resultados por alumno</h2>
            <p className="teacher-dashboard__subtitle">
              Aquí se mostrará el detalle individual de cada alumno.
            </p>
          </div>

          <div className="teacher-dashboard__badge">{data.teacher.name}</div>
        </div>

        <div className="teacher-empty">
          <h2>No hay alumnos registrados</h2>
          <p>
            Primero registra alumnos desde la sección “Agregar alumno”.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="teacher-dashboard">
      <div className="teacher-dashboard__header">
        <div>
          <h2 className="teacher-dashboard__title">Resultados por alumno</h2>
          <p className="teacher-dashboard__subtitle">
            Consulta el desempeño individual de cada alumno registrado.
          </p>
        </div>

        <div className="teacher-dashboard__badge">{data.teacher.name}</div>
      </div>

      <section className="teacher-panel teacher-student-filter-panel">
        <div className="teacher-panel__header">
          <h2>Seleccionar alumno</h2>
          <span>
            {data.students.length > 1
              ? "Usa el filtro para cambiar de alumno"
              : "Solo hay un alumno registrado"}
          </span>
        </div>

        <div className="teacher-student-filter-grid">
          <label className="teacher-student-select-box">
            <span>Alumno</span>

            <select
              className="teacher-student-select"
              value={selectedStudent ? String(selectedStudent.id) : ""}
              onChange={(e) => setSelectedStudentId(e.target.value)}
            >
              {data.students.map((student) => (
                <option key={student.id} value={String(student.id)}>
                  {student.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {selectedStudent && (
        <>
          <section className="teacher-student-focus">
            <div className="teacher-student-focus__header">
              <div>
                <h3>{selectedStudent.name}</h3>
                <p>
                  Grupo: <strong>{selectedStudent.group}</strong> · Correo:{" "}
                  <strong>{selectedStudent.email}</strong>
                </p>
              </div>

              <span className="teacher-student-last">
                Última actividad:{" "}
                {formatDate(selectedStudent.summary.lastPlayedAt)}
              </span>
            </div>

            <div className="teacher-dashboard__cards teacher-dashboard__cards--five">
              {summaryCards.map((card) => (
                <article key={card.label} className="teacher-card">
                  <span className="teacher-card__label">{card.label}</span>
                  <strong className="teacher-card__value">{card.value}</strong>
                </article>
              ))}
            </div>
          </section>

          <div className="teacher-student-sections">
            <section className="teacher-panel">
              <div className="teacher-panel__header">
                <h2>Resumen por juego</h2>
                <span>{selectedStudent.byGame.length} juegos con registros</span>
              </div>

              {selectedStudent.byGame.length ? (
                <div className="teacher-table-wrap">
                  <table className="teacher-table">
                    <thead>
                      <tr>
                        <th>Juego</th>
                        <th>Partidas</th>
                        <th>Promedio</th>
                        <th>Mejor puntaje</th>
                        <th>Precisión promedio</th>
                        <th>Última vez</th>
                      </tr>
                    </thead>

                    <tbody>
                      {selectedStudent.byGame.map((game) => (
                        <tr key={game.gameType}>
                          <td>{game.gameLabel}</td>
                          <td>{game.plays}</td>
                          <td>{formatMetric(game.avgScore)}</td>
                          <td>{game.bestScore ?? "—"}</td>
                          <td>{formatMetric(game.avgAccuracy, "%")}</td>
                          <td>{formatDate(game.lastPlayedAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="teacher-empty">
                  <p>Este alumno todavía no tiene partidas registradas.</p>
                </div>
              )}
            </section>

            <section className="teacher-panel">
              <div className="teacher-panel__header">
                <h2>Partidas recientes</h2>
                <span>Máximo 10 registros</span>
              </div>

              {selectedStudent.recentResults.length ? (
                <div className="teacher-table-wrap teacher-student-recent-table">
                  <table className="teacher-table">
                    <thead>
                      <tr>
                        <th>Juego</th>
                        <th>Nivel</th>
                        <th>Puntaje</th>
                        <th>Movimientos</th>
                        <th>Intentos</th>
                        <th>Precisión</th>
                        <th>Duración</th>
                        <th>Fecha</th>
                      </tr>
                    </thead>

                    <tbody>
                      {selectedStudent.recentResults.map((result) => (
                        <tr key={result.id}>
                          <td>{result.gameLabel}</td>
                          <td>{result.level || "—"}</td>
                          <td>{result.score ?? "—"}</td>
                          <td>{result.moves ?? "—"}</td>
                          <td>{result.attempts ?? "—"}</td>
                          <td>{formatMetric(result.accuracy, "%")}</td>
                          <td>{formatDuration(result.durationMs)}</td>
                          <td>{formatDate(result.playedAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="teacher-empty">
                  <p>Este alumno todavía no tiene actividad reciente.</p>
                </div>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}