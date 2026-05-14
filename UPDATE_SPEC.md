# MuYunAPI 更新包规范

## 1. 更新包格式规范

### 1.1 文件命名
```
muyunapi-v{版本号}-{平台}-{架构}.zip

示例:
- muyunapi-v1.2.3-win-x64.zip      # Windows 64位
- muyunapi-v1.2.3-linux-x64.zip    # Linux 64位
- muyunapi-v1.2.3-macos-arm64.zip  # macOS ARM64
```

### 1.2 包内结构
```
muyunapi-v1.2.3-win-x64.zip
├── update.json          # 更新信息文件
├── server/              # 后端代码
│   ├── index.js
│   ├── package.json
│   └── ...
├── client/dist/         # 前端构建文件
│   ├── index.html
│   └── assets/
├── scripts/             # 更新脚本
│   ├── install.js       # 安装脚本
│   └── migrate.js       # 数据迁移脚本
└── files/               # 其他文件
    └── ...
```

### 1.3 update.json 规范

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `version` | string | ✅ | 版本号，如 `1.2.3` |
| `versionCode` | number | ✅ | 数字版本，格式：主×10000+次×100+修订 |
| `channel` | string | ✅ | 渠道：`stable` / `beta` / `alpha` |
| `platform` | string | ✅ | 平台：`win` / `linux` / `macos` |
| `arch` | string | ✅ | 架构：`x64` / `arm64` |
| `releaseDate` | string | ✅ | ISO 8601 日期 |
| `size` | number | ✅ | 更新包大小（字节） |
| `checksum.md5` | string | ✅ | MD5 校验和 |
| `checksum.sha256` | string | ✅ | SHA256 校验和 |
| `minVersion` | string | ❌ | 最低支持版本 |
| `forceUpdate` | boolean | ❌ | 强制更新（默认 false） |
| `includesUpdateServer` | boolean | ❌ | 是否同时更新更新服务器（默认 false） |
| `changelog` | object | ✅ | 更新日志 |
| `breakingChanges` | boolean | ❌ | 是否有破坏性变更 |
| `migration` | object | ❌ | 数据迁移配置 |
| `files` | array | ❌ | 文件操作列表 |
```json
{
  "version": "1.2.3",
  "versionCode": 123,
  "channel": "stable",
  "platform": "win",
  "arch": "x64",
  "releaseDate": "2026-05-15T10:00:00Z",
  "size": 15234567,
  "checksum": {
    "md5": "d41d8cd98f00b204e9800998ecf8427e",
    "sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
  },
  "minVersion": "1.0.0",
  "forceUpdate": false,
  "includesUpdateServer": true,
  "changelog": {
    "zh": [
      "✨ 新增功能A",
      "🐛 修复Bug B",
      "🎨 优化界面C"
    ],
    "en": [
      "✨ Add feature A",
      "🐛 Fix bug B",
      "🎨 Optimize UI C"
    ]
  },
  "breakingChanges": false,
  "migration": {
    "required": true,
    "scripts": ["migrate-v1.2.3.js"]
  },
  "files": [
    {
      "path": "server/index.js",
      "action": "replace",
      "checksum": "xxx"
    },
    {
      "path": "client/dist/",
      "action": "replace"
    },
    {
      "path": "server/data/",
      "action": "keep"
    }
  ]
}
```

## 2. 更新服务器API规范

### 2.1 检查更新
```
GET /api/updates/check

请求参数:
{
  "version": "1.2.2",      // 当前版本
  "platform": "win",       // 平台: win/linux/macos
  "arch": "x64",           // 架构: x64/arm64
  "channel": "stable"      // 渠道: stable/beta/alpha
}

响应:
{
  "code": 200,
  "data": {
    "hasUpdate": true,
    "forceUpdate": false,
    "version": "1.2.3",
    "versionCode": 123,
    "downloadUrl": "https://update.example.com/packages/muyunapi-v1.2.3-win-x64.zip",
    "size": 15234567,
    "checksum": {
      "md5": "xxx",
      "sha256": "xxx"
    },
    "releaseDate": "2026-05-15T10:00:00Z",
    "changelog": {
      "zh": ["..."],
      "en": ["..."]
    },
    "breakingChanges": false,
    "migrationRequired": true
  }
}
```

### 2.2 下载更新包
```
GET /api/updates/download/:version/:platform/:arch

响应: 二进制文件流 (application/octet-stream)
```

### 2.3 获取更新历史
```
GET /api/updates/history?limit=10&offset=0

响应:
{
  "code": 200,
  "data": {
    "total": 50,
    "list": [
      {
        "version": "1.2.3",
        "versionCode": 123,
        "releaseDate": "...",
        "changelog": {...}
      }
    ]
  }
}
```

