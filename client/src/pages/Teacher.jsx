import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../admin.css";

const initialForm = {
  firstName: "",
  lastNameP: "",
  lastNameM: "",
  email: "",
  password: "",
  visualCondition: "NONE",
  auditoryCondition: "NONE",
  fontScale: 100,
  highContrast: false,
  textToSpeechEnabled: false,
  voiceInstructions: false,
  captionsEnabled: true,
  visualAlertsEnabled: true
};

export default function Teacher() {
  const nav = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [students, setStudents] = useState([]);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  async function loadStudents() {
    setLoading(true);
    setMsg("");
    try {
      const res = await fetch("/api/teacher/students");
      const data = await res.json().catch(() => []);
      if (!res.ok) {
        setMsg("No se pudieron cargar los alumnos.");
        return;
      }
      setStudents(data);
    } finally {
      setLoading(false);
    }
  }

  async function createStudent(e) {
    e.preventDefault();
    setCreating(true);
    setMsg("");

    try {
      const res = await fetch("/api/teacher/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          fontScale: Number(form.fontScale)
        })
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setMsg(data?.message || "Error al crear alumno");
        return;
      }

      setMsg("Alumno creado correctamente");
      setForm(initialForm);
      await loadStudents();
    } finally {
      setCreating(false);
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    nav("/", { replace: true });
  }

  useEffect(() => {
    loadStudents();
  }, []);

  return (
    <div className="adminWrap">
      <div className="adminTop">
        <h2 style={{ margin: 0 }}>Panel Docente</h2>
        <button className="btn" onClick={logout}>Cerrar sesión</button>
      </div>

      <div className="adminGrid">
        <div className="adminCard">
          <h3>Registrar alumno</h3>

          <form onSubmit={createStudent} className="adminForm">
            <div className="adminField">
              <label>Nombre(s)</label>
              <input value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} />
            </div>

            <div className="adminField">
              <label>Apellido paterno</label>
              <input value={form.lastNameP} onChange={e => setForm({ ...form, lastNameP: e.target.value })} />
            </div>

            <div className="adminField">
              <label>Apellido materno</label>
              <input value={form.lastNameM} onChange={e => setForm({ ...form, lastNameM: e.target.value })} />
            </div>

            <div className="adminField">
              <label>Correo</label>
              <input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            </div>

            <div className="adminField">
              <label>Contraseña</label>
              <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
            </div>

            <hr />

            <div className="adminField">
              <label>Discapacidad visual</label>
              <select
                value={form.visualCondition}
                onChange={e => setForm({ ...form, visualCondition: e.target.value })}
              >
                <option value="NONE">Ninguna</option>
                <option value="PROTANOPIA">Protanopia</option>
                <option value="TRITANOPIA">Tritanopia</option>
                <option value="LOW_VISION">Baja visión / ceguera leve</option>
              </select>
            </div>

            <div className="adminField">
              <label>Discapacidad auditiva</label>
              <select
                value={form.auditoryCondition}
                onChange={e => setForm({ ...form, auditoryCondition: e.target.value })}
              >
                <option value="NONE">Ninguna</option>
                <option value="HARD_OF_HEARING">Hipoacusia</option>
                <option value="DEAF">Sordera</option>
              </select>
            </div>

            <div className="adminField">
              <label>Tamaño de texto</label>
              <select
                value={form.fontScale}
                onChange={e => setForm({ ...form, fontScale: e.target.value })}
              >
                <option value={100}>100%</option>
                <option value={125}>125%</option>
                <option value={150}>150%</option>
              </select>
            </div>

            <label><input type="checkbox" checked={form.highContrast} onChange={e => setForm({ ...form, highContrast: e.target.checked })} /> Alto contraste</label>
            <label><input type="checkbox" checked={form.textToSpeechEnabled} onChange={e => setForm({ ...form, textToSpeechEnabled: e.target.checked })} /> Texto a voz</label>
            <label><input type="checkbox" checked={form.voiceInstructions} onChange={e => setForm({ ...form, voiceInstructions: e.target.checked })} /> Instrucciones por voz</label>
            <label><input type="checkbox" checked={form.captionsEnabled} onChange={e => setForm({ ...form, captionsEnabled: e.target.checked })} /> Subtítulos / texto visible</label>
            <label><input type="checkbox" checked={form.visualAlertsEnabled} onChange={e => setForm({ ...form, visualAlertsEnabled: e.target.checked })} /> Alertas visuales</label>

            <button className="btn btnPrimary" disabled={creating}>
              {creating ? "Creando..." : "Crear alumno"}
            </button>

            {msg && <div className="notice">{msg}</div>}
          </form>
        </div>

        <div className="adminCard">
          <div className="tableHeader">
            <h3 style={{ margin: 0 }}>Mis alumnos</h3>
            <button className="btn" onClick={loadStudents} disabled={loading}>
              {loading ? "Cargando..." : "Refrescar"}
            </button>
          </div>

          <div className="tableWrap">
            <table className="table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nombre</th>
                  <th>Email</th>
                  <th>Visual</th>
                  <th>Auditiva</th>
                  <th>Texto</th>
                </tr>
              </thead>
              <tbody>
                {students.map(s => (
                  <tr key={s.id}>
                    <td>{s.id}</td>
                    <td>{s.firstName} {s.lastNameP} {s.lastNameM || ""}</td>
                    <td>{s.email}</td>
                    <td>{s.studentProfile?.visualCondition || "NONE"}</td>
                    <td>{s.studentProfile?.auditoryCondition || "NONE"}</td>
                    <td>{s.studentProfile?.fontScale || 100}%</td>
                  </tr>
                ))}
                {students.length === 0 && (
                  <tr>
                    <td colSpan={6} className="emptyRow">Sin alumnos registrados</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}