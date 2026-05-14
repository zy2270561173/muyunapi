<template>
  <div class="manager-page">
    <div class="manager-header">
      <h2>API接口管理</h2>
      <div class="header-actions">
        <el-input v-model="keyword" placeholder="搜索接口..." style="width:200px" clearable @input="onSearch">
          <template #prefix><el-icon><Search /></el-icon></template>
        </el-input>
        <el-select v-model="filterCategory" placeholder="全部分类" clearable style="width:140px" @change="loadApis">
          <el-option v-for="c in categories" :key="c.id" :label="c.icon+' '+c.name" :value="c.id" />
        </el-select>
        <el-button type="primary" @click="openCreate">
          <el-icon><Plus /></el-icon> 新增接口
        </el-button>
      </div>
    </div>

    <el-table :data="apis" v-loading="loading" row-class-name="api-row">
      <el-table-column prop="id" label="ID" width="60" />
      <el-table-column label="接口名称" min-width="160">
        <template #default="{ row }">
          <div class="api-name-cell">
            <strong>{{ row.name }}</strong>
            <span class="slug-tag">{{ row.slug }}</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="分类" width="100">
        <template #default="{ row }">
          <el-tag type="info" size="small">{{ row.category_name || '未分类' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="方法" width="80">
        <template #default="{ row }">
          <span class="method-badge" :class="row.method?.toLowerCase()">{{ row.method }}</span>
        </template>
      </el-table-column>
      <el-table-column label="类型" width="80">
        <template #default="{ row }">
          <el-tag :type="row.is_free ? 'success' : 'warning'" size="small">{{ row.is_free ? '免费' : '付费' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="来源" width="90">
        <template #default="{ row }">
          <el-tag :type="row.source === 'local' ? 'primary' : 'info'" size="small">
            {{ row.source === 'local' ? '内置' : '外部' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="calls_count" label="调用次数" width="100" />
      <el-table-column label="积分消耗" width="100" align="center">
        <template #default="{ row }">
          <span v-if="row.credits_cost > 0" class="credits-cost-badge">{{ row.credits_cost }}</span>
          <span v-else class="credits-free-tag">免费</span>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="80">
        <template #default="{ row }">
          <el-tag :type="row.status ? 'success' : 'danger'" size="small">{{ row.status ? '上线' : '下线' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="版本" width="80">
        <template #default="{ row }">
          <el-tag size="small" type="info">{{ row.current_version || 'v1' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="220" fixed="right">
        <template #default="{ row }">
          <el-button type="primary" text size="small" @click="openEdit(row)">编辑</el-button>
          <el-button type="info" text size="small" @click="openVersionManager(row)">版本</el-button>
          <el-button type="warning" text size="small" @click="toggleStatus(row)">{{ row.status ? '下线' : '上线' }}</el-button>
          <el-button type="danger" text size="small" @click="deleteApi(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <div class="pagination-wrap">
      <el-pagination
        v-model:current-page="page"
        :page-size="15"
        :total="total"
        layout="total, prev, pager, next"
        background
        @current-change="loadApis"
      />
    </div>

    <!-- 新增/编辑弹窗 -->
    <el-dialog v-model="showDialog" :title="editingApi ? '编辑接口' : '新增接口'" width="900px" :destroy-on-close="true">
      <el-form :model="form" label-width="90px">
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="接口名称" required>
              <el-input v-model="form.name" placeholder="如：随机一言" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="标识Slug" required>
              <el-input v-model="form.slug" placeholder="如：hitokoto（字母数字-）" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="分类">
              <el-select v-model="form.category_id" placeholder="选择分类" clearable style="width:100%">
                <el-option v-for="c in categories" :key="c.id" :label="c.icon+' '+c.name" :value="c.id" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="请求方法">
              <el-select v-model="form.method" style="width:100%">
                <el-option value="GET" /><el-option value="POST" /><el-option value="PUT" /><el-option value="DELETE" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="排序权重">
              <el-input-number v-model="form.sort_order" :min="0" style="width:100%" />
            </el-form-item>
          </el-col>
        </el-row>
        <!-- 接口来源 -->
        <el-form-item label="接口来源">
          <div class="source-selector">
            <el-radio-group v-model="form.source">
              <el-radio value="local" class="source-radio">
                <el-icon><Box /></el-icon>
                <span class="source-title">内置接口</span>
                <span class="source-desc">项目自己实现的接口</span>
              </el-radio>
              <el-radio value="external" class="source-radio">
                <el-icon><Connection /></el-icon>
                <span class="source-title">外部接口</span>
                <span class="source-desc">第三方API，后端代理转发</span>
              </el-radio>
            </el-radio-group>
          </div>
        </el-form-item>

        <!-- 内置接口选择器 -->
        <el-form-item v-if="form.source === 'local'" label="选择内置接口">
          <div class="local-api-selector" v-loading="localApisLoading">
            <!-- 搜索框 -->
            <div class="local-api-search">
              <el-input
                v-model="localApiKeyword"
                placeholder="搜索内置接口..."
                size="small"
                clearable
                @input="onLocalApiSearch"
              >
                <template #prefix><el-icon><Search /></el-icon></template>
              </el-input>
            </div>
            <div v-if="localApiList.length === 0 && !localApisLoading" class="no-apis-hint">
              <el-icon><WarningFilled /></el-icon>
              <span>暂无匹配的内置接口</span>
            </div>
            <div v-else class="local-api-list">
              <div
                v-for="api in localApiList"
                :key="api.slug"
                class="local-api-item"
                :class="{ 'is-imported': api.is_imported, 'is-selected': form.slug === api.slug }"
                @click="!api.is_imported && selectLocalApi(api)"
              >
                <div class="local-api-info">
                  <span class="local-api-name">{{ api.name }}</span>
                  <code class="local-api-slug">{{ api.slug }}</code>
                </div>
                <div class="local-api-meta">
                  <el-tag size="small" type="info">{{ api.method }}</el-tag>
                  <el-tag v-if="api.is_imported" size="small" type="success">已导入</el-tag>
                  <el-tag v-else size="small" type="warning">未导入</el-tag>
                </div>
              </div>
            </div>
            <!-- 分页 -->
            <div v-if="localApiTotal > localApiPageSize" class="local-api-pagination">
              <el-pagination
                v-model:current-page="localApiPage"
                :page-size="localApiPageSize"
                :total="localApiTotal"
                layout="prev, pager, next"
                background
                small
                @current-change="loadLocalApis"
              />
            </div>
          </div>
        </el-form-item>

        <el-form-item label="接口地址" required>
          <div class="endpoint-input-group">
            <el-input 
              v-model="form.endpoint" 
              :placeholder="form.source === 'local' ? 'local://api-name' : 'https://api.example.com/v1/xxx'" 
              style="flex:1" 
              :disabled="isFromLocal"
            />
            <el-button @click="fillCurrentDomain" :disabled="isFromLocal" title="自动填充当前域名">
              <el-icon><Link /></el-icon> 填充域名
            </el-button>
            <el-button @click="fillProxyPath" :disabled="isFromLocal" title="填充代理地址">
              <el-icon><Promotion /></el-icon> 代理地址
            </el-button>
          </div>
          <div class="endpoint-hint" v-if="form.source === 'local'">
            <el-icon><InfoFilled /></el-icon>
            内置接口请使用 local:// 协议，如 local://uuid
          </div>
          <div class="endpoint-hint" v-else>
            <el-icon><InfoFilled /></el-icon>
            外部接口由后端代理转发，格式：https://目标API地址
          </div>
          <div class="endpoint-locked-hint" v-if="isFromLocal">
            <el-icon><Lock /></el-icon>
            已从内置接口填充，关键字段已锁定，不可手动修改
          </div>
        </el-form-item>
        <el-form-item label="接口描述">
          <el-input v-model="form.description" type="textarea" :rows="2" />
        </el-form-item>
        <el-form-item label="请求参数">
          <div class="params-editor">
            <div v-for="(p, i) in form.params" :key="i" class="param-row">
              <el-input v-model="p.name" placeholder="参数名" size="small" style="width:100px" />
              <el-select v-model="p.type" size="small" style="width:80px">
                <el-option value="string" /><el-option value="number" /><el-option value="boolean" />
              </el-select>
              <el-input v-model="p.description" placeholder="说明" size="small" style="flex:1" />
              <el-input v-model="p.example" placeholder="示例值" size="small" style="width:100px" />
              <el-checkbox v-model="p.required" size="small">必填</el-checkbox>
              <el-button type="danger" text size="small" @click="removeParam(i)"><el-icon><Delete /></el-icon></el-button>
            </div>
            <el-button text size="small" @click="addParam" style="color:var(--primary)"><el-icon><Plus /></el-icon> 添加参数</el-button>
          </div>
        </el-form-item>
        <el-form-item label="返回示例">
          <el-input v-model="form.response_example" type="textarea" :rows="4" placeholder='{"code":200,"data":{...}}' />
        </el-form-item>

        <!-- 接口文档 -->
        <el-form-item label="接口文档">
          <div class="doc-editor-wrap">
            <div class="doc-editor-toolbar">
              <span class="doc-label">支持 Markdown 格式</span>
              <div class="doc-toolbar-btns">
                <el-button text size="small" @click="insertMd('## 接口说明\n\n')">H2</el-button>
                <el-button text size="small" @click="insertMd('### 注意事项\n\n')">H3</el-button>
                <el-button text size="small" @click="insertMd('**加粗**')">B</el-button>
                <el-button text size="small" @click="insertMd('`代码`')">&lt;/&gt;</el-button>
                <el-button text size="small" @click="insertCodeBlock">代码块</el-button>
                <el-button text size="small" @click="insertTableBlock">表格</el-button>
                <el-button text size="small" @click="insertMd('\n- 条目一\n- 条目二\n')">列表</el-button>
                <el-button text size="small" @click="insertDocTemplate">插入模板</el-button>
              </div>
            </div>
            <el-tabs v-model="docEditTab" class="doc-tabs">
              <el-tab-pane label="✏️ 编辑" name="edit">
                <el-input
                  ref="docTextareaRef"
                  v-model="form.doc_content"
                  type="textarea"
                  :rows="16"
                  placeholder="在此输入接口文档，支持 Markdown 格式&#10;&#10;## 接口说明&#10;描述接口功能...&#10;&#10;## 请求说明&#10;...&#10;&#10;## 错误码&#10;| 错误码 | 说明 |&#10;| --- | --- |&#10;| 200 | 成功 |"
                  class="doc-textarea"
                />
              </el-tab-pane>
              <el-tab-pane label="👁 预览" name="preview">
                <div class="doc-preview" v-html="renderMarkdown(form.doc_content)"></div>
              </el-tab-pane>
            </el-tabs>
          </div>
        </el-form-item>

        <el-row :gutter="16">
          <el-col :span="6">
            <el-form-item label="免费接口">
              <el-switch v-model="form.is_free" />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="需要认证">
              <el-switch v-model="form.require_auth" />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="上线状态">
              <el-switch v-model="form.status" />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="主题适配">
              <el-select v-model="form.theme" style="width:100%">
                <el-option value="both" label="通用" />
                <el-option value="dark" label="暗色" />
                <el-option value="light" label="亮色" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="8">
            <el-form-item label="积分消耗">
              <el-input-number v-model="form.credits_cost" :min="0" :max="9999" style="width:100%" placeholder="0=免费" />
            </el-form-item>
          </el-col>
          <el-col :span="16"></el-col>
        </el-row>
        <div class="credits-hint" v-if="form.credits_cost > 0">
          <el-icon><InfoFilled /></el-icon>
          调用此接口将扣除 {{ form.credits_cost }} 积分（0=免费接口）
        </div>
        <div class="credits-hint credits-free" v-else>
          <el-icon><CircleCheck /></el-icon>
          此接口为免费接口，不扣除积分
        </div>
      </el-form>
      <template #footer>
        <el-button @click="showDialog = false">取消</el-button>
        <el-button type="primary" @click="saveApi" :loading="saving">保存</el-button>
      </template>
    </el-dialog>

    <!-- 版本管理弹窗 -->
    <el-dialog v-model="showVersionDialog" :title="`版本管理 - ${versionApi?.name || ''}`" width="900px" destroy-on-close>
      <div class="version-manager">
        <div class="version-header">
          <el-button type="primary" size="small" @click="createNewVersion">
            <el-icon><Plus /></el-icon> 新建版本
          </el-button>
          <el-button size="small" @click="forkCurrentVersion">
            <el-icon><CopyDocument /></el-icon> 从当前版本复制
          </el-button>
        </div>
        <el-table :data="versions" v-loading="versionsLoading" style="margin-top: 16px;">
          <el-table-column prop="version" label="版本号" width="100">
            <template #default="{ row }">
              <el-tag :type="row.is_active ? 'success' : 'info'">{{ row.version }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="100">
            <template #default="{ row }">
              <el-tag v-if="row.is_active" type="success" size="small">当前版本</el-tag>
              <el-tag v-else type="info" size="small">历史版本</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="endpoint" label="接口地址" min-width="200" show-overflow-tooltip />
          <el-table-column prop="changelog" label="更新说明" min-width="150" show-overflow-tooltip />
          <el-table-column prop="created_at" label="创建时间" width="160">
            <template #default="{ row }">
              {{ formatDate(row.created_at) }}
            </template>
          </el-table-column>
          <el-table-column label="操作" width="180">
            <template #default="{ row }">
              <el-button type="primary" text size="small" @click="editVersion(row)">编辑</el-button>
              <el-button v-if="!row.is_active" type="success" text size="small" @click="activateVersion(row)">激活</el-button>
              <el-button v-if="!row.is_active" type="danger" text size="small" @click="deleteVersion(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </el-dialog>

    <!-- 版本编辑弹窗 -->
    <el-dialog v-model="showVersionEditDialog" :title="editingVersion ? '编辑版本' : '新建版本'" width="800px" destroy-on-close>
      <el-form :model="versionForm" label-width="100px">
        <el-form-item label="版本号" required>
          <el-input v-model="versionForm.version" placeholder="如 v2 或 1.0.0" :disabled="!!editingVersion" />
        </el-form-item>
        <el-form-item label="接口地址" required>
          <el-input v-model="versionForm.endpoint" placeholder="https://api.example.com/v2/xxx" />
        </el-form-item>
        <el-form-item label="更新说明">
          <el-input v-model="versionForm.changelog" type="textarea" :rows="2" placeholder="描述此版本的变更内容" />
        </el-form-item>
        <el-form-item label="请求参数">
          <div class="params-editor">
            <div v-for="(p, i) in versionForm.params" :key="i" class="param-row">
              <el-input v-model="p.name" placeholder="参数名" size="small" style="width:100px" />
              <el-select v-model="p.type" size="small" style="width:80px">
                <el-option value="string" /><el-option value="number" /><el-option value="boolean" />
              </el-select>
              <el-input v-model="p.description" placeholder="说明" size="small" style="flex:1" />
              <el-input v-model="p.example" placeholder="示例值" size="small" style="width:100px" />
              <el-checkbox v-model="p.required" size="small">必填</el-checkbox>
              <el-button type="danger" text size="small" @click="versionForm.params.splice(i, 1)"><el-icon><Delete /></el-icon></el-button>
            </div>
            <el-button text size="small" @click="versionForm.params.push({ name: '', type: 'string', description: '', example: '', required: false })" style="color:var(--primary)">
              <el-icon><Plus /></el-icon> 添加参数
            </el-button>
          </div>
        </el-form-item>
        <el-form-item label="返回示例">
          <el-input v-model="versionForm.response_example" type="textarea" :rows="4" placeholder='{"code":200,"data":{...}}' />
        </el-form-item>
        <el-form-item label="接口文档">
          <MarkdownEditor v-model="versionForm.doc_content" />
        </el-form-item>
        <el-form-item label="设为当前版本">
          <el-switch v-model="versionForm.is_active" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showVersionEditDialog = false">取消</el-button>
        <el-button type="primary" @click="saveVersion" :loading="versionSaving">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, toRaw, computed, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { adminApi, apiApi, http } from '../../api'
import MarkdownEditor from '../../components/MarkdownEditor.vue'

// 安全的 JSON.parse 封装，解析失败时返回默认值
function safeJsonParse(str, defaultValue) {
  if (!str) return defaultValue
  try {
    return JSON.parse(str)
  } catch (e) {
    console.warn('JSON.parse 解析失败:', e)
    return defaultValue
  }
}

const apis = ref([])
const categories = ref([])
const loading = ref(false)
const saving = ref(false)
const total = ref(0)
const page = ref(1)
const keyword = ref('')
const filterCategory = ref('')
const showDialog = ref(false)
const editingApi = ref(null)
const docEditTab = ref('edit')
const docTextareaRef = ref(null)

// 内置接口相关
const availableLocalApis = ref([])
const localApisLoading = ref(false)
const localApiKeyword = ref('')
const localApiPage = ref(1)
const localApiPageSize = ref(20)
const localApiTotal = ref(0)
const localApiList = computed(() => availableLocalApis.value)
let localApiSearchTimer = null
// 是否来自内置接口选择（锁定字段用）
const isFromLocal = ref(false)

const defaultForm = () => ({
  name: '', slug: '', category_id: null, description: '', endpoint: '',
  method: 'GET', params: [], response_example: '', doc_content: '', source: 'external',
  is_free: true, require_auth: false, status: true, sort_order: 0, theme: 'both', credits_cost: 0,
})
const form = reactive(defaultForm())

// 监听接口来源变化
watch(() => form.source, (newVal) => {
  if (newVal === 'local' && availableLocalApis.value.length === 0) {
    loadLocalApis()
  }
})

// 加载内置接口列表（支持分页）
async function loadLocalApis() {
  localApisLoading.value = true
  try {
    const res = await adminApi.getAvailableLocalApis({
      page: localApiPage.value,
      limit: localApiPageSize.value,
      keyword: localApiKeyword.value
    })
    if (res.code === 200) {
      availableLocalApis.value = res.data.list || res.data || []
      localApiTotal.value = res.data.total || availableLocalApis.value.length
    }
  } catch (e) {
    console.error('加载内置接口失败:', e)
    ElMessage.error('加载内置接口失败')
  } finally {
    localApisLoading.value = false
  }
}

// 内置接口搜索（防抖）
function onLocalApiSearch() {
  if (localApiSearchTimer) clearTimeout(localApiSearchTimer)
  localApiSearchTimer = setTimeout(() => {
    localApiPage.value = 1
    loadLocalApis()
  }, 300)
}

// 选中内置接口后填充表单（自动锁定关键字段）
function selectLocalApi(api) {
  isFromLocal.value = true
  form.name = api.name
  form.slug = api.slug
  form.category_id = api.category_id || null
  form.description = api.description || ''
  form.method = api.method || 'GET'
  form.endpoint = `local://${api.slug}`
  form.params = typeof api.params === 'string' ? safeJsonParse(api.params, []) : (api.params || [])
  form.response_example = api.response_example || ''
  form.is_free = api.is_free !== false
  form.require_auth = api.require_auth === true
  form.theme = api.theme || 'both'
  // 自动填充文档内容（如果有）
  if (api.doc_content) {
    form.doc_content = api.doc_content
  }
  ElMessage.success(`已从「${api.name}」自动填充接口信息，关键字段已锁定`)
}

// 获取已导入的内置接口slug列表
const importedSlugs = computed(() => {
  return availableLocalApis.value.filter(a => a.is_imported).map(a => a.slug)
})

// 简易 Markdown 渲染（无需依赖库）
function renderMarkdown(text) {
  if (!text) return '<p style="color:var(--text-muted);font-size:13px">暂无文档内容</p>'
  let html = text
    // 代码块
    .replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) =>
      `<pre class="md-code-block"><code class="lang-${lang}">${escapeHtml(code.trim())}</code></pre>`)
    // 行内代码
    .replace(/`([^`]+)`/g, '<code class="md-inline-code">$1</code>')
    // H3
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    // H2
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    // H1
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    // 表格
    .replace(/^\|(.+)\|$/gm, (match) => {
      if (match.includes('---')) return '<tr class="md-divider"></tr>'
      const cells = match.slice(1, -1).split('|').map(s => s.trim())
      return '<tr>' + cells.map(c => `<td>${c}</td>`).join('') + '</tr>'
    })
    // 加粗
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // 斜体
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // 无序列表
    .replace(/^[-*] (.+)$/gm, '<li>$1</li>')
    // 有序列表
    .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
    // 分隔线
    .replace(/^---+$/gm, '<hr>')
    // 段落
    .replace(/\n\n/g, '</p><p>')
  // 包裹表格
  html = html.replace(/(<tr>[\s\S]*?<\/tr>(\s*<tr class="md-divider"><\/tr>\s*)?)+/g, (match) => {
    const rows = match.split('\n').filter(r => r.trim() && !r.includes('md-divider'))
    if (rows.length < 2) return match
    const header = rows[0].replace(/<td>/g, '<th>').replace(/<\/td>/g, '</th>')
    const body = rows.slice(1).join('\n')
    return `<table class="md-table"><thead>${header}</thead><tbody>${body}</tbody></table>`
  })
  // 包裹列表
  html = html.replace(/(<li>[\s\S]*?<\/li>\n?)+/g, match => `<ul>${match}</ul>`)
  return `<p>${html}</p>`
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function insertMd(text) {
  const textarea = docTextareaRef.value?.$el?.querySelector('textarea')
  if (textarea) {
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const before = form.doc_content.slice(0, start)
    const after = form.doc_content.slice(end)
    form.doc_content = before + text + after
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(start + text.length, start + text.length)
    }, 10)
  } else {
    form.doc_content += text
  }
}

function insertCodeBlock() {
  insertMd('\n```json\n{\n  "code": 200\n}\n```\n')
}

function insertTableBlock() {
  insertMd('\n| 字段 | 类型 | 说明 |\n| --- | --- | --- |\n| code | number | 状态码 |\n')
}

function insertDocTemplate() {
  const tpl = `## 接口说明

描述接口的主要功能和使用场景。

## 请求说明

- **请求方式**：GET
- **接口地址**：\`/api/proxy/your-slug\`
- **认证方式**：在请求头添加 \`X-Api-Key: 你的API密钥\`

## 请求参数

| 参数名 | 类型 | 必填 | 说明 | 示例 |
| --- | --- | --- | --- | --- |
| param1 | string | 否 | 参数说明 | example |

## 返回字段说明

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| code | number | 状态码，200 表示成功 |
| data | object | 返回数据 |
| message | string | 提示信息 |

## 错误码

| 错误码 | 说明 |
| --- | --- |
| 200 | 请求成功 |
| 400 | 参数错误 |
| 401 | 未授权，请检查 API 密钥 |
| 429 | 请求频率超限 |
| 500 | 服务器内部错误 |

## 注意事项

- 请勿频繁请求，建议做好缓存
- 免费接口每日限额 500 次
`
  form.doc_content = tpl
}

// 填充当前域名
function fillCurrentDomain() {
  const baseUrl = window.location.origin
  form.endpoint = baseUrl
}

// 填充代理地址（当前域名 + /api/proxy/）
function fillProxyPath() {
  const baseUrl = window.location.origin
  const slug = form.slug || 'your-slug'
  form.endpoint = `${baseUrl}/api/proxy/${slug}`
}

let searchTimer = null
function onSearch() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => { page.value = 1; loadApis() }, 500)
}

async function loadApis() {
  loading.value = true
  try {
    const res = await adminApi.getApis({ page: page.value, limit: 15, keyword: keyword.value, category: filterCategory.value })
    if (res.code === 200) { apis.value = res.data.list; total.value = res.data.total }
  } finally { loading.value = false }
}

async function loadCategories() {
  try {
    const res = await apiApi.getCategories()
    if (res.code === 200) categories.value = res.data
  } catch (e) {
    console.error('加载分类失败:', e)
    ElMessage.error('加载分类失败')
  }
}

function openCreate() {
  editingApi.value = null
  isFromLocal.value = false
  Object.assign(form, defaultForm())
  docEditTab.value = 'edit'
  showDialog.value = true
}

function openEdit(api) {
  editingApi.value = api
  isFromLocal.value = api.source === 'local' && !!api.endpoint?.startsWith('local://')
  Object.assign(form, {
    ...api,
    params: safeJsonParse(api.params, []),
    doc_content: api.doc_content || '',
    source: api.source || 'external',
    is_free: !!api.is_free,
    require_auth: !!api.require_auth,
    status: !!api.status,
    theme: api.theme || 'both',
    credits_cost: api.credits_cost || 0,
  })
  docEditTab.value = 'edit'
  showDialog.value = true
}

function addParam() {
  form.params.push({ name: '', type: 'string', description: '', example: '', required: false })
}
function removeParam(i) { form.params.splice(i, 1) }

async function saveApi() {
  if (!form.name || !form.endpoint) return ElMessage.warning('接口名称和地址必填')
  if (!form.slug) return ElMessage.warning('接口标识Slug必填')
  if (!/^[a-zA-Z0-9][a-zA-Z0-9\-_]*$/.test(form.slug)) return ElMessage.warning('Slug格式无效，仅允许字母、数字、连字符和下划线，且必须以字母或数字开头')
  saving.value = true
  try {
    // 使用 toRaw 获取原始对象，确保所有属性正确序列化
    const rawForm = toRaw(form)
    const data = {
      name: rawForm.name,
      slug: rawForm.slug,
      category_id: rawForm.category_id,
      description: rawForm.description,
      endpoint: rawForm.endpoint,
      method: rawForm.method,
      params: rawForm.params,
      headers: rawForm.headers || {},
      response_example: rawForm.response_example,
      doc_content: rawForm.doc_content || '',
      source: rawForm.source || 'external',
      is_free: rawForm.is_free,
      require_auth: rawForm.require_auth,
      status: rawForm.status,
      sort_order: rawForm.sort_order || 0,
      theme: rawForm.theme || 'both',
      credits_cost: rawForm.credits_cost || 0,
    }
    const res = editingApi.value
      ? await adminApi.updateApi(editingApi.value.id, data)
      : await adminApi.createApi(data)
    if (res.code === 200) {
      ElMessage.success(res.message)
      showDialog.value = false
      loadApis()
    } else ElMessage.error(res.message)
  } finally { saving.value = false }
}

async function toggleStatus(api) {
  try {
    const res = await adminApi.updateApi(api.id, { ...api, params: safeJsonParse(api.params, []), status: !api.status })
    if (res.code === 200) { ElMessage.success(res.message); loadApis() }
  } catch (e) {
    console.error('切换状态失败:', e)
    ElMessage.error('切换状态失败')
  }
}

async function deleteApi(api) {
  try {
    await ElMessageBox.confirm(`确认永久删除接口「${api.name}」？此操作不可恢复！`, '危险操作', { type: 'error' })
    const res = await adminApi.hardDeleteApi(api.id)
    if (res.code === 200) { ElMessage.success(res.message); loadApis() }
  } catch (e) {
    if (e !== 'cancel') {
      console.error('删除接口失败:', e)
      ElMessage.error('删除接口失败')
    }
  }
}

onMounted(() => { loadApis(); loadCategories() })

// ========== 版本管理 ==========
const showVersionDialog = ref(false)
const showVersionEditDialog = ref(false)
const versionApi = ref(null)
const versions = ref([])
const versionsLoading = ref(false)
const editingVersion = ref(null)
const versionSaving = ref(false)
const versionForm = reactive({
  version: '',
  endpoint: '',
  params: [],
  headers: {},
  response_example: '',
  doc_content: '',
  changelog: '',
  is_active: false
})

function formatDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleString('zh-CN')
}

async function openVersionManager(api) {
  versionApi.value = api
  showVersionDialog.value = true
  await loadVersions()
}

async function loadVersions() {
  if (!versionApi.value) return
  versionsLoading.value = true
  try {
    const res = await http.get(`/apis/${versionApi.value.id}/versions`)
    if (res.code === 200) {
      versions.value = res.data
    }
  } catch (e) {
    console.error('加载版本失败:', e)
  } finally {
    versionsLoading.value = false
  }
}

function createNewVersion() {
  editingVersion.value = null
  Object.assign(versionForm, {
    version: '',
    endpoint: versionApi.value?.endpoint || '',
    params: [],
    headers: {},
    response_example: '',
    doc_content: '',
    changelog: '',
    is_active: false
  })
  showVersionEditDialog.value = true
}

async function forkCurrentVersion() {
  try {
    const newVersion = await ElMessageBox.prompt('请输入新版本号', '从当前版本复制', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      inputPattern: /^(v\d+|\d+\.\d+\.\d+)$/,
      inputErrorMessage: '版本号格式无效，如 v2 或 1.0.0'
    })
    const res = await http.post(`/apis/${versionApi.value.id}/versions/fork`, {
      version: newVersion.value,
      changelog: '从当前版本复制'
    })
    if (res.code === 200) {
      ElMessage.success('版本复制成功')
      loadVersions()
    } else {
      ElMessage.error(res.message)
    }
  } catch (e) {
    // 用户取消
  }
}

function editVersion(v) {
  editingVersion.value = v
  Object.assign(versionForm, {
    version: v.version,
    endpoint: v.endpoint,
    params: typeof v.params === 'string' ? safeJsonParse(v.params, []) : (v.params || []),
    headers: typeof v.headers === 'string' ? safeJsonParse(v.headers, {}) : (v.headers || {}),
    response_example: v.response_example || '',
    doc_content: v.doc_content || '',
    changelog: v.changelog || '',
    is_active: !!v.is_active
  })
  showVersionEditDialog.value = true
}

async function saveVersion() {
  if (!versionForm.version || !versionForm.endpoint) {
    return ElMessage.warning('版本号和接口地址必填')
  }
  versionSaving.value = true
  try {
    const data = {
      ...versionForm,
      params: versionForm.params,
      headers: versionForm.headers
    }
    let res
    if (editingVersion.value) {
      res = await http.put(`/apis/${versionApi.value.id}/versions/${editingVersion.value.version}`, data)
    } else {
      res = await http.post(`/apis/${versionApi.value.id}/versions`, data)
    }
    if (res.code === 200) {
      ElMessage.success(res.message)
      showVersionEditDialog.value = false
      loadVersions()
      loadApis()
    } else {
      ElMessage.error(res.message)
    }
  } finally {
    versionSaving.value = false
  }
}

async function activateVersion(v) {
  try {
    await ElMessageBox.confirm(`确认将版本 ${v.version} 设为当前版本？`, '切换版本')
    const res = await http.post(`/apis/${versionApi.value.id}/versions/${v.version}/activate`)
    if (res.code === 200) {
      ElMessage.success('版本已切换')
      loadVersions()
      loadApis()
    }
  } catch (e) {
    if (e !== 'cancel') {
      console.error('激活版本失败:', e)
      ElMessage.error('激活版本失败')
    }
  }
}

async function deleteVersion(v) {
  try {
    await ElMessageBox.confirm(`确认删除版本 ${v.version}？`, '删除版本', { type: 'warning' })
    const res = await http.delete(`/apis/${versionApi.value.id}/versions/${v.version}`)
    if (res.code === 200) {
      ElMessage.success('版本已删除')
      loadVersions()
    }
  } catch (e) {
    if (e !== 'cancel') {
      console.error('删除版本失败:', e)
      ElMessage.error('删除版本失败')
    }
  }
}
</script>

<style lang="scss" scoped>
.manager-page { display: flex; flex-direction: column; gap: 20px; }
.manager-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  h2 { font-size: 20px; font-weight: 700; color: var(--text-primary); }
}
.header-actions { display: flex; gap: 12px; align-items: center; }
.pagination-wrap { display: flex; justify-content: flex-end; margin-top: 16px; }

.api-name-cell { display: flex; flex-direction: column; gap: 4px; }
.slug-tag { font-size: 11px; color: var(--text-muted); font-family: monospace; background: var(--bg-card2); padding: 1px 6px; border-radius: 4px; width: fit-content; }

.method-badge {
  font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 6px; font-family: monospace;
  &.get { background: rgba(103,194,58,0.12); color: var(--success); }
  &.post { background: rgba(64,158,255,0.12); color: var(--info); }
  &.put { background: rgba(233,147,18,0.12); color: var(--primary); }
  &.delete { background: rgba(245,108,108,0.12); color: var(--danger); }
}

.credits-cost-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 2px 10px;
  background: rgba(233, 147, 18, 0.12);
  color: var(--primary);
  border-radius: 10px;
  font-size: 12px;
  font-weight: 600;
  font-family: 'Consolas', monospace;
  min-width: 28px;
}

.credits-free-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 2px 8px;
  background: rgba(103, 194, 58, 0.1);
  color: var(--success);
  border-radius: 10px;
  font-size: 11px;
  font-weight: 500;
}

.endpoint-input-group {
  display: flex;
  gap: 8px;
  align-items: center;
}

.params-editor {
  background: var(--bg-card2);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}
.param-row { display: flex; align-items: center; gap: 8px; }

// 文档编辑器
.doc-editor-wrap {
  width: 100%;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  overflow: hidden;
}
.doc-editor-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 12px;
  background: var(--bg-card2);
  border-bottom: 1px solid var(--border);
  flex-wrap: wrap;
  gap: 6px;
}
.doc-label { font-size: 12px; color: var(--text-muted); white-space: nowrap; }
.doc-toolbar-btns {
  display: flex;
  gap: 2px;
  flex-wrap: wrap;
  :deep(.el-button) {
    font-size: 12px;
    padding: 2px 8px;
    height: 26px;
    color: var(--text-secondary);
    &:hover { color: var(--primary); background: rgba(233,147,18,0.08); }
  }
}
.doc-tabs {
  :deep(.el-tabs__header) {
    margin: 0;
    padding: 0 12px;
    background: var(--bg-card2);
  }
  :deep(.el-tabs__content) { padding: 0; }
  :deep(.doc-textarea .el-textarea__inner) {
    border: none;
    border-radius: 0;
    background: var(--bg-card);
    font-family: 'Consolas', 'Monaco', monospace;
    font-size: 13px;
    color: var(--text-primary);
    line-height: 1.7;
    resize: vertical;
    &:focus { box-shadow: none; }
  }
}
.doc-preview {
  padding: 16px 20px;
  min-height: 200px;
  max-height: 400px;
  overflow-y: auto;
  background: var(--bg-card);
  font-size: 14px;
  line-height: 1.8;
  color: var(--text-primary);
  :deep(h1) { font-size: 20px; font-weight: 700; margin: 16px 0 8px; color: var(--text-primary); border-bottom: 1px solid var(--border); padding-bottom: 8px; }
  :deep(h2) { font-size: 16px; font-weight: 600; margin: 16px 0 8px; color: var(--text-primary); padding-left: 10px; border-left: 3px solid var(--primary); }
  :deep(h3) { font-size: 14px; font-weight: 600; margin: 12px 0 6px; color: var(--text-secondary); }
  :deep(p) { margin: 0 0 10px; color: var(--text-secondary); }
  :deep(strong) { color: var(--text-primary); font-weight: 600; }
  :deep(em) { font-style: italic; color: var(--text-secondary); }
  :deep(ul) { padding-left: 20px; margin: 8px 0; }
  :deep(li) { color: var(--text-secondary); margin: 4px 0; }
  :deep(hr) { border: none; border-top: 1px solid var(--border); margin: 16px 0; }
  :deep(.md-inline-code) {
    font-family: monospace;
    font-size: 12px;
    background: var(--bg-card2);
    color: var(--primary);
    padding: 1px 6px;
    border-radius: 4px;
    border: 1px solid var(--border);
  }
  :deep(.md-code-block) {
    background: var(--code-bg);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    padding: 12px 16px;
    margin: 8px 0;
    overflow-x: auto;
    code {
      font-family: monospace;
      font-size: 12px;
      color: var(--code-text);
      white-space: pre-wrap;
      word-break: break-all;
    }
  }
  :deep(.md-table) {
    width: 100%;
    border-collapse: collapse;
    margin: 8px 0;
    font-size: 13px;
    th {
      background: var(--bg-card2);
      color: var(--text-primary);
      font-weight: 600;
      padding: 8px 12px;
      border: 1px solid var(--border);
      text-align: left;
    }
    td {
      padding: 7px 12px;
      border: 1px solid var(--border);
      color: var(--text-secondary);
    }
    tr:hover td { background: var(--row-hover-bg); }
  }
}
.source-selector {
  width: 100%;
  :deep(.el-radio-group) {
    display: flex;
    flex-direction: row;
    gap: 16px;
    flex-wrap: wrap;
    align-items: stretch;
  }
}
:deep(.source-radio) {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 10px;
  padding: 14px 18px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg-card2);
  transition: all 0.2s;
  flex: 1;
  min-width: 200px;
  max-width: 300px;
  cursor: pointer;
  .el-icon { font-size: 20px; color: var(--text-secondary); }
  .source-title { font-weight: 600; font-size: 14px; color: var(--text-primary); }
  .source-desc { font-size: 12px; color: var(--text-muted); display: block; }
  &:hover { border-color: var(--primary); background: rgba(233,147,18,0.05); }
  &.is-checked { border-color: var(--primary); background: rgba(233,147,18,0.08); .el-icon { color: var(--primary); } }
  .el-radio__label { display: contents; }
}
.endpoint-hint {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 6px;
  font-size: 12px;
  color: var(--info);
}
.endpoint-locked-hint {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 6px;
  font-size: 12px;
  color: var(--primary);
  background: rgba(233, 147, 18, 0.08);
  padding: 6px 10px;
  border-radius: var(--radius-sm);
  border: 1px solid rgba(233, 147, 18, 0.2);
}
.credits-hint {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 12px;
  padding: 10px 14px;
  background: rgba(233, 147, 18, 0.08);
  border: 1px solid rgba(233, 147, 18, 0.15);
  border-radius: var(--radius-sm);
  font-size: 13px;
  color: var(--primary);
  &.credits-free {
    background: rgba(103, 194, 58, 0.08);
    border-color: rgba(103, 194, 58, 0.15);
    color: var(--success);
  }
}

