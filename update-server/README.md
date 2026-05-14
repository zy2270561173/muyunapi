# MuYunAPI 更新服务器

自建更新服务器，用于管理和分发 MuYunAPI 的更新包。

## 功能特性

- 📦 更新包上传和管理
- 🔍 版本检查和自动更新
- 🔐 JWT 身份验证
- 📊 下载统计和日志
- 🌐 多平台支持 (win/linux/macos, x64/arm64)
- 🔄 多通道支持 (stable/beta/alpha/dev)
- ✅ MD5/SHA256 校验和验证

## 快速开始

### 1. 安装依赖

```bash
cd update-server
npm install
```

### 2. 初始化数据库

```bash
npm run init
```

### 3. 启动服务器

```bash
# 开发模式
npm run dev

# 生产模式
npm start
```

服务器默认运行在 `http://localhost:3001`

## API 接口

### 检查更新

```http
POST /api/packages/check
Content-Type: application/json

{
  "version": "1.2.0",
  "platform": "win",
  "arch": "x64",
  "channel": "stable"
}
```

响应：

```json
{
  "code": 200,
  "data": {
    "hasUpdate": true,
    "forceUpdate": false,
    "version": "1.3.0",
    "versionCode": 10300,
    "downloadUrl": "/api/packages/download/1",
    "size": 10485760,
    "checksum": {
      "md5": "abc123...",
      "sha256": "xyz789..."
    },
    "releaseDate": "2026-05-14",
    "changelog": {
      "zh": ["✨ 新功能", "🐛 修复问题"],
      "en": ["✨ New feature", "🐛 Bug fix"]
    }
  }
}
```

### 下载更新包

```http
GET /api/packages/download/:id?version=1.2.0
```

### 获取更新历史

```http
GET /api/packages/history?platform=win&arch=x64&channel=stable&limit=10
```

### 管理员登录

```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "your-password"
}
```

### 上传更新包（需认证）

```http
POST /api/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data

file: <zip-file>
version: 1.3.0
channel: stable
platform: win
arch: x64
minVersion: 1.0.0
forceUpdate: false
changelogZh: ["✨ 新功能"]
changelogEn: ["✨ New feature"]
```

## 更新包格式

更新包必须是 ZIP 文件，包含以下结构：

```
update-v1.3.0-win-x64.zip
├── update.json          # 更新配置
├── server/              # 服务端文件
├── client/dist/         # 前端构建文件
└── scripts/             # 更新脚本（可选）
```

### update.json 示例

```json
{
  "version": "1.3.0",
  "versionCode": 10300,
  "platform": "win",
  "arch": "x64",
  "releaseDate": "2026-05-14",
  "files": [
    { "src": "server/app.js", "dest": "server/app.js" },
    { "src": "client/dist/index.html", "dest": "client/dist/index.html" }
  ],
  "scripts": {
    "preInstall": "scripts/pre-install.js",
    "postInstall": "scripts/post-install.js"
  }
}
```

## 打包和上传工具

### 构建更新包

```bash
node scripts/build-update.js --version=1.3.0 --platform=win --arch=x64
```

参数：

- `--version`: 版本号（必需）
- `--platform`: 平台 (win/linux/macos)
- `--arch`: 架构 (x64/arm64)
- `--channel`: 通道 (stable/beta/alpha/dev)
- `--output`: 输出目录

### 上传更新包

```bash
node scripts/upload-update.js \
  --file=dist/muyunapi-v1.3.0-win-x64.zip \
  --server=https://your-update-server.com \
  --username=admin \
  --password=your-password
```

## 环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `PORT` | 服务器端口 | 3001 |
| `JWT_SECRET` | JWT 密钥 | muyun-update-secret |
| `ADMIN_USERNAME` | 管理员用户名 | admin |
| `ADMIN_PASSWORD` | 管理员密码 | admin123 |

## 客户端配置

在 MuYunAPI 管理后台的"系统更新"页面配置：

1. 更新服务器地址：`https://your-update-server.com`
2. 更新通道：stable/beta/alpha/dev
3. 自动检查：开启/关闭
4. 自动下载：开启/关闭

## 数据库结构

### packages 表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER | 主键 |
| version | TEXT | 版本号 |
| version_code | INTEGER | 版本代码 |
| channel | TEXT | 更新通道 |
| platform | TEXT | 平台 |
| arch | TEXT | 架构 |
| filename | TEXT | 文件名 |
| size | INTEGER | 文件大小 |
| checksum_md5 | TEXT | MD5 校验和 |
| checksum_sha256 | TEXT | SHA256 校验和 |
| min_version | TEXT | 最低版本要求 |
| force_update | INTEGER | 是否强制更新 |
| breaking_changes | INTEGER | 是否有破坏性变更 |
| changelog_zh | TEXT | 中文更新日志 |
| changelog_en | TEXT | 英文更新日志 |
| is_active | INTEGER | 是否启用 |
| download_count | INTEGER | 下载次数 |
| release_date | TEXT | 发布日期 |

## 安全建议

1. 使用 HTTPS 部署更新服务器
2. 修改默认管理员密码
3. 设置强 JWT 密钥
4. 定期备份数据库
5. 限制上传文件大小和类型

## 许可证

MIT
