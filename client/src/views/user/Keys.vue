<template>
  <div class="keys-page">
    <div class="page-header">
      <div class="container">
        <div class="header-row">
          <div>
            <h1>密钥管理</h1>
            <p>管理您的API访问密钥，用于调用付费接口时的身份验证</p>
          </div>
          <el-button type="primary" @click="showCreateDialog = true" :disabled="keys.length >= 10">
            <el-icon><Plus /></el-icon> 创建密钥
          </el-button>
        </div>
      </div>
    </div>

    <div class="container page-body">
      <!-- 说明卡片 -->
      <div class="tip-card">
        <el-icon style="color:var(--primary);font-size:20px"><InfoFilled /></el-icon>
        <div>
          <strong>如何使用密钥？</strong>
          <p>调用付费接口时，在请求头中添加 <code>X-API-Key: 您的API Key</code> 和 <code>X-API-Secret: 您的Secret</code>，或通过系统自动生成的示例代码直接调用。</p>
        </div>
      </div>

      <!-- 密钥列表 -->
      <div v-if="loading" class="key-skeleton">
        <div v-for="i in 3" :key="i" class="key-card-skeleton">
          <div class="skeleton" style="height:20px;width:40%;margin-bottom:12px"></div>
          <div class="skeleton" style="height:14px;margin-bottom:8px"></div>
          <div class="skeleton" style="height:14px;width:70%"></div>
        </div>
      </div>
      <div v-else-if="keys.length === 0" class="empty-state">
        <div class="empty-icon">🔑</div>
        <p>您还没有创建任何密钥</p>
        <el-button type="primary" @click="showCreateDialog = true">创建第一个密钥</el-button>
      </div>
      <div v-else class="keys-grid">
        <div
          v-for="key in keys"
          :key="key.id"
          class="key-card"
          :class="{ disabled: key.status === 0 }"
        >
          <div class="key-card-header">
            <div class="key-name-area">
              <div class="key-dot" :class="key.status === 1 ? 'active' : 'inactive'"></div>
              <h3>{{ key.name }}</h3>
            </div>
            <div class="key-actions">
              <el-switch
                :model-value="key.status === 1"
                @change="toggleKey(key)"
                size="small"
              />
              <el-button type="danger" text @click="deleteKey(key)">
                <el-icon><Delete /></el-icon>
              </el-button>
            </div>
          </div>

          <div class="key-field">
            <label>API Key</label>
            <div class="key-val-row">
              <code>{{ showKeys[key.id] ? key.api_key : maskKey(key.api_key) }}</code>
              <div class="key-btns">
                <el-button text size="small" @click="toggleShow(key.id)">
                  <el-icon><component :is="showKeys[key.id] ? 'Hide' : 'View'" /></el-icon>
                </el-button>
                <el-button text size="small" @click="copy(key.api_key)">
                  <el-icon><CopyDocument /></el-icon>
                </el-button>
              </div>
            </div>
          </div>
          <div class="key-field">
            <label>Secret Key</label>
            <div class="key-val-row">
              <code>{{ showSecrets[key.id] ? key.secret_key : maskKey(key.secret_key) }}</code>
              <div class="key-btns">
                <el-button text size="small" @click="toggleShowSecret(key.id)">
                  <el-icon><component :is="showSecrets[key.id] ? 'Hide' : 'View'" /></el-icon>
                </el-button>
                <el-button text size="small" @click="copy(key.secret_key)">
                  <el-icon><CopyDocument /></el-icon>
                </el-button>
              </div>
            </div>
          </div>

          <div class="key-stats">
            <div class="ks-item">
              <span class="ks-label">今日调用</span>
              <span class="ks-val">{{ key.calls_today }}</span>
            </div>
            <div class="ks-item">
              <span class="ks-label">日限额</span>
              <span class="ks-val">{{ key.daily_limit }}</span>
            </div>
            <div class="ks-item">
              <span class="ks-label">总调用</span>
              <span class="ks-val">{{ key.total_calls }}</span>
            </div>
            <div class="ks-item">
              <span class="ks-label">创建时间</span>
              <span class="ks-val">{{ dayjs(key.created_at).format('MM/DD') }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 创建密钥弹窗 -->
    <el-dialog v-model="showCreateDialog" title="创建 API 密钥" width="420px">
      <el-form :model="createForm" label-width="80px">
        <el-form-item label="密钥名称">
          <el-input v-model="createForm.name" placeholder="如：生产环境密钥、测试用密钥" />
        </el-form-item>
        <el-form-item label="日调用限额">
          <el-input-number v-model="createForm.daily_limit" :min="1" :max="10000" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreateDialog = false">取消</el-button>
        <el-button type="primary" @click="createKey" :loading="creating">创建</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import dayjs from 'dayjs'
import { userApi } from '../../api'

const keys = ref([])
const loading = ref(true)
const showCreateDialog = ref(false)
const creating = ref(false)
const showKeys = reactive({})
const showSecrets = reactive({})

const createForm = reactive({ name: '', daily_limit: 1000 })

function maskKey(key) {
  if (!key) return ''
  return key.substring(0, 6) + '•'.repeat(16) + key.slice(-4)
}
function copy(text) {
  navigator.clipboard.writeText(text).then(() => ElMessage.success('已复制'))
}
function toggleShow(id) { showKeys[id] = !showKeys[id] }
function toggleShowSecret(id) { showSecrets[id] = !showSecrets[id] }

async function loadKeys() {
  const res = await userApi.getKeys()
  if (res.code === 200) keys.value = res.data
  loading.value = false
}

async function createKey() {
  if (!createForm.name.trim()) return ElMessage.warning('请输入密钥名称')
  creating.value = true
  try {
    const res = await userApi.createKey(createForm)
    if (res.code === 200) {
      ElMessage.success('密钥创建成功')
      showCreateDialog.value = false
      createForm.name = ''
      createForm.daily_limit = 1000
      loadKeys()
    } else ElMessage.error(res.message)
  } finally { creating.value = false }
}

async function toggleKey(key) {
  const res = await userApi.toggleKey(key.id)
  if (res.code === 200) {
    key.status = key.status === 1 ? 0 : 1
    ElMessage.success(res.message)
  }
}

async function deleteKey(key) {
  await ElMessageBox.confirm(`确认删除密钥「${key.name}」？删除后不可恢复`, '警告', { type: 'warning' })
  const res = await userApi.deleteKey(key.id)
  if (res.code === 200) {
    ElMessage.success('已删除')
    keys.value = keys.value.filter(k => k.id !== key.id)
  }
}

onMounted(loadKeys)
</script>

<style lang="scss" scoped>
.keys-page { min-height: 100vh; padding-bottom: 60px; }
.page-header {
  background: linear-gradient(180deg, var(--bg-card) 0%, transparent 100%);
  padding: 40px 24px 32px;
  border-bottom: 1px solid var(--border);
  h1 { font-size: 28px; font-weight: 700; color: var(--text-primary); margin-bottom: 6px; }
  p { color: var(--text-secondary); font-size: 14px; }
}
.header-row { display: flex; align-items: flex-end; justify-content: space-between; }
.container { max-width: 1280px; margin: 0 auto; padding: 0 24px; }
.page-body { padding-top: 32px; }

.tip-card {
  background: rgba(233,147,18,0.05);
  border: 1px solid rgba(233,147,18,0.15);
  border-radius: var(--radius-md);
  padding: 16px 20px;
  display: flex;
  gap: 16px;
  align-items: flex-start;
  margin-bottom: 24px;
  
  strong { display: block; color: var(--text-primary); margin-bottom: 6px; }
  p { font-size: 13px; color: var(--text-secondary); line-height: 1.6; }
  code { color: var(--primary); background: rgba(233,147,18,0.1); padding: 1px 6px; border-radius: 4px; font-size: 12px; }
}

.keys-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  gap: 20px;
}

