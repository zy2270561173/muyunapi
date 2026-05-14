<template>
  <div class="manager-page">
    <div class="manager-header">
      <h2>公告管理</h2>
      <el-button type="primary" @click="openCreate"><el-icon><Plus /></el-icon> 发布公告</el-button>
    </div>
    <el-table :data="list" v-loading="loading">
      <el-table-column prop="id" label="ID" width="60" />
      <el-table-column prop="title" label="标题" min-width="160" />
      <el-table-column prop="content" label="内容" min-width="200" show-overflow-tooltip />
      <el-table-column label="显示类型" width="120">
        <template #default="{ row }">
          <el-tag v-if="row.type === 'topbar'" type="info" size="small">顶部滚动</el-tag>
          <el-tag v-else-if="row.type === 'popup'" type="warning" size="small">弹窗</el-tag>
          <el-tag v-else-if="row.type === 'both'" type="success" size="small">两者都有</el-tag>
          <el-tag v-else type="info" size="small">{{ row.type }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="90">
        <template #default="{ row }">
          <el-tag :type="row.is_active ? 'success' : 'info'" size="small">{{ row.is_active ? '显示中' : '已隐藏' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="发布时间" width="160">
        <template #default="{ row }">{{ dayjs(row.created_at).format('YYYY-MM-DD HH:mm') }}</template>
      </el-table-column>
      <el-table-column label="操作" width="160" fixed="right">
        <template #default="{ row }">
          <el-button text type="primary" size="small" @click="openEdit(row)">编辑</el-button>
          <el-button text :type="row.is_active ? 'warning' : 'success'" size="small" @click="toggle(row)">{{ row.is_active ? '隐藏' : '显示' }}</el-button>
          <el-button text type="danger" size="small" @click="del(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="showDialog" :title="editing ? '编辑公告' : '发布公告'" width="520px">
      <el-form :model="form" label-width="80px">
        <el-form-item label="标题" required>
          <el-input v-model="form.title" placeholder="公告标题" />
        </el-form-item>
        <el-form-item label="内容" required>
          <el-input v-model="form.content" type="textarea" :rows="4" placeholder="公告内容" />
        </el-form-item>
        <el-form-item label="显示类型" required>
          <el-radio-group v-model="form.type" size="default">
            <el-radio-button value="topbar">
              <el-icon><Bottom /></el-icon> 顶部滚动
            </el-radio-button>
            <el-radio-button value="popup">
              <el-icon><Message /></el-icon> 弹窗
            </el-radio-button>
            <el-radio-button value="both">
              <el-icon><Bell /></el-icon> 两者都有
            </el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="显示状态">
          <el-switch v-model="form.is_active" :active-value="1" :inactive-value="0" />
          <span style="margin-left:12px;color:var(--text-muted);font-size:12px">
            {{ form.is_active ? '发布中' : '已隐藏' }}
          </span>
        </el-form-item>
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
import dayjs from 'dayjs'
import { adminApi } from '../../api'

const list = ref([])
const loading = ref(false)
const showDialog = ref(false)
const saving = ref(false)
const editing = ref(null)
const form = reactive({ title: '', content: '', type: 'topbar', is_active: 1 })

async function load() {
  loading.value = true
  const res = await adminApi.getAnnouncements()
  if (res.code === 200) list.value = res.data
  loading.value = false
}

function openCreate() {
  editing.value = null
  Object.assign(form, { title: '', content: '', type: 'topbar', is_active: 1 })
  showDialog.value = true
}

function openEdit(a) {
  editing.value = a
  Object.assign(form, {
    title: a.title,
    content: a.content,
    type: a.type || 'topbar',
    is_active: a.is_active ? 1 : 0,
  })
  showDialog.value = true
}

async function save() {
  if (!form.title || !form.content) {
    ElMessage.warning('标题和内容不能为空')
    return
  }
  saving.value = true
  const res = editing.value
    ? await adminApi.updateAnnouncement(editing.value.id, form)
    : await adminApi.createAnnouncement(form)
  if (res.code === 200) {
    ElMessage.success(res.message)
    showDialog.value = false
    load()
  } else {
    ElMessage.error(res.message)
  }
  saving.value = false
}

async function toggle(a) {
  const res = await adminApi.updateAnnouncement(a.id, { ...a, is_active: a.is_active ? 0 : 1 })
  if (res.code === 200) {
    a.is_active = a.is_active ? 0 : 1
  }
}

async function del(a) {
  await ElMessageBox.confirm('确认删除此公告？', '提示', { type: 'warning' })
  const res = await adminApi.deleteAnnouncement(a.id)
  if (res.code === 200) { ElMessage.success(res.message); load() }
}

onMounted(load)
</script>
<style lang="scss" scoped>
.manager-page { display: flex; flex-direction: column; gap: 20px; }
.manager-header { display: flex; align-items: center; justify-content: space-between; h2 { font-size: 20px; font-weight: 700; color: var(--text-primary); } }
</style>
