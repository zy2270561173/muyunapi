<template>
  <div class="update-page">
    <h2 style="font-size:20px;font-weight:700;color:var(--text-primary);margin-bottom:24px">系统更新</h2>

    <!-- 核心状态区 - 左右布局 -->
    <div class="update-hero" v-if="currentVersion">
      <!-- 左侧：当前版本信息 -->
      <div class="hero-left">
        <div class="version-display">
          <div class="version-badge">
            <span class="version-label">当前版本</span>
            <span class="version-number">v{{ currentVersion }}</span>
          </div>
          <div class="version-tags">
            <el-tag size="small" type="info">{{ platform }}</el-tag>
            <el-tag size="small" type="info">{{ arch }}</el-tag>
            <el-tag size="small" type="info">Node {{ nodeVersion }}</el-tag>
          </div>
        </div>
      </div>

      <!-- 右侧：更新状态 -->
      <div class="hero-right">
        <template v-if="checkStatus">
          <!-- 发现新版本 -->
          <div v-if="hasUpdate" class="update-alert">
            <div class="alert-icon new">
              <el-icon><WarningFilled /></el-icon>
            </div>
            <div class="alert-content">
              <div class="alert-title">发现新版本</div>
              <div class="alert-desc">v{{ remoteVersion }} 可用</div>
            </div>
            <div class="alert-action">
              <el-button type="primary" size="small" @click="startDownload" :loading="downloading">
                <el-icon><Download /></el-icon>
                {{ downloading ? '下载中' : '下载更新' }}
              </el-button>
            </div>
          </div>

          <!-- 已是最新 -->
          <div v-else class="update-alert success">
            <div class="alert-icon">
              <el-icon><CircleCheckFilled /></el-icon>
            </div>
            <div class="alert-content">
              <div class="alert-title">已是最新版本</div>
              <div class="alert-desc">当前系统无需更新</div>
            </div>
            <div class="alert-action">
              <el-button size="small" @click="checkForUpdate" :loading="checking">
                <el-icon><Refresh /></el-icon>
                重新检查
              </el-button>
            </div>
          </div>
        </template>

        <!-- 未检查状态 -->
        <div v-else class="check-initial">
          <el-button type="primary" size="large" @click="checkForUpdate" :loading="checking">
            <el-icon><Refresh /></el-icon>
            检查更新
          </el-button>
        </div>
      </div>
    </div>

    <!-- 下载进度 -->
    <div v-if="downloading || downloadStatus === 'completed'" class="download-section">
      <div class="download-card">
        <div class="download-header">
          <div class="download-info">
            <el-icon class="download-icon" :class="{ 'success': downloadStatus === 'completed' }">
              <component :is="downloadStatus === 'completed' ? 'CircleCheck' : 'Loading'" />
            </el-icon>
            <div>
              <div class="download-title">{{ downloadStatus === 'completed' ? '下载完成' : '正在下载更新包' }}</div>
              <div class="download-sub">{{ downloadText }}</div>
            </div>
          </div>
          <el-button v-if="downloadStatus === 'completed'" type="success" @click="startApply">
            <el-icon><Check /></el-icon>
            立即安装
          </el-button>
        </div>
        <el-progress
          :percentage="downloadProgress"
          :status="downloadStatus === 'completed' ? 'success' : ''"
          :stroke-width="8"
        />
      </div>
    </div>

    <!-- 更新详情 -->
    <div v-if="hasUpdate && updateInfo" class="update-section">
      <div class="section-title">📦 更新详情</div>
      <div class="detail-grid">
        <div class="detail-card">
          <div class="detail-icon">
            <el-icon><Collection /></el-icon>
          </div>
          <div class="detail-content">
            <div class="detail-label">版本号</div>
            <div class="detail-value">v{{ updateInfo.version }}</div>
          </div>
        </div>
        <div class="detail-card">
          <div class="detail-icon">
            <el-icon><Document /></el-icon>
          </div>
          <div class="detail-content">
            <div class="detail-label">文件大小</div>
            <div class="detail-value">{{ formatSize(updateInfo.size) }}</div>
          </div>
        </div>
        <div class="detail-card">
          <div class="detail-icon">
            <el-icon><Calendar /></el-icon>
          </div>
          <div class="detail-content">
            <div class="detail-label">发布日期</div>
            <div class="detail-value">{{ formatDate(updateInfo.releaseDate) }}</div>
          </div>
        </div>
        <div class="detail-card" v-if="updateInfo.forceUpdate || updateInfo.breakingChanges">
          <div class="detail-icon warning">
            <el-icon><Warning /></el-icon>
          </div>
          <div class="detail-content">
            <div class="detail-label">注意事项</div>
            <div class="detail-tags">
              <el-tag v-if="updateInfo.forceUpdate" type="danger" size="small">强制更新</el-tag>
              <el-tag v-if="updateInfo.breakingChanges" type="warning" size="small">破坏性变更</el-tag>
            </div>
          </div>
        </div>
      </div>

      <!-- 更新日志 -->
      <div v-if="updateInfo.changelog" class="changelog-card">
        <div class="changelog-header">
          <el-icon><List /></el-icon>
          <span>更新日志</span>
        </div>
        <ul class="changelog-list">
          <li v-for="(item, index) in updateInfo.changelog.zh" :key="index">
            {{ item }}
          </li>
        </ul>
      </div>
    </div>

    <!-- 更新历史 & 备份管理 -->
    <div class="bottom-grid">
      <!-- 更新历史 -->
      <div class="update-section">
        <div class="section-title">📋 更新历史</div>
        <div class="history-list" v-if="updateHistory.length > 0">
          <div v-for="item in updateHistory" :key="item.id" class="history-item">
            <div class="history-version">
              <span class="version-tag">v{{ item.version }}</span>
              <el-tag v-if="item.version === currentVersion" size="small" type="success">当前</el-tag>
            </div>
            <div class="history-meta">
              <span><el-icon><Document /></el-icon> {{ formatSize(item.size) }}</span>
              <span><el-icon><Download /></el-icon> {{ item.downloadCount }} 次</span>
              <span><el-icon><Calendar /></el-icon> {{ formatDate(item.releaseDate) }}</span>
            </div>
            <div v-if="item.changelog && item.changelog.zh" class="history-changelog">
              <span v-for="(log, idx) in item.changelog.zh.slice(0, 2)" :key="idx">{{ log }}</span>
            </div>
          </div>
        </div>
        <el-empty v-else description="暂无更新历史" :image-size="60" />
      </div>

      <!-- 备份管理 -->
      <div class="update-section">
        <div class="section-title">💾 备份管理</div>
        <div class="backup-list" v-if="backups.length > 0">
          <div v-for="backup in backups" :key="backup.name" class="backup-item">
            <div class="backup-info">
              <div class="backup-name">
                <el-icon><FolderOpened /></el-icon>
                {{ backup.name }}
              </div>
              <div class="backup-meta">
                <span>{{ formatSize(backup.size) }}</span>
                <span>{{ formatDate(backup.createdAt) }}</span>
              </div>
            </div>
            <div class="backup-actions">
              <el-button link type="primary" @click="restoreBackup(backup.name)">恢复</el-button>
              <el-button link type="danger" @click="deleteBackup(backup.name)">删除</el-button>
            </div>
          </div>
        </div>
        <el-empty v-else description="暂无备份记录" :image-size="60" />
      </div>
    </div>

    <!-- 安装确认对话框 -->
    <el-dialog
      v-model="showApplyDialog"
      title="确认安装更新"
      width="500px"
      :close-on-click-modal="false"
    >
      <div class="apply-dialog-content">
        <el-alert
          title="安装更新前请确保已备份重要数据"
          type="warning"
          :closable="false"
          show-icon
          style="margin-bottom: 20px"
        />

        <div class="apply-steps">
          <div class="step-title">安装流程</div>
          <div class="step-item">
            <div class="step-num">1</div>
            <div class="step-text">备份当前版本到 backups 目录</div>
          </div>
          <div class="step-item">
            <div class="step-num">2</div>
            <div class="step-text">解压并验证更新包</div>
          </div>
          <div class="step-item">
            <div class="step-num">3</div>
            <div class="step-text">替换系统文件并安装依赖</div>
          </div>
          <div class="step-item">
            <div class="step-num">4</div>
            <div class="step-text">执行安装后脚本（如有）</div>
          </div>
          <div class="step-item">
            <div class="step-num">5</div>
            <div class="step-text">系统将自动重启应用更新</div>
          </div>
        </div>

        <div class="apply-options">
          <el-checkbox v-model="backupBeforeApply">
            安装前自动备份当前版本
          </el-checkbox>
        </div>
      </div>

      <template #footer>
        <el-button @click="showApplyDialog = false">取消</el-button>
        <el-button type="primary" @click="confirmApply" :loading="applying">
          <el-icon><Check /></el-icon>
          确认安装
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Refresh, Download, Check, Loading,
  WarningFilled, CircleCheckFilled, CircleCheck,
  Collection, Document, Calendar, Warning, List,
  FolderOpened
} from '@element-plus/icons-vue'
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

