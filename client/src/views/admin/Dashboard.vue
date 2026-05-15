<template>
  <div class="dashboard-page">
    <!-- 统计卡片 -->
    <div class="stats-grid">
      <div class="stat-card" v-for="s in statCards" :key="s.label" :style="{ '--accent': s.color }">
        <div class="stat-icon">{{ s.icon }}</div>
        <div class="stat-content">
          <div class="stat-value">{{ s.value }}</div>
          <div class="stat-label">{{ s.label }}</div>
        </div>
        <div class="stat-bg-icon">{{ s.icon }}</div>
      </div>
    </div>

    <!-- 图表行 -->
    <div class="chart-row">
      <!-- 调用趋势 -->
      <div class="chart-card wide">
        <div class="card-header">
          <h3>近7日调用趋势</h3>
        </div>
        <div class="trend-chart">
          <div v-if="trendData.length === 0" class="no-data">暂无数据</div>
          <div v-else class="bars">
            <div v-for="(d, i) in trendData" :key="i" class="trend-bar-wrap">
              <div class="trend-bar-inner">
                <div class="trend-bar" :style="{ height: trendBarH(d.count) + 'px' }"></div>
              </div>
              <div class="trend-bar-val">{{ d.count }}</div>
              <div class="trend-bar-day">{{ d.day.slice(-5) }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Top API -->
      <div class="chart-card">
        <div class="card-header"><h3>热门接口 TOP5</h3></div>
        <div class="top-api-list">
          <div v-for="(api, i) in topApis" :key="api.id" class="top-api-item">
            <div class="rank" :class="'rank-' + (i+1)">{{ i+1 }}</div>
            <div class="api-info">
              <div class="api-n">{{ api.name }}</div>
              <div class="api-calls">{{ api.calls_count }} 次调用</div>
            </div>
            <div class="bar-mini">
              <div class="fill" :style="{ width: topBarW(api.calls_count) + '%' }"></div>
            </div>
          </div>
          <div v-if="topApis.length === 0" class="no-data">暂无数据</div>
        </div>
      </div>
    </div>

    <!-- 底部 -->
    <div class="bottom-row">
      <!-- 快捷操作 -->
      <div class="quick-card">
        <div class="card-header"><h3>快捷操作</h3></div>
        <div class="quick-actions">
          <div class="qa-btn" v-for="q in quickActions" :key="q.label" @click="$router.push(q.path)">
            <div class="qa-icon" :style="{ background: q.color }">{{ q.icon }}</div>
            <span>{{ q.label }}</span>
          </div>
        </div>
      </div>

      <!-- 最近注册 -->
      <div class="chart-card wide">
        <div class="card-header"><h3>最近注册用户</h3></div>
        <el-table :data="recentUsers" size="small">
          <el-table-column prop="username" label="用户名" width="120" />
          <el-table-column prop="nickname" label="昵称" width="120" />
          <el-table-column prop="email" label="邮箱" />
          <el-table-column prop="created_at" label="注册时间" width="140">
            <template #default="{ row }">{{ dayjs(row.created_at).format('MM-DD HH:mm') }}</template>
          </el-table-column>
        </el-table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import dayjs from 'dayjs'
import { adminApi } from '../../api'

const data = ref({})
const topApis = computed(() => data.value.topApis || [])
const recentUsers = computed(() => data.value.recentUsers || [])
const trendData = computed(() => data.value.trend || [])

const statCards = computed(() => [
  { icon: '🔌', label: '总接口数', value: data.value.apiCount || 0, color: '#409eff' },
  { icon: '📦', label: '内置库脚本', value: data.value.localApiCount || 0, color: '#00d9a5' },
  { icon: '👥', label: '注册用户', value: data.value.userCount || 0, color: '#67c23a' },
  { icon: '📈', label: '今日调用', value: data.value.todayCalls || 0, color: '#e99312' },
  { icon: '🔢', label: '累计调用', value: formatNum(data.value.totalCalls), color: '#9b59b6' },
  { icon: '💰', label: '用户总积分', value: formatNum(data.value.totalCredits), color: '#f59e0b' },
  { icon: '🆕', label: '今日新增用户', value: data.value.newUsersToday || 0, color: '#e74c3c' },
])

const quickActions = [
  { icon: '➕', label: '新增接口', path: '/admin/apis', color: 'rgba(64,158,255,0.15)' },
  { icon: '🏷', label: '新增分类', path: '/admin/categories', color: 'rgba(103,194,58,0.15)' },
  { icon: '📢', label: '发布公告', path: '/admin/announcements', color: 'rgba(233,147,18,0.15)' },
  { icon: '⚙️', label: '系统设置', path: '/admin/settings', color: 'rgba(155,89,182,0.15)' },
]

function formatNum(n) {
  if (!n) return '0'
  if (n >= 10000) return (n / 10000).toFixed(1) + 'w'
  return String(n)
}
function trendBarH(count) {
  const max = Math.max(...trendData.value.map(d => d.count), 1)
  return Math.max(4, Math.round((count / max) * 80))
}
function topBarW(count) {
  const max = Math.max(...topApis.value.map(a => a.calls_count), 1)
  return Math.max(4, Math.round((count / max) * 100))
}

onMounted(async () => {
  const res = await adminApi.getDashboard()
  if (res.code === 200) data.value = res.data
})
</script>

<style lang="scss" scoped>
.dashboard-page { 
  display: flex; 
  flex-direction: column; 
  gap: 20px; 
  
  @media (max-width: 768px) {
    gap: 12px;
  }
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
  
  @media (max-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }
  
  @media (max-width: 480px) {
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }
}
.stat-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  position: relative;
  overflow: hidden;
  transition: var(--transition);
  &:hover { border-color: var(--accent, var(--border-active)); transform: translateY(-2px); }
  
  @media (max-width: 768px) {
    padding: 14px;
    gap: 12px;
    border-radius: var(--radius-sm);
  }
  
  @media (max-width: 480px) {
    padding: 12px;
    gap: 10px;
  }
}
.stat-icon {
  font-size: 28px;
  width: 52px; height: 52px;
  border-radius: 14px;
  background: var(--row-hover-bg);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  
  @media (max-width: 768px) {
    width: 40px;
    height: 40px;
    font-size: 20px;
    border-radius: 10px;
  }
  
  @media (max-width: 480px) {
    width: 36px;
    height: 36px;
    font-size: 18px;
    border-radius: 8px;
  }
}
.stat-content {
  .stat-value { 
    font-size: 26px; 
    font-weight: 800; 
    color: var(--accent, var(--primary)); 
    
    @media (max-width: 768px) {
      font-size: 20px;
    }
    
    @media (max-width: 480px) {
      font-size: 18px;
    }
  }
  .stat-label { 
    font-size: 13px; 
    color: var(--text-muted); 
    margin-top: 2px; 
    
    @media (max-width: 768px) {
      font-size: 11px;
    }
  }
}
.stat-bg-icon {
  position: absolute;
  right: -8px; bottom: -8px;
  font-size: 64px;
  opacity: 0.04;
  pointer-events: none;
  
  @media (max-width: 768px) {
    font-size: 48px;
  }
}

