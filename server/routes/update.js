/**
 * 系统更新路由 - 固定更新服务器地址
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const http = require('http');
const https = require('https');
const { execSync } = require('child_process');
const UpdateClient = require('../utils/updateClient');
const { adminAuth } = require('../middleware/auth');
const db = require('../db/init');

// 固定更新服务器地址
const UPDATE_SERVER_URL = 'https://upapi.muysky.cn';

// 配置读写辅助
function getConfig(key) {
  try {
    const row = db.prepare("SELECT value FROM configs WHERE key = ?").get(key);
    return row ? row.value : null;
  } catch (e) {
    return null;
  }
}

function getConfigJSON(key) {
  const val = getConfig(key);
  if (!val) return {};
  try { return JSON.parse(val); } catch (e) { return {}; }
}

function setConfig(key, value) {
  try {
    const val = typeof value === 'object' ? JSON.stringify(value) : String(value);
    db.prepare("INSERT OR REPLACE INTO configs (key, value) VALUES (?, ?)").run(key, val);
  } catch (e) {
    console.error('setConfig error:', e);
  }
}

// 获取更新服务器内部地址（热重载用）
// 优先级：环境变量 > 数据库配置 > 默认 localhost:3001
function getUpdateServerInternalUrl() {
  const fromEnv = process.env.INTERNAL_UPDATE_SERVER_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, '');

  const config = getConfigJSON('update_server');
  return config.internalUrl || 'http://localhost:3001';
}

// 发送热重载信号给更新服务器
function sendRestartSignalToUpdateServer() {
  return new Promise((resolve) => {
    const baseUrl = getUpdateServerInternalUrl();
    const secret = process.env.UPDATE_SECRET || 'change_me_to_a_random_secret';
    const postData = JSON.stringify({ secret });

    const client = baseUrl.startsWith('https') ? https : http;
    const urlObj = new URL(baseUrl);

    const options = {
      hostname: urlObj.hostname,
      port:     urlObj.port || (baseUrl.startsWith('https') ? 443 : 80),
      path:     '/api/admin/restart',
      method:   'POST',
      headers: {
        'Content-Type':   'application/json',
        'Content-Length': Buffer.byteLength(postData)
      },
      timeout: 8000
    };

    const req = client.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          console.log(`[Update] 更新服务器热重载响应: ${json.message}`);
        } catch (_) {}
        resolve();
      });
    });

    req.on('error', (e) => {
      // 更新服务器若未启动，忽略错误（它可能在本次重启后才真正启动）
      console.warn(`[Update] 通知更新服务器热重载失败（可能未运行）: ${e.message}`);
      resolve();
    });

    req.on('timeout', () => {
      req.destroy();
      console.warn('[Update] 通知更新服务器热重载超时');
      resolve();
    });

    req.write(postData);
    req.end();
  });
}

// 获取当前版本信息
router.get('/version', adminAuth, async (req, res) => {
  try {
    const packageJson = require(path.join(process.cwd(), 'package.json'));
    
    let commitHash = '';
    // 非 git 仓库环境静默跳过，不输出错误
    if (fs.existsSync(path.join(process.cwd(), '.git'))) {
      try {
        commitHash = execSync('git rev-parse --short HEAD', {
          cwd: process.cwd(),
          encoding: 'utf8',
          stdio: 'pipe'
        }).trim();
      } catch (e) {
        commitHash = 'unknown';
      }
    } else {
      commitHash = 'unknown';
    }

    res.json({
      code: 200,
      data: {
        version: packageJson.version,
        commit: commitHash,
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.version
      }
    });
  } catch (e) {
    res.json({ code: 500, message: '获取版本信息失败' });
  }
});

// 获取更新配置（只返回通道和自动设置，地址固定不可改）
router.get('/config', adminAuth, async (req, res) => {
  try {
    const config = getConfigJSON('update_server');
    res.json({
      code: 200,
      data: {
        channel: config.channel || 'stable',
        autoCheck: config.autoCheck !== false,
        autoDownload: config.autoDownload === true
      }
    });
  } catch (e) {
    res.json({ code: 500, message: '获取配置失败' });
  }
});

// 保存更新配置（只允许保存通道和自动设置，不允许改地址）
router.post('/config', adminAuth, async (req, res) => {
  try {
    const { channel, autoCheck, autoDownload } = req.body;
    
    const config = {
      channel: channel || 'stable',
      autoCheck: autoCheck !== false,
      autoDownload: autoDownload === true
    };
    
    setConfig('update_server', config);
    
    res.json({
      code: 200,
      message: '配置保存成功',
      data: config
    });
  } catch (e) {
    res.json({ code: 500, message: '保存配置失败' });
  }
});

// 创建 UpdateClient 实例的公共方法
function createUpdateClient() {
  const config = getConfigJSON('update_server');
  const packageJson = require(path.join(process.cwd(), 'package.json'));
  return new UpdateClient({
    serverUrl: UPDATE_SERVER_URL,
    currentVersion: packageJson.version,
    channel: config.channel || 'stable'
  });
}

// 检查更新
router.post('/check', adminAuth, async (req, res) => {
  try {
    const updateClient = createUpdateClient();
    const packageJson = require(path.join(process.cwd(), 'package.json'));
    const result = await updateClient.checkUpdate();
    
    res.json({
      code: 200,
      data: {
        ...result,
        currentVersion: packageJson.version
      }
    });
  } catch (e) {
    console.error('检查更新失败:', e);
    res.json({
      code: 500,
      message: e.message || '检查更新失败'
    });
  }
});

// 下载更新（下载后自动读取 zip 内的 update.json）
router.post('/download', adminAuth, async (req, res) => {
  try {
    const { updateInfo } = req.body;
    const updateClient = createUpdateClient();

    const result = await updateClient.downloadUpdate(updateInfo, (progress, downloaded, total) => {
      console.log(`下载进度: ${progress}% (${downloaded}/${total})`);
    });

    // 下载完成后，读取 zip 内的 update.json 预览数据
    let previewData = null;
    try {
      previewData = await updateClient.previewZip(result.filePath);
    } catch (previewErr) {
      console.warn('[Update] 读取更新包预览失败:', previewErr.message);
      // 预览失败不影响主流程
    }

    res.json({
      code: 200,
      message: '下载完成',
      data: {
        filePath: result.filePath,
        version: result.version,
        size: result.size,
        preview: previewData
      }
    });
  } catch (e) {
    console.error('下载更新失败:', e);
    res.json({ code: 500, message: e.message || '下载失败' });
  }
});

// 应用更新
router.post('/apply', adminAuth, async (req, res) => {
  try {
    const { filePath, backup = true } = req.body;

    if (!fs.existsSync(filePath)) {
      return res.json({ code: 400, message: '更新文件不存在' });
    }

    // ── Step 1: 读取更新包元数据 ─────────────────────────────────────────
    let includesUpdateServer = false;
    let updateVersion = '';
    try {
      const AdmZip = (() => { try { return require('adm-zip'); } catch (_) { return null; } })();
      if (AdmZip) {
        const zip = new AdmZip(filePath);
        const entry = zip.getEntry('update.json');
        if (entry) {
          const meta = JSON.parse(entry.getData().toString('utf8'));
          includesUpdateServer = !!meta.includesUpdateServer;
          updateVersion = meta.version || '';
        }
      }
    } catch (_) { /* 读取失败不影响主流程 */ }

    // ── Step 2: 应用更新 ─────────────────────────────────────────────────
    const updateClient = createUpdateClient();
    const result = await updateClient.applyUpdate(filePath, { backup, restart: false });

    // ── Step 3: 热重载 ───────────────────────────────────────────────────
    console.log(`[Update] 更新成功 (v${updateVersion})，开始热重载...`);

    // 通知更新服务器重启（如果包内含 update-server/）
    if (includesUpdateServer) {
      console.log('[Update] 正在通知更新服务器热重载...');
      await sendRestartSignalToUpdateServer();
    }

    // 延迟确保所有响应都发完
    setTimeout(() => {
      console.log('[Update] 主服务热重载...');
      try {
        execSync('pm2 restart MuYunAPI-Main', { stdio: 'ignore' });
      } catch (_) {
        // pm2 不在 PATH 时回退到直接退出
        process.exit(42);
      }
    }, 800);

    res.json({
      code: 200,
      message: '更新成功，服务即将热重载',
      data: {
        ...result,
        includesUpdateServer
      }
    });

  } catch (e) {
    console.error('应用更新失败:', e);
    res.json({ code: 500, message: e.message || '更新失败' });
  }
});

