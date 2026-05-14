<template>
  <div class="manager-page">
    <div class="manager-header">
      <h2>关于我页面管理</h2>
    </div>

    <el-form :model="form" label-width="120px" v-loading="loading">
      <!-- 页面开关 -->
      <el-form-item label="页面开关">
        <el-switch
          v-model="form.is_enabled"
          active-text="开启"
          inactive-text="关闭"
        />
        <span class="form-tip">关闭后前台将无法访问关于我页面</span>
      </el-form-item>

      <!-- 基本信息 -->
      <el-divider>基本信息</el-divider>

      <el-form-item label="姓名">
        <el-input v-model="form.name" placeholder="你的姓名或昵称" />
      </el-form-item>

      <el-form-item label="头像">
        <el-input v-model="form.avatar" placeholder="头像URL地址" />
      </el-form-item>

      <el-form-item label="个人简介">
        <el-input
          v-model="form.bio"
          type="textarea"
          :rows="3"
          placeholder="简短的个人介绍"
        />
      </el-form-item>

      <!-- 教育背景 -->
      <el-divider>教育背景</el-divider>

      <el-form-item label="学校名称">
        <el-input v-model="form.school_name" placeholder="学校全称" />
      </el-form-item>

      <el-form-item label="招生代码">
        <el-input v-model="form.school_code" placeholder="如：8800587" />
      </el-form-item>

      <el-form-item label="所学专业">
        <el-input v-model="form.major" placeholder="如：计算机网络技术" />
      </el-form-item>

      <el-form-item label="所在班级">
        <el-input v-model="form.class_name" placeholder="如：计算机网络技术1班" />
      </el-form-item>

      <!-- 技能标签 -->
      <el-divider>技能专长</el-divider>

      <el-form-item label="技能标签">
        <div class="skills-input">
          <el-tag
            v-for="(skill, index) in form.skills"
            :key="index"
            closable
            @close="removeSkill(index)"
            class="skill-tag"
          >
            {{ skill }}
          </el-tag>
          <el-input
            v-if="inputVisible"
            ref="skillInputRef"
            v-model="inputValue"
            size="small"
            @keyup.enter="addSkill"
            @blur="addSkill"
            style="width: 100px"
          />
          <el-button v-else size="small" @click="showSkillInput">
            <el-icon><Plus /></el-icon> 添加
          </el-button>
        </div>
      </el-form-item>

      <!-- 联系方式 -->
      <el-divider>联系方式</el-divider>

      <el-form-item label="GitHub">
        <el-input v-model="form.github_url" placeholder="https://github.com/用户名" />
      </el-form-item>

      <el-form-item label="邮箱">
        <el-input v-model="form.email" placeholder="your@email.com" />
      </el-form-item>

      <el-form-item label="QQ">
        <el-input v-model="form.qq" placeholder="QQ号码" />
      </el-form-item>

      <el-form-item label="微信">
        <el-input v-model="form.wechat" placeholder="微信号" />
      </el-form-item>

      <!-- 更新日志 -->
      <el-divider>更新日志</el-divider>

      <el-form-item label="更新记录">
        <div class="update-logs">
          <div
            v-for="(log, index) in form.update_log"
            :key="index"
            class="log-item"
          >
            <el-input v-model="log.version" placeholder="版本号" style="width: 120px" />
            <el-input v-model="log.date" placeholder="日期" style="width: 140px" />
            <el-input v-model="log.content" placeholder="更新内容" style="flex: 1" />
            <el-button type="danger" text @click="removeLog(index)">
              <el-icon><Delete /></el-icon>
            </el-button>
          </div>
          <el-button type="primary" text @click="addLog">
            <el-icon><Plus /></el-icon> 添加更新记录
          </el-button>
        </div>
      </el-form-item>

      <!-- GitHub同步 -->
      <el-divider>GitHub同步</el-divider>

      <el-form-item label="自动同步">
        <el-switch
          v-model="form.auto_sync_github"
          active-text="开启"
          inactive-text="关闭"
        />
        <span class="form-tip">开启后每小时自动检查GitHub仓库更新</span>
      </el-form-item>

      <el-form-item label="仓库地址">
        <el-input v-model="form.github_repo" placeholder="如：zy2270561173/muyunapi" />
      </el-form-item>

      <el-form-item>
        <el-button type="primary" @click="saveConfig" :loading="saving">
          保存配置
        </el-button>
        <el-button @click="previewPage">预览页面</el-button>
        <el-button type="success" @click="syncGitHub" :loading="syncing">
          手动同步GitHub
        </el-button>
      </el-form-item>
    </el-form>

    <!-- 同步记录 -->
    <el-card class="sync-logs" v-if="syncLogs.length > 0">
      <template #header>
        <div class="card-header">
          <span>同步记录</span>
          <el-button type="primary" text size="small" @click="loadSyncLogs">
            <el-icon><Refresh /></el-icon> 刷新
          </el-button>
        </div>
      </template>
      <el-table :data="syncLogs" size="small">
        <el-table-column prop="commit_hash" label="Commit" width="100">
          <template #default="{ row }">
            <code>{{ row.commit_hash.substring(0, 7) }}</code>
          </template>
        </el-table-column>
        <el-table-column prop="commit_message" label="提交信息" show-overflow-tooltip />
        <el-table-column prop="commit_author" label="作者" width="120" />
        <el-table-column prop="commit_date" label="日期" width="160">
          <template #default="{ row }">
            {{ formatDate(row.commit_date) }}
          </template>
        </el-table-column>
        <el-table-column prop="is_synced" label="状态" width="80">
          <template #default="{ row }">
            <el-tag :type="row.is_synced ? 'success' : 'info'" size="small">
              {{ row.is_synced ? '已同步' : '待同步' }}
            </el-tag>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus, Delete, Refresh } from '@element-plus/icons-vue'
