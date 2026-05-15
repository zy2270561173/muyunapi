#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

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
  const base = v.split('-')[0];
  const [a, b, c] = base.split('.').map(Number);
  return a * 10000 + b * 100 + c;
}

function zipDirectory(srcDir, destFile) {
  const destDir = path.dirname(destFile);
  if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
  if (fs.existsSync(destFile)) fs.unlinkSync(destFile);
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

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function translateChangelog(zhText) {
  const translations = [
    ['【新增】', '[New] '],
    ['【优化】', '[Improved] '],
    ['【修复】', '[Fixed] '],
    ['【更新】', '[Updated] '],
    ['设备检测系统', 'Device detection system'],
    ['基于UA识别', 'based on UA'],
    ['移动端专用主题配置', 'mobile-specific theme configuration'],
    ['C++', 'C++'],
    ['Java调用示例', 'Java code examples'],
    ['代码示例', 'code examples'],
    ['调用示例', 'code examples'],
    ['全局样式移动端适配', 'global mobile responsive styles'],
    ['导航菜单抽屉式设计', 'drawer navigation design'],
    ['首页布局优化', 'home page layout optimization'],
    ['API列表页筛选设计', 'API list page filters design'],
    ['API卡片触摸体验', 'API card touch experience'],
    ['接口详情页滚动和布局', 'API detail page scrolling and layout'],
    ['系统更新页滚动条', 'system update page scrollbar'],
    ['后台布局移动端适配', 'admin layout mobile adaptation'],
    ['更新历史', 'update history'],
    ['备份管理', 'backup management'],
    ['滚动条', 'scrollbar'],
    ['后台', 'admin'],
    ['主题', 'theme'],
    ['布局', 'layout'],
    ['优化', 'improved'],
    ['新增', 'new'],
    ['检测', 'detection'],
    ['适配', 'adaptation'],
    ['设计', 'design'],
    ['体验', 'experience'],
    ['滚动', 'scrolling'],
    ['专用', 'specific']
  ];

  let enText = zhText;
  for (const [zh, en] of translations) {
    enText = enText.replace(new RegExp(escapeRegex(zh), 'g'), en);
  }

  return enText;
}

async function main() {
  const args = parseArgs();

  log('\n╔══════════════════════════════════════╗', 'cyan');
  log('║     MuYunAPI 更新包构建工具          ║', 'cyan');
  log('╚══════════════════════════════════════╝', 'cyan');

  const version = args.version;
  if (!version) {
    log('\n❌ 请指定版本号: --version=1.3.0', 'red');
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

  const rootDir = path.join(__dirname, '..');
  const distDir = path.join(rootDir, 'dist');
  const stagingDir = path.join(distDir, '_staging');

  if (fs.existsSync(stagingDir)) {
    fs.rmSync(stagingDir, { recursive: true, force: true });
  }
  fs.mkdirSync(stagingDir, { recursive: true });

  log('\n📁 收集文件...', 'blue');

  const serverDir = path.join(rootDir, 'server');
  if (!fs.existsSync(serverDir)) {
    log('❌ server/ 目录不存在', 'red');
    process.exit(1);
  }
  copyDirSync(serverDir, path.join(stagingDir, 'server'));
  log('   ✓ server/', 'green');

  const clientDistDir = path.join(rootDir, 'client', 'dist');
  if (fs.existsSync(clientDistDir)) {
    copyDirSync(clientDistDir, path.join(stagingDir, 'client', 'dist'));
    log('   ✓ client/dist/', 'green');
  } else {
    log('   ⚠ client/dist/ 不存在（请先运行 cd client && npm run build）', 'yellow');
  }

  const scriptsDir = path.join(rootDir, 'scripts');
  if (fs.existsSync(scriptsDir)) {
    copyDirSync(scriptsDir, path.join(stagingDir, 'scripts'));
    log('   ✓ scripts/', 'green');
  }

  const updateServerDir = path.join(rootDir, 'update-server');
  if (includeUpdateServer) {
    if (fs.existsSync(updateServerDir)) {
      copyDirSync(updateServerDir, path.join(stagingDir, 'update-server'));
      log('   ✓ update-server/', 'green');
    } else {
      log('   ⚠ update-server/ 目录不存在，跳过', 'yellow');
    }
  }

  const rootFiles = ['package.json', 'LICENSE', 'README.md', '.env.example'];
  rootFiles.forEach(f => {
    const src = path.join(rootDir, f);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, path.join(stagingDir, f));
      log(`   ✓ ${f}`, 'green');
    }
  });

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
      en: [translateChangelog(changelogText)]
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

  fs.rmSync(stagingDir, { recursive: true, force: true });

  log('\n✅ 构建完成!\n', 'green');
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

function copyDirSync(src, dest) {
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
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
