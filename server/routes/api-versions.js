const express = require('express');
const router = express.Router({ mergeParams: true });
const db = require('../db/init');
const { adminAuth } = require('../middleware/auth');

// 获取API的所有版本
router.get('/', (req, res) => {
  const apiId = parseInt(req.params.apiId);
  if (!apiId) return res.json({ code: 400, message: 'API ID无效' });

  const versions = db.prepare(`
    SELECT v.*, u.nickname as creator_name
    FROM api_versions v
    LEFT JOIN users u ON v.created_by = u.id
    WHERE v.api_id = ?
    ORDER BY v.created_at DESC
  `).all(apiId);

  res.json({ code: 200, data: versions });
});

// 获取单个版本详情
router.get('/:version', (req, res) => {
  const apiId = parseInt(req.params.apiId);
  const version = req.params.version;

  const v = db.prepare(`
    SELECT v.*, u.nickname as creator_name
    FROM api_versions v
    LEFT JOIN users u ON v.created_by = u.id
    WHERE v.api_id = ? AND v.version = ?
  `).get(apiId, version);

  if (!v) return res.json({ code: 404, message: '版本不存在' });

  // 解析JSON字段
  v.params = JSON.parse(v.params || '[]');
  v.headers = JSON.parse(v.headers || '{}');

  res.json({ code: 200, data: v });
});

