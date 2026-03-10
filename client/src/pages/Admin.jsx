import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../admin.css";

function splitByRole(users) {
  return {
    STUDENT: users.filter(u => u.role === "STUDENT"),
    TEACHER: users.filter(u => u.role === "TEACHER"),
    PARENT: users.filter(u => u.role === "PARENT"),
  };
}

export default function Admin() {
  const nav = useNavigate();

  const [form, setForm] = useState({
    firstName: "",
    lastNameP: "",
    lastNameM: "",
    email: "",
    password: "",
    role: "TEACHER",
  });

  const [msg, setMsg] = useState("");
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [creating, setCreating] = useState(false);

  async function loadUsers() {
    setLoadingUsers(true);
    setMsg("");
    try {
      const res = await fetch("/api/admin/users");
      if (!res.ok) {
        setMsg("No se pudieron cargar usuarios (¿sesión expirada?)");
        return;
      }
      const data = await res.json();
      setUsers(data);
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
        body: JSON.stringify(form)
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setMsg(data?.message || "Error creando usuario");
        return;
      }

      setMsg("✅ Usuario creado");
      setForm(f => ({ ...f, email: "", password: "" }));
      await loadUsers();
    } finally {
      setCreating(false);
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    nav("/", { replace: true });
  }

  useEffect(() => { loadUsers(); }, []);

  const grouped = useMemo(() => splitByRole(users), [users]);

  return (
    <div className="adminWrap">
      <div className="adminTop">
        <h2 style={{ margin: 0 }}>Panel Admin</h2>
        <button className="btn" onClick={logout}>Cerrar sesión</button>
      </div>

      <div className="adminGrid">
        {/* FORM */}
        <div className="adminCard">
          <h3>Registrar usuario</h3>
          <p className="muted" style={{ marginTop: 0 }}>
            Puedes registrar <b>maestros</b> y <b>padres</b>.
          </p>

          <form onSubmit={createUser} className="adminForm">
            <div className="adminField">
              <label>Nombre(s)</label>
              <input
                value={form.firstName}
                onChange={e => setForm({ ...form, firstName: e.target.value })}
              />
            </div>

            <div className="adminField">
              <label>Apellido paterno</label>
              <input
                value={form.lastNameP}
                onChange={e => setForm({ ...form, lastNameP: e.target.value })}
              />
            </div>

            <div className="adminField">
              <label>Apellido materno (opcional)</label>
              <input
                value={form.lastNameM}
                onChange={e => setForm({ ...form, lastNameM: e.target.value })}
              />
            </div>

            <div className="adminField">
              <label>Correo</label>
              <input
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
              />
            </div>

            <div className="adminField">
              <label>Contraseña</label>
              <input
                type="password"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
              />
            </div>

            <div className="adminField">
              <label>Rol</label>
              <select
                value={form.role}
                onChange={e => setForm({ ...form, role: e.target.value })}
              >
                <option value="TEACHER">MAESTRO</option>
                <option value="PARENT">PADRE</option>
              </select>
            </div>

            <button className="btn btnPrimary" disabled={creating}>
              {creating ? "Creando..." : "Crear"}
            </button>

            {msg && <div className="notice">{msg}</div>}
          </form>
        </div>

        {/* TABLES */}
        <div className="adminCard">
          <div className="tableHeader">
            <h3 style={{ margin: 0 }}>Usuarios registrados</h3>
            <button className="btn" onClick={loadUsers} disabled={loadingUsers}>
              {loadingUsers ? "Cargando..." : "Refrescar"}
            </button>
          </div>

          <UserSection title="Alumnos" users={grouped.STUDENT} />
          <UserSection title="Maestros" users={grouped.TEACHER} />
          <UserSection title="Padres" users={grouped.PARENT} />
        </div>
      </div>
    </div>
  );
}

function UserSection({ title, users }) {
  return (
    <div style={{ marginTop: 14 }}>
      <h4 style={{ marginBottom: 8 }}>{title} ({users.length})</h4>

      <div className="tableWrap">
        <table className="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Nombre</th>
              <th>Email</th>
              <th>Rol</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td>{u.id}</td>
                <td>{u.firstName} {u.lastNameP} {u.lastNameM || ""}</td>
                <td>{u.email}</td>
                <td>{u.role}</td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={4} className="emptyRow">Sin registros</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
