<template>
  <div class="manager-page">
    <div class="manager-header">
      <h2>调用日志</h2>
    </div>
    <el-table :data="logs" v-loading="loading" size="small">
      <el-table-column prop="id" label="ID" width="60" />
      <el-table-column prop="api_name" label="接口名称" min-width="140" />
      <el-table-column prop="username" label="用户" width="100" />
      <el-table-column prop="ip" label="IP" width="130" />
      <el-table-column prop="method" label="方法" width="70" />
      <el-table-column prop="response_code" label="状态码" width="80">
        <template #default="{ row }">
          <el-tag :type="row.response_code >= 200 && row.response_code < 300 ? 'success' : 'danger'" size="small">{{ row.response_code }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="response_time" label="响应时间" width="90">
        <template #default="{ row }">{{ row.response_time }}ms</template>
      </el-table-column>
      <el-table-column prop="created_at" label="时间" width="160">
        <template #default="{ row }">{{ dayjs(row.created_at).format('MM-DD HH:mm:ss') }}</template>
      </el-table-column>
    </el-table>
    <div class="pagination-wrap">
      <el-pagination v-model:current-page="page" :page-size="20" :total="total" layout="total, prev, pager, next" background @current-change="load" />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import dayjs from 'dayjs'
import { adminApi } from '../../api'

const logs = ref([])
const loading = ref(false)
const total = ref(0)
const page = ref(1)

async function load() {
  loading.value = true
  const res = await adminApi.getLogs({ page: page.value, limit: 20 })
  if (res.code === 200) { logs.value = res.data.list; total.value = res.data.total }
  loading.value = false
}

onMounted(load)
</script>
<style lang="scss" scoped>
.manager-page { display: flex; flex-direction: column; gap: 20px; }
.manager-header { h2 { font-size: 20px; font-weight: 700; color: var(--text-primary); } }
.pagination-wrap { display: flex; justify-content: flex-end; margin-top: 16px; }
</style>
