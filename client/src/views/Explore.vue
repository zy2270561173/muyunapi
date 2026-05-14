<template>
  <div class="explore-page">
    <div class="explore-header">
      <div class="container">
        <h1>浏览接口</h1>
        <p>发现并使用丰富的开放API接口</p>
      </div>
    </div>

    <div class="container explore-body">
      <div class="sidebar">
        <!-- 搜索 -->
        <div class="filter-section">
          <el-input v-model="filters.keyword" placeholder="搜索接口..." clearable @input="onSearch">
            <template #prefix><el-icon><Search /></el-icon></template>
          </el-input>
        </div>

        <!-- 分类 -->
        <div class="filter-section">
          <div class="filter-label">接口分类</div>
          <div class="cat-list">
            <div
              v-for="cat in [{ id: 'all', name: '全部', icon: '🌐', api_count: total }, ...categories]"
              :key="cat.id"
              class="cat-item"
              :class="{ active: filters.category === String(cat.id) || (cat.id === 'all' && !filters.category) }"
              @click="selectCategory(cat.id)"
            >
              <span>{{ cat.icon }} {{ cat.name }}</span>
              <span class="count">{{ cat.api_count }}</span>
            </div>
          </div>
        </div>

        <!-- 筛选 -->
        <div class="filter-section">
          <div class="filter-label">价格筛选</div>
          <el-radio-group v-model="filters.free" @change="loadApis">
            <div class="radio-list">
              <el-radio value="">全部</el-radio>
              <el-radio value="1">仅免费</el-radio>
            </div>
          </el-radio-group>
        </div>
      </div>

      <div class="main-area">
        <!-- 工具栏 -->
        <div class="toolbar">
          <div class="result-info">
            共找到 <strong style="color:var(--primary)">{{ total }}</strong> 个接口
          </div>
          <div class="sort-options">
            <el-select v-model="filters.sort" size="small" @change="loadApis" style="width:120px">
              <el-option value="hot" label="按热度" />
              <el-option value="newest" label="最新上架" />
            </el-select>
          </div>
        </div>

        <!-- API列表 -->
        <div v-if="loading" class="api-grid">
          <div v-for="i in 9" :key="i" class="api-card-skeleton">
            <div class="skeleton" style="height:20px;width:60%;margin-bottom:12px"></div>
            <div class="skeleton" style="height:14px;margin-bottom:8px"></div>
            <div class="skeleton" style="height:14px;width:80%"></div>
          </div>
        </div>
        <div v-else-if="apis.length === 0" class="empty-state">
          <div class="empty-icon">🔍</div>
          <p>没有找到匹配的接口</p>
          <el-button text @click="resetFilters">清除筛选</el-button>
        </div>
        <div v-else class="api-grid">
          <ApiCard
            v-for="api in apis"
            :key="api.id"
            :api="api"
            @click="$router.push(`/api/${api.slug}`)"
            @favorite="handleFavorite"
          />
        </div>

        <!-- 分页 -->
        <div class="pagination-wrap" v-if="total > filters.limit">
          <el-pagination
            v-model:current-page="filters.page"
            :page-size="filters.limit"
            :total="total"
            layout="prev, pager, next"
            @current-change="loadApis"
            background
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { apiApi } from '../api'
import { useUserStore } from '../stores/user'
import ApiCard from '../components/ApiCard.vue'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const categories = ref([])
const apis = ref([])
const total = ref(0)
const loading = ref(true)

const filters = ref({
  keyword: '',
  category: '',
  free: '',
  sort: 'hot',
  page: 1,
  limit: 12,
})

let searchTimer = null
function onSearch() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => { filters.value.page = 1; loadApis() }, 500)
}

function selectCategory(id) {
  filters.value.category = id === 'all' ? '' : String(id)
  filters.value.page = 1
  loadApis()
}

function resetFilters() {
  filters.value = { keyword: '', category: '', free: '', sort: 'hot', page: 1, limit: 12 }
  loadApis()
}

async function loadApis() {
  loading.value = true
  try {
    const res = await apiApi.getList({
      keyword: filters.value.keyword,
      category: filters.value.category,
      free: filters.value.free,
      page: filters.value.page,
      limit: filters.value.limit,
    })
    if (res.code === 200) {
      apis.value = res.data.list
      total.value = res.data.total
    }
  } finally {
    loading.value = false
  }
}

async function handleFavorite(api) {
  if (!userStore.isLoggedIn) {
    ElMessage.warning('请先登录后收藏')
    return
  }
  const res = await apiApi.toggleFavorite(api.id)
  if (res.code === 200) {
    api.is_favorited = res.data.favorited
    ElMessage.success(res.message)
  }
}

onMounted(async () => {
  if (route.query.keyword) filters.value.keyword = route.query.keyword
  if (route.query.category) filters.value.category = route.query.category
  const [catRes] = await Promise.allSettled([apiApi.getCategories()])
  if (catRes.value?.code === 200) categories.value = catRes.value.data
  await loadApis()
})
</script>

<style lang="scss" scoped>
.explore-page { min-height: 100vh; }

.explore-header {
  background: linear-gradient(180deg, var(--bg-card) 0%, transparent 100%);
  padding: 40px 24px 32px;
  border-bottom: 1px solid var(--border);
  h1 { font-size: 28px; font-weight: 700; color: var(--text-primary); margin-bottom: 8px; }
  p { color: var(--text-secondary); font-size: 14px; }
}

.container {
  max-width: 1280px;
  margin: 0 auto;
  padding: 0 24px;
}

.explore-body {
  display: flex;
  gap: 24px;
  padding-top: 32px;
  padding-bottom: 60px;
  align-items: flex-start;
}

.sidebar {
  width: 220px;
  flex-shrink: 0;
  position: sticky;
  top: 80px;
}
.filter-section {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 16px;
  margin-bottom: 16px;
}
.filter-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 12px;
}
.cat-list { display: flex; flex-direction: column; gap: 4px; }
.cat-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 7px 10px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 13px;
  color: var(--text-secondary);
  transition: all 0.2s;
  
  &:hover { background: var(--bg-card2); color: var(--text-primary); }
  &.active { background: rgba(233,147,18,0.1); color: var(--primary); }
  
  .count { font-size: 11px; color: var(--text-muted); background: var(--bg-card2); padding: 1px 6px; border-radius: 10px; }
}
.radio-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  :deep(.el-radio__label) { color: var(--text-secondary); font-size: 13px; }
  :deep(.el-radio.is-checked .el-radio__label) { color: var(--primary); }
  :deep(.el-radio__input.is-checked .el-radio__inner) { background: var(--primary); border-color: var(--primary); }
}

.main-area { flex: 1; min-width: 0; }

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  font-size: 14px;
  color: var(--text-secondary);
}

.api-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}
.api-card-skeleton {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 24px;
  height: 180px;
}

.empty-state {
  text-align: center;
  padding: 80px 0;
  .empty-icon { font-size: 48px; margin-bottom: 16px; }
  p { color: var(--text-secondary); margin-bottom: 16px; }
}

.pagination-wrap {
  display: flex;
  justify-content: center;
  margin-top: 40px;
}
</style>
