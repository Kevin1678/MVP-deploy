import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../admin.css";

const MIN_SCALE = 1;
const MAX_SCALE = 1.3;
const STEP = 0.1;

function splitByRole(users) {
  return {
    STUDENT: users.filter((u) => u.role === "STUDENT"),
    TEACHER: users.filter((u) => u.role === "TEACHER"),
    PARENT: users.filter((u) => u.role === "PARENT"),
  };
}

function fullName(user) {
  return [user.firstName, user.lastNameP, user.lastNameM]
    .filter(Boolean)
    .join(" ");
}

const INITIAL_FORM = {
  firstName: "",
  lastNameP: "",
  lastNameM: "",
  email: "",
  password: "",
  role: "TEACHER",
};

export default function Admin() {
  const nav = useNavigate();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [theme, setTheme] = useState(
    () => localStorage.getItem("admin-theme") || "dark"
  );
  const [fontScale, setFontScale] = useState(() => {
    const saved = Number(localStorage.getItem("admin-font-scale"));
    return Number.isFinite(saved) && saved >= MIN_SCALE && saved <= MAX_SCALE
      ? saved
      : 1;
  });

  const [view, setView] = useState("overview");
  const [form, setForm] = useState(INITIAL_FORM);
  const [msg, setMsg] = useState("");
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [creating, setCreating] = useState(false);
  const [adminName, setAdminName] = useState("ADMIN");

  useEffect(() => {
    localStorage.setItem("admin-theme", theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem("admin-font-scale", String(fontScale));
  }, [fontScale]);

  useEffect(() => {
    loadUsers();
    loadMe();
  }, []);

  async function loadMe() {
    try {
      const res = await fetch("/api/auth/me", {
        credentials: "include",
      });

      if (!res.ok) return;

      const me = await res.json();
      const name = [me.firstName, me.lastNameP, me.lastNameM]
        .filter(Boolean)
        .join(" ");

      if (name) {
        setAdminName(name.toUpperCase());
      }
    } catch {
      // no bloquea la interfaz
    }
  }

  async function loadUsers() {
    setLoadingUsers(true);
    setMsg("");

    try {
      const res = await fetch("/api/admin/users", {
        credentials: "include",
      });

      if (!res.ok) {
        setMsg("No se pudieron cargar usuarios (¿sesión expirada?)");
        return;
      }

      const data = await res.json();
      setUsers(data);
    } catch {
      setMsg("No se pudo conectar para cargar usuarios.");
    } finally {
      setLoadingUsers(false);
    }
  }

  async function createUser(e) {
    e.preventDefault();
    setMsg("");
    setCreating(true);

    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(form),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setMsg(data?.message || "Error creando usuario");
        return;
      }

      setMsg("✅ Usuario creado correctamente");
      setForm((prev) => ({
        ...INITIAL_FORM,
        role: prev.role,
      }));
      await loadUsers();
      setView("overview");
    } catch {
      setMsg("No se pudo conectar para crear el usuario.");
    } finally {
      setCreating(false);
    }
  }

  async function logout() {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // no bloquea la salida
    } finally {
      nav("/", { replace: true });
    }
  }

  function increaseFont() {
    setFontScale((prev) => Math.min(MAX_SCALE, +(prev + STEP).toFixed(2)));
  }

  function decreaseFont() {
    setFontScale((prev) => Math.max(MIN_SCALE, +(prev - STEP).toFixed(2)));
  }

  function toggleTheme() {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  }

  const grouped = useMemo(() => splitByRole(users), [users]);

  const summary = useMemo(() => {
    return {
      total: users.length,
      students: grouped.STUDENT.length,
      teachers: grouped.TEACHER.length,
      parents: grouped.PARENT.length,
    };
  }, [users, grouped]);

  return (
    <div
      className={`admin-shell admin-shell--${theme}`}
      style={{ "--admin-scale": fontScale }}
    >
      <aside
        className={`admin-sidebar ${
          sidebarOpen ? "" : "admin-sidebar--collapsed"
        }`}
      >
        <div className="admin-sidebar__top">
          <div>
            <p className="admin-sidebar__eyebrow">Panel admin</p>
            <h1 className="admin-sidebar__title">
              {sidebarOpen ? "Menú de navegación" : "Menú"}
            </h1>
          </div>

          <button
            type="button"
            className="admin-sidebar__collapse"
            onClick={() => setSidebarOpen((v) => !v)}
            aria-label={sidebarOpen ? "Colapsar menú" : "Expandir menú"}
          >
            {sidebarOpen ? "◀" : "▶"}
          </button>
        </div>

        <nav className="admin-sidebar__nav">
          <button
            type="button"
            className={`admin-nav__item ${
              view === "overview" ? "active" : ""
            }`}
            onClick={() => setView("overview")}
          >
            <span className="admin-nav__icon">🏠</span>
            {sidebarOpen && <span>Panel general</span>}
          </button>

          <button
            type="button"
            className={`admin-nav__item ${view === "create" ? "active" : ""}`}
            onClick={() => setView("create")}
          >
            <span className="admin-nav__icon">➕</span>
            {sidebarOpen && <span>Registrar usuarios</span>}
          </button>
        </nav>

        <div className="admin-sidebar__tools">
          <button type="button" className="admin-tool-btn" onClick={toggleTheme}>
            <span className="admin-nav__icon">
              {theme === "dark" ? "☀️" : "🌙"}
            </span>
            {sidebarOpen && (
              <span>{theme === "dark" ? "Modo claro" : "Modo oscuro"}</span>
            )}
          </button>

          <div className="admin-font-box">
            <button
              type="button"
              className="admin-font-btn"
              onClick={decreaseFont}
              aria-label="Disminuir tamaño de letra"
            >
              A-
            </button>

            {sidebarOpen && (
              <span className="admin-font-label">
                {Math.round(fontScale * 100)}%
              </span>
            )}

            <button
              type="button"
              className="admin-font-btn"
              onClick={increaseFont}
              aria-label="Aumentar tamaño de letra"
            >
              A+
            </button>
          </div>

          <button
            type="button"
            className="admin-tool-btn admin-tool-btn--danger"
            onClick={logout}
          >
            <span className="admin-nav__icon">⏻</span>
            {sidebarOpen && <span>Cerrar sesión</span>}
          </button>
        </div>
      </aside>

      <div className="admin-main">
        <header className="admin-mobilebar">
          <button
            type="button"
            className="admin-mobilebar__menu"
            onClick={() => setSidebarOpen((v) => !v)}
          >
            ☰
          </button>

          <div>
            <h2 className="admin-mobilebar__title">Panel Admin</h2>
            <p className="admin-mobilebar__subtitle">
              Gestión de docentes, padres y usuarios registrados.
            </p>
          </div>
        </header>

        <main className="admin-content">
          {view === "overview" ? (
            <AdminOverview
              adminName={adminName}
              grouped={grouped}
              summary={summary}
              loadUsers={loadUsers}
              loadingUsers={loadingUsers}
            />
          ) : (
            <AdminCreateView
              form={form}
              setForm={setForm}
              createUser={createUser}
              creating={creating}
              msg={msg}
              summary={summary}
            />
          )}
        </main>
      </div>
    </div>
  );
}

