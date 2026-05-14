#!/usr/bin/env node
/**
 * MuYunAPI Linux 更新包构建脚本
 *
 * 用法:
 *   node scripts/build-linux-update.js --version=1.3.0
 *   node scripts/build-linux-update.js --version=1.3.0 --changelog="修复了一些问题"
 *
 * 参数:
 *   --version=x.y.z              (必填) 版本号
 *   --changelog="..."            更新日志，默认 "版本更新"
 *   --channel=stable|beta        通道，默认 stable
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

// ─── 工具函数 ───

function log(msg, color = '') {
  const colors = { green: '\x1b[32m', yellow: '\x1b[33m', red: '\x1b[31m', blue: '\x1b[34m', cyan: '\x1b[36m' };
  console.log(`${colors[color] || ''}${msg}\x1b[0m`);
}

function parseArgs() {
  const args = {};
  process.argv.slice(2).forEach(arg => {
    if (arg.startsWith('--')) {
      const [key, value] = arg.substring(2).split('=');
      args[key] = value || true;
    }
  });
  return args;
}

function versionToCode(v) {
  const [a, b, c] = v.split('.').map(Number);
  return a * 10000 + b * 100 + c;
}

// 使用 PowerShell 创建 ZIP
function zipDirectory(srcDir, destFile) {
  const destDir = path.dirname(destFile);
  if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });

  if (fs.existsSync(destFile)) fs.unlinkSync(destFile);

  execSync(
    `powershell -Command "Compress-Archive -Path '${srcDir}\\*' -DestinationPath '${destFile}' -Force"`,
    { stdio: 'ignore', cwd: path.dirname(srcDir) }
  );
}

// ─── 主流程 ───

async function main() {
  const args = parseArgs();

  log('\n╔══════════════════════════════════════╗', 'cyan');
  log('║  MuYunAPI Linux 更新包构建工具      ║', 'cyan');
  log('╚══════════════════════════════════════╝', 'cyan');

  // 参数
  const version = args.version;
  if (!version) {
    log('\n❌ 请指定版本号: --version=1.3.0', 'red');
    log('   用法: node scripts/build-linux-update.js --version=1.3.0 [--changelog="更新内容"] [--channel=stable]', 'yellow');
    process.exit(1);
  }

  if (!/^\d+\.\d+\.\d+$/.test(version)) {
    log('\n❌ 版本号格式错误，应为 x.y.z', 'red');
    process.exit(1);
  }

  const channel = args.channel || 'stable';
  const changelogText = args.changelog || '版本更新';
  const platform = 'linux';
  const arch = 'x64';

  log(`\n📦 构建配置:`, 'blue');
  log(`   版本:   v${version}`, 'cyan');
  log(`   通道:   ${channel}`, 'cyan');
  log(`   平台:   ${platform}/${arch}`, 'cyan');

  const rootDir = path.join(__dirname, '..');
  const distDir = path.join(rootDir, 'dist');
  const stagingDir = path.join(distDir, '_staging_linux');

  // 清理旧的临时目录
  if (fs.existsSync(stagingDir)) {
    fs.rmSync(stagingDir, { recursive: true, force: true });
  }
  fs.mkdirSync(stagingDir, { recursive: true });

  // ─── Step 1: 收集文件到临时目录 ───
  log('\n📁 收集文件...', 'blue');

  // server 目录
  const serverDir = path.join(rootDir, 'server');
  if (!fs.existsSync(serverDir)) {
    log('❌ server/ 目录不存在', 'red');
    process.exit(1);
  }
  copyDirSync(serverDir, path.join(stagingDir, 'server'));
  log('   ✓ server/', 'green');

  // client/dist 目录
  const clientDistDir = path.join(rootDir, 'client', 'dist');
  if (fs.existsSync(clientDistDir)) {
    copyDirSync(clientDistDir, path.join(stagingDir, 'client', 'dist'));
    log('   ✓ client/dist/', 'green');
  } else {
    log('   ⚠ client/dist/ 不存在（请先运行 cd client && npm run build）', 'yellow');
  }

  // client/src 目录（Vue 源文件）
  const clientSrcDir = path.join(rootDir, 'client', 'src');
  if (fs.existsSync(clientSrcDir)) {
    copyDirSync(clientSrcDir, path.join(stagingDir, 'client', 'src'));
    log('   ✓ client/src/', 'green');
  } else {
    log('   ⚠ client/src/ 不存在', 'yellow');
  }

  // client/public 目录
  const clientPublicDir = path.join(rootDir, 'client', 'public');
  if (fs.existsSync(clientPublicDir)) {
    copyDirSync(clientPublicDir, path.join(stagingDir, 'client', 'public'));
    log('   ✓ client/public/', 'green');
  }

  // client/package.json
  const clientPkgJson = path.join(rootDir, 'client', 'package.json');
  if (fs.existsSync(clientPkgJson)) {
    fs.copyFileSync(clientPkgJson, path.join(stagingDir, 'client', 'package.json'));
    log('   ✓ client/package.json', 'green');
  }

  // client/vite.config.js
  const clientViteConfig = path.join(rootDir, 'client', 'vite.config.js');
  if (fs.existsSync(clientViteConfig)) {
    fs.copyFileSync(clientViteConfig, path.join(stagingDir, 'client', 'vite.config.js'));
    log('   ✓ client/vite.config.js', 'green');
  }

  // client/index.html
  const clientIndexHtml = path.join(rootDir, 'client', 'index.html');
  if (fs.existsSync(clientIndexHtml)) {
    fs.copyFileSync(clientIndexHtml, path.join(stagingDir, 'client', 'index.html'));
    log('   ✓ client/index.html', 'green');
  }

  // scripts 目录
  const scriptsDir = path.join(rootDir, 'scripts');
  if (fs.existsSync(scriptsDir)) {
    copyDirSync(scriptsDir, path.join(stagingDir, 'scripts'));
    log('   ✓ scripts/', 'green');
  }

  // update-server 目录
  const updateServerDir = path.join(rootDir, 'update-server');
  if (fs.existsSync(updateServerDir)) {
    copyDirSync(updateServerDir, path.join(stagingDir, 'update-server'));
    log('   ✓ update-server/', 'green');
  }

  // 根目录文件
  const rootFiles = ['package.json', 'LICENSE', 'README.md', '.env.example', 'start.sh'];
  rootFiles.forEach(f => {
    const src = path.join(rootDir, f);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, path.join(stagingDir, f));
      log(`   ✓ ${f}`, 'green');
    }
  });

  // 创建 Linux 启动脚本
  const startScript = `#!/bin/bash
cd "$(dirname "$0")"
npm install
node server/index.js
`;
  fs.writeFileSync(path.join(stagingDir, 'run.sh'), startScript, { mode: 0o755 });
  log('   ✓ run.sh (自动安装并启动)', 'green');

  // 创建更新服务器启动脚本
  const updateServerScript = `#!/bin/bash
cd "$(dirname "$0")"
npm install
node index.js
`;
  const updateStagingDir = path.join(stagingDir, 'update-server');
  if (fs.existsSync(updateStagingDir)) {
    fs.writeFileSync(path.join(updateStagingDir, 'run.sh'), updateServerScript, { mode: 0o755 });
    log('   ✓ update-server/run.sh', 'green');
  }

  // ─── Step 2: 生成 update.json ───
  log('\n📝 生成 update.json...', 'blue');

  const updateJson = {
    version,
    versionCode: versionToCode(version),
    channel,
    platform,
    arch,
    releaseDate: new Date().toISOString().split('T')[0],
    includesUpdateServer: true,
    changelog: {
      zh: [changelogText],
      en: ['Version update']
    },
    files: [
      { src: 'server/', dest: 'server/' },
      { src: 'client/dist/', dest: 'client/dist/' },
      { src: 'client/src/', dest: 'client/src/' },
      { src: 'client/public/', dest: 'client/public/' },
      { src: 'client/package.json', dest: 'client/package.json' },
      { src: 'client/vite.config.js', dest: 'client/vite.config.js' },
      { src: 'client/index.html', dest: 'client/index.html' },
      { src: 'scripts/', dest: 'scripts/' },
      { src: 'package.json', dest: 'package.json' },
      { src: 'update-server/', dest: 'update-server/' },
      { src: 'run.sh', dest: 'run.sh' }
    ]
  };

  fs.writeFileSync(
    path.join(stagingDir, 'update.json'),
    JSON.stringify(updateJson, null, 2),
    'utf-8'
  );
  log('   ✓ update.json', 'green');

  // ─── Step 3: 打包成 ZIP ───
  const zipName = `muyunapi-v${version}-${platform}-${arch}.zip`;
  const zipPath = path.join(distDir, zipName);

  log(`\n📦 正在打包 ${zipName} ...`, 'blue');

  zipDirectory(stagingDir, zipPath);

  const zipStat = fs.statSync(zipPath);
  const zipBuffer = fs.readFileSync(zipPath);
  const md5 = crypto.createHash('md5').update(zipBuffer).digest('hex');
  const sha256 = crypto.createHash('sha256').update(zipBuffer).digest('hex');

  log(`   ✓ 大小: ${(zipStat.size / 1024 / 1024).toFixed(2)} MB`, 'green');
  log(`   ✓ MD5:    ${md5}`, 'green');
  log(`   ✓ SHA256: ${sha256.substring(0, 32)}...`, 'green');

  // ─── Step 4: 清理临时目录 ───
  fs.rmSync(stagingDir, { recursive: true, force: true });

  // ─── 完成 ───
  log('\n✅ Linux 更新包构建完成!\n', 'green');
  log(`   📦 更新包: dist/${zipName}`, 'cyan');
  log(`   📝 MD5:    ${md5}`, 'cyan');
  log(`\n📤 上传命令:`, 'yellow');
  log(`   node scripts/upload-update.js \\`, 'cyan');
  log(`     --file=dist/${zipName} \\`, 'cyan');
  log(`     --server=http://localhost:3001 \\`, 'cyan');
  log(`     --username=admin \\`, 'cyan');
  log(`     --password=admin123 \\`, 'cyan');
  log(`     --version=${version} \\`, 'cyan');
  log(`     --changelog="${changelogText}"`, 'cyan');
  log('');
}

// ─── 递归复制目录 ───
function copyDirSync(src, dest) {
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      // 跳过 node_modules 和 data 目录（不需要打包）
      if (entry.name === 'node_modules' || entry.name === 'data') continue;
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
