<template>
  <div class="layout">
    <!-- 导航栏 -->
    <header class="navbar" :class="{ scrolled: scrolled }">
      <div class="navbar-inner">
        <router-link to="/" class="logo">
          <div class="logo-icon">M</div>
          <span class="logo-text">MuYunAPI</span>
        </router-link>

        <nav class="nav-links">
          <router-link to="/" exact-active-class="active">首页</router-link>
          <router-link to="/explore" active-class="active">浏览接口</router-link>
          <router-link to="/about" active-class="active">关于我</router-link>
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

          <div v-if="userStore.isLoggedIn" class="user-menu">
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
          <div v-else class="auth-btns">
            <el-button text @click="$router.push('/login')" style="color:var(--text-secondary)">登录</el-button>
            <el-button type="primary" @click="$router.push('/register')" size="small">注册</el-button>
          </div>
        </div>
      </div>
    </header>

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
      </div>
    </footer>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useUserStore } from '../stores/user'
import { useThemeStore } from '../stores/theme'
import { siteApi, friendshipApi } from '../api'

const router = useRouter()
const userStore = useUserStore()
const themeStore = useThemeStore()
const scrolled = ref(false)
const siteInfo = ref({})
const friendships = ref([])
const showImportDialog = ref(false)
const importJson = ref('')

const avatarUrl = computed(() => {
  const av = userStore.userInfo?.avatar
  if (!av) return ''
  return av.startsWith('http') ? av : av
})

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

const scrollHandler = () => { scrolled.value = window.scrollY > 20 }

onMounted(async () => {
  window.addEventListener('scroll', scrollHandler)
  try {
    const res = await siteApi.getInfo()
    if (res.code === 200) siteInfo.value = res.data
  } catch (e) {}
  // 加载友链
  try {
    const res = await friendshipApi.getList()
    if (res.code === 200) friendships.value = res.data || []
  } catch (e) {}
})

onUnmounted(() => {
  window.removeEventListener('scroll', scrollHandler)
})

function handleLogout() {
  userStore.logout()
  router.push('/')
  ElMessage.success('已退出登录')
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
</style>
