import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '../stores/user'

const routes = [
  {
    path: '/',
    component: () => import('../views/Layout.vue'),
    children: [
      { path: '', component: () => import('../views/Home.vue'), meta: { title: '首页' } },
      { path: 'explore', component: () => import('../views/Explore.vue'), meta: { title: '浏览接口' } },
      { path: 'api/:slug', component: () => import('../views/ApiDetail.vue'), meta: { title: '接口详情' } },
      { path: 'user', component: () => import('../views/user/Profile.vue'), meta: { title: '个人中心', auth: true } },
      { path: 'user/keys', component: () => import('../views/user/Keys.vue'), meta: { title: '密钥管理', auth: true } },
      { path: 'user/favorites', component: () => import('../views/user/Favorites.vue'), meta: { title: '我的收藏', auth: true } },
      { path: 'goto/:id', component: () => import('../views/GotoLink.vue'), meta: { title: '跳转中...' } },
    ]
  },
  {
    path: '/login',
    component: () => import('../views/Login.vue'),
    meta: { title: '登录' }
  },
  {
    path: '/register',
    component: () => import('../views/Register.vue'),
    meta: { title: '注册' }
  },
  {
    path: '/admin',
    component: () => import('../views/admin/AdminLayout.vue'),
    meta: { auth: true, admin: true },
    children: [
      { path: '', redirect: '/admin/dashboard' },
      { path: 'dashboard', component: () => import('../views/admin/Dashboard.vue'), meta: { title: '控制台' } },
      { path: 'apis', component: () => import('../views/admin/ApiManager.vue'), meta: { title: 'API管理' } },
      { path: 'categories', component: () => import('../views/admin/CategoryManager.vue'), meta: { title: '分类管理' } },
      { path: 'users', component: () => import('../views/admin/UserManager.vue'), meta: { title: '用户管理' } },
      { path: 'announcements', component: () => import('../views/admin/AnnouncementManager.vue'), meta: { title: '公告管理' } },
      { path: 'themes', component: () => import('../views/admin/ThemeManager.vue'), meta: { title: '主题管理' } },
      { path: 'libraries', component: () => import('../views/admin/LibraryManager.vue'), meta: { title: '内置库' } },
      { path: 'friendships', component: () => import('../views/admin/FriendshipManager.vue'), meta: { title: '友链管理' } },
      { path: 'logs', component: () => import('../views/admin/Logs.vue'), meta: { title: '调用日志' } },
      { path: 'settings', component: () => import('../views/admin/Settings.vue'), meta: { title: '系统设置' } },
    ]
  },
  { path: '/:pathMatch(.*)*', component: () => import('../views/NotFound.vue') }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ top: 0, behavior: 'smooth' })
})

router.beforeEach((to, from, next) => {
  const userStore = useUserStore()
  document.title = (to.meta.title ? to.meta.title + ' - ' : '') + 'MuYunAPI'

  if (to.meta.auth && !userStore.isLoggedIn) {
    return next(`/login?redirect=${to.fullPath}`)
  }
  if (to.meta.admin && !userStore.isAdmin) {
    return next('/')
  }
  next()
})

export default router
