import { useEffect, useState } from "react";
import "../styles/teacherParents.css";

const emptyParent = {
  enabled: false,
  mode: "create",
  firstName: "",
  lastNameP: "",
  lastNameM: "",
  email: "",
  password: "",
  searchText: ""
};

export default function TeacherParents() {
  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const [searching, setSearching] = useState({
    father: false,
    mother: false
  });

  const [matches, setMatches] = useState({
    father: [],
    mother: []
  });

  const [form, setForm] = useState({
    studentId: "",
    father: { ...emptyParent },
    mother: { ...emptyParent }
  });

  useEffect(() => {
    async function loadStudents() {
      setLoadingStudents(true);
      setMsg("");

      try {
        const res = await fetch("/api/teacher/students");
        const data = await res.json().catch(() => []);

        if (!res.ok) {
          setMsg(data?.message || "No se pudieron cargar los alumnos.");
          return;
        }

        setStudents(Array.isArray(data) ? data : []);
      } catch {
        setMsg("Error de conexión al cargar alumnos.");
      } finally {
        setLoadingStudents(false);
      }
    }

    loadStudents();
  }, []);

  useEffect(() => {
    const parent = form.father;

    if (!parent.enabled || parent.mode !== "link") {
      setMatches((prev) => ({ ...prev, father: [] }));
      return;
    }

    const q = parent.searchText.trim();
    if (q.length < 2) {
      setMatches((prev) => ({ ...prev, father: [] }));
      return;
    }

    const timer = setTimeout(async () => {
      setSearching((prev) => ({ ...prev, father: true }));

      try {
        const res = await fetch(
          `/api/teacher/parents/search?q=${encodeURIComponent(q)}`
        );
        const data = await res.json().catch(() => []);

        if (res.ok) {
          setMatches((prev) => ({
            ...prev,
            father: Array.isArray(data) ? data : []
          }));
        }
      } catch {
        setMatches((prev) => ({ ...prev, father: [] }));
      } finally {
        setSearching((prev) => ({ ...prev, father: false }));
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [form.father.enabled, form.father.mode, form.father.searchText]);

  useEffect(() => {
    const parent = form.mother;

    if (!parent.enabled || parent.mode !== "link") {
      setMatches((prev) => ({ ...prev, mother: [] }));
      return;
    }

    const q = parent.searchText.trim();
    if (q.length < 2) {
      setMatches((prev) => ({ ...prev, mother: [] }));
      return;
    }

    const timer = setTimeout(async () => {
      setSearching((prev) => ({ ...prev, mother: true }));

      try {
        const res = await fetch(
          `/api/teacher/parents/search?q=${encodeURIComponent(q)}`
        );
        const data = await res.json().catch(() => []);

        if (res.ok) {
          setMatches((prev) => ({
            ...prev,
            mother: Array.isArray(data) ? data : []
          }));
        }
      } catch {
        setMatches((prev) => ({ ...prev, mother: [] }));
      } finally {
        setSearching((prev) => ({ ...prev, mother: false }));
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [form.mother.enabled, form.mother.mode, form.mother.searchText]);

  function updateParent(section, field, value) {
    setForm((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  }

  function selectExistingParent(section, parent) {
    setForm((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        searchText: parent.fullName,
        email: parent.email
      }
    }));

    setMatches((prev) => ({
      ...prev,
      [section]: []
    }));
  }

  function buildParentPayload(parent) {
    if (!parent.enabled) return null;

    if (parent.mode === "link") {
      return {
        mode: "link",
        email: parent.email.trim()
      };
    }

    return {
      mode: "create",
      firstName: parent.firstName.trim(),
      lastNameP: parent.lastNameP.trim(),
      lastNameM: parent.lastNameM.trim(),
      email: parent.email.trim(),
      password: parent.password
    };
  }

  function validateForm() {
    if (!form.studentId) {
      return "Debes seleccionar un alumno.";
    }

    if (!form.father.enabled && !form.mother.enabled) {
      return "Debes agregar al menos un padre o madre.";
    }

    const enabledParents = [form.father, form.mother].filter((p) => p.enabled);

    for (const parent of enabledParents) {
      if (parent.mode === "link") {
        if (!parent.email.trim()) {
          return "Debes seleccionar una cuenta existente de la lista.";
        }
      }

      if (parent.mode === "create") {
        if (!parent.firstName.trim()) {
          return "El nombre es obligatorio al crear una cuenta.";
        }

        if (!parent.lastNameP.trim()) {
          return "El apellido paterno es obligatorio al crear una cuenta.";
        }

        if (!parent.email.trim()) {
          return "El correo es obligatorio al crear una cuenta.";
        }

        if (!parent.password.trim() || parent.password.trim().length < 6) {
          return "La contraseña debe tener al menos 6 caracteres.";
        }
      }
    }

    if (
      form.father.enabled &&
      form.mother.enabled &&
      form.father.email.trim().toLowerCase() ===
        form.mother.email.trim().toLowerCase()
    ) {
      return "Padre y madre no pueden usar el mismo correo.";
    }

    return "";
  }

  async function onSubmit(e) {
    e.preventDefault();
    setMsg("");

    const validationError = validateForm();
    if (validationError) {
      setMsg(validationError);
      return;
    }

    setLoading(true);

    try {
      const payload = {
        studentId: Number(form.studentId),
        father: buildParentPayload(form.father),
        mother: buildParentPayload(form.mother)
      };

      const res = await fetch("/api/teacher/student-parents", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setMsg(data?.message || "No se pudieron guardar los vínculos.");
        return;
      }

      setMsg("Padres vinculados correctamente.");
      setForm({
        studentId: "",
        father: { ...emptyParent },
        mother: { ...emptyParent }
      });
      setMatches({ father: [], mother: [] });
    } catch {
      setMsg("Error de conexión con el servidor.");
    } finally {
      setLoading(false);
    }
  }

  function renderParentSection(title, sectionKey, parent) {
    const sectionMatches = matches[sectionKey];
    const isSearching = searching[sectionKey];

    return (
      <div className="teacher-parent-block">
        <div className="teacher-parent-block__header">
          <h3>{title}</h3>

          <label className="teacher-parent-block__toggle">
            <input
              type="checkbox"
              checked={parent.enabled}
              onChange={(e) =>
                updateParent(sectionKey, "enabled", e.target.checked)
              }
            />
            Agregar
          </label>
        </div>

        {parent.enabled && (
          <>
            <div className="teacher-parent-mode">
              <label>
                <input
                  type="radio"
                  name={`${sectionKey}-mode`}
                  checked={parent.mode === "create"}
                  onChange={() => updateParent(sectionKey, "mode", "create")}
                />
                Crear cuenta nueva
              </label>

              <label>
                <input
                  type="radio"
                  name={`${sectionKey}-mode`}
                  checked={parent.mode === "link"}
                  onChange={() => updateParent(sectionKey, "mode", "link")}
                />
                Vincular cuenta existente
              </label>
            </div>

            <div className="teacher-parents-page__grid">
              {parent.mode === "create" && (
                <>
                  <div className="teacher-field">
                    <label>Nombre(s)</label>
                    <input
                      value={parent.firstName}
                      onChange={(e) =>
                        updateParent(sectionKey, "firstName", e.target.value)
                      }
                    />
                  </div>

                  <div className="teacher-field">
                    <label>Apellido paterno</label>
                    <input
                      value={parent.lastNameP}
                      onChange={(e) =>
                        updateParent(sectionKey, "lastNameP", e.target.value)
                      }
                    />
                  </div>

                  <div className="teacher-field">
                    <label>Apellido materno</label>
                    <input
                      value={parent.lastNameM}
                      onChange={(e) =>
                        updateParent(sectionKey, "lastNameM", e.target.value)
                      }
                    />
                  </div>

                  <div className="teacher-field">
                    <label>Correo</label>
                    <input
                      type="email"
                      value={parent.email}
                      onChange={(e) =>
                        updateParent(sectionKey, "email", e.target.value)
                      }
                    />
                  </div>

                  <div className="teacher-field">
                    <label>Contraseña inicial</label>
                    <input
                      type="password"
                      value={parent.password}
                      onChange={(e) =>
                        updateParent(sectionKey, "password", e.target.value)
                      }
                    />
                  </div>
                </>
              )}

              {parent.mode === "link" && (
                <>
                  <div className="teacher-field teacher-field--full">
                    <label>Buscar cuenta por nombre</label>
                    <input
                      type="text"
                      placeholder="Escribe nombre, apellido o correo"
                      value={parent.searchText}
                      onChange={(e) => {
                        updateParent(sectionKey, "searchText", e.target.value);
                        updateParent(sectionKey, "email", "");
                      }}
                    />
                  </div>

                  <div className="teacher-field teacher-field--full">
                    <label>Cuenta seleccionada</label>
                    <input
                      type="text"
                      value={parent.email || "Ninguna cuenta seleccionada"}
                      readOnly
                    />
                  </div>
                </>
              )}
            </div>

            {parent.mode === "link" && parent.searchText.trim().length >= 2 && (
              <div className="teacher-parent-search">
                {isSearching && (
                  <div className="teacher-parent-search__status">
                    Buscando cuentas...
                  </div>
                )}

                {!isSearching && sectionMatches.length > 0 && (
                  <div className="teacher-parent-results">
                    {sectionMatches.map((item) => (
                      <button
                        key={`${sectionKey}-${item.id}`}
                        type="button"
                        className="teacher-parent-result"
                        onClick={() => selectExistingParent(sectionKey, item)}
                      >
                        <strong>{item.fullName}</strong>
                        <span>{item.email}</span>
                      </button>
                    ))}
                  </div>
                )}

                {!isSearching && sectionMatches.length === 0 && (
                  <div className="teacher-parent-search__status">
                    No se encontraron cuentas con ese nombre.
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  return (
    <section className="teacher-parents-page">
      <div className="teacher-parents-page__header">
        <h2>Agregar o vincular padres</h2>
        <p>
          Selecciona un alumno y agrega al menos un padre o madre. Puedes crear
          una cuenta nueva o vincular una cuenta existente.
        </p>
      </div>

      <form className="teacher-parents-page__form" onSubmit={onSubmit}>
        <div className="teacher-field">
          <label>Alumno</label>
          <select
            value={form.studentId}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, studentId: e.target.value }))
            }
            disabled={loadingStudents}
          >
            <option value="">Selecciona un alumno</option>
            {students.map((student) => (
              <option key={student.id} value={student.id}>
                {student.firstName} {student.lastNameP} {student.lastNameM || ""}
              </option>
            ))}
          </select>
        </div>

        {renderParentSection("Padre", "father", form.father)}
        {renderParentSection("Madre", "mother", form.mother)}

        <div className="teacher-parents-page__actions">
          <button
            type="submit"
            className="teacher-parents-page__submit"
            disabled={loading}
          >
            {loading ? "Guardando..." : "Guardar vínculos"}
          </button>
        </div>

        {msg && <div className="teacher-parents-page__message">{msg}</div>}
      </form>
    </section>
  );
}