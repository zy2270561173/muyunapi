<template>
  <div class="manager-page">
    <div class="manager-header">
      <h2>内置库脚本管理</h2>
      <div class="header-actions">
        <el-button type="primary" @click="showUploadDialog = true">
          <el-icon><Upload /></el-icon> 上传脚本
        </el-button>
      </div>
    </div>

    <!-- 使用说明 -->
    <el-collapse v-model="activeInfo" class="info-collapse">
      <el-collapse-item name="guide">
        <template #title>
          <div class="info-header">
            <el-icon><InfoFilled /></el-icon>
            <span>脚本编写规范</span>
            <el-tag size="small" type="primary">点击展开</el-tag>
          </div>
        </template>

        <div class="guide-content">
          <!-- 格式说明 -->
          <div class="guide-section">
            <h4>📝 基本格式</h4>
            <p>上传包含接口定义的 <code>.js</code> 文件，系统自动解析 <code>==MuYunAPI==</code> 元数据块并导入。</p>
          </div>

          <!-- 元数据字段表 -->
          <div class="guide-section">
            <h4>📋 元数据字段说明</h4>
            <el-table :data="metaFieldTable" size="small" border stripe class="field-table">
              <el-table-column prop="field" label="字段" width="160">
                <template #default="{ row }">
                  <code class="field-code">{{ row.field }}</code>
                </template>
              </el-table-column>
              <el-table-column prop="required" label="必填" width="60" align="center">
                <template #default="{ row }">
                  <el-tag :type="row.required ? 'danger' : 'info'" size="small">{{ row.required ? '是' : '否' }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="desc" label="说明" min-width="200" />
              <el-table-column prop="example" label="示例" min-width="200">
                <template #default="{ row }">
                  <code class="example-code">{{ row.example }}</code>
                </template>
              </el-table-column>
            </el-table>
          </div>

          <!-- 分类ID对照 -->
          <div class="guide-section">
            <h4>📂 分类ID对照表</h4>
            <div class="category-tags">
              <el-tag v-for="c in categoryMap" :key="c.id" class="cat-tag" effect="plain">
                <span class="cat-id">{{ c.id }}</span> {{ c.name }}
              </el-tag>
            </div>
          </div>

          <!-- 代码示例 -->
          <div class="guide-section">
            <h4>💡 完整代码示例</h4>
            <div class="code-tabs">
              <el-radio-group v-model="activeExampleTab" size="small">
              <el-radio-button label="basic">无需认证</el-radio-button>
              <el-radio-button label="auth">需要认证</el-radio-button>
              <el-radio-button label="multi">混合示例</el-radio-button>
            </el-radio-group>
            </div>
            <div class="code-block">
              <div class="code-block-header">
                <span class="code-lang">JavaScript</span>
                <el-button text size="small" @click="copyExample" class="copy-btn">
                  <el-icon><DocumentCopy /></el-icon> 复制
                </el-button>
              </div>
              <pre class="code-pre"><code v-html="highlightedExample"></code></pre>
            </div>
          </div>

          <!-- 注意事项 -->
          <div class="guide-section">
            <h4>⚠️ 注意事项</h4>
            <ul class="note-list">
              <li><strong>execute 方法必须导出</strong>，签名为 <code>async execute(slug, params, req)</code></li>
              <li><strong>slug 全局唯一</strong>，不可与已有接口重复</li>
              <li><strong>认证开关</strong>：<code>@requireAuth true</code> 时，必须在 <code>@params</code> 中添加 <code>apiKey</code> 和 <code>apiSecret</code> 参数，并在 <code>execute</code> 中验证</li>
              <li>认证参数格式：<code>{"name":"apiKey","type":"string","required":true,"description":"MuYunAPI用户Key"}</code> 和 <code>{"name":"apiSecret",...}</code></li>
              <li>认证失败返回：<code>{ code: 401, message: '缺少认证参数' }</code></li>
              <li>返回值会被直接作为 API 响应的 <code>data</code> 字段</li>
              <li>错误处理：<code>throw new Error('信息')</code> 或返回 <code>{ code: 400/500, message: '...' }</code></li>
              <li>可用模块：<code>axios</code>、<code>uuid</code>、<code>nanoid</code> 等已安装的 npm 包可直接 require</li>
              <li>theme 取值：<code>dark</code> / <code>light</code> / <code>both</code></li>
            </ul>
          </div>
        </div>
      </el-collapse-item>
    </el-collapse>

    <!-- 脚本列表 -->
    <div class="script-list" v-loading="loading">
      <el-empty v-if="!loading && scripts.length === 0" description="暂无脚本，点击上方按钮上传" />

      <div v-for="s in scripts" :key="s.filename" class="script-card">
        <div class="script-info">
          <div class="script-name">
            <el-icon><Document /></el-icon>
            <span>{{ s.filename }}</span>
          </div>
          <div class="script-meta">
            <span><el-icon><DocumentCopy /></el-icon> {{ s.api_count }} 个接口</span>
            <span><el-icon><Clock /></el-icon> {{ formatDate(s.modified) }}</span>
            <span><el-icon><Files /></el-icon> {{ formatSize(s.size) }}</span>
          </div>
          <div class="api-tags" v-if="s.apis.length > 0">
            <el-tag v-for="a in s.apis" :key="a.slug" size="small" type="info">{{ a.name }}</el-tag>
          </div>
        </div>
        <div class="script-actions">
          <el-button type="primary" text size="small" @click="viewScript(s.filename)">
            <el-icon><View /></el-icon> 查看
          </el-button>
          <el-button type="warning" text size="small" @click="reimportScript(s)">
            <el-icon><RefreshRight /></el-icon> 重新导入
          </el-button>
          <el-button type="danger" text size="small" @click="deleteScript(s)">
            <el-icon><Delete /></el-icon> 删除
          </el-button>
        </div>
      </div>
    </div>

    <!-- 上传弹窗 -->
    <el-dialog v-model="showUploadDialog" title="上传内置库脚本" width="720px" :destroy-on-close="true">
      <el-upload
        ref="uploadRef"
        class="script-uploader"
        drag
        :auto-upload="false"
        :limit="1"
        accept=".js"
        :on-change="handleFileChange"
        :on-remove="handleFileRemove"
      >
        <el-icon class="el-icon--upload"><upload-filled /></el-icon>
        <div class="el-upload__text">拖拽 JS 文件到此处，或 <em>点击选择</em></div>
        <template #tip>
          <div class="el-upload__tip">只允许上传 <code>.js</code> 文件，最大 1MB</div>
        </template>
      </el-upload>

      <!-- 解析预览 -->
      <div v-if="parsedApis.length > 0" class="parse-preview">
        <div class="preview-header">
          <el-icon><SuccessFilled /></el-icon>
          <span>检测到 {{ parsedApis.length }} 个接口定义，确认导入？</span>
        </div>
        <div class="preview-table">
          <el-table :data="parsedApis" size="small" border>
            <el-table-column prop="name" label="名称" min-width="120" />
            <el-table-column prop="slug" label="Slug" width="140">
              <template #default="{ row }">
                <code>{{ row.slug }}</code>
              </template>
            </el-table-column>
            <el-table-column prop="method" label="方法" width="70" align="center" />
            <el-table-column prop="description" label="描述" min-width="160" show-overflow-tooltip />
          </el-table>
        </div>
      </div>
      <div v-else-if="uploadFile && parsedApis.length === 0" class="parse-empty">
        <el-icon><WarningFilled /></el-icon>
        <span>未检测到接口定义，请检查脚本格式</span>
      </div>

      <template #footer>
        <el-button @click="cancelUpload">取消</el-button>
        <el-button type="primary" @click="submitUpload" :loading="uploading" :disabled="!uploadFile">
          {{ parsedApis.length > 0 ? '确认导入' : '仅保存' }}
        </el-button>
      </template>
    </el-dialog>

    <!-- 脚本内容查看 -->
    <el-dialog v-model="showCodeDialog" :title="viewingFile" width="800px" :destroy-on-close="true">
      <div class="code-viewer">
        <pre><code>{{ viewCode }}</code></pre>
      </div>
      <template #footer>
        <el-button @click="showCodeDialog = false">关闭</el-button>
        <el-button type="warning" @click="reimportScript({ filename: viewingFile })">
          <el-icon><RefreshRight /></el-icon> 重新导入接口
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { UploadFilled } from '@element-plus/icons-vue'
import { http, adminApi } from '../../api'

const scripts = ref([])
const loading = ref(false)
const uploading = ref(false)
const showUploadDialog = ref(false)
const showCodeDialog = ref(false)
const uploadFile = ref(null)
const parsedApis = ref([])
const uploadRef = ref(null)
const viewCode = ref('')
const viewingFile = ref('')
const activeInfo = ref('guide')
const activeExampleTab = ref('basic')

// ========== 元数据字段表 ==========
const metaFieldTable = [
  { field: '@name', required: true, desc: '接口名称', example: '随机UUID' },
  { field: '@slug', required: true, desc: '接口唯一标识（英文）', example: 'uuid' },
  { field: '@description', required: false, desc: '接口描述', example: '生成UUID v4' },
  { field: '@category', required: true, desc: '分类ID（见下方对照表）', example: '6' },
  { field: '@method', required: false, desc: '请求方法', example: 'GET' },
  { field: '@requireAuth', required: false, desc: '是否需要鉴权', example: 'false' },
  { field: '@isFree', required: false, desc: '是否免费', example: 'true' },
  { field: '@theme', required: false, desc: '主题适配', example: 'both' },
  { field: '@params', required: false, desc: '参数JSON数组', example: '[{"name":"key",...}]' },
  { field: '@response', required: false, desc: '返回示例JSON', example: '{"code":200,...}' },
]

// ========== 分类ID对照（动态获取） ==========
const categoryMap = ref([])

async function loadCategories() {
  try {
    const res = await adminApi.getCategories()
    if (res.code === 200) {
      categoryMap.value = res.data || []
    }
  } catch (e) {
    console.error('加载分类失败:', e)
  }
}

// ========== 代码示例 ==========
const codeExamples = {
  basic: `// ==MuYunAPI==
// @name         随机UUID
// @slug         uuid
// @description  生成符合RFC 4122标准的UUID v4（无需认证示例）
// @category     6
// @method       GET
// @requireAuth  false
// @isFree       true
// @theme        both
// @params       [{"name":"无参数","type":"string","required":false,"description":"无需传参","example":""}]
// @response     {"code":200,"data":{"uuid":"xxx"}}
// ==/MuYunAPI==

module.exports = {
  async execute(slug, params, req) {
    const { v4: uuidv4 } = require('uuid');
    return { uuid: uuidv4() };
  }
};`,

  auth: `// ==MuYunAPI==
// @name         天气查询
// @slug         weather
// @description  查询城市实时天气（需要MuYunAPI认证示例）
// @category     1
// @method       GET
// @requireAuth  true
// @isFree       true
// @theme        both
// @params       [
//   {"name":"city","type":"string","required":true,"description":"城市名称","example":"北京"},
//   {"name":"apiKey","type":"string","required":true,"description":"MuYunAPI用户Key","example":"your_api_key"},
//   {"name":"apiSecret","type":"string","required":true,"description":"MuYunAPI用户Secret","example":"your_api_secret"}
// ]
// @response     {"code":200,"data":{"city":"北京","temp":"24","text":"多云"}}
// ==/MuYunAPI==

const axios = require('axios');

module.exports = {
  async execute(slug, params, req) {
    // 1. 获取认证参数
    const { city, apiKey, apiSecret } = params || {};
    
    // 2. 验证MuYunAPI认证（requireAuth=true时必须）
    if (!apiKey || !apiSecret) {
      return { code: 401, message: '缺少认证参数：apiKey和apiSecret必填' };
    }
    
    // 3. 调用认证服务验证（实际项目中替换为真实验证）
    // const authRes = await verifyAuth(apiKey, apiSecret);
    // if (!authRes.valid) return { code: 401, message: '认证失败' };
    
    // 4. 执行业务逻辑
    if (!city) return { code: 400, message: '缺少参数：city' };
    
    try {
      const res = await axios.get('https://api.weather.com/v1/current', {
        params: { city },
        timeout: 10000,
      });
      return { code: 200, data: res.data };
    } catch (e) {
      return { code: 500, message: '请求失败：' + e.message };
    }
  }
};`,

  multi: `// ==MuYunAPI==
// @name         工具集合
// @slug         uuid
// @description  生成UUID（无需认证）
// @category     6
// @method       GET
// @requireAuth  false
// @isFree       true
// @theme        both
// @params       [{"name":"无参数","type":"string","required":false,"description":"无需传参","example":""}]
// @response     {"code":200,"data":{"uuid":"xxx"}}
// ==/MuYunAPI==

// ==MuYunAPI==
// @name         工具集合-认证版
// @slug         secure_data
// @description  获取敏感数据（需要认证）
// @category     3
// @method       GET
// @requireAuth  true
// @isFree       false
// @theme        both
// @params       [
//   {"name":"id","type":"string","required":true,"description":"数据ID","example":"123"},
//   {"name":"apiKey","type":"string","required":true,"description":"MuYunAPI用户Key","example":"key_xxx"},
//   {"name":"apiSecret","type":"string","required":true,"description":"MuYunAPI用户Secret","example":"secret_xxx"}
// ]
// @response     {"code":200,"data":{"id":"123","content":"敏感数据"}}
// ==/MuYunAPI==

module.exports = {
  async execute(slug, params, req) {
    const handlers = {
      // 无需认证的接口
      'uuid': () => {
        const { v4: uuidv4 } = require('uuid');
        return { uuid: uuidv4() };
      },
      // 需要认证的接口
      'secure_data': () => {
        const { id, apiKey, apiSecret } = params || {};
        
        // 认证检查
        if (!apiKey || !apiSecret) {
          return { code: 401, message: '缺少认证参数' };
        }
        
        if (!id) return { code: 400, message: '缺少参数：id' };
        
        // 验证通过后返回数据
        return { id, content: '这是敏感数据，仅认证用户可见' };
      },
    };

    const handler = handlers[slug];
    if (!handler) throw new Error('未知接口: ' + slug);
    return handler();
  }
};`,
}

// ========== 简易语法高亮 ==========
function highlightCode(code) {
  // 先转义HTML特殊字符
  let html = code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  // 用占位符保护已匹配的内容，防止后续正则交叉干扰
  const tokens = []
  function token(html) {
    const id = tokens.length
    tokens.push(html)
    return `%%TK${id}%%`
  }

  // 1. 注释（// 开头到行尾）- 内部再处理 @元数据 和 ==MuYunAPI== 高亮
  html = html.replace(/(\/\/.*)/g, (_, m) => {
    let inner = m
      .replace(/(==\/?MuYunAPI==)/g, '<span class="hl-mark">$1</span>')
      .replace(/(@\w+)/g, '<span class="hl-meta">$1</span>')
    return token(`<span class="hl-comment">${inner}</span>`)
  })

  // 2. 字符串（单引号）
  html = html.replace(/('(?:[^'\\]|\\.)*')/g, (_, m) => token(`<span class="hl-string">${m}</span>`))

  // 3. 字符串（双引号）
  html = html.replace(/("(?:[^"\\]|\\.)*")/g, (_, m) => token(`<span class="hl-string">${m}</span>`))

  // 4. 关键字
  const keywords = ['const', 'let', 'var', 'async', 'await', 'function', 'return', 'throw', 'new', 'try', 'catch', 'if', 'else', 'require', 'module', 'exports']
  keywords.forEach(kw => {
    html = html.replace(new RegExp(`\\b(${kw})\\b`, 'g'), '<span class="hl-keyword">$1</span>')
  })

  // 5. 数字
  html = html.replace(/\b(\d+)\b/g, '<span class="hl-number">$1</span>')

  // 还原占位符
  html = html.replace(/%%TK(\d+)%%/g, (_, id) => tokens[parseInt(id)])

  return html
}

const highlightedExample = computed(() => highlightCode(codeExamples[activeExampleTab.value]))

function copyExample() {
  const text = codeExamples[activeExampleTab.value]
  navigator.clipboard.writeText(text).then(() => {
    ElMessage.success('代码已复制到剪贴板')
  }).catch(() => {
    ElMessage.error('复制失败，请手动复制')
  })
}

async function loadScripts() {
  loading.value = true
  try {
    const res = await http.get('/libraries/files')
    if (res.code === 200) scripts.value = res.data
  } finally {
    loading.value = false
  }
}

function handleFileChange(file) {
  uploadFile.value = file.raw
  parseFile(file.raw)
}

function handleFileRemove() {
  uploadFile.value = null
  parsedApis.value = []
}

async function parseFile(file) {
  try {
    const code = await file.text()
    const apis = parseMetadataFromText(code)
    parsedApis.value = apis
  } catch (e) {
    ElMessage.error('文件读取失败')
  }
}

function parseMetadataFromText(code) {
  const apis = []
  const blockRegex = /\/\/\s*==MuYunAPI==([\s\S]*?)\/\/\s*==\/MuYunAPI==/g
  let match

  while ((match = blockRegex.exec(code)) !== null) {
    const block = match[1]
    const get = (key) => {
      const m = block.match(new RegExp(`\\/\\/\\s*${key}\\s+(.+)`))
      return m ? m[1].trim() : null
    }
    const name = get('name'), slug = get('slug')
    if (name && slug) {
      const paramsStr = get('params')
      const responseStr = get('response')
      const themeStr = get('theme')
      apis.push({
        name,
        slug,
        description: get('description') || '',
        category_id: parseInt(get('category')) || null,
        method: (get('method') || 'GET').toUpperCase(),
        require_auth: get('requireAuth') === 'true',
        is_free: get('isFree') !== 'false',
        params: paramsStr ? JSON.parse(paramsStr) : [],
        response_example: responseStr ? responseStr.trim() : '',
        theme: themeStr ? themeStr.toLowerCase() : 'both',
      })
    }
  }
  return apis
}

async function submitUpload() {
  if (!uploadFile.value) return ElMessage.warning('请先选择文件')
  uploading.value = true
  try {
    const formData = new FormData()
    formData.append('file', uploadFile.value)

    const res = await http.post('/libraries/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })

    if (res.code === 200) {
      if (parsedApis.value.length > 0) {
        await importApis(res.data.filename, parsedApis.value)
      } else {
        ElMessage.success('文件已保存（未检测到接口定义）')
      }
      showUploadDialog.value = false
      uploadFile.value = null
      parsedApis.value = []
      uploadRef.value?.clearFiles()
      loadScripts()
    } else {
      ElMessage.error(res.message)
    }
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '上传失败')
  } finally {
    uploading.value = false
  }
}

async function importApis(filename, apis) {
  try {
    const res = await http.post('/libraries/import', { filename, apis })
    if (res.code === 200) {
      ElMessage.success(res.message)
    } else {
      ElMessage.error(res.message)
    }
  } catch (e) {
    ElMessage.error('导入失败')
  }
}

async function reimportScript(s) {
  await ElMessageBox.confirm(
    `确认重新导入「${s.filename}」中的 ${s.api_count} 个接口？\n已存在的接口将被跳过。`,
    '重新导入', { type: 'info' }
  )
  try {
    const res = await http.get(`/libraries/file/${s.filename}`)
    if (res.code === 200) {
      const apis = parseMetadataFromText(res.data.code)
      await importApis(s.filename, apis)
    }
  } catch (e) {
    ElMessage.error('读取脚本失败')
  }
}

async function deleteScript(s) {
  await ElMessageBox.confirm(`确认删除脚本「${s.filename}」？`, '删除', { type: 'warning' })
  try {
    const res = await http.delete(`/libraries/file/${s.filename}`)
    if (res.code === 200) {
      ElMessage.success('删除成功')
      loadScripts()
    } else {
      ElMessage.error(res.message)
    }
  } catch (e) {
    ElMessage.error('删除失败')
  }
}

async function viewScript(filename) {
  try {
    const res = await http.get(`/libraries/file/${filename}`)
    if (res.code === 200) {
      viewingFile.value = filename
      viewCode.value = res.data.code
      showCodeDialog.value = true
    }
  } catch (e) {
    ElMessage.error('读取失败')
  }
}

function cancelUpload() {
  showUploadDialog.value = false
  uploadFile.value = null
  parsedApis.value = []
  uploadRef.value?.clearFiles()
}

function formatDate(d) {
  return new Date(d).toLocaleString('zh-CN')
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / 1024 / 1024).toFixed(1) + ' MB'
}

