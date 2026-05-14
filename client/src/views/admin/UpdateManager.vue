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
          <span class="version-label">当前提交</span>
          <code class="commit-hash">{{ currentCommit || '-' }}</code>
        </div>
        <div class="version-item">
          <span class="version-label">远程提交</span>
          <code class="commit-hash">{{ remoteCommit || '-' }}</code>
        </div>
      </div>

      <div class="update-status" v-if="checkStatus">
        <el-result
          :icon="hasUpdate ? 'warning' : 'success'"
          :title="hasUpdate ? '发现新版本' : '已是最新版本'"
          :sub-title="hasUpdate ? '系统可以更新到最新版本' : '当前已是最新版本，无需更新'"
        >
          <template #extra>
            <el-button type="primary" @click="checkForUpdate" :loading="checking">
              <el-icon><Refresh /></el-icon>
              检查更新
            </el-button>
            <el-button v-if="hasUpdate" type="success" @click="startUpdate" :loading="updating">
              <el-icon><Download /></el-icon>
              立即更新
            </el-button>
          </template>
        </el-result>
      </div>
      <div v-else class="check-btn-wrap">
        <el-button type="primary" size="large" @click="checkForUpdate" :loading="checking">
          <el-icon><Refresh /></el-icon>
          检查更新
        </el-button>
      </div>
    </el-card>

    <!-- 更新说明 -->
    <el-card class="info-card">
      <template #header>
        <span>更新说明</span>
      </template>
      <el-timeline>
        <el-timeline-item
          v-for="(item, index) in updateNotes"
          :key="index"
          :type="item.type"
          :timestamp="item.time"
        >
          {{ item.content }}
        </el-timeline-item>
      </el-timeline>
    </el-card>

    <!-- 更新日志 -->
    <el-card class="info-card">
      <template #header>
        <span>更新日志</span>
      </template>
      <div class="changelog">
        <div class="changelog-item">
          <h4>v1.2.2 (2026-05-14)</h4>
          <ul>
            <li>✨ 移动端响应式适配优化</li>
            <li>✨ 新增移动端侧边栏菜单</li>
            <li>✨ 系统自动更新功能</li>
            <li>🎨 优化多设备显示效果</li>
          </ul>
        </div>
        <div class="changelog-item">
          <h4>v1.2.1 (2026-05-14)</h4>
          <ul>
            <li>✨ 关于我页面管理</li>
            <li>✨ GitHub自动同步</li>
            <li>✨ .vscode开发配置</li>
          </ul>
        </div>
        <div class="changelog-item">
          <h4>v1.2.0 (2026-05-14)</h4>
          <ul>
            <li>✨ API版本管理</li>
            <li>✨ Markdown编辑器</li>
            <li>🎨 主题系统重构</li>
          </ul>
        </div>
      </div>
    </el-card>

    <!-- 更新确认对话框 -->
    <el-dialog
      v-model="updateDialogVisible"
      title="确认更新"
      width="500px"
      :close-on-click-modal="false"
    >
      <el-alert
        title="更新前请确保已备份重要数据"
        type="warning"
        :closable="false"
        show-icon
        style="margin-bottom: 16px"
      />
      <p>更新过程将执行以下操作：</p>
      <ol class="update-steps">
        <li>备份数据库（可选）</li>
        <li>从 GitHub 拉取最新代码</li>
        <li>安装/更新依赖</li>
        <li>重新构建前端</li>
      </ol>
      <p class="update-tip">更新完成后需要手动重启服务器</p>
      <template #footer>
        <el-checkbox v-model="backupDatabase" style="margin-right: 16px">
          备份数据库
        </el-checkbox>
        <el-button @click="updateDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmUpdate" :loading="updating">
          确认更新
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh, Download } from '@element-plus/icons-vue'
import { updateApi } from '../../api'

const currentVersion = ref('')
const remoteVersion = ref('')
const currentCommit = ref('')
const remoteCommit = ref('')
const hasUpdate = ref(false)
const checkStatus = ref(false)
const checking = ref(false)
const updating = ref(false)
const updateDialogVisible = ref(false)
const backupDatabase = ref(true)

const updateNotes = [
  { type: 'primary', time: '更新前', content: '系统会自动备份数据库（如果勾选）' },
  { type: 'warning', time: '更新中', content: '请勿关闭浏览器或刷新页面' },
  { type: 'success', time: '更新后', content: '需要手动重启服务器以应用更新' }
]

async function loadVersion() {
  try {
    const res = await updateApi.getVersion()
    if (res.code === 200) {
      currentVersion.value = res.data.version
    }
  } catch (e) {
    console.error('获取版本失败:', e)
  }
}

async function checkForUpdate() {
  checking.value = true
  try {
    const res = await updateApi.checkUpdate()
    if (res.code === 200) {
      currentVersion.value = res.data.currentVersion
      remoteVersion.value = res.data.remoteVersion
      currentCommit.value = res.data.currentCommit
      remoteCommit.value = res.data.remoteCommit
      hasUpdate.value = res.data.hasUpdate
      checkStatus.value = true

      if (hasUpdate.value) {
        ElMessage.success('发现新版本')
      } else {
        ElMessage.success('已是最新版本')
      }
    } else {
      ElMessage.error(res.message)
    }
  } catch (e) {
    ElMessage.error('检查更新失败')
  } finally {
    checking.value = false
  }
}

function startUpdate() {
  updateDialogVisible.value = true
}

async function confirmUpdate() {
  updating.value = true
  try {
    const res = await updateApi.performUpdate(backupDatabase.value)
    if (res.code === 200) {
      ElMessage.success('更新成功')
      updateDialogVisible.value = false
      // 重新加载版本信息
      await loadVersion()
      checkStatus.value = false

      // 提示重启
      ElMessageBox.alert(
        `系统已更新到 v${res.data.version}，请重启服务器以应用更新`,
        '更新完成',
        { type: 'success', confirmButtonText: '知道了' }
      )
    } else {
      ElMessage.error(res.message)
    }
  } catch (e) {
    ElMessage.error('更新失败')
  } finally {
    updating.value = false
  }
}

onMounted(() => {
  loadVersion()
})
</script>

<style lang="scss" scoped>
.update-page {
  padding: 20px;
  max-width: 900px;
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

.version-card {
  margin-bottom: 20px;
  background: var(--bg-card);
  border: 1px solid var(--border);
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

.commit-hash {
  font-size: 14px;
  color: var(--text-secondary);
  background: var(--bg-card);
  padding: 4px 8px;
  border-radius: 4px;
}

.check-btn-wrap {
  text-align: center;
  padding: 40px 0;
}

.update-status {
  padding: 20px 0;
}

.info-card {
  margin-bottom: 20px;
  background: var(--bg-card);
  border: 1px solid var(--border);

  :deep(.el-card__header) {
    background: var(--bg-card2);
    border-bottom: 1px solid var(--border);
    font-weight: 600;
  }
}

.changelog {
  .changelog-item {
    margin-bottom: 20px;

    &:last-child {
      margin-bottom: 0;
    }

    h4 {
      font-size: 15px;
      font-weight: 600;
      color: var(--text-primary);
      margin: 0 0 10px;
    }

    ul {
      margin: 0;
      padding-left: 20px;

      li {
        font-size: 13px;
        color: var(--text-secondary);
        line-height: 1.8;
      }
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
