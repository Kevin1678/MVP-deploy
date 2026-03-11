import { useState } from "react";
import "../styles/teacherStudents.css";

const emptyParent = {
  firstName: "",
  lastNameP: "",
  lastNameM: "",
  email: "",
  password: ""
};

const initialForm = {
  firstName: "",
  lastNameP: "",
  lastNameM: "",
  email: "",
  password: "",
  group: "1A",
  visualCondition: "NONE",
  auditoryCondition: "NONE",
  fontScale: 100,
  highContrast: false,
  textToSpeechEnabled: false,
  voiceInstructions: false,
  captionsEnabled: true,
  visualAlertsEnabled: true,
  parents: [{ ...emptyParent }]
};

export default function TeacherStudents() {
  const [form, setForm] = useState(initialForm);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  function updateParent(index, field, value) {
    const updatedParents = [...form.parents];
    updatedParents[index] = {
      ...updatedParents[index],
      [field]: value
    };

    setForm({
      ...form,
      parents: updatedParents
    });
  }

  function addParent() {
    if (form.parents.length >= 2) return;

    setForm({
      ...form,
      parents: [...form.parents, { ...emptyParent }]
    });
  }

  function removeParent(index) {
    const updatedParents = form.parents.filter((_, i) => i !== index);

    setForm({
      ...form,
      parents: updatedParents.length ? updatedParents : [{ ...emptyParent }]
    });
  }

  async function onSubmit(e) {
    e.preventDefault();
    setMsg("");
    setLoading(true);

    try {
      const cleanedParents = form.parents.filter(
        (parent) =>
          parent.firstName.trim() ||
          parent.lastNameP.trim() ||
          parent.lastNameM.trim() ||
          parent.email.trim() ||
          parent.password.trim()
      );

      const res = await fetch("/api/teacher/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          fontScale: Number(form.fontScale),
          parents: cleanedParents
        })
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setMsg(data?.message || "No se pudo registrar el alumno.");
        return;
      }

      setMsg("Alumno registrado correctamente.");
      setForm({
        ...initialForm,
        parents: [{ ...emptyParent }]
      });
    } catch {
      setMsg("Error de conexión con el servidor.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="teacher-students">
      <div className="teacher-students__header">
        <h2>Agregar Alumno</h2>
        <p>Registro de alumnos con configuración inicial de accesibilidad.</p>
      </div>

      <form className="teacher-students__form" onSubmit={onSubmit}>
        {/* DATOS DEL ALUMNO */}
        <div className="teacher-students__grid">
          <div className="teacher-field">
            <label>Nombre(s)</label>
            <input
              value={form.firstName}
              onChange={(e) => setForm({ ...form, firstName: e.target.value })}
            />
          </div>

          <div className="teacher-field">
            <label>Apellido paterno</label>
            <input
              value={form.lastNameP}
              onChange={(e) => setForm({ ...form, lastNameP: e.target.value })}
            />
          </div>

          <div className="teacher-field">
            <label>Apellido materno</label>
            <input
              value={form.lastNameM}
              onChange={(e) => setForm({ ...form, lastNameM: e.target.value })}
            />
          </div>

          <div className="teacher-field">
            <label>Correo</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>

          <div className="teacher-field">
            <label>Contraseña</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </div>

          <div className="teacher-field">
            <label>Grupo</label>
            <select
              value={form.group}
              onChange={(e) => setForm({ ...form, group: e.target.value })}
            >
              <option value="1A">1A</option>
              <option value="1B">1B</option>
              <option value="1C">1C</option>
            </select>
          </div>

          <div className="teacher-field">
            <label>Discapacidad visual</label>
            <select
              value={form.visualCondition}
              onChange={(e) => setForm({ ...form, visualCondition: e.target.value })}
            >
              <option value="NONE">Ninguna</option>
              <option value="PROTANOPIA">Protanopia</option>
              <option value="TRITANOPIA">Tritanopia</option>
              <option value="LOW_VISION">Baja visión / ceguera leve</option>
            </select>
          </div>

          <div className="teacher-field">
            <label>Discapacidad auditiva</label>
            <select
              value={form.auditoryCondition}
              onChange={(e) => setForm({ ...form, auditoryCondition: e.target.value })}
            >
              <option value="NONE">Ninguna</option>
              <option value="HARD_OF_HEARING">Hipoacusia</option>
              <option value="DEAF">Sordera</option>
            </select>
          </div>

          <div className="teacher-field">
            <label>Tamaño de texto</label>
            <select
              value={form.fontScale}
              onChange={(e) => setForm({ ...form, fontScale: e.target.value })}
            >
              <option value={100}>100%</option>
              <option value={125}>125%</option>
              <option value={150}>150%</option>
            </select>
          </div>
        </div>

        <div className="teacher-checks">
          <label>
            <input
              type="checkbox"
              checked={form.highContrast}
              onChange={(e) => setForm({ ...form, highContrast: e.target.checked })}
            />
            Alto contraste
          </label>

          <label>
            <input
              type="checkbox"
              checked={form.textToSpeechEnabled}
              onChange={(e) => setForm({ ...form, textToSpeechEnabled: e.target.checked })}
            />
            Texto a voz
          </label>

          <label>
            <input
              type="checkbox"
              checked={form.voiceInstructions}
              onChange={(e) => setForm({ ...form, voiceInstructions: e.target.checked })}
            />
            Instrucciones por voz
          </label>

          <label>
            <input
              type="checkbox"
              checked={form.captionsEnabled}
              onChange={(e) => setForm({ ...form, captionsEnabled: e.target.checked })}
            />
            Subtítulos
          </label>

          <label>
            <input
              type="checkbox"
              checked={form.visualAlertsEnabled}
              onChange={(e) => setForm({ ...form, visualAlertsEnabled: e.target.checked })}
            />
            Alertas visuales
          </label>
        </div>

        {/* PADRES O TUTORES */}
        <div className="teacher-parents">
          <div className="teacher-parents__header">
            <h3>Padres o tutores</h3>

            {form.parents.length < 2 && (
              <button
                type="button"
                className="teacher-students__submit"
                onClick={addParent}
              >
                Agregar padre/madre
              </button>
            )}
          </div>

          {form.parents.map((parent, index) => (
            <div key={index} className="teacher-parent-card">
              <div className="teacher-parent-card__top">
                <h4>Padre/Madre #{index + 1}</h4>

                {form.parents.length > 1 && (
                  <button
                    type="button"
                    className="teacher-parent-card__remove"
                    onClick={() => removeParent(index)}
                  >
                    Quitar
                  </button>
                )}
              </div>

              <div className="teacher-students__grid">
                <div className="teacher-field">
                  <label>Nombre(s)</label>
                  <input
                    value={parent.firstName}
                    onChange={(e) => updateParent(index, "firstName", e.target.value)}
                  />
                </div>

                <div className="teacher-field">
                  <label>Apellido paterno</label>
                  <input
                    value={parent.lastNameP}
                    onChange={(e) => updateParent(index, "lastNameP", e.target.value)}
                  />
                </div>

                <div className="teacher-field">
                  <label>Apellido materno</label>
                  <input
                    value={parent.lastNameM}
                    onChange={(e) => updateParent(index, "lastNameM", e.target.value)}
                  />
                </div>

                <div className="teacher-field">
                  <label>Correo</label>
                  <input
                    type="email"
                    value={parent.email}
                    onChange={(e) => updateParent(index, "email", e.target.value)}
                  />
                </div>

                <div className="teacher-field">
                  <label>Contraseña inicial</label>
                  <input
                    type="password"
                    value={parent.password}
                    onChange={(e) => updateParent(index, "password", e.target.value)}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="teacher-students__actions">
          <button
            type="submit"
            className="teacher-students__submit"
            disabled={loading}
          >
            {loading ? "Guardando..." : "Registrar alumno"}
          </button>
        </div>

        {msg && <div className="teacher-students__message">{msg}</div>}
      </form>
    </div>
  );
}