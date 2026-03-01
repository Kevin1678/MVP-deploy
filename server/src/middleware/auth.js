const jwt = require("jsonwebtoken");

function requireAuth(req, res, next) {
  const token = req.cookies?.token;
  if (!token) return res.status(401).json({ message: "No autenticado" });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload; // { id, role, email }
    next();
  } catch {
    return res.status(401).json({ message: "Token inválido" });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: "No autenticado" });
    if (!roles.includes(req.user.role)) return res.status(403).json({ message: "Sin permiso" });
    next();
  };
}

module.exports = { requireAuth, requireRole };