.key-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 20px;
  transition: var(--transition);
  
  &:hover { border-color: var(--border-active); }
  &.disabled { opacity: 0.6; }
}

.key-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}
.key-name-area {
  display: flex;
  align-items: center;
  gap: 10px;
}
.key-dot {
  width: 8px; height: 8px;
  border-radius: 50%;
  &.active { background: var(--success); box-shadow: 0 0 6px var(--success); }
  &.inactive { background: var(--text-muted); }
}
h3 { font-size: 15px; font-weight: 600; color: var(--text-primary); }
.key-actions { display: flex; align-items: center; gap: 8px; }

.key-field {
  margin-bottom: 12px;
  label { display: block; font-size: 12px; color: var(--text-muted); margin-bottom: 6px; }
}
.key-val-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--bg-card2);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 8px 12px;
  
  code {
    font-family: monospace;
    font-size: 12px;
    color: var(--text-secondary);
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}
.key-btns { display: flex; gap: 4px; flex-shrink: 0; }

.key-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  padding-top: 16px;
  border-top: 1px solid var(--border);
  margin-top: 4px;
}
.ks-item {
  text-align: center;
  .ks-label { display: block; font-size: 11px; color: var(--text-muted); margin-bottom: 4px; }
  .ks-val { font-size: 16px; font-weight: 600; color: var(--primary); }
}

.empty-state {
  text-align: center;
  padding: 80px 0;
  .empty-icon { font-size: 56px; margin-bottom: 16px; }
  p { color: var(--text-secondary); margin-bottom: 20px; }
}
.key-skeleton { display: grid; grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); gap: 20px; }
.key-card-skeleton { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-md); padding: 24px; height: 200px; }

// 响应式
@media (max-width: 768px) {
  .page-header { padding: 24px 16px 20px; h1 { font-size: 22px; } }
  .container { padding: 0 16px; }
  .page-body { padding-top: 20px; }
  .tip-card { padding: 12px 16px; gap: 12px; p { font-size: 12px; } }
  .keys-grid { grid-template-columns: 1fr; gap: 12px; }
  .key-card { padding: 16px; }
  .key-stats { grid-template-columns: repeat(2, 1fr); gap: 8px; }
}
</style>