onMounted(() => { loadScripts(); loadCategories() })
</script>

<style lang="scss" scoped>
.manager-page { display: flex; flex-direction: column; gap: 20px; }
.manager-header {
  display: flex; align-items: center; justify-content: space-between;
  h2 { font-size: 20px; font-weight: 700; }
}
.header-actions { display: flex; gap: 12px; }

// ========== 脚本规范折叠面板 ==========
.info-collapse {
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  overflow: hidden;
  :deep(.el-collapse-item__header) {
    background: var(--bg-card);
    padding: 0 16px;
    border-bottom: 1px solid var(--border);
  }
  :deep(.el-collapse-item__wrap) {
    border-bottom: none;
  }
  :deep(.el-collapse-item__content) {
    padding: 0;
  }
}
.info-header {
  display: flex; align-items: center; gap: 8px;
  font-weight: 600; font-size: 15px; color: var(--text-primary);
  .el-icon { color: var(--primary); font-size: 18px; }
}

.guide-content {
  padding: 20px 24px;
  background: var(--bg-card2);
}

.guide-section {
  margin-bottom: 24px;
  &:last-child { margin-bottom: 0; }
  h4 {
    font-size: 15px; font-weight: 600; color: var(--text-primary);
    margin: 0 0 10px; padding-bottom: 8px;
    border-bottom: 1px dashed var(--border);
  }
  p {
    color: var(--text-secondary); font-size: 13px; margin: 0 0 8px; line-height: 1.6;
  }
  code {
    background: rgba(233,147,18,0.1);
    padding: 1px 6px; border-radius: 4px;
    font-size: 12px; color: var(--primary);
    font-family: 'Fira Code', Consolas, monospace;
  }
}

