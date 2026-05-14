const express = require('express');
const router = express.Router();
const db = require('../db/init');
const { adminAuth } = require('../middleware/auth');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// 获取关于我页面配置（前台公开）
router.get('/', (req, res) => {
  try {
    const config = db.prepare('SELECT * FROM about_page ORDER BY id DESC LIMIT 1').get();
    if (!config) {
      return res.json({ code: 404, message: '关于我页面未配置' });
    }

    // 如果页面被禁用，返回提示
    if (!config.is_enabled) {
      return res.json({ code: 403, message: '关于我页面已关闭' });
    }

    // 解析JSON字段
    try {
      config.skills = JSON.parse(config.skills || '[]');
      config.timeline = JSON.parse(config.timeline || '[]');
      config.update_log = JSON.parse(config.update_log || '[]');
    } catch (e) {
      config.skills = [];
      config.timeline = [];
      config.update_log = [];
    }

    // 移除敏感字段
    delete config.auto_sync_github;
    delete config.github_repo;
    delete config.last_sync_at;

    res.json({ code: 200, data: config });
  } catch (e) {
    console.error('[about] 获取配置失败:', e);
    res.json({ code: 500, message: '获取配置失败' });
  }
});

// 获取关于我页面完整配置（管理后台）
router.get('/admin', adminAuth, (req, res) => {
  try {
    const config = db.prepare('SELECT * FROM about_page ORDER BY id DESC LIMIT 1').get();
    if (!config) {
      return res.json({ code: 404, message: '关于我页面未配置' });
    }

    // 解析JSON字段
    try {
      config.skills = JSON.parse(config.skills || '[]');
      config.timeline = JSON.parse(config.timeline || '[]');
      config.update_log = JSON.parse(config.update_log || '[]');
    } catch (e) {
      config.skills = [];
      config.timeline = [];
      config.update_log = [];
    }

    res.json({ code: 200, data: config });
  } catch (e) {
    console.error('[about] 获取配置失败:', e);
    res.json({ code: 500, message: '获取配置失败' });
  }
});

