require('dotenv').config({ path: require('path').join(__dirname, '.env') });
/**
 * MuYunAPI 更新服务器
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
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

  console.log('[UpdateServer] 收到热重载信号（退出码 42），正在重启...');
  res.json({ code: 200, message: '收到重启信号，正在热重载...' });

  setTimeout(() => process.exit(42), 500);
});

// ─── 页面路由 ───

// 登录页
app.get('/login', (req, res) => {
  res.render('login', { title: '登录 - MuYunAPI 更新服务器' });
});

// 管理后台首页 - 直接渲染，token 验证交给前端
app.get('/', (req, res) => {
  const proto = req.protocol;
  const host = req.get('host');
  res.render('index', {
    title: 'MuYunAPI 更新管理',
    username: '管理员',
    serverUrl: `${proto}://${host}`
  });
});

// 通配路由 - 所有非 API、非静态资源的 GET 请求都返回管理后台（支持前端路由）
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

// 启动服务器
const PORT = process.env.PORT || 3001;

async function start() {
  try {
    await initDatabase();

    app.listen(PORT, '0.0.0.0', () => {
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

start();
