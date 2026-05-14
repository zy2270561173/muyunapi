const express = require('express');
const router = express.Router();
const db = require('../db/init');
const { auth, adminAuth } = require('../middleware/auth');

// 获取友链列表（前台）
router.get('/', (req, res) => {
  // 检查是否开启友链
  const enabled = db.prepare("SELECT value FROM configs WHERE key = 'friendship_enabled'").get();
  if (!enabled || enabled.value !== '1') {
    return res.json({ code: 200, data: [] });
  }

  const links = db.prepare('SELECT * FROM friendships WHERE is_active = 1 ORDER BY sort_order ASC').all();
  res.json({ code: 200, data: links });
});

// 跳转到友链（redirect 模式）
router.get('/goto/:id', (req, res) => {
  const link = db.prepare('SELECT * FROM friendships WHERE id = ? AND is_active = 1').get(req.params.id);
  if (!link) {
    return res.redirect('/');
  }

  if (link.target === 'blank') {
    return res.redirect(link.url);
  }

  // self 或 redirect 模式都显示跳转页面
  res.json({
    code: 200,
    data: {
      name: link.name,
      url: link.url,
      target: link.target,
      seconds: link.redirect_seconds || 5,
    }
  });
});

// ===== 以下需要管理员权限 =====

// 获取友链列表（后台）
router.get('/admin', adminAuth, (req, res) => {
  const links = db.prepare('SELECT * FROM friendships ORDER BY sort_order ASC').all();
  res.json({ code: 200, data: links });
});

// 创建友链
router.post('/', adminAuth, (req, res) => {
  const { name, url, target, redirect_seconds, logo, sort_order, is_active } = req.body;
  if (!name || !url) return res.json({ code: 400, message: '名称和链接必填' });

  const result = db.prepare(`
    INSERT INTO friendships (name, url, target, redirect_seconds, logo, sort_order, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    name,
    url,
    target || 'blank',
    redirect_seconds || 5,
    logo || '',
    sort_order || 0,
    is_active !== false ? 1 : 0
  );

  res.json({ code: 200, message: '创建成功', data: { id: result.lastInsertRowid } });
});

// 更新友链
router.put('/:id', adminAuth, (req, res) => {
  const { name, url, target, redirect_seconds, logo, sort_order, is_active } = req.body;

  db.prepare(`
    UPDATE friendships SET name=?, url=?, target=?, redirect_seconds=?, logo=?, sort_order=?, is_active=?
    WHERE id=?
  `).run(
    name,
    url,
    target || 'blank',
    redirect_seconds || 5,
    logo || '',
    sort_order || 0,
    is_active !== false ? 1 : 0,
    req.params.id
  );

  res.json({ code: 200, message: '更新成功' });
});

// 删除友链
router.delete('/:id', adminAuth, (req, res) => {
  db.prepare('DELETE FROM friendships WHERE id = ?').run(req.params.id);
  res.json({ code: 200, message: '已删除' });
});

module.exports = router;