// 更新关于我页面配置
router.put('/admin', adminAuth, (req, res) => {
  const {
    is_enabled,
    name,
    avatar,
    school_name,
    school_code,
    major,
    class_name,
    bio,
    skills,
    timeline,
    github_url,
    email,
    wechat,
    qq,
    update_log,
    auto_sync_github,
    github_repo
  } = req.body;

  try {
    const config = db.prepare('SELECT id FROM about_page ORDER BY id DESC LIMIT 1').get();
    
    if (config) {
      // 更新
      db.prepare(`
        UPDATE about_page SET
          is_enabled = ?,
          name = ?,
          avatar = ?,
          school_name = ?,
          school_code = ?,
          major = ?,
          class_name = ?,
          bio = ?,
          skills = ?,
          timeline = ?,
          github_url = ?,
          email = ?,
          wechat = ?,
          qq = ?,
          update_log = ?,
          auto_sync_github = ?,
          github_repo = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(
        is_enabled !== undefined ? (is_enabled ? 1 : 0) : 1,
        name || '开发者',
        avatar || '',
        school_name || '普宁职业技术学校',
        school_code || '8800587',
        major || '计算机网络技术',
        class_name || '',
        bio || '',
        JSON.stringify(skills || []),
        JSON.stringify(timeline || []),
        github_url || '',
        email || '',
        wechat || '',
        qq || '',
        JSON.stringify(update_log || []),
        auto_sync_github !== undefined ? (auto_sync_github ? 1 : 0) : 1,
        github_repo || 'zy2270561173/muyunapi',
        config.id
      );
    } else {
      // 创建
      db.prepare(`
        INSERT INTO about_page (
          is_enabled, name, avatar, school_name, school_code, major, class_name,
          bio, skills, timeline, github_url, email, wechat, qq, update_log, auto_sync_github, github_repo
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        is_enabled !== undefined ? (is_enabled ? 1 : 0) : 1,
        name || '开发者',
        avatar || '',
        school_name || '普宁职业技术学校',
        school_code || '8800587',
        major || '计算机网络技术',
        class_name || '',
        bio || '',
        JSON.stringify(skills || []),
        JSON.stringify(timeline || []),
        github_url || '',
        email || '',
        wechat || '',
        qq || '',
        JSON.stringify(update_log || []),
        auto_sync_github !== undefined ? (auto_sync_github ? 1 : 0) : 1,
        github_repo || 'zy2270561173/muyunapi'
      );
    }

    res.json({ code: 200, message: '配置已更新' });
  } catch (e) {
    console.error('[about] 更新配置失败:', e);
    res.json({ code: 500, message: '更新配置失败: ' + e.message });
  }
});

// 手动触发GitHub同步
router.post('/sync-github', adminAuth, async (req, res) => {
  try {
    const result = await syncGitHubCommits();
    res.json({ code: 200, message: '同步完成', data: result });
  } catch (e) {
    console.error('[about] GitHub同步失败:', e);
    res.json({ code: 500, message: '同步失败: ' + e.message });
  }
});

// 获取GitHub同步记录
router.get('/sync-logs', adminAuth, (req, res) => {
  try {
    const logs = db.prepare(`
      SELECT * FROM github_sync_logs 
      ORDER BY created_at DESC 
      LIMIT 50
    `).all();
    res.json({ code: 200, data: logs });
  } catch (e) {
    console.error('[about] 获取同步记录失败:', e);
    res.json({ code: 500, message: '获取同步记录失败' });
  }
});

// GitHub同步函数
async function syncGitHubCommits() {
  const config = db.prepare('SELECT github_repo, auto_sync_github FROM about_page ORDER BY id DESC LIMIT 1').get();
  
  if (!config || !config.auto_sync_github) {
    return { skipped: true, message: '自动同步已关闭' };
  }

  const repo = config.github_repo || 'zy2270561173/muyunapi';
  const apiUrl = `https://api.github.com/repos/${repo}/commits?per_page=10`;

  try {
    const response = await axios.get(apiUrl, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'MuYunAPI-Sync'
      },
      timeout: 30000
    });

    const commits = response.data;
    const syncedCommits = [];

    for (const commit of commits) {
      const hash = commit.sha;
      
      // 检查是否已同步
      const exists = db.prepare('SELECT id FROM github_sync_logs WHERE commit_hash = ?').get(hash);
      if (exists) continue;

      // 创建备份目录
      const backupDir = path.join(__dirname, '..', 'backups', hash.substring(0, 7));
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }

      // 记录同步
      db.prepare(`
        INSERT INTO github_sync_logs 
        (commit_hash, commit_message, commit_author, commit_date, backup_path, is_synced, synced_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        hash,
        commit.commit.message,
        commit.commit.author.name,
        commit.commit.author.date,
        backupDir,
        1,
        new Date().toISOString()
      );

      syncedCommits.push({
        hash: hash.substring(0, 7),
        message: commit.commit.message,
        date: commit.commit.author.date
      });
    }

    // 更新最后同步时间
    db.prepare('UPDATE about_page SET last_sync_at = CURRENT_TIMESTAMP').run();

    return {
      success: true,
      synced: syncedCommits.length,
      commits: syncedCommits
    };
  } catch (e) {
    console.error('[about] GitHub API请求失败:', e.message);
    throw new Error('GitHub API请求失败: ' + e.message);
  }
}

// 定时同步任务（每小时检查一次）
function startAutoSync() {
  setInterval(async () => {
    try {
      const config = db.prepare('SELECT auto_sync_github FROM about_page ORDER BY id DESC LIMIT 1').get();
      if (config && config.auto_sync_github) {
        await syncGitHubCommits();
        console.log('[about] 自动GitHub同步完成');
      }
    } catch (e) {
      console.error('[about] 自动同步失败:', e.message);
    }
  }, 60 * 60 * 1000); // 每小时
}

// 启动自动同步
startAutoSync();

module.exports = router;
