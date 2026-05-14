<template>
  <div class="manager-page">
    <div class="manager-header">
      <h2>用户管理</h2>
      <div style="display:flex;gap:12px;align-items:center">
        <el-input v-model="keyword" placeholder="搜索用户名/邮箱..." style="width:220px" clearable @input="onSearch">
          <template #prefix><el-icon><Search /></el-icon></template>
        </el-input>
        <el-button type="primary" @click="openCreate"><el-icon><Plus /></el-icon> 新增用户</el-button>
      </div>
    </div>

    <el-table :data="users" v-loading="loading">
      <el-table-column prop="id" label="ID" width="60" />
      <el-table-column label="用户信息" min-width="180">
        <template #default="{ row }">
          <div style="display:flex;align-items:center;gap:10px">
            <el-avatar :src="row.avatar" :size="32">{{ row.nickname?.[0] }}</el-avatar>
            <div>
              <div style="color:var(--text-primary);font-weight:500">{{ row.nickname }}</div>
              <div style="font-size:12px;color:var(--text-muted);font-family:monospace">@{{ row.username }}</div>
            </div>
          </div>
        </template>
      </el-table-column>
      <el-table-column prop="email" label="邮箱" min-width="180" show-overflow-tooltip />
      <el-table-column label="调用次数" width="100" align="center">
        <template #default="{ row }">
          <el-tag type="info" size="small">{{ row.total_calls || 0 }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="密钥数" width="80" align="center">
        <template #default="{ row }">
          <el-tag type="info" size="small">{{ row.key_count || 0 }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="角色" width="90">
        <template #default="{ row }">
          <el-tag :type="row.role === 'admin' ? 'warning' : 'info'" size="small">{{ row.role === 'admin' ? '管理员' : '用户' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="积分" width="100" align="center">
        <template #default="{ row }">
          <span class="credits-value">{{ row.credits || 0 }}</span>
        </template>
      </el-table-column>
      <el-table-column label="邮箱验证" width="90">
        <template #default="{ row }">
          <el-tag :type="row.email_verified ? 'success' : 'danger'" size="small">{{ row.email_verified ? '已验证' : '未验证' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="80">
        <template #default="{ row }">
          <el-tag :type="row.status ? 'success' : 'danger'" size="small">{{ row.status ? '正常' : '禁用' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="created_at" label="注册时间" width="160">
        <template #default="{ row }">{{ dayjs(row.created_at).format('YYYY-MM-DD HH:mm') }}</template>
      </el-table-column>
      <el-table-column label="操作" width="220" fixed="right">
        <template #default="{ row }">
          <el-button text type="primary" size="small" @click="openDetail(row)">详情</el-button>
          <el-button text size="small" @click="openEdit(row)">编辑</el-button>
          <el-button text size="small" @click="resetKey(row)">重置密钥</el-button>
          <el-button text size="small" @click="toggleUser(row)" :type="row.status ? 'warning' : 'success'">
            {{ row.status ? '禁用' : '启用' }}
          </el-button>
          <el-button type="danger" text size="small" @click="deleteUser(row)" :disabled="row.role === 'admin'">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <div class="pagination-wrap">
      <el-pagination v-model:current-page="page" :page-size="15" :total="total" layout="total, prev, pager, next" background @current-change="loadUsers" />
    </div>

    <!-- 新增用户弹窗 -->
    <el-dialog v-model="showCreate" title="新增用户" width="480px">
      <el-form :model="createForm" :rules="createRules" ref="createRef" label-width="80px">
        <el-form-item label="用户名" prop="username">
          <el-input v-model="createForm.username" placeholder="登录用户名" />
        </el-form-item>
        <el-form-item label="邮箱" prop="email">
          <el-input v-model="createForm.email" placeholder="用户邮箱地址" />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input v-model="createForm.password" type="password" placeholder="至少6位" show-password />
        </el-form-item>
        <el-form-item label="昵称" prop="nickname">
          <el-input v-model="createForm.nickname" placeholder="显示名称（留空则同用户名）" />
        </el-form-item>
        <el-form-item label="角色" prop="role">
          <el-select v-model="createForm.role" style="width:100%">
            <el-option label="普通用户" value="user" />
            <el-option label="管理员" value="admin" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreate = false">取消</el-button>
        <el-button type="primary" @click="submitCreate" :loading="saving">创建用户</el-button>
      </template>
    </el-dialog>

    <!-- 用户详情弹窗 -->
    <el-dialog v-model="showDetail" title="用户详情" width="520px">
      <div v-if="detailUser" class="user-detail">
        <div class="detail-avatar">
          <el-avatar :src="detailUser.avatar" :size="72">{{ detailUser.nickname?.[0] }}</el-avatar>
          <div class="detail-name">{{ detailUser.nickname || detailUser.username }}</div>
          <div class="detail-username">@{{ detailUser.username }}</div>
        </div>
        <el-divider />
        <div class="detail-stats">
          <div class="stat-card">
            <div class="stat-num">{{ detailUser.total_calls || 0 }}</div>
            <div class="stat-label">调用次数</div>
          </div>
          <div class="stat-card">
            <div class="stat-num">{{ detailUser.key_count || 0 }}</div>
            <div class="stat-label">密钥数量</div>
          </div>
          <div class="stat-card">
            <div class="stat-num">{{ detailUser.favorite_count || 0 }}</div>
            <div class="stat-label">收藏数</div>
          </div>
          <div class="stat-card credits-stat">
            <div class="stat-num credits-num">{{ detailUser.credits || 0 }}</div>
            <div class="stat-label">用户积分</div>
          </div>
        </div>
        <el-divider />
        <div class="detail-info">
          <div class="info-row"><span class="info-label">邮箱：</span><span>{{ detailUser.email }}</span></div>
          <div class="info-row"><span class="info-label">用户ID：</span><span style="font-family:monospace">{{ detailUser.uid }}</span></div>
          <div class="info-row"><span class="info-label">角色：</span><el-tag size="small" :type="detailUser.role === 'admin' ? 'warning' : 'info'">{{ detailUser.role === 'admin' ? '管理员' : '普通用户' }}</el-tag></div>
          <div class="info-row"><span class="info-label">状态：</span><el-tag size="small" :type="detailUser.status ? 'success' : 'danger'">{{ detailUser.status ? '正常' : '已禁用' }}</el-tag></div>
          <div class="info-row"><span class="info-label">邮箱验证：</span><el-tag size="small" :type="detailUser.email_verified ? 'success' : 'danger'">{{ detailUser.email_verified ? '已验证' : '未验证' }}</el-tag></div>
          <div class="info-row"><span class="info-label">注册时间：</span><span>{{ dayjs(detailUser.created_at).format('YYYY-MM-DD HH:mm:ss') }}</span></div>
        </div>
        <el-divider />
        <div class="detail-keys">
          <div class="keys-title">API 密钥</div>
          <div class="key-item">
            <span class="key-label">API Key：</span>
            <el-tooltip :content="detailUser.api_key || '无'" placement="top">
              <span class="key-value">{{ detailUser.api_key || '无' }}</span>
            </el-tooltip>
          </div>
          <div class="key-item">
            <span class="key-label">API Secret：</span>
            <el-tooltip :content="detailUser.api_secret ? '已隐藏，点击复制' : '无'" placement="top">
              <span class="key-value" style="cursor:pointer" @click="copySecret(detailUser.api_secret)">
                {{ detailUser.api_secret ? '••••••••' : '无' }}
              </span>
            </el-tooltip>
          </div>
        </div>
      </div>
      <template #footer>
        <el-button @click="showDetail = false">关闭</el-button>
        <el-button type="primary" @click="openEditFromDetail">编辑用户</el-button>
      </template>
    </el-dialog>

    <!-- 编辑用户弹窗 -->
    <el-dialog v-model="showEdit" title="编辑用户" width="480px">
      <el-form :model="editForm" label-width="80px">
        <el-form-item label="昵称">
          <el-input v-model="editForm.nickname" placeholder="用户昵称" />
        </el-form-item>
        <el-form-item label="邮箱">
          <el-input v-model="editForm.email" placeholder="邮箱地址" />
        </el-form-item>
        <el-form-item label="角色">
          <el-select v-model="editForm.role" style="width:100%" :disabled="editForm.role === 'admin'">
            <el-option label="普通用户" value="user" />
            <el-option label="管理员" value="admin" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="editForm.status" style="width:100%">
            <el-option :label="editForm.role === 'admin' ? '正常（管理员不可禁用）' : '正常'" :value="1" :disabled="editForm.role === 'admin'" />
            <el-option :label="editForm.role === 'admin' ? '禁用（管理员不可禁用）' : '禁用'" :value="0" :disabled="editForm.role === 'admin'" />
          </el-select>
        </el-form-item>
        <el-form-item label="用户积分">
          <div class="credits-edit-wrap">
            <el-input-number v-model="editForm.credits" :min="0" :max="999999999" style="width:100%" />
            <span class="credits-hint">设置用户可用积分余额</span>
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showEdit = false">取消</el-button>
        <el-button type="primary" @click="submitEdit" :loading="saving">保存修改</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ElInput } from 'element-plus'
import dayjs from 'dayjs'
import { adminApi } from '../../api'

const users = ref([])
const loading = ref(false)
const total = ref(0)
const page = ref(1)
const keyword = ref('')
const saving = ref(false)

// 新增用户
const showCreate = ref(false)
const createRef = ref()
const createForm = reactive({ username: '', email: '', password: '', nickname: '', role: 'user' })
const createRules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码至少6位', trigger: 'blur' }
  ],
  role: [{ required: true, message: '请选择角色', trigger: 'change' }],
}

// 用户详情
const showDetail = ref(false)
const detailUser = ref(null)

// 编辑用户
const showEdit = ref(false)
const editForm = reactive({ id: null, nickname: '', email: '', role: 'user', status: 1, credits: 0 })

let t = null
function onSearch() { clearTimeout(t); t = setTimeout(() => { page.value = 1; loadUsers() }, 500) }

async function loadUsers() {
  loading.value = true
  const res = await adminApi.getUsers({ page: page.value, limit: 15, keyword: keyword.value })
  if (res.code === 200) { users.value = res.data.list; total.value = res.data.total }
  loading.value = false
}

// 新增用户
function openCreate() {
  createForm.username = ''
  createForm.email = ''
  createForm.password = ''
  createForm.nickname = ''
  createForm.role = 'user'
  showCreate.value = true
}

async function submitCreate() {
  if (!createForm.username || !createForm.email || !createForm.password) {
    ElMessage.warning('请填写必填项')
    return
  }
  if (createForm.password.length < 6) {
    ElMessage.warning('密码至少6位')
    return
  }
  saving.value = true
  const res = await adminApi.createUser(createForm)
  if (res.code === 200) {
    ElMessage.success('用户创建成功')
    showCreate.value = false
    loadUsers()
  } else {
    ElMessage.error(res.message || '创建失败')
  }
  saving.value = false
}

// 用户详情
async function openDetail(row) {
  const res = await adminApi.getUserDetail(row.id)
  if (res.code === 200) {
    detailUser.value = res.data
    showDetail.value = true
  } else {
    ElMessage.error(res.message || '获取详情失败')
  }
}

function openEditFromDetail() {
  if (!detailUser.value) return
  editForm.id = detailUser.value.id
  editForm.nickname = detailUser.value.nickname || ''
  editForm.email = detailUser.value.email || ''
  editForm.role = detailUser.value.role || 'user'
  editForm.status = detailUser.value.status ? 1 : 0
  editForm.credits = detailUser.value.credits || 0
  showDetail.value = false
  showEdit.value = true
}

// 编辑用户
function openEdit(row) {
  editForm.id = row.id
  editForm.nickname = row.nickname || ''
  editForm.email = row.email || ''
  editForm.role = row.role || 'user'
  editForm.status = row.status ? 1 : 0
  editForm.credits = row.credits || 0
  showEdit.value = true
}

async function submitEdit() {
  if (!editForm.email) {
    ElMessage.warning('邮箱不能为空')
    return
  }
  saving.value = true
  const res = await adminApi.updateUser(editForm.id, {
    nickname: editForm.nickname,
    email: editForm.email,
    role: editForm.role,
    status: editForm.status,
    credits: editForm.credits,
  })
  if (res.code === 200) {
    ElMessage.success('用户信息已更新')
    showEdit.value = false
    loadUsers()
  } else {
    ElMessage.error(res.message || '更新失败')
  }
  saving.value = false
}

// 重置密钥
async function resetKey(row) {
  await ElMessageBox.confirm(`确定要重置用户「${row.username}」的 API 密钥吗？新密钥将自动生成。`, '重置密钥', { type: 'warning' })
  const res = await adminApi.resetUserKey(row.id)
  if (res.code === 200) {
    ElMessage.success('密钥已重置')
  } else {
    ElMessage.error(res.message || '重置失败')
  }
}

// 复制密钥
function copySecret(secret) {
  if (!secret) return
  navigator.clipboard.writeText(secret).then(() => {
    ElMessage.success('密钥已复制到剪贴板')
  }).catch(() => {
    ElMessage.error('复制失败')
  })
}

// 切换状态
async function toggleUser(u) {
  const res = await adminApi.toggleUser(u.id)
  if (res.code === 200) { ElMessage.success(res.message); u.status = u.status === 1 ? 0 : 1 }
  else ElMessage.error(res.message)
}

// 删除用户
async function deleteUser(u) {
  await ElMessageBox.confirm(`确认永久删除用户「${u.username}」？此操作不可恢复！`, '危险操作', { type: 'error' })
  const res = await adminApi.deleteUser(u.id)
  if (res.code === 200) { ElMessage.success(res.message); loadUsers() }
  else ElMessage.error(res.message)
}

onMounted(loadUsers)
</script>

<style lang="scss" scoped>
.manager-page { display: flex; flex-direction: column; gap: 20px; }
.manager-header { display: flex; align-items: center; justify-content: space-between; h2 { font-size: 20px; font-weight: 700; color: var(--text-primary); } }
.pagination-wrap { display: flex; justify-content: flex-end; margin-top: 16px; }

.user-detail {
  .detail-avatar {
    text-align: center;
    padding: 16px 0;
    .detail-name { font-size: 18px; font-weight: 600; color: var(--text-primary); margin-top: 12px; }
    .detail-username { font-size: 13px; color: var(--text-muted); margin-top: 4px; }
  }
  .detail-stats {
    display: flex;
    justify-content: center;
    gap: 24px;
    flex-wrap: wrap;
    .stat-card {
      text-align: center;
      min-width: 80px;
      .stat-num { font-size: 24px; font-weight: 700; color: var(--primary); }
      .stat-label { font-size: 12px; color: var(--text-muted); margin-top: 4px; }
      &.credits-stat .credits-num { color: var(--primary); }
    }
  }
  .detail-info {
    .info-row {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 0;
      font-size: 14px;
      color: var(--text-secondary);
      .info-label { color: var(--text-muted); min-width: 80px; }
    }
  }
  .detail-keys {
    .keys-title { font-size: 14px; font-weight: 600; color: var(--text-primary); margin-bottom: 12px; }
    .key-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 0;
      .key-label { font-size: 13px; color: var(--text-muted); min-width: 90px; }
      .key-value { font-size: 12px; font-family: monospace; color: var(--text-secondary); word-break: break-all; }
    }
  }
}

// 积分列样式
.credits-value {
  font-weight: 600;
  color: var(--primary);
  font-size: 14px;
}

// 积分编辑样式
.credits-edit-wrap {
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 100%;
}
.credits-hint {
  font-size: 11px;
  color: var(--text-muted);
}
</style>
