const express = require('express');
const router = express.Router();
const db = require('../db/init');
const { adminAuth } = require('../middleware/auth');
const { nanoid } = require('nanoid');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const loader = require('../libraries/loader');  // 动态脚本加载器

// ========== 仪表盘统计 ==========
router.get('/dashboard', adminAuth, (req, res) => {
  const userCount = db.prepare("SELECT COUNT(*) as cnt FROM users WHERE role != 'admin'").get().cnt;
  const apiCount = db.prepare("SELECT COUNT(*) as cnt FROM apis WHERE status = 1").get().cnt;
  const todayCalls = db.prepare("SELECT COUNT(*) as cnt FROM call_logs WHERE date(created_at) = date('now')").get().cnt;
  const totalCalls = db.prepare("SELECT SUM(calls_count) as cnt FROM apis").get().cnt || 0;
  const newUsersToday = db.prepare("SELECT COUNT(*) as cnt FROM users WHERE date(created_at) = date('now')").get().cnt;
  
  // 内置库脚本数量（用户上传的 js 文件数量）
  const localApiCount = loader.getScriptCount();
  
  // 用户总积分
  const totalCredits = db.prepare("SELECT COALESCE(SUM(credits), 0) as cnt FROM users WHERE role != 'admin'").get().cnt;
  
  // 最近7天调用趋势
  const trend = db.prepare(`
    SELECT date(created_at) as day, COUNT(*) as count 
    FROM call_logs 
    WHERE created_at >= datetime('now', '-7 days')
    GROUP BY date(created_at)
    ORDER BY day
  `).all();

  // Top 5 API
  const topApis = db.prepare('SELECT id, name, slug, calls_count FROM apis ORDER BY calls_count DESC LIMIT 5').all();
  
  // 最近注册用户
  const recentUsers = db.prepare('SELECT id, username, nickname, email, created_at FROM users ORDER BY created_at DESC LIMIT 5').all();

  res.json({ code: 200, data: { userCount, apiCount, todayCalls, totalCalls, newUsersToday, trend, topApis, recentUsers, localApiCount, totalCredits } });
});

// ========== API管理 ==========
router.get('/apis', adminAuth, (req, res) => {
  const { page = 1, limit = 15, keyword, category, status } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  let where = 'WHERE 1=1';
  const params = [];
  if (keyword) { where += ' AND (a.name LIKE ? OR a.description LIKE ?)'; params.push(`%${keyword}%`, `%${keyword}%`); }
  if (category) { where += ' AND a.category_id = ?'; params.push(parseInt(category)); }
  if (status !== undefined && status !== '') { where += ' AND a.status = ?'; params.push(parseInt(status)); }

  const total = db.prepare(`SELECT COUNT(*) as cnt FROM apis a ${where}`).get(...params).cnt;
  const list = db.prepare(`
    SELECT a.id, a.name, a.slug, a.category_id, a.description, a.endpoint, a.method, 
           a.params, a.headers, a.response_example, COALESCE(a.doc_content, '') as doc_content,
           a.source, a.is_free, a.require_auth, a.status, a.sort_order, a.calls_count, a.theme,
           a.current_version, a.created_at, a.updated_at,
           c.name as category_name 
    FROM apis a 
    LEFT JOIN categories c ON a.category_id = c.id 
    ${where} ORDER BY a.id DESC LIMIT ? OFFSET ?
  `).all(...params, parseInt(limit), offset);

  res.json({ code: 200, data: { list, total } });
});