function AdminOverview({
  adminName,
  grouped,
  summary,
  loadUsers,
  loadingUsers,
}) {
  return (
    <section className="admin-page">
      <header className="admin-page__header">
        <div>
          <h2>Panel general</h2>
          <p>Resumen de alumnos, maestros y padres registrados.</p>
        </div>

        <div className="admin-page__header-actions">
          <span className="admin-user-badge">{adminName}</span>
          <button
            type="button"
            className="admin-page__refresh"
            onClick={loadUsers}
            disabled={loadingUsers}
          >
            {loadingUsers ? "Cargando..." : "Refrescar"}
          </button>
        </div>
      </header>

      <section className="admin-summary-grid">
        <SummaryCard title="Usuarios totales" value={summary.total} />
        <SummaryCard title="Alumnos" value={summary.students} />
        <SummaryCard title="Maestros" value={summary.teachers} />
        <SummaryCard title="Padres" value={summary.parents} />
      </section>

      <section className="admin-panel-card">
        <div className="admin-panel-card__top">
          <h3>Usuarios registrados</h3>
          <span>Total mostrado: {summary.total}</span>
        </div>

        <UserSection
          title="Alumnos"
          role="STUDENT"
          users={grouped.STUDENT}
        />
        <UserSection
          title="Maestros"
          role="TEACHER"
          users={grouped.TEACHER}
        />
        <UserSection title="Padres" role="PARENT" users={grouped.PARENT} />
      </section>
    </section>
  );
}

