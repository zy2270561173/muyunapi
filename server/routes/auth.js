const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { nanoid } = require('nanoid');
const db = require('../db/init');
const { signToken } = require('../middleware/auth');
const { sendVerifyCode, verifyCode } = require('../utils/mailer');

// 发送验证码
router.post('/send-code', async (req, res) => {
  const { email, type = 'register' } = req.body;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.json({ code: 400, message: '邮箱格式不正确' });
  }

  if (type === 'register') {
    const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (exists) return res.json({ code: 400, message: '该邮箱已被注册' });
  } else if (type === 'reset') {
    const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (!exists) return res.json({ code: 400, message: '该邮箱未注册' });
  }

  const smtpUser = db.prepare("SELECT value FROM configs WHERE key='smtp_user'").get()?.value;
  if (!smtpUser) return res.json({ code: 500, message: '邮件服务未配置，请联系管理员' });

  try {
    await sendVerifyCode(email, type);
    res.json({ code: 200, message: '验证码已发送，请查收邮件' });
  } catch (e) {
    console.error('[SMTP Error]', e.message);
    res.json({ code: 500, message: '邮件发送失败：' + e.message });
  }
});

// 注册
router.post('/register', (req, res) => {
  const { username, email, password, code, nickname } = req.body;
  if (!username || !email || !password || !code) {
    return res.json({ code: 400, message: '请填写完整信息' });
  }
  if (username.length < 3 || username.length > 20) {
    return res.json({ code: 400, message: '用户名长度3-20位' });
  }
  if (password.length < 6) {
    return res.json({ code: 400, message: '密码至少6位' });
  }

  const requireVerify = db.prepare("SELECT value FROM configs WHERE key='require_email_verify'").get()?.value;
  if (requireVerify === '1') {
    if (!verifyCode(email, code, 'register')) {
      return res.json({ code: 400, message: '验证码错误或已过期' });
    }
  }

  const existUser = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existUser) return res.json({ code: 400, message: '用户名已存在' });
  const existEmail = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existEmail) return res.json({ code: 400, message: '邮箱已被注册' });

  const hash = bcrypt.hashSync(password, 10);
  const uid = uuidv4().replace(/-/g, '').substring(0, 12).toUpperCase();
  const apiKey = 'mk_' + nanoid(32);
  const apiSecret = 'ms_' + nanoid(48);

  const result = db.prepare(
    'INSERT INTO users (uid, username, email, password, nickname, api_key, api_secret, email_verified) VALUES (?, ?, ?, ?, ?, ?, ?, 1)'
  ).run(uid, username, email, hash, nickname || username, apiKey, apiSecret);

  const user = db.prepare('SELECT id, uid, username, nickname, email, role, avatar FROM users WHERE id = ?').get(result.lastInsertRowid);
  const token = signToken(user.id);
  res.json({ code: 200, message: '注册成功', data: { token, user } });
});

// 登录
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.json({ code: 400, message: '请填写用户名和密码' });

  const user = db.prepare('SELECT * FROM users WHERE username = ? OR email = ?').get(username, username);
  if (!user) return res.json({ code: 400, message: '用户名或密码错误' });
  if (user.status !== 1) return res.json({ code: 403, message: '账号已被禁用' });

  const match = bcrypt.compareSync(password, user.password);
  if (!match) return res.json({ code: 400, message: '用户名或密码错误' });

  const token = signToken(user.id);
  const { password: _, ...safeUser } = user;
  res.json({ code: 200, message: '登录成功', data: { token, user: safeUser } });
});

// 重置密码
router.post('/reset-password', (req, res) => {
  const { email, code, newPassword } = req.body;
  if (!email || !code || !newPassword) return res.json({ code: 400, message: '参数不完整' });
  if (newPassword.length < 6) return res.json({ code: 400, message: '新密码至少6位' });

  if (!verifyCode(email, code, 'reset')) {
    return res.json({ code: 400, message: '验证码错误或已过期' });
  }
  const hash = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE email = ?').run(hash, email);
  res.json({ code: 200, message: '密码重置成功' });
});

module.exports = router;
