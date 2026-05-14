<template>
  <div class="theme-manager">
    <div class="manager-header">
      <h2>主题管理</h2>
      <el-button type="primary" @click="openCreate">
        <el-icon><Plus /></el-icon> 创建主题
      </el-button>
    </div>

    <el-tabs v-model="activeTab" class="theme-tabs">
      <el-tab-pane label="内置主题" name="builtIn">
        <div class="theme-grid">
          <div v-for="theme in builtInThemes" :key="theme.id" class="theme-card">
            <div class="theme-preview" :style="getPreviewStyle(theme.cssVars)">
              <div class="preview-header"></div>
              <div class="preview-body">
                <div class="preview-card"></div>
                <div class="preview-card"></div>
              </div>
            </div>
            <div class="theme-info">
              <div class="theme-header">
                <span class="theme-name">{{ theme.name }}</span>
                <el-tag type="info" size="small">内置</el-tag>
              </div>
              <div class="theme-meta">
                <span class="accent-color" :style="{ background: theme.cssVars['--primary'] }"></span>
                <span class="accent-label">{{ theme.cssVars['--primary'] }}</span>
              </div>
              <div class="theme-desc">{{ theme.description }}</div>
            </div>
          </div>
        </div>
      </el-tab-pane>

      <el-tab-pane label="自定义主题" name="custom">
        <div class="theme-grid" v-if="customThemes.length">
          <div v-for="theme in customThemes" :key="theme.id" class="theme-card">
            <div class="theme-preview" :style="getPreviewStyle(JSON.parse(theme.css_vars))">
              <div class="preview-header"></div>
              <div class="preview-body">
                <div class="preview-card"></div>
                <div class="preview-card"></div>
              </div>
            </div>
            <div class="theme-info">
              <div class="theme-header">
                <span class="theme-name">{{ theme.name }}</span>
                <el-tag v-if="theme.is_public" type="success" size="small">公开</el-tag>
                <el-tag v-else type="warning" size="small">私有</el-tag>
              </div>
              <div class="theme-meta">
                <span class="accent-color" :style="{ background: JSON.parse(theme.css_vars)['--primary'] }"></span>
                <span class="accent-label">{{ JSON.parse(theme.css_vars)['--primary'] }}</span>
              </div>
              <div class="theme-actions">
                <el-button type="primary" text size="small" @click="openEdit(theme)">编辑</el-button>
                <el-button type="info" text size="small" @click="exportTheme(theme)">导出</el-button>
                <el-button type="danger" text size="small" @click="deleteTheme(theme)">删除</el-button>
              </div>
            </div>
          </div>
        </div>
        <el-empty v-else description="暂无自定义主题" />
      </el-tab-pane>

      <el-tab-pane label="API文档" name="docs">
        <div class="api-docs-card">
          <h3>MuYunAPI 开放接口文档</h3>
          <p class="docs-desc">开放API供开发者和主题开发者对接使用。所有接口均返回 JSON 格式数据。</p>

          <!-- 公开API -->
          <div class="doc-block">
            <h4>📌 公开接口（无需认证）</h4>

            <div class="api-section">
              <h5>1. 获取网站信息</h5>
              <div class="api-item">
                <el-tag type="success">GET</el-tag>
                <code>/api/site-info</code>
              </div>
              <p>获取网站名称、Logo、描述等基础信息。</p>
              <div class="code-block">
                <pre>响应示例:
{
  "code": 200,
  "data": {
    "name": "MuYunAPI",
    "logo": "/uploads/logo.png",
    "description": "免费API聚合平台",
    "announcement": "欢迎使用...",
    "friendship_enabled": true
  }
}</pre>
              </div>
            </div>

            <div class="api-section">
              <h5>2. 获取分类列表</h5>
              <div class="api-item">
                <el-tag type="success">GET</el-tag>
                <code>/api/apis/categories</code>
              </div>
              <p>获取所有API分类，包含每个分类下的接口数量。</p>
              <div class="code-block">
                <pre>响应示例:
{
  "code": 200,
  "data": [
    {
      "id": 1,
      "name": "生活服务",
      "icon": "Coffee",
      "sort_order": 1,
      "api_count": 12
    },
    ...
  ]
}</pre>
              </div>
            </div>

            <div class="api-section">
              <h5>3. 获取API列表</h5>
              <div class="api-item">
                <el-tag type="success">GET</el-tag>
                <code>/api/apis</code>
              </div>
              <p>获取API接口列表，支持分页、分类筛选、关键词搜索。</p>
              <div class="code-block">
                <pre>请求参数:
