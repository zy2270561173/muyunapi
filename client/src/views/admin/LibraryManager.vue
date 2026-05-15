<template>
  <div class="manager-page">
    <div class="manager-header">
      <h2>内置库脚本管理</h2>
      <div class="header-actions">
        <el-button type="success" @click="showGithubStore = true">
          <el-icon><Shop /></el-icon> GitHub商店
        </el-button>
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
      <el-empty v-if="!loading && scripts.length === 0" description="暂无脚本，点击上方按钮上传或从GitHub商店下载" />

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
          <div class="api-tags" v-if="s.apis && s.apis.length > 0">
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
    <el-dialog v-model="showCodeDialog" :title="viewingFile" width="900px" :destroy-on-close="true">
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

    <!-- GitHub 商店弹窗 -->
    <el-dialog v-model="showGithubStore" title="GitHub 内置库商店" width="1200px" :destroy-on-close="true" @open="onStoreOpen">
      <div class="store-container">
        <!-- 同步仓库 -->
        <div class="store-settings">
          <el-form inline class="settings-row">
            <el-form-item label="仓库">
              <el-input v-model="syncRepo" placeholder="仓库地址，如: username/repo" style="width: 280px">
                <template #prefix><el-icon><Link /></el-icon></template>
              </el-input>
            </el-form-item>
            <el-form-item label="代理">
              <el-select v-model="selectedProxy" placeholder="选择加速代理" style="width: 200px">
                <el-option v-for="p in proxyOptions" :key="p.url" :label="p.name" :value="p.url" />
              </el-select>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="syncGithubRepo" :loading="syncing">
                <el-icon><Refresh /></el-icon> 同步仓库
              </el-button>
            </el-form-item>
          </el-form>
          <div class="actions-row">
            <el-button type="success" @click="showAddScript = true">
              <el-icon><Plus /></el-icon> 手动添加脚本
            </el-button>
          </div>
        </div>

        <!-- 搜索 -->
        <div class="store-search">
          <el-input v-model="storeKeyword" placeholder="搜索脚本..." clearable @input="loadGithubStore">
            <template #prefix><el-icon><Search /></el-icon></template>
          </el-input>
        </div>

        <!-- 脚本列表 -->
        <div class="store-list" v-loading="storeLoading">
          <el-empty v-if="!storeLoading && githubScripts.length === 0" description="暂无脚本，请先同步GitHub仓库" />

          <div v-for="script in githubScripts" :key="script.id" class="store-script-card">
            <div class="script-info">
              <div class="script-name">
                <el-icon><Document /></el-icon>
                <span>{{ script.display_name }}</span>
                <el-tag size="small" type="success" v-if="script.author">{{ script.author }}</el-tag>
              </div>
              <div class="script-meta">
                <span><el-icon><Link /></el-icon> {{ script.script_name }}</span>
                <span><el-icon><Download /></el-icon> {{ script.download_count }} 次下载</span>
                <span><el-icon><Clock /></el-icon> {{ formatDate(script.updated_at) }}</span>
              </div>
              <div class="script-desc" v-if="script.description">{{ script.description }}</div>
            </div>
            <div class="script-actions">
              <el-button type="primary" text size="small" @click="viewGithubScript(script)">
                <el-icon><View /></el-icon> 查看
              </el-button>
              <el-button type="success" text size="small" @click="saveGithubScript(script)">
                <el-icon><Download /></el-icon> 保存
              </el-button>
              <el-button type="danger" text size="small" @click="deleteGithubScript(script)">
                <el-icon><Delete /></el-icon>
              </el-button>
            </div>
          </div>
        </div>

        <!-- 分页 -->
        <div class="pagination-wrap" v-if="storeTotal > storePageSize">
          <el-pagination
            v-model:current-page="storePage"
            :page-size="storePageSize"
            :total="storeTotal"
            layout="prev, pager, next"
            @current-change="loadGithubStore"
            background
          />
        </div>
      </div>

      <!-- 脚本内容查看弹窗 -->
      <el-dialog v-model="showScriptView" :title="viewingScript?.display_name || '脚本内容'" width="900px" append-to-body :destroy-on-close="true">
        <div class="code-viewer" v-loading="viewLoading">
          <pre v-if="viewingCode"><code>{{ viewingCode }}</code></pre>
          <div v-else class="empty-code">加载中...</div>
        </div>
        <template #footer>
          <el-button @click="showScriptView = false">关闭</el-button>
          <el-button type="success" @click="saveCurrentScript" :disabled="!viewingScript">
            <el-icon><Download /></el-icon> 仅保存
          </el-button>
          <el-button type="primary" @click="importCurrentScript" :disabled="!viewingScript">
            <el-icon><RefreshRight /></el-icon> 保存并导入
          </el-button>
        </template>
      </el-dialog>

      <!-- 添加脚本弹窗 -->
      <el-dialog v-model="showAddScript" title="添加GitHub脚本" width="600px" append-to-body :destroy-on-close="true">
        <el-form :model="addScriptForm" label-width="100px">
          <el-form-item label="仓库所有者" required>
            <el-input v-model="addScriptForm.repo_owner" placeholder="例如: username" />
          </el-form-item>
          <el-form-item label="仓库名称" required>
            <el-input v-model="addScriptForm.repo_name" placeholder="例如: muyunapi-scripts" />
          </el-form-item>
          <el-form-item label="脚本文件名" required>
            <el-input v-model="addScriptForm.script_name" placeholder="例如: weather-api.js" />
          </el-form-item>
          <el-form-item label="脚本路径" required>
            <el-input v-model="addScriptForm.script_path" placeholder="例如: scripts/weather-api.js" />
          </el-form-item>
          <el-form-item label="显示名称" required>
            <el-input v-model="addScriptForm.display_name" placeholder="例如: 天气查询API" />
          </el-form-item>
          <el-form-item label="描述">
            <el-input v-model="addScriptForm.description" type="textarea" :rows="2" placeholder="脚本描述" />
          </el-form-item>
          <el-form-item label="作者">
            <el-input v-model="addScriptForm.author" placeholder="作者名称" />
          </el-form-item>
          <el-form-item label="分类">
            <el-select v-model="addScriptForm.category_id" placeholder="选择分类" style="width: 100%">
              <el-option v-for="c in categoryMap" :key="c.id" :label="c.name" :value="c.id" />
            </el-select>
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="showAddScript = false">取消</el-button>
          <el-button type="primary" @click="submitAddScript">确认添加</el-button>
        </template>
      </el-dialog>

      <template #footer>
        <el-button type="warning" @click="showUploadGithub = true">
          <el-icon><Upload /></el-icon> 上传本地脚本
        </el-button>
        <el-button @click="showGithubStore = false">关闭</el-button>
      </template>
    </el-dialog>

    <!-- 上传到GitHub弹窗 -->
    <el-dialog v-model="showUploadGithub" title="上传本地脚本到GitHub仓库" width="800px" :destroy-on-close="true" @open="loadLocalScripts">
      <div class="upload-section">
        <el-alert
          title="说明"
          type="info"
          :closable="false"
          show-icon
          style="margin-bottom: 16px"
        >
          将本地script文件夹下的脚本批量上传到GitHub仓库。勾选要上传的脚本，然后点击"上传选中脚本"按钮。
        </el-alert>

        <el-form :model="uploadForm" label-width="100px" style="margin-bottom: 16px">
          <el-form-item label="GitHub Token" required>
            <el-input v-model="uploadForm.token" type="password" placeholder="请输入GitHub Personal Access Token" show-password />
            <div class="form-tip">
              需要有仓库的push权限，建议使用具有repo权限的Token
            </div>
          </el-form-item>
          <el-form-item label="目标仓库">
            <el-input v-model="uploadForm.repo" placeholder="username/repo-name" />
          </el-form-item>
        </el-form>

        <div class="script-selector">
          <div class="selector-header">
            <span>选择脚本（{{ selectedScripts.length }} 个已选）</span>
            <el-button text size="small" @click="selectAllScripts">
              {{ selectedScripts.length === localScripts.length ? '取消全选' : '全选' }}
            </el-button>
          </div>

          <div class="script-list" v-loading="loadingLocalScripts">
            <el-empty v-if="!loadingLocalScripts && localScripts.length === 0" description="暂无本地脚本" />

            <div v-for="script in localScripts" :key="script.filename" class="script-item">
              <el-checkbox v-model="selectedScripts" :label="script.filename">
                <div class="script-info">
                  <span class="script-name">{{ script.filename }}</span>
                  <div class="script-details">
                    <el-tag v-if="script.apis.length > 0" size="small" type="success">
                      {{ script.apis.length }} 个接口
                    </el-tag>
                    <span v-if="script.apis[0]?.name" class="api-name">
                      {{ script.apis[0].name }}
                    </span>
                  </div>
                  <div v-if="script.apis[0]?.description" class="script-desc">
                    {{ script.apis[0].description }}
                  </div>
                </div>
              </el-checkbox>
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <el-button @click="showUploadGithub = false">取消</el-button>
        <el-button type="primary" @click="uploadToGithub" :loading="uploadingToGithub" :disabled="selectedScripts.length === 0 || !uploadForm.token">
          <el-icon><Upload /></el-icon> 上传选中脚本 ({{ selectedScripts.length }})
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { UploadFilled, Shop, Link, Refresh, Download, Plus } from '@element-plus/icons-vue'
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

