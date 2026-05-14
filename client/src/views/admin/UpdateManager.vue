<template>
  <div class="update-page">
    <div class="update-header">
      <h2>系统更新</h2>
      <el-tag v-if="currentVersion" type="info">当前版本: v{{ currentVersion }}</el-tag>
    </div>

    <!-- 版本信息卡片 -->
    <el-card class="version-card">
      <div class="version-info">
        <div class="version-item">
          <span class="version-label">当前版本</span>
          <span class="version-value">v{{ currentVersion }}</span>
        </div>
        <div class="version-item">
          <span class="version-label">远程版本</span>
          <span class="version-value" :class="{ 'has-update': hasUpdate }">
            {{ remoteVersion ? 'v' + remoteVersion : '-' }}
          </span>
        </div>
        <div class="version-item">
          <span class="version-label">平台</span>
          <span class="version-value">{{ platform }} / {{ arch }}</span>
        </div>
        <div class="version-item">
          <span class="version-label">Node版本</span>
          <span class="version-value">{{ nodeVersion }}</span>
        </div>
      </div>

      <div class="update-status" v-if="checkStatus">
        <el-result
          :icon="hasUpdate ? 'warning' : 'success'"
          :title="hasUpdate ? '发现新版本' : '已是最新版本'"
          :sub-title="statusSubTitle"
        >
          <template #extra>
            <el-button type="primary" @click="checkForUpdate" :loading="checking">
              <el-icon><Refresh /></el-icon>
              检查更新
            </el-button>
            <el-button v-if="hasUpdate && downloadStatus === 'none'" type="success" @click="startDownload" :loading="downloading">
              <el-icon><Download /></el-icon>
              下载更新
            </el-button>
            <el-button v-if="downloadStatus === 'completed'" type="success" @click="startApply" :loading="applying">
              <el-icon><Check /></el-icon>
              安装更新
            </el-button>
          </template>
        </el-result>

        <!-- 下载进度 -->
        <div v-if="downloading || downloadStatus === 'completed'" class="download-progress">
          <el-progress 
            :percentage="downloadProgress" 
            :status="downloadStatus === 'completed' ? 'success' : ''"
          />
          <p class="progress-text">{{ downloadText }}</p>
        </div>
      </div>
      <div v-else class="check-btn-wrap">
        <el-button type="primary" size="large" @click="checkForUpdate" :loading="checking">
          <el-icon><Refresh /></el-icon>
          检查更新
        </el-button>
      </div>
    </el-card>

    <!-- 更新详情 -->
    <el-card v-if="hasUpdate && updateInfo" class="info-card">
      <template #header>
        <span>更新详情</span>
      </template>
      <div class="update-details">
        <div class="detail-item">
          <span class="detail-label">版本号</span>
          <span class="detail-value">v{{ updateInfo.version }}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">文件大小</span>
          <span class="detail-value">{{ formatSize(updateInfo.size) }}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">发布日期</span>
          <span class="detail-value">{{ formatDate(updateInfo.releaseDate) }}</span>
        </div>
        <div class="detail-item" v-if="updateInfo.forceUpdate">
          <span class="detail-label">更新类型</span>
          <el-tag type="danger">强制更新</el-tag>
        </div>
        <div class="detail-item" v-if="updateInfo.breakingChanges">
          <span class="detail-label">兼容性</span>
          <el-tag type="warning">包含破坏性变更</el-tag>
        </div>
      </div>

      <!-- 更新日志 -->
      <div v-if="updateInfo.changelog" class="changelog-section">
        <h4>更新日志</h4>
        <ul class="changelog-list">
          <li v-for="(item, index) in updateInfo.changelog.zh" :key="index">
            {{ item }}
          </li>
        </ul>
      </div>
    </el-card>

    <!-- 更新历史 -->
    <el-card class="info-card">
      <template #header>
        <span>更新历史</span>
      </template>
      <el-timeline v-if="updateHistory.length > 0">
        <el-timeline-item
          v-for="item in updateHistory"
          :key="item.id"
          :type="item.version === currentVersion ? 'primary' : ''"
          :timestamp="formatDate(item.releaseDate)"
        >
          <div class="history-item">
            <div class="history-version">
              v{{ item.version }}
              <el-tag v-if="item.version === currentVersion" size="small" type="success">当前</el-tag>
            </div>
            <div class="history-meta">
              <span>{{ item.platform }} / {{ item.arch }}</span>
              <span>{{ formatSize(item.size) }}</span>
              <span>{{ item.downloadCount }} 次下载</span>
            </div>
            <ul v-if="item.changelog && item.changelog.zh" class="history-changelog">
              <li v-for="(log, idx) in item.changelog.zh.slice(0, 3)" :key="idx">{{ log }}</li>
            </ul>
          </div>
        </el-timeline-item>
      </el-timeline>
      <el-empty v-else description="暂无更新历史" />
    </el-card>

    <!-- 备份管理 -->
    <el-card class="info-card">
      <template #header>
        <span>备份管理</span>
      </template>
      <el-table :data="backups" style="width: 100%">
        <el-table-column prop="name" label="备份名称" />
        <el-table-column prop="size" label="大小" :formatter="(row) => formatSize(row.size)" />
        <el-table-column prop="createdAt" label="创建时间" :formatter="(row) => formatDate(row.createdAt)" />
        <el-table-column label="操作" width="150">
          <template #default="{ row }">
            <el-button link type="primary" @click="restoreBackup(row.name)">恢复</el-button>
            <el-button link type="danger" @click="deleteBackup(row.name)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-empty v-if="backups.length === 0" description="暂无备份" />
    </el-card>

    <!-- 安装确认对话框 -->
    <el-dialog
      v-model="showApplyDialog"
      title="确认安装更新"
      width="500px"
      :close-on-click-modal="false"
    >
      <el-alert
        title="安装更新前请确保已备份重要数据"
        type="warning"
        :closable="false"
        show-icon
        style="margin-bottom: 16px"
      />
      <p>安装过程将执行以下操作：</p>
      <ol class="update-steps">
        <li>备份当前版本到 backups 目录</li>
        <li>解压并验证更新包</li>
        <li>执行预安装脚本（如果有）</li>
        <li>替换文件并安装依赖</li>
        <li>执行安装后脚本（如果有）</li>
      </ol>
      <p class="update-tip">安装完成后需要手动重启服务器</p>
      <template #footer>
        <el-checkbox v-model="backupBeforeApply" style="margin-right: 16px">
          备份当前版本
        </el-checkbox>
        <el-button @click="showApplyDialog = false">取消</el-button>
        <el-button type="primary" @click="confirmApply" :loading="applying">
          确认安装
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh, Download, Check } from '@element-plus/icons-vue'
import { updateApi } from '../../api/update'

