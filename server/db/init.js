const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, '..', 'data', 'muyunapi.db');
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  -- 用户表
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uid TEXT UNIQUE NOT NULL,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    nickname TEXT NOT NULL DEFAULT '',
    avatar TEXT DEFAULT '',
    role TEXT NOT NULL DEFAULT 'user',
    api_key TEXT UNIQUE,
    api_secret TEXT UNIQUE,
    email_verified INTEGER DEFAULT 0,
    status INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- 邮箱验证码表
  CREATE TABLE IF NOT EXISTS email_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL,
    code TEXT NOT NULL,
    type TEXT DEFAULT 'register',
    used INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- API分类表
  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    icon TEXT DEFAULT '',
    description TEXT DEFAULT '',
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- API接口表
  CREATE TABLE IF NOT EXISTS apis (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    category_id INTEGER REFERENCES categories(id),
    description TEXT DEFAULT '',
    endpoint TEXT NOT NULL,
    method TEXT DEFAULT 'GET',
    params TEXT DEFAULT '[]',
    headers TEXT DEFAULT '{}',
    response_example TEXT DEFAULT '',
    doc_content TEXT DEFAULT '',
    source TEXT DEFAULT 'external' CHECK(source IN ('local', 'external')),
    is_free INTEGER DEFAULT 1,
    require_auth INTEGER DEFAULT 0,
    status INTEGER DEFAULT 1,
    sort_order INTEGER DEFAULT 0,
    created_by INTEGER REFERENCES users(id),
    calls_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- API速度测试记录
  CREATE TABLE IF NOT EXISTS api_speed_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    api_id INTEGER REFERENCES apis(id),
    response_time INTEGER,
    status_code INTEGER,
    success INTEGER DEFAULT 1,
    tested_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- API调用日志
  CREATE TABLE IF NOT EXISTS call_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    api_id INTEGER REFERENCES apis(id),
    user_id INTEGER REFERENCES users(id),
    ip TEXT,
    method TEXT,
    params TEXT DEFAULT '{}',
    response_code INTEGER,
    response_time INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- 用户密钥表
  CREATE TABLE IF NOT EXISTS user_keys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id),
    name TEXT NOT NULL,
    api_key TEXT UNIQUE NOT NULL,
    secret_key TEXT NOT NULL,
    permissions TEXT DEFAULT '["*"]',
    daily_limit INTEGER DEFAULT 1000,
    calls_today INTEGER DEFAULT 0,
    total_calls INTEGER DEFAULT 0,
    last_reset_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    status INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- 系统配置表
  CREATE TABLE IF NOT EXISTS configs (
    key TEXT PRIMARY KEY,
    value TEXT,
    description TEXT DEFAULT '',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- 公告/标签表
  CREATE TABLE IF NOT EXISTS tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    api_id INTEGER REFERENCES apis(id),
    name TEXT NOT NULL
  );

  -- 收藏表
  CREATE TABLE IF NOT EXISTS favorites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id),
    api_id INTEGER REFERENCES apis(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, api_id)
  );

  -- 公告表
  CREATE TABLE IF NOT EXISTS announcements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    type TEXT DEFAULT 'topbar' CHECK(type IN ('topbar', 'popup', 'both')),
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- 友链表
  CREATE TABLE IF NOT EXISTS friendships (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    target TEXT DEFAULT 'blank' CHECK(target IN ('blank', 'self', 'redirect')),
    redirect_seconds INTEGER DEFAULT 5,
    logo TEXT DEFAULT '',
    sort_order INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// 插入默认配置
const defaultConfigs = [
  ['site_name', 'MuYunAPI', '站点名称'],
  ['site_description', '免费开放的API聚合分享平台', '站点描述'],
  ['site_keywords', 'API,接口,开放平台', '站点关键词'],
  ['smtp_host', 'smtp.qq.com', 'SMTP服务器'],
  ['smtp_port', '465', 'SMTP端口'],
  ['smtp_user', '', 'SMTP用户名'],
  ['smtp_pass', '', 'SMTP密码/授权码'],
  ['smtp_from', '', '发件人'],
  ['allow_register', '1', '是否允许注册'],
  ['require_email_verify', '1', '是否需要邮箱验证'],
  ['api_rate_limit', '100', '每分钟API调用限制'],
  ['free_daily_limit', '500', '免费用户每日调用限制'],
  ['site_logo', '', '站点Logo'],
  ['icp', '', 'ICP备案号'],
  ['friendship_enabled', '1', '是否开启友链'],
  ['footer_time_enabled', '0', '页脚是否显示运行时间'],
  ['footer_time_style', 'running', '页脚运行时间风格(running/穿越了/稳定运行了)'],
  ['site_start_date', '2026-01-01', '站点上线日期(YYYY-MM-DD)'],
  ['github_store_repo', 'zy2270561173/muyunapi-script', 'GitHub内置库仓库'],
  ['github_proxy_url', 'https://gh-proxy.org/', 'GitHub加速代理地址'],
];

const insertConfig = db.prepare(`INSERT OR IGNORE INTO configs (key, value, description) VALUES (?, ?, ?)`);
defaultConfigs.forEach(([key, value, description]) => insertConfig.run(key, value, description));

// 默认分类
const insertCat = db.prepare(`INSERT OR IGNORE INTO categories (id, name, icon, description) VALUES (?, ?, ?, ?)`);
insertCat.run(1, '天气查询', '🌤', '实时天气、预报等天气相关接口');
insertCat.run(2, '图片素材', '🖼', '图片处理、美化、素材类接口');
insertCat.run(3, '数据查询', '📊', '各类数据聚合查询接口');
insertCat.run(4, 'AI工具', '🤖', '人工智能相关接口');
insertCat.run(5, '娱乐休闲', '🎮', '游戏、动漫、娱乐相关接口');
insertCat.run(6, '实用工具', '🔧', '身份验证、翻译等实用工具接口');

// 默认管理员账号
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { nanoid } = require('nanoid');

const adminExists = db.prepare('SELECT id FROM users WHERE role = ? LIMIT 1').get('admin');
if (!adminExists) {
  const salt = bcrypt.genSaltSync(10);
  const hash = bcrypt.hashSync('admin123456', salt);
  const uid = uuidv4().replace(/-/g, '').substring(0, 12).toUpperCase();
  const apiKey = 'mk_' + nanoid(32);
  const apiSecret = 'ms_' + nanoid(48);
  db.prepare(`INSERT INTO users (uid, username, email, password, nickname, role, api_key, api_secret, email_verified) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(uid, 'admin', 'admin@muyunapi.com', hash, '超级管理员', 'admin', apiKey, apiSecret, 1);
  console.log('[DB] 默认管理员已创建 admin/admin123456');
}

// 插入示例API
const apiExists = db.prepare('SELECT id FROM apis LIMIT 1').get();
if (!apiExists) {
  const apis = [
    {
      name: '随机一言',
      slug: 'hitokoto',
      category_id: 5,
      description: '随机获取一条精选语录，支持分类筛选',
      endpoint: 'https://v1.hitokoto.cn',
      method: 'GET',
      params: JSON.stringify([
        { name: 'c', type: 'string', required: false, description: '类型(a-动画 b-漫画 c-游戏 d-文学 e-原创 f-来自网络 g-其他 h-影视 i-诗词 j-网易云 k-哲学 l-抖机灵)', example: 'a' }
      ]),
      response_example: '{"id":1,"uuid":"xxx","hitokoto":"生活是一面镜子，你对它笑，它就对你笑","type":"a","from":"某部动漫","from_who":null,"creator":"user1","creator_uid":0,"reviewer":0,"commit_from":"web","created_at":"1586268655","length":20}',
      is_free: 1,
      require_auth: 0,
      status: 1,
    },
    {
      name: '随机图片',
      slug: 'random-image',
      category_id: 2,
      description: '获取随机精选图片URL，适合做背景图等',
      endpoint: 'https://api.muyunapi.com/v1/random-image',
      method: 'GET',
      params: JSON.stringify([
        { name: 'type', type: 'string', required: false, description: '图片类型(nature/city/anime/abstract)', example: 'nature' },
        { name: 'format', type: 'string', required: false, description: '返回格式(json/redirect)', example: 'json' }
      ]),
      response_example: '{"code":200,"data":{"url":"https://picsum.photos/1920/1080","width":1920,"height":1080}}',
      is_free: 1,
      require_auth: 0,
      status: 1,
    },
    {
      name: 'IP地址查询',
      slug: 'ip-query',
      category_id: 6,
      description: '查询IP地址的地理位置、运营商等信息',
      endpoint: 'https://api.muyunapi.com/v1/ip',
      method: 'GET',
      params: JSON.stringify([
        { name: 'ip', type: 'string', required: false, description: '要查询的IP地址，留空则查询当前IP', example: '8.8.8.8' }
      ]),
      response_example: '{"code":200,"data":{"ip":"8.8.8.8","country":"美国","region":"加利福尼亚州","city":"Mountain View","isp":"Google LLC","lat":37.386,"lng":-122.084}}',
      is_free: 1,
      require_auth: 0,
      status: 1,
    },
  ];
  const insertApi = db.prepare(`INSERT INTO apis (name, slug, category_id, description, endpoint, method, params, response_example, is_free, require_auth, status) VALUES (@name, @slug, @category_id, @description, @endpoint, @method, @params, @response_example, @is_free, @require_auth, @status)`);
  apis.forEach(a => insertApi.run(a));
  console.log('[DB] 示例API已插入');
}

// 迁移：补充 doc_content 字段（兼容已有数据库）
try {
  db.exec("ALTER TABLE apis ADD COLUMN doc_content TEXT DEFAULT ''");
  console.log('[DB] 已迁移：apis.doc_content 字段已添加');
} catch (e) {
  // 字段已存在时忽略错误
}

// 迁移：补充 source 字段（兼容已有数据库）
try {
  db.exec("ALTER TABLE apis ADD COLUMN source TEXT DEFAULT 'external' CHECK(source IN ('local', 'external'))");
  console.log('[DB] 已迁移：apis.source 字段已添加');
} catch (e) {
  // 字段已存在时忽略错误
}

// 迁移：补充 announcements type 字段（兼容已有数据库）
try {
  db.exec("ALTER TABLE announcements ADD COLUMN type TEXT DEFAULT 'topbar' CHECK(type IN ('topbar', 'popup', 'both'))");
  console.log('[DB] 已迁移：announcements.type 字段已添加');
} catch (e) {
  // 字段已存在时忽略错误
}

// 迁移：补充 apis theme 字段（兼容已有数据库）
try {
  db.exec("ALTER TABLE apis ADD COLUMN theme TEXT DEFAULT 'both' CHECK(theme IN ('dark', 'light', 'both'))");
  console.log('[DB] 已迁移：apis.theme 字段已添加');
} catch (e) {
  // 字段已存在时忽略错误
}

// 迁移：补充用户积分字段
try {
  db.exec("ALTER TABLE users ADD COLUMN credits INTEGER DEFAULT 0");
  console.log('[DB] 已迁移：users.credits 积分字段已添加');
} catch (e) {
  // 字段已存在时忽略错误
}

// 迁移：补充API积分消费字段
try {
  db.exec("ALTER TABLE apis ADD COLUMN credits_cost INTEGER DEFAULT 0");
  console.log('[DB] 已迁移：apis.credits_cost 积分消费字段已添加');
} catch (e) {
  // 字段已存在时忽略错误
}

// 迁移：补充每日积分重置时间字段
try {
  db.exec("ALTER TABLE users ADD COLUMN credits_reset_at DATETIME DEFAULT CURRENT_TIMESTAMP");
  console.log('[DB] 已迁移：users.credits_reset_at 积分重置时间已添加');
} catch (e) {
  // 字段已存在时忽略错误
}

// 主题表
db.exec(`
  CREATE TABLE IF NOT EXISTS themes (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT DEFAULT 'custom',
    css_vars TEXT NOT NULL,
    preview TEXT DEFAULT '',
    is_public INTEGER DEFAULT 0,
    created_by INTEGER REFERENCES users(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);
console.log('[DB] themes 表已创建/验证');

// 积分充值记录表
db.exec(`
  CREATE TABLE IF NOT EXISTS credit_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id),
    amount INTEGER NOT NULL,
    type TEXT DEFAULT 'charge' CHECK(type IN ('charge', 'consume', 'refund', 'admin_add')),
    description TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);
console.log('[DB] credit_transactions 表已创建/验证');

// API版本管理表
db.exec(`
  CREATE TABLE IF NOT EXISTS api_versions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    api_id INTEGER NOT NULL REFERENCES apis(id) ON DELETE CASCADE,
    version TEXT NOT NULL,
    endpoint TEXT NOT NULL,
    params TEXT DEFAULT '[]',
    headers TEXT DEFAULT '{}',
    response_example TEXT DEFAULT '',
    doc_content TEXT DEFAULT '',
    changelog TEXT DEFAULT '',
    is_active INTEGER DEFAULT 0,
    created_by INTEGER REFERENCES users(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(api_id, version)
  )
`);
console.log('[DB] api_versions 表已创建/验证');

// 迁移：为apis表添加当前版本字段
try {
  db.exec("ALTER TABLE apis ADD COLUMN current_version TEXT DEFAULT 'v1'");
  console.log('[DB] 已迁移：apis.current_version 版本字段已添加');
} catch (e) {
  // 字段已存在时忽略错误
}

// 关于我页面配置表
db.exec(`
  CREATE TABLE IF NOT EXISTS about_page (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    is_enabled INTEGER DEFAULT 1,
    name TEXT DEFAULT '开发者',
    avatar TEXT DEFAULT '',
    school_name TEXT DEFAULT '普宁职业技术学校',
    school_code TEXT DEFAULT '8800587',
    major TEXT DEFAULT '计算机网络技术',
    class_name TEXT DEFAULT '',
    bio TEXT DEFAULT '',
    skills TEXT DEFAULT '[]',
    timeline TEXT DEFAULT '[]',
    github_url TEXT DEFAULT '',
    email TEXT DEFAULT '',
    wechat TEXT DEFAULT '',
    qq TEXT DEFAULT '',
    update_log TEXT DEFAULT '',
    auto_sync_github INTEGER DEFAULT 1,
    github_repo TEXT DEFAULT 'zy2270561173/muyunapi',
    last_sync_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);
console.log('[DB] about_page 表已创建/验证');

// 迁移：为已存在的about_page表添加timeline字段
try {
  db.exec('ALTER TABLE about_page ADD COLUMN timeline TEXT DEFAULT \'[]\'');
  console.log('[DB] about_page.timeline 字段已添加');
} catch (e) {
  // 字段可能已存在时忽略错误
}

// GitHub同步备份记录表
db.exec(`
  CREATE TABLE IF NOT EXISTS github_sync_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    commit_hash TEXT NOT NULL,
    commit_message TEXT,
    commit_author TEXT,
    commit_date DATETIME,
    backup_path TEXT,
    is_synced INTEGER DEFAULT 0,
    synced_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);
console.log('[DB] github_sync_logs 表已创建/验证');

// GitHub内置库商店表
db.exec(`
  CREATE TABLE IF NOT EXISTS github_store_scripts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    repo_owner TEXT NOT NULL,
    repo_name TEXT NOT NULL,
    script_name TEXT NOT NULL,
    script_path TEXT NOT NULL,
    display_name TEXT NOT NULL,
    description TEXT DEFAULT '',
    category_id INTEGER,
    author TEXT DEFAULT '',
    github_url TEXT DEFAULT '',
    raw_url TEXT DEFAULT '',
    version TEXT DEFAULT '1.0.0',
    is_active INTEGER DEFAULT 1,
    download_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(repo_owner, repo_name, script_name)
  )
`);
console.log('[DB] github_store_scripts 表已创建/验证');

// 时间线类型配置表
db.exec(`
  CREATE TABLE IF NOT EXISTS timeline_types (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type_key TEXT UNIQUE NOT NULL,
    label TEXT NOT NULL,
    icon TEXT DEFAULT 'Clock',
    color TEXT DEFAULT '#409eff',
    tag_type TEXT DEFAULT 'default',
    sort_order INTEGER DEFAULT 0,
    is_system INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);
console.log('[DB] timeline_types 表已创建/验证');

// 初始化默认时间线类型
const typeCount = db.prepare('SELECT COUNT(*) as cnt FROM timeline_types').get();
if (typeCount.cnt === 0) {
  const defaultTypes = [
    { type_key: 'current', label: '工作', icon: 'OfficeBuilding', color: '#67c23a', tag_type: 'success', sort_order: 1, is_system: 1 },
    { type_key: 'project', label: '项目', icon: 'Collection', color: '#e6a23c', tag_type: 'warning', sort_order: 2, is_system: 1 },
    { type_key: 'graduate', label: '毕业', icon: 'Medal', color: '#909399', tag_type: 'info', sort_order: 3, is_system: 1 },
    { type_key: 'club', label: '社团', icon: 'UserFilled', color: '#f56c6c', tag_type: 'danger', sort_order: 4, is_system: 1 },
    { type_key: 'school', label: '入学', icon: 'School', color: '#409eff', tag_type: 'default', sort_order: 5, is_system: 1 }
  ];

  const insertStmt = db.prepare(`
    INSERT INTO timeline_types (type_key, label, icon, color, tag_type, sort_order, is_system)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  for (const t of defaultTypes) {
    insertStmt.run(t.type_key, t.label, t.icon, t.color, t.tag_type, t.sort_order, t.is_system);
  }
  console.log('[DB] 默认时间线类型已创建');
}

// 初始化关于我页面默认数据
const aboutExists = db.prepare('SELECT id FROM about_page LIMIT 1').get();
if (!aboutExists) {
  const defaultTimeline = [
    {
      id: 'default-1',
      type: 'current',
      date: '现在',
      status: '进行中',
      title: '学校后勤老师',
      description: '在某学校担任后勤老师，负责学校基础设施维护与技术支持工作',
      tags: []
    },
    {
      id: 'default-2',
      type: 'project',
      date: '2024年',
      status: '开源项目',
      title: 'MuYunAPI 开源项目',
      description: '开发并开源了全栈API聚合管理平台，支持内置接口、外部代理、多版本管理、主题切换等功能',
      tags: ['全栈开发', 'Vue3', 'Node.js']
    },
    {
      id: 'default-3',
      type: 'graduate',
      date: '2025年6月',
      status: '毕业',
      title: '顺利毕业',
      description: '完成计算机网络技术专业学习，获得毕业证书',
      tags: []
    },
    {
      id: 'default-4',
      type: 'club',
      date: '在校期间',
      status: '社团创始人',
      title: '创立计算机维修社团',
      description: '在校期间创立计算机维修社团，带领团队为各班级和其他社团提供电脑维修服务，积累了丰富的实践经验',
      tags: ['社团创始人', '技术服务', '团队管理']
    },
    {
      id: 'default-5',
      type: 'school',
      date: '2022年9月',
      status: '入学',
      title: '就读普宁职业技术学校',
      description: '计算机网络技术专业 | 招生代码：8800587',
      tags: []
    }
  ];

  db.prepare(`
    INSERT INTO about_page (
      name, school_name, school_code, major, bio, timeline,
      github_url, update_log, auto_sync_github, github_repo
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'MuYunAPI 开发者',
    '普宁职业技术学校',
    '8800587',
    '计算机网络技术',
    '热爱开源，专注于API聚合与分享平台的开发',
    JSON.stringify(defaultTimeline),
    'https://github.com/zy2270561173/muyunapi',
    JSON.stringify([
      { version: 'v1.2.0', date: '2026-05-14', content: '新增API版本管理、Markdown编辑器、主题系统重构' },
      { version: 'v1.1.0', date: '2026-05-01', content: '新增内置库脚本管理、积分系统' },
      { version: 'v1.0.0', date: '2026-04-15', content: '项目初始化，基础功能完成' }
    ]),
    1,
    'zy2270561173/muyunapi'
  );
  console.log('[DB] 关于我页面默认数据已创建');
}

module.exports = db;
