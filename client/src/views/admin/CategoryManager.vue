<template>
  <div class="manager-page">
    <div class="manager-header">
      <h2>分类管理</h2>
      <el-button type="primary" @click="openCreate"><el-icon><Plus /></el-icon> 新增分类</el-button>
    </div>
    <el-table :data="categories" v-loading="loading">
      <el-table-column prop="id" label="ID" width="60" />
      <el-table-column label="分类" min-width="140">
        <template #default="{ row }">
          <div style="display:flex;align-items:center;gap:8px">
            <span style="font-size:20px">{{ row.icon }}</span>
            <strong>{{ row.name }}</strong>
          </div>
        </template>
      </el-table-column>
      <el-table-column prop="description" label="描述" min-width="200" />
      <el-table-column prop="api_count" label="接口数" width="80" />
      <el-table-column prop="sort_order" label="排序" width="80" />
      <el-table-column label="操作" width="120" fixed="right">
        <template #default="{ row }">
          <el-button text type="primary" size="small" @click="openEdit(row)">编辑</el-button>
          <el-button text type="danger" size="small" @click="deleteCategory(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="showDialog" :title="editing ? '编辑分类' : '新增分类'" width="420px">
      <el-form :model="form" label-width="80px">
        <el-form-item label="分类名称"><el-input v-model="form.name" /></el-form-item>
        <el-form-item label="图标Emoji"><el-input v-model="form.icon" placeholder="如：🌤" /></el-form-item>
        <el-form-item label="描述"><el-input v-model="form.description" type="textarea" :rows="2" /></el-form-item>
        <el-form-item label="排序权重"><el-input-number v-model="form.sort_order" :min="0" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showDialog = false">取消</el-button>
        <el-button type="primary" @click="save" :loading="saving">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { adminApi } from '../../api'

const categories = ref([])
const loading = ref(false)
const showDialog = ref(false)
const saving = ref(false)
const editing = ref(null)
const form = reactive({ name: '', icon: '', description: '', sort_order: 0 })

async function load() {
  loading.value = true
  try {
    const res = await adminApi.getCategories()
    if (res.code === 200) categories.value = res.data
  } finally {
    loading.value = false
  }
}

function openCreate() { editing.value = null; Object.assign(form, { name: '', icon: '', description: '', sort_order: 0 }); showDialog.value = true }
function openEdit(c) { editing.value = c; Object.assign(form, c); showDialog.value = true }

async function save() {
  if (!form.name) return ElMessage.warning('请输入分类名称')
  saving.value = true
  try {
    const res = editing.value ? await adminApi.updateCategory(editing.value.id, form) : await adminApi.createCategory(form)
    if (res.code === 200) { ElMessage.success(res.message); showDialog.value = false; load() }
    else ElMessage.error(res.message)
  } finally {
    saving.value = false
  }
}

async function deleteCategory(c) {
  await ElMessageBox.confirm(`确认删除分类「${c.name}」？`, '提示', { type: 'warning' })
  const res = await adminApi.deleteCategory(c.id)
  if (res.code === 200) { ElMessage.success(res.message); load() }
  else ElMessage.error(res.message)
}

onMounted(load)
</script>
<style lang="scss" scoped>
.manager-page { display: flex; flex-direction: column; gap: 20px; }
.manager-header { display: flex; align-items: center; justify-content: space-between; h2 { font-size: 20px; font-weight: 700; color: var(--text-primary); } }
</style>
