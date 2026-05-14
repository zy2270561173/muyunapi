/**
 * MuYunAPI 启动脚本
 *
 * 支持三种模式：
 * 1. PM2 环境        - 检测到 PM2，直接交给 PM2 管理（退出码 42/43 由 PM2 重启）
 * 2. Windows 普通模式  - 自身为守护进程，监听子进程退出码 42/43 自动重启
 * 3. Linux 普通模式    - 同 Windows，父进程自身守护子进程
 *
 * 热重载约定：
 *   退出码 42 = 仅重启主服务
 *   退出码 43 = 重启主服务 + 重启更新服务器
 *   其他非 0 退出码 = 异常，3 秒后自动重启（crash 自愈）
 */

const { spawn: nodeSpawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const rootDir  = path.resolve(__dirname);
const frontDir = path.join(rootDir, 'client');
const srvDir   = path.join(rootDir, 'server');
const updDir   = path.join(rootDir, 'update-server');

// ── 热重载退出码约定 ──────────────────────────────────────────────────────
const EXIT_RESTART     = 42;
const EXIT_RESTART_ALL = 43;

// ── 颜色日志 ────────────────────────────────────────────────────────────────
const log = {
  info:  (m) => console.log(`\x1b[36m${m}\x1b[0m`),
  ok:    (m) => console.log(`\x1b[32m${m}\x1b[0m`),
  warn:  (m) => console.log(`\x1b[33m${m}\x1b[0m`),
  err:   (m) => console.log(`\x1b[31m${m}\x1b[0m`),
  dim:   (m) => console.log(`\x1b[2m${m}\x1b[0m`),
};

// ── 工具 ────────────────────────────────────────────────────────────────────
const run = (cmd, cwd, label) => new Promise((resolve, reject) => {
  const p = exec(cmd, { cwd, timeout: 300000 });
  p.stdout.on('data', d => process.stdout.write(d));
  p.stderr.on('data', d => process.stderr.write(d));
  p.on('close', code => code === 0 ? resolve() : reject(new Error(`${label} 失败 (退出码: ${code})`)));
  p.on('error', reject);
});

const hasNodeModules = (dir) => fs.existsSync(path.join(dir, 'node_modules'));
const hasFrontBuild  = ()    => fs.existsSync(path.join(frontDir, 'dist', 'index.html'));
const sleep          = (ms)  => new Promise(r => setTimeout(r, ms));

// ── 检测运行环境 ─────────────────────────────────────────────────────────────
function detectRuntime() {
  if (process.env.pm_id !== undefined) return 'pm2';
  if (process.platform === 'win32')    return 'windows';
  return 'linux';
}

// ── 子进程引用 ───────────────────────────────────────────────────────────────
let updateProc = null;
let serverProc = null;

/**
 * 启动守护子进程
 * @param {string} label
 * @param {string} cwd
 * @param {function} onRestart  退出码 42/43 回调
 * @returns {ChildProcess}
 */
function startDaemon(label, cwd, onRestart) {
  log.info(`  → 启动 [${label}]...`);
  const proc = nodeSpawn('node', ['index.js'], { cwd, stdio: 'pipe', env: { ...process.env } });
  proc.stdout.on('data', d => process.stdout.write(`[${label}] ${d}`));
  proc.stderr.on('data', d => process.stderr.write(`[${label}] ${d}`));

  proc.on('close', (code, signal) => {
    if (signal === 'SIGINT' || signal === 'SIGTERM') return;

    if (code === EXIT_RESTART || code === EXIT_RESTART_ALL) {
      log.warn(`\n[${label}] 🔄 热重载信号（退出码 ${code}），重启中...`);
      setTimeout(() => onRestart(code), 500);
      return;
    }

    if (code === 0) { log.dim(`[${label}] 正常退出`); return; }

    log.err(`[${label}] 异常退出（${code ?? signal}），3 秒后重启...`);
    setTimeout(() => onRestart(code), 3000);
  });

  proc.on('error', err => log.err(`[${label}] 进程错误: ${err.message}`));
  return proc;
}

// ── 重启函数 ────────────────────────────────────────────────────────────────
function restartServer(exitCode) {
  if (serverProc) try { serverProc.kill(); } catch (_) {}
  serverProc = startDaemon('主服务', srvDir, restartServer);
  if (exitCode === EXIT_RESTART_ALL) restartUpdateServer(EXIT_RESTART);
}

function restartUpdateServer(exitCode) {
  if (updateProc) try { updateProc.kill(); } catch (_) {}
  updateProc = startDaemon('更新服务器', updDir, restartUpdateServer);
}

// ── 环境准备步骤 ─────────────────────────────────────────────────────────────
const steps = [
  {
    name: '检查前端依赖',
    run: async () => {
      if (hasNodeModules(frontDir)) { log.ok('  ✓ 前端依赖已安装'); return; }
      log.warn('  → 安装前端依赖...');
      await run('npm install', frontDir, '前端依赖');
    }
  },
  {
    name: '构建前端',
    run: async () => {
      if (hasFrontBuild()) { log.ok('  ✓ 前端已构建（删除 client/dist 可强制重建）'); return; }
      log.warn('  → 构建前端...');
      await run('npm run build', frontDir, '前端构建');
    }
  },
  {
    name: '检查后端依赖',
    run: async () => {
      if (hasNodeModules(srvDir)) { log.ok('  ✓ 后端依赖已安装'); return; }
      log.warn('  → 安装后端依赖...');
      await run('npm install', srvDir, '后端依赖');
    }
  },
  {
    name: '检查更新服务器依赖',
    run: async () => {
      if (hasNodeModules(updDir)) { log.ok('  ✓ 更新服务器依赖已安装'); return; }
      log.warn('  → 安装更新服务器依赖...');
      await run('npm install', updDir, '更新服务器依赖');
    }
  },
];

// ── PM2 启动模式 ─────────────────────────────────────────────────────────────
function startWithPM2() {
  const pm2Bin = process.env.PM2 || 'pm2';

  log.info('检测到 PM2 环境，使用 PM2 管理进程...\n');

  // 尝试加载 PM2
  let PM2;
  try { PM2 = require('pm2'); } catch (_) {
    log.err('PM2 模块未安装，请先运行: npm install -g pm2');
    process.exit(1);
  }

  const daemonOps = { cwd: rootDir, env: { ...process.env } };

  // 连接 PM2
  await new Promise((resolve, reject) => {
    PM2.connect(err => {
      if (err) { reject(err); return; }
      resolve();
    });
  });

  // 启动更新服务器
  await new Promise((resolve, reject) => {
    PM2.start({ script: 'index.js', name: 'muyu-update', cwd: updDir, env: daemonOps.env }, err => {
      if (err && !err.message?.includes('already exists')) { reject(err); return; }
      resolve();
    });
  });

  // 启动主服务
  await new Promise((resolve, reject) => {
    PM2.start({ script: 'index.js', name: 'muyu-server', cwd: srvDir, env: daemonOps.env }, err => {
      if (err && !err.message?.includes('already exists')) { reject(err); return; }
      resolve();
    });
  });

  // 监听主服务退出码 42/43 -> 重启
  PM2.launchBus((err, bus) => {
    if (err) return;
    bus.on('process:exit', packet => {
      const { name, exit_code: code, spawned_by: parent } = packet.data;
      if (name !== 'muyu-server') return;

      if (code === EXIT_RESTART) {
        log.warn('\n[PM2] 主服务退出码 42，热重载...');
        PM2.restart('muyu-server');
      } else if (code === EXIT_RESTART_ALL) {
        log.warn('\n[PM2] 主服务退出码 43，热重载全部...');
        PM2.restart('muyu-server');
        setTimeout(() => PM2.restart('muyu-update'), 2000);
      }
    });
  });

  // 保存进程列表，重启后自动拉起
  await new Promise(resolve => {
    PM2.dump(() => resolve());
  });

  PM2.list((err, list) => {
    if (!err) {
      const srv = list.find(p => p.name === 'muyu-server');
      const upd = list.find(p => p.name === 'muyu-update');
      log.ok(`\n  ✅ PM2 已接管进程`);
      log.info(`     muyu-server: ${srv?.pm2_env?.status || '?'}`);
      log.info(`     muyu-update: ${upd?.pm2_env?.status || '?'}`);
    }
  });

  console.log('');
  log.info('   PM2 命令参考:');
  log.dim('     pm2 list              查看进程状态');
  log.dim('     pm2 logs             查看日志');
  log.dim('     pm2 restart muyu-server   重启主服务');
  log.dim('     pm2 restart muyu-update   重启更新服务器');
  log.dim('     pm2 delete all       停止所有服务');
  console.log('');
  log.dim('   按 Ctrl+C 仅断开 PM2 连接，进程保持运行');
  console.log('');

  // Ctrl+C 只断开 PM2 连接，不 kill 子进程
  process.on('SIGINT', () => {
    console.log('');
    log.info('断开 PM2 连接（进程仍在后台运行）...');
    PM2.disconnect();
    sleep(500).then(() => process.exit(0));
  });
}

// ── 主流程 ───────────────────────────────────────────────────────────────────
async function main() {
  const runtime = detectRuntime();

  console.log('');
  log.info('╔══════════════════════════════════════════╗');
  log.info('║       MuYunAPI 自动化部署启动脚本      ║');
  log.info('╚══════════════════════════════════════════╝');
  if (runtime === 'pm2') log.info('        [ PM2 模式 ]');
  else log.info('        [ 守护进程模式 ]');
  console.log('');

  // PM2 模式直接启动，不走环境检查
  if (runtime === 'pm2') {
    await startWithPM2();
    return;
  }

  // 阶段一：环境检查
  log.info('━━━ 阶段一：环境检查与构建 ━━━\n');
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    log.info(`[${i + 1}/${steps.length}] ${step.name}...`);
    try { await step.run(); }
    catch (e) { log.err(`\n❌ ${step.name}出错: ${e.message}`); process.exit(1); }
    console.log('');
  }

  // 阶段二：启动守护服务
  log.info('━━━ 阶段二：启动守护服务 ━━━\n');

  const cleanup = () => {
    console.log('');
    log.warn('🛑 停止所有服务...');
    if (serverProc) try { serverProc.kill('SIGINT'); } catch (_) {}
    if (updateProc) try { updateProc.kill('SIGINT'); } catch (_) {}
    sleep(500).then(() => process.exit(0));
  };
  process.on('SIGINT',  cleanup);
  process.on('SIGTERM', cleanup);

  // 更新服务器
  log.info('[1/2] 启动更新服务器（守护模式）...');
  updateProc = startDaemon('更新服务器', updDir, restartUpdateServer);
  await sleep(2500);

  if (updateProc.exitCode !== null && ![EXIT_RESTART, EXIT_RESTART_ALL].includes(updateProc.exitCode)) {
    log.err('  ✗ 更新服务器启动失败！请检查日志');
    log.dim('  提示: 删除 update-server/node_modules 后重试');
    process.exit(1);
  }
  log.ok('  ✓ 更新服务器已启动 (端口 3001)\n');

  // 主服务
  log.info('[2/2] 启动主后端服务（守护模式）...');
  serverProc = startDaemon('主服务', srvDir, restartServer);
  await sleep(1500);

  console.log('');
  log.info('╔══════════════════════════════════════════╗');
  log.ok( '║          ✅ 所有服务启动完成！          ║');
  log.info('╚══════════════════════════════════════════╝');
  console.log('');
  log.info('   主服务:       http://localhost:3000');
  log.info('   更新服务器:   http://localhost:3001');
  console.log('');
  log.dim('   热重载: 更新后自动重启，无需手动操作');
  log.dim('   按 Ctrl+C 停止所有服务');
  console.log('');
}

main().catch(err => {
  log.err(`\n❌ 部署失败: ${err.message}`);
  process.exit(1);
});
