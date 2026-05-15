<template>
  <div class="layout">
    <!-- 导航栏 -->
    <header class="navbar" :class="{ scrolled: scrolled }">
      <div class="navbar-inner">
        <router-link to="/" class="logo">
          <div class="logo-icon">M</div>
          <span class="logo-text">MuYunAPI</span>
        </router-link>

        <!-- 桌面端导航 -->
        <nav class="nav-links desktop-only">
          <router-link to="/" exact-active-class="active">首页</router-link>
          <router-link to="/explore" active-class="active">浏览接口</router-link>
          <router-link v-if="aboutEnabled" to="/about" active-class="active">关于我</router-link>
          <router-link v-if="userStore.isAdmin" to="/admin" active-class="active" class="admin-link">
            <el-icon><Setting /></el-icon> 管理后台
          </router-link>
        </nav>

        <div class="nav-right">
          <!-- 主题切换 -->
          <el-dropdown trigger="click" placement="bottom-end" @command="handleThemeChange">
            <el-button text class="theme-btn" :title="themeStore.currentTheme?.name">
              <el-icon class="theme-icon" :class="{ dark: themeStore.isDark }">
                <Sunny v-if="themeStore.isDark" />
                <Moon v-else />
              </el-icon>
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <div class="theme-menu-header">选择主题</div>
                <el-dropdown-item
                  v-for="theme in themeStore.allThemes"
                  :key="theme.id"
                  :command="theme.id"
                  :class="{ 'is-active': themeStore.currentThemeId === theme.id }"
                >
                  <div class="theme-item">
                    <div class="theme-color-bar" :style="getThemePreview(theme)"></div>
                    <div class="theme-info">
                      <span class="theme-name">{{ theme.name }}</span>
                      <el-tag v-if="theme.isBuiltIn" size="small" type="info">内置</el-tag>
                    </div>
                    <el-icon v-if="themeStore.currentThemeId === theme.id" class="check-icon"><Check /></el-icon>
                  </div>
                </el-dropdown-item>
                <el-dropdown-item divided command="__import__">
                  <el-icon><Upload /></el-icon> 导入主题
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>

          <!-- 导入主题对话框 -->
          <el-dialog v-model="showImportDialog" title="导入主题" width="500px">
            <el-input
              v-model="importJson"
              type="textarea"
              :rows="8"
              placeholder="请粘贴主题JSON配置..."
            />
            <template #footer>
              <el-button @click="showImportDialog = false">取消</el-button>
              <el-button type="primary" @click="handleImportTheme">导入</el-button>
            </template>
          </el-dialog>

          <div v-if="userStore.isLoggedIn" class="user-menu desktop-only">
            <el-dropdown trigger="click" placement="bottom-end">
              <div class="user-avatar-btn">
                <el-avatar :src="avatarUrl" :size="32">{{ userStore.userInfo?.nickname?.[0] }}</el-avatar>
                <span class="username">{{ userStore.userInfo?.nickname }}</span>
                <el-icon><ArrowDown /></el-icon>
              </div>
              <template #dropdown>
                <el-dropdown-menu class="user-dropdown">
                  <el-dropdown-item @click="$router.push('/user')">
                    <el-icon><User /></el-icon> 个人中心
                  </el-dropdown-item>
                  <el-dropdown-item @click="$router.push('/user/keys')">
                    <el-icon><Key /></el-icon> 密钥管理
                  </el-dropdown-item>
                  <el-dropdown-item @click="$router.push('/user/favorites')">
                    <el-icon><Star /></el-icon> 我的收藏
                  </el-dropdown-item>
                  <el-dropdown-item v-if="userStore.isAdmin" @click="$router.push('/admin')">
                    <el-icon><Setting /></el-icon> 管理后台
                  </el-dropdown-item>
                  <el-dropdown-item divided @click="handleLogout">
                    <el-icon><SwitchButton /></el-icon> 退出登录
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
          <div v-else class="auth-btns desktop-only">
            <el-button text @click="$router.push('/login')" style="color:var(--text-secondary)">登录</el-button>
            <el-button type="primary" @click="$router.push('/register')" size="small">注册</el-button>
          </div>

          <!-- 移动端菜单按钮 -->
          <el-button text class="mobile-menu-btn mobile-only" @click="mobileMenuOpen = true">
            <el-icon :size="24"><Menu /></el-icon>
          </el-button>
        </div>
      </div>
    </header>

    <!-- 移动端菜单抽屉 -->
    <el-drawer
      v-model="mobileMenuOpen"
      direction="rtl"
      size="85%"
      :with-header="false"
      class="mobile-drawer"
      :modal-class="deviceStore.isTouchDevice ? 'touch-modal' : ''"
    >
      <div class="mobile-menu">
        <div class="mobile-menu-header">
          <div class="mobile-header-left">
            <div class="logo-icon sm">M</div>
            <span class="logo-text">MuYunAPI</span>
          </div>
          <el-button text class="mobile-close-btn" @click="mobileMenuOpen = false">
            <el-icon><Close /></el-icon>
          </el-button>
        </div>

        <nav class="mobile-nav">
          <router-link to="/" @click="mobileMenuOpen = false" class="touch-ripple">
            <el-icon><HomeFilled /></el-icon> 首页
          </router-link>
          <router-link to="/explore" @click="mobileMenuOpen = false" class="touch-ripple">
            <el-icon><Grid /></el-icon> 浏览接口
          </router-link>
          <router-link v-if="aboutEnabled" to="/about" @click="mobileMenuOpen = false" class="touch-ripple">
            <el-icon><User /></el-icon> 关于我
          </router-link>
          <router-link v-if="userStore.isAdmin" to="/admin" @click="mobileMenuOpen = false" class="touch-ripple">
            <el-icon><Setting /></el-icon> 管理后台
          </router-link>
        </nav>

        <div class="mobile-divider"></div>

        <div v-if="userStore.isLoggedIn" class="mobile-user">
          <div class="mobile-user-info">
            <el-avatar :src="avatarUrl" :size="48">{{ userStore.userInfo?.nickname?.[0] }}</el-avatar>
            <div class="mobile-user-text">
              <span class="mobile-username">{{ userStore.userInfo?.nickname }}</span>
              <span class="mobile-user-email" v-if="userStore.userInfo?.email">{{ userStore.userInfo.email }}</span>
            </div>
          </div>
          <div class="mobile-user-links">
            <router-link to="/user" @click="mobileMenuOpen = false" class="touch-ripple">
              <el-icon><User /></el-icon>个人中心
            </router-link>
            <router-link to="/user/keys" @click="mobileMenuOpen = false" class="touch-ripple">
              <el-icon><Key /></el-icon>密钥管理
            </router-link>
            <router-link to="/user/favorites" @click="mobileMenuOpen = false" class="touch-ripple">
              <el-icon><Star /></el-icon>我的收藏
            </router-link>
            <a @click="handleLogoutMobile" class="touch-ripple logout-link">
              <el-icon><SwitchButton /></el-icon>退出登录
            </a>
          </div>
        </div>
        <div v-else class="mobile-auth">
          <el-button type="primary" @click="$router.push('/login'); mobileMenuOpen = false" size="large" style="width:100%">登录</el-button>
          <el-button @click="$router.push('/register'); mobileMenuOpen = false" size="large" style="width:100%;margin-top:12px">注册</el-button>
        </div>
      </div>
    </el-drawer>

    <!-- 主内容 -->
    <main class="main-content">
      <router-view v-slot="{ Component, route }">
        <transition name="page" mode="out-in">
          <component :is="Component" :key="route.path" />
        </transition>
      </router-view>
    </main>

    <!-- 页脚 -->
    <footer class="footer">
      <div class="footer-inner">
        <div class="footer-logo">
          <div class="logo-icon sm">M</div>
          <span>MuYunAPI</span>
        </div>
        <p class="footer-desc">免费开放的API聚合分享平台，让接口调用更简单</p>
        <div class="footer-links">
          <router-link to="/">首页</router-link>
          <router-link to="/explore">浏览接口</router-link>
          <router-link v-if="aboutEnabled" to="/about">关于我</router-link>
        </div>
        <!-- 友链 -->
        <div class="friendships" v-if="friendships.length">
          <span class="fs-label">友情链接</span>
          <div class="fs-list">
            <template v-for="link in friendships" :key="link.id">
              <a v-if="link.target === 'blank'" :href="link.url" target="_blank" class="fs-item">{{ link.name }}</a>
              <a v-else-if="link.target === 'self'" :href="link.url" class="fs-item">{{ link.name }}</a>
              <router-link v-else :to="`/goto/${link.id}`" class="fs-item">{{ link.name }}</router-link>
            </template>
          </div>
        </div>
        <p class="footer-copy">© 2026 MuYunAPI · <span v-if="siteInfo.icp">{{ siteInfo.icp }}</span></p>
        <p v-if="siteInfo.footer_time_enabled === '1' && footerTimeStr" class="footer-time">{{ footerTimePrefix }}{{ footerTimeStr }}</p>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useUserStore } from '../stores/user'
