const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../db/init');
const loader = require('../libraries/loader');  // 动态脚本加载器

// 配置文件上传
const uploadDir = path.join(__dirname, '../libraries/scripts');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${name}${ext}`);
  }
});
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/javascript' || file.mimetype === 'text/javascript' || file.originalname.endsWith('.js')) {
      cb(null, true);
    } else {
      cb(new Error('只允许上传 .js 文件'));
    }
  },
  limits: { fileSize: 1024 * 1024 } // 1MB
});

/**
 * 解析 Tampermonkey 风格的元数据块
 * 格式：
 * // ==MuYunAPI==
 * // @name         接口名称
 * // @slug         uuid
 * // @description  描述
 * // @category     6
 * // @method       GET
 * // @requireAuth  false
 * // @isFree       true
 * // ==/MuYunAPI==
 */
function parseMetadata(code) {
  const apis = [];
  const blockRegex = /\/\/\s*==MuYunAPI==([\s\S]*?)\/\/\s*==\/MuYunAPI==/g;
  let match;

  while ((match = blockRegex.exec(code)) !== null) {
    try {
      const block = match[1];
      const meta = {};

      // 解析简单字段：@name, @slug, @description, @category 等
      const getField = (field) => {
        const m = block.match(new RegExp(`\\/\\/\\s*@${field}\\s+(.+)`));
        return m ? m[1].trim() : null;
      };

      const name = getField('name');
      const slug = getField('slug');
      if (!name || !slug) continue;

      meta.name = name;
      meta.slug = slug;
      meta.description = getField('description') || '';
      const cat = getField('category');
      meta.category_id = cat ? parseInt(cat) : null;
      meta.method = (getField('method') || 'GET').toUpperCase();
      meta.require_auth = getField('requireAuth') === 'true';
      meta.is_free = getField('isFree') !== 'false';
      meta.theme = getField('theme') || 'both';

      // 解析 @params 和 @response（JSON 可能跨行）
      // 匹配从 @params 后的内容，直到下一个 // 开头的行或 ==/MuYunAPI==
      const paramsMatch = block.match(/\/\/\s*@params\s+([\s\S]*?)(?=\n\s*\/\/|==\/MuYunAPI==|$)/);
      const responseMatch = block.match(/\/\/\s*@response\s+([\s\S]*?)(?=\n\s*\/\/|==\/MuYunAPI==|$)/);

      if (paramsMatch) {
        try {
          meta.params = JSON.parse(paramsMatch[1].trim());
          if (!Array.isArray(meta.params)) meta.params = [];
        } catch {
          meta.params = [];
        }
      } else {
        meta.params = [];
      }

      meta.response_example = responseMatch ? responseMatch[1].trim() : '';

      apis.push(meta);
    } catch (e) {
      console.error(`[parseMetadata] 解析元数据块失败: ${e.message}`);
    }
  }

  return apis;
}

// 获取所有脚本中定义的接口（用于API管理选择）
router.get('/available', (req, res) => {
  try {
    const { page = 1, limit = 20, keyword } = req.query;
    const pageNum = Math.max(1, parseInt(page));
    const pageSize = Math.min(100, Math.max(1, parseInt(limit)));
    const offset = (pageNum - 1) * pageSize;

    const files = fs.readdirSync(uploadDir)
      .filter(f => f.endsWith('.js'));

    const apis = [];
    const importedSlugs = new Set(
      db.prepare("SELECT slug FROM apis WHERE source = 'local'").all().map(r => r.slug)
    );

    for (const f of files) {
      const filePath = path.join(uploadDir, f);
      const code = fs.readFileSync(filePath, 'utf-8');
      const parsed = parseMetadata(code);

      for (const api of parsed) {
        apis.push({
          ...api,
          filename: f,
          is_imported: importedSlugs.has(api.slug),
        });
      }
    }

    // 关键词过滤
    let filtered = apis;
    if (keyword) {
      const kw = keyword.toLowerCase();
      filtered = apis.filter(a =>
        a.name.toLowerCase().includes(kw) ||
        a.slug.toLowerCase().includes(kw) ||
        (a.description && a.description.toLowerCase().includes(kw))
      );
    }

    // 分页
    const total = filtered.length;
    const list = filtered.slice(offset, offset + pageSize);

    res.json({ code: 200, data: { list, total, page: pageNum, pageSize, totalPages: Math.ceil(total / pageSize) } });
  } catch (e) {
    console.error('[libraries/available]', e);
    res.json({ code: 500, message: e.message });
  }
});

// 获取所有已上传的脚本文件列表
router.get('/files', (req, res) => {
  try {
    const files = fs.readdirSync(uploadDir)
      .filter(f => f.endsWith('.js'))
      .map(f => {
        const filePath = path.join(uploadDir, f);
        const stat = fs.statSync(filePath);
        const code = fs.readFileSync(filePath, 'utf-8');
        const apis = parseMetadata(code);
        return {
          filename: f,
          size: stat.size,
          modified: stat.mtime,
          apis: apis.map(a => ({ name: a.name, slug: a.slug })),
          api_count: apis.length,
        };
      });
    res.json({ code: 200, data: files });
  } catch (e) {
    res.json({ code: 500, message: e.message });
  }
});

// 上传脚本文件
router.post('/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) return res.json({ code: 400, message: '请选择文件' });

    const code = fs.readFileSync(req.file.path, 'utf-8');
    const apis = parseMetadata(code);

    // 刷新动态加载器缓存
    loader.loadAllScripts();

    res.json({
      code: 200,
      message: apis.length > 0 ? `解析到 ${apis.length} 个接口` : '未检测到接口定义',
      data: {
        filename: req.file.filename,
        apis,
      }
    });
  } catch (e) {
    res.json({ code: 500, message: e.message });
  }
});

// 读取脚本内容
router.get('/file/:filename', (req, res) => {
  const { filename } = req.params;
  const safeName = path.basename(filename);
  const filePath = path.join(uploadDir, safeName);

  if (!fs.existsSync(filePath)) {
    return res.json({ code: 404, message: '文件不存在' });
  }

  const code = fs.readFileSync(filePath, 'utf-8');
  const apis = parseMetadata(code);

  res.json({ code: 200, data: { filename: safeName, code, apis } });
});

// 删除脚本文件
router.delete('/file/:filename', (req, res) => {
  const { filename } = req.params;
  const safeName = path.basename(filename);
  const filePath = path.join(uploadDir, safeName);

  if (!fs.existsSync(filePath)) {
    return res.json({ code: 404, message: '文件不存在' });
  }

  fs.unlinkSync(filePath);
  
  // 刷新动态加载器缓存
  loader.clearCache(safeName);

  res.json({ code: 200, message: '删除成功' });
});

// 将解析出的接口批量导入到数据库
router.post('/import', (req, res) => {
  const { filename, apis } = req.body;
  if (!filename || !apis || !Array.isArray(apis)) {
    return res.json({ code: 400, message: '参数错误' });
  }

  let imported = 0;
  let skipped = 0;

  for (const api of apis) {
    // 检查是否已存在
    const exist = db.prepare('SELECT id FROM apis WHERE slug = ?').get(api.slug);
    if (exist) {
      skipped++;
      continue;
    }

    db.prepare(`
      INSERT INTO apis (name, slug, category_id, description, endpoint, method, params, response_example, source, is_free, require_auth, status, sort_order, theme)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'local', ?, ?, 1, 0, ?)
    `).run(
      api.name,
      api.slug,
      api.category_id || null,
      api.description || '',
      `local://${api.slug}`,
      api.method || 'GET',
      JSON.stringify(api.params || []),
      api.response_example || '',
      api.is_free !== false ? 1 : 0,
      api.require_auth ? 1 : 0,
      api.theme || 'both'
    );
    imported++;
  }

  res.json({
    code: 200,
    message: `导入成功 ${imported} 个${skipped > 0 ? `，跳过 ${skipped} 个（已存在）` : ''}`,
  });
});

module.exports = router;
