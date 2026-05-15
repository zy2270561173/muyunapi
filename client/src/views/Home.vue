<template>
  <div class="home-page">
    <!-- Hero区域 -->
    <section class="hero">
      <div class="hero-bg">
        <div class="hero-orb orb1"></div>
        <div class="hero-orb orb2"></div>
        <div class="hero-grid"></div>
      </div>
      <div class="hero-content">
        <div class="hero-badge">🚀 免费开放 · 稳定可靠</div>
        <h1 class="hero-title">
          一站式 <span class="gradient-text">API</span> 聚合平台
        </h1>
        <p class="hero-subtitle">精选优质接口，自动生成调用示例，即开即用，无需繁琐配置</p>
        
        <!-- 搜索框 -->
        <div class="hero-search">
          <el-input
            v-model="keyword"
            placeholder="搜索接口名称、功能描述..."
            size="large"
            @keyup.enter="goSearch"
            clearable
          >
            <template #prefix>
              <el-icon style="color:var(--text-muted)"><Search /></el-icon>
            </template>
            <template #append>
              <el-button type="primary" @click="goSearch">搜索接口</el-button>
            </template>
          </el-input>
        </div>

        <!-- 统计数据 -->
        <div class="hero-stats">
          <div class="stat-item" v-for="s in stats" :key="s.label">
            <div class="stat-value">{{ s.value }}</div>
            <div class="stat-label">{{ s.label }}</div>
          </div>
        </div>
      </div>
    </section>

    <!-- 公告 -->
    <div v-if="announcements.length" class="announcement-bar">
      <div class="announce-inner">
        <span class="announce-icon">📢</span>
        <div class="announce-carousel">
          <el-carousel height="32px" direction="vertical" :autoplay="announcements.length > 1" :interval="4000" indicator-position="none" arrow="never" @change="onAnnounceChange">
            <el-carousel-item v-for="a in announcements" :key="a.id">
              <span class="announce-text" :title="a.content">{{ a.title }}：{{ a.content }}</span>
            </el-carousel-item>
          </el-carousel>
        </div>
      </div>
    </div>

    <!-- 弹窗公告 -->
    <el-dialog v-model="showPopup" :title="currentPopup?.title || '公告'" width="480px" :close-on-click-modal="true">
      <div class="popup-content" v-if="currentPopup">
        <div class="popup-icon">📢</div>
        <div class="popup-body">{{ currentPopup.content }}</div>
        <div class="popup-time">{{ dayjs(currentPopup.created_at).format('YYYY-MM-DD HH:mm') }}</div>
      </div>
      <template #footer>
        <el-button type="primary" @click="closePopup">我已知晓</el-button>
      </template>
    </el-dialog>

    <!-- 分类导航 -->
    <section class="section">
      <div class="container">
        <div class="section-header">
          <h2>接口分类</h2>
          <router-link to="/explore" class="see-all">查看全部 →</router-link>
        </div>
        <div class="category-grid">
          <div
            v-for="cat in categories"
            :key="cat.id"
            class="category-card"
            @click="gotoCategory(cat.id)"
          >
            <div class="cat-icon">{{ cat.icon }}</div>
            <div class="cat-name">{{ cat.name }}</div>
            <div class="cat-count">{{ cat.api_count }} 个接口</div>
          </div>
        </div>
      </div>
    </section>

    <!-- 热门接口 -->
    <section class="section">
      <div class="container">
        <div class="section-header">
          <h2>热门接口</h2>
          <router-link to="/explore" class="see-all">更多接口 →</router-link>
        </div>
        <div v-if="loading" class="api-grid">
          <div v-for="i in 6" :key="i" class="api-card-skeleton">
            <div class="skeleton" style="height:20px;width:60%;margin-bottom:12px"></div>
            <div class="skeleton" style="height:14px;width:90%;margin-bottom:8px"></div>
            <div class="skeleton" style="height:14px;width:70%"></div>
          </div>
        </div>
        <div v-else class="api-grid">
          <ApiCard
            v-for="api in hotApis"
            :key="api.id"
            :api="api"
            @click="$router.push(`/api/${api.slug}`)"
          />
        </div>
      </div>
    </section>

    <!-- 特性介绍 -->
    <section class="section features-section">
      <div class="container">
        <div class="section-header">
          <h2>为什么选择 MuYunAPI</h2>
        </div>
        <div class="features-grid">
          <div class="feature-card" v-for="f in features" :key="f.icon">
            <div class="feature-icon">{{ f.icon }}</div>
            <h3>{{ f.title }}</h3>
            <p>{{ f.desc }}</p>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { apiApi, siteApi } from '../api'
import { useDeviceStore } from '../stores/device'
import ApiCard from '../components/ApiCard.vue'
import dayjs from 'dayjs'

const router = useRouter()
const deviceStore = useDeviceStore()
const keyword = ref('')
const loading = ref(true)
const hotApis = ref([])
const categories = ref([])
const announcements = ref([])
const siteInfo = ref({ apiCount: 0, userCount: 0, callCount: 0 })