### 2.4 上传更新包（管理员）
```
POST /api/updates/upload
Content-Type: multipart/form-data

请求体:
- file: 更新包文件 (.zip)
- updateJson: update.json 内容

响应:
{
  "code": 200,
  "data": {
    "version": "1.2.3",
    "downloadUrl": "..."
  }
}
```

## 3. 客户端更新流程

### 3.1 检查更新
```javascript
// 启动时检查
async function checkUpdate() {
  const current = getCurrentVersion();
  const info = await fetch('/api/updates/check', {
    method: 'POST',
    body: JSON.stringify({
      version: current,
      platform: getPlatform(),
      arch: getArch()
    })
  });
  
  if (info.hasUpdate) {
    showUpdateDialog(info);
  }
}
```

### 3.2 下载更新
```javascript
// 断点续传下载
async function downloadUpdate(url, onProgress) {
  const response = await fetch(url);
  const reader = response.body.getReader();
  
  while(true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    // 保存到临时文件
    await appendToFile(tempPath, value);
    onProgress(downloaded, total);
  }
  
  // 校验文件
  const checksum = await calculateChecksum(tempPath);
  if (checksum !== expected) throw new Error('校验失败');
  
  return tempPath;
}
```

### 3.3 安装更新
```javascript
// 安装流程
async function installUpdate(packagePath) {
  // 1. 备份当前版本
  await backupCurrent();
  
  // 2. 解压更新包
  const extractPath = await extractZip(packagePath);
  
  // 3. 读取更新信息
  const updateInfo = JSON.parse(
    await readFile(path.join(extractPath, 'update.json'))
  );
  
  // 4. 执行数据迁移
  if (updateInfo.migration?.required) {
    for (const script of updateInfo.migration.scripts) {
      await runMigrationScript(path.join(extractPath, 'scripts', script));
    }
  }
  
  // 5. 替换文件
  for (const file of updateInfo.files) {
    await applyFileChange(extractPath, file);
  }
  
  // 6. 安装依赖
  await installDependencies();
  
  // 7. 构建前端
  await buildFrontend();
  
  // 8. 重启服务
  await restartService();
}
```

## 4. 更新包制作工具

### 4.1 打包脚本
```javascript
// scripts/build-update.js
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const crypto = require('crypto');

async function buildUpdate(version, platform, arch) {
  const packageName = `muyunapi-v${version}-${platform}-${arch}.zip`;
  const outputPath = path.join('dist', packageName);
  
  // 创建输出目录
  fs.mkdirSync('dist', { recursive: true });
  
  // 创建压缩包
  const output = fs.createWriteStream(outputPath);
  const archive = archiver('zip', { zlib: { level: 9 } });
  
  archive.pipe(output);
  
  // 添加文件
  archive.directory('server/', 'server');
  archive.directory('client/dist/', 'client/dist');
  archive.directory('scripts/', 'scripts');
  
  // 生成 update.json
  const updateInfo = {
    version,
    platform,
    arch,
    size: 0,
    checksum: {},
    // ...
  };
  
  archive.append(JSON.stringify(updateInfo, null, 2), { name: 'update.json' });
  
  await archive.finalize();
  
  // 计算校验和
  const buffer = fs.readFileSync(outputPath);
  updateInfo.size = buffer.length;
  updateInfo.checksum.md5 = crypto.createHash('md5').update(buffer).digest('hex');
  updateInfo.checksum.sha256 = crypto.createHash('sha256').update(buffer).digest('hex');
  
  // 重写 update.json
  // ...
  
  return outputPath;
}
```

### 4.2 使用方式
```bash
# 打包更新
npm run build:update -- --version=1.2.3 --platform=win --arch=x64

# 上传到更新服务器
npm run upload:update -- --file=dist/muyunapi-v1.2.3-win-x64.zip --server=https://update.example.com
```

## 5. 版本号规范

### 5.1 语义化版本
```
主版本号.次版本号.修订号
1.2.3

- 主版本号: 破坏性变更
- 次版本号: 新增功能（向后兼容）
- 修订号: Bug修复（向后兼容）
```

### 5.2 版本代码
```javascript
// versionCode = 主 * 10000 + 次 * 100 + 修订
// 1.2.3 => 10203
function versionToCode(version) {
  const [major, minor, patch] = version.split('.').map(Number);
  return major * 10000 + minor * 100 + patch;
}
```

### 5.3 更新渠道
- `stable` - 稳定版（推荐）
- `beta` - 测试版
- `alpha` - 内测版
- `dev` - 开发版

## 6. 安全规范

### 6.1 文件校验
- 必须提供 MD5 和 SHA256 校验和
- 客户端下载后必须校验

