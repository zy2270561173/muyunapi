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
      <h2>创建账号</h2>
      <p class="sub-title">加入 MuYunAPI，开始探索接口世界</p>

      <el-form ref="formRef" :model="form" :rules="rules">
        <el-form-item prop="username">
          <el-input v-model="form.username" placeholder="用户名（3-20位字母数字）" size="large" prefix-icon="User" />
        </el-form-item>
        <el-form-item prop="email">
          <el-input v-model="form.email" placeholder="QQ邮箱或其他邮箱" size="large" prefix-icon="Message" />
        </el-form-item>
        <el-form-item prop="code">
          <el-input v-model="form.code" placeholder="邮箱验证码" size="large" maxlength="6">
            <template #append>
              <el-button @click="sendCode" :loading="codeLoading" :disabled="countdown > 0" style="min-width:100px">
                {{ countdown > 0 ? `${countdown}s重发` : '获取验证码' }}
              </el-button>
            </template>
          </el-input>
        </el-form-item>
        <el-form-item prop="nickname">
          <el-input v-model="form.nickname" placeholder="昵称（选填，默认同用户名）" size="large" prefix-icon="Avatar" />
        </el-form-item>
        <el-form-item prop="password">
          <el-input v-model="form.password" type="password" placeholder="密码（至少6位）" size="large" prefix-icon="Lock" show-password />
        </el-form-item>
        <el-form-item prop="confirmPassword">
          <el-input v-model="form.confirmPassword" type="password" placeholder="确认密码" size="large" prefix-icon="Lock" show-password @keyup.enter="handleRegister" />
        </el-form-item>
        <el-button type="primary" size="large" style="width:100%" :loading="loading" @click="handleRegister">
          立即注册
        </el-button>
      </el-form>

      <div class="divider"><span>已有账号?</span></div>
      <el-button plain size="large" style="width:100%" @click="$router.push('/login')">
        返回登录
      </el-button>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { authApi } from '../api'
import { useUserStore } from '../stores/user'

const router = useRouter()
const userStore = useUserStore()
const formRef = ref()
const loading = ref(false)
const codeLoading = ref(false)
const countdown = ref(0)

const form = reactive({ username: '', email: '', code: '', nickname: '', password: '', confirmPassword: '' })

const rules = {
  username: [
    { required: true, message: '请输入用户名' },
    { min: 3, max: 20, message: '用户名3-20位' },
    { pattern: /^[a-zA-Z0-9_]+$/, message: '只允许字母数字下划线' }
  ],
  email: [
    { required: true, message: '请输入邮箱' },
    { type: 'email', message: '邮箱格式不正确' }
  ],
  code: [{ required: true, message: '请输入验证码' }, { len: 6, message: '验证码6位' }],
  password: [{ required: true, message: '请输入密码' }, { min: 6, message: '密码至少6位' }],
  confirmPassword: [
    { required: true, message: '请确认密码' },
    { validator: (rule, val, cb) => { if (val !== form.password) cb('两次密码不一致'); else cb() } }
  ],
}

let timer = null
async function sendCode() {
  if (!form.email) return ElMessage.warning('请先填写邮箱')
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return ElMessage.warning('邮箱格式不正确')
  codeLoading.value = true
  try {
    const res = await authApi.sendCode({ email: form.email, type: 'register' })
    if (res.code === 200) {
      ElMessage.success(res.message)
      countdown.value = 60
      timer = setInterval(() => { if (--countdown.value <= 0) clearInterval(timer) }, 1000)
    } else ElMessage.error(res.message)
  } finally { codeLoading.value = false }
}

async function handleRegister() {
  await formRef.value?.validate()
  loading.value = true
  try {
    const res = await authApi.register(form)
    if (res.code === 200) {
      userStore.setToken(res.data.token)
      userStore.setUser(res.data.user)
      ElMessage.success('注册成功！欢迎加入 MuYunAPI')
      router.push('/')
    } else ElMessage.error(res.message)
  } finally { loading.value = false }
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
  &.orb1 { width: 400px; height: 400px; background: radial-gradient(circle, #e99312, transparent); top: -150px; right: -150px; animation: float 9s ease-in-out infinite; }
  &.orb2 { width: 300px; height: 300px; background: radial-gradient(circle, #67c23a, transparent); bottom: -100px; left: -100px; animation: float 11s ease-in-out infinite reverse; }
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
  max-width: 440px;
  box-shadow: var(--shadow-lg);
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
