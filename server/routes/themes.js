const express = require('express');
const router = express.Router();
const db = require('../db/init');
const { auth, optionalAuth } = require('../middleware/auth');

// 内置主题列表（前端内置，后端提供兼容接口）
const builtInThemes = [
  {
    id: 'default-dark',
    name: '默认暗夜',
    type: 'dark',
    is_public: 1,
    css_vars: JSON.stringify({
      '--primary': '#e99312',
      '--primary-light': '#f5c842',
      '--primary-dark': '#c47d0a',
      '--bg-main': '#0d0d1a',
      '--bg-card': '#12122a',
      '--bg-card2': '#1a1a35',
      '--bg-card3': '#1e1e3f',
      '--border': 'rgba(255,255,255,0.06)',
      '--border-active': 'rgba(233,147,18,0.4)',
      '--text-primary': '#f0f0f8',
      '--text-secondary': '#a0a0c0',
      '--text-muted': '#6060a0',
      '--success': '#67c23a',
      '--danger': '#f56c6c',
      '--info': '#409eff',
      '--warning': '#e99312',
      '--shadow-sm': '0 2px 12px rgba(0,0,0,0.3)',
      '--shadow-md': '0 8px 32px rgba(0,0,0,0.4)',
      '--shadow-lg': '0 16px 48px rgba(0,0,0,0.5)',
      '--glow': '0 0 24px rgba(233,147,18,0.15)',
      '--radius-sm': '8px',
      '--radius-md': '12px',
      '--radius-lg': '16px',
      '--radius-xl': '24px',
    }),
    preview: '',
    created_by: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'mint-light',
    name: '薄荷清风',
    type: 'light',
    is_public: 1,
    css_vars: JSON.stringify({
      '--primary': '#00d9a5',
      '--primary-light': '#33e3b5',
      '--primary-dark': '#00b88a',
      '--bg-main': '#f8fffe',
      '--bg-card': '#ffffff',
      '--bg-card2': '#f0faf7',
      '--bg-card3': '#e6f5f0',
      '--border': 'rgba(0,0,0,0.08)',
      '--border-active': 'rgba(0,217,165,0.4)',
      '--text-primary': '#1a1a2e',
      '--text-secondary': '#4a5568',
      '--text-muted': '#718096',
      '--success': '#10b981',
      '--danger': '#ef4444',
      '--info': '#3b82f6',
      '--warning': '#f59e0b',
      '--shadow-sm': '0 2px 12px rgba(0,0,0,0.05)',
      '--shadow-md': '0 8px 32px rgba(0,0,0,0.08)',
      '--shadow-lg': '0 16px 48px rgba(0,0,0,0.1)',
      '--glow': '0 0 24px rgba(0,217,165,0.12)',
      '--radius-sm': '8px',
      '--radius-md': '12px',
      '--radius-lg': '16px',
      '--radius-xl': '24px',
    }),
    preview: '',
    created_by: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
];

// 初始化内置主题到数据库
function initBuiltInThemes() {
  builtInThemes.forEach(theme => {
    const existing = db.prepare('SELECT id FROM themes WHERE id = ?').get(theme.id);
    if (!existing) {
      db.prepare(`
        INSERT INTO themes (id, name, type, css_vars, preview, is_public, created_by, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(theme.id, theme.name, theme.type, theme.css_vars, theme.preview, 1, null, theme.created_at, theme.updated_at);
    }
  });
}
initBuiltInThemes();

// 获取公开主题列表（内置+用户公开主题）- 支持分页/搜索/分类
router.get('/public', (req, res) => {
  const { keyword, type, page = 1, limit = 20 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  let where = 'WHERE is_public = 1';
  const params = [];

  if (keyword) {
    where += ' AND (name LIKE ? OR id LIKE ?)';
    params.push(`%${keyword}%`, `%${keyword}%`);
  }
  if (type) {
    where += ' AND type = ?';
    params.push(type);
  }

  const total = db.prepare(`SELECT COUNT(*) as cnt FROM themes ${where}`).get(...params).cnt;
  const themes = db.prepare(`
    SELECT id, name, type, css_vars, preview, is_public, created_at
    FROM themes ${where}
    ORDER BY created_at ASC
    LIMIT ? OFFSET ?
  `).all(...params, parseInt(limit), offset);

  const result = themes.map(t => ({
    ...t,
    css_vars: JSON.parse(t.css_vars || '{}'),
    isBuiltIn: !t.created_by,
  }));

  res.json({ code: 200, data: { list: result, total, page: parseInt(page), limit: parseInt(limit) } });
});

// 获取我的主题（需要登录）- 支持分页/搜索
router.get('/my', auth, (req, res) => {
  const { keyword, type, page = 1, limit = 20 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  let where = 'WHERE created_by = ?';
  const params = [req.user.id];

  if (keyword) {
    where += ' AND (name LIKE ? OR id LIKE ?)';
    params.push(`%${keyword}%`, `%${keyword}%`);
  }
  if (type) {
    where += ' AND type = ?';
    params.push(type);
  }

  const total = db.prepare(`SELECT COUNT(*) as cnt FROM themes ${where}`).get(...params).cnt;
  const themes = db.prepare(`
    SELECT id, name, type, css_vars, preview, is_public, created_at, updated_at
    FROM themes ${where}
    ORDER BY updated_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, parseInt(limit), offset);

  const result = themes.map(t => ({
    ...t,
    css_vars: JSON.parse(t.css_vars || '{}'),
    isBuiltIn: false,
  }));

  res.json({ code: 200, data: { list: result, total, page: parseInt(page), limit: parseInt(limit) } });
});

// 获取所有主题（后台用）- 支持分页/搜索
router.get('/', auth, (req, res) => {
  const { keyword, type, is_public, page = 1, limit = 20 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  let where = 'WHERE 1=1';
  const params = [];

  if (keyword) {
    where += ' AND (t.name LIKE ? OR t.id LIKE ?)';
    params.push(`%${keyword}%`, `%${keyword}%`);
  }
  if (type) {
    where += ' AND t.type = ?';
    params.push(type);
  }
  if (is_public !== undefined) {
    where += ' AND t.is_public = ?';
    params.push(parseInt(is_public));
  }

  const total = db.prepare(`SELECT COUNT(*) as cnt FROM themes t ${where}`).get(...params).cnt;
  const themes = db.prepare(`
    SELECT t.*, u.nickname as creator_name,
           (SELECT COUNT(*) FROM themes WHERE created_by = t.created_by) as user_theme_count
    FROM themes t
    LEFT JOIN users u ON t.created_by = u.id
    ${where}
    ORDER BY t.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, parseInt(limit), offset);

  const result = themes.map(t => ({
    ...t,
    css_vars: JSON.parse(t.css_vars || '{}'),
    isBuiltIn: !t.created_by,
  }));

  res.json({ code: 200, data: { list: result, total, page: parseInt(page), limit: parseInt(limit) } });
});

// 获取单个主题详情
router.get('/:id', optionalAuth, (req, res) => {
  const theme = db.prepare(`
    SELECT * FROM themes WHERE id = ?
  `).get(req.params.id);

  if (!theme) {
    return res.json({ code: 404, message: '主题不存在' });
  }

  // 检查权限：公开主题或作者本人
  if (!theme.is_public && (!req.user || req.user.id !== theme.created_by)) {
    return res.json({ code: 403, message: '无权访问此主题' });
  }

  res.json({
    code: 200,
    data: {
      ...theme,
      css_vars: JSON.parse(theme.css_vars || '{}'),
      isBuiltIn: !theme.created_by,
    }
  });
});

// 创建主题（需要登录）
router.post('/', auth, (req, res) => {
  const { id, name, type, css_vars, preview, is_public = 0 } = req.body;

  if (!name || !css_vars) {
    return res.json({ code: 400, message: '主题名称和CSS变量必填' });
  }

  // 验证CSS变量格式
  if (typeof css_vars !== 'object') {
    return res.json({ code: 400, message: 'CSS变量格式错误' });
  }

  // 生成ID
  const themeId = id || 'custom_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);

  // 检查ID是否重复
  const existing = db.prepare('SELECT id FROM themes WHERE id = ?').get(themeId);
  if (existing) {
    return res.json({ code: 400, message: '主题ID已存在' });
  }

  db.prepare(`
    INSERT INTO themes (id, name, type, css_vars, preview, is_public, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(themeId, name, type || 'custom', JSON.stringify(css_vars), preview || '', is_public ? 1 : 0, req.user.id);

  res.json({ code: 200, message: '主题创建成功', data: { id: themeId } });
});

// 更新主题（需要登录）
router.put('/:id', auth, (req, res) => {
  const theme = db.prepare('SELECT * FROM themes WHERE id = ?').get(req.params.id);

  if (!theme) {
    return res.json({ code: 404, message: '主题不存在' });
  }

  // 只能修改自己的主题
  if (theme.created_by !== req.user.id) {
    return res.json({ code: 403, message: '无权修改此主题' });
  }

  const { name, type, css_vars, preview, is_public } = req.body;

  const updates = [];
  const params = [];

  if (name !== undefined) { updates.push('name = ?'); params.push(name); }
  if (type !== undefined) { updates.push('type = ?'); params.push(type); }
  if (css_vars !== undefined) { updates.push('css_vars = ?'); params.push(typeof css_vars === 'object' ? JSON.stringify(css_vars) : css_vars); }
  if (preview !== undefined) { updates.push('preview = ?'); params.push(preview); }
  if (is_public !== undefined) { updates.push('is_public = ?'); params.push(is_public ? 1 : 0); }

  if (updates.length === 0) {
    return res.json({ code: 400, message: '没有需要更新的字段' });
  }

  updates.push('updated_at = CURRENT_TIMESTAMP');
  params.push(req.params.id);

  db.prepare(`UPDATE themes SET ${updates.join(', ')} WHERE id = ?`).run(...params);

  res.json({ code: 200, message: '主题更新成功' });
});

// 删除主题（需要登录）
router.delete('/:id', auth, (req, res) => {
  const theme = db.prepare('SELECT * FROM themes WHERE id = ?').get(req.params.id);

  if (!theme) {
    return res.json({ code: 404, message: '主题不存在' });
  }

  // 只能删除自己的主题
  if (theme.created_by !== req.user.id) {
    return res.json({ code: 403, message: '无权删除此主题' });
  }

  // 内置主题不能删除
  if (!theme.created_by) {
    return res.json({ code: 400, message: '内置主题不能删除' });
  }

  db.prepare('DELETE FROM themes WHERE id = ?').run(req.params.id);

  res.json({ code: 200, message: '主题删除成功' });
});

module.exports = router;