// 获取更新历史
router.get('/history', adminAuth, async (req, res) => {
  try {
    const updateClient = createUpdateClient();
    const result = await updateClient.getUpdateHistory(10);
    
    res.json({
      code: 200,
      data: result
    });
  } catch (e) {
    console.error('获取更新历史失败:', e);
    res.json({ code: 200, data: { total: 0, list: [] } });
  }
});

// 获取备份列表
router.get('/backups', adminAuth, async (req, res) => {
  try {
    const backupDir = path.join(process.cwd(), 'backups');
    if (!fs.existsSync(backupDir)) {
      return res.json({ code: 200, data: [] });
    }

    const files = fs.readdirSync(backupDir)
      .filter(f => f.endsWith('.zip'))
      .map(f => {
        const stat = fs.statSync(path.join(backupDir, f));
        return {
          name: f,
          size: stat.size,
          createdAt: stat.mtime
        };
      })
      .sort((a, b) => b.createdAt - a.createdAt);

    res.json({ code: 200, data: files });
  } catch (e) {
    res.json({ code: 500, message: '获取备份列表失败' });
  }
});

// 恢复备份
router.post('/restore', adminAuth, async (req, res) => {
  try {
    const { backupName } = req.body;
    const backupPath = path.join(process.cwd(), 'backups', backupName);
    
    if (!fs.existsSync(backupPath)) {
      return res.json({ code: 404, message: '备份文件不存在' });
    }

    res.json({ code: 200, message: '恢复功能开发中' });
  } catch (e) {
    res.json({ code: 500, message: '恢复失败' });
  }
});

// 删除备份
router.delete('/backups/:name', adminAuth, async (req, res) => {
  try {
    const { name } = req.params;
    const backupPath = path.join(process.cwd(), 'backups', name);
    
    if (!fs.existsSync(backupPath)) {
      return res.json({ code: 404, message: '备份文件不存在' });
    }

    fs.unlinkSync(backupPath);
    res.json({ code: 200, message: '删除成功' });
  } catch (e) {
    res.json({ code: 500, message: '删除失败' });
  }
});

module.exports = router;
