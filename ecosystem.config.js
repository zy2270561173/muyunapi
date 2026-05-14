module.exports = {
  apps: [
    // 1. MuYunAPI 更新服务器
    {
      name: 'MuYunAPI-Update',
      script: './update-server/index.js', // 保持相对路径即可
      cwd: '/disk/muyunapi',       // 👈 加上这一行！换成你真实的项目绝对路径
      instances: 1,
      exec_mode: 'fork',
      stop_exit_codes: [],  // 热重载通过 pm2 restart 实现，不阻止自动重启
      kill_timeout: 10000,
      wait_ready: true,
      autorestart: true,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      }
    },
    // 2. MuYunAPI 主服务器
    {
      name: 'MuYunAPI-Main',
      script: './server/index.js',
      cwd: '/disk/muyunapi',       // 👈 同样加上这一行！
      instances: 1,
      exec_mode: 'fork',
      kill_timeout: 10000,
      wait_ready: true,
      autorestart: true,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    }
  ]
};