import { adminApi } from '../../api'

const loading = ref(false)
const saving = ref(false)
const syncing = ref(false)
const inputVisible = ref(false)
const inputValue = ref('')
const skillInputRef = ref(null)

const form = reactive({
  is_enabled: true,
  name: '',
  avatar: '',
  school_name: '普宁职业技术学校',
  school_code: '8800587',
  major: '计算机网络技术',
  class_name: '',
  bio: '',
  skills: [],
  github_url: 'https://github.com/zy2270561173/muyunapi',
  email: '',
  qq: '',
  wechat: '',
  update_log: [],
  auto_sync_github: true,
  github_repo: 'zy2270561173/muyunapi'
})

const syncLogs = ref([])

async function loadConfig() {
  loading.value = true
  try {
    const res = await adminApi.getAboutConfig()
    if (res.code === 200) {
      Object.assign(form, res.data)
    }
  } catch (e) {
    console.error('加载配置失败:', e)
  } finally {
    loading.value = false
  }
}

async function saveConfig() {
  saving.value = true
  try {
    const res = await adminApi.updateAboutConfig(form)
    if (res.code === 200) {
      ElMessage.success('配置已保存')
    } else {
      ElMessage.error(res.message)
    }
  } catch (e) {
    ElMessage.error('保存失败')
  } finally {
    saving.value = false
  }
}

async function syncGitHub() {
  syncing.value = true
  try {
    const res = await adminApi.syncGitHub()
    if (res.code === 200) {
      ElMessage.success(res.data.message || '同步完成')
      loadSyncLogs()
    } else {
      ElMessage.error(res.message)
    }
  } catch (e) {
    ElMessage.error('同步失败')
  } finally {
    syncing.value = false
  }
}

async function loadSyncLogs() {
  try {
    const res = await adminApi.getSyncLogs()
    if (res.code === 200) {
      syncLogs.value = res.data
    }
  } catch (e) {
    console.error('加载同步记录失败:', e)
  }
}

function previewPage() {
  window.open('/about', '_blank')
}

function showSkillInput() {
  inputVisible.value = true
  nextTick(() => {
    skillInputRef.value?.focus()
  })
}

function addSkill() {
  if (inputValue.value) {
    form.skills.push(inputValue.value)
    inputValue.value = ''
  }
  inputVisible.value = false
}

function removeSkill(index) {
  form.skills.splice(index, 1)
}

function addLog() {
  form.update_log.unshift({
    version: '',
    date: new Date().toISOString().split('T')[0],
    content: ''
  })
}

function removeLog(index) {
  form.update_log.splice(index, 1)
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleString('zh-CN')
}

onMounted(() => {
  loadConfig()
  loadSyncLogs()
})
</script>

<style lang="scss" scoped>
.manager-page {
  padding: 20px;
}

.manager-header {
  margin-bottom: 24px;
  h2 {
    font-size: 20px;
    font-weight: 700;
  }
}

.form-tip {
  margin-left: 12px;
  color: var(--text-muted);
  font-size: 12px;
}

.skills-input {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;

  .skill-tag {
    margin-right: 0;
  }
}

.update-logs {
  .log-item {
    display: flex;
    gap: 12px;
    align-items: center;
    margin-bottom: 12px;
  }
}

.sync-logs {
  margin-top: 24px;

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
}
</style>