// 配置
const updateConfig = ref({
  channel: 'stable',
  autoCheck: true,
  autoDownload: false
})
const showApplyDialog = ref(false)
const backupBeforeApply = ref(true)

// 计算属性
const downloadText = computed(() => {
  if (downloadStatus.value === 'completed') {
    return '更新包已准备就绪，可以开始安装'
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

      // 优先使用 zip 内嵌的 preview 数据填充 updateInfo（更完整）
      if (res.data.preview) {
        const preview = res.data.preview
        // 合并数据：preview 覆盖原有数据（preview 来自 zip，更准确）
        updateInfo.value = {
          ...updateInfo.value,
          version: preview.version || updateInfo.value.version,
          platform: preview.platform || updateInfo.value.platform,
          arch: preview.arch || updateInfo.value.arch,
          channel: preview.channel || updateInfo.value.channel,
          changelog: preview.changelog || updateInfo.value.changelog,
          releaseDate: preview.releaseDate || updateInfo.value.releaseDate,
          forceUpdate: preview.forceUpdate !== undefined ? preview.forceUpdate : updateInfo.value.forceUpdate,
          breakingChanges: preview.breakingChanges !== undefined ? preview.breakingChanges : updateInfo.value.breakingChanges,
          size: res.data.size || updateInfo.value.size
        }
      }

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
  // 进入页面自动检查更新
  checkForUpdate()
})
</script>

<style lang="scss" scoped>
.update-page {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

/* 核心状态区 */
.update-hero {
  display: grid;
  grid-template-columns: 1fr 1.5fr;
  gap: 20px;
  margin-bottom: 20px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
}

.hero-left {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 24px;
}

.version-display {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.version-badge {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.version-label {
  font-size: 12px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 1px;
}

.version-number {
  font-size: 32px;
  font-weight: 700;
  color: var(--primary, #e99312);
  font-family: 'SF Mono', Monaco, monospace;
}

.version-tags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.hero-right {
  display: flex;
  align-items: center;
}

/* 更新提示卡片 */
.update-alert {
  display: flex;
  align-items: center;
  gap: 16px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 20px;
  width: 100%;
  border-left: 4px solid var(--el-color-warning);

  &.success {
    border-left-color: var(--el-color-success);
  }
}

.alert-icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--el-color-warning-light-9);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: var(--el-color-warning);
  flex-shrink: 0;

  &.new {
    background: var(--el-color-warning-light-9);
    color: var(--el-color-warning);
  }

  .update-alert.success & {
    background: var(--el-color-success-light-9);
    color: var(--el-color-success);
  }
}

.alert-content {
  flex: 1;
}

.alert-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.alert-desc {
  font-size: 13px;
  color: var(--text-muted);
}

.alert-action {
  flex-shrink: 0;
}

.check-initial {
  width: 100%;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 32px;
  display: flex;
  justify-content: center;
}

/* 下载进度 */
.download-section {
  margin-bottom: 20px;
}

.download-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 20px;
}

.download-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.download-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.download-icon {
  font-size: 24px;
  color: var(--primary, #e99312);

  &.success {
    color: var(--el-color-success);
  }

  :deep(.el-icon-loading) {
    animation: rotate 1s linear infinite;
  }
}

@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.download-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.download-sub {
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 2px;
}

/* 区块标题 */
.update-section {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 20px;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border);
}

/* 详情网格 */
.detail-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 20px;
}

.detail-card {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  background: var(--bg-card2);
  border-radius: 8px;
}

.detail-icon {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background: var(--primary-color-lighten-2, rgba(233, 147, 18, 0.1));
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  color: var(--primary, #e99312);
  flex-shrink: 0;

  &.warning {
    background: var(--el-color-warning-light-9);
    color: var(--el-color-warning);
  }
}

.detail-content {
  flex: 1;
  min-width: 0;
}

.detail-label {
  font-size: 12px;
  color: var(--text-muted);
  margin-bottom: 4px;
}

.detail-value {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
}

.detail-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

/* 更新日志 */
.changelog-card {
  background: var(--bg-card2);
  border-radius: 8px;
  padding: 16px;
}

.changelog-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 12px;
}

.changelog-list {
  margin: 0;
  padding: 0;
  list-style: none;

  li {
    position: relative;
    padding-left: 16px;
    margin-bottom: 8px;
    font-size: 13px;
    color: var(--text-secondary);
    line-height: 1.6;

    &::before {
      content: '';
      position: absolute;
      left: 0;
      top: 8px;
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--primary, #e99312);
    }

    &:last-child {
      margin-bottom: 0;
    }
  }
}

/* 底部网格 */
.bottom-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;

  @media (max-width: 992px) {
    grid-template-columns: 1fr;
  }
}