router.post('/apis', adminAuth, (req, res) => {
  const { name, slug, category_id, description, endpoint, method, params, headers, response_example, doc_content, source, is_free, require_auth, status, sort_order, theme, credits_cost } = req.body;
  if (!name || !endpoint) return res.json({ code: 400, message: '接口名称和地址必填' });

  const finalSlug = slug || name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
  const existing = db.prepare('SELECT id FROM apis WHERE slug = ?').get(finalSlug);
  if (existing) return res.json({ code: 400, message: 'Slug已存在' });

  const result = db.prepare(`
    INSERT INTO apis (name, slug, category_id, description, endpoint, method, params, headers, response_example, doc_content, source, is_free, require_auth, status, sort_order, created_by, theme, credits_cost)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(name, finalSlug, category_id || null, description || '', endpoint, method || 'GET',
    JSON.stringify(params || []), JSON.stringify(headers || {}), response_example || '',
    doc_content || '', source || 'external',
    is_free !== false ? 1 : 0, require_auth ? 1 : 0, status !== false ? 1 : 0, sort_order || 0, req.user.id, theme || 'both', credits_cost || 0);

  res.json({ code: 200, message: '创建成功', data: { id: result.lastInsertRowid } });
});

router.put('/apis/:id', adminAuth, (req, res) => {
  const { name, slug, category_id, description, endpoint, method, params, headers, response_example, doc_content, source, is_free, require_auth, status, sort_order, theme, credits_cost } = req.body;
  const existing = db.prepare('SELECT id FROM apis WHERE id = ?').get(req.params.id);
  if (!existing) return res.json({ code: 404, message: 'API不存在' });

  // 检查 slug 是否与其他接口冲突（排除自己）
  const conflict = db.prepare('SELECT id, name FROM apis WHERE slug = ? AND id != ?').get(slug, req.params.id);
  if (conflict) return res.json({ code: 400, message: `Slug「${slug}」已被「${conflict.name}」占用` });

  db.prepare(`
    UPDATE apis SET name=?, slug=?, category_id=?, description=?, endpoint=?, method=?, params=?, headers=?, 
    response_example=?, doc_content=?, source=?, is_free=?, require_auth=?, status=?, sort_order=?, theme=?, credits_cost=?, updated_at=CURRENT_TIMESTAMP WHERE id=?
  `).run(name, slug, category_id || null, description || '', endpoint, method || 'GET',
    JSON.stringify(params || []), JSON.stringify(headers || {}), response_example || '',
    doc_content || '', source || 'external',
    is_free ? 1 : 0, require_auth ? 1 : 0, status ? 1 : 0, sort_order || 0, theme || 'both', credits_cost || 0, req.params.id);

  res.json({ code: 200, message: '更新成功' });
});

router.delete('/apis/:id', adminAuth, (req, res) => {
  db.prepare('UPDATE apis SET status = 0 WHERE id = ?').run(req.params.id);
  res.json({ code: 200, message: '已下线' });
});

router.delete('/apis/:id/hard', adminAuth, (req, res) => {
  const apiId = req.params.id;
  
  // 先检查是否存在
  const api = db.prepare('SELECT id FROM apis WHERE id = ?').get(apiId);
  if (!api) return res.json({ code: 404, message: 'API不存在' });

  // 删除关联数据（外键约束）
  const deleteRelated = db.transaction(() => {
    db.prepare('DELETE FROM favorites WHERE api_id = ?').run(apiId);
    db.prepare('DELETE FROM tags WHERE api_id = ?').run(apiId);
    db.prepare('DELETE FROM api_speed_logs WHERE api_id = ?').run(apiId);
    db.prepare('DELETE FROM call_logs WHERE api_id = ?').run(apiId);
    db.prepare('DELETE FROM apis WHERE id = ?').run(apiId);
  });
  
  try {
    deleteRelated();
    res.json({ code: 200, message: '已永久删除' });
  } catch (e) {
    console.error('[hardDelete]', e);
    res.json({ code: 500, message: '删除失败：' + e.message });
  }
});

// ========== 分类管理 ==========
router.get('/categories', adminAuth, (req, res) => {
  const list = db.prepare('SELECT c.*, COUNT(a.id) as api_count FROM categories c LEFT JOIN apis a ON c.id = a.category_id GROUP BY c.id ORDER BY c.sort_order').all();
  res.json({ code: 200, data: list });
});

router.post('/categories', adminAuth, (req, res) => {
  const { name, icon, description, sort_order } = req.body;
  if (!name) return res.json({ code: 400, message: '分类名称必填' });
  const result = db.prepare('INSERT INTO categories (name, icon, description, sort_order) VALUES (?, ?, ?, ?)').run(name, icon || '', description || '', sort_order || 0);
  res.json({ code: 200, message: '创建成功', data: { id: result.lastInsertRowid } });
});

router.put('/categories/:id', adminAuth, (req, res) => {
  const { name, icon, description, sort_order } = req.body;
  db.prepare('UPDATE categories SET name=?, icon=?, description=?, sort_order=? WHERE id=?').run(name, icon || '', description || '', sort_order || 0, req.params.id);
  res.json({ code: 200, message: '更新成功' });
});

router.delete('/categories/:id', adminAuth, (req, res) => {
  const count = db.prepare('SELECT COUNT(*) as cnt FROM apis WHERE category_id = ?').get(req.params.id).cnt;
  if (count > 0) return res.json({ code: 400, message: `该分类下有 ${count} 个接口，请先迁移` });
  db.prepare('DELETE FROM categories WHERE id = ?').run(req.params.id);
  res.json({ code: 200, message: '删除成功' });
});

// ========== 用户管理 ==========
router.get('/users', adminAuth, (req, res) => {
  const { page = 1, limit = 15, keyword } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  let where = "WHERE 1=1";
  const params = [];
  if (keyword) { where += ' AND (username LIKE ? OR email LIKE ? OR nickname LIKE ?)'; params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`); }

  const total = db.prepare(`SELECT COUNT(*) as cnt FROM users ${where}`).get(...params).cnt;
  const list = db.prepare(`
    SELECT u.id, u.uid, u.username, u.email, u.nickname, u.avatar, u.role, u.status, u.email_verified, u.credits, u.created_at,
      (SELECT COUNT(*) FROM call_logs WHERE user_id = u.id) as total_calls,
      (SELECT COUNT(*) FROM user_keys WHERE user_id = u.id AND status = 1) as key_count
    FROM users u ${where} ORDER BY u.id DESC LIMIT ? OFFSET ?
  `).all(...params, parseInt(limit), offset);
  res.json({ code: 200, data: { list, total } });
});

