<template>
  <div class="profile-page">
    <div class="page-header">
      <div class="container">
        <h1>个人中心</h1>
      </div>
    </div>
    <div class="container page-body">
      <!-- 左侧用户卡片 -->
      <div class="user-card">
        <div class="avatar-area">
          <div class="avatar-wrap">
            <el-avatar :src="profile.avatar" :size="80" class="user-avatar">
              {{ profile.nickname?.[0] }}
            </el-avatar>
            <div class="avatar-edit" @click="triggerUpload">
              <el-icon><Edit /></el-icon>
            </div>
          </div>
          <input ref="fileInput" type="file" accept="image/*" style="display:none" @change="handleAvatarChange" />
        </div>
        <h3 class="user-nickname">{{ profile.nickname }}</h3>
        <div class="user-uid">UID: {{ profile.uid }}</div>
        <el-tag :type="profile.role === 'admin' ? 'warning' : 'info'" size="small">
          {{ profile.role === 'admin' ? '管理员' : '普通用户' }}
        </el-tag>

        <div class="user-stats">
          <div class="stat-item" @click="$router.push('/user/favorites')">
            <div class="stat-val">{{ stats.favoriteCount || 0 }}</div>
            <div class="stat-lab">收藏接口</div>
          </div>
          <div class="stat-item">
            <div class="stat-val">{{ stats.todayCalls || 0 }}</div>
            <div class="stat-lab">今日调用</div>
          </div>
          <div class="stat-item">
            <div class="stat-val">{{ stats.totalCalls || 0 }}</div>
            <div class="stat-lab">总调用数</div>
          </div>
          <div class="stat-item" @click="$router.push('/user/keys')">
            <div class="stat-val">{{ stats.keyCount || 0 }}</div>
            <div class="stat-lab">活跃密钥</div>
          </div>
        </div>

        <!-- 积分卡片 -->
        <div class="credits-card">
          <div class="credits-header">
            <span class="credits-icon">💰</span>
            <span class="credits-title">我的积分</span>
          </div>
          <div class="credits-balance">{{ profile.credits || 0 }}</div>
          <div class="credits-desc">当前可用积分</div>
          <div class="credits-actions">
            <el-button type="primary" class="recharge-btn" disabled title="充值功能开发中，敬请期待">
              <el-icon><Coin /></el-icon> 积分充值
            </el-button>
            <div class="recharge-hint">充值功能开发中...</div>
          </div>
        </div>
      </div>

      <!-- 右侧内容 -->
      <div class="right-content">
        <!-- 基本信息 -->
        <div class="info-card">
          <div class="card-title">基本信息</div>
          <el-form :model="editForm" label-width="80px">
            <el-form-item label="用户名">
              <el-input :value="profile.username" disabled />
            </el-form-item>
            <el-form-item label="邮箱">
              <el-input :value="profile.email" disabled />
            </el-form-item>
            <el-form-item label="昵称">
              <el-input v-model="editForm.nickname" placeholder="输入昵称" maxlength="30" show-word-limit />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="saveProfile" :loading="saving">保存修改</el-button>
            </el-form-item>
          </el-form>
        </div>

        <!-- API密钥 -->
        <div class="info-card">
          <div class="card-title">系统API密钥</div>
          <p class="card-desc">用于调用平台付费接口时的身份验证，请妥善保管</p>
          
          <div class="key-item">
            <label>API Key</label>
            <div class="key-value">
              <el-input :value="showKey ? profile.api_key : maskKey(profile.api_key)" readonly>
                <template #append>
                  <el-button @click="showKey = !showKey">
                    <el-icon><component :is="showKey ? 'Hide' : 'View'" /></el-icon>
                  </el-button>
                </template>
              </el-input>
              <el-button @click="copy(profile.api_key)"><el-icon><CopyDocument /></el-icon></el-button>
            </div>
          </div>
          <div class="key-item" style="margin-top:12px">
            <label>API Secret</label>
            <div class="key-value">
              <el-input :value="showSecret ? profile.api_secret : maskKey(profile.api_secret)" readonly>
                <template #append>
                  <el-button @click="showSecret = !showSecret">
                    <el-icon><component :is="showSecret ? 'Hide' : 'View'" /></el-icon>
                  </el-button>
                </template>
              </el-input>
              <el-button @click="copy(profile.api_secret)"><el-icon><CopyDocument /></el-icon></el-button>
            </div>
          </div>
          <el-button type="warning" plain @click="confirmRegenerate" style="margin-top:16px">
            <el-icon><Refresh /></el-icon> 重新生成密钥
          </el-button>
        </div>

        <!-- 修改密码 -->
        <div class="info-card">
          <div class="card-title">修改密码</div>
          <el-form :model="pwdForm" label-width="80px">
            <el-form-item label="原密码">
              <el-input v-model="pwdForm.oldPassword" type="password" show-password placeholder="当前密码" />
            </el-form-item>
            <el-form-item label="新密码">
              <el-input v-model="pwdForm.newPassword" type="password" show-password placeholder="新密码（至少6位）" />
            </el-form-item>
            <el-form-item label="确认密码">
              <el-input v-model="pwdForm.confirmPassword" type="password" show-password placeholder="再次输入新密码" @keyup.enter="changePassword" />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="changePassword" :loading="pwdLoading">修改密码</el-button>
            </el-form-item>
          </el-form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { userApi } from '../../api'
