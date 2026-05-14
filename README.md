# MuYunAPI - API聚合分享平台

> 免费开源的全栈API聚合管理平台，支持内置接口、外部代理、多版本管理、主题切换、积分系统等

## 📑 目录

- [技术栈](#-技术栈)
- [功能特性](#-功能特性)
- [项目结构](#-项目结构)
- [快速开始](#-快速开始)
- [环境变量](#-环境变量)
- [系统配置](#-系统配置)
- [数据库设计](#-数据库设计)
- [API接口文档](#-api接口文档)
- [内置库脚本开发](#-内置库脚本开发)
- [主题系统](#-主题系统)
- [更新日志](#-更新日志)

---

## 🛠 技术栈

### 全栈技术

| 层级 | 技术 | 版本 | 说明 |
|------|------|------|------|
| **前端框架** | Vue 3 | ^3.4.0 | Composition API + `<script setup>` |
| **UI组件库** | Element Plus | ^2.7.0 | 企业级Vue3组件库 |
| **状态管理** | Pinia | ^2.1.0 | Vue官方状态管理 |
| **路由** | Vue Router | ^4.3.0 | 前端路由 |
| **构建工具** | Vite | ^5.2.0 | 前端构建 |
| **CSS预处理** | Sass | ^1.75.0 | 样式预处理 |
| **HTTP客户端** | Axios | ^1.16.0 | 前后端HTTP请求 |
| **后端框架** | Express | ^5.2.1 | Node.js Web框架 |
| **数据库** | better-sqlite3 | ^12.10.0 | SQLite3（零配置） |
| **认证** | jsonwebtoken | ^9.0.3 | JWT Token认证 |
| **加密** | bcryptjs | ^3.0.3 | 密码哈希加密 |
| **邮件** | nodemailer | ^8.0.7 | SMTP邮件发送 |
| **限流** | express-rate-limit | ^8.5.1 | API速率限制 |
| **进程管理** | PM2 | latest | 生产环境守护进程、热重载、日志管理 |
| **文件上传** | multer | ^2.1.1 | 文件上传处理 |
| **工具库** | nanoid / uuid | latest | ID生成 |

### 运行环境

- **Node.js** >= 18.0
- **数据库**: SQLite（无需额外安装）
- **默认端口**: 后端 3000 / 前端开发 5173

---

## ✨ 功能特性

### 🔐 用户系统
- 注册/登录（用户名+邮箱+密码）
- 邮箱验证码（可配置是否必须验证）
- JWT Token 认证（7天有效期）
- API 密钥自动生成（`mk_` / `ms_` 前缀）
- 自定义密钥管理（每用户最多10个，`uk_` / `us_` 前缀）
- 个人信息修改、头像上传
- 密码重置（邮箱验证）
- API 收藏功能

### 📡 API 管理
- API 列表（分页、分类筛选、关键词搜索）
- API 详情（Markdown文档、参数说明、响应示例）
- 在线测试调用
- 自动速度检测（Ping）
- 多语言调用示例生成（curl / JS / Python / PHP / Node.js）
- 支持 `local`（内置）和 `external`（外部代理）两种来源
- **API 版本管理**（多版本共存、版本切换、从当前版本复制）

### 🛡 管理后台
- **控制台**: 用户/API/调用统计、7天趋势图、Top排行
- **API管理**: CRUD、软删除/永久删除、积分消费设置
- **分类管理**: CRUD、排序
- **用户管理**: CRUD、启用/禁用、角色管理、积分调整
- **公告管理**: 顶部滚动栏 + 弹窗公告
- **调用日志**: 分页查看、按API筛选
- **系统设置**: 站点信息、SMTP配置、注册/验证开关、限流配置、页脚运行时间显示
- **SMTP测试**: 发送测试邮件验证配置
- **关于我管理**: 页面开关、个人信息、教育背景、技能标签、GitHub同步配置

### 📦 内置库系统
- 系统预置 18+ 个实用接口
- **动态脚本加载器**: 自动加载 `scripts/` 目录下的 `.js` 脚本
- **Tampermonkey 风格元数据**: `// ==MuYunAPI==` 注释块定义接口
- 脚本上传/读取/删除/批量导入
- 开发模式热重载（文件变化自动重新加载）
- 支持 `require('axios')` / `require('uuid')` 等 npm 包

### 🎨 主题系统
- 2 个内置主题（暗夜默认 + 薄荷清风）
- 自定义主题创建/编辑/删除
- CSS 变量驱动，动态切换
- 主题导入/导出（JSON）
- 主题共享（公开/私有）
- 30+ CSS 变量覆盖（含代码块、遮罩、按钮等）

### 💰 积分系统
- 用户积分余额
- API 调用积分消费
- 积分流水记录（充值/消费/退款/管理员调整）
- 积分不足自动拦截（402 错误码）

---

## 📁 项目结构

```
MuYunapi/
├── server/                          # 后端 (Express.js)
│   ├── index.js                     # 服务入口
│   ├── package.json                 # 后端依赖
│   ├── db/
│   │   └── init.js                  # 数据库初始化（17张表）
│   ├── middleware/
│   │   └── auth.js                  # JWT认证中间件
│   ├── routes/
│   │   ├── auth.js                  # 认证路由
│   │   ├── user.js                  # 用户路由
│   │   ├── api.js                   # API接口路由
│   │   ├── admin.js                 # 管理后台路由
│   │   ├── proxy.js                 # API代理转发
│   │   ├── themes.js                # 主题路由
│   │   ├── friendships.js           # 友链路由
│   │   ├── libraries.js             # 内置库管理
│   │   ├── api-versions.js          # API版本管理
│   │   └── about.js                 # 关于我页面管理
│   ├── libraries/
│   │   ├── builtIn.js               # 内置接口定义（18个）
│   │   ├── loader.js                # 动态脚本加载器
│   │   └── scripts/                 # 用户脚本目录
│   │       ├── demo-builtin.js      # UUID/随机整数/时间戳
│   │       ├── random-image.js      # 随机图片
│   │       ├── qq-info.js           # QQ信息查询
│   │       ├── qr_tools.js          # 二维码生成
│   │       └── qweather-now.js      # 和风天气查询
│   ├── utils/
│   │   └── mailer.js                # 邮件发送
│   └── data/
│       └── muyunapi.db              # SQLite数据库
│
├── client/                          # 前端 (Vue 3)
│   ├── package.json                 # 前端依赖
│   ├── vite.config.js               # Vite配置
│   └── src/
│       ├── main.js                  # 应用入口
│       ├── App.vue                  # 根组件
│       ├── api/
│       │   ├── http.js              # Axios封装
│       │   └── index.js             # API接口定义
│       ├── router/index.js          # 路由配置
│       ├── stores/
│       │   ├── user.js              # 用户状态
│       │   └── theme.js             # 主题状态
│       ├── themes/index.js          # 内置主题定义
│       ├── assets/main.scss         # 全局样式
│       ├── components/
│       │   ├── ApiCard.vue          # API卡片
│       │   └── MarkdownEditor.vue   # Markdown编辑器
│       └── views/
│           ├── Layout.vue           # 前台布局
│           ├── Home.vue             # 首页
│           ├── Explore.vue          # 浏览接口
│           ├── ApiDetail.vue        # 接口详情
│           ├── About.vue            # 关于我页面
│           ├── Login.vue            # 登录
│           ├── Register.vue         # 注册
│           ├── user/                # 用户中心
│           └── admin/               # 管理后台（11个页面）
│
├── script/                          # 待上传的脚本文件
│
└── .vscode/                         # VSCode开发配置
    ├── settings.json                # 编辑器设置
    ├── launch.json                  # 调试配置
    ├── tasks.json                   # 任务配置
    └── extensions.json              # 推荐扩展
```

---

## 🚀 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/zy2270561173/muyunapi.git
cd MuYunapi
```

### 2. 安装依赖

```bash
# 安装后端依赖
cd server && npm install

# 安装前端依赖
cd ../client && npm install
```

### 3. 启动开发服务

```bash
# 启动后端（端口 3000）
cd server && npm start

# 启动前端开发服务器（端口 5173）
cd client && npm run dev
```

### 4. 访问

| 地址 | 说明 |
|------|------|
| http://localhost:5173 | 前端页面 |
| http://localhost:3000 | 后端API |
| http://localhost:3000/admin | 管理后台 |

### 5. 默认管理员

| 字段 | 值 |
|------|------|
| 用户名 | `admin` |
| 密码 | `admin123456` |
| 邮箱 | `admin@muyunapi.com` |

### 6. 生产部署（Windows）

```bash
# 启动主服务和更新服务器（自动守护）
node start.js

# 或单独启动更新服务器
node update_start.js
```

> [!TIP]
> `start.js` 会自动检测 PM2 环境。有 PM2 时委托 PM2 管理；无 PM2 时自身作为守护进程启动。

---

<details>
<summary>🖥 服务器部署指南（点击展开）</summary>

## 系统架构

```
┌─────────────────────────────────────────────────────────────┐
│                        用户访问                              │
│                    https://api.example.com                   │
└──────────────────────┬──────────────────────────────────────┘
                       │
         ┌─────────────┴─────────────┐
         │                           │
    ┌────▼────┐               ┌──────▼──────┐
    │ 主服务  │◄──HTTPS──────│   Nginx     │
    │  :3000  │               │   443端口    │
    └────┬────┘               └─────────────┘
         │ HTTP (内网)
    ┌────▼────┐
    │更新服务器│
    │  :3001  │
    └─────────┘
```

| 组件 | 端口 | 说明 | PM2进程名 |
|------|------|------|-----------|
| **主服务** | 3000 | 前台+后台+API代理 | `muyu-server` |
| **更新服务器** | 3001 | 更新包管理、版本检测 | `muyu-update` |

### 热重载机制

| 退出码 | 含义 | 触发场景 |
|--------|------|----------|
| `42` | 仅重启自身 | 主服务普通更新 |
| `43` | 重启自身 + 通知更新服务器 | 更新包包含 `includesUpdateServer=true` |

PM2 监听子进程退出码，自动重启进程，实现无缝热重载。

---

### Linux 部署（推荐）

#### 前置要求

```bash
# 安装 Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 安装 PM2（热重载核心依赖）
sudo npm install -g pm2

# 配置开机自启
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $USER
```

#### 部署步骤

**1. 上传项目**

```bash
# 在服务器创建目录
mkdir -p /var/www/muyunapi && cd /var/www/muyunapi

# 通过 SCP / SFTP / Git 上传项目文件
# 注意：不要上传 node_modules、dist/ 等目录
```

**2. 配置环境变量**

```bash
# 主服务
cp server/.env.example server/.env
nano server/.env   # 填入实际值
```

`server/.env` 必填项：

```bash
# JWT 密钥（必须修改，建议64位随机字符串）
JWT_SECRET=你的64位随机密钥

# 热重载共享密钥（主服务通知更新服务器时使用）
UPDATE_SECRET=你的32位随机密钥

# 管理员账号
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=YourSecurePassword123

# 内部更新服务器地址（若更新服务器不在本机，修改为实际IP）
INTERNAL_UPDATE_SERVER_URL=http://localhost:3001
```

```bash
# 更新服务器
cp update-server/.env.example update-server/.env
nano update-server/.env   # 填入实际值（JWT_SECRET 和 UPDATE_SECRET 必须与主服务一致）
```

**3. 启动服务**

```bash
# 赋予执行权限
chmod +x start.sh update_start.sh

# 一键启动（自动检查依赖 + 构建前端 + 启动服务）
./start.sh

# 或跳过构建快速启动
./start.sh --no-build
```

**4. 配置 Nginx 反向代理**

```nginx
# /etc/nginx/sites-available/muyunapi
server {
    listen 443 ssl http2;
    server_name api.example.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # 主服务
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
# 重载 Nginx
sudo ln -s /etc/nginx/sites-available/muyunapi /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

#### PM2 常用命令

##### 独立启动（不通过 start.sh）

```bash
# 全局安装 PM2
sudo npm install -g pm2

# 启动主服务（端口 3000）
pm2 start server/index.js --name "muyu-server" --env production

# 启动更新服务器（端口 3001）
pm2 start update-server/index.js --name "muyu-update" --env production

# 查看进程状态
pm2 list

# 查看日志
pm2 logs muyu-server
pm2 logs muyu-update

# 重启服务
pm2 restart muyu-server
pm2 restart muyu-update
pm2 restart all          # 重启所有服务

# 停止服务
pm2 stop muyu-server
pm2 stop muyu-update
pm2 stop all             # 停止所有服务

# 删除进程
pm2 delete muyu-server
pm2 delete muyu-update
pm2 delete all           # 删除所有进程

# 保存进程列表（重启后自动恢复）
pm2 save

# 配置开机自启
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $USER
```

##### 使用 ecosystem.config.js 启动

项目根目录的 `ecosystem.config.js` 已配置好双进程：

```bash
# 一键启动所有服务
pm2 start ecosystem.config.js

# 查看状态
pm2 list
# 输出示例：
# ┌────┬────────────────┬──────────┬───────┼──────────┼──────────┤
# │ id │ name           │ mode     │ status│ ↺       │ uptime   │
# ├────┼────────────────┼──────────┼───────┼──────────┼──────────┤
# │ 0  │ muyu-server    │ fork     │ online│ 0       │ 2h       │
# │ 1  │ muyu-update    │ fork     │ online│ 0       │ 2h       │
# └────┴────────────────┴──────────┴───────┴──────────┴──────────┘
```

---

### Windows 部署

#### 部署步骤

**1. 配置环境变量**

编辑 `server/.env` 和 `update-server/.env`，填入实际值。

**2. 启动服务**

```batch
:: 双击或命令行运行
node start.js

:: 或单独启动更新服务器
node update_start.js
```

**3. 配置 Nginx（可选）**

与 Linux 相同，配置反向代理到 `http://127.0.0.1:3000`。

---

### 更新部署流程

#### 本地打包更新包

```bash
# 普通更新（仅主程序）
npm run build:update -- --version=1.2.3 --platform=linux --arch=x64

# 包含更新服务器的完整更新
npm run build:update -- --version=1.2.3 --platform=linux --arch=x64 --include-update-server
```

> [!NOTE]
> `--include-update-server` 参数会将 `update-server/` 整个目录打入 ZIP，更新包解压后会同时更新两个服务。

#### 上传到更新服务器

1. 将 `dist/muyunapi-v1.2.3-linux-x64.zip` 上传到更新服务器的 `packages/` 目录
2. 或通过更新服务器管理后台上传

#### 自动热重载

更新包下载并应用后：
- 主服务自动检测 `includesUpdateServer` 字段
- 若为 `true`，通过 HTTP POST 通知更新服务器重启
- 两边同时热重载，无需手动操作

---

</details>

## 🔧 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `PORT` | 服务端口 | `3000` |
| `JWT_SECRET` | JWT密钥（生产环境务必修改） | `muyunapi-secret-key-2026-change-this` |
| `NODE_ENV` | 运行环境（非production启用脚本热重载） | - |
| `QWEATHER_API_HOST` | 和风天气API域名 | - |
| `QWEATHER_API_KEY` | 和风天气API Key | - |

---

## ⚙️ 系统配置

在管理后台 **系统设置** 页面配置，存储在数据库 `configs` 表：

| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| 站点名称 | MuYunAPI | 前台显示的站点名称 |
| 站点描述 | 免费开放的API聚合分享平台 | SEO描述 |
| 站点关键词 | API,接口,开放平台 | SEO关键词 |
| SMTP服务器 | smtp.qq.com | 邮件服务器地址 |
| SMTP端口 | 465 | 邮件服务器端口 |
| SMTP用户名 | - | 发件邮箱 |
| SMTP密码 | - | 邮箱授权码 |
| 允许注册 | 开启 | 是否开放用户注册 |
| 邮箱验证 | 开启 | 注册时是否必须验证邮箱 |
| API限流 | 100次/分钟 | 全局API调用频率限制 |
| 免费用户日限额 | 500次/天 | 免费用户每日调用上限 |
| 友链功能 | 开启 | 是否显示友情链接 |

---

## 🗄 数据库设计

SQLite 数据库，共 **17 张表**：

| 表名 | 说明 |
|------|------|
| `users` | 用户表（uid、用户名、邮箱、密码、角色、积分等） |
| `email_codes` | 邮箱验证码表 |
| `categories` | API分类表 |
| `apis` | API接口表（含版本管理、积分消费） |
| `api_versions` | API版本管理表 |
| `api_speed_logs` | API速度测试记录 |
| `call_logs` | API调用日志 |
| `user_keys` | 用户自定义密钥表 |
| `configs` | 系统配置表（KV结构） |
| `标签` | 标签表 |
| `favorites` | 收藏表 |
| `announcements` | 公告表 |
| `friendships` | 友链表 |
| `themes` | 主题表 |
| `credit_transactions` | 积分流水表 |
| `about_page` | 关于我页面配置表 |
| `github_sync_logs` | GitHub同步备份记录表 |

---

## 📡 API接口文档

### 认证接口 `/api/auth`

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | `/api/auth/send-code` | 发送邮箱验证码 | 否 |
| POST | `/api/auth/register` | 用户注册 | 否 |
| POST | `/api/auth/login` | 用户登录 | 否 |
| POST | `/api/auth/reset-password` | 重置密码 | 否 |

### 用户接口 `/api/user`

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | `/api/user/profile` | 获取个人信息 | 是 |
| PUT | `/api/user/profile` | 更新个人信息 | 是 |
| POST | `/api/user/avatar` | 上传头像 | 是 |
| PUT | `/api/user/password` | 修改密码 | 是 |
| POST | `/api/user/regenerate-key` | 重新生成API密钥 | 是 |
| GET | `/api/user/keys` | 获取自定义Key列表 | 是 |
| POST | `/api/user/keys` | 创建自定义Key | 是 |
| DELETE | `/api/user/keys/:id` | 删除自定义Key | 是 |
| PATCH | `/api/user/keys/:id/toggle` | 切换Key状态 | 是 |
| GET | `/api/user/favorites` | 获取用户收藏 | 是 |
| GET | `/api/user/stats` | 获取调用统计 | 是 |

### API接口 `/api/apis`

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | `/api/apis/categories` | 获取所有分类 | 否 |
| GET | `/api/apis` | 获取API列表（分页/搜索/筛选） | 可选 |
| GET | `/api/apis/:slug` | 获取API详情 | 可选 |
| POST | `/api/apis/:id/favorite` | 收藏/取消收藏 | 是 |
| POST | `/api/apis/:slug/test` | 测试调用API | 可选 |
| GET | `/api/apis/:slug/ping` | 自动检测API速度 | 否 |
| GET | `/api/apis/:slug/examples` | 生成多语言调用示例 | 否 |

### API代理 `/api/proxy`

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| ALL | `/api/proxy/:slug` | 代理转发API请求 | 可选 |

### 管理后台 `/api/admin`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/admin/dashboard` | 仪表盘统计数据 |
| CRUD | `/api/admin/apis` | API管理 |
| CRUD | `/api/admin/categories` | 分类管理 |
| CRUD | `/api/admin/users` | 用户管理 |
| CRUD | `/api/admin/announcements` | 公告管理 |
| GET | `/api/admin/logs` | 调用日志 |
| GET/PUT | `/api/admin/configs` | 系统配置 |
| POST | `/api/admin/test-smtp` | 测试SMTP |

### 主题接口 `/api/themes`

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | `/api/themes/public` | 公开主题列表 | 否 |
| CRUD | `/api/themes` | 主题管理 | 是 |

### 友链接口 `/api/friendships`

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | `/api/friendships` | 前台友链列表 | 否 |
| CRUD | `/api/friendships/admin` | 友链管理 | 管理员 |

### 内置库接口 `/api/libraries`

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | `/api/libraries/available` | 可用接口列表 | 否 |
| GET | `/api/libraries/files` | 脚本文件列表 | 否 |
| POST | `/api/libraries/upload` | 上传脚本 | 管理员 |
| DELETE | `/api/libraries/file/:name` | 删除脚本 | 管理员 |
| POST | `/api/libraries/import` | 批量导入 | 管理员 |

### 版本管理 `/api/apis/:apiId/versions`

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | `/api/apis/:apiId/versions` | 获取所有版本 | 否 |
| POST | `/api/apis/:apiId/versions` | 创建新版本 | 管理员 |
| PUT | `/api/apis/:apiId/versions/:ver` | 更新版本 | 管理员 |
| DELETE | `/api/apis/:apiId/versions/:ver` | 删除版本 | 管理员 |
| POST | `/api/apis/:apiId/versions/:ver/activate` | 切换激活版本 | 管理员 |
| POST | `/api/apis/:apiId/versions/fork` | 从当前版本复制 | 管理员 |

### 关于我页面 `/api/about`

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | `/api/about` | 前台获取关于我信息 | 否 |
| GET | `/api/about/admin` | 后台获取完整配置 | 管理员 |
| PUT | `/api/about/admin` | 更新关于我配置 | 管理员 |
| POST | `/api/about/sync-github` | 手动触发GitHub同步 | 管理员 |
| GET | `/api/about/sync-logs` | 获取同步日志 | 管理员 |

---

## 📦 内置库脚本开发

### 脚本格式

支持两种格式，任选其一：

#### 格式一：Tampermonkey 风格注释（推荐）

```javascript
// ==MuYunAPI==
// @name         接口名称
// @slug         接口标识（英文，全局唯一）
// @description  接口描述
// @category     分类ID（1天气 2图片 3数据 4AI 5娱乐 6工具）
// @method       GET
// @requireAuth  false
// @isFree       true
// @theme        both
// @params       [{"name":"key","type":"string","required":true,"description":"说明","example":"值"}]
// @response     {"code":200,"data":{}}
// ==/MuYunAPI==

module.exports = {
  async execute(slug, params, req) {
    // 业务逻辑
    return { key: 'value' };
  }
};
```

#### 格式二：module.exports.apis 数组

```javascript
module.exports = {
  apis: [{
    name: '接口名称',
    slug: 'slug',
    category_id: 6,
    // ...其他字段
  }],
  async execute(slug, params, req) {
    // 根据 slug 分发
  }
};
```

### 认证参数

当 `@requireAuth true` 时，必须在 `@params` 中添加认证参数，并在 `execute` 中验证：

```javascript
// @requireAuth  true
// @params       [
//   {"name":"city","type":"string","required":true,"description":"城市名","example":"北京"},
//   {"name":"apiKey","type":"string","required":true,"description":"MuYunAPI用户Key","example":"key_xxx"},
//   {"name":"apiSecret","type":"string","required":true,"description":"MuYunAPI用户Secret","example":"secret_xxx"}
// ]

module.exports = {
  async execute(slug, params, req) {
    const { city, apiKey, apiSecret } = params || {};

    // 验证认证参数
    if (!apiKey || !apiSecret) {
      return { code: 401, message: '缺少认证参数：apiKey和apiSecret必填' };
    }

    // 业务逻辑...
  }
};
```

### 多接口合并

一个脚本文件可包含多个接口：

```javascript
// ==MuYunAPI==
// @name         UUID
// @slug         uuid
// ...
// ==/MuYunAPI==

// ==MuYunAPI==
// @name         时间戳
// @slug         timestamp
// ...
// ==/MuYunAPI==

module.exports = {
  async execute(slug, params, req) {
    const handlers = {
      'uuid': () => ({ uuid: require('uuid').v4() }),
      'timestamp': () => ({ timestamp: Date.now() }),
    };
    const handler = handlers[slug];
    if (!handler) throw new Error('未知接口: ' + slug);
    return handler();
  }
};
```

### 关键规则

| 规则 | 说明 |
|------|------|
| `execute` 方法 | 必须导出，签名为 `async execute(slug, params, req)` |
| `slug` | 全局唯一，不可重复 |
| `return` | 返回值直接作为响应的 `data` 字段 |
| 错误处理 | `throw new Error('信息')` 或 `{ code: 400/500, message: '...' }` |
| 可用模块 | `axios`、`uuid`、`nanoid` 等已安装的 npm 包 |
| theme 取值 | `dark` / `light` / `both` |

---

## 🎨 主题系统

### CSS 变量列表

主题通过 CSS 变量驱动，共 30+ 个变量：

| 变量 | 说明 | 暗色默认 | 浅色默认 |
|------|------|---------|---------|
| `--primary` | 主题强调色 | `#e99312` | `#00d9a5` |
| `--bg-main` | 主背景 | `#0d0d1a` | `#f8fffe` |
| `--bg-card` | 卡片背景 | `#12122a` | `#ffffff` |
| `--bg-card2` | 次级背景 | `#1a1a35` | `#f0faf7` |
| `--text-primary` | 主要文字 | `#f0f0f8` | `#1a1a2e` |
| `--text-secondary` | 次要文字 | `#a0a0c0` | `#4a5568` |
| `--border` | 边框 | `rgba(255,255,255,0.06)` | `rgba(0,0,0,0.08)` |
| `--code-bg` | 代码块背景 | `#0a0a18` | `#f5f7f9` |
| `--code-text` | 代码块文字 | `#a8d8a8` | `#2d3748` |
| `--overlay-bg` | 遮罩背景 | `rgba(13,13,26,0.8)` | `rgba(255,255,255,0.85)` |
| `--row-hover-bg` | 行悬停 | `rgba(255,255,255,0.03)` | `rgba(0,0,0,0.04)` |
| `--btn-text` | 按钮文字 | `#fff` | `#fff` |

### 主题编写规范

创建自定义主题时需遵循以下规范：

1. **必须变量**：`--primary`、`--bg-main`、`--bg-card`、`--text-primary`
2. **背景层级**：`--bg-main`（最浅）→ `--bg-card` → `--bg-card2` → `--bg-card3`（最深）
3. **文字对比度**：`--text-primary` 与 `--bg-main` 对比度 ≥ 4.5:1
4. **代码块变量**：必须设置 `--code-bg`、`--code-text`、`--code-header-bg`
5. **遮罩变量**：必须设置 `--overlay-bg`
6. **阴影**：深色主题透明度 0.3~0.5，浅色主题 0.05~0.1
7. **圆角**：建议 sm=8px, md=12px, lg=16px, xl=24px

---

## 📝 更新日志

### v1.2.6 (2026-05-15)

**新增功能**
- ✨ 页脚运行时间显示：支持年/月/天/时/分/秒实时刷新
- ✨ 后台"页面显示"设置区：运行时间开关、3种风格选择（运行了/穿越了/稳定运行了）、上线日期选择器
- ✨ 构建脚本支持 `--platform=linux` 参数，跨平台更新包打包

**修复**
- 🐛 修复 `versionToCode()` 不支持预发布版本号格式（x.y.z-suffix）
- 🐛 修复 `build-update.js` zip 打包文件路径错误（update.json 不在根目录）

---


**Bug 修复**
- 🐛 修复非 Git 仓库环境下 `git rev-parse` 命令报错（`fatal: not a git repository`）
- 🐛 修复 SQL 插入管理员时参数不匹配导致 `bind a value of an unknown type (undefined)` 错误
- 🐛 修复更新后 `package.json` 版本号未同步更新的问题
- 🐛 修复更新服务器启动时端口 3001 被占用导致 `EADDRINUSE` 的问题

**优化**
- ⚡ 更新服务器启动脚本新增端口检测与自动释放机制
- ⚡ 更新客户端 `applyUpdate` 成功后自动将 `update.json` 版本号写回 `package.json`

### v1.2.3 (2026-05-14)

**新增功能**
- ✨ 系统自动更新功能：内置更新检测、下载、热重载
- ✨ 更新服务器独立部署（端口 3001）
- ✨ PM2 热重载架构（双进程 + 退出码通信）
- ✨ 更新管理器后台页面：版本信息、检查更新、下载进度、应用更新、备份管理

**其他**
- 🔖 当前版本：v1.2.3

### v1.2.1 (2026-05-14)

**新增功能**
- ✨ 关于我页面：前台展示个人信息、教育背景、技能标签、联系方式
- ✨ 关于我管理后台：开关控制、内容编辑、技能管理、更新日志维护
- ✨ GitHub 自动同步：每小时检查仓库更新、获取提交记录、自动备份
- ✨ GitHub 同步日志：记录每次同步的提交信息、备份路径
- ✨ .vscode 开发配置：launch.json、tasks.json、settings.json、extensions.json

**数据**
- 🏫 添加学校信息：普宁职业技术学校（招生代码：8800587）
- 🔗 开源地址：https://github.com/zy2270561173/muyunapi

### v1.2.0 (2026-05-14)

**新增功能**
- ✨ API 版本管理：支持多版本共存、版本切换、从当前版本复制
- ✨ Markdown 文档编辑器：实时预览、工具栏快捷操作、三种视图模式
- ✨ 主题编写规范：创建/编辑主题时展示8条规范提示
- ✨ 主题编辑器新增代码块配色、遮罩/行悬停颜色配置
- ✨ 代码示例新增认证参数说明（apiKey + apiSecret）

**主题系统重构**
- 🎨 新增 8 个 CSS 变量（code-bg、code-text、overlay-bg、row-hover-bg 等）
- 🎨 全前端硬编码颜色替换为 CSS 变量（14个文件）
- 🎨 暗色/浅色主题完整适配

**Bug 修复**
- 🐛 LibraryManager 使用原始 axios 导致认证丢失 → 改用封装的 http
- 🐛 多处 JSON.parse 无 try/catch 保护 → 添加 safeJsonParse
- 🐛 AnnouncementManager toggle 不检查响应码 → 添加 code 检查
- 🐛 12 个 async 函数缺少 try/finally 导致 loading 卡死 → 全部修复
- 🐛 ApiManager saveApi 缺少 slug 验证 → 添加格式校验
- 🐛 版本管理空 catch 块吞掉错误 → 添加错误提示
- 🐛 user/theme store JSON.parse 可能崩溃 → 添加安全解析
- 🐛 Layout.vue scroll 监听器内存泄漏 → onUnmounted 移除
- 🐛 内置库脚本删除触发监听导致服务器崩溃 → 添加文件存在性检查
- 🐛 脚本规范语法高亮显示异常（scoped 样式 + 正则冲突）→ 重写高亮引擎

### v1.1.0

**新增功能**
- ✨ 内置库脚本管理系统（上传/删除/导入）
- ✨ 脚本规范展示（语法高亮、字段说明表、分类对照、代码示例）
- ✨ 积分系统（消费/充值/流水记录）
- ✨ API 速度检测
- ✨ 多语言代码示例生成

### v1.0.0

- 🎉 项目初始化
- ✅ 用户系统（注册/登录/邮箱验证/JWT认证）
- ✅ API 管理（CRUD/分类/测试/收藏）
- ✅ 管理后台（Dashboard/用户/API/分类/公告/友链/日志/设置）
- ✅ 主题系统（暗色/浅色切换、自定义主题）
- ✅ 18 个内置实用接口
- ✅ API 代理转发

---

## 📄 License

MIT License
