<template>
  <div class="admin-layout">
    <!-- 移动端遮罩 -->
    <div v-if="mobileSidebarOpen" class="mobile-mask" @click="mobileSidebarOpen = false"></div>
    
    <!-- 侧边栏 -->
    <aside class="sidebar" :class="{ collapsed: sidebarCollapsed, 'mobile-open': mobileSidebarOpen }">
      <div class="sidebar-header">
        <div class="sidebar-logo">
          <div class="logo-icon">M</div>
          <span class="logo-text">MuYunAPI</span>
        </div>
        <el-button 
          v-if="isMobile" 
          text 
          class="mobile-close-btn"
          @click="mobileSidebarOpen = false"
        >
          <el-icon><Close /></el-icon>
        </el-button>
      </div>

      <el-menu
        :default-active="activeMenu"
        :collapse="sidebarCollapsed && !isMobile"
        :collapse-transition="false"
        router
        @select="handleMenuSelect"
      >
        <el-menu-item index="/admin/dashboard">
          <el-icon><Odometer /></el-icon>
          <template #title>控制台</template>
        </el-menu-item>
        <el-menu-item index="/admin/apis">
          <el-icon><Connection /></el-icon>
          <template #title>API管理</template>
        </el-menu-item>
        <el-menu-item index="/admin/categories">
          <el-icon><Grid /></el-icon>
          <template #title>分类管理</template>
        </el-menu-item>
        <el-menu-item index="/admin/users">
          <el-icon><User /></el-icon>
          <template #title>用户管理</template>
        </el-menu-item>
        <el-menu-item index="/admin/announcements">
          <el-icon><Bell /></el-icon>
          <template #title>公告管理</template>
        </el-menu-item>
        <el-menu-item index="/admin/themes">
          <el-icon><Brush /></el-icon>
          <template #title>主题管理</template>
        </el-menu-item>
        <el-menu-item index="/admin/libraries">
          <el-icon><Box /></el-icon>
          <template #title>内置库</template>
        </el-menu-item>
        <el-menu-item index="/admin/friendships">
          <el-icon><Link /></el-icon>
          <template #title>友链管理</template>
        </el-menu-item>
        <el-menu-item index="/admin/logs">
          <el-icon><List /></el-icon>
          <template #title>调用日志</template>
        </el-menu-item>
        <el-menu-item index="/admin/about">
          <el-icon><UserFilled /></el-icon>
          <template #title>关于我</template>
        </el-menu-item>
        <el-menu-item index="/admin/settings">
          <el-icon><Setting /></el-icon>
          <template #title>系统设置</template>
        </el-menu-item>
        <el-menu-item index="/admin/update">
          <el-icon><Download /></el-icon>
          <template #title>系统更新</template>
        </el-menu-item>
      </el-menu>

      <div class="sidebar-footer">
        <el-button text @click="handleBackToFront" style="color:var(--text-muted);width:100%">
          <el-icon><House /></el-icon>
          <span>返回前台</span>
        </el-button>
      </div>
    </aside>

    <div class="main-wrap">
      <!-- 顶栏 -->
      <header class="admin-header">
        <div class="header-left">
          <el-button 
            text 
            @click="isMobile ? mobileSidebarOpen = true : sidebarCollapsed = !sidebarCollapsed"
          >
            <el-icon size="20"><Expand v-if="sidebarCollapsed && !isMobile" /><Fold v-else /></el-icon>
          </el-button>
          <div class="breadcrumb-area">
            <span class="admin-title">{{ currentTitle }}</span>
          </div>
        </div>
        <div class="header-right">
          <el-dropdown trigger="click">
            <div class="admin-user">
              <el-avatar :size="32" style="background:var(--primary)">{{ userStore.userInfo?.nickname?.[0] }}</el-avatar>
              <span>{{ userStore.userInfo?.nickname }}</span>
              <el-icon><ArrowDown /></el-icon>
            </div>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item @click="$router.push('/user')">个人中心</el-dropdown-item>
                <el-dropdown-item @click="handleLogout">退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </header>

      <!-- 内容 -->
      <main class="admin-content">
        <router-view v-slot="{ Component, route }">
          <transition name="page" mode="out-in">
            <component :is="Component" :key="route.path" />
          </transition>
        </router-view>
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  Odometer,
  Connection,
  Grid,
  User,
  Bell,
  Brush,
  Box,
  Link,
  List,
  Setting,
  House,
  Expand,
  Fold,
  ArrowDown,
  UserFilled,
  Download,
  Close
} from '@element-plus/icons-vue'
import { useUserStore } from '../../stores/user'
import { useDeviceStore } from '../../stores/device'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const deviceStore = useDeviceStore()
const sidebarCollapsed = ref(false)
const mobileSidebarOpen = ref(false)

