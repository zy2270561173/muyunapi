const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const rootDir = path.resolve(__dirname);
const updateServerDir = path.join(rootDir, 'update-server');

// 颜色输出
const log = {
  info:  (msg) => console.log(`\x1b[36m${msg}\x1b[0m`),
  ok:    (msg) => console.log(`\x1b[32m${msg}\x1b[0m`),
  warn:  (msg) => console.log(`\x1b[33m${msg}\x1b[0m`),
  err:   (msg) => console.log(`\x1b[31m${msg}\x1b[0m`),
};

/** 执行命令并返回 Promise */
const run = (cmd, cwd, label) => {
  return new Promise((resolve, reject) => {
    const proc = exec(cmd, { cwd, timeout: 300000 });
    proc.stdout.on('data', (d) => process.stdout.write(d));
    proc.stderr.on('data', (d) => process.stderr.write(d));
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${label} 失败 (退出码: ${code})`));
    });
    proc.on('error', reject);
  });
};

/** 启动长驻进程 */
const spawn = (cmd, cwd, label) => {
  const proc = exec(cmd, { cwd });
  proc.stdout.on('data', (d) => process.stdout.write(`[${label}] ${d}`));
  proc.stderr.on('data', (d) => process.stderr.write(`[${label}] ${d}`));
  return proc;
};

/** 检查 node_modules 是否存在 */
const hasNodeModules = (dir) => fs.existsSync(path.join(dir, 'node_modules'));

/** 等待指定毫秒 */
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ─── 主流程 ───

async function main() {
  console.log('');
  log.info('╔══════════════════════════════════════════╗');
  log.info('║     MuYunAPI 更新服务器启动脚本          ║');
  log.info('╚══════════════════════════════════════════╝');
  console.log('');

  // 检查依赖
  if (!hasNodeModules(updateServerDir)) {
    log.warn('→ 更新服务器依赖不存在，正在安装...');
    try {
      await run('npm install', updateServerDir, '依赖安装');
      log.ok('✓ 依赖安装完成\n');
    } catch (e) {
      log.err(`✗ 依赖安装失败: ${e.message}`);
      process.exit(1);
    }
  } else {
    log.ok('✓ 更新服务器依赖已安装\n');
  }

  // 启动服务
  log.info('→ 正在启动更新服务器...');
  const proc = spawn('node index.js', updateServerDir, '更新服务器');
  
  // 优雅退出
  process.on('SIGINT', () => {
    console.log('');
    log.warn('🛑 正在停止更新服务器...');
    proc.kill('SIGINT');
    sleep(500).then(() => process.exit(0));
  });

  await sleep(2000);
  
  if (proc.exitCode !== null) {
    log.err('✗ 启动失败！请检查上方错误信息');
    process.exit(1);
  }

  console.log('');
  log.ok('╔══════════════════════════════════════════╗');
  log.ok('║        ✅ 更新服务器启动成功！            ║');
  log.ok('╚══════════════════════════════════════════╝');
  console.log('');
  log.info('   访问地址: http://localhost:3001');
  log.info('   管理后台: http://localhost:3001');
  log.info('   默认账号: admin / admin123');
  console.log('');
  log.info('   按 Ctrl+C 停止服务');
  console.log('');
}

main().catch((err) => {
  log.err(`\n✗ 启动失败: ${err.message}`);
  process.exit(1);
});