.chart-row, .bottom-row {
  display: flex;
  gap: 20px;
  
  @media (max-width: 992px) {
    flex-direction: column;
    gap: 16px;
  }
  
  @media (max-width: 768px) {
    gap: 12px;
  }
}
.chart-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 20px;
  flex: 1;
  min-width: 0;
  &.wide { flex: 2; }
  
  @media (max-width: 768px) {
    padding: 16px;
    border-radius: var(--radius-sm);
  }
  
  @media (max-width: 480px) {
    padding: 12px;
  }
}
.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  h3 { font-size: 15px; font-weight: 600; color: var(--text-primary); }
  
  @media (max-width: 768px) {
    margin-bottom: 14px;
    h3 { font-size: 13px; }
  }
}

// 趋势图
.trend-chart { height: 120px; display: flex; align-items: flex-end; 
  @media (max-width: 768px) { height: 100px; }
}
.bars {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  width: 100%;
  height: 100%;
  gap: 8px;
  
  @media (max-width: 768px) { gap: 4px; }
}
.trend-bar-wrap {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  height: 100%;
  justify-content: flex-end;
}
.trend-bar-inner { width: 100%; display: flex; justify-content: center; align-items: flex-end; height: 80px; 
  @media (max-width: 768px) { height: 60px; }
}
.trend-bar {
  width: 70%;
  background: linear-gradient(180deg, var(--primary), var(--primary-dark));
  border-radius: 4px 4px 0 0;
  min-height: 4px;
  transition: height 0.8s cubic-bezier(0.4, 0, 0.2, 1);
}
.trend-bar-val { font-size: 11px; color: var(--text-muted); 
  @media (max-width: 768px) { font-size: 10px; }
}
.trend-bar-day { font-size: 10px; color: var(--text-muted); 
  @media (max-width: 768px) { font-size: 9px; }
}