import { useThemeStore } from '../stores/theme'
import { useDeviceStore } from '../stores/device'
import { siteApi, friendshipApi } from '../api'
import axios from 'axios'
import {
  Sunny,
  Moon,
  Check,
  Upload,
  User,
  Key,
  Star,
  Setting,
  SwitchButton,
  ArrowDown,
  Menu,
  HomeFilled,
  Grid,
  Close
} from '@element-plus/icons-vue'

const router = useRouter()
const userStore = useUserStore()
const themeStore = useThemeStore()
const deviceStore = useDeviceStore()
const scrolled = ref(false)
const siteInfo = ref({})
const friendships = ref([])
const showImportDialog = ref(false)
const importJson = ref('')
const aboutEnabled = ref(true)
const mobileMenuOpen = ref(false)
const footerTimeStr = ref('')
let footerTimer = null

// 监听路由变化自动关闭移动端菜单
watch(() => router.path, () => {
  mobileMenuOpen.value = false
})

// 设备切换时自动关闭菜单
watch(() => deviceStore.isMobile, (isMobile) => {
  if (!isMobile) {
    mobileMenuOpen.value = false
  }
})

const avatarUrl = computed(() => {
  const av = userStore.userInfo?.avatar
  if (!av) return ''
  return av.startsWith('http') ? av : av
})