function AdminCreateView({
  form,
  setForm,
  createUser,
  creating,
  msg,
  summary,
}) {
  return (
    <section className="admin-page">
      <header className="admin-page__header">
        <div>
          <h2>Registrar usuarios</h2>
          <p>Desde aquí puedes crear cuentas para docentes y padres.</p>
        </div>
      </header>

      <div className="admin-create-grid">
        <section className="admin-panel-card">
          <div className="admin-panel-card__top">
            <h3>Nuevo usuario</h3>
            <span>Solo docentes y padres</span>
          </div>

          <form onSubmit={createUser} className="admin-form">
            <div className="admin-field">
              <label>Nombre(s)</label>
              <input
                value={form.firstName}
                onChange={(e) =>
                  setForm({ ...form, firstName: e.target.value })
                }
              />
            </div>

            <div className="admin-field">
              <label>Apellido paterno</label>
              <input
                value={form.lastNameP}
                onChange={(e) =>
                  setForm({ ...form, lastNameP: e.target.value })
                }
              />
            </div>

            <div className="admin-field">
              <label>Apellido materno</label>
              <input
                value={form.lastNameM}
                onChange={(e) =>
                  setForm({ ...form, lastNameM: e.target.value })
                }
              />
            </div>

            <div className="admin-field">
              <label>Correo</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>

            <div className="admin-field">
              <label>Contraseña</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>

            <div className="admin-field">
              <label>Rol</label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
              >
                <option value="TEACHER">MAESTRO</option>
                <option value="PARENT">PADRE</option>
              </select>
            </div>

            <button className="admin-primary-btn" disabled={creating}>
              {creating ? "Creando..." : "Crear usuario"}
            </button>

            {msg && <div className="admin-notice">{msg}</div>}
          </form>
        </section>

        <aside className="admin-side-column">
          <section className="admin-panel-card">
            <div className="admin-panel-card__top">
              <h3>Resumen rápido</h3>
              <span>Estado actual</span>
            </div>

            <div className="admin-side-stats">
              <div className="admin-side-stat">
                <span>Usuarios totales</span>
                <strong>{summary.total}</strong>
              </div>

              <div className="admin-side-stat">
                <span>Alumnos</span>
                <strong>{summary.students}</strong>
              </div>

              <div className="admin-side-stat">
                <span>Maestros</span>
                <strong>{summary.teachers}</strong>
              </div>

              <div className="admin-side-stat">
                <span>Padres</span>
                <strong>{summary.parents}</strong>
              </div>
            </div>
          </section>

          <section className="admin-panel-card">
            <div className="admin-panel-card__top">
              <h3>Nota</h3>
              <span>Recomendación</span>
            </div>

            <p className="admin-helper-text">
              No metas aquí alumnos. Este panel queda mejor si se enfoca solo en
              administración general: docentes, padres y consulta global de
              usuarios.
            </p>
          </section>
        </aside>
      </div>
    </section>
  );
}

function SummaryCard({ title, value }) {
  return (
    <article className="admin-summary-card">
      <span>{title}</span>
      <strong>{value}</strong>
    </article>
  );
}

function UserSection({ title, role, users }) {
  const isStudent = role === "STUDENT";
  const isParent = role === "PARENT";
  const colSpan = isStudent ? 6 : isParent ? 5 : 4;

  return (
    <div className="admin-user-section">
      <div className="admin-user-section__head">
        <h4>
          {title} ({users.length})
        </h4>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Nombre</th>

              {isStudent && (
                <>
                  <th>Padre</th>
                  <th>Madre</th>
                </>
              )}

              {isParent && <th>Alumnos / hijos</th>}

              <th>Email</th>
              <th>Rol</th>
            </tr>
          </thead>

          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.id}</td>
                <td>{fullName(u)}</td>

                {isStudent && (
                  <>
                    <td>{u.fatherName || "—"}</td>
                    <td>{u.motherName || "—"}</td>
                  </>
                )}

                {isParent && <td>{u.childrenText || "—"}</td>}

                <td>{u.email}</td>
                <td>{u.role}</td>
              </tr>
            ))}

            {users.length === 0 && (
              <tr>
                <td colSpan={colSpan} className="admin-empty-row">
                  Sin registros
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
