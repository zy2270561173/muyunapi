require('dotenv').config({ path: require('path').join(__dirname, '.env') });
/**
 * MuYunAPI 更新服务器
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const { execSync } = require('child_process');
const { initDatabase } = require('./db/init');

const app = express();
const JWT_SECRET = process.env.JWT_SECRET || 'muyun-update-secret';

// 信任反向代理（仅信任第一个代理，用于获取真实 IP）
app.set('trust proxy', 1);

// 模板引擎
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// 中间件
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 静态文件
app.use('/packages', express.static(path.join(__dirname, 'packages')));

// 速率限制
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  message: { code: 429, message: '请求过于频繁，请稍后再试' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// API 路由
app.use('/api/auth', require('./routes/auth'));
app.use('/api/packages', require('./routes/packages'));
app.use('/api/upload', require('./routes/upload'));

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ code: 200, message: '服务器运行正常' });
});

// ─── 内部重启接口（热重载用，双重鉴权）───────────────────────────────────────
const UPDATE_SECRET = process.env.UPDATE_SECRET || 'change_me_to_a_random_secret';

app.post('/api/admin/restart', (req, res) => {
  const { secret } = req.body || {};

  // 第一道：共享密钥验证
  if (!secret || secret !== UPDATE_SECRET) {
    return res.status(403).json({ code: 403, message: '拒绝访问：密钥无效' });
  }

  // 第二道：JWT Token 验证（防止抓到 secret 就能滥用）
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (token) {
    try {
      jwt.verify(token, JWT_SECRET);
    } catch (_) {
      return res.status(401).json({ code: 401, message: '拒绝访问：Token无效' });
    }
  }

  console.log('[UpdateServer] 收到热重载信号，正在重启...');
  res.json({ code: 200, message: '收到重启信号，正在热重载...' });

  setTimeout(() => {
    try {
      execSync('pm2 restart MuYunAPI-Update', { stdio: 'ignore' });
    } catch (_) {
      process.exit(42);
    }
  }, 500);
});

// ─── 页面路由 ───

// 登录页
app.get('/login', (req, res) => {
  res.render('login', { title: '登录 - MuYunAPI 更新服务器' });
});

// 管理后台首页
app.get('/', (req, res) => {
  const proto = req.protocol;
  const host = req.get('host');
  res.render('index', {
    title: 'MuYunAPI 更新管理',
    username: '管理员',
    serverUrl: `${proto}://${host}`
  });
});

// 通配路由
app.get('*', (req, res) => {
  const proto = req.protocol;
  const host = req.get('host');
  res.render('index', {
    title: 'MuYunAPI 更新管理',
    username: '管理员',
    serverUrl: `${proto}://${host}`
  });
});

// 错误处理
app.use((err, req, res, next) => {
  console.error('[Error]', err);
  if (req.xhr || req.path.startsWith('/api/')) {
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  } else {
    res.redirect('/login');
  }
});

// ─── 启动服务器与优雅退出逻辑 ───
const PORT = process.env.PORT || 3001;

// 将 server 实例保存下来，用于优雅关闭
let server;

async function start() {
  try {
    await initDatabase();

    server = app.listen(PORT, '0.0.0.0', () => {
      console.log('\n🚀 MuYunAPI 更新服务器已启动');
      console.log(`   端口: ${PORT}`);
      console.log(`   监听: 0.0.0.0:${PORT}`);
      console.log(`   管理后台: http://localhost:${PORT}`);
      console.log(`   默认账号: admin / admin123\n`);
    });
  } catch (e) {
    console.error('启动失败:', e);
    process.exit(1);
  }
}

// 优雅退出处理函数
function gracefulShutdown(signal) {
  console.log(`\n🛑 收到退出信号 (${signal})，正在优雅关闭 HTTP 服务器...`);
  
  if (!server) return process.exit(0);

  // 停止接收新请求，并关闭现有连接
  server.close((err) => {
    if (err) {
      console.error('❌ 关闭服务器时发生错误:', err);
      process.exit(1);
    }
    console.log('✅ HTTP 服务器已完全关闭，进程即将退出。');
    process.exit(0);
  });

  // 兜底方案：如果 10 秒后还没关闭成功，强制退出（防止死锁）
  setTimeout(() => {
    console.error('⚠️ 强制关闭超时，正在强制终止进程...');
    process.exit(1);
  }, 10000);
}

// 监听标准退出信号（PM2 stop/restart 会触发这些）
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// 监听未捕获的异常，防止 PM2 频繁崩溃重启
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// 启动程序
start();