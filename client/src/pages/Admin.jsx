import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

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
    role: "TEACHER", // por defecto maestros
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
    <div style={{ maxWidth: 1100, margin: "24px auto", fontFamily: "system-ui", padding: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <h2 style={{ margin: 0 }}>Panel Admin</h2>
        <button onClick={logout} style={{ padding: "10px 14px", borderRadius: 10, cursor: "pointer" }}>
          Cerrar sesión
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 18, marginTop: 16 }}>
        {/* FORM */}
        <div style={{ border: "1px solid #ddd", borderRadius: 14, padding: 14 }}>
          <h3>Registrar usuario</h3>
          <p style={{ marginTop: -8, color: "#555" }}>
            Puedes registrar <b>maestros</b>, <b>padres</b> y (si quieres) <b>alumnos</b>.
          </p>

          <form onSubmit={createUser} style={{ display: "grid", gap: 10 }}>
            <label>
              Nombre(s)
              <input value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })}
                     style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid #ccc" }} />
            </label>

            <label>
              Apellido paterno
              <input value={form.lastNameP} onChange={e => setForm({ ...form, lastNameP: e.target.value })}
                     style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid #ccc" }} />
            </label>

            <label>
              Apellido materno (opcional)
              <input value={form.lastNameM} onChange={e => setForm({ ...form, lastNameM: e.target.value })}
                     style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid #ccc" }} />
            </label>

            <label>
              Correo
              <input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                     style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid #ccc" }} />
            </label>

            <label>
              Contraseña
              <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                     style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid #ccc" }} />
            </label>

            <label>
              Rol
              <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}
                      style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid #ccc" }}>
                <option value="TEACHER">MAESTRO</option>
                <option value="PARENT">PADRE</option>
                <option value="STUDENT">ALUMNO</option>
              </select>
            </label>

            <button disabled={creating} style={{ padding: 12, borderRadius: 12, cursor: "pointer" }}>
              {creating ? "Creando..." : "Crear"}
            </button>

            {msg && <div style={{ padding: 10, borderRadius: 10, background: "#f5f5f5" }}>{msg}</div>}
          </form>
        </div>

        {/* TABLES */}
        <div style={{ border: "1px solid #ddd", borderRadius: 14, padding: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
            <h3 style={{ margin: 0 }}>Usuarios registrados</h3>
            <button onClick={loadUsers} disabled={loadingUsers} style={{ padding: "8px 12px", borderRadius: 10, cursor: "pointer" }}>
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
      <div style={{ overflowX: "auto", border: "1px solid #eee", borderRadius: 10 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 650 }}>
          <thead>
            <tr style={{ background: "#fafcfc" }}>
              <th style={th}>ID</th>
              <th style={th}>Nombre</th>
              <th style={th}>Email</th>
              <th style={th}>Rol</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td style={td}>{u.id}</td>
                <td style={td}>{u.firstName} {u.lastNameP} {u.lastNameM || ""}</td>
                <td style={td}>{u.email}</td>
                <td style={td}>{u.role}</td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr><td style={td} colSpan={4}>Sin registros</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const th = { textAlign: "left", padding: 10, borderBottom: "1px solid #eee", fontWeight: 700 };
const td = { padding: 10, borderBottom: "1px solid #f0f0f0" };