// Top API
.top-api-list { display: flex; flex-direction: column; gap: 12px; }
.top-api-item {
  display: flex;
  align-items: center;
  gap: 12px;
}
.rank {
  width: 24px; height: 24px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  flex-shrink: 0;
  background: var(--bg-card2);
  color: var(--text-muted);
  &.rank-1 { background: rgba(233,147,18,0.2); color: var(--primary); }
  &.rank-2 { background: rgba(200,200,200,0.15); color: var(--text-muted); }
  &.rank-3 { background: rgba(180,120,60,0.2); color: var(--warning); }
  
  @media (max-width: 768px) {
    width: 20px;
    height: 20px;
    font-size: 11px;
    border-radius: 4px;
  }
}
.api-info { flex: 1; min-width: 0; }
.api-n { 
  font-size: 13px; 
  color: var(--text-primary); 
  white-space: nowrap; 
  overflow: hidden; 
  text-overflow: ellipsis; 
  
  @media (max-width: 768px) {
    font-size: 12px;
  }
}
.api-calls { font-size: 11px; color: var(--text-muted); 
  @media (max-width: 768px) {
    font-size: 10px;
  }
}
.bar-mini { 
  width: 80px; 
  height: 4px; 
  background: var(--bg-card2); 
  border-radius: 2px; 
  
  @media (max-width: 768px) {
    width: 60px;
  }
}
.fill { height: 100%; background: var(--primary); border-radius: 2px; transition: width 0.8s ease; }

.no-data { color: var(--text-muted); font-size: 13px; text-align: center; padding: 20px 0; }

// 快捷操作
.quick-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 20px;
  width: 240px;
  flex-shrink: 0;
  
  @media (max-width: 992px) {
    width: 100%;
  }
  
  @media (max-width: 768px) {
    padding: 16px;
    border-radius: var(--radius-sm);
  }
}
.quick-actions { 
  display: grid; 
  grid-template-columns: 1fr 1fr; 
  gap: 12px; 
  
  @media (max-width: 480px) {
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
  }
}
.qa-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px 8px;
  border-radius: var(--radius-sm);
  background: var(--bg-card2);
  border: 1px solid var(--border);
  cursor: pointer;
  transition: var(--transition);
  &:hover { border-color: var(--border-active); transform: translateY(-2px); }
  
  @media (max-width: 768px) {
    padding: 12px 6px;
    gap: 6px;
  }
  
  .qa-icon {
    width: 40px; height: 40px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    
    @media (max-width: 768px) {
      width: 32px;
      height: 32px;
      font-size: 16px;
      border-radius: 8px;
    }
    
    @media (max-width: 480px) {
      width: 28px;
      height: 28px;
      font-size: 14px;
      border-radius: 6px;
    }
  }
  span { 
    font-size: 12px; 
    color: var(--text-secondary); 
    
    @media (max-width: 768px) {
      font-size: 11px;
    }
    
    @media (max-width: 480px) {
      font-size: 10px;
      text-align: center;
    }
  }
}

:deep(.el-table) {
  @media (max-width: 768px) {
    font-size: 12px;
    
    .el-table__header th,
    .el-table__body td {
      padding: 8px 4px;
    }
  }
}
</style>
