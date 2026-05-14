<template>
  <div class="api-card-wrap" @click="$emit('click')">
    <div class="api-card">
      <div class="card-top">
        <div class="card-left">
          <div class="cat-badge">{{ api.category_icon || '📦' }} {{ api.category_name || '未分类' }}</div>
          <div class="method-badge" :class="api.method?.toLowerCase()">{{ api.method || 'GET' }}</div>
        </div>
        <div class="card-right">
          <span class="badge-free" v-if="api.is_free">免费</span>
          <span class="badge-paid" v-else>付费</span>
          <div class="speed-indicator" v-if="api.avg_speed">
            <div class="speed-dot" :class="speedClass(api.avg_speed)"></div>
            <span>{{ api.avg_speed }}ms</span>
          </div>
        </div>
      </div>

      <h3 class="api-name">{{ api.name }}</h3>
      <p class="api-desc">{{ api.description || '暂无描述' }}</p>

      <div class="card-footer">
        <div class="call-count">
          <el-icon style="font-size:12px"><DataAnalysis /></el-icon>
          <span>{{ formatNum(api.calls_count) }} 次调用</span>
        </div>
        <div class="fav-icon" :class="{ favorited: api.is_favorited }" @click.stop="$emit('favorite', api)">
          <el-icon><Star /></el-icon>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({ api: Object })
defineEmits(['click', 'favorite'])

function speedClass(ms) {
  if (ms < 300) return 'fast'
  if (ms < 1000) return 'medium'
  return 'slow'
}
function formatNum(n) {
  if (!n) return '0'
  if (n >= 10000) return (n / 10000).toFixed(1) + 'w'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k'
  return String(n)
}
</script>

<style lang="scss" scoped>
.api-card-wrap { cursor: pointer; }

.api-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 20px;
  transition: var(--transition);
  height: 100%;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 2px;
    background: linear-gradient(90deg, transparent, var(--primary), transparent);
    opacity: 0;
    transition: var(--transition);
  }

  &:hover {
    border-color: var(--border-active);
    box-shadow: var(--glow);
    transform: translateY(-4px);
    &::before { opacity: 1; }
  }
}

.card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
  flex-wrap: wrap;
  gap: 8px;
}
.card-left, .card-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.cat-badge {
  font-size: 12px;
  color: var(--text-muted);
  background: var(--bg-card2);
  padding: 3px 10px;
  border-radius: 12px;
  border: 1px solid var(--border);
}

.method-badge {
  font-size: 11px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 6px;
  font-family: monospace;
  &.get { background: rgba(103,194,58,0.12); color: #67c23a; border: 1px solid rgba(103,194,58,0.2); }
  &.post { background: rgba(64,158,255,0.12); color: #409eff; border: 1px solid rgba(64,158,255,0.2); }
  &.put { background: rgba(233,147,18,0.12); color: #e99312; border: 1px solid rgba(233,147,18,0.2); }
  &.delete { background: rgba(245,108,108,0.12); color: #f56c6c; border: 1px solid rgba(245,108,108,0.2); }
}

.speed-indicator {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: var(--text-muted);
}

.api-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 8px;
  line-height: 1.4;
}

.api-desc {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin-bottom: 16px;
  min-height: 42px;
}

.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 12px;
  border-top: 1px solid var(--border);
}
.call-count {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--text-muted);
  .fav-icon {
    color: var(--text-muted);
    cursor: pointer;
    transition: all 0.2s;
    &:hover { color: var(--primary); }
    &.favorited { color: var(--primary); }
  }
}

// 响应式
@media (max-width: 768px) {
  .api-card { padding: 16px; }
  .api-name { font-size: 14px; }
  .api-desc { font-size: 12px; -webkit-line-clamp: 3; min-height: auto; }
  .cat-badge { font-size: 11px; padding: 2px 8px; }
  .method-badge { font-size: 10px; padding: 1px 6px; }
  .call-count { font-size: 11px; }
}
</style>