- category: number   # 分类ID（可选）
- keyword: string   # 关键词搜索名称/描述（可选）
- page: number      # 页码，默认1
- limit: number     # 每页数量，默认12
- free: number     # 仅免费接口，传1（可选）

响应示例:
{
  "code": 200,
  "data": {
    "list": [
      {
        "id": 1,
        "name": "随机头像",
        "slug": "avatar",
        "description": "获取随机头像图片URL",
        "method": "GET",
        "category_name": "图片接口",
        "is_free": 1,
        "is_favorited": false,
        "avg_speed": 120
      },
      ...
    ],
    "total": 50,
    "page": 1,
    "limit": 12
  }
}</pre>
              </div>
            </div>

            <div class="api-section">
              <h5>4. 获取API详情</h5>
              <div class="api-item">
                <el-tag type="success">GET</el-tag>
                <code>/api/apis/:slug</code>
              </div>
              <p>通过接口别名获取详细信息，包含参数说明和调用示例。</p>
              <div class="code-block">
                <pre>响应示例:
{
  "code": 200,
  "data": {
    "id": 1,
    "name": "随机头像",
    "slug": "avatar",
    "description": "获取随机头像...",
    "method": "GET",
    "endpoint": "/api/proxy/avatar",
    "category_name": "图片接口",
    "params": [
      {"name": "type", "type": "string", "required": false, "description": "头像类型", "example": "male"}
    ],
    "headers": {},
    "doc_content": "&lt;h2&gt;接口说明&lt;/h2&gt;...",
    "avg_speed": 120,
    "speed_records": [...],
    "is_favorited": false
  }
}</pre>
              </div>
            </div>

            <div class="api-section">
              <h5>5. 获取公告列表</h5>
              <div class="api-item">
                <el-tag type="success">GET</el-tag>
                <code>/api/announcements</code>
              </div>
              <p>获取所有已发布的公告列表。</p>
              <div class="code-block">
                <pre>响应示例:
{
  "code": 200,
  "data": [
    {
      "id": 1,
      "title": "平台更新公告",
      "content": "本次更新内容...",
      "type": "topbar",
      "priority": 1,
      "created_at": "2026-05-01T10:00:00Z"
    },
    ...
  ]
}</pre>
              </div>
            </div>

            <div class="api-section">
              <h5>6. 获取公开主题列表</h5>
              <div class="api-item">
                <el-tag type="success">GET</el-tag>
                <code>/api/themes/public</code>
              </div>
              <p>获取所有公开的主题列表。</p>
              <div class="code-block">
                <pre>请求参数:
- keyword: string   # 关键词搜索
- type: string     # 主题类型 (dark/light)
- page: number     # 页码，默认1
- limit: number    # 每页数量，默认20

响应格式:
{
  "code": 200,
  "data": {
    "list": [
      {
        "id": "default-dark",
        "name": "默认暗夜",
        "type": "dark",
        "css_vars": {
          "--primary": "#e99312",
          "--bg-main": "#0d0d1a",
          ...
        },
        "isBuiltIn": true
      },
      ...
    ],
    "total": 5,
    "page": 1,
    "limit": 20
  }
}</pre>
              </div>
            </div>

            <div class="api-section">
              <h5>7. 获取单个主题详情</h5>
              <div class="api-item">
                <el-tag type="success">GET</el-tag>
                <code>/api/themes/:id</code>
              </div>
              <p>通过主题ID获取完整的CSS变量配置。</p>
            </div>

            <div class="api-section">
              <h5>8. 测试API接口</h5>
              <div class="api-item">
                <el-tag type="warning">POST</el-tag>
                <code>/api/apis/:slug/test</code>
              </div>
              <p>在线测试API接口调用（部分接口需登录认证）。</p>
              <div class="code-block">
                <pre>请求参数:
{
  "params": {
    "参数名": "参数值"
  }
}