// 弹窗公告
const showPopup = ref(false)
const currentPopup = ref(null)

const stats = computed(() => [
  { value: siteInfo.value.apiCount + '+', label: '接口总数' },
  { value: (siteInfo.value.userCount || 0) + '+', label: '注册用户' },
  { value: formatNum(siteInfo.value.callCount) + '+', label: '累计调用' },
  { value: '99.9%', label: '可用率' },
])

const features = [
  { icon: '⚡', title: '极速响应', desc: '全球CDN加速，自动检测接口响应速度，为您筛选最快节点' },
  { icon: '📝', title: '代码示例', desc: '自动生成多语言调用示例，curl/JS/Python/PHP/Node.js一键复制' },
  { icon: '🔑', title: '密钥管理', desc: '多套API密钥管理，精细化权限控制，保障接口安全调用' },
  { icon: '🔍', title: '在线测试', desc: '无需离开页面，直接在线测试接口，实时查看返回结果' },
  { icon: '🛡', title: '安全可靠', desc: '接口访问鉴权，请求频率限制，防止滥用，保障服务质量' },
  { icon: '📊', title: '调用统计', desc: '完整的调用日志与统计，随时掌握接口使用情况' },
]

function formatNum(n) {
  if (!n) return '0'
  if (n >= 10000) return (n / 10000).toFixed(1) + 'w'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k'
  return String(n)
}

function goSearch() {
  if (keyword.value.trim()) router.push(`/explore?keyword=${keyword.value.trim()}`)
  else router.push('/explore')
}

function gotoCategory(id) {
  router.push(`/explore?category=${id}`)
}

// 检查弹窗公告
async function checkPopupAnnouncement() {
  try {
    const lastId = localStorage.getItem('popup_announcement_last_id') || '0'
    const res = await siteApi.getPopupAnnouncements(parseInt(lastId))
    if (res.code === 200 && res.data && res.data.length > 0) {
      currentPopup.value = res.data[0]
      showPopup.value = true
      // 更新已弹过的公告ID
      localStorage.setItem('popup_announcement_last_id', currentPopup.value.id)
    }
  } catch (e) {
    console.error('检查弹窗公告失败:', e)
  }
}

function closePopup() {
  showPopup.value = false
  currentPopup.value = null
}

function onAnnounceChange(index) {
  // 可选：公告切换时的回调
}

onMounted(async () => {
  const [infoRes, catRes, apiRes, annRes] = await Promise.allSettled([
    siteApi.getInfo(),
    apiApi.getCategories(),
    apiApi.getList({ limit: 6 }),
    siteApi.getAnnouncements(),
  ])
  if (infoRes.value?.code === 200) siteInfo.value = infoRes.value.data
  if (catRes.value?.code === 200) categories.value = catRes.value.data
  if (apiRes.value?.code === 200) hotApis.value = apiRes.value.data.list
  if (annRes.value?.code === 200) announcements.value = annRes.value.data
  loading.value = false

  // 检查弹窗公告
  checkPopupAnnouncement()
})
</script>

<style lang="scss" scoped>
.home-page { width: 100%; }