onMounted(() => {
  deviceStore.detectDevice()
})

const isMobile = computed(() => deviceStore.isMobile)

const activeMenu = computed(() => route.path)
const currentTitle = computed(() => route.meta.title || '管理后台')

function handleMenuSelect() {
  if (isMobile.value) {
    mobileSidebarOpen.value = false
  }
}

function handleBackToFront() {
  router.push('/')
}

function handleLogout() {
  userStore.logout()
  router.push('/login')
  ElMessage.success('已退出登录')
}
</script>

<style lang="scss" scoped>
.admin-layout {
  display: flex;
  height: 100vh;
  overflow: hidden;
  background: var(--bg-main);
  position: relative;
}

.mobile-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 998;
  display: none;
  
  @media (max-width: 768px) {
    display: block;
  }
}

.sidebar {
  width: 220px;
  flex-shrink: 0;
  background: var(--bg-card);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  transition: width 0.3s ease;
  overflow: hidden;
  position: fixed;
  left: 0;
  top: 0;
  bottom: 0;
  z-index: 1000;
  transform: translateX(-100%);
  
  &.collapsed { width: 64px; }
  
  @media (min-width: 769px) {
    transform: translateX(0);
    position: static;
  }
  
  &.mobile-open {
    transform: translateX(0);
    box-shadow: 2px 0 20px rgba(0, 0, 0, 0.15);
  }
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 64px;
  padding: 0 16px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.sidebar-logo {
  display: flex;
  align-items: center;
  gap: 10px;
  overflow: hidden;
  
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
    flex-shrink: 0;
  }
  .logo-text {
    font-size: 18px;
    font-weight: 700;
    background: linear-gradient(135deg, var(--primary), color-mix(in srgb, var(--primary) 70%, white));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    white-space: nowrap;
  }
}

.mobile-close-btn {
  padding: 8px;
  color: var(--text-secondary);
  
  &:hover {
    background: var(--bg-card2);
    color: var(--text-primary);
  }
}

:deep(.el-menu) {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 8px 0;
  border: none !important;
  
  .el-menu-item {
    margin: 2px 8px;
    border-radius: 8px;
    height: 44px;
    line-height: 44px;
    color: var(--text-secondary);
    
    &:hover { background: var(--bg-card2) !important; color: var(--text-primary) !important; }
    &.is-active { background: rgba(233,147,18,0.12) !important; color: var(--primary) !important; }
  }
}

.sidebar-footer {
  padding: 12px 8px;
  border-top: 1px solid var(--border);
}

.main-wrap {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  
  @media (max-width: 768px) {
    width: 100%;
  }
}

.admin-header {
  height: 64px;
  background: var(--bg-card);
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  flex-shrink: 0;
  
  @media (max-width: 768px) {
    padding: 0 12px;
  }
}
.header-left { 
  display: flex; 
  align-items: center; 
  gap: 12px;
  
  @media (max-width: 768px) {
    gap: 8px;
  }
}
.admin-title { 
  font-size: 16px; 
  font-weight: 600; 
  color: var(--text-primary);
  
  @media (max-width: 768px) {
    font-size: 14px;
  }
}
.header-right { display: flex; align-items: center; }
.admin-user {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 4px 12px 4px 4px;
  border-radius: 24px;
  background: var(--bg-card2);
  border: 1px solid var(--border);
  color: var(--text-primary);
  font-size: 14px;
  
  &:hover { border-color: var(--primary); }
  
  span {
    display: none;
    
    @media (min-width: 769px) {
      display: block;
    }
  }
}

.admin-content {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  background: var(--bg-main);
  
  @media (max-width: 768px) {
    padding: 16px 12px;
  }
}
</style>