// 创建新版本
router.post('/', adminAuth, (req, res) => {
  const apiId = parseInt(req.params.apiId);
  const { version, endpoint, params, headers, response_example, doc_content, changelog, is_active } = req.body;

  if (!version) return res.json({ code: 400, message: '版本号必填' });
  if (!/^(v\d+|\d+\.\d+\.\d+)$/.test(version)) {
    return res.json({ code: 400, message: '版本号格式无效，如 v1, v2 或 1.0.0' });
  }

  // 检查API是否存在
  const api = db.prepare('SELECT id FROM apis WHERE id = ?').get(apiId);
  if (!api) return res.json({ code: 404, message: 'API不存在' });

  // 检查版本是否已存在
  const existing = db.prepare('SELECT id FROM api_versions WHERE api_id = ? AND version = ?').get(apiId, version);
  if (existing) return res.json({ code: 400, message: '该版本号已存在' });

  try {
    const result = db.prepare(`
      INSERT INTO api_versions (api_id, version, endpoint, params, headers, response_example, doc_content, changelog, is_active, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      apiId, version,
      endpoint || '',
      JSON.stringify(params || []),
      JSON.stringify(headers || {}),
      response_example || '',
      doc_content || '',
      changelog || '',
      is_active ? 1 : 0,
      req.user.id
    );

    // 如果设为激活，更新API的当前版本和其他版本的激活状态
    if (is_active) {
      db.prepare('UPDATE api_versions SET is_active = 0 WHERE api_id = ?').run(apiId);
      db.prepare('UPDATE apis SET current_version = ? WHERE id = ?').run(version, apiId);
    }

    res.json({ code: 200, message: '版本创建成功', data: { id: result.lastInsertRowid } });
  } catch (e) {
    console.error('[api-versions] 创建失败:', e);
    res.json({ code: 500, message: '创建失败：' + e.message });
  }
});

// 更新版本
router.put('/:version', adminAuth, (req, res) => {
  const apiId = parseInt(req.params.apiId);
  const version = req.params.version;
  const { endpoint, params, headers, response_example, doc_content, changelog, is_active } = req.body;

  const existing = db.prepare('SELECT * FROM api_versions WHERE api_id = ? AND version = ?').get(apiId, version);
  if (!existing) return res.json({ code: 404, message: '版本不存在' });

  try {
    db.prepare(`
      UPDATE api_versions SET
        endpoint = ?, params = ?, headers = ?, response_example = ?,
        doc_content = ?, changelog = ?, is_active = ?
      WHERE api_id = ? AND version = ?
    `).run(
      endpoint || existing.endpoint,
      JSON.stringify(params || []),
      JSON.stringify(headers || {}),
      response_example || existing.response_example,
      doc_content || existing.doc_content,
      changelog || existing.changelog,
      is_active !== undefined ? (is_active ? 1 : 0) : existing.is_active,
      apiId, version
    );

    // 如果设为激活，更新API的当前版本
    if (is_active) {
      db.prepare('UPDATE api_versions SET is_active = 0 WHERE api_id = ?').run(apiId);
      db.prepare('UPDATE api_versions SET is_active = 1 WHERE api_id = ? AND version = ?').run(apiId, version);
      db.prepare('UPDATE apis SET current_version = ? WHERE id = ?').run(version, apiId);
    }

    res.json({ code: 200, message: '版本更新成功' });
  } catch (e) {
    console.error('[api-versions] 更新失败:', e);
    res.json({ code: 500, message: '更新失败：' + e.message });
  }
});

// 删除版本
router.delete('/:version', adminAuth, (req, res) => {
  const apiId = parseInt(req.params.apiId);
  const version = req.params.version;

  const existing = db.prepare('SELECT is_active FROM api_versions WHERE api_id = ? AND version = ?').get(apiId, version);
  if (!existing) return res.json({ code: 404, message: '版本不存在' });

  if (existing.is_active) {
    return res.json({ code: 400, message: '无法删除当前激活版本，请先切换到其他版本' });
  }

  try {
    db.prepare('DELETE FROM api_versions WHERE api_id = ? AND version = ?').run(apiId, version);
    res.json({ code: 200, message: '版本已删除' });
  } catch (e) {
    console.error('[api-versions] 删除失败:', e);
    res.json({ code: 500, message: '删除失败：' + e.message });
  }
});

// 切换激活版本
router.post('/:version/activate', adminAuth, (req, res) => {
  const apiId = parseInt(req.params.apiId);
  const version = req.params.version;

  const existing = db.prepare('SELECT id FROM api_versions WHERE api_id = ? AND version = ?').get(apiId, version);
  if (!existing) return res.json({ code: 404, message: '版本不存在' });

  try {
    // 取消其他版本的激活状态
    db.prepare('UPDATE api_versions SET is_active = 0 WHERE api_id = ?').run(apiId);
    // 激活当前版本
    db.prepare('UPDATE api_versions SET is_active = 1 WHERE api_id = ? AND version = ?').run(apiId, version);
    // 更新API的当前版本
    db.prepare('UPDATE apis SET current_version = ? WHERE id = ?').run(version, apiId);

    res.json({ code: 200, message: '版本已切换' });
  } catch (e) {
    console.error('[api-versions] 切换失败:', e);
    res.json({ code: 500, message: '切换失败：' + e.message });
  }
});

// 从当前API复制创建新版本
router.post('/fork', adminAuth, (req, res) => {
  const apiId = parseInt(req.params.apiId);
  const { version, changelog } = req.body;

  if (!version) return res.json({ code: 400, message: '版本号必填' });

  const api = db.prepare('SELECT * FROM apis WHERE id = ?').get(apiId);
  if (!api) return res.json({ code: 404, message: 'API不存在' });

  const existing = db.prepare('SELECT id FROM api_versions WHERE api_id = ? AND version = ?').get(apiId, version);
  if (existing) return res.json({ code: 400, message: '该版本号已存在' });

  try {
    const result = db.prepare(`
      INSERT INTO api_versions (api_id, version, endpoint, params, headers, response_example, doc_content, changelog, is_active, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
    `).run(
      apiId, version,
      api.endpoint,
      api.params,
      api.headers,
      api.response_example,
      api.doc_content,
      changelog || `从当前版本复制`,
      req.user.id
    );

    res.json({ code: 200, message: '版本复制成功', data: { id: result.lastInsertRowid } });
  } catch (e) {
    console.error('[api-versions] 复制失败:', e);
    res.json({ code: 500, message: '复制失败：' + e.message });
  }
});

module.exports = router;
