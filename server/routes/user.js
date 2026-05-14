const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { nanoid } = require('nanoid');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const db = require('../db/init');
const { auth } = require('../middleware/auth');

// 头像上传配置
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '..', 'uploads', 'avatars');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `avatar_${req.user.id}_${Date.now()}${ext}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 2 * 1024 * 1024 }, fileFilter: (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) cb(null, true);
  else cb(new Error('只允许上传图片'));
}});

// 获取当前用户信息
router.get('/profile', auth, (req, res) => {
  const user = db.prepare('SELECT id, uid, username, email, nickname, avatar, role, api_key, api_secret, email_verified, credits, created_at FROM users WHERE id = ?').get(req.user.id);
  res.json({ code: 200, data: user });
});

// 更新个人信息
router.put('/profile', auth, (req, res) => {
  const { nickname } = req.body;
  if (!nickname || nickname.length < 1 || nickname.length > 30) {
    return res.json({ code: 400, message: '昵称长度1-30位' });
  }
  db.prepare('UPDATE users SET nickname = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(nickname, req.user.id);
  res.json({ code: 200, message: '更新成功' });
});

// 上传头像
router.post('/avatar', auth, upload.single('avatar'), (req, res) => {
  if (!req.file) return res.json({ code: 400, message: '请选择图片' });
  const avatarUrl = `/uploads/avatars/${req.file.filename}`;
  db.prepare('UPDATE users SET avatar = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(avatarUrl, req.user.id);
  res.json({ code: 200, message: '头像更新成功', data: { avatar: avatarUrl } });
});

// 修改密码
router.put('/password', auth, (req, res) => {
  const { oldPassword, newPassword } = req.body;
  if (!oldPassword || !newPassword) return res.json({ code: 400, message: '请填写完整信息' });
  if (newPassword.length < 6) return res.json({ code: 400, message: '新密码至少6位' });

  const user = db.prepare('SELECT password FROM users WHERE id = ?').get(req.user.id);
  if (!bcrypt.compareSync(oldPassword, user.password)) {
    return res.json({ code: 400, message: '原密码不正确' });
  }
  const hash = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(hash, req.user.id);
  res.json({ code: 200, message: '密码修改成功' });
});

// 重新生成API密钥
router.post('/regenerate-key', auth, (req, res) => {
  const apiKey = 'mk_' + nanoid(32);
  const apiSecret = 'ms_' + nanoid(48);
  db.prepare('UPDATE users SET api_key = ?, api_secret = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(apiKey, apiSecret, req.user.id);
  res.json({ code: 200, message: '密钥已重新生成', data: { api_key: apiKey, api_secret: apiSecret } });
});

// 获取用户的自定义Key列表
router.get('/keys', auth, (req, res) => {
  const keys = db.prepare('SELECT * FROM user_keys WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id);
  res.json({ code: 200, data: keys });
});

// 创建自定义Key
router.post('/keys', auth, (req, res) => {
  const { name, daily_limit = 1000, permissions = ['*'] } = req.body;
  if (!name) return res.json({ code: 400, message: '请输入密钥名称' });

  const count = db.prepare('SELECT COUNT(*) as cnt FROM user_keys WHERE user_id = ?').get(req.user.id).cnt;
  if (count >= 10) return res.json({ code: 400, message: '最多创建10个密钥' });

  const apiKey = 'uk_' + nanoid(24);
  const secretKey = 'us_' + nanoid(36);

  db.prepare('INSERT INTO user_keys (user_id, name, api_key, secret_key, permissions, daily_limit) VALUES (?, ?, ?, ?, ?, ?)')
    .run(req.user.id, name, apiKey, secretKey, JSON.stringify(permissions), daily_limit);

  res.json({ code: 200, message: '密钥创建成功', data: { api_key: apiKey, secret_key: secretKey } });
});

// 删除自定义Key
router.delete('/keys/:id', auth, (req, res) => {
  db.prepare('DELETE FROM user_keys WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  res.json({ code: 200, message: '删除成功' });
});

// 切换Key状态
router.patch('/keys/:id/toggle', auth, (req, res) => {
  const key = db.prepare('SELECT * FROM user_keys WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!key) return res.json({ code: 404, message: 'Key不存在' });
  db.prepare('UPDATE user_keys SET status = ? WHERE id = ?').run(key.status === 1 ? 0 : 1, key.id);
  res.json({ code: 200, message: key.status === 1 ? '已禁用' : '已启用' });
});

// 获取用户收藏
router.get('/favorites', auth, (req, res) => {
  const favs = db.prepare(`
    SELECT a.id, a.name, a.slug, a.description, a.is_free, a.require_auth, a.method, a.calls_count,
           c.name as category_name, c.icon as category_icon
    FROM favorites f
    JOIN apis a ON f.api_id = a.id
    LEFT JOIN categories c ON a.category_id = c.id
    WHERE f.user_id = ? AND a.status = 1
    ORDER BY f.created_at DESC
  `).all(req.user.id);
  res.json({ code: 200, data: favs });
});

// 获取调用统计
router.get('/stats', auth, (req, res) => {
  const totalCalls = db.prepare('SELECT COUNT(*) as cnt FROM call_logs WHERE user_id = ?').get(req.user.id).cnt;
  const todayCalls = db.prepare("SELECT COUNT(*) as cnt FROM call_logs WHERE user_id = ? AND date(created_at) = date('now')").get(req.user.id).cnt;
  const favoriteCount = db.prepare('SELECT COUNT(*) as cnt FROM favorites WHERE user_id = ?').get(req.user.id).cnt;
  const keyCount = db.prepare('SELECT COUNT(*) as cnt FROM user_keys WHERE user_id = ? AND status = 1').get(req.user.id).cnt;
  res.json({ code: 200, data: { totalCalls, todayCalls, favoriteCount, keyCount } });
});

module.exports = router;
