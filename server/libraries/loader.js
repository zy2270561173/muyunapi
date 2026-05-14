/**
 * MuYunAPI 动态脚本加载器
 * 
 * 动态加载 server/libraries/scripts/ 目录下的所有用户脚本
 * 每个脚本支持两种格式：
 * 
 * 格式1 - module.exports.apis 数组：
 * module.exports = {
 *   apis: [
 *     { name: 'xxx', slug: 'xxx', ... }
 *   ],
 *   execute(slug, params, req) { ... }
 * }
 * 
 * 格式2 - Tampermonkey 风格注释（纯元数据）：
 * // ==MuYunAPI==
 * // @name xxx
 * // @slug xxx
 * // ==/MuYunAPI==
 * module.exports = {
 *   async execute(params) { ... }
 * }
 */

const path = require('path');
const fs = require('fs');
const vm = require('vm');

// 脚本目录
const SCRIPTS_DIR = path.join(__dirname, 'scripts');

// 缓存：slug -> { filename, script }
let apiMap = new Map();
// 缓存：filename -> { script, apis, mtime }
let fileCache = new Map();

/**
 * 解析 Tampermonkey 风格的元数据块
 */
function parseTampermonkeyBlock(code) {
  const apis = [];
  const blockRegex = /\/\/\s*==MuYunAPI==([\s\S]*?)\/\/\s*==\/MuYunAPI==/g;
  let match;

  while ((match = blockRegex.exec(code)) !== null) {
    try {
      const block = match[1];
      const get = (key) => {
        const m = block.match(new RegExp(`\\/\\/\\s*@${key}\\s+(.+)`));
        return m ? m[1].trim() : null;
      };
      const name = get('name'), slug = get('slug');
      if (name && slug) {
        const paramsStr = get('params');
        apis.push({
          name,
          slug,
          description: get('description') || '',
          category_id: parseInt(get('category')) || null,
          method: (get('method') || 'GET').toUpperCase(),
          require_auth: get('requireAuth') === 'true',
          is_free: get('isFree') !== 'false',
          params: paramsStr ? JSON.parse(paramsStr) : [],
          response_example: get('response') || '',
          theme: get('theme') ? get('theme').toLowerCase() : 'both',
        });
      }
    } catch (e) {
      console.warn(`[loader] 解析元数据块失败: ${e.message}`);
    }
  }
  return apis;
}

/**
 * 从模块中提取 apis 元数据
 */
function extractApis(module) {
  // 优先使用 module.exports.apis
  if (module.apis && Array.isArray(module.apis)) {
    return module.apis.map(api => ({
      name: api.name || '',
      slug: api.slug || '',
      description: api.description || '',
      category_id: api.category_id || null,
      method: api.method || 'GET',
      require_auth: api.require_auth || false,
      is_free: api.is_free !== false,
      params: api.params || [],
      response_example: api.response_example || '',
      theme: api.theme || 'both',
    }));
  }
  return [];
}

// 加载所有脚本
function loadAllScripts() {
  apiMap.clear();
  
  if (!fs.existsSync(SCRIPTS_DIR)) {
    fs.mkdirSync(SCRIPTS_DIR, { recursive: true });
    console.log('[loader] 脚本目录不存在，已创建:', SCRIPTS_DIR);
    return;
  }
  
  const files = fs.readdirSync(SCRIPTS_DIR).filter(f => f.endsWith('.js'));
  console.log(`[loader] 发现 ${files.length} 个脚本文件`);
  
  for (const filename of files) {
    try {
      loadScript(filename);
    } catch (e) {
      console.error(`[loader] 加载脚本失败 ${filename}:`, e.message);
    }
  }
  
  console.log(`[loader] 加载完成，共 ${apiMap.size} 个接口`);
}