// 字段说明表
.field-table {
  :deep(.el-table__header th) {
    background: var(--bg-card) !important;
    color: var(--text-primary);
    font-weight: 600;
  }
  :deep(.el-table__row) {
    background: var(--bg-card);
  }
  :deep(.el-table__row--striped) {
    background: var(--bg-card2);
  }
  :deep(td), :deep(th) {
    border-bottom-color: var(--border);
  }
}
.field-code {
  background: rgba(233,147,18,0.1);
  padding: 2px 8px; border-radius: 4px;
  font-family: 'Fira Code', Consolas, monospace;
  font-size: 12px; color: var(--primary);
}
.example-code {
  background: rgba(0,0,0,0.06);
  padding: 2px 6px; border-radius: 4px;
  font-family: 'Fira Code', Consolas, monospace;
  font-size: 12px; color: var(--text-secondary);
}

// 分类标签
.category-tags {
  display: flex; flex-wrap: wrap; gap: 8px;
}
.cat-tag {
  .cat-id {
    display: inline-block;
    background: var(--primary);
    color: var(--btn-text);
    border-radius: 4px;
    padding: 0 6px;
    margin-right: 4px;
    font-size: 11px;
    font-weight: 700;
    line-height: 20px;
  }
}

// 代码块
.code-tabs {
  margin-bottom: 12px;
}
.code-block {
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  overflow: hidden;
}
.code-block-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 6px 12px;
  background: var(--code-header-bg);
  border-bottom: 1px solid var(--code-header-border);
}
.code-lang {
  font-size: 12px; color: var(--code-lang-text);
  font-family: 'Fira Code', Consolas, monospace;
}
.copy-btn {
  color: var(--code-lang-text) !important;
  &:hover { color: var(--primary) !important; }
}
.code-pre {
  margin: 0;
  padding: 16px;
  background: var(--code-bg);
  overflow-x: auto;
  code {
    font-family: 'Fira Code', Consolas, monospace;
    font-size: 13px;
    line-height: 1.7;
    color: var(--code-text);
    white-space: pre;
  }
}

