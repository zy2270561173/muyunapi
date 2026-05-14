<template>
  <div class="api-detail-page">
    <div v-if="loading" class="loading-state">
      <el-skeleton :rows="8" animated />
    </div>
    <div v-else-if="!api" class="empty-state">
      <div>接口不存在</div>
      <el-button @click="$router.back()">返回</el-button>
    </div>
    <template v-else>
      <!-- 头部 -->
      <div class="detail-hero">
        <div class="container">
          <div class="breadcrumb">
            <router-link to="/">首页</router-link>
            <span>/</span>
            <router-link to="/explore">浏览接口</router-link>
            <span>/</span>
            <span>{{ api.name }}</span>
          </div>
          <div class="hero-content">
            <div class="hero-left">
              <div class="api-meta">
                <span class="cat-tag">{{ api.category_icon }} {{ api.category_name }}</span>
                <span class="method-badge" :class="api.method?.toLowerCase()">{{ api.method }}</span>
                <span class="badge-source" :class="api.source === 'local' ? 'local' : 'external'">
                  {{ api.source === 'local' ? '🏠 内置' : '🌐 外部' }}
                </span>
                <span class="badge-free" v-if="api.is_free">免费</span>
                <span class="badge-paid" v-else>付费</span>
                <div class="speed-info" v-if="api.avg_speed">
                  <div class="speed-dot" :class="speedClass(api.avg_speed)"></div>
                  <span>{{ api.avg_speed }}ms</span>
                </div>
              </div>
              <h1>{{ api.name }}</h1>
              <p class="api-desc-text">{{ api.description }}</p>
              <div class="api-stats">
                <span><el-icon><DataAnalysis /></el-icon> {{ formatNum(api.calls_count) }} 次调用</span>
                <span><el-icon><Calendar /></el-icon> {{ dayjs(api.created_at).format('YYYY-MM-DD') }}</span>
              </div>
            </div>
            <div class="hero-right">
              <el-button
                :type="api.is_favorited ? 'warning' : 'default'"
                size="large"
                @click="handleFavorite"
                style="gap:6px"
              >
                <el-icon><Star /></el-icon>
                {{ api.is_favorited ? '已收藏' : '收藏' }}
              </el-button>
              <el-button type="primary" size="large" @click="pingApi">
                <el-icon><Connection /></el-icon> 测速
              </el-button>
            </div>
          </div>
        </div>
      </div>

      <!-- 主体 -->
      <div class="container detail-body">
        <div class="left-content">
          <!-- 接口地址 -->
          <div class="info-card">
            <div class="card-title">接口地址</div>
            <div class="endpoint-bar">
              <span class="method-tag" :class="api.method?.toLowerCase()">{{ api.method }}</span>
              <span class="endpoint-url">{{ callUrl }}</span>
              <el-button text size="small" @click="copy(callUrl)">
                <el-icon><CopyDocument /></el-icon>
              </el-button>
            </div>
          </div>

          <!-- 请求参数 -->
          <div class="info-card" v-if="api.params?.length">
            <div class="card-title">请求参数</div>
            <el-table :data="api.params" size="small">
              <el-table-column prop="name" label="参数名" width="140">
                <template #default="{ row }">
                  <code style="color:var(--primary)">{{ row.name }}</code>
                </template>
              </el-table-column>
              <el-table-column prop="type" label="类型" width="80">
                <template #default="{ row }">
                  <span style="color:var(--info);font-size:12px">{{ row.type }}</span>
                </template>
              </el-table-column>
              <el-table-column prop="required" label="必填" width="70">
                <template #default="{ row }">
                  <el-tag :type="row.required ? 'danger' : 'info'" size="small">{{ row.required ? '是' : '否' }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="description" label="说明" />
              <el-table-column prop="example" label="示例值" width="120">
                <template #default="{ row }">
                  <code style="color:var(--text-muted);font-size:12px">{{ row.example }}</code>
                </template>
              </el-table-column>
            </el-table>
          </div>

          <!-- 返回示例 -->
          <div class="info-card" v-if="api.response_example">
            <div class="card-title">返回示例</div>
            <div class="code-block">
              <div class="code-toolbar">
                <span style="color:var(--text-muted);font-size:12px">JSON</span>
                <el-button text size="small" @click="copy(api.response_example)">
                  <el-icon><CopyDocument /></el-icon> 复制
                </el-button>
              </div>
              <pre>{{ formatJson(api.response_example) }}</pre>
            </div>
          </div>

          <!-- 接口文档 -->
          <div class="info-card doc-card" v-if="api.doc_content">
            <div class="card-title">
              <el-icon style="margin-right:6px;color:var(--primary)"><Document /></el-icon>
              接口文档
            </div>
            <div class="md-body" v-html="renderMarkdown(api.doc_content)"></div>
          </div>

          <!-- 调用示例 -->
          <div class="info-card">
            <div class="card-title">调用示例</div>
            <el-tabs v-model="activeCodeTab" class="code-tabs">
              <el-tab-pane v-for="(code, lang) in examples" :key="lang" :label="langLabels[lang] || lang" :name="lang">
                <div class="code-block">
                  <div class="code-toolbar">
                    <span style="color:var(--text-muted);font-size:12px">{{ langLabels[lang] || lang }}</span>
                    <el-button text size="small" @click="copy(code)">
                      <el-icon><CopyDocument /></el-icon> 复制
                    </el-button>
                  </div>
                  <pre>{{ code }}</pre>
                </div>
              </el-tab-pane>
            </el-tabs>
          </div>
        </div>

        <!-- 右侧：在线测试 -->
        <div class="right-panel">
          <div class="info-card test-panel">
            <div class="card-title">在线测试</div>
            
            <div class="test-params" v-if="api.params?.length">
              <div v-for="param in api.params" :key="param.name" class="param-row">
                <label>
                  {{ param.name }}
                  <span class="required-dot" v-if="param.required">*</span>
                  <span class="param-hint">{{ param.type }}</span>
                </label>
                <el-input
                  v-model="testParams[param.name]"
                  :placeholder="param.example || param.description"
                  size="small"
                />
              </div>
            </div>
            <div v-else class="no-params">此接口无需传参，直接点击测试</div>

            <el-button
              type="primary"
              style="width:100%;margin-top:16px"
              @click="runTest"
              :loading="testing"
            >
              <el-icon><CaretRight /></el-icon>
              {{ testing ? '请求中...' : '发起请求' }}
            </el-button>

            <!-- 测试结果 -->
            <div class="test-result" v-if="testResult">
              <div class="result-header">
                <span>响应结果</span>
                <div class="result-meta">
                  <el-tag :type="testResult.status_code >= 200 && testResult.status_code < 300 ? 'success' : 'danger'" size="small">
                    {{ testResult.status_code || (testResult.error ? 'Error' : '200') }}
                  </el-tag>
                  <span class="rt">⏱ {{ testResult.response_time }}ms</span>
                </div>
              </div>
              <div class="code-block" style="max-height:300px;overflow-y:auto">
                <pre>{{ formatJson(JSON.stringify(testResult.data)) }}</pre>
              </div>
              <div v-if="testResult.error" style="color:var(--danger);font-size:12px;margin-top:8px">{{ testResult.error }}</div>
            </div>
          </div>

          <!-- 速度历史 -->
          <div class="info-card speed-card">
            <div class="card-title">
              近期响应速度
              <el-button text size="small" @click="pingApi">刷新</el-button>
            </div>
            <div class="speed-bars" v-if="api.speed_records?.length">
              <div v-for="(r, i) in api.speed_records.slice(0, 8)" :key="i" class="speed-bar-item">
                <div class="bar-wrap">
                  <div class="bar" :class="speedClass(r.response_time)" :style="{ height: barHeight(r.response_time) + 'px' }"></div>
                </div>
                <span class="bar-val">{{ r.response_time }}ms</span>
              </div>
            </div>
            <div v-else class="no-data">暂无速度数据，点击测速获取</div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted, reactive, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import dayjs from 'dayjs'
import { apiApi } from '../api'
import { useUserStore } from '../stores/user'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const api = ref(null)
const loading = ref(true)
const testing = ref(false)
const testParams = reactive({})
const testResult = ref(null)
const examples = ref({})
const activeCodeTab = ref('curl')

const langLabels = { curl: 'cURL', javascript: 'JavaScript', python: 'Python', php: 'PHP', nodejs: 'Node.js' }

// 转换 endpoint 为实际调用地址
const callUrl = computed(() => {
  if (!api.value) return ''
  const endpoint = api.value.endpoint
  if (endpoint && endpoint.startsWith('local://')) {
    const slug = endpoint.replace('local://', '')
    return `${window.location.origin}/api/proxy/${slug}`
  }
  return endpoint
})

// 简易 Markdown 渲染
function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
function renderMarkdown(text) {
  if (!text) return ''
  let html = text
    .replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) =>
      `<pre class="md-code-block"><code class="lang-${lang}">${escapeHtml(code.trim())}</code></pre>`)
    .replace(/`([^`]+)`/g, '<code class="md-inline-code">$1</code>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^[-*] (.+)$/gm, '<li>$1</li>')
    .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
    .replace(/^---+$/gm, '<hr>')
    .replace(/\n\n/g, '</p><p>')
  // 表格处理
  const tableRegex = /(\|.+\|\n)+/g
  html = html.replace(tableRegex, (block) => {
    const rows = block.trim().split('\n').filter(r => r.trim() && !r.match(/^\|[\s\-:]+\|/))
    if (rows.length < 1) return block
    const toCells = (row, tag) => row.slice(1, -1).split('|').map(c => `<${tag}>${c.trim()}</${tag}>`).join('')
    const header = `<thead><tr>${toCells(rows[0], 'th')}</tr></thead>`
    const body = rows.slice(1).map(r => `<tr>${toCells(r, 'td')}</tr>`).join('')
    return `<table class="md-table">${header}<tbody>${body}</tbody></table>`
  })
  html = html.replace(/(<li>[\s\S]*?<\/li>\n?)+/g, match => `<ul>${match}</ul>`)
  return `<p>${html}</p>`
}

function speedClass(ms) {
  if (!ms) return 'unknown'
  if (ms < 300) return 'fast'
  if (ms < 1000) return 'medium'
  return 'slow'
}
function formatNum(n) {
  if (!n) return '0'
  if (n >= 10000) return (n / 10000).toFixed(1) + 'w'
  return String(n)
}
function formatJson(str) {
  try { return JSON.stringify(JSON.parse(str), null, 2) }
  catch { return str }
}
function copy(text) {
  navigator.clipboard.writeText(text).then(() => ElMessage.success('已复制'))
}
function barHeight(ms) {
  if (!ms) return 4
  const max = Math.max(...api.value.speed_records.map(r => r.response_time || 0), 1)
  return Math.max(4, Math.round((ms / max) * 48))
}

async function runTest() {
  testing.value = true
  testResult.value = null
  try {
    const res = await apiApi.test(route.params.slug, testParams)
    if (res.code === 200) testResult.value = res.data
  } catch (e) {
    testResult.value = { error: e.message, response_time: 0 }
  } finally {
    testing.value = false
  }
}

async function pingApi() {
  const res = await apiApi.ping(route.params.slug)
  if (res.code === 200) {
    ElMessage.success(`响应 ${res.data.response_time}ms`)
    // 刷新详情
    loadDetail()
  }
}

async function handleFavorite() {
  if (!userStore.isLoggedIn) {
    ElMessage.warning('请先登录')
    router.push('/login')
    return
  }
  const res = await apiApi.toggleFavorite(api.value.id)
  if (res.code === 200) {
    api.value.is_favorited = res.data.favorited
    ElMessage.success(res.message)
  }
}

async function loadDetail() {
  const res = await apiApi.getDetail(route.params.slug)
  if (res.code === 200) {
    api.value = res.data
    // 初始化测试参数
    res.data.params?.forEach(p => {
      if (p.example) testParams[p.name] = p.example
    })
  }
}

async function loadExamples() {
  const res = await apiApi.getExamples(route.params.slug)
  if (res.code === 200) {
    // 后端返回 { examples: {...}, source, apiUrl }，需提取 examples
    examples.value = res.data.examples || res.data
  }
}

onMounted(async () => {
  await Promise.allSettled([loadDetail(), loadExamples()])
  loading.value = false
})
</script>

<style lang="scss" scoped>
.api-detail-page { min-height: 100vh; padding-bottom: 60px; }

.loading-state, .empty-state {
  max-width: 800px;
  margin: 60px auto;
  padding: 0 24px;
}

.detail-hero {
  background: linear-gradient(180deg, var(--bg-card) 0%, transparent 100%);
  padding: 40px 24px 32px;
  border-bottom: 1px solid var(--border);
}
.container { max-width: 1280px; margin: 0 auto; padding: 0 24px; }

.breadcrumb {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--text-muted);
  margin-bottom: 24px;
  a { color: var(--text-muted); text-decoration: none; &:hover { color: var(--primary); } }
}

.hero-content {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
}
.hero-left { flex: 1; }
.api-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
  flex-wrap: wrap;
  // 接口来源和免费标签强制一行
  .badge-source { order: -1; }
}
.cat-tag {
  font-size: 13px;
  color: var(--text-muted);
  background: var(--bg-card2);
  padding: 4px 12px;
  border-radius: 12px;
  border: 1px solid var(--border);
}
.speed-info {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--text-muted);
}
h1 { font-size: 32px; font-weight: 800; color: var(--text-primary); margin-bottom: 12px; }
.api-desc-text { font-size: 15px; color: var(--text-secondary); line-height: 1.7; margin-bottom: 16px; }
.api-stats {
  display: flex;
  gap: 20px;
  font-size: 13px;
  color: var(--text-muted);
  span { display: flex; align-items: center; gap: 4px; }
}
.hero-right {
  display: flex;
  gap: 12px;
  flex-shrink: 0;
  padding-top: 8px;
}

.detail-body {
  display: flex;
  gap: 24px;
  padding-top: 32px;
  align-items: flex-start;
}
.left-content { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 20px; }
.right-panel { width: 360px; flex-shrink: 0; display: flex; flex-direction: column; gap: 20px; position: sticky; top: 80px; }

.info-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 24px;
}
.card-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  &::after {
    content: '';
    flex: 1;
    height: 1px;
    background: var(--border);
    margin-left: 12px;
  }
  :deep(.el-button) { margin-left: 8px; }
}

.endpoint-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  background: var(--bg-card2);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 10px 14px;
  overflow: hidden;
}
.method-tag {
  font-size: 12px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 6px;
  font-family: monospace;
  flex-shrink: 0;
  &.get { background: rgba(103,194,58,0.12); color: var(--success); }
  &.post { background: rgba(64,158,255,0.12); color: var(--info); }
  &.put { background: rgba(233,147,18,0.12); color: var(--primary); }
  &.delete { background: rgba(245,108,108,0.12); color: var(--danger); }
}
.endpoint-url {
  flex: 1;
  font-family: monospace;
  font-size: 13px;
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.code-block {
  background: var(--code-bg);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  overflow: hidden;
}
.code-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 14px;
  border-bottom: 1px solid var(--border);
  background: var(--row-hover-bg);
}
pre {
  padding: 16px;
  margin: 0;
  font-size: 13px;
  line-height: 1.7;
  color: var(--code-text);
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-all;
}

.code-tabs {
  :deep(.el-tabs__header) { margin-bottom: 0; }
  :deep(.el-tabs__nav-wrap::after) { bottom: 0; }
}

// Test panel
.test-params { display: flex; flex-direction: column; gap: 12px; }
.param-row {
  label {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: var(--text-secondary);
    margin-bottom: 6px;
  }
  .required-dot { color: var(--danger); }
  .param-hint { font-size: 11px; color: var(--text-muted); background: var(--bg-card3); padding: 1px 6px; border-radius: 4px; }
}
.no-params { color: var(--text-muted); font-size: 13px; text-align: center; padding: 16px 0; }

.test-result { margin-top: 16px; }
.result-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
  font-size: 13px;
  color: var(--text-secondary);
}
.result-meta { display: flex; align-items: center; gap: 8px; }
.rt { font-size: 12px; color: var(--text-muted); }

// Speed bars
.speed-bars {
  display: flex;
  align-items: flex-end;
  gap: 6px;
  height: 60px;
  padding: 8px 0;
}
.speed-bar-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  flex: 1;
}
.bar-wrap {
  width: 100%;
  height: 48px;
  display: flex;
  align-items: flex-end;
}
.bar {
  width: 100%;
  border-radius: 3px 3px 0 0;
  min-height: 4px;
  transition: height 0.5s ease;
  &.fast { background: var(--success); }
  &.medium { background: var(--warning); }
  &.slow { background: var(--danger); }
}
.bar-val { font-size: 10px; color: var(--text-muted); }
.no-data { color: var(--text-muted); font-size: 13px; text-align: center; padding: 12px; }

.method-badge {
  font-size: 11px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 6px;
  font-family: monospace;
  &.get { background: rgba(103,194,58,0.12); color: var(--success); border: 1px solid rgba(103,194,58,0.2); }
  &.post { background: rgba(64,158,255,0.12); color: var(--info); border: 1px solid rgba(64,158,255,0.2); }
  &.put { background: rgba(233,147,18,0.12); color: var(--primary); border: 1px solid rgba(233,147,18,0.2); }
  &.delete { background: rgba(245,108,108,0.12); color: var(--danger); border: 1px solid rgba(245,108,108,0.2); }
}

.badge-source {
  font-size: 12px;
  font-weight: 500;
  padding: 2px 8px;
  border-radius: 6px;
  &.local {
    background: rgba(233,147,18,0.12);
    color: var(--primary);
    border: 1px solid rgba(233,147,18,0.2);
  }
  &.external {
    background: rgba(64,158,255,0.12);
    color: var(--info);
    border: 1px solid rgba(64,158,255,0.2);
  }
}

// Markdown 文档渲染
.doc-card .card-title {
  &::before { display: none; }
  display: flex;
  align-items: center;
}
.md-body {
  font-size: 14px;
  line-height: 1.85;
  color: var(--text-secondary);
  :deep(h1) { font-size: 20px; font-weight: 700; margin: 20px 0 10px; color: var(--text-primary); border-bottom: 1px solid var(--border); padding-bottom: 10px; }
  :deep(h2) { font-size: 16px; font-weight: 600; margin: 20px 0 10px; color: var(--text-primary); padding-left: 12px; border-left: 3px solid var(--primary); }
  :deep(h3) { font-size: 14px; font-weight: 600; margin: 14px 0 8px; color: var(--text-secondary); }
  :deep(p) { margin: 0 0 12px; }
  :deep(strong) { color: var(--text-primary); font-weight: 600; }
  :deep(em) { font-style: italic; }
  :deep(ul) { padding-left: 20px; margin: 8px 0 12px; list-style: disc; }
  :deep(li) { margin: 5px 0; }
  :deep(hr) { border: none; border-top: 1px solid var(--border); margin: 20px 0; }
  :deep(.md-inline-code) {
    font-family: 'Consolas', 'Monaco', monospace;
    font-size: 12px;
    background: var(--bg-card2);
    color: var(--primary);
    padding: 1px 7px;
    border-radius: 4px;
    border: 1px solid var(--border);
  }
  :deep(.md-code-block) {
    background: var(--code-bg);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    padding: 14px 18px;
    margin: 10px 0;
    overflow-x: auto;
    code {
      font-family: 'Consolas', 'Monaco', monospace;
      font-size: 13px;
      color: var(--code-text);
      white-space: pre-wrap;
      word-break: break-all;
    }
  }
  :deep(.md-table) {
    width: 100%;
    border-collapse: collapse;
    margin: 10px 0 16px;
    font-size: 13px;
    overflow-x: auto;
    display: block;
    th {
      background: var(--bg-card2);
      color: var(--text-primary);
      font-weight: 600;
      padding: 9px 14px;
      border: 1px solid var(--border);
      text-align: left;
      white-space: nowrap;
    }
    td {
      padding: 8px 14px;
      border: 1px solid var(--border);
      color: var(--text-secondary);
      font-family: 'Consolas', 'Monaco', monospace;
      font-size: 12px;
    }
    tr:nth-child(even) td { background: var(--row-hover-bg); }
    tr:hover td { background: rgba(233,147,18,0.04); }
  }
}

// ========== 手机端响应式 ==========
@media (max-width: 768px) {
  .detail-hero { padding: 24px 16px 20px; }
  h1 { font-size: 22px !important; }
  .api-desc-text { font-size: 14px; }
  .hero-content { flex-direction: column; gap: 16px; }
  .hero-right {
    flex-direction: row;
    padding-top: 0;
    .el-button { flex: 1; }
  }

  .detail-body {
    flex-direction: column;
    padding-top: 20px;
    gap: 16px;
  }
  .right-panel {
    width: 100% !important;
    position: static !important;
    gap: 16px;
  }
  .info-card { padding: 16px; }
  .card-title { font-size: 14px; }

  // 接口地址栏
  .endpoint-bar {
    flex-wrap: wrap;
    gap: 8px;
    .endpoint-url { flex-basis: 100%; order: 3; }
  }

  // 参数表格横向滚动
  :deep(.el-table) { width: 100%; }
  :deep(.el-table__body-wrapper) { overflow-x: auto; }

  // 测速柱图
  .speed-bars { gap: 4px; }
  .bar-val { font-size: 9px; }

  // markdown 表格横向滚动
  .md-body :deep(.md-table) {
    display: block;
    overflow-x: auto;
    white-space: nowrap;
  }
}
</style>
