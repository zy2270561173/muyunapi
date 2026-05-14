<template>
  <div class="goto-page">
    <div class="goto-card">
      <template v-if="loading">
        <div class="loading">
          <el-icon class="is-loading"><Loading /></el-icon>
          <p>正在准备跳转...</p>
        </div>
      </template>
      <template v-else-if="info">
        <div class="icon-wrap">
          <el-icon size="48" color="var(--primary)"><Link /></el-icon>
        </div>
        <h2>即将跳转到</h2>
        <p class="site-name">{{ info.name }}</p>
        <p class="target-url">{{ info.url }}</p>

        <template v-if="info.target === 'self'">
          <p class="hint">页面即将跳转...</p>
        </template>
        <template v-else>
          <div class="countdown-wrap">
            <el-progress :percentage="countdownPercent" :show-text="false" :stroke-width="8" color="var(--primary)" />
            <p class="countdown-text">请稍等 <span class="seconds">{{ countdown }}</span> 秒</p>
          </div>
          <div class="actions">
            <el-button type="primary" @click="goNow">立即跳转</el-button>
            <el-button @click="goBack">返回首页</el-button>
          </div>
        </template>
      </template>
      <template v-else>
        <el-icon size="48" color="var(--danger)"><Warning /></el-icon>
        <h2>跳转链接不存在</h2>
        <el-button type="primary" @click="$router.push('/')">返回首页</el-button>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { friendshipApi } from '../api'

const route = useRoute()
const router = useRouter()
const loading = ref(true)
const info = ref(null)
const countdown = ref(5)
let timer = null

const countdownPercent = computed(() => {
  if (!info.value) return 0
  const total = info.value.seconds || 5
  return Math.round((countdown.value / total) * 100)
})

function goNow() {
  if (info.value) {
    window.location.href = info.value.url
  }
}

function goBack() {
  router.push('/')
}

function startCountdown() {
  countdown.value = info.value.seconds || 5
  timer = setInterval(() => {
    countdown.value--
    if (countdown.value <= 0) {
      clearInterval(timer)
      goNow()
    }
  }, 1000)
}

onMounted(async () => {
  try {
    const res = await friendshipApi.getRedirectInfo(route.params.id)
    if (res.code === 200 && res.data) {
      info.value = res.data
      if (info.value.target === 'self') {
        setTimeout(() => goNow(), 500)
      } else {
        startCountdown()
      }
    }
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>

<style lang="scss" scoped>
.goto-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-main);
  padding: 20px;
}

.goto-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 48px;
  text-align: center;
  max-width: 400px;
  width: 100%;
}

.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  .el-icon { font-size: 48px; color: var(--primary); }
  p { color: var(--text-secondary); }
}

.icon-wrap {
  margin-bottom: 16px;
}

h2 {
  font-size: 18px;
  color: var(--text-secondary);
  margin-bottom: 12px;
}

.site-name {
  font-size: 20px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.target-url {
  font-size: 13px;
  color: var(--text-muted);
  word-break: break-all;
  margin-bottom: 24px;
}

.hint {
  color: var(--text-muted);
  font-size: 14px;
}

.countdown-wrap {
  margin-bottom: 24px;
}

.countdown-text {
  margin-top: 12px;
  font-size: 14px;
  color: var(--text-secondary);
  .seconds {
    font-size: 24px;
    font-weight: 700;
    color: var(--primary);
  }
}

.actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}
</style>