import { useUserStore } from '../../stores/user'

const userStore = useUserStore()
const profile = ref({})
const stats = ref({})
const saving = ref(false)
const pwdLoading = ref(false)
const showKey = ref(false)
const showSecret = ref(false)
const fileInput = ref()

const editForm = reactive({ nickname: '' })
const pwdForm = reactive({ oldPassword: '', newPassword: '', confirmPassword: '' })

function maskKey(key) {
  if (!key) return ''
  return key.substring(0, 6) + '•'.repeat(20) + key.slice(-4)
}
function copy(text) {
  if (!text) return
  navigator.clipboard.writeText(text).then(() => ElMessage.success('已复制'))
}

async function loadData() {
  const [profRes, statRes] = await Promise.allSettled([userApi.getProfile(), userApi.getStats()])
  if (profRes.value?.code === 200) {
    profile.value = profRes.value.data
    editForm.nickname = profRes.value.data.nickname
  }
  if (statRes.value?.code === 200) stats.value = statRes.value.data
}

function triggerUpload() { fileInput.value?.click() }

async function handleAvatarChange(e) {
  const file = e.target.files[0]
  if (!file) return
  if (file.size > 2 * 1024 * 1024) return ElMessage.error('图片不能超过2MB')
  const formData = new FormData()
  formData.append('avatar', file)
  const res = await userApi.uploadAvatar(formData)
  if (res.code === 200) {
    profile.value.avatar = res.data.avatar
    userStore.setUser({ ...userStore.userInfo, avatar: res.data.avatar })
    ElMessage.success('头像更新成功')
  }
}

async function saveProfile() {
  saving.value = true
  try {
    const res = await userApi.updateProfile({ nickname: editForm.nickname })
    if (res.code === 200) {
      profile.value.nickname = editForm.nickname
      userStore.setUser({ ...userStore.userInfo, nickname: editForm.nickname })
      ElMessage.success('保存成功')
    } else ElMessage.error(res.message)
  } finally { saving.value = false }
}

async function confirmRegenerate() {
  await ElMessageBox.confirm('重新生成后旧密钥将立即失效，确认继续？', '警告', { type: 'warning' })
  const res = await userApi.regenerateKey()
  if (res.code === 200) {
    profile.value.api_key = res.data.api_key
    profile.value.api_secret = res.data.api_secret
    ElMessage.success('密钥已重新生成')
  }
}

