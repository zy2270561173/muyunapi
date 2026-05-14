/**
 * 数据库初始化 - 使用 sql.js (纯 JS 实现，无需编译)
 */

const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, '..', 'data', 'database.sqlite');

// 确保目录存在
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// 数据库实例
let db = null;

// 初始化数据库
async function initDatabase() {
  try {
    const SQL = await initSqlJs();
    
    // 尝试加载现有数据库
    if (fs.existsSync(DB_PATH)) {
      const buffer = fs.readFileSync(DB_PATH);
      db = new SQL.Database(buffer);
      console.log('✓ 数据库加载成功');
    } else {
      db = new SQL.Database();
      console.log('✓ 新数据库创建成功');
    }
    
    // 创建表
    createTables();
    
    // 创建默认管理员
    createDefaultAdmin();
    
    // 保存数据库
    saveDatabase();
    
    return db;
  } catch (e) {
    console.error('数据库初始化失败:', e);
    throw e;
  }
}

// 创建表
function createTables() {
  // 更新包表
  db.run(`
    CREATE TABLE IF NOT EXISTS packages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      version TEXT NOT NULL,
      version_code INTEGER NOT NULL,
      channel TEXT DEFAULT 'stable',
      platform TEXT NOT NULL,
      arch TEXT NOT NULL,
      filename TEXT NOT NULL,
      size INTEGER NOT NULL,
      checksum_md5 TEXT NOT NULL,
      checksum_sha256 TEXT NOT NULL,
      min_version TEXT DEFAULT '0.0.0',
      force_update INTEGER DEFAULT 0,
      breaking_changes INTEGER DEFAULT 0,
      changelog_zh TEXT,
      changelog_en TEXT,
      is_active INTEGER DEFAULT 1,
      download_count INTEGER DEFAULT 0,
      release_date TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 下载日志表
  db.run(`
    CREATE TABLE IF NOT EXISTS download_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      package_id INTEGER NOT NULL,
      client_version TEXT,
      client_ip TEXT,
      user_agent TEXT,
      downloaded_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (package_id) REFERENCES packages(id)
    )
  `);

  // 管理员表
  db.run(`
    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'admin',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 配置表
  db.run(`
    CREATE TABLE IF NOT EXISTS configs (
      key TEXT PRIMARY KEY,
      value TEXT
    )
  `);

  console.log('✓ 数据表创建成功');
}

// 创建默认管理员
function createDefaultAdmin() {
  const username = process.env.ADMIN_USERNAME || 'admin';
  const password = process.env.ADMIN_PASSWORD || 'admin123';
  
  // 检查是否已存在
  const existing = db.exec(`SELECT id FROM admins WHERE username = '${username}'`);
  
  if (existing.length === 0 || existing[0].values.length === 0) {
    const hashedPassword = bcrypt.hashSync(password, 10);
    db.run(
      'INSERT INTO admins (username, password, role) VALUES (?, ?, ?)',
      [username, hashedPassword, 'admin']
    );
    console.log(`✓ 默认管理员已创建 (${username} / ${password})`);
  }
}

// 保存数据库到文件
function saveDatabase() {
  try {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  } catch (e) {
    console.error('保存数据库失败:', e);
  }
}

// 数据库操作封装
function prepare(sql) {
  return {
    all: (...params) => {
      try {
        const stmt = db.prepare(sql);
        if (params.length > 0) {
          stmt.bind(params);
        }
        const results = [];
        while (stmt.step()) {
          results.push(stmt.getAsObject());
        }
        stmt.free();
        return results;
      } catch (e) {
        console.error('SQL Error:', e);
        return [];
      }
    },
    get: (...params) => {
      try {
        const stmt = db.prepare(sql);
        if (params.length > 0) {
          stmt.bind(params);
        }
        let result = null;
        if (stmt.step()) {
          result = stmt.getAsObject();
        }
        stmt.free();
        return result;
      } catch (e) {
        console.error('SQL Error:', e);
        return null;
      }
    },
    run: (...params) => {
      try {
        db.run(sql, params);
        saveDatabase(); // 每次写入后保存
        return { changes: db.getRowsModified() };
      } catch (e) {
        console.error('SQL Error:', e);
        return { changes: 0 };
      }
    }
  };
}

// 获取数据库实例
function getDatabase() {
  return db;
}

// 关闭数据库
function closeDatabase() {
  if (db) {
    saveDatabase();
    db.close();
    db = null;
  }
}

module.exports = {
  initDatabase,
  getDatabase,
  prepare,
  saveDatabase,
  closeDatabase
};