const footerTimePrefix = computed(() => {
  const style = siteInfo.value?.footer_time_style || 'running'
  const map = {
    running: '本站已运行了 ',
    time_travel: '本站已穿越了 ',
    stable: '本站已稳定运行了 ',
  }
  return map[style] || map.running
})

function updateFooterTime() {
  const startStr = siteInfo.value?.site_start_date
  if (!startStr) return
  const start = new Date(startStr + 'T00:00:00')
  const now = new Date()

  let years = now.getFullYear() - start.getFullYear()
  let months = now.getMonth() - start.getMonth()
  let days = now.getDate() - start.getDate()
  let hours = now.getHours() - start.getHours()
  let minutes = now.getMinutes() - start.getMinutes()
  let seconds = now.getSeconds() - start.getSeconds()

  if (seconds < 0) { seconds += 60; minutes -= 1 }
  if (minutes < 0) { minutes += 60; hours -= 1 }
  if (hours < 0) { hours += 24; days -= 1 }
  if (days < 0) {
    months -= 1
    const prevMonth = new Date(now.getFullYear(), now.getMonth(), 0)
    days += prevMonth.getDate()
  }
  if (months < 0) { months += 12; years -= 1 }

  footerTimeStr.value = `${years}年${months}月${days}天 ${String(hours).padStart(2,'0')}:${String(minutes).padStart(2,'0')}:${String(seconds).padStart(2,'0')}`
}

// 获取主题预览样式
function getThemePreview(theme) {
  if (!theme.cssVars) return {}
  return {
    background: `linear-gradient(135deg, ${theme.cssVars['--bg-card'] || '#fff'} 50%, ${theme.cssVars['--primary'] || '#e99312'} 50%)`
  }
}

// 切换主题
function handleThemeChange(themeId) {
  if (themeId === '__import__') {
    showImportDialog.value = true
    return
  }
  themeStore.setTheme(themeId)
}

// 导入主题
function handleImportTheme() {
  if (!importJson.value.trim()) {
    ElMessage.warning('请输入主题配置')
    return
  }
  try {
    themeStore.importTheme(importJson.value.trim())
    ElMessage.success('主题导入成功')
    showImportDialog.value = false
    importJson.value = ''
  } catch (e) {
    ElMessage.error('导入失败：' + e.message)
  }
}

// 检查关于我页面状态
async function checkAboutStatus() {
  try {
    const res = await axios.get('/api/about')
    aboutEnabled.value = res.data.code === 200
  } catch (e) {
    aboutEnabled.value = false
  }
}

const scrollHandler = () => { scrolled.value = window.scrollY > 20 }

onMounted(async () => {
  window.addEventListener('scroll', scrollHandler)
  try {
    const res = await siteApi.getInfo()
    if (res.code === 200) siteInfo.value = res.data
  } catch (e) {}
  // 启动页脚运行时间定时器
  updateFooterTime()
  footerTimer = setInterval(updateFooterTime, 1000)
  // 加载友链
  try {
    const res = await friendshipApi.getList()
    if (res.code === 200) friendships.value = res.data || []
  } catch (e) {}
  // 检查关于我页面状态
  await checkAboutStatus()
})

