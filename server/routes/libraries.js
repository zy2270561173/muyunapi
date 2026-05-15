const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const db = require('../db/init');
const loader = require('../libraries/loader');

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

  // 标准化换行符，处理 Windows/Mac/Unix 差异
  const normalizedCode = code.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // 多种正则尝试匹配元数据块
  const blockRegexes = [
    /\/\/\s*==MuYunAPI==([\s\S]*?)\/\/\s*==\/MuYunAPI==/g,
    /\/\*\s*==MuYunAPI==([\s\S]*?)\*\/\s*==\/MuYunAPI==/g,
    /#\s*==MuYunAPI==([\s\S]*?)#\s*==\/MuYunAPI==/g
  ];

  for (const blockRegex of blockRegexes) {
    let match;
    blockRegex.lastIndex = 0;

    while ((match = blockRegex.exec(normalizedCode)) !== null) {
      try {
        const block = match[1];
        const meta = {};

        // 解析字段，更宽松的匹配（支持 # 和 // 两种注释）
        const getField = (field) => {
          const patterns = [
            new RegExp(`(?:\\/\\/|#)\\s*@${field}\\s+(.+?)(?:\\n|$)`),
            new RegExp(`(?:\\/\\/|#)\\s*@${field}\\s+([\\s\\S]*?)(?=\\n\\s*(?:\\/\\/|#)\\s*@|$)`),
          ];

          for (const pattern of patterns) {
            const m = block.match(pattern);
            if (m && m[1]) {
              return m[1].trim();
            }
          }
          return null;
        };

        const name = getField('name');
        const slug = getField('slug');

        if (!name || !slug) {
          console.log(`[parseMetadata] 跳过：缺少 name 或 slug`);
          continue;
        }

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
        const paramsMatch = block.match(/(?:\/\/|#)\s*@params\s+([\s\S]*?)(?=\n\s*(?:\/\/|#)\s*@|==\/MuYunAPI==|$)/);
        const responseMatch = block.match(/(?:\/\/|#)\s*@response\s+([\s\S]*?)(?=\n\s*(?:\/\/|#)\s*@|==\/MuYunAPI==|$)/);

        if (paramsMatch) {
          try {
            const paramsStr = paramsMatch[1].trim();
            meta.params = JSON.parse(paramsStr);
            if (!Array.isArray(meta.params)) meta.params = [];
          } catch {
            meta.params = [];
          }
        } else {
          meta.params = [];
        }

        meta.response_example = responseMatch ? responseMatch[1].trim() : '';

        console.log(`[parseMetadata] 成功解析: ${name} (${slug})`);
        apis.push(meta);
      } catch (e) {
        console.error(`[parseMetadata] 解析元数据块失败: ${e.message}`);
      }
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

    // 获取数据库中已导入的接口 slug 列表
    const importedSlugs = new Set();
    try {
      const rows = db.prepare('SELECT slug FROM apis WHERE source = ? AND endpoint LIKE ?')
        .all('local', 'local://%');
      rows.forEach(row => importedSlugs.add(row.slug));
    } catch (e) {
      // 忽略数据库查询错误
    }

    // 先展开所有 API 成扁平列表
    const allApis = [];
    fs.readdirSync(uploadDir)
      .filter(f => f.endsWith('.js'))
      .forEach(f => {
        const code = fs.readFileSync(path.join(uploadDir, f), 'utf-8');
        const apis = parseMetadata(code);
        apis.forEach(api => {
          allApis.push({
            ...api,
            is_imported: importedSlugs.has(api.slug),
            source_filename: f
          });
        });
      });

    // 应用搜索过滤
    const filteredApis = keyword
      ? allApis.filter(a =>
          a.name.includes(keyword) ||
          a.slug.includes(keyword) ||
          a.description.includes(keyword)
        )
      : allApis;

    const total = filteredApis.length;
    const list = filteredApis.slice(offset, offset + pageSize);

    res.json({
      code: 200,
      data: {
        list,
        total,
        page: pageNum,
        pageSize,
        totalPages: Math.ceil(total / pageSize)
      }
    });
  } catch (e) {
    console.error('[libraries/available]', e);
    res.json({ code: 500, message: e.message });
  }
});

// 获取所有脚本列表（包含API信息）
router.get('/list', (req, res) => {
  try {
    const files = fs.readdirSync(uploadDir)
      .filter(f => f.endsWith('.js'))
      .map(f => {
        const code = fs.readFileSync(path.join(uploadDir, f), 'utf-8');
        const apis = parseMetadata(code);
        return {
          filename: f,
          size: fs.statSync(path.join(uploadDir, f)).size,
          apis,
          api_count: apis.length
        };
      });

    res.json({ code: 200, data: files });
  } catch (e) {
    res.json({ code: 500, message: e.message });
  }
});

// 上传脚本
router.post('/upload', upload.single('script'), (req, res) => {
  try {
    if (!req.file) {
      return res.json({ code: 400, message: '请上传 .js 文件' });
    }

    loader.loadAllScripts();

    const code = fs.readFileSync(req.file.path, 'utf-8');
    const apis = parseMetadata(code);

    res.json({
      code: 200,
      message: '上传成功',
      data: {
        filename: req.file.originalname,
        apis,
        path: req.file.path
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

// ==================== GitHub 内置库商店 ====================

// 获取商店配置
router.get('/github/store/config', (req, res) => {
  try {
    const configs = db.prepare('SELECT * FROM configs WHERE key IN (?, ?)')
      .all('github_store_repo', 'github_proxy_url');

    const configObj = {};
    configs.forEach(c => configObj[c.key] = c.value);

    res.json({
      code: 200,
      data: {
        default_repo: configObj.github_store_repo || 'zy2270561173/muyunapi-script',
        proxy_url: configObj.github_proxy_url || 'https://gh-proxy.org/',
        proxy_options: [
          { name: 'GitHub 直接访问', url: '' },
          { name: 'gh-proxy', url: 'https://gh-proxy.org/' },
          { name: 'FastGit', url: 'https://hub.fgit.gq/' },
          { name: 'jsdelivr', url: 'https://cdn.jsdelivr.net/gh/' }
        ]
      }
    });
  } catch (e) {
    console.error('[libraries/github/store/config]', e);
    res.json({ code: 500, message: e.message });
  }
});

// 更新商店配置
router.post('/github/store/config', (req, res) => {
  try {
    const { repo, proxy_url } = req.body;

    if (repo) {
      db.prepare('INSERT OR REPLACE INTO configs (key, value, description, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)')
        .run('github_store_repo', repo, 'GitHub内置库仓库');
    }

    if (proxy_url !== undefined) {
      db.prepare('INSERT OR REPLACE INTO configs (key, value, description, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)')
        .run('github_proxy_url', proxy_url, 'GitHub加速代理地址');
    }

    res.json({ code: 200, message: '配置更新成功' });
  } catch (e) {
    console.error('[libraries/github/store/config/update]', e);
    res.json({ code: 500, message: e.message });
  }
});

// 获取脚本列表
router.get('/github/store/list', (req, res) => {
  try {
    const { page = 1, limit = 20, keyword } = req.query;
    const pageNum = Math.max(1, parseInt(page));
    const pageSize = Math.min(100, Math.max(1, parseInt(limit)));
    const offset = (pageNum - 1) * pageSize;

    let sql = 'SELECT * FROM github_store_scripts WHERE is_active = 1';
    let countSql = 'SELECT COUNT(*) as total FROM github_store_scripts WHERE is_active = 1';
    const params = [];

    if (keyword) {
      sql += ' AND (display_name LIKE ? OR description LIKE ? OR script_name LIKE ?)';
      countSql += ' AND (display_name LIKE ? OR description LIKE ? OR script_name LIKE ?)';
      const kw = `%${keyword}%`;
      params.push(kw, kw, kw);
    }

    sql += ' ORDER BY download_count DESC, id DESC LIMIT ? OFFSET ?';

    const total = db.prepare(countSql).get(...params).total;
    const list = db.prepare(sql).all(...params, pageSize, offset);

    res.json({
      code: 200,
      data: {
        list,
        total,
        page: pageNum,
        pageSize,
        totalPages: Math.ceil(total / pageSize)
      }
    });
  } catch (e) {
    console.error('[libraries/github/store/list]', e);
    res.json({ code: 500, message: e.message });
  }
});

// 获取单个脚本内容
router.get('/github/store/script/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { proxy_url } = req.query;
    const script = db.prepare('SELECT * FROM github_store_scripts WHERE id = ? AND is_active = 1').get(id);

    if (!script) {
      return res.json({ code: 404, message: '脚本不存在' });
    }

    let url = script.raw_url;
    if (proxy_url && proxy_url !== '') {
      // 代理URL构建
      url = proxy_url.replace(/\/$/, '') + '/' + url;
    }

    const response = await axios.get(url, { timeout: 10000 });
    const code = response.data;

    db.prepare('UPDATE github_store_scripts SET download_count = download_count + 1 WHERE id = ?').run(id);

    res.json({
      code: 200,
      data: {
        ...script,
        code
      }
    });
  } catch (e) {
    console.error('[libraries/github/store/script]', e);
    res.json({ code: 500, message: '获取脚本失败：' + e.message });
  }
});

// 保存脚本到本地
router.post('/github/store/save', async (req, res) => {
  try {
    const { script_id, proxy_url } = req.body;

    if (!script_id) {
      return res.json({ code: 400, message: '缺少脚本ID' });
    }

    const script = db.prepare('SELECT * FROM github_store_scripts WHERE id = ? AND is_active = 1').get(script_id);
    if (!script) {
      return res.json({ code: 404, message: '脚本不存在' });
    }

    let url = script.raw_url;
    if (proxy_url && proxy_url !== '') {
      // 代理URL构建
      url = proxy_url.replace(/\/$/, '') + '/' + url;
    }

    const response = await axios.get(url, { timeout: 10000 });
    const code = response.data;

    const filePath = path.join(uploadDir, script.script_name);
    fs.writeFileSync(filePath, code, 'utf-8');

    loader.loadAllScripts();

    const parsed = parseMetadata(code);
    const apis = parsed.filter(a => a.slug);

    res.json({
      code: 200,
      message: '保存成功',
      data: {
        filename: script.script_name,
        apis,
        path: filePath
      }
    });
  } catch (e) {
    console.error('[libraries/github/store/save]', e);
    res.json({ code: 500, message: '保存失败：' + e.message });
  }
});

// 手动添加脚本
router.post('/github/store/add', (req, res) => {
  try {
    const { repo_owner, repo_name, script_name, script_path, display_name, description, category_id, author } = req.body;

    if (!repo_owner || !repo_name || !script_name || !script_path || !display_name) {
      return res.json({ code: 400, message: '缺少必填参数' });
    }

    const github_url = `https://github.com/${repo_owner}/${repo_name}/blob/main/${script_path}`;
    const raw_url = `https://raw.githubusercontent.com/${repo_owner}/${repo_name}/main/${script_path}`;

    const exist = db.prepare('SELECT id FROM github_store_scripts WHERE repo_owner = ? AND repo_name = ? AND script_name = ?')
      .get(repo_owner, repo_name, script_name);

    if (exist) {
      db.prepare(`
        UPDATE github_store_scripts SET
          display_name = ?, description = ?, category_id = ?, author = ?,
          github_url = ?, raw_url = ?, updated_at = CURRENT_TIMESTAMP
        WHERE repo_owner = ? AND repo_name = ? AND script_name = ?
      `).run(display_name, description || '', category_id || null, author || '', github_url, raw_url, repo_owner, repo_name, script_name);

      return res.json({ code: 200, message: '更新成功' });
    }

    db.prepare(`
      INSERT INTO github_store_scripts (repo_owner, repo_name, script_name, script_path, display_name, description, category_id, author, github_url, raw_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(repo_owner, repo_name, script_name, script_path, display_name, description || '', category_id || null, author || '', github_url, raw_url);

    res.json({ code: 200, message: '添加成功' });
  } catch (e) {
    console.error('[libraries/github/store/add]', e);
    res.json({ code: 500, message: '添加失败：' + e.message });
  }
});

// 删除脚本
router.delete('/github/store/script/:id', (req, res) => {
  try {
    const { id } = req.params;
    const script = db.prepare('SELECT * FROM github_store_scripts WHERE id = ?').get(id);

    if (!script) {
      return res.json({ code: 404, message: '脚本不存在' });
    }

    db.prepare('UPDATE github_store_scripts SET is_active = 0 WHERE id = ?').run(id);

    res.json({ code: 200, message: '删除成功' });
  } catch (e) {
    console.error('[libraries/github/store/delete]', e);
    res.json({ code: 500, message: '删除失败' });
  }
});

// 同步仓库脚本
router.post('/github/store/sync', async (req, res) => {
  try {
    const { repo_owner, repo_name, proxy_url } = req.body;

    if (!repo_owner || !repo_name) {
      return res.json({ code: 400, message: '缺少仓库信息' });
    }

    console.log(`[sync] 开始同步: ${repo_owner}/${repo_name}`);

    // 获取仓库内容
    let apiUrl = `https://api.github.com/repos/${repo_owner}/${repo_name}/contents/`;
    if (proxy_url && proxy_url !== '') {
      // 代理URL构建：去掉 https://，然后拼接
      apiUrl = proxy_url.replace(/\/$/, '') + '/' + apiUrl.replace('https://', '');
    }

    console.log(`[sync] 请求仓库API: ${apiUrl}`);

    const response = await axios.get(apiUrl, {
      timeout: 15000,
      headers: { 'Accept': 'application/vnd.github.v3+json' }
    });

    const jsFiles = response.data.filter(f => f.name.endsWith('.js') && f.type === 'file');
    console.log(`[sync] 找到 ${jsFiles.length} 个JS文件`);

    const results = [];
    const debugInfo = [];

    for (const file of jsFiles) {
      try {
        console.log(`[sync] 处理文件: ${file.name}`);

        let downloadUrl = file.download_url;
        if (proxy_url && proxy_url !== '') {
          // 代理URL构建：去掉 https://，然后拼接
          downloadUrl = proxy_url.replace(/\/$/, '') + '/' + downloadUrl.replace('https://', '');
        }

        console.log(`[sync] 下载URL: ${downloadUrl}`);

        const fileResponse = await axios.get(downloadUrl, { timeout: 10000 });
        const code = fileResponse.data;

        console.log(`[sync] 文件内容长度: ${code.length} 字符`);
        console.log(`[sync] 文件前200字符: ${code.substring(0, 200)}...`);

        const parsed = parseMetadata(code);
        console.log(`[sync] 解析结果: 找到 ${parsed.length} 个API`);

        debugInfo.push({
          name: file.name,
          contentLength: code.length,
          hasMetadata: parsed.length > 0,
          parsedCount: parsed.length
        });

        if (parsed.length > 0) {
          const api = parsed[0];
          const github_url = `https://github.com/${repo_owner}/${repo_name}/blob/main/${file.path}`;
          const raw_url = file.download_url;

          const exist = db.prepare('SELECT id FROM github_store_scripts WHERE repo_owner = ? AND repo_name = ? AND script_name = ?')
            .get(repo_owner, repo_name, file.name);

          if (exist) {
            db.prepare(`
              UPDATE github_store_scripts SET
                display_name = ?, description = ?, github_url = ?, raw_url = ?,
                updated_at = CURRENT_TIMESTAMP
              WHERE repo_owner = ? AND repo_name = ? AND script_name = ?
            `).run(api.name || file.name, api.description || '', github_url, raw_url, repo_owner, repo_name, file.name);
          } else {
            db.prepare(`
              INSERT INTO github_store_scripts (repo_owner, repo_name, script_name, script_path, display_name, description, github_url, raw_url)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `).run(repo_owner, repo_name, file.name, file.path, api.name || file.name, api.description || '', github_url, raw_url);
          }

          results.push({ name: file.name, parsed: parsed.length });
        }
      } catch (e) {
        console.warn(`[sync] 处理文件 ${file.name} 失败:`, e.message);
        debugInfo.push({
          name: file.name,
          error: e.message
        });
      }
    }

    console.log('[sync] 同步完成，调试信息:', debugInfo);

    res.json({
      code: 200,
      message: `同步完成，发现 ${results.length} 个有效脚本`,
      data: results,
      debug: debugInfo
    });
  } catch (e) {
    console.error('[libraries/github/store/sync]', e);
    res.json({ code: 500, message: '同步失败：' + e.message });
  }
});

// ==================== GitHub 脚本上传管理 ====================

// 获取本地脚本列表
router.get('/local/scripts', (req, res) => {
  try {
    const scriptDir = path.join(__dirname, '../../script');
    if (!fs.existsSync(scriptDir)) {
      return res.json({ code: 200, data: [] });
    }

    const files = fs.readdirSync(scriptDir)
      .filter(f => f.endsWith('.js'))
      .map(f => {
        const filePath = path.join(scriptDir, f);
        const code = fs.readFileSync(filePath, 'utf-8');
        const apis = parseMetadata(code);
        return {
          filename: f,
          path: f,
          size: fs.statSync(filePath).size,
          apis: apis,
          api_count: apis.length
        };
      });

    res.json({ code: 200, data: files });
  } catch (e) {
    console.error('[libraries/local/scripts]', e);
    res.json({ code: 500, message: e.message });
  }
});

// 获取GitHub上传配置
router.get('/github/upload/config', (req, res) => {
  try {
    const configs = db.prepare('SELECT * FROM configs WHERE key IN (?, ?)').all('github_store_repo', 'github_store_token');
    const configObj = {};
    configs.forEach(c => configObj[c.key] = c.value);

    res.json({
      code: 200,
      data: {
        repo: configObj.github_store_repo || 'zy2270561173/muyunapi-script',
        token: configObj.github_store_token || '',
        branch: 'main'
      }
    });
  } catch (e) {
    console.error('[libraries/github/upload/config]', e);
    res.json({ code: 500, message: e.message });
  }
});

// 上传脚本到GitHub
router.post('/github/upload', async (req, res) => {
  try {
    const { repo, token, branch = 'main', scripts } = req.body;

    if (!repo || !token) {
      return res.json({ code: 400, message: '缺少仓库信息或Token' });
    }

    if (!scripts || !Array.isArray(scripts) || scripts.length === 0) {
      return res.json({ code: 400, message: '请选择要上传的脚本' });
    }

    const results = [];
    const [owner, repoName] = repo.split('/');

    if (!owner || !repoName) {
      return res.json({ code: 400, message: '仓库地址格式错误' });
    }

    for (const scriptName of scripts) {
      try {
        const scriptPath = path.join(__dirname, '../../script', scriptName);

        if (!fs.existsSync(scriptPath)) {
          results.push({ name: scriptName, success: false, message: '文件不存在' });
          continue;
        }

        const content = fs.readFileSync(scriptPath, 'utf-8');
        const filePath = scriptName;

        let sha = null;
        try {
          const existingFile = await axios.get(
            `https://api.github.com/repos/${owner}/${repoName}/contents/${filePath}`,
            {
              headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json'
              }
            }
          );
          sha = existingFile.data.sha;
        } catch (e) {
          // 文件不存在
        }

        const uploadData = {
          message: `Upload script: ${scriptName}`,
          content: Buffer.from(content).toString('base64'),
          branch: branch
        };

        if (sha) {
          uploadData.sha = sha;
        }

        await axios.put(
          `https://api.github.com/repos/${owner}/${repoName}/contents/${filePath}`,
          uploadData,
          {
            headers: {
              'Authorization': `token ${token}`,
              'Accept': 'application/vnd.github.v3+json'
            }
          }
        );

        results.push({ name: scriptName, success: true, message: '上传成功' });
      } catch (e) {
        console.error(`[upload] 上传脚本 ${scriptName} 失败:`, e.message);
        results.push({ name: scriptName, success: false, message: e.message });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    res.json({
      code: 200,
      message: `上传完成：成功 ${successCount} 个${failCount > 0 ? `，失败 ${failCount} 个` : ''}`,
      data: results
    });
  } catch (e) {
    console.error('[libraries/github/upload]', e);
    res.json({ code: 500, message: '上传失败：' + e.message });
  }
});

// 保存GitHub Token
router.post('/github/upload/config', (req, res) => {
  try {
    const { repo, token } = req.body;

    if (repo) {
      db.prepare('INSERT OR REPLACE INTO configs (key, value, description, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)')
        .run('github_store_repo', repo, 'GitHub内置库仓库');
    }

    if (token !== undefined) {
      db.prepare('INSERT OR REPLACE INTO configs (key, value, description, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)')
        .run('github_store_token', token, 'GitHub Token');
    }

    res.json({ code: 200, message: '配置保存成功' });
  } catch (e) {
    console.error('[libraries/github/upload/config/save]', e);
    res.json({ code: 500, message: e.message });
  }
});

module.exports = router;