// 状态
const currentVersion = ref('')
const remoteVersion = ref('')
const platform = ref('')
const arch = ref('')
const nodeVersion = ref('')
const hasUpdate = ref(false)
const checkStatus = ref(false)
const checking = ref(false)
const downloading = ref(false)
const applying = ref(false)
const downloadProgress = ref(0)
const downloadStatus = ref('none')
const updateInfo = ref(null)
const downloadedFile = ref(null)
const updateHistory = ref([])
const backups = ref([])

// 配置（地址固定，只保留通道和自动设置）
const updateConfig = ref({
  channel: 'stable',
  autoCheck: true,
  autoDownload: false
})
const showApplyDialog = ref(false)
const backupBeforeApply = ref(true)

// 计算属性
const statusSubTitle = computed(() => {
  if (hasUpdate.value) {
    return `发现新版本 v${remoteVersion.value}，可以下载更新`
  }
  return '当前已是最新版本，无需更新'
})

const downloadText = computed(() => {
  if (downloadStatus.value === 'completed') {
    return '下载完成，可以安装更新'
  }
  return `正在下载... ${downloadProgress.value}%`
})

// 加载版本信息
async function loadVersion() {
  try {
    const res = await updateApi.getVersion()
    if (res.code === 200) {
      currentVersion.value = res.data.version
      platform.value = res.data.platform
      arch.value = res.data.arch
      nodeVersion.value = res.data.nodeVersion
    }
  } catch (e) {
    console.error('获取版本失败:', e)
  }
}

// 加载配置
async function loadConfig() {
  try {
    const res = await updateApi.getUpdateConfig()
    if (res.code === 200) {
      updateConfig.value = res.data
    }
  } catch (e) {
    console.error('获取配置失败:', e)
  }
}

// 检查更新
async function checkForUpdate() {
  checking.value = true
  try {
    const res = await updateApi.checkUpdate()
    if (res.code === 200) {
      const data = res.data
      hasUpdate.value = data.hasUpdate
      remoteVersion.value = data.version || ''
      updateInfo.value = data.hasUpdate ? data : null
      checkStatus.value = true
      downloadStatus.value = 'none'
      downloadProgress.value = 0

      if (hasUpdate.value) {
        ElMessage.success(`发现新版本 v${data.version}`)
        if (updateConfig.value.autoDownload) {
          startDownload()
        }
      } else {
        ElMessage.success('已是最新版本')
      }
    } else {
      ElMessage.error(res.message)
    }
  } catch (e) {
    ElMessage.error(e.message || '检查更新失败')
  } finally {
    checking.value = false
  }
}

// 开始下载
async function startDownload() {
  if (!updateInfo.value) return

  downloading.value = true
  downloadStatus.value = 'downloading'
  downloadProgress.value = 0

  try {
    const res = await updateApi.downloadUpdate(updateInfo.value)
    if (res.code === 200) {
      downloadedFile.value = res.data
      downloadStatus.value = 'completed'
      downloadProgress.value = 100
      ElMessage.success('下载完成')
    } else {
      throw new Error(res.message)
    }
  } catch (e) {
    downloadStatus.value = 'error'
    ElMessage.error(e.message || '下载失败')
  } finally {
    downloading.value = false
  }
}

// 开始安装
function startApply() {
  showApplyDialog.value = true
}