onUnmounted(() => {
  window.removeEventListener('scroll', scrollHandler)
  if (footerTimer) clearInterval(footerTimer)
})

function handleLogout() {
  userStore.logout()
  router.push('/')
  ElMessage.success('已退出登录')
}

function handleLogoutMobile() {
  mobileMenuOpen.value = false
  handleLogout()
}
</script>

<style lang="scss" scoped>
.layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.navbar {
  position: fixed;
  top: 0; left: 0; right: 0;
  z-index: 1000;
  height: 64px;
  background: color-mix(in srgb, var(--bg-primary) 85%, transparent);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid transparent;
  transition: all 0.3s ease;

  &.scrolled {
    background: color-mix(in srgb, var(--bg-primary) 95%, transparent);
    border-bottom-color: var(--border);
    box-shadow: 0 4px 24px rgba(0,0,0,0.15);
  }
}

.navbar-inner {
  max-width: 1280px;
  margin: 0 auto;
  padding: 0 24px;
  height: 100%;
  display: flex;
  align-items: center;
  gap: 32px;
}

.logo {
  display: flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
  flex-shrink: 0;
}
.logo-icon {
  width: 36px; height: 36px;
  background: linear-gradient(135deg, var(--primary), color-mix(in srgb, var(--primary) 70%, white));
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 900;
  font-size: 20px;
  color: var(--bg-primary);
  box-shadow: 0 4px 12px color-mix(in srgb, var(--primary) 35%, transparent);
  &.sm { width: 28px; height: 28px; font-size: 16px; }
}
.logo-text {
  font-size: 20px;
  font-weight: 700;
  background: linear-gradient(135deg, var(--primary), color-mix(in srgb, var(--primary) 70%, white));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.nav-links {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;

  a {
    color: var(--text-secondary);
    text-decoration: none;
    padding: 6px 14px;
    border-radius: 8px;
    font-size: 14px;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    gap: 6px;

    &:hover { color: var(--text-primary); background: var(--bg-card2); }
    &.active { color: var(--primary); background: color-mix(in srgb, var(--primary) 10%, transparent); }
    &.admin-link { color: var(--primary); }
  }
}

.nav-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

// 主题切换按钮
.theme-btn {
  padding: 8px !important;
  border-radius: 8px !important;
  transition: all 0.2s;

  &:hover {
    background: var(--bg-card2) !important;
  }

  .theme-icon {
    font-size: 18px;
    color: var(--text-secondary);
    transition: all 0.3s;

    &.dark {
      color: var(--primary);
    }
  }
}

// 主题菜单
.theme-menu-header {
  padding: 8px 12px;
  font-size: 12px;
  color: var(--text-muted);
  border-bottom: 1px solid var(--border);
}

.theme-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
}

.theme-color-bar {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  border: 1px solid var(--border);
  flex-shrink: 0;
}