// 获取单个用户详情
router.get('/users/:id', adminAuth, (req, res) => {
  const user = db.prepare(`
    SELECT u.id, u.uid, u.username, u.email, u.nickname, u.avatar, u.role, u.api_key, u.api_secret, u.status, u.email_verified, u.credits, u.created_at, u.updated_at,
      (SELECT COUNT(*) FROM call_logs WHERE user_id = u.id) as total_calls,
      (SELECT COUNT(*) FROM user_keys WHERE user_id = u.id) as key_count,
      (SELECT COUNT(*) FROM favorites WHERE user_id = u.id) as favorite_count
    FROM users u WHERE u.id = ?
  `).get(req.params.id);
  if (!user) return res.json({ code: 404, message: '用户不存在' });
  res.json({ code: 200, data: user });
});

// 管理员新增用户
router.post('/users', adminAuth, (req, res) => {
  const { username, email, password, nickname, role = 'user' } = req.body;
  if (!username || !email || !password) return res.json({ code: 400, message: '用户名、邮箱、密码必填' });
  if (password.length < 6) return res.json({ code: 400, message: '密码至少6位' });
  if (!['user', 'admin'].includes(role)) return res.json({ code: 400, message: '角色无效' });

  const exist = db.prepare('SELECT id FROM users WHERE username = ? OR email = ?').get(username, email);
  if (exist) return res.json({ code: 400, message: '用户名或邮箱已存在' });

  const { v4: uuidv4 } = require('uuid');
  const { nanoid } = require('nanoid');
  const bcrypt = require('bcryptjs');
  const uid = uuidv4().replace(/-/g, '').substring(0, 12).toUpperCase();
  const apiKey = 'mk_' + nanoid(32);
  const apiSecret = 'ms_' + nanoid(48);
  const hash = bcrypt.hashSync(password, 10);
  const finalNickname = nickname || username;

  const result = db.prepare(`
    INSERT INTO users (uid, username, email, password, nickname, role, api_key, api_secret, email_verified)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
  `).run(uid, username, email, hash, finalNickname, role, apiKey, apiSecret);

  res.json({ code: 200, message: '用户创建成功', data: { id: result.lastInsertRowid } });
});

