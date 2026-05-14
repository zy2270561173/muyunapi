const express = require('express');
const router = express.Router();
const db = require('../db/init');
const { adminAuth } = require('../middleware/auth');

// 获取所有时间线类型
router.get('/', (req, res) => {
  try {
    const types = db.prepare('SELECT * FROM timeline_types ORDER BY sort_order ASC, id ASC').all();
    res.json({ code: 200, data: types });
  } catch (e) {
    console.error('[timeline-types] 获取类型失败:', e);
    res.json({ code: 500, message: '获取类型失败' });
  }
});

// 创建时间线类型
router.post('/', adminAuth, (req, res) => {
  const { type_key, label, icon, color, tag_type } = req.body;

  if (!type_key || !label) {
    return res.json({ code: 400, message: '类型键和名称不能为空' });
  }

  // 检查类型键是否已存在
  const exists = db.prepare('SELECT id FROM timeline_types WHERE type_key = ?').get(type_key);
  if (exists) {
    return res.json({ code: 400, message: '类型键已存在' });
  }

  // 获取最大排序值
  const maxOrder = db.prepare('SELECT MAX(sort_order) as max FROM timeline_types').get();
  const sort_order = (maxOrder.max || 0) + 1;

  try {
    const result = db.prepare(`
      INSERT INTO timeline_types (type_key, label, icon, color, tag_type, sort_order, is_system)
      VALUES (?, ?, ?, ?, ?, ?, 0)
    `).run(type_key, label, icon || 'Clock', color || '#409eff', tag_type || 'default', sort_order);

    const newType = db.prepare('SELECT * FROM timeline_types WHERE id = ?').get(result.lastInsertRowid);
    res.json({ code: 200, data: newType, message: '创建成功' });
  } catch (e) {
    console.error('[timeline-types] 创建类型失败:', e);
    res.json({ code: 500, message: '创建失败' });
  }
});

// 更新时间线类型
router.put('/:id', adminAuth, (req, res) => {
  const { id } = req.params;
  const { label, icon, color, tag_type, sort_order } = req.body;

  try {
    const type = db.prepare('SELECT * FROM timeline_types WHERE id = ?').get(id);
    if (!type) {
      return res.json({ code: 404, message: '类型不存在' });
    }

    db.prepare(`
      UPDATE timeline_types SET
        label = ?,
        icon = ?,
        color = ?,
        tag_type = ?,
        sort_order = ?
      WHERE id = ?
    `).run(
      label ?? type.label,
      icon ?? type.icon,
      color ?? type.color,
      tag_type ?? type.tag_type,
      sort_order ?? type.sort_order,
      id
    );

    const updatedType = db.prepare('SELECT * FROM timeline_types WHERE id = ?').get(id);
    res.json({ code: 200, data: updatedType, message: '更新成功' });
  } catch (e) {
    console.error('[timeline-types] 更新类型失败:', e);
    res.json({ code: 500, message: '更新失败' });
  }
});

// 删除时间线类型
router.delete('/:id', adminAuth, (req, res) => {
  const { id } = req.params;

  try {
    const type = db.prepare('SELECT * FROM timeline_types WHERE id = ?').get(id);
    if (!type) {
      return res.json({ code: 404, message: '类型不存在' });
    }

    // 系统类型不能删除
    if (type.is_system) {
      return res.json({ code: 400, message: '系统类型不能删除' });
    }

    db.prepare('DELETE FROM timeline_types WHERE id = ?').run(id);
    res.json({ code: 200, message: '删除成功' });
  } catch (e) {
    console.error('[timeline-types] 删除类型失败:', e);
    res.json({ code: 500, message: '删除失败' });
  }
});

module.exports = router;