响应示例:
{
  "code": 200,
  "data": {
    "response_time": 85,
    "status_code": 200,
    "data": { "avatar_url": "https://..." }
  }
}</pre>
              </div>
            </div>

            <div class="api-section">
              <h5>9. 获取调用示例代码</h5>
              <div class="api-item">
                <el-tag type="success">GET</el-tag>
                <code>/api/apis/:slug/examples</code>
              </div>
              <p>获取多语言调用示例代码（cURL/JavaScript/Python/PHP/Node.js）。</p>
              <div class="code-block">
                <pre>响应示例:
{
  "code": 200,
  "data": {
    "examples": {
      "curl": "curl -X GET \"https://...\"",
      "javascript": "fetch(\"...\").then(...)",
      "python": "import requests...",
      "php": "&lt;?php $response = file_get_contents(...)",
      "nodejs": "const axios = require('axios')..."
    },
    "source": "local",
    "apiUrl": "https://api.example.com/api/proxy/avatar"
  }
}</pre>
              </div>
            </div>
          </div>

          <!-- 需要认证的接口 -->
          <div class="doc-block">
            <h4>🔐 需要认证的接口</h4>
            <p class="auth-tip">需要携带 <code>Authorization: Bearer &lt;token&gt;</code> 请求头</p>

            <div class="api-section">
              <h5>10. 获取我的主题</h5>
              <div class="api-item">
                <el-tag type="success">GET</el-tag>
                <code>/api/themes/my</code>
              </div>
              <p>获取当前用户创建的主题列表。</p>
            </div>

            <div class="api-section">
              <h5>11. 创建主题</h5>
              <div class="api-item">
                <el-tag type="warning">POST</el-tag>
                <code>/api/themes</code>
              </div>
              <div class="code-block">
                <pre>请求体:
{
  "name": "我的主题",
  "type": "dark",
  "css_vars": {
    "--primary": "#e99312",
    "--bg-main": "#0d0d1a",
    ...
  },
  "is_public": true
}</pre>
              </div>
            </div>

            <div class="api-section">
              <h5>12. 更新主题</h5>
              <div class="api-item">
                <el-tag type="info">PUT</el-tag>
                <code>/api/themes/:id</code>
              </div>
              <p>更新指定主题（仅主题创建者可操作）。</p>
            </div>

            <div class="api-section">
              <h5>13. 删除主题</h5>
              <div class="api-item">
                <el-tag type="danger">DELETE</el-tag>
                <code>/api/themes/:id</code>
              </div>
              <p>删除指定主题（仅主题创建者可操作）。</p>
            </div>

            <div class="api-section">
              <h5>14. 收藏/取消收藏API</h5>
              <div class="api-item">
                <el-tag type="warning">POST</el-tag>
                <code>/api/apis/:id/favorite</code>
              </div>
              <p>收藏或取消收藏指定API。</p>
              <div class="code-block">
                <pre>响应示例:
{
  "code": 200,
  "data": {
    "favorited": true  // true=已收藏，false=已取消
  }
}</pre>
              </div>
            </div>
          </div>

          <!-- 响应码说明 -->
          <div class="doc-block">
            <h4>📋 响应码说明</h4>
            <table class="var-table">
              <thead>
                <tr><th>code</th><th>说明</th></tr>
              </thead>
              <tbody>
                <tr><td><code>200</code></td><td>请求成功</td></tr>
                <tr><td><code>400</code></td><td>请求参数错误</td></tr>
                <tr><td><code>401</code></td><td>未登录或token无效</td></tr>
                <tr><td><code>403</code></td><td>无权访问</td></tr>
                <tr><td><code>404</code></td><td>资源不存在</td></tr>
                <tr><td><code>500</code></td><td>服务器内部错误</td></tr>
              </tbody>
            </table>
          </div>

          <!-- CSS变量说明 -->
          <div class="doc-block">
            <h4>🎨 CSS 变量说明</h4>
            <p>主题通过CSS变量定义样式，以下是可用的变量：</p>
            <table class="var-table">
              <thead>
                <tr><th>变量名</th><th>说明</th><th>示例值</th></tr>
              </thead>
              <tbody>
                <tr><td><code>--primary</code></td><td>主题强调色</td><td>#e99312</td></tr>
                <tr><td><code>--primary-light</code></td><td>强调色浅色</td><td>#f5c842</td></tr>
                <tr><td><code>--primary-dark</code></td><td>强调色深色</td><td>#c47d0a</td></tr>
                <tr><td><code>--bg-main</code></td><td>主背景色</td><td>#0d0d1a</td></tr>
                <tr><td><code>--bg-card</code></td><td>卡片背景色</td><td>#12122a</td></tr>
                <tr><td><code>--bg-card2</code></td><td>次级卡片背景</td><td>#1a1a35</td></tr>
                <tr><td><code>--bg-card3</code></td><td>第三级卡片背景</td><td>#1e1e3f</td></tr>
                <tr><td><code>--border</code></td><td>边框颜色</td><td>rgba(255,255,255,0.06)</td></tr>
                <tr><td><code>--text-primary</code></td><td>主要文字颜色</td><td>#f0f0f8</td></tr>
                <tr><td><code>--text-secondary</code></td><td>次要文字颜色</td><td>#a0a0c0</td></tr>
                <tr><td><code>--text-muted</code></td><td>弱化文字颜色</td><td>#6060a0</td></tr>
                <tr><td><code>--success</code></td><td>成功/快速颜色</td><td>#67c23a</td></tr>
                <tr><td><code>--warning</code></td><td>警告/中速颜色</td><td>#e99312</td></tr>
                <tr><td><code>--danger</code></td><td>危险/慢速颜色</td><td>#f56c6c</td></tr>
                <tr><td><code>--info</code></td><td>信息颜色</td><td>#409eff</td></tr>
                <tr><td><code>--radius-sm</code></td><td>小圆角</td><td>8px</td></tr>
                <tr><td><code>--radius-md</code></td><td>中等圆角</td><td>12px</td></tr>
                <tr><td><code>--radius-lg</code></td><td>大圆角</td><td>16px</td></tr>
                <tr><td><code>--shadow-sm</code></td><td>小阴影</td><td>0 2px 12px rgba(0,0,0,0.3)</td></tr>
                <tr><td><code>--shadow-md</code></td><td>中等阴影</td><td>0 8px 32px rgba(0,0,0,0.4)</td></tr>
                <tr><td><code>--glow</code></td><td>光晕效果</td><td>0 0 24px rgba(233,147,18,0.15)</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>

    <!-- 创建/编辑主题对话框 -->
    <el-dialog v-model="showDialog" :title="editingTheme ? '编辑主题' : '创建主题'" width="860px" :destroy-on-close="true">
      <!-- 主题规范提示 -->
      <el-alert
        type="info"
        :closable="false"
        show-icon
        class="theme-spec-alert"
      >
        <template #title>
          <span style="font-weight:600">主题编写规范</span>
        </template>
        <div class="spec-content">
          <p>1. <strong>必须包含的变量</strong>：<code>--primary</code>、<code>--bg-main</code>、<code>--bg-card</code>、<code>--text-primary</code>（缺少将无法保存）</p>
          <p>2. <strong>背景层级</strong>：<code>--bg-main</code>（最浅）→ <code>--bg-card</code> → <code>--bg-card2</code> → <code>--bg-card3</code>（最深），确保层级分明</p>
          <p>3. <strong>文字对比度</strong>：<code>--text-primary</code> 与 <code>--bg-main</code> 之间必须有足够对比度（建议 ≥ 4.5:1）</p>
          <p>4. <strong>边框颜色</strong>：深色主题用 <code>rgba(255,255,255,0.06~0.12)</code>，浅色主题用 <code>rgba(0,0,0,0.06~0.12)</code></p>
          <p>5. <strong>代码块变量</strong>：必须设置 <code>--code-bg</code>、<code>--code-text</code>、<code>--code-header-bg</code>，否则代码块显示异常</p>
          <p>6. <strong>遮罩变量</strong>：必须设置 <code>--overlay-bg</code>，用于 loading 遮罩和弹窗背景</p>
          <p>7. <strong>阴影</strong>：深色主题阴影透明度 0.3~0.5，浅色主题 0.05~0.1</p>
          <p>8. <strong>圆角</strong>：建议 sm=8px, md=12px, lg=16px, xl=24px</p>
        </div>
      </el-alert>

      <el-form :model="form" label-width="100px" style="margin-top:16px">
        <el-form-item label="主题名称" required>
          <el-input v-model="form.name" placeholder="如：薄荷清风" />
        </el-form-item>

        <el-form-item label="主题配色">
          <div class="color-picker-group">
            <div class="color-item">
              <label>强调色</label>
              <el-color-picker v-model="form.cssVars['--primary']" />
              <el-input v-model="form.cssVars['--primary']" size="small" style="width:100px" />
            </div>
            <div class="color-item">
              <label>成功色</label>
              <el-color-picker v-model="form.cssVars['--success']" />
              <el-input v-model="form.cssVars['--success']" size="small" style="width:100px" />
            </div>
            <div class="color-item">
              <label>警告色</label>
              <el-color-picker v-model="form.cssVars['--warning']" />
              <el-input v-model="form.cssVars['--warning']" size="small" style="width:100px" />
            </div>
            <div class="color-item">
              <label>危险色</label>
              <el-color-picker v-model="form.cssVars['--danger']" />
              <el-input v-model="form.cssVars['--danger']" size="small" style="width:100px" />
            </div>
          </div>
        </el-form-item>

        <el-form-item label="背景颜色">
          <div class="color-picker-group">
            <div class="color-item">
              <label>主背景</label>
              <el-color-picker v-model="form.cssVars['--bg-primary']" />
              <el-input v-model="form.cssVars['--bg-primary']" size="small" style="width:100px" />
            </div>
            <div class="color-item">
              <label>卡片</label>
              <el-color-picker v-model="form.cssVars['--bg-card']" />
              <el-input v-model="form.cssVars['--bg-card']" size="small" style="width:100px" />
            </div>
            <div class="color-item">
              <label>卡片2</label>
              <el-color-picker v-model="form.cssVars['--bg-card2']" />
              <el-input v-model="form.cssVars['--bg-card2']" size="small" style="width:100px" />
            </div>
          </div>
        </el-form-item>

        <el-form-item label="文字颜色">
          <div class="color-picker-group">
            <div class="color-item">
              <label>主要文字</label>
              <el-color-picker v-model="form.cssVars['--text-primary']" />
              <el-input v-model="form.cssVars['--text-primary']" size="small" style="width:100px" />
            </div>
            <div class="color-item">
              <label>次要文字</label>
              <el-color-picker v-model="form.cssVars['--text-secondary']" />
              <el-input v-model="form.cssVars['--text-secondary']" size="small" style="width:100px" />
            </div>
            <div class="color-item">
              <label>边框</label>
              <el-color-picker v-model="form.cssVars['--border']" />
              <el-input v-model="form.cssVars['--border']" size="small" style="width:100px" />
            </div>
          </div>
        </el-form-item>

        <el-form-item label="代码块配色">
          <div class="color-picker-group">
            <div class="color-item">
              <label>代码背景</label>
              <el-color-picker v-model="form.cssVars['--code-bg']" />
              <el-input v-model="form.cssVars['--code-bg']" size="small" style="width:100px" />
            </div>
            <div class="color-item">
              <label>代码文字</label>
              <el-color-picker v-model="form.cssVars['--code-text']" />
              <el-input v-model="form.cssVars['--code-text']" size="small" style="width:100px" />
            </div>
            <div class="color-item">
              <label>代码头部</label>
              <el-color-picker v-model="form.cssVars['--code-header-bg']" />
              <el-input v-model="form.cssVars['--code-header-bg']" size="small" style="width:100px" />
            </div>
          </div>
        </el-form-item>

        <el-form-item label="遮罩/行悬停">
          <div class="color-picker-group">
            <div class="color-item">
              <label>遮罩背景</label>
              <el-color-picker v-model="form.cssVars['--overlay-bg']" show-alpha />
              <el-input v-model="form.cssVars['--overlay-bg']" size="small" style="width:120px" />
            </div>
            <div class="color-item">
              <label>行悬停</label>
              <el-color-picker v-model="form.cssVars['--row-hover-bg']" show-alpha />
              <el-input v-model="form.cssVars['--row-hover-bg']" size="small" style="width:120px" />
            </div>
          </div>
        </el-form-item>

        <el-form-item label="是否公开">
          <el-switch v-model="form.is_public" />
          <span class="form-hint">公开主题所有用户可见，私有主题仅自己可见</span>
        </el-form-item>

        <el-form-item label="主题预览">
          <div class="theme-live-preview" :style="form.cssVars">
            <div class="preview-nav"></div>
            <div class="preview-content">
              <div class="preview-card"></div>
              <div class="preview-card"></div>
              <div class="preview-btn" :style="{ background: form.cssVars['--primary'] }"></div>
            </div>
          </div>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="showDialog = false">取消</el-button>
        <el-button type="primary" @click="saveTheme" :loading="saving">
          {{ editingTheme ? '保存' : '创建' }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { themeApi } from '../../api'
import { builtInThemes } from '../../themes'

const activeTab = ref('builtIn')
const customThemes = ref([])
const loading = ref(false)
const saving = ref(false)
const showDialog = ref(false)
const editingTheme = ref(null)

const defaultCssVars = () => ({
  '--primary': '#e99312',
  '--primary-light': '#f5c842',
  '--primary-dark': '#c47d0a',
  '--bg-primary': '#0d0d1a',
  '--bg-main': '#0d0d1a',
  '--bg-card': '#161625',
  '--bg-card2': '#1e1e30',
  '--bg-card3': '#262640',
  '--text-primary': '#ffffff',
  '--text-secondary': '#a0a0b0',
  '--text-muted': '#606080',
  '--border': '#2a2a45',
  '--border-active': 'rgba(233,147,18,0.4)',
  '--success': '#67c23a',
  '--warning': '#e6a23c',
  '--danger': '#f56c6c',
  '--info': '#909399',
  '--radius-sm': '6px',
  '--radius-md': '10px',
  '--radius-lg': '16px',
  '--radius-xl': '24px',
  '--code-bg': '#0a0a18',
  '--code-text': '#a8d8a8',
  '--code-header-bg': '#1a1a2e',
  '--code-header-border': '#2a2a4a',
  '--code-lang-text': '#8888aa',
  '--overlay-bg': 'rgba(13,13,26,0.8)',
  '--row-hover-bg': 'rgba(255,255,255,0.03)',
  '--btn-text': '#fff',
})

const form = reactive({
  name: '',
  cssVars: defaultCssVars(),
  is_public: false,
})

function getPreviewStyle(cssVars) {
  return {
    '--prev-primary': cssVars['--primary'] || '#e99312',
    '--prev-bg': cssVars['--bg-primary'] || '#0d0d1a',
    '--prev-card': cssVars['--bg-card'] || '#161625',
    '--prev-text': cssVars['--text-primary'] || '#ffffff',
  }
}

function openCreate() {
  editingTheme.value = null
  Object.assign(form, {
    name: '',
    cssVars: defaultCssVars(),
    is_public: false,
  })
  showDialog.value = true
}

function openEdit(theme) {
  editingTheme.value = theme
  const cssVars = JSON.parse(theme.css_vars)
  Object.assign(form, {
    name: theme.name,
    cssVars: { ...defaultCssVars(), ...cssVars },
    is_public: !!theme.is_public,
  })
  showDialog.value = true
}

async function saveTheme() {
  if (!form.name) return ElMessage.warning('请输入主题名称')

  saving.value = true
  try {
    const data = {
      name: form.name,
      css_vars: JSON.stringify(form.cssVars),
      is_public: form.is_public ? 1 : 0,
    }

    let res
    if (editingTheme.value) {
      res = await themeApi.updateTheme(editingTheme.value.id, data)
    } else {
      res = await themeApi.createTheme(data)
    }

    if (res.code === 200) {
      ElMessage.success(editingTheme.value ? '主题已更新' : '主题已创建')
      showDialog.value = false
      loadCustomThemes()
    } else {
      ElMessage.error(res.message)
    }
  } finally {
    saving.value = false
  }
}

function exportTheme(theme) {
  const data = {
    name: theme.name,
    css_vars: JSON.parse(theme.css_vars),
    description: '用户导出的自定义主题',
  }
  const json = JSON.stringify(data, null, 2)
  navigator.clipboard.writeText(json).then(() => {
    ElMessage.success('主题配置已复制到剪贴板')
  })
}

async function deleteTheme(theme) {
  await ElMessageBox.confirm(`确定删除主题「${theme.name}」？`, '提示', { type: 'warning' })
  const res = await themeApi.deleteTheme(theme.id)
  if (res.code === 200) {
    ElMessage.success('主题已删除')
    loadCustomThemes()
  } else {
    ElMessage.error(res.message)
  }
}

async function loadCustomThemes() {
  loading.value = true
  try {
    // 新API返回 { list, total, page, limit } 格式
    const res = await themeApi.getMyThemes()
    if (res.code === 200) customThemes.value = res.data?.list || []
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadCustomThemes()
})
</script>

<style lang="scss" scoped>
.theme-manager { display: flex; flex-direction: column; gap: 20px; }

.manager-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  h2 { font-size: 20px; font-weight: 700; color: var(--text-primary); }
}