// 管理员编辑用户
router.put('/users/:id', adminAuth, (req, res) => {
  const { nickname, email, role, status, credits } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.json({ code: 404, message: '用户不存在' });

  const updates = [];
  const params = [];

  if (nickname !== undefined) { updates.push('nickname = ?'); params.push(nickname); }
  if (email !== undefined) {
    const exist = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(email, req.params.id);
    if (exist) return res.json({ code: 400, message: '邮箱已被使用' });
    updates.push('email = ?'); params.push(email);
  }
  if (role !== undefined) {
    if (user.role === 'admin' && role !== 'admin') return res.json({ code: 403, message: '不能移除管理员权限' });
    updates.push('role = ?'); params.push(role);
  }
  if (status !== undefined) {
    if (user.role === 'admin') return res.json({ code: 403, message: '不能禁用管理员账号' });
    updates.push('status = ?'); params.push(status ? 1 : 0);
  }
  if (credits !== undefined) {
    const creditDiff = credits - (user.credits || 0);
    updates.push('credits = ?'); params.push(Math.max(0, credits));
    // 如果积分增加，记录到积分流水
    if (creditDiff > 0) {
      db.prepare(`INSERT INTO credit_transactions (user_id, amount, type, description) VALUES (?, ?, 'admin_add', '管理员调整')`).run(user.id, creditDiff);
    } else if (creditDiff < 0) {
      db.prepare(`INSERT INTO credit_transactions (user_id, amount, type, description) VALUES (?, ?, 'consume', '管理员调整')`).run(user.id, Math.abs(creditDiff));
    }
  }

  if (updates.length === 0) return res.json({ code: 400, message: '没有需要更新的字段' });

  updates.push('updated_at = CURRENT_TIMESTAMP');
  params.push(req.params.id);
  db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  res.json({ code: 200, message: '用户信息已更新' });
});

// 重置用户密钥
router.post('/users/:id/reset-key', adminAuth, (req, res) => {
  const user = db.prepare('SELECT id, role FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.json({ code: 404, message: '用户不存在' });

  const { nanoid } = require('nanoid');
  const apiKey = 'mk_' + nanoid(32);
  const apiSecret = 'ms_' + nanoid(48);
  db.prepare('UPDATE users SET api_key = ?, api_secret = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(apiKey, apiSecret, req.params.id);
  res.json({ code: 200, message: '密钥已重置', data: { api_key: apiKey, api_secret: apiSecret } });
});

router.patch('/users/:id/toggle', adminAuth, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.json({ code: 404, message: '用户不存在' });
  if (user.role === 'admin') return res.json({ code: 403, message: '不能操作管理员账号' });
  db.prepare('UPDATE users SET status = ? WHERE id = ?').run(user.status === 1 ? 0 : 1, user.id);
  res.json({ code: 200, message: user.status === 1 ? '已禁用' : '已启用' });
});

router.put('/users/:id/role', adminAuth, (req, res) => {
  const { role } = req.body;
  if (!['user', 'admin'].includes(role)) return res.json({ code: 400, message: '角色无效' });
  db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, req.params.id);
  res.json({ code: 200, message: '角色已更新' });
});

router.delete('/users/:id', adminAuth, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.json({ code: 404, message: '用户不存在' });
  if (user.role === 'admin') return res.json({ code: 403, message: '不能删除管理员' });
  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  res.json({ code: 200, message: '已删除' });
});