// 语法高亮颜色（v-html 动态内容不能用 scoped，单独写在非 scoped 块中）
.note-list {
  margin: 0; padding-left: 20px;
  li {
    color: var(--text-secondary); font-size: 13px;
    line-height: 1.8; margin-bottom: 4px;
    strong { color: var(--text-primary); }
  }
}

// ========== 脚本列表 ==========
.script-list { display: flex; flex-direction: column; gap: 12px; }
.script-card {
  display: flex; align-items: center; justify-content: space-between;
  background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-sm);
  padding: 16px 20px; gap: 16px; transition: border-color 0.2s;
  &:hover { border-color: var(--primary); }
}
.script-info { flex: 1; display: flex; flex-direction: column; gap: 6px; }
.script-name {
  display: flex; align-items: center; gap: 6px; font-weight: 600; font-size: 14px;
  .el-icon { color: var(--primary); }
}
.script-meta {
  display: flex; gap: 16px; font-size: 12px; color: var(--text-muted);
  span { display: flex; align-items: center; gap: 4px; }
}
.api-tags { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 4px; }
.script-actions { display: flex; gap: 4px; flex-shrink: 0; }

// ========== 上传弹窗 ==========
.script-uploader { width: 100%; }
:deep(.el-upload-dragger) { width: 100%; padding: 32px; }

