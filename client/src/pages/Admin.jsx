import { useEffect, useState } from "react";

export default function Admin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [results, setResults] = useState([]);

  async function createUser(e) {
    e.preventDefault();
    setMsg("");

    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json().catch(()=>null);
    if (!res.ok) return setMsg(data?.message || "Error creando usuario");

    setMsg("Usuario creado");
    setEmail("");
    setPassword("");
  }

  async function loadResults() {
    const res = await fetch("/api/admin/results");
    if (!res.ok) return;
    setResults(await res.json());
  }

  useEffect(() => { loadResults(); }, []);

  return (
    <div style={{ maxWidth: 900, margin: "30px auto", fontFamily: "system-ui" }}>
      <h2>Admin</h2>

      <h3>Crear alumno</h3>
      <form onSubmit={createUser} style={{ display:"flex", gap:8, marginBottom:10 }}>
        <input placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
        <input placeholder="Password (min 6)" value={password} onChange={e=>setPassword(e.target.value)} />
        <button>Crear</button>
      </form>
      {msg && <p>{msg}</p>}

      <h3>Resultados (últimos 200)</h3>
      <button onClick={loadResults}>Actualizar</button>
      <div style={{ marginTop: 10 }}>
        {results.map(r => (
          <div key={r.id} style={{ padding:8, borderBottom:"1px solid #ddd" }}>
            <b>{r.email}</b> — score {r.score} — movimientos {r.moves} — {Math.round(r.durationMs/1000)}s
          </div>
        ))}
      </div>
    </div>
  );
}