// ========== 系统配置 ==========
router.get('/configs', adminAuth, (req, res) => {
  const configs = db.prepare('SELECT * FROM configs ORDER BY key').all();
  const obj = {};
  configs.forEach(c => { obj[c.key] = { value: c.value, description: c.description }; });
  res.json({ code: 200, data: obj });
});

router.put('/configs', adminAuth, (req, res) => {
  const updates = req.body; // { key: value, ... }
  const update = db.prepare('UPDATE configs SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?');
  const insertOrUpdate = db.transaction(() => {
    Object.entries(updates).forEach(([key, value]) => {
      update.run(String(value), key);
    });
  });
  insertOrUpdate();
  res.json({ code: 200, message: '配置已保存' });
});

// ========== 公告管理 ==========
router.get('/announcements', adminAuth, (req, res) => {
  const list = db.prepare('SELECT * FROM announcements ORDER BY id DESC').all();
  res.json({ code: 200, data: list });
});

router.post('/announcements', adminAuth, (req, res) => {
  const { title, content, type = 'topbar', is_active = 1 } = req.body;
  if (!title || !content) return res.json({ code: 400, message: '标题和内容必填' });
  if (!['topbar', 'popup', 'both'].includes(type)) return res.json({ code: 400, message: '类型无效' });
  const result = db.prepare('INSERT INTO announcements (title, content, type, is_active) VALUES (?, ?, ?, ?)').run(title, content, type, is_active);
  res.json({ code: 200, message: '发布成功', data: { id: result.lastInsertRowid } });
});

router.put('/announcements/:id', adminAuth, (req, res) => {
  const { title, content, type, is_active } = req.body;
  if (type && !['topbar', 'popup', 'both'].includes(type)) return res.json({ code: 400, message: '类型无效' });
  let sql = 'UPDATE announcements SET title=?, content=?';
  const params = [title, content];
  if (type) { sql += ', type=?'; params.push(type); }
  if (is_active !== undefined) { sql += ', is_active=?'; params.push(is_active ? 1 : 0); }
  sql += ' WHERE id=?';
  params.push(req.params.id);
  db.prepare(sql).run(...params);
  res.json({ code: 200, message: '更新成功' });
});

router.delete('/announcements/:id', adminAuth, (req, res) => {
  db.prepare('DELETE FROM announcements WHERE id = ?').run(req.params.id);
  res.json({ code: 200, message: '删除成功' });
});

// ========== 调用日志 ==========
router.get('/logs', adminAuth, (req, res) => {
  const { page = 1, limit = 20, api_id } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  let where = 'WHERE 1=1';
  const params = [];
  if (api_id) { where += ' AND l.api_id = ?'; params.push(parseInt(api_id)); }
  
  const total = db.prepare(`SELECT COUNT(*) as cnt FROM call_logs l ${where}`).get(...params).cnt;
  const list = db.prepare(`
    SELECT l.*, a.name as api_name, u.username
    FROM call_logs l
    LEFT JOIN apis a ON l.api_id = a.id
    LEFT JOIN users u ON l.user_id = u.id
    ${where} ORDER BY l.id DESC LIMIT ? OFFSET ?
  `).all(...params, parseInt(limit), offset);
  res.json({ code: 200, data: { list, total } });
});


// ========== 测试SMTP ==========
router.post('/test-smtp', adminAuth, async (req, res) => {
  const { email } = req.body;
  const { sendMail } = require('../utils/mailer');
  try {
    await sendMail({
      to: email || req.user.email,
      subject: '【MuYunAPI】SMTP配置测试',
      html: '<p>恭喜！您的SMTP邮件服务配置正确，测试邮件发送成功。</p>'
    });
    res.json({ code: 200, message: '测试邮件已发送，请检查邮箱' });
  } catch (e) {
    res.json({ code: 500, message: '发送失败：' + e.message });
  }
});
module.exports = router;

