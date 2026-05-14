<template>
  <div class="favorites-page">
    <div class="page-header">
      <div class="container">
        <h1>我的收藏</h1>
        <p>您收藏的 {{ favorites.length }} 个接口</p>
      </div>
    </div>
    <div class="container page-body">
      <div v-if="loading" class="api-grid">
        <div v-for="i in 6" :key="i" class="api-card-skeleton">
          <div class="skeleton" style="height:20px;width:60%;margin-bottom:12px"></div>
          <div class="skeleton" style="height:14px;margin-bottom:8px"></div>
          <div class="skeleton" style="height:14px;width:70%"></div>
        </div>
      </div>
      <div v-else-if="favorites.length === 0" class="empty-state">
        <div class="empty-icon">⭐</div>
        <p>还没有收藏任何接口</p>
        <router-link to="/explore">
          <el-button type="primary">去发现接口</el-button>
        </router-link>
      </div>
      <div v-else class="api-grid">
        <ApiCard
          v-for="api in favorites"
          :key="api.id"
          :api="{ ...api, is_favorited: true }"
          @click="$router.push(`/api/${api.slug}`)"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { userApi } from '../../api'
import ApiCard from '../../components/ApiCard.vue'

const favorites = ref([])
const loading = ref(true)

onMounted(async () => {
  const res = await userApi.getFavorites()
  if (res.code === 200) favorites.value = res.data
  loading.value = false
})
</script>

<style lang="scss" scoped>
.favorites-page { min-height: 100vh; padding-bottom: 60px; }
.page-header {
  background: linear-gradient(180deg, var(--bg-card) 0%, transparent 100%);
  padding: 40px 24px 32px;
  border-bottom: 1px solid var(--border);
  h1 { font-size: 28px; font-weight: 700; color: var(--text-primary); margin-bottom: 6px; }
  p { color: var(--text-secondary); font-size: 14px; }
}
.container { max-width: 1280px; margin: 0 auto; padding: 0 24px; }
.page-body { padding-top: 32px; }
.api-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 20px; }
.api-card-skeleton { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-md); padding: 24px; height: 180px; }
.empty-state { text-align: center; padding: 80px 0; .empty-icon { font-size: 56px; margin-bottom: 16px; } p { color: var(--text-secondary); margin-bottom: 20px; } }

// 响应式
@media (max-width: 768px) {
  .page-header { padding: 24px 16px 20px; h1 { font-size: 22px; } }
  .container { padding: 0 16px; }
  .page-body { padding-top: 20px; }
  .api-grid { gap: 12px; }
}
</style>