.theme-tabs {
  :deep(.el-tabs__header) { margin-bottom: 20px; }
}

.theme-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
}

.theme-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  overflow: hidden;
  transition: all 0.2s;

  &:hover {
    border-color: var(--primary);
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0,0,0,0.15);
  }
}

.theme-preview {
  height: 140px;
  background: var(--prev-bg);
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;

  .preview-header {
    height: 24px;
    background: var(--prev-card);
    border-radius: 4px;
  }

  .preview-body {
    display: flex;
    gap: 8px;
    flex: 1;

    .preview-card {
      flex: 1;
      background: var(--prev-card);
      border-radius: 4px;
      opacity: 0.8;
    }
  }
}

.theme-info { padding: 16px; }

.theme-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.theme-name { font-size: 15px; font-weight: 600; color: var(--text-primary); }

.theme-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.accent-color {
  width: 20px;
  height: 20px;
  border-radius: 4px;
  border: 1px solid var(--border);
}

.accent-label { font-size: 12px; color: var(--text-muted); font-family: monospace; }

.theme-desc { font-size: 12px; color: var(--text-muted); margin-bottom: 12px; }

.theme-actions { display: flex; gap: 8px; }

// API文档
.api-docs-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 24px;
  max-height: 80vh;
  overflow-y: auto;

  h3 { font-size: 20px; font-weight: 700; color: var(--text-primary); margin-bottom: 8px; }
  h4 { font-size: 16px; font-weight: 600; color: var(--primary); margin: 28px 0 16px; padding-bottom: 8px; border-bottom: 1px dashed var(--border); }
  h5 { font-size: 14px; font-weight: 600; color: var(--text-primary); margin: 16px 0 8px; }
}