// Hero
.hero {
  position: relative;
  padding: 100px 24px 80px;
  overflow: hidden;
  min-height: 540px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.hero-bg {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
.hero-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.15;
  &.orb1 {
    width: 500px; height: 500px;
    background: radial-gradient(circle, #e99312, transparent);
    top: -100px; left: -100px;
    animation: float 8s ease-in-out infinite;
  }
  &.orb2 {
    width: 400px; height: 400px;
    background: radial-gradient(circle, #409eff, transparent);
    bottom: -100px; right: -100px;
    animation: float 10s ease-in-out infinite reverse;
  }
}
.hero-grid {
  position: absolute;
  inset: 0;
  background-image: linear-gradient(rgba(233,147,18,0.03) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(233,147,18,0.03) 1px, transparent 1px);
  background-size: 40px 40px;
}
@keyframes float {
  0%, 100% { transform: translate(0, 0) scale(1); }
  50% { transform: translate(30px, -30px) scale(1.05); }
}

.hero-content {
  position: relative;
  text-align: center;
  max-width: 760px;
  width: 100%;
}
.hero-badge {
  display: inline-block;
  background: rgba(233,147,18,0.1);
  border: 1px solid rgba(233,147,18,0.25);
  color: var(--primary);
  padding: 6px 18px;
  border-radius: 24px;
  font-size: 13px;
  margin-bottom: 24px;
}
.hero-title {
  font-size: 52px;
  font-weight: 800;
  line-height: 1.2;
  color: var(--text-primary);
  margin-bottom: 20px;
  letter-spacing: -1px;
}
.hero-subtitle {
  font-size: 18px;
  color: var(--text-secondary);
  margin-bottom: 40px;
  line-height: 1.6;
}
.hero-search {
  max-width: 600px;
  margin: 0 auto 40px;
  :deep(.el-input__wrapper) {
    background: var(--row-hover-bg) !important;
    border: 1px solid var(--border-active) !important;
    box-shadow: 0 4px 24px rgba(233,147,18,0.1) !important;
    height: 52px !important;
  }
  :deep(.el-input-group__append) {
    background: var(--primary) !important;
    border: none !important;
    color: var(--btn-text) !important;
    font-weight: 600;
    padding: 0 24px;
    &:hover { background: var(--primary-light) !important; }
  }
}

.hero-stats {
  display: flex;
  justify-content: center;
  gap: 48px;
}
.stat-item {
  text-align: center;
  .stat-value {
    font-size: 28px;
    font-weight: 800;
    color: var(--primary);
  }
  .stat-label {
    font-size: 13px;
    color: var(--text-muted);
    margin-top: 4px;
  }
}

// 公告
.announcement-bar {
  background: rgba(233,147,18,0.05);
  border-top: 1px solid rgba(233,147,18,0.1);
  border-bottom: 1px solid rgba(233,147,18,0.1);
  padding: 0 24px;
}
.announce-inner {
  max-width: 1280px;
  margin: 0 auto;
  height: 48px;
  display: flex;
  align-items: center;
  gap: 12px;
}
.announce-icon { font-size: 16px; flex-shrink: 0; }
.announce-carousel { flex: 1; overflow: hidden; }
.announce-text {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 32px;
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

// 弹窗公告
.popup-content {
  text-align: center;
  padding: 16px 0;
  .popup-icon { font-size: 48px; margin-bottom: 16px; }
  .popup-body {
    font-size: 15px;
    color: var(--text-secondary);
    line-height: 1.8;
    margin: 16px 0;
    white-space: pre-wrap;
  }
  .popup-time {
    font-size: 12px;
    color: var(--text-muted);
  }
}

// Section
.section { padding: 60px 24px; }
.section:nth-child(even) { background: var(--row-hover-bg); }
.container { max-width: 1280px; margin: 0 auto; }
.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 32px;
  h2 { font-size: 24px; font-weight: 700; color: var(--text-primary); }
  .see-all { color: var(--primary); text-decoration: none; font-size: 14px; &:hover { opacity: 0.8; } }
}

// 分类
.category-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 16px;
}
.category-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 24px 16px;
  text-align: center;
  cursor: pointer;
  transition: var(--transition);
  
  &:hover {
    border-color: var(--border-active);
    background: var(--bg-card2);
    transform: translateY(-4px);
    box-shadow: var(--glow);
  }
  
  .cat-icon { font-size: 32px; margin-bottom: 10px; }
  .cat-name { font-size: 15px; font-weight: 600; color: var(--text-primary); margin-bottom: 4px; }
  .cat-count { font-size: 12px; color: var(--text-muted); }
}

// API网格
.api-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 20px;
}
.api-card-skeleton {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 24px;
}

// Features
.features-section { background: transparent !important; }
.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
}
.feature-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 28px;
  transition: var(--transition);

  &:hover {
    border-color: var(--border-active);
    transform: translateY(-4px);
  }

  .feature-icon { font-size: 36px; margin-bottom: 16px; }
  h3 { font-size: 16px; font-weight: 600; color: var(--text-primary); margin-bottom: 10px; }
  p { font-size: 13px; color: var(--text-secondary); line-height: 1.7; }
}

// 响应式
@media (max-width: 768px) {
  .hero {
    padding: 56px 16px 40px;
    min-height: auto;
  }
  .hero-title {
    font-size: 30px;
    letter-spacing: -0.5px;
    line-height: 1.25;
  }
  .hero-subtitle {
    font-size: 14px;
    margin-bottom: 28px;
    line-height: 1.6;
  }
  .hero-search {
    :deep(.el-input__wrapper) {
      height: 50px !important;
    }
    :deep(.el-input-group__append) {
      padding: 0 14px;
      font-weight: 500;
    }
  }
  .hero-stats {
    gap: 20px;
    .stat-value { font-size: 20px; font-weight: 700; }
    .stat-label { font-size: 12px; }
  }
  .announce-inner {
    padding: 0 16px;
    height: 44px;
  }
  .section {
    padding: 36px 16px;
  }
  .section-header {
    margin-bottom: 20px;
    h2 { font-size: 19px; font-weight: 700; }
    .see-all { font-size: 13px; }
  }
  .category-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
  }
  .category-card {
    padding: 18px 12px;
    .cat-icon { font-size: 26px; margin-bottom: 8px; }
    .cat-name { font-size: 13px; }
    .cat-count { font-size: 11px; margin-top: 2px; }
  }
  .api-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }
  .features-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }
  .feature-card {
    padding: 18px;
    .feature-icon { font-size: 28px; }
    h3 { font-size: 15px; margin-bottom: 8px; }
    p { font-size: 13px; }
  }
}

@media (max-width: 480px) {
  .hero {
    padding: 48px 14px 36px;
  }
  .hero-title {
    font-size: 26px;
  }
  .hero-badge {
    font-size: 12px;
    padding: 5px 14px;
  }
  .category-grid {
    grid-template-columns: repeat(3, 1fr);
  }
  .stat-item {
    min-width: 70px;
  }
}

@media (max-width: 360px) {
  .category-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
