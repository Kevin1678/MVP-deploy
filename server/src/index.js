require("dotenv").config();
const path = require("path");
const express = require("express");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const authRoutes = require("./routes/auth");
const adminRoutes = require("./routes/admin");
const resultsRoutes = require("./routes/results");

const app = express();

// Render / proxies
app.set("trust proxy", 1);

app.use(helmet());
app.use(express.json());
app.use(cookieParser());

app.use("/api/auth/login", rateLimit({ windowMs: 60_000, max: 10 })); // simple anti-fuerza-bruta

app.get("/api/health", (req, res) => res.json({ ok: true }));

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/results", resultsRoutes);

// Static React (Vite build -> dist) :contentReference[oaicite:2]{index=2}
const clientDistPath = path.resolve(__dirname, "..", "..", "client", "dist");
app.use(express.static(clientDistPath));

// SPA fallback
app.get("*", (req, res) => {
  res.sendFile(path.join(clientDistPath, "index.html"));
});

const port = process.env.PORT || 3001;
app.listen(port, () => console.log(`Server on :${port}`));