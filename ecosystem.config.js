/**
 * MuYunAPI PM2 配置文件
 *
 * 用法：
 *   pm2 start ecosystem.config.js        # 启动所有服务
 *   pm2 restart muyunapi                 # 重启所有
 *   pm2 list                             # 查看状态
 *
 * 注意：首次使用前需配置 NODE_PATH 为项目绝对路径
 */

const path = require('path');

// 自动获取项目根目录（脚本所在目录）
const PROJECT_ROOT = path.resolve(__dirname);

module.exports = {
  apps: [
    // ─────────────────────────────────────────────────────────
    // 更新服务器 (端口 3001)
    // ─────────────────────────────────────────────────────────
    {
      name: 'muyu-update',
      script: './update-server/index.js',
      cwd: PROJECT_ROOT,
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      kill_timeout: 5000,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      // 日志配置
      log_file: './logs/update.log',
      error_file: './logs/update-error.log',
      out_file: './logs/update-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      // 崩溃自动重启（指数退避）
      exp_backoff_restart_delay: 1000
    },

    // ─────────────────────────────────────────────────────────
    // 主服务器 (端口 3000)
    // ─────────────────────────────────────────────────────────
    {
      name: 'muyu-server',
      script: './server/index.js',
      cwd: PROJECT_ROOT,
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      kill_timeout: 5000,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      // 日志配置
      log_file: './logs/server.log',
      error_file: './logs/server-error.log',
      out_file: './logs/server-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      // 崩溃自动重启（指数退避）
      exp_backoff_restart_delay: 1000,
      // 依赖更新服务器先启动
      depends: ['muyu-update']
    }
  ]
};