.docs-desc { color: var(--text-secondary); margin-bottom: 24px; }

.doc-block {
  margin-bottom: 16px;
}

.auth-tip {
  background: var(--bg-card2);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 10px 14px;
  margin: 12px 0;
  font-size: 13px;
  color: var(--text-secondary);

  code {
    background: var(--bg-card3);
    padding: 2px 8px;
    border-radius: 4px;
    color: var(--primary);
    font-family: monospace;
  }
}

.api-section {
  margin-bottom: 20px;
  padding-bottom: 16px;

  p { color: var(--text-secondary); font-size: 13px; margin: 6px 0 0; }
}

.api-item {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;

  code { font-family: monospace; font-size: 13px; color: var(--primary); }
}

.code-block {
  background: var(--code-bg);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 12px 16px;
  margin-top: 12px;
  overflow-x: auto;

  pre {
    margin: 0;
    font-size: 12px;
    color: var(--code-text);
    font-family: 'Consolas', monospace;
  }
}

.var-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 12px;
  font-size: 13px;

  th, td {
    padding: 10px 12px;
    border: 1px solid var(--border);
    text-align: left;
  }

  th { background: var(--bg-card2); font-weight: 600; color: var(--text-primary); }
  td { color: var(--text-secondary); }

  code {
    font-family: monospace;
    color: var(--primary);
    background: var(--bg-card2);
    padding: 1px 6px;
    border-radius: 4px;
  }
}