// 内置接口选择器
.local-api-selector {
  width: 100%;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg-card2);
  max-height: 380px;
  display: flex;
  flex-direction: column;
}
.local-api-search {
  padding: 10px 12px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}
.no-apis-hint {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px;
  color: var(--text-muted);
  font-size: 13px;
}
.local-api-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 8px;
  padding: 12px;
  overflow-y: auto;
  flex: 1;
}
.local-api-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg-card);
  cursor: pointer;
  transition: all 0.2s;
  &:hover:not(.is-imported) {
    border-color: var(--primary);
    background: rgba(233, 147, 18, 0.05);
  }
  &.is-selected {
    border-color: var(--primary);
    background: rgba(233, 147, 18, 0.1);
    .local-api-name { color: var(--primary); }
  }
  &.is-imported {
    opacity: 0.5;
    cursor: not-allowed;
  }
}
.local-api-pagination {
  padding: 8px 12px;
  border-top: 1px solid var(--border);
  display: flex;
  justify-content: center;
  flex-shrink: 0;
  :deep(.el-pagination) {
    .el-pager li { background: var(--bg-card); border-color: var(--border); color: var(--text-secondary); }
    .btn-prev, .btn-next { background: var(--bg-card); border-color: var(--border); color: var(--text-secondary); }
  }
}
.local-api-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.local-api-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}
.local-api-slug {
  font-size: 11px;
  font-family: Consolas, monospace;
  color: var(--text-muted);
  background: var(--bg-card2);
  padding: 1px 4px;
  border-radius: 3px;
  width: fit-content;
}
.local-api-meta {
  display: flex;
  align-items: center;
  gap: 4px;
}

// 版本管理
.version-manager {
  .version-header {
    display: flex;
    gap: 12px;
  }
}
</style>
