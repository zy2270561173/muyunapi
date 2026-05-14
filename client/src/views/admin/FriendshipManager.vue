<template>
  <div class="friendship-manager">
    <div class="manager-header">
      <h2>友链管理</h2>
      <el-button type="primary" @click="openCreate">
        <el-icon><Plus /></el-icon> 添加友链
      </el-button>
    </div>

    <el-table :data="links" v-loading="loading" row-class-name="api-row">
      <el-table-column prop="id" label="ID" width="60" />
      <el-table-column label="名称" min-width="120">
        <template #default="{ row }">
          <div class="link-name">
            <span class="name">{{ row.name }}</span>
            <span v-if="row.logo" class="logo-tag">有Logo</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="链接" min-width="200">
        <template #default="{ row }">
          <a :href="row.url" target="_blank" class="link-url">{{ row.url }}</a>
        </template>
      </el-table-column>
      <el-table-column label="跳转方式" width="140">
        <template #default="{ row }">
          <el-tag v-if="row.target === 'blank'" type="info" size="small">新标签页</el-tag>
          <el-tag v-else-if="row.target === 'self'" type="warning" size="small">本页跳转</el-tag>
          <el-tag v-else type="success" size="small">倒计时跳转</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="倒计时" width="80">
        <template #default="{ row }">
          <span v-if="row.target === 'redirect'">{{ row.redirect_seconds || 5 }}秒</span>
          <span v-else class="text-muted">-</span>
        </template>
      </el-table-column>
      <el-table-column prop="sort_order" label="排序" width="70" />
      <el-table-column label="状态" width="70">
        <template #default="{ row }">
          <el-tag :type="row.is_active ? 'success' : 'danger'" size="small">
            {{ row.is_active ? '启用' : '禁用' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="160" fixed="right">
        <template #default="{ row }">
          <el-button type="primary" text size="small" @click="openEdit(row)">编辑</el-button>
          <el-button type="danger" text size="small" @click="deleteLink(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 创建/编辑对话框 -->
    <el-dialog v-model="showDialog" :title="editingLink ? '编辑友链' : '添加友链'" width="600px" :destroy-on-close="true">
      <el-form :model="form" label-width="90px">
        <el-form-item label="名称" required>
          <el-input v-model="form.name" placeholder="如：GitHub" />
        </el-form-item>
        <el-form-item label="链接" required>
          <el-input v-model="form.url" placeholder="https://github.com" />
        </el-form-item>
        <el-form-item label="Logo地址">
          <el-input v-model="form.logo" placeholder="https://example.com/logo.png（可选）" />
        </el-form-item>
        <el-form-item label="跳转方式">
          <el-radio-group v-model="form.target">
            <el-radio value="blank">新标签页打开</el-radio>
            <el-radio value="self">本页跳转</el-radio>
            <el-radio value="redirect">倒计时跳转</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="form.target === 'redirect'" label="倒计时">
          <el-input-number v-model="form.redirect_seconds" :min="3" :max="30" />
          <span class="form-hint">秒后自动跳转</span>
        </el-form-item>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="排序权重">
              <el-input-number v-model="form.sort_order" :min="0" style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="启用状态">
              <el-switch v-model="form.is_active" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="showDialog = false">取消</el-button>
        <el-button type="primary" @click="saveLink" :loading="saving">{{ editingLink ? '保存' : '添加' }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { friendshipApi } from '../../api'

const links = ref([])
const loading = ref(false)
const saving = ref(false)
const showDialog = ref(false)
const editingLink = ref(null)

const defaultForm = () => ({
  name: '',
  url: '',
  logo: '',
  target: 'blank',
  redirect_seconds: 5,
  sort_order: 0,
  is_active: true,
})
const form = reactive(defaultForm())

async function loadLinks() {
  loading.value = true
  try {
    const res = await friendshipApi.getAdminList()
    if (res.code === 200) links.value = res.data || []
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editingLink.value = null
  Object.assign(form, defaultForm())
  showDialog.value = true
}

function openEdit(link) {
  editingLink.value = link
  Object.assign(form, {
    name: link.name,
    url: link.url,
    logo: link.logo || '',
    target: link.target || 'blank',
    redirect_seconds: link.redirect_seconds || 5,
    sort_order: link.sort_order || 0,
    is_active: !!link.is_active,
  })
  showDialog.value = true
}

async function saveLink() {
  if (!form.name || !form.url) return ElMessage.warning('名称和链接必填')
  saving.value = true
  try {
    const data = { ...form }
    let res
    if (editingLink.value) {
      res = await friendshipApi.update(editingLink.value.id, data)
    } else {
      res = await friendshipApi.create(data)
    }
    if (res.code === 200) {
      ElMessage.success(editingLink.value ? '已更新' : '已添加')
      showDialog.value = false
      loadLinks()
    } else {
      ElMessage.error(res.message)
    }
  } finally {
    saving.value = false
  }
}

async function deleteLink(link) {
  await ElMessageBox.confirm(`确定删除友链「${link.name}」？`, '提示', { type: 'warning' })
  const res = await friendshipApi.delete(link.id)
  if (res.code === 200) {
    ElMessage.success('已删除')
    loadLinks()
  }
}

onMounted(() => loadLinks())
</script>

<style lang="scss" scoped>
.friendship-manager { display: flex; flex-direction: column; gap: 20px; }

.manager-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  h2 { font-size: 20px; font-weight: 700; color: var(--text-primary); }
}

.link-name {
  display: flex;
  align-items: center;
  gap: 8px;
  .name { font-weight: 600; }
  .logo-tag { font-size: 11px; color: var(--primary); background: rgba(233,147,18,0.1); padding: 1px 6px; border-radius: 4px; }
}

.link-url {
  color: var(--primary);
  text-decoration: none;
  font-size: 13px;
  &:hover { text-decoration: underline; }
}

.text-muted { color: var(--text-muted); }

.form-hint { margin-left: 12px; font-size: 12px; color: var(--text-muted); }
</style>
