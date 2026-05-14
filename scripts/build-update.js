#!/usr/bin/env node
/**
 * MuYunAPI 更新包构建脚本
 *
 * 用法:
 *   node scripts/build-update.js --version=1.3.0
 *   node scripts/build-update.js --version=1.3.0 --changelog="修复了一些问题"
 *   node scripts/build-update.js --version=1.3.0 --channel=beta
 *   node scripts/build-update.js --version=1.3.0 --include-update-server
 *
 * 参数:
 *   --version=x.y.z              (必填) 版本号
 *   --changelog="..."            更新日志，默认 "版本更新"
 *   --channel=stable|beta        通道，默认 stable
 *   --include-update-server      将 update-server/ 打入包中，触发热重载时同时重启更新服务器
 *   --platform=win|linux        平台，默认 win
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
  // 支持 x.y.z 和 x.y.z-suffix 两种格式
  const base = v.split('-')[0];
  const [a, b, c] = base.split('.').map(Number);
  return a * 10000 + b * 100 + c;
}

function zipDirectory(srcDir, destFile) {
  const destDir = path.dirname(destFile);
  if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
  if (fs.existsSync(destFile)) fs.unlinkSync(destFile);
  const { execSync } = require('child_process');
  // 原始版本：用 replace 转斜杠 + \* 通配符，确保内容在 zip 根目录
  const srcPattern = `'${srcDir.replace(/\\/g, '/')}\\*'`;
  const destPath = `'${destFile.replace(/\\/g, '/')}'`;
  execSync(
    `powershell -Command "Compress-Archive -Path ${srcPattern} -DestinationPath ${destPath} -Force"`,
    { stdio: 'pipe', cwd: path.dirname(srcDir), timeout: 120000 }
  );
  if (!fs.existsSync(destFile)) {
    throw new Error(`ZIP 文件生成失败: ${destFile}`);
  }
}

// ─── 主流程 ───

async function main() {
  const args = parseArgs();

  log('\n╔══════════════════════════════════════╗', 'cyan');
  log('║     MuYunAPI 更新包构建工具          ║', 'cyan');
  log('╚══════════════════════════════════════╝', 'cyan');

  // 参数
  const version = args.version;
  if (!version) {
    log('\n❌ 请指定版本号: --version=1.3.0', 'red');
    log('   用法: node scripts/build-update.js --version=1.3.0 [--changelog="更新内容"] [--channel=stable]', 'yellow');
    process.exit(1);
  }

  if (!/^\d+\.\d+\.\d+(-\w+)?$/.test(version)) {
    log('\n❌ 版本号格式错误，应为 x.y.z 或 x.y.z-xxx', 'red');
    process.exit(1);
  }

  const channel = args.channel || 'stable';
  const changelogText = args.changelog || '版本更新';
  const platform = args.platform || 'win';
  const arch = 'x64';
  const includeUpdateServer = args['include-update-server'] === true || args['include-update-server'] === 'true';

  log(`\n📦 构建配置:`, 'blue');
  log(`   版本:   v${version}`, 'cyan');
  log(`   通道:   ${channel}`, 'cyan');
  log(`   平台:   ${platform}/${arch}`, 'cyan');
  if (includeUpdateServer) log(`   包含更新服务器: 是（热重载时同时重启更新服务器）`, 'cyan');

  const rootDir = path.join(__dirname, '..');
  const distDir = path.join(rootDir, 'dist');
  const stagingDir = path.join(distDir, '_staging');

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

  // scripts 目录
  const scriptsDir = path.join(rootDir, 'scripts');
  if (fs.existsSync(scriptsDir)) {
    copyDirSync(scriptsDir, path.join(stagingDir, 'scripts'));
    log('   ✓ scripts/', 'green');
  }

  // update-server 目录（可选）
  const updateServerDir = path.join(rootDir, 'update-server');
  if (includeUpdateServer) {
    if (fs.existsSync(updateServerDir)) {
      copyDirSync(updateServerDir, path.join(stagingDir, 'update-server'));
      log('   ✓ update-server/', 'green');
    } else {
      log('   ⚠ update-server/ 目录不存在，跳过', 'yellow');
    }
  }

  // 根目录文件
  const rootFiles = ['package.json', 'LICENSE', 'README.md', '.env.example'];
  rootFiles.forEach(f => {
    const src = path.join(rootDir, f);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, path.join(stagingDir, f));
      log(`   ✓ ${f}`, 'green');
    }
  });

  // ─── Step 2: 生成 update.json ───
  log('\n📝 生成 update.json...', 'blue');

  const updateJson = {
    version,
    versionCode: versionToCode(version),
    channel,
    platform,
    arch,
    releaseDate: new Date().toISOString().split('T')[0],
    includesUpdateServer: includeUpdateServer,
    changelog: {
      zh: [changelogText],
      en: ['Version update']
    },
    files: [
      { src: 'server/', dest: 'server/' },
      { src: 'client/dist/', dest: 'client/dist/' },
      { src: 'scripts/', dest: 'scripts/' },
      { src: 'package.json', dest: 'package.json' },
      ...(includeUpdateServer ? [{ src: 'update-server/', dest: 'update-server/' }] : [])
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
  log('\n✅ 构建完成!\n', 'green');
  log(`   📦 更新包: dist/${zipName}`, 'cyan');
  log(`   📝 MD5:    ${md5}`, 'cyan');
  if (includeUpdateServer) {
    log(`   ⚡ 热重载: 应用后将同时重启主服务 + 更新服务器`, 'yellow');
  } else {
    log(`   ⚡ 热重载: 应用后将重启主服务`, 'yellow');
  }
  log(`\n📤 上传命令:`, 'yellow');
  log(`   node scripts/upload-update.js \\`, 'cyan');
  log(`     --file=dist/${zipName} \\`, 'cyan');
  log(`     --server=http://localhost:3001 \\`, 'cyan');
  log(`     --username=admin \\`, 'cyan');
  log(`     --password=admin123 \\`, 'cyan');
  log(`     --version=${version} \\`, 'cyan');
  log(`     --changelog="${changelogText}"`, 'cyan');
  if (!includeUpdateServer) {
    log(`\n💡 若需同时更新更新服务器，添加参数: --include-update-server`, 'yellow');
  }
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