.theme-info {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.theme-name {
  font-size: 13px;
  color: var(--text-primary);
}

.check-icon {
  color: var(--primary);
  font-size: 14px;
}

:deep(.el-dropdown-menu__item) {
  &.is-active {
    background: rgba(233, 147, 18, 0.1);
  }
}

.user-avatar-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 4px 12px 4px 4px;
  border-radius: 24px;
  background: var(--bg-card2);
  border: 1px solid var(--border);
  transition: all 0.2s;

  &:hover {
    border-color: var(--primary);
    background: var(--bg-card3);
  }

  .username {
    font-size: 13px;
    color: var(--text-primary);
    max-width: 80px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.user-dropdown {
  :deep(.el-dropdown-menu) { background: var(--bg-card2); }
  :deep(.el-dropdown-menu__item) { color: var(--text-secondary); }
}

// 移动端菜单按钮
.mobile-menu-btn {
  padding: 8px !important;
  color: var(--text-primary) !important;
}

// 移动端菜单
.mobile-menu {
  height: 100vh;
  padding: 0;
  background: var(--bg-card);
  display: flex;
  flex-direction: column;

  .mobile-menu-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    border-bottom: 1px solid var(--border);
    background: var(--bg-primary);
    position: sticky;
    top: 0;
    z-index: 10;

    .mobile-header-left {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .logo-text {
      font-size: 18px;
    }

    .mobile-close-btn {
      padding: 8px;
      color: var(--text-secondary);

      .el-icon {
        font-size: 22px;
      }

      &:hover {
        color: var(--text-primary);
        background: var(--bg-card2);
      }
    }
  }

  .mobile-nav {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 16px;
    overflow-y: auto;
    flex: 1;

    a {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 14px 16px;
      color: var(--text-primary);
      text-decoration: none;
      border-radius: 12px;
      transition: all 0.2s;
      font-size: 15px;
      min-height: 48px;

      &:hover, &.router-link-active {
        background: color-mix(in srgb, var(--primary) 12%, transparent);
        color: var(--primary);
      }

      .el-icon {
        font-size: 20px;
      }
    }
  }

  .mobile-divider {
    height: 8px;
    background: var(--bg-card2);
    margin: 0;
    flex-shrink: 0;
  }

  .mobile-user {
    padding: 16px;
    background: var(--bg-card);
    flex-shrink: 0;

    .mobile-user-info {
      display: flex;
      align-items: center;
      gap: 14px;
      margin-bottom: 20px;
      padding: 12px;
      background: var(--bg-card2);
      border-radius: 12px;
    }

    .mobile-user-text {
      display: flex;
      flex-direction: column;
      gap: 4px;
      flex: 1;
      min-width: 0;
    }

    .mobile-username {
      font-size: 16px;
      font-weight: 600;
      color: var(--text-primary);
    }

    .mobile-user-email {
      font-size: 13px;
      color: var(--text-muted);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .mobile-user-links {
      display: flex;
      flex-direction: column;
      gap: 6px;

      a {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 14px;
        color: var(--text-secondary);
        text-decoration: none;
        border-radius: 10px;
        cursor: pointer;
        min-height: 44px;
        font-size: 14px;

        &:hover {
          background: var(--bg-card2);
          color: var(--text-primary);
        }

        .el-icon {
          font-size: 18px;
        }

        &.logout-link {
          color: var(--danger);
          margin-top: 8px;

          &:hover {
            background: color-mix(in srgb, var(--danger) 8%, transparent);
          }
        }
      }
    }
  }

  .mobile-auth {
    padding: 16px;
    flex-shrink: 0;
  }
}

// 抽屉优化
:deep(.mobile-drawer) {
  .el-drawer__header {
    margin-bottom: 0;
  }

  .el-drawer__body {
    padding: 0;
    overflow: hidden;
  }
}

.touch-modal {
  opacity: 0.6;
}

.main-content {
  flex: 1;
  padding-top: 64px;
}

.footer {
  background: var(--bg-card);
  border-top: 1px solid var(--border);
  padding: 32px 24px;
  text-align: center;
}
.footer-inner {
  max-width: 1280px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}
.footer-logo {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 700;
  color: var(--text-primary);
  font-size: 16px;
}
.footer-desc { color: var(--text-muted); font-size: 13px; }
.footer-links {
  display: flex;
  gap: 24px;
  a { color: var(--text-muted); text-decoration: none; font-size: 13px; &:hover { color: var(--primary); } }
}
.footer-copy { color: var(--text-muted); font-size: 12px; }
.footer-time { color: var(--text-muted); font-size: 12px; margin-top: 4px; }


// 友链
.friendships {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px 0;
  border-top: 1px solid var(--border);
  width: 100%;
  max-width: 600px;
  margin-top: 8px;
}
.fs-label { font-size: 12px; color: var(--text-muted); }
.fs-list {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: center;
}
.fs-item {
  font-size: 13px;
  color: var(--text-secondary);
  text-decoration: none;
  padding: 4px 12px;
  border-radius: 4px;
  background: var(--bg-card2);
  border: 1px solid var(--border);
  transition: all 0.2s;
  &:hover { color: var(--primary); border-color: var(--primary); }
}

// 响应式
.desktop-only {
  display: flex;
}

.mobile-only {
  display: none;
}

@media (max-width: 768px) {
  .desktop-only {
    display: none !important;
  }

  .mobile-only {
    display: flex !important;
  }

  .navbar-inner {
    padding: 0 16px;
    gap: 16px;
  }

  .logo-text {
    font-size: 16px;
  }

  .main-content {
    padding-top: 56px;
  }

  .footer {
    padding: 24px 16px;
  }

  .footer-links {
    gap: 16px;
    flex-wrap: wrap;
    justify-content: center;
  }

  .fs-list {
    gap: 8px;
  }
}

// 移动端抽屉跟随主题
@media (max-width: 768px) {
  :deep(.el-drawer) {
    background: var(--bg-card) !important;
  }
  
  :deep(.el-drawer__body) {
    background: var(--bg-card);
    color: var(--text-primary);
  }
}
</style>