async function changePassword() {
  if (!pwdForm.oldPassword || !pwdForm.newPassword) return ElMessage.warning('请填写完整')
  if (pwdForm.newPassword !== pwdForm.confirmPassword) return ElMessage.error('两次密码不一致')
  pwdLoading.value = true
  try {
    const res = await userApi.changePassword({ oldPassword: pwdForm.oldPassword, newPassword: pwdForm.newPassword })
    if (res.code === 200) {
      ElMessage.success('密码修改成功')
      Object.assign(pwdForm, { oldPassword: '', newPassword: '', confirmPassword: '' })
    } else ElMessage.error(res.message)
  } finally { pwdLoading.value = false }
}

onMounted(loadData)
</script>

<style lang="scss" scoped>
.profile-page { min-height: 100vh; padding-bottom: 60px; }
.page-header {
  background: linear-gradient(180deg, var(--bg-card) 0%, transparent 100%);
  padding: 40px 24px 32px;
  border-bottom: 1px solid var(--border);
  h1 { font-size: 28px; font-weight: 700; color: var(--text-primary); }
}
.container { max-width: 1280px; margin: 0 auto; padding: 0 24px; }
.page-body { display: flex; gap: 24px; padding-top: 32px; align-items: flex-start; }

.user-card {
  width: 240px;
  flex-shrink: 0;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 32px 20px;
  text-align: center;
  position: sticky;
  top: 80px;
}
.avatar-area { display: flex; justify-content: center; margin-bottom: 16px; }
.avatar-wrap {
  position: relative;
  width: 80px; height: 80px;
  .user-avatar { cursor: pointer; }
  .avatar-edit {
    position: absolute;
    bottom: 0; right: 0;
    width: 26px; height: 26px;
    background: var(--primary);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: var(--btn-text);
    font-size: 12px;
    box-shadow: 0 2px 8px rgba(233,147,18,0.4);
    &:hover { background: var(--primary-light); }
  }
}
.user-nickname { font-size: 18px; font-weight: 600; color: var(--text-primary); margin-bottom: 6px; }
.user-uid { font-size: 12px; color: var(--text-muted); margin-bottom: 12px; font-family: monospace; }

.user-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-top: 24px;
}
.stat-item {
  background: var(--bg-card2);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 12px 8px;
  cursor: pointer;
  transition: var(--transition);
  &:hover { border-color: var(--border-active); }
  .stat-val { font-size: 20px; font-weight: 700; color: var(--primary); }
  .stat-lab { font-size: 11px; color: var(--text-muted); margin-top: 4px; }
}

.right-content { flex: 1; display: flex; flex-direction: column; gap: 20px; }
.info-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 24px;
}
.card-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border);
}
.card-desc { font-size: 13px; color: var(--text-muted); margin-bottom: 16px; }

.key-item {
  label { display: block; font-size: 13px; color: var(--text-secondary); margin-bottom: 8px; }
  .key-value { display: flex; gap: 8px; }
}

// 积分卡片
.credits-card {
  margin-top: 24px;
  background: linear-gradient(135deg, rgba(233, 147, 18, 0.15), rgba(245, 158, 11, 0.08));
  border: 1px solid rgba(233, 147, 18, 0.25);
  border-radius: var(--radius-md);
  padding: 20px;
  text-align: center;
}
.credits-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin-bottom: 12px;
  .credits-icon { font-size: 18px; }
  .credits-title { font-size: 13px; color: var(--text-secondary); }
}
.credits-balance {
  font-size: 36px;
  font-weight: 800;
  color: var(--primary);
  text-shadow: 0 2px 10px rgba(233, 147, 18, 0.3);
}
.credits-desc {
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 4px;
  margin-bottom: 16px;
}
.credits-actions {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}
.recharge-btn {
  width: 100%;
  background: linear-gradient(135deg, var(--primary), #f59e0b) !important;
  border: none !important;
  color: var(--btn-text) !important;
  font-weight: 600;
  &:hover {
    opacity: 0.9;
    transform: translateY(-1px);
  }
  &.is-disabled {
    background: var(--bg-card2) !important;
    color: var(--text-muted) !important;
  }
}
.recharge-hint {
  font-size: 11px;
  color: var(--text-muted);
  font-style: italic;
}
</style>