// 确认安装
async function confirmApply() {
  if (!downloadedFile.value) return

  applying.value = true
  try {
    const res = await updateApi.applyUpdate(
      downloadedFile.value.filePath,
      backupBeforeApply.value
    )
    if (res.code === 200) {
      ElMessage.success('更新安装成功')
      showApplyDialog.value = false
      
      ElMessageBox.alert(
        `系统已更新到 v${res.data.newVersion}，请重启服务器以应用更新`,
        '更新完成',
        { 
          type: 'success', 
          confirmButtonText: '知道了',
          callback: () => {
            checkStatus.value = false
            hasUpdate.value = false
            downloadStatus.value = 'none'
            loadVersion()
          }
        }
      )
    } else {
      throw new Error(res.message)
    }
  } catch (e) {
    ElMessage.error(e.message || '安装失败')
  } finally {
    applying.value = false
  }
}

// 加载更新历史
async function loadUpdateHistory() {
  try {
    const res = await updateApi.getUpdateHistory()
    if (res.code === 200) {
      updateHistory.value = res.data.list || []
    }
  } catch (e) {
    console.error('获取更新历史失败:', e)
  }
}

// 加载备份列表
async function loadBackups() {
  try {
    const res = await updateApi.getBackups()
    if (res.code === 200) {
      backups.value = res.data || []
    }
  } catch (e) {
    console.error('获取备份列表失败:', e)
  }
}

// 恢复备份
async function restoreBackup(name) {
  try {
    await ElMessageBox.confirm(
      `确定要恢复备份 ${name} 吗？这将覆盖当前版本。`,
      '确认恢复',
      { type: 'warning' }
    )
    
    const res = await updateApi.restoreBackup(name)
    if (res.code === 200) {
      ElMessage.success('恢复成功')
    } else {
      ElMessage.error(res.message)
    }
  } catch (e) {
    if (e !== 'cancel') {
      ElMessage.error('恢复失败')
    }
  }
}

// 删除备份
async function deleteBackup(name) {
  try {
    await ElMessageBox.confirm(
      `确定要删除备份 ${name} 吗？`,
      '确认删除',
      { type: 'warning' }
    )
    
    const res = await updateApi.deleteBackup(name)
    if (res.code === 200) {
      ElMessage.success('删除成功')
      loadBackups()
    } else {
      ElMessage.error(res.message)
    }
  } catch (e) {
    if (e !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

// 工具函数
function formatSize(bytes) {
  if (!bytes) return '-'
  const units = ['B', 'KB', 'MB', 'GB']
  let size = bytes
  let unitIndex = 0
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }
  return `${size.toFixed(2)} ${units[unitIndex]}`
}

function formatDate(date) {
  if (!date) return '-'
  return new Date(date).toLocaleString('zh-CN')
}

onMounted(() => {
  loadVersion()
  loadConfig()
  loadUpdateHistory()
  loadBackups()
})
</script>

<style lang="scss" scoped>
.update-page {
  padding: 20px;
  max-width: 1000px;
  margin: 0 auto;
}

.update-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;

  h2 {
    font-size: 20px;
    font-weight: 700;
    margin: 0;
  }
}

.version-card,
.info-card {
  margin-bottom: 20px;
  background: var(--bg-card);
  border: 1px solid var(--border);

  :deep(.el-card__header) {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: var(--bg-card2);
    border-bottom: 1px solid var(--border);
    font-weight: 600;
  }
}

.version-info {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  margin-bottom: 24px;
  padding: 16px;
  background: var(--bg-card2);
  border-radius: 8px;

  @media (max-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }
}

.version-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.version-label {
  font-size: 12px;
  color: var(--text-muted);
}

.version-value {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);

  &.has-update {
    color: var(--primary);
  }
}

.check-btn-wrap {
  text-align: center;
  padding: 40px 0;
}

.update-status {
  padding: 20px 0;
}

.download-progress {
  margin-top: 20px;
  padding: 0 40px;

  .progress-text {
    text-align: center;
    margin-top: 10px;
    color: var(--text-muted);
    font-size: 13px;
  }
}

.update-details {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  margin-bottom: 20px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
}

.detail-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.detail-label {
  font-size: 13px;
  color: var(--text-muted);
}

.detail-value {
  font-size: 14px;
  color: var(--text-primary);
  font-weight: 500;
}

.changelog-section {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid var(--border);

  h4 {
    font-size: 14px;
    font-weight: 600;
    margin: 0 0 12px;
    color: var(--text-primary);
  }
}

.changelog-list {
  margin: 0;
  padding-left: 20px;

  li {
    font-size: 13px;
    color: var(--text-secondary);
    line-height: 1.8;
  }
}

.history-item {
  .history-version {
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 8px;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .history-meta {
    font-size: 12px;
    color: var(--text-muted);
    margin-bottom: 8px;

    span {
      margin-right: 12px;
    }
  }

  .history-changelog {
    margin: 0;
    padding-left: 16px;
    font-size: 12px;
    color: var(--text-secondary);

    li {
      line-height: 1.6;
    }
  }
}

.update-steps {
  margin: 16px 0;
  padding-left: 20px;
  color: var(--text-secondary);

  li {
    line-height: 2;
  }
}

.update-tip {
  color: var(--primary);
  font-size: 13px;
  margin-top: 16px;
}
</style>