### 6.2 签名验证（可选）
```
# 使用 GPG 签名
 gpg --detach-sign --armor muyunapi-v1.2.3-win-x64.zip
 
# 验证签名
 gpg --verify muyunapi-v1.2.3-win-x64.zip.asc
```

### 6.3 HTTPS 传输
- 所有下载必须使用 HTTPS
- 证书必须有效

## 7. 回滚机制

### 7.1 自动备份
```javascript
async function backupCurrent() {
  const backupDir = `backups/${Date.now()}`;
  
  // 备份代码
  await copyDir('.', backupDir);
  
  // 备份数据库
  await backupDatabase(path.join(backupDir, 'database.db'));
  
  return backupDir;
}
```

### 7.2 回滚操作
```javascript
async function rollback(backupDir) {
  // 停止服务
  await stopService();
  
  // 恢复文件
  await restoreFromBackup(backupDir);
  
  // 恢复数据库
  await restoreDatabase(path.join(backupDir, 'database.db'));
  
  // 重启服务
  await startService();
}
```

## 8. 目录结构

```
MuYunAPI/
├── server/                          # 主服务（端口 3000）
│   ├── index.js                    # 服务入口
│   ├── .env                        # 环境变量
│   ├── package.json
│   ├── db/                         # 数据库初始化
│   ├── routes/                     # 路由
│   ├── libraries/                  # 内置库脚本
│   │   └── scripts/               # 动态脚本目录
│   ├── data/                       # SQLite 数据库
│   └── uploads/                    # 上传文件
│
├── update-server/                  # 更新服务器（端口 3001）
│   ├── index.js                    # 服务入口
│   ├── .env                        # 环境变量（JWT_SECRET、UPDATE_SECRET）
│   ├── package.json
│   ├── config/
│   │   └── update.json            # 更新服务器配置
│   ├── packages/                  # 更新包存储目录
│   │   ├── muyunapi-v1.2.2-linux-x64.zip
│   │   └── ...
│   ├── uploads/                   # 临时上传目录
│   ├── routes/
│   │   └── updates.js             # 更新 API 路由
│   └── utils/
│       ├── packager.js            # 打包工具
│       └── verifier.js            # 校验工具
│
├── client/                         # 前端（Vue 3）
│   ├── src/
│   └── dist/                      # 前端构建产物（前端构建后生成）
│
├── scripts/                        # 更新脚本
│   ├── build-update.js            # 打包脚本
│   ├── install.js                 # 安装脚本
│   └── migrate.js                 # 数据迁移脚本
│
├── start.sh                        # Linux 启动脚本（PM2）
├── start.js                        # Windows 启动脚本
├── update_start.sh                 # Linux 更新服务器启动脚本
├── update_start.js                 # Windows 更新服务器启动脚本
└── .env.example                    # 环境变量模板
```

## 9. 热重载机制

### 9.1 退出码信号

| 退出码 | 含义 | 触发方 |
|--------|------|--------|
| `42` | 仅重启自身 | 主服务 / 更新服务器 |
| `43` | 重启自身 + 通知更新服务器 | 主服务（仅当 `includesUpdateServer=true` 时） |

### 9.2 更新流程

```
1. 主服务通过 /api/updates/apply 应用更新包
2. 解压更新包，读取 update.json
3. 若 includesUpdateServer === true：
   a. 先通知更新服务器 /api/admin/restart（双重鉴权）
   b. 更新服务器收到信号，exit(42) 热重载
4. 主服务执行文件替换
5. 主服务 exit(43) 退出
6. PM2 监听退出码，自动重启两个服务
```

### 9.3 双重鉴权

`/api/admin/restart` 接口需要同时满足：

1. **共享密钥验证**：请求体中 `{ secret: UPDATE_SECRET }`
2. **JWT Token 验证**：请求头 `Authorization: Bearer <token>`

`UPDATE_SECRET` 和 `JWT_SECRET` 必须在主服务和更新服务器的 `.env` 中保持一致。

## 10. 更新包构建

### 10.1 打包命令

```bash
# 普通更新（仅主程序）
npm run build:update -- --version=1.2.3 --platform=linux --arch=x64

# 包含更新服务器的完整更新
npm run build:update -- --version=1.2.3 --platform=linux --arch=x64 --include-update-server
```

### 10.2 打包产物

| 参数 | 包内容 |
|------|--------|
| 无 `--include-update-server` | `server/` + `client/dist/` + `scripts/` + `update.json` |
| 有 `--include-update-server` | 以上全部 + `update-server/` 目录 |

### 10.3 上传到更新服务器

1. 将 `dist/muyunapi-v{version}-{platform}-{arch}.zip` 上传到服务器的 `update-server/packages/` 目录
2. 或通过管理后台上传
