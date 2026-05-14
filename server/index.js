require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');
const fs = require('fs');

const app = express();

// 信任代理（解决 express-rate-limit 在反向代理下的警告）
app.set('trust proxy', 1);

// 初始化数据库
require('./db/init');

// 中间件
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 速率限制
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  message: { code: 429, message: '请求过于频繁，请稍后再试' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// 路由
app.use('/api/auth', require('./routes/auth'));
app.use('/api/user', require('./routes/user'));
app.use('/api/apis', require('./routes/api'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/proxy', require('./routes/proxy'));
app.use('/api/themes', require('./routes/themes'));
app.use('/api/friendships', require('./routes/friendships'));
app.use('/api/libraries', require('./routes/libraries'));
app.use('/api/about', require('./routes/about'));
app.use('/api/timeline-types', require('./routes/timeline-types'));
app.use('/api/update', require('./routes/update'));
// API版本管理（嵌套路由）
app.use('/api/apis/:apiId/versions', require('./routes/api-versions'));

// 公告 - topbar类型（顶部滚动栏）
app.get('/api/announcements', (req, res) => {
  const db = require('./db/init');
  const list = db.prepare("SELECT * FROM announcements WHERE is_active = 1 AND type IN ('topbar', 'both') ORDER BY id DESC LIMIT 5").all();
  res.json({ code: 200, data: list });
});

// 公告 - popup类型（弹窗公告）
app.get('/api/announcements/popup', (req, res) => {
  const db = require('./db/init');
  // 获取最近一条未读弹窗公告（前端记录已弹过的公告ID）
  const lastId = parseInt(req.query.last_id) || 0;
  // 修复：获取单条数据应使用 .get()
  const data = db.prepare("SELECT * FROM announcements WHERE is_active = 1 AND type IN ('popup', 'both') AND id > ? ORDER BY id ASC LIMIT 1").get(lastId);
  res.json({ code: 200, data: data });
});

// 站点信息
app.get('/api/site-info', (req, res) => {
  const db = require('./db/init');
  const configs = db.prepare("SELECT key, value FROM configs WHERE key IN ('site_name','site_description','site_keywords','site_logo','icp')").all();
  const obj = {};
  configs.forEach(c => { obj[c.key] = c.value; });
  const apiCount = db.prepare('SELECT COUNT(*) as cnt FROM apis WHERE status = 1').get().cnt;
  const userCount = db.prepare('SELECT COUNT(*) as cnt FROM users').get().cnt;
  const callCount = db.prepare('SELECT SUM(calls_count) as cnt FROM apis').get().cnt || 0;
  res.json({ code: 200, data: { ...obj, apiCount, userCount, callCount } });
});

// 静态文件 (前端打包后)
const clientDist = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get(/^(?!\/api).*$/, (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// ─── 启动服务器与优雅退出逻辑 ───
const PORT = process.env.PORT || 3000;

// 将 server 实例保存下来，用于优雅关闭
let server;

server = app.listen(PORT, () => {
  console.log(`\n🚀 MuYunAPI 服务器已启动`);
  console.log(`   端口: ${PORT}`);
  console.log(`   访问: http://localhost:${PORT}`);
  console.log(`   管理: http://localhost:${PORT}/admin`);
  console.log(`   API文档: http://localhost:${PORT}/api/apis\n`);
});

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

module.exports = app;