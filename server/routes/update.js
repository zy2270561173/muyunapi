const express = require('express');
const router = express.Router();
const { execSync } = require('child_process');
const { adminAuth } = require('../middleware/auth');

// 获取当前版本信息
router.get('/version', (req, res) => {
  try {
    const pkg = require('../../package.json');
    res.json({
      code: 200,
      data: {
        version: pkg.version,
        name: pkg.name,
        description: pkg.description
      }
    });
  } catch (e) {
    res.json({ code: 500, message: '获取版本失败' });
  }
});

// 检查更新（管理员）
router.get('/check', adminAuth, async (req, res) => {
  try {
    // 获取远程最新提交
    execSync('git fetch origin main', { stdio: 'pipe' });
    
    const currentCommit = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
    const remoteCommit = execSync('git rev-parse origin/main', { encoding: 'utf8' }).trim();
    const currentVersion = require('../../package.json').version;
    
    let remoteVersion = null;
    try {
      const remotePkg = execSync('git show origin/main:package.json', { encoding: 'utf8' });
      remoteVersion = JSON.parse(remotePkg).version;
    } catch (e) {
      // 无法读取远程版本
    }
    
    const hasUpdate = currentCommit !== remoteCommit;
    
    res.json({
      code: 200,
      data: {
        currentVersion,
        remoteVersion,
        currentCommit: currentCommit.substring(0, 7),
        remoteCommit: remoteCommit.substring(0, 7),
        hasUpdate,
        updateTime: new Date().toISOString()
      }
    });
  } catch (e) {
    res.json({ code: 500, message: '检查更新失败: ' + e.message });
  }
});

// 执行更新（管理员）
router.post('/perform', adminAuth, async (req, res) => {
  try {
    const { backup = true } = req.body;
    
    // 1. 备份数据库（如果存在）
    if (backup) {
      const fs = require('fs');
      const path = require('path');
      const dbPath = path.join(__dirname, '..', 'data', 'database.db');
      
      if (fs.existsSync(dbPath)) {
        const backupDir = path.join(__dirname, '..', '..', 'backups');
        if (!fs.existsSync(backupDir)) {
          fs.mkdirSync(backupDir, { recursive: true });
        }
        const backupPath = path.join(backupDir, `database_${Date.now()}.db`);
        fs.copyFileSync(dbPath, backupPath);
      }
    }
    
    // 2. 暂存本地修改
    const status = execSync('git status --porcelain', { encoding: 'utf8' }).trim();
    if (status) {
      execSync('git stash', { stdio: 'pipe' });
    }
    
    // 3. 拉取最新代码
    execSync('git pull origin main', { stdio: 'pipe' });
    
    // 4. 恢复本地修改
    if (status) {
      try {
        execSync('git stash pop', { stdio: 'pipe' });
      } catch (e) {
        // 可能有冲突，忽略
      }
    }
    
    // 5. 安装依赖并构建
    execSync('cd server && npm install', { stdio: 'pipe' });
    execSync('cd client && npm install', { stdio: 'pipe' });
    execSync('cd client && npm run build', { stdio: 'pipe' });
    
    const newVersion = require('../../package.json').version;
    
    res.json({
      code: 200,
      data: {
        version: newVersion,
        message: '更新成功，请重启服务器'
      }
    });
  } catch (e) {
    res.json({ code: 500, message: '更新失败: ' + e.message });
  }
});

module.exports = router;