.parse-preview {
  margin-top: 16px;
  .preview-header {
    display: flex; align-items: center; gap: 6px;
    color: var(--success); font-size: 13px; font-weight: 600; margin-bottom: 10px;
    .el-icon { font-size: 16px; }
  }
  .preview-table { border: 1px solid var(--border); border-radius: var(--radius-sm); overflow: hidden; }
  code { background: var(--bg-card2); padding: 1px 6px; border-radius: 4px; font-size: 12px; color: var(--primary); }
}
.parse-empty {
  display: flex; align-items: center; gap: 6px;
  margin-top: 16px; color: var(--warning); font-size: 13px;
}

// ========== 代码查看器 ==========
.code-viewer {
  background: var(--code-bg);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 16px;
  max-height: 500px;
  overflow: auto;
  pre, code { margin: 0; font-family: 'Fira Code', Consolas, monospace; font-size: 13px; color: var(--code-text); white-space: pre; }
}
</style>

<!-- 语法高亮样式 - 非 scoped，供 v-html 动态内容使用 -->
<style lang="scss">
code .hl-comment, .hl-comment { color: #6a9955 !important; font-style: italic; }
code .hl-string, .hl-string { color: #ce9178 !important; }
code .hl-keyword, .hl-keyword { color: #c586c0 !important; }
code .hl-number, .hl-number { color: #b5cea8 !important; }
code .hl-mark, .hl-mark { color: #e9b912 !important; font-weight: 700; background: rgba(233,185,18,0.1); padding: 0 2px; border-radius: 2px; }
code .hl-meta, .hl-meta { color: #569cd6 !important; font-weight: 600; }
</style>