// 主题规范提示
.theme-spec-alert {
  :deep(.el-alert__description) {
    padding: 0;
    margin: 0;
  }
}
.spec-content {
  p {
    font-size: 12px;
    line-height: 1.8;
    color: var(--text-secondary);
    margin: 2px 0;
    strong { color: var(--text-primary); }
    code {
      background: var(--bg-card2);
      padding: 1px 5px;
      border-radius: 3px;
      font-size: 11px;
      color: var(--primary);
      font-family: 'Fira Code', monospace;
    }
  }
}

// 主题编辑器
.color-picker-group {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

.color-item {
  display: flex;
  align-items: center;
  gap: 8px;

  label {
    font-size: 12px;
    color: var(--text-secondary);
    width: 60px;
  }
}

.form-hint { margin-left: 12px; font-size: 12px; color: var(--text-muted); }

.theme-live-preview {
  --preview-primary: var(--primary);
  --preview-bg: var(--bg-primary);
  --preview-card: var(--bg-card);
  --preview-text: var(--text-primary);

  background: var(--preview-bg);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;

  .preview-nav {
    height: 32px;
    background: color-mix(in srgb, var(--preview-bg) 90%, transparent);
    border-radius: 4px;
  }

  .preview-content {
    display: flex;
    gap: 12px;

    .preview-card {
      flex: 1;
      height: 60px;
      background: var(--preview-card);
      border-radius: 4px;
    }

    .preview-btn {
      width: 60px;
      height: 60px;
      border-radius: 4px;
    }
  }
}
</style>
