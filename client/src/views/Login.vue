<template>
  <div class="auth-page">
    <div class="auth-bg">
      <div class="hero-orb orb1"></div>
      <div class="hero-orb orb2"></div>
    </div>
    <div class="auth-card">
      <div class="auth-logo" @click="$router.push('/')">
        <div class="logo-icon">M</div>
        <span>MuYunAPI</span>
      </div>
      <h2>欢迎回来</h2>
      <p class="sub-title">登录您的账号开始使用</p>

      <el-form ref="formRef" :model="form" :rules="rules" @submit.prevent="handleLogin">
        <el-form-item prop="username">
          <el-input
            v-model="form.username"
            placeholder="用户名或邮箱"
            size="large"
            prefix-icon="User"
          />
        </el-form-item>
        <el-form-item prop="password">
          <el-input
            v-model="form.password"
            type="password"
            placeholder="密码"
            size="large"
            prefix-icon="Lock"
            show-password
            @keyup.enter="handleLogin"
          />
        </el-form-item>
        <div class="form-actions">
          <el-checkbox v-model="remember" style="color:var(--text-muted)">记住我</el-checkbox>
          <el-button text style="color:var(--primary)" @click="showReset = true">忘记密码?</el-button>
        </div>
        <el-button type="primary" size="large" style="width:100%" :loading="loading" @click="handleLogin">
          登 录
        </el-button>
      </el-form>

      <div class="divider"><span>还没有账号?</span></div>
      <el-button plain size="large" style="width:100%" @click="$router.push('/register')">
        免费注册
      </el-button>
    </div>

    <!-- 重置密码弹窗 -->
    <el-dialog v-model="showReset" title="重置密码" width="420px" :append-to-body="true">
      <el-form :model="resetForm" label-width="0">
        <el-form-item>
          <el-input v-model="resetForm.email" placeholder="注册邮箱">
            <template #append>
              <el-button @click="sendResetCode" :loading="codeLoading" :disabled="countdown > 0">
                {{ countdown > 0 ? `${countdown}s` : '获取验证码' }}
              </el-button>
            </template>
          </el-input>
        </el-form-item>
        <el-form-item>
          <el-input v-model="resetForm.code" placeholder="验证码" maxlength="6" />
        </el-form-item>
        <el-form-item>
          <el-input v-model="resetForm.newPassword" type="password" placeholder="新密码（至少6位）" show-password />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showReset = false">取消</el-button>
        <el-button type="primary" :loading="resetLoading" @click="handleReset">确认重置</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { authApi } from '../api'
import { useUserStore } from '../stores/user'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const formRef = ref()
const loading = ref(false)
const remember = ref(false)
const showReset = ref(false)
const codeLoading = ref(false)
const resetLoading = ref(false)
const countdown = ref(0)

const form = reactive({ username: '', password: '' })
const resetForm = reactive({ email: '', code: '', newPassword: '' })
const rules = {
  username: [{ required: true, message: '请输入用户名或邮箱' }],
  password: [{ required: true, message: '请输入密码' }],
}

async function handleLogin() {
  await formRef.value?.validate()
  loading.value = true
  try {
    const res = await authApi.login(form)
    if (res.code === 200) {
      userStore.setToken(res.data.token)
      userStore.setUser(res.data.user)
      ElMessage.success('登录成功！')
      const redirect = route.query.redirect || (res.data.user.role === 'admin' ? '/admin' : '/')
      router.push(redirect)
    } else {
      ElMessage.error(res.message)
    }
  } finally {
    loading.value = false
  }
}

let timer = null
async function sendResetCode() {
  if (!resetForm.email) return ElMessage.warning('请输入邮箱')
  codeLoading.value = true
  try {
    const res = await authApi.sendCode({ email: resetForm.email, type: 'reset' })
    if (res.code === 200) {
      ElMessage.success(res.message)
      countdown.value = 60
      timer = setInterval(() => { if (--countdown.value <= 0) clearInterval(timer) }, 1000)
    } else ElMessage.error(res.message)
  } finally { codeLoading.value = false }
}

async function handleReset() {
  resetLoading.value = true
  try {
    const res = await authApi.resetPassword(resetForm)
    if (res.code === 200) {
      ElMessage.success('密码重置成功，请重新登录')
      showReset.value = false
    } else ElMessage.error(res.message)
  } finally { resetLoading.value = false }
}
</script>

<style lang="scss" scoped>
.auth-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  padding: 24px;
}
.auth-bg {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
.hero-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.12;
  &.orb1 { width: 400px; height: 400px; background: radial-gradient(circle, #e99312, transparent); top: -150px; left: -150px; animation: float 8s ease-in-out infinite; }
  &.orb2 { width: 300px; height: 300px; background: radial-gradient(circle, #409eff, transparent); bottom: -100px; right: -100px; animation: float 10s ease-in-out infinite reverse; }
}
@keyframes float {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1) translate(20px, -20px); }
}

.auth-card {
  position: relative;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  padding: 48px 40px;
  width: 100%;
  max-width: 420px;
  box-shadow: var(--shadow-lg);
  backdrop-filter: blur(10px);
}

.auth-logo {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 32px;
  cursor: pointer;
  width: fit-content;
  .logo-icon {
    width: 40px; height: 40px;
    background: linear-gradient(135deg, #e99312, #f5c842);
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 900;
    font-size: 22px;
    color: var(--btn-text);
    box-shadow: 0 4px 14px rgba(233,147,18,0.4);
  }
  span { font-size: 22px; font-weight: 700; background: linear-gradient(135deg, #e99312, #f5c842); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
}

h2 { font-size: 26px; font-weight: 700; color: var(--text-primary); margin-bottom: 8px; }
.sub-title { color: var(--text-muted); font-size: 14px; margin-bottom: 32px; }

.form-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: -8px 0 16px;
}

.divider {
  text-align: center;
  position: relative;
  margin: 24px 0;
  span {
    position: relative;
    z-index: 1;
    background: var(--bg-card);
    padding: 0 12px;
    color: var(--text-muted);
    font-size: 13px;
  }
  &::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 0; right: 0;
    height: 1px;
    background: var(--border);
  }
}

// 响应式
@media (max-width: 768px) {
  .auth-card {
    padding: 32px 20px;
    border-radius: var(--radius-md);
  }
  h2 { font-size: 22px; }
  .sub-title { font-size: 13px; margin-bottom: 24px; }
  .auth-logo { margin-bottom: 24px; }
  .auth-logo .logo-icon { width: 34px; height: 34px; font-size: 18px; }
  .auth-logo span { font-size: 18px; }
}
</style>
