const jwt = require('jsonwebtoken');
const db = require('../db/init');

const JWT_SECRET = process.env.JWT_SECRET || 'muyunapi-secret-key-2026-change-this';

function auth(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) return res.status(401).json({ code: 401, message: '未登录，请先登录' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = db.prepare('SELECT id, uid, username, nickname, email, role, avatar, status, credits FROM users WHERE id = ?').get(decoded.id);
    if (!user || user.status !== 1) return res.status(401).json({ code: 401, message: '账号已被禁用' });
    req.user = user;
    next();
  } catch (e) {
    return res.status(401).json({ code: 401, message: 'Token无效或已过期，请重新登录' });
  }
}

function adminAuth(req, res, next) {
  auth(req, res, () => {
    if (req.user.role !== 'admin') return res.status(403).json({ code: 403, message: '无权限访问' });
    next();
  });
}

function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = db.prepare('SELECT id, uid, username, nickname, email, role, avatar, status, credits FROM users WHERE id = ?').get(decoded.id);
      if (user && user.status === 1) req.user = user;
    } catch (e) {}
  }
  next();
}

function signToken(userId) {
  return jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: '7d' });
}

module.exports = { auth, adminAuth, optionalAuth, signToken, JWT_SECRET };