const showGithubStore = ref(false)
const storeLoading = ref(false)
const storeKeyword = ref('')
const storePage = ref(1)
const storePageSize = ref(20)
const storeTotal = ref(0)
const githubScripts = ref([])
const syncing = ref(false)
const syncRepo = ref('')
const selectedProxy = ref('')
const proxyOptions = ref([])

const showScriptView = ref(false)
const viewLoading = ref(false)
const viewingScript = ref(null)
const viewingCode = ref('')

const showAddScript = ref(false)
const addScriptForm = ref({
  repo_owner: '',
  repo_name: '',
  script_name: '',
  script_path: '',
  display_name: '',
  description: '',
  author: '',
  category_id: null
})

const showUploadGithub = ref(false)
const uploadForm = ref({
  repo: 'zy2270561173/muyunapi-scripts',
  token: ''
})
const localScripts = ref([])
const selectedScripts = ref([])
const loadingLocalScripts = ref(false)
const uploadingToGithub = ref(false)

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
    const { city, apiKey, apiSecret } = params || {};
    
    if (!apiKey || !apiSecret) {
      return { code: 401, message: '缺少认证参数：apiKey和apiSecret必填' };
    }
    
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
      'uuid': () => {
        const { v4: uuidv4 } = require('uuid');
        return { uuid: uuidv4() };
      },
      'secure_data': () => {
        const { id, apiKey, apiSecret } = params || {};
        
        if (!apiKey || !apiSecret) {
          return { code: 401, message: '缺少认证参数' };
        }
        
        if (!id) return { code: 400, message: '缺少参数：id' };
        
        return { id, content: '这是敏感数据，仅认证用户可见' };
      },
    };

    const handler = handlers[slug];
    if (!handler) throw new Error('未知接口: ' + slug);
    return handler();
  }
};`,
}

function highlightCode(code) {
  let html = code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  const tokens = []
  function token(html) {
    const id = tokens.length
    tokens.push(html)
    return `%%TK${id}%%`
  }

  html = html.replace(/(\/\/.*)/g, (_, m) => {
    let inner = m
      .replace(/(==\/?MuYunAPI==)/g, '<span class="hl-mark">$1</span>')
      .replace(/(@\w+)/g, '<span class="hl-meta">$1</span>')
    return token(`<span class="hl-comment">${inner}</span>`)
  })

  html = html.replace(/('(?:[^'\\]|\\.)*')/g, (_, m) => token(`<span class="hl-string">${m}</span>`))
  html = html.replace(/("(?:[^"\\]|\\.)*")/g, (_, m) => token(`<span class="hl-string">${m}</span>`))

  const keywords = ['const', 'let', 'var', 'async', 'await', 'function', 'return', 'throw', 'new', 'try', 'catch', 'if', 'else', 'require', 'module', 'exports']
  keywords.forEach(kw => {
    html = html.replace(new RegExp(`\\b(${kw})\\b`, 'g'), '<span class="hl-keyword">$1</span>')
  })

  html = html.replace(/\b(\d+)\b/g, '<span class="hl-number">$1</span>')

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
    const res = await http.get('/libraries/list')
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
      const m = block.match(new RegExp(`\\/\\/\\s*@${key}\\s+(.+)`))
      return m ? m[1].trim() : null
    }
    const name = get('name'), slug = get('slug')
    if (name && slug) {
      let params = []
      const paramsStr = get('params')
      if (paramsStr) {
        try {
          params = JSON.parse(paramsStr)
          if (!Array.isArray(params)) params = []
        } catch (e) {
          params = []
        }
      }
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
        params,
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

async function loadStoreConfig() {
  try {
    const res = await http.get('/libraries/github/store/config')
    if (res.code === 200) {
      syncRepo.value = res.data.default_repo
      selectedProxy.value = res.data.proxy_url
      proxyOptions.value = res.data.proxy_options
    }
  } catch (e) {
    console.error('加载商店配置失败:', e)
  }
}

async function loadGithubStore() {
  storeLoading.value = true
  try {
    const res = await http.get('/libraries/github/store/list', {
      params: {
        page: storePage.value,
        limit: storePageSize.value,
        keyword: storeKeyword.value
      }
    })
    if (res.code === 200) {
      githubScripts.value = res.data.list
      storeTotal.value = res.data.total
    }
  } catch (e) {
    console.error('加载GitHub商店失败:', e)
  } finally {
    storeLoading.value = false
  }
}

async function onStoreOpen() {
  await loadStoreConfig()
  await loadGithubStore()
  await loadScripts()
}

async function syncGithubRepo() {
  if (!syncRepo.value) {
    ElMessage.warning('请输入仓库地址')
    return
  }

  const parts = syncRepo.value.split('/')
  if (parts.length !== 2) {
    ElMessage.warning('仓库地址格式错误，示例：username/repo-name')
    return
  }

  syncing.value = true
  try {
    const res = await http.post('/libraries/github/store/sync', {
      repo_owner: parts[0],
      repo_name: parts[1],
      proxy_url: selectedProxy.value
    })
    if (res.code === 200) {
      ElMessage.success(res.message)
      loadGithubStore()
    } else {
      ElMessage.error(res.message)
    }
  } catch (e) {
    ElMessage.error('同步失败')
  } finally {
    syncing.value = false
  }
}

async function viewGithubScript(script) {
  viewLoading.value = true
  viewingScript.value = script
  viewingCode.value = ''
  showScriptView.value = true

  try {
    const res = await http.get(`/libraries/github/store/script/${script.id}`, {
      params: { proxy_url: selectedProxy.value }
    })
    if (res.code === 200) {
      viewingCode.value = res.data.code
    } else {
      ElMessage.error(res.message)
    }
  } catch (e) {
    ElMessage.error('加载脚本失败')
  } finally {
    viewLoading.value = false
  }
}

async function saveGithubScript(script) {
  try {
    const res = await http.post('/libraries/github/store/save', {
      script_id: script.id,
      proxy_url: selectedProxy.value
    })
    if (res.code === 200) {
      ElMessage.success('保存成功，脚本已保存到本地')
      loadScripts()
    } else {
      ElMessage.error(res.message)
    }
  } catch (e) {
    ElMessage.error('保存失败')
  }
}

async function deleteGithubScript(script) {
  await ElMessageBox.confirm(`确认删除「${script.display_name}」？`, '删除', { type: 'warning' })
  try {
    const res = await http.delete(`/libraries/github/store/script/${script.id}`)
    if (res.code === 200) {
      ElMessage.success('删除成功')
      loadGithubStore()
    } else {
      ElMessage.error(res.message)
    }
  } catch (e) {
    ElMessage.error('删除失败')
  }
}

async function saveCurrentScript() {
  if (!viewingScript.value) return
  await saveGithubScript(viewingScript.value)
}

async function importCurrentScript() {
  if (!viewingScript.value) return
  await saveGithubScript(viewingScript.value)

  if (viewingCode.value) {
    const apis = parseMetadataFromText(viewingCode.value)
    if (apis.length > 0) {
      await importApis(viewingScript.value.script_name, apis)
    }
  }
}

async function submitAddScript() {
  if (!addScriptForm.value.repo_owner || !addScriptForm.value.repo_name ||
      !addScriptForm.value.script_name || !addScriptForm.value.script_path ||
      !addScriptForm.value.display_name) {
    ElMessage.warning('请填写必填项')
    return
  }

  try {
    const res = await http.post('/libraries/github/store/add', addScriptForm.value)
    if (res.code === 200) {
      ElMessage.success(res.message)
      showAddScript.value = false
      addScriptForm.value = {
        repo_owner: '',
        repo_name: '',
        script_name: '',
        script_path: '',
        display_name: '',
        description: '',
        author: '',
        category_id: null
      }
      loadGithubStore()
    } else {
      ElMessage.error(res.message)
    }
  } catch (e) {
    ElMessage.error('添加失败')
  }
}

async function loadLocalScripts() {
  loadingLocalScripts.value = true
  selectedScripts.value = []
  try {
    const res = await http.get('/libraries/local/scripts')
    if (res.code === 200) {
      localScripts.value = res.data
    }
    const configRes = await http.get('/libraries/github/upload/config')
    if (configRes.code === 200) {
      uploadForm.value.repo = configRes.data.repo
    }
  } catch (e) {
    console.error('加载本地脚本失败:', e)
  } finally {
    loadingLocalScripts.value = false
  }
}

function selectAllScripts() {
  if (selectedScripts.value.length === localScripts.value.length) {
    selectedScripts.value = []
  } else {
    selectedScripts.value = localScripts.value.map(s => s.filename)
  }
}

async function uploadToGithub() {
  if (selectedScripts.value.length === 0 || !uploadForm.value.token) {
    ElMessage.warning('请选择要上传的脚本并填写GitHub Token')
    return
  }

  uploadingToGithub.value = true
  try {
    const res = await http.post('/libraries/github/upload', {
      repo: uploadForm.value.repo,
      token: uploadForm.value.token,
      scripts: selectedScripts.value
    })

    if (res.code === 200) {
      ElMessage.success(res.message)
      const failed = res.data.filter(r => !r.success)
      if (failed.length > 0) {
        console.warn('上传失败的脚本:', failed)
      }
      showUploadGithub.value = false
    } else {
      ElMessage.error(res.message)
    }
  } catch (e) {
    ElMessage.error('上传失败')
  } finally {
    uploadingToGithub.value = false
  }
}

onMounted(() => {
  loadScripts()
  loadCategories()
})
</script>

<style lang="scss" scoped>
.manager-page { display: flex; flex-direction: column; gap: 20px; }
.manager-header {
  display: flex; align-items: center; justify-content: space-between;
  h2 { font-size: 20px; font-weight: 700; }
}
.header-actions { display: flex; gap: 12px; }

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

.note-list {
  margin: 0; padding-left: 20px;
  li {
    color: var(--text-secondary); font-size: 13px;
    line-height: 1.8; margin-bottom: 4px;
    strong { color: var(--text-primary); }
  }
}

.script-list { display: flex; flex-direction: column; gap: 12px; }
.script-card {
  display: flex; 
  align-items: flex-start; 
  justify-content: space-between;
  flex-direction: column;
  background: var(--bg-card); 
  border: 1px solid var(--border); 
  border-radius: var(--radius-sm);
  padding: 16px 20px; 
  gap: 12px; 
  transition: border-color 0.2s;
  &:hover { border-color: var(--primary); }
  
  @media (min-width: 600px) {
    flex-direction: row;
    align-items: center;
  }
}
.script-info { flex: 1; display: flex; flex-direction: column; gap: 6px; width: 100%; }
.script-name {
  display: flex; 
  align-items: center; 
  gap: 6px; 
  font-weight: 600; 
  font-size: 14px;
  word-break: break-all;
  .el-icon { color: var(--primary); flex-shrink: 0; }
  
  @media (max-width: 768px) {
    font-size: 13px;
  }
}
.script-meta {
  display: flex; 
  flex-wrap: wrap;
  gap: 8px 16px; 
  font-size: 12px; 
  color: var(--text-muted);
  span { display: flex; align-items: center; gap: 4px; }
  
  @media (max-width: 768px) {
    font-size: 11px;
    gap: 6px 12px;
  }
}
.api-tags { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 4px; }
.script-actions { 
  display: flex; 
  gap: 4px; 
  flex-shrink: 0; 
  flex-wrap: wrap;
  
  @media (max-width: 768px) {
    width: 100%;
    justify-content: flex-start;
    
    .el-button {
      flex: 1;
      min-width: 80px;
    }
  }
}

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

.code-viewer {
  background: var(--code-bg);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 16px;
  max-height: 500px;
  overflow: auto;
  pre, code { 
    margin: 0; 
    font-family: 'Fira Code', Consolas, monospace; 
    font-size: 13px; 
    color: var(--code-text); 
    white-space: pre; 
    word-break: break-all;
  }
  
  @media (max-width: 768px) {
    padding: 12px;
    max-height: 350px;
    
    pre, code {
      font-size: 11px;
    }
  }
}

.store-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.store-settings {
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border);
  
  .settings-row {
    margin-bottom: 12px;
  }
  
  .actions-row {
    display: flex;
    gap: 8px;
  }
}

.store-search {
  width: 100%;
}

.store-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 200px;
  max-height: 500px;
  overflow-y: auto;
}

.store-script-card {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  flex-direction: column;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 16px 20px;
  gap: 12px;
  transition: border-color 0.2s;
  &:hover { border-color: var(--primary); }

  @media (min-width: 600px) {
    flex-direction: row;
    align-items: center;
  }
}

.script-desc {
  font-size: 13px;
  color: var(--text-secondary);
  margin-top: 4px;
}

.pagination-wrap {
  display: flex;
  justify-content: center;
  margin-top: 16px;
}

.empty-code {
  text-align: center;
  padding: 40px;
  color: var(--text-muted);
}

.upload-section {
  .form-tip {
    font-size: 12px;
    color: var(--text-muted);
    margin-top: 4px;
  }
}

.script-selector {
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  overflow: hidden;

  .selector-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    background: var(--bg-card);
    border-bottom: 1px solid var(--border);
    font-weight: 600;
  }

  .script-list {
    max-height: 400px;
    overflow-y: auto;
    background: var(--bg-card2);
  }

  .script-item {
    padding: 12px 16px;
    border-bottom: 1px solid var(--border);
    transition: background-color 0.2s;

    &:last-child {
      border-bottom: none;
    }

    &:hover {
      background: var(--bg-card);
    }

    :deep(.el-checkbox__label) {
      flex: 1;
    }

    .script-info {
      display: flex;
      flex-direction: column;
      gap: 4px;

      .script-name {
        font-weight: 600;
        font-size: 14px;
      }

      .script-details {
        display: flex;
        align-items: center;
        gap: 8px;

        .api-name {
          font-size: 12px;
          color: var(--text-secondary);
        }
      }

      .script-desc {
        font-size: 12px;
        color: var(--text-muted);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    }
  }
}

@media (max-width: 768px) {
  .guide-content {
    padding: 12px;
  }
}

.guide-section {
  margin-bottom: 24px;
  &:last-child { margin-bottom: 0; }
  h4 {
    font-size: 15px; font-weight: 600; color: var(--text-primary);
    margin: 0 0 10px; padding-bottom: 8px;
    border-bottom: 1px dashed var(--border);

    @media (max-width: 768px) {
      font-size: 14px;
    }
  }
  p {
    color: var(--text-secondary); font-size: 13px; margin: 0 0 8px; line-height: 1.6;
  }
  code {
    background: rgba(233,147,18,0.1);
    padding: 1px 6px; border-radius: 4px;
    font-size: 12px; color: var(--primary);
    font-family: 'Fira Code', Consolas, monospace;

    @media (max-width: 768px) {
      font-size: 11px;
    }
  }

  @media (max-width: 768px) {
    margin-bottom: 16px;
  }
}

.note-list {
  margin: 0; padding-left: 20px;
  li {
    color: var(--text-secondary); font-size: 13px;
    line-height: 1.8; margin-bottom: 4px;
    strong { color: var(--text-primary); }

    code {
      background: rgba(233,147,18,0.1);
      padding: 1px 6px; border-radius: 4px;
      font-size: 11px; color: var(--primary);
      font-family: 'Fira Code', Consolas, monospace;
    }
  }
}
</style>

<style lang="scss">
code .hl-comment, .hl-comment { color: #6a9955 !important; font-style: italic; }
code .hl-string, .hl-string { color: #ce9178 !important; }
code .hl-keyword, .hl-keyword { color: #c586c0 !important; }
code .hl-number, .hl-number { color: #b5cea8 !important; }
code .hl-mark, .hl-mark { color: #e9b912 !important; font-weight: 700; background: rgba(233,185,18,0.1); padding: 0 2px; border-radius: 2px; }
code .hl-meta, .hl-meta { color: #569cd6 !important; font-weight: 600; }
</style>
