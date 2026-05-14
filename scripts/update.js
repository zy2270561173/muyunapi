#!/usr/bin/env node
/**
 * MuYunAPI 自动更新脚本
 * 用法: node scripts/update.js [--check]
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${COLORS[color]}${message}${COLORS.reset}`);
}

function getCurrentVersion() {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
    return pkg.version;
  } catch (e) {
    return '1.0.0';
  }
}

function getRemoteVersion() {
  try {
    // 获取远程最新版本
    execSync('git fetch origin main', { stdio: 'pipe' });
    const latestCommit = execSync('git rev-parse origin/main', { encoding: 'utf8' }).trim();
    const currentCommit = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
    
    // 尝试从远程 package.json 读取版本
    try {
      const remotePkg = execSync('git show origin/main:package.json', { encoding: 'utf8' });
      const remoteVersion = JSON.parse(remotePkg).version;
      return { version: remoteVersion, hasUpdate: latestCommit !== currentCommit };
    } catch (e) {
      return { version: null, hasUpdate: latestCommit !== currentCommit };
    }
  } catch (e) {
    return { version: null, hasUpdate: false, error: e.message };
  }
}

function checkForUpdates() {
  log('\n📦 检查更新...', 'blue');
  
  const currentVersion = getCurrentVersion();
  const remote = getRemoteVersion();
  
  log(`当前版本: v${currentVersion}`, 'cyan');
  
  if (remote.error) {
    log(`❌ 检查失败: ${remote.error}`, 'red');
    return false;
  }
  
  if (remote.version) {
    log(`远程版本: v${remote.version}`, 'cyan');
  }
  
  if (!remote.hasUpdate) {
    log('✅ 已是最新版本', 'green');
    return false;
  }
  
  log('🔄 发现新版本可用', 'yellow');
  return true;
}

function performUpdate() {
  log('\n🚀 开始更新...', 'blue');
  
  try {
    // 1. 保存本地修改（如果有）
    log('1. 检查本地修改...', 'cyan');
    const status = execSync('git status --porcelain', { encoding: 'utf8' }).trim();
    if (status) {
      log('   发现本地修改，正在暂存...', 'yellow');
      execSync('git stash', { stdio: 'inherit' });
    }
    
    // 2. 拉取最新代码
    log('2. 拉取最新代码...', 'cyan');
    execSync('git pull origin main', { stdio: 'inherit' });
    
    // 3. 恢复本地修改
    if (status) {
      log('3. 恢复本地修改...', 'cyan');
      try {
        execSync('git stash pop', { stdio: 'inherit' });
      } catch (e) {
        log('   恢复修改时出现冲突，请手动解决', 'yellow');
      }
    }
    
    // 4. 安装依赖
    log('4. 更新后端依赖...', 'cyan');
    execSync('cd server && npm install', { stdio: 'inherit' });
    
    log('5. 更新前端依赖...', 'cyan');
    execSync('cd client && npm install', { stdio: 'inherit' });
    
    // 5. 构建前端
    log('6. 构建前端...', 'cyan');
    execSync('cd client && npm run build', { stdio: 'inherit' });
    
    log('\n✅ 更新完成！', 'green');
    log(`新版本: v${getCurrentVersion()}`, 'green');
    log('\n请重启服务器以应用更新', 'yellow');
    
    return true;
  } catch (e) {
    log(`\n❌ 更新失败: ${e.message}`, 'red');
    return false;
  }
}

function main() {
  const args = process.argv.slice(2);
  const isCheckOnly = args.includes('--check');
  
  log('\n╔════════════════════════════════════╗', 'cyan');
  log('║     MuYunAPI 自动更新工具          ║', 'cyan');
  log('╚════════════════════════════════════╝', 'cyan');
  
  // 检查是否在 git 仓库中
  try {
    execSync('git rev-parse --git-dir', { stdio: 'pipe' });
  } catch (e) {
    log('\n❌ 错误: 当前目录不是 Git 仓库', 'red');
    log('请确保从 GitHub 克隆的仓库中运行此脚本', 'yellow');
    process.exit(1);
  }
  
  const hasUpdate = checkForUpdates();
  
  if (isCheckOnly) {
    process.exit(hasUpdate ? 1 : 0);
  }
  
  if (!hasUpdate) {
    log('\n无需更新', 'green');
    process.exit(0);
  }
  
  // 确认更新
  if (!args.includes('--yes')) {
    log('\n是否立即更新? (y/n): ', 'yellow');
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on('data', (data) => {
      const key = data.toString().toLowerCase();
      if (key === 'y' || key === '\r') {
        process.stdin.setRawMode(false);
        process.stdin.pause();
        performUpdate();
      } else {
        log('\n已取消更新', 'yellow');
        process.exit(0);
      }
    });
  } else {
    performUpdate();
  }
}

main();