/* 历史列表 */
.history-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.history-item {
  padding: 16px;
  background: var(--bg-card2);
  border-radius: 8px;
  transition: background 0.2s;

  &:hover {
    background: var(--border);
  }
}

.history-version {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.version-tag {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  font-family: 'SF Mono', Monaco, monospace;
}

.history-meta {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: var(--text-muted);
  margin-bottom: 8px;

  span {
    display: flex;
    align-items: center;
    gap: 4px;
  }
}

.history-changelog {
  display: flex;
  flex-direction: column;
  gap: 4px;

  span {
    font-size: 12px;
    color: var(--text-secondary);
    line-height: 1.5;

    &::before {
      content: '•';
      margin-right: 6px;
      color: var(--primary, #e99312);
    }
  }
}

/* 备份列表 */
.backup-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.backup-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  background: var(--bg-card2);
  border-radius: 8px;
  transition: background 0.2s;

  &:hover {
    background: var(--border);
  }
}

.backup-info {
  flex: 1;
  min-width: 0;
}

.backup-name {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.backup-meta {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: var(--text-muted);
}

.backup-actions {
  display: flex;
  gap: 8px;
}

/* 安装对话框 */
.apply-dialog-content {
  padding: 4px 0;
}

.apply-steps {
  background: var(--bg-card2);
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
}

.step-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 12px;
}

.step-item {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;

  &:last-child {
    margin-bottom: 0;
  }
}

.step-num {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--primary, #e99312);
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.step-text {
  font-size: 13px;
  color: var(--text-secondary);
}

.apply-options {
  padding: 12px 0;
}
</style>