// 加载单个脚本
function loadScript(filename) {
  const filePath = path.join(SCRIPTS_DIR, filename);
  
  // 检查文件是否存在（防止删除操作触发监听时崩溃）
  if (!fs.existsSync(filePath)) {
    console.log(`[loader] 文件不存在，跳过: ${filename}`);
    // 清理该文件相关的缓存
    clearCache(filename);
    return;
  }
  
  const stat = fs.statSync(filePath);
  
  // 检查缓存是否过期
  const cached = fileCache.get(filename);
  if (cached && cached.mtime.getTime() === stat.mtime.getTime()) {
    // 缓存有效，使用缓存
    for (const api of cached.apis) {
      apiMap.set(api.slug, { filename, script: cached.script });
    }
    return;
  }
  
  // 清除旧映射
  for (const [slug, info] of apiMap) {
    if (info.filename === filename) {
      apiMap.delete(slug);
    }
  }
  
  // 动态加载脚本
  const code = fs.readFileSync(filePath, 'utf-8');
  const module = loadModule(code);
  
  if (!module || typeof module.execute !== 'function') {
    console.warn(`[loader] 脚本 ${filename} 缺少 execute 方法，跳过`);
    return;
  }
  
  // 提取 apis 元数据（支持两种格式）
  let apis = extractApis(module);
  
  // 如果 module.exports.apis 不存在，尝试解析 Tampermonkey 风格注释
  if (apis.length === 0) {
    apis = parseTampermonkeyBlock(code);
  }
  
  // 更新缓存
  fileCache.set(filename, {
    script: module,
    apis,
    mtime: stat.mtime
  });
  
  // 注册接口映射
  for (const api of apis) {
    if (api.slug) {
      apiMap.set(api.slug, { filename, script: module });
    }
  }
  
  console.log(`[loader] 加载脚本 ${filename}，接口数: ${apis.length}`);
}

// 使用 vm 动态执行模块代码
function loadModule(code) {
  const moduleWrapper = `
    (function(module, exports, require, __dirname, __filename) {
      ${code}
    })
  `;
  
  const fn = eval(moduleWrapper);
  const module = { exports: {} };
  const exports = module.exports;
  
  fn(module, exports, require, SCRIPTS_DIR, path.join(SCRIPTS_DIR, 'temp.js'));
  
  return module.exports;
}

// 执行接口
async function execute(slug, params = {}, req = null) {
  const info = apiMap.get(slug);
  
  if (!info) {
    throw new Error('内置接口不存在: ' + slug);
  }
  
  const { script, filename } = info;
  
  if (typeof script.execute !== 'function') {
    throw new Error('脚本缺少 execute 方法: ' + filename);
  }
  
  try {
    return await script.execute(slug, params, req);
  } catch (e) {
    throw new Error('脚本执行失败 [' + slug + ']: ' + e.message);
  }
}

// 获取所有接口元数据
function getAllApis() {
  const apis = [];
  const seen = new Set();
  
  for (const [filename, cache] of fileCache) {
    for (const api of cache.apis) {
      if (!seen.has(api.slug)) {
        seen.add(api.slug);
        apis.push({
          ...api,
          source: 'local',
          source_file: filename,
          status: 1,
          is_free: api.is_free ?? 1,
          require_auth: api.require_auth ?? 0,
          credits_cost: api.credits_cost ?? 0,
          params: typeof api.params === 'string' ? api.params : JSON.stringify(api.params || []),
          headers: api.headers || '{}',
        });
      }
    }
  }
  
  return apis;
}

// 根据 slug 获取接口元数据
function getApiBySlug(slug) {
  const apis = getAllApis();
  return apis.find(a => a.slug === slug) || null;
}

// 获取脚本文件数量
function getScriptCount() {
  if (!fs.existsSync(SCRIPTS_DIR)) return 0;
  return fs.readdirSync(SCRIPTS_DIR).filter(f => f.endsWith('.js')).length;
}

// 获取脚本列表（带接口数）
function getScripts() {
  if (!fs.existsSync(SCRIPTS_DIR)) return [];
  
  return fs.readdirSync(SCRIPTS_DIR)
    .filter(f => f.endsWith('.js'))
    .map(filename => {
      const cached = fileCache.get(filename);
      return {
        filename,
        api_count: cached ? cached.apis.length : 0,
      };
    });
}

// 删除脚本时清除缓存
function clearCache(filename) {
  if (!filename) {
    // 清除所有缓存
    apiMap.clear();
    fileCache.clear();
    return;
  }
  
  // 清除指定文件的缓存
  fileCache.delete(filename);
  for (const [slug, info] of apiMap) {
    if (info.filename === filename) {
      apiMap.delete(slug);
    }
  }
}

// 初始化：加载所有脚本
loadAllScripts();

// 监听脚本目录变化（开发模式）
if (process.env.NODE_ENV !== 'production') {
  fs.watch(SCRIPTS_DIR, (eventType, filename) => {
    if (filename && filename.endsWith('.js')) {
      const filePath = path.join(SCRIPTS_DIR, filename);
      
      // 检查文件是否存在
      if (fs.existsSync(filePath)) {
        // 文件创建或修改
        console.log(`[loader] 检测到脚本变化，重新加载: ${filename}`);
        loadScript(filename);
      } else {
        // 文件被删除
        console.log(`[loader] 检测到脚本删除，清理缓存: ${filename}`);
        clearCache(filename);
      }
    }
  });
}

module.exports = {
  execute,
  getAllApis,
  getApiBySlug,
  getScriptCount,
  getScripts,
  loadAllScripts,
  clearCache,
};
