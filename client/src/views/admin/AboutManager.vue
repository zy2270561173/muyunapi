<template>
  <div class="manager-page">
    <div class="manager-header">
      <h2>关于我页面管理</h2>
      <div class="header-actions">
        <el-button type="primary" @click="saveConfig" :loading="saving">
          保存配置
        </el-button>
        <el-button @click="previewPage">预览页面</el-button>
      </div>
    </div>

    <el-form :model="form" label-width="100px" v-loading="loading">
      <!-- 页面开关 -->
      <el-card class="switch-card">
        <div class="switch-row">
          <div class="switch-info">
            <h3>页面开关</h3>
            <p>关闭后前台将无法访问关于我页面</p>
          </div>
          <el-switch
            v-model="form.is_enabled"
            size="large"
            active-text="开启"
            inactive-text="关闭"
            @change="handleSwitchChange"
          />
        </div>
      </el-card>

      <!-- 基本信息 -->
      <el-card class="form-card">
        <template #header>
          <span>基本信息</span>
        </template>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="姓名">
              <el-input v-model="form.name" placeholder="你的姓名或昵称" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="头像URL">
              <el-input v-model="form.avatar" placeholder="头像图片地址" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="个人简介">
          <el-input
            v-model="form.bio"
            type="textarea"
            :rows="2"
            placeholder="简短的个人介绍，如：热爱技术的全栈开发者"
          />
        </el-form-item>
      </el-card>

      <!-- 教育背景 -->
      <el-card class="form-card">
        <template #header>
          <span>教育背景</span>
        </template>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="学校名称">
              <el-input v-model="form.school_name" placeholder="学校全称" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="招生代码">
              <el-input v-model="form.school_code" placeholder="如：8800587" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="所学专业">
              <el-input v-model="form.major" placeholder="如：计算机网络技术" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="所在班级">
              <el-input v-model="form.class_name" placeholder="如：计算机网络技术1班" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-card>

      <!-- 时间线配置 -->
      <el-card class="form-card">
        <template #header>
          <span>时间线配置</span>
          <el-text type="info" size="small" style="margin-left: 8px;">拖拽可排序</el-text>
        </template>

        <div class="timeline-editor">
          <el-scrollbar max-height="600px">
            <VueDraggable
              v-model="form.timeline"
              :animation="200"
              handle=".drag-handle"
              ghost-class="ghost-item"
            >
              <div
                v-for="(item, index) in form.timeline"
                :key="item.id"
                class="timeline-item-editor"
              >
                <div class="timeline-header">
                  <div class="timeline-left">
                    <el-icon class="drag-handle"><Rank /></el-icon>
                    <span class="timeline-index">{{ index + 1 }}</span>
                    <el-tag :type="getTypeTagType(item.type)" size="small">{{ getTypeLabel(item.type) }}</el-tag>
                  </div>
                  <el-button type="danger" text size="small" @click="removeTimelineItem(index)">
                    <el-icon><Delete /></el-icon>
                  </el-button>
                </div>

                <el-row :gutter="12">
                  <el-col :span="6">
                    <el-form-item label="类型" label-width="50">
                      <el-select v-model="item.type" placeholder="选择类型" style="width: 100%">
                        <el-option
                          v-for="t in timelineTypes"
                          :key="t.type_key"
                          :label="t.label"
                          :value="t.type_key"
                        />
                      </el-select>
                    </el-form-item>
                  </el-col>
                  <el-col :span="6">
                    <el-form-item label="日期" label-width="50">
                      <el-input v-model="item.date" placeholder="如：2022年9月" />
                    </el-form-item>
                  </el-col>
                  <el-col :span="12">
                    <el-form-item label="状态标签" label-width="70">
                      <el-input v-model="item.status" placeholder="如：进行中" />
                    </el-form-item>
                  </el-col>
                </el-row>

                <el-form-item label="标题">
                  <el-input v-model="item.title" placeholder="事件标题" />
                </el-form-item>

                <el-form-item label="描述">
                  <el-input
                    v-model="item.description"
                    type="textarea"
                    :rows="2"
                    placeholder="详细描述"
                  />
                </el-form-item>

                <div class="timeline-tags" v-if="item.type === 'club' || item.type === 'project'">
                  <span class="tags-label">成就标签：</span>
                  <el-tag
                    v-for="(tag, tagIndex) in item.tags"
                    :key="tagIndex"
                    closable
                    size="small"
                    @close="removeTimelineTag(index, tagIndex)"
                    style="margin-right: 8px"
                  >
                    {{ tag }}
                  </el-tag>
                  <el-input
                    v-if="item.showTagInput"
                    v-model="item.newTag"
                    size="small"
                    style="width: 100px"
                    @keyup.enter="addTimelineTag(index)"
                    @blur="addTimelineTag(index)"
                  />
                  <el-button v-else size="small" text @click="showTimelineTagInput(index)">
                    <el-icon><Plus /></el-icon> 添加标签
                  </el-button>
                </div>
              </div>
            </VueDraggable>
          </el-scrollbar>

          <el-button type="primary" plain @click="addTimelineItem" class="add-timeline-btn">
            <el-icon><Plus /></el-icon> 添加时间线项
          </el-button>
        </div>
      </el-card>

      <!-- 时间线类型管理 -->
      <el-card class="form-card">
        <template #header>
          <div class="card-header">
            <span>时间线类型管理</span>
            <el-button type="primary" size="small" @click="openTypeDialog()">
              <el-icon><Plus /></el-icon> 添加类型
            </el-button>
          </div>
        </template>

        <el-table :data="timelineTypes" size="small" max-height="300">
          <el-table-column prop="label" label="名称" width="120">
            <template #default="{ row }">
              <span class="type-label">
                <span class="type-dot" :style="{ background: row.color }"></span>
                {{ row.label }}
              </span>
            </template>
          </el-table-column>
          <el-table-column prop="type_key" label="类型键" width="120">
            <template #default="{ row }">
              <code>{{ row.type_key }}</code>
            </template>
          </el-table-column>
          <el-table-column prop="icon" label="图标" width="100">
            <template #default="{ row }">
              <el-tag size="small" effect="plain">{{ row.icon }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="sort_order" label="排序" width="80" />
          <el-table-column label="系统" width="80">
            <template #default="{ row }">
              <el-tag v-if="row.is_system" size="small" type="info">是</el-tag>
              <el-tag v-else size="small">否</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="150" fixed="right">
            <template #default="{ row }">
              <el-button type="primary" text size="small" @click="openTypeDialog(row)">
                <el-icon><Edit /></el-icon>
              </el-button>
              <el-button
                v-if="!row.is_system"
                type="danger"
                text
                size="small"
                @click="deleteType(row)"
              >
                <el-icon><Delete /></el-icon>
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-card>

      <!-- 类型编辑对话框 -->
      <el-dialog
        v-model="typeDialogVisible"
        :title="editingType ? '编辑类型' : '添加类型'"
        width="500px"
      >
        <el-form :model="typeForm" label-width="80px">
          <el-form-item label="类型键" required>
            <el-input
              v-model="typeForm.type_key"
              :disabled="!!editingType"
              placeholder="如：internship（英文，唯一标识）"
            />
          </el-form-item>
          <el-form-item label="显示名称" required>
            <el-input v-model="typeForm.label" placeholder="如：实习" />
          </el-form-item>
          <el-form-item label="图标">
            <el-select v-model="typeForm.icon" placeholder="选择图标" style="width: 100%">
              <el-option label="Clock（时钟）" value="Clock" />
              <el-option label="School（学校）" value="School" />
              <el-option label="OfficeBuilding（工作）" value="OfficeBuilding" />
              <el-option label="Collection（项目）" value="Collection" />
              <el-option label="Medal（毕业）" value="Medal" />
              <el-option label="UserFilled（社团）" value="UserFilled" />
              <el-option label="Star（荣誉）" value="Star" />
              <el-option label="Trophy（获奖）" value="Trophy" />
            </el-select>
          </el-form-item>
          <el-form-item label="颜色">
            <el-color-picker v-model="typeForm.color" />
          </el-form-item>
          <el-form-item label="标签样式">
            <el-select v-model="typeForm.tag_type" placeholder="选择样式" style="width: 100%">
              <el-option label="默认（蓝色）" value="default" />
              <el-option label="成功（绿色）" value="success" />
              <el-option label="警告（橙色）" value="warning" />
              <el-option label="危险（红色）" value="danger" />
              <el-option label="信息（灰色）" value="info" />
            </el-select>
          </el-form-item>
          <el-form-item label="排序">
            <el-input-number v-model="typeForm.sort_order" :min="0" :max="99" />
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="typeDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="saveType" :loading="typeSaving">保存</el-button>
        </template>
      </el-dialog>

      <!-- 技能标签 -->
      <el-card class="form-card">
        <template #header>
          <span>技能专长</span>
        </template>

        <div class="skills-input">
          <el-tag
            v-for="(skill, index) in form.skills"
            :key="index"
            closable
            @close="removeSkill(index)"
            class="skill-tag"
          >
            {{ skill }}
          </el-tag>
          <el-input
            v-if="inputVisible"
            ref="skillInputRef"
            v-model="inputValue"
            size="small"
            @keyup.enter="addSkill"
            @blur="addSkill"
            style="width: 100px"
          />
          <el-button v-else size="small" @click="showSkillInput">
            <el-icon><Plus /></el-icon> 添加
          </el-button>
        </div>
      </el-card>

      <!-- 联系方式 -->
      <el-card class="form-card">
        <template #header>
          <span>联系方式</span>
        </template>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="GitHub">
              <el-input v-model="form.github_url" placeholder="https://github.com/用户名" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="邮箱">
              <el-input v-model="form.email" placeholder="your@email.com" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="QQ">
              <el-input v-model="form.qq" placeholder="QQ号码" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="微信">
              <el-input v-model="form.wechat" placeholder="微信号" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-card>

      <!-- GitHub同步 -->
      <el-card class="form-card">
        <template #header>
          <span>GitHub同步</span>
        </template>

        <el-form-item label="自动同步">
          <el-switch
            v-model="form.auto_sync_github"
            active-text="开启"
            inactive-text="关闭"
          />
          <span class="form-tip">开启后每小时自动检查GitHub仓库更新</span>
        </el-form-item>

        <el-form-item label="仓库地址">
          <el-input v-model="form.github_repo" placeholder="如：zy2270561173/muyunapi" />
        </el-form-item>

        <el-form-item>
          <el-button type="success" @click="syncGitHub" :loading="syncing">
            <el-icon><Refresh /></el-icon>
            手动同步GitHub
          </el-button>
        </el-form-item>
      </el-card>

      <!-- 同步记录 -->
      <el-card class="form-card" v-if="syncLogs.length > 0">
        <template #header>
          <div class="card-header">
            <span>同步记录</span>
            <el-button type="primary" text size="small" @click="loadSyncLogs">
              <el-icon><Refresh /></el-icon> 刷新
            </el-button>
          </div>
        </template>
        <el-table :data="syncLogs" size="small" max-height="300">
          <el-table-column prop="commit_hash" label="Commit" width="100">
            <template #default="{ row }">
              <code>{{ row.commit_hash.substring(0, 7) }}</code>
            </template>
          </el-table-column>
          <el-table-column prop="commit_message" label="提交信息" show-overflow-tooltip />
          <el-table-column prop="commit_author" label="作者" width="120" />
          <el-table-column prop="commit_date" label="日期" width="160">
            <template #default="{ row }">
              {{ formatDate(row.commit_date) }}
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </el-form>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Delete, Refresh, Rank, Edit } from '@element-plus/icons-vue'
import { adminApi } from '../../api'
import { VueDraggable } from 'vue-draggable-plus'

const loading = ref(false)
const saving = ref(false)
const syncing = ref(false)
const inputVisible = ref(false)
const inputValue = ref('')
const skillInputRef = ref(null)

// 时间线类型
const timelineTypes = ref([])
const typeDialogVisible = ref(false)
const typeSaving = ref(false)
const editingType = ref(null)
const typeForm = reactive({
  type_key: '',
  label: '',
  icon: 'Clock',
  color: '#409eff',
  tag_type: 'default',
  sort_order: 0
})

// 默认时间线数据
const defaultTimeline = [
  {
    id: 'default-1',
    type: 'current',
    date: '现在',
    status: '进行中',
    title: '学校后勤老师',
    description: '在某学校担任后勤老师，负责学校基础设施维护与技术支持工作',
    tags: [],
    showTagInput: false,
    newTag: ''
  },
  {
    id: 'default-2',
    type: 'project',
    date: '2024年',
    status: '开源项目',
    title: 'MuYunAPI 开源项目',
    description: '开发并开源了全栈API聚合管理平台，支持内置接口、外部代理、多版本管理、主题切换等功能',
    tags: ['全栈开发', 'Vue3', 'Node.js'],
    showTagInput: false,
    newTag: ''
  },
  {
    id: 'default-3',
    type: 'graduate',
    date: '2025年6月',
    status: '毕业',
    title: '顺利毕业',
    description: '完成计算机网络技术专业学习，获得毕业证书',
    tags: [],
    showTagInput: false,
    newTag: ''
  },
  {
    id: 'default-4',
    type: 'club',
    date: '在校期间',
    status: '社团创始人',
    title: '创立计算机维修社团',
    description: '在校期间创立计算机维修社团，带领团队为各班级和其他社团提供电脑维修服务，积累了丰富的实践经验',
    tags: ['社团创始人', '技术服务', '团队管理'],
    showTagInput: false,
    newTag: ''
  },
  {
    id: 'default-5',
    type: 'school',
    date: '2022年9月',
    status: '入学',
    title: '就读普宁职业技术学校',
    description: '计算机网络技术专业 | 招生代码：8800587',
    tags: [],
    showTagInput: false,
    newTag: ''
  }
]

const form = reactive({
  is_enabled: true,
  name: '',
  avatar: '',
  school_name: '普宁职业技术学校',
  school_code: '8800587',
  major: '计算机网络技术',
  class_name: '',
  bio: '',
  skills: [],
  github_url: 'https://github.com/zy2270561173/muyunapi',
  email: '',
  qq: '',
  wechat: '',
  timeline: [...defaultTimeline.map(item => ({ ...item, tags: [...item.tags] }))],
  auto_sync_github: true,
  github_repo: 'zy2270561173/muyunapi'
})

const syncLogs = ref([])

async function loadConfig() {
  loading.value = true
  try {
    const res = await adminApi.getAboutConfig()
    if (res.code === 200) {
      // 处理开关
      form.is_enabled = res.data.is_enabled === 1 || res.data.is_enabled === true
      form.name = res.data.name || ''
      form.avatar = res.data.avatar || ''
      form.school_name = res.data.school_name || '普宁职业技术学校'
      form.school_code = res.data.school_code || '8800587'
      form.major = res.data.major || '计算机网络技术'
      form.class_name = res.data.class_name || ''
      form.bio = res.data.bio || ''
      form.skills = res.data.skills || []
      form.github_url = res.data.github_url || 'https://github.com/zy2270561173/muyunapi'
      form.email = res.data.email || ''
      form.qq = res.data.qq || ''
      form.wechat = res.data.wechat || ''
      form.auto_sync_github = res.data.auto_sync_github === 1 || res.data.auto_sync_github === true
      form.github_repo = res.data.github_repo || 'zy2270561173/muyunapi'
      
      // 处理时间线
      if (res.data.timeline && res.data.timeline.length > 0) {
        form.timeline = res.data.timeline.map(item => ({
          ...item,
          tags: item.tags || [],
          showTagInput: false,
          newTag: ''
        }))
      } else {
        form.timeline = [...defaultTimeline.map(item => ({ ...item, tags: [...item.tags] }))]
      }
    }
  } catch (e) {
    console.error('加载配置失败:', e)
  } finally {
    loading.value = false
  }
}

async function saveConfig() {
  saving.value = true
  try {
    // 清理时间线数据中的临时字段
    const timelineData = form.timeline.map(item => ({
      type: item.type,
      date: item.date,
      status: item.status,
      title: item.title,
      description: item.description,
      tags: item.tags
    }))

    const res = await adminApi.updateAboutConfig({
      ...form,
      timeline: timelineData
    })
    if (res.code === 200) {
      ElMessage.success('配置已保存')
    } else {
      ElMessage.error(res.message)
    }
  } catch (e) {
    ElMessage.error('保存失败')
  } finally {
    saving.value = false
  }
}

function handleSwitchChange(value) {
  console.log('页面开关:', value)
  // 立即保存开关状态
  saveConfig()
}

async function syncGitHub() {
  syncing.value = true
  try {
    const res = await adminApi.syncGitHub()
    if (res.code === 200) {
      ElMessage.success(res.data?.message || '同步完成')
      loadSyncLogs()
    } else {
      ElMessage.error(res.message)
    }
  } catch (e) {
    ElMessage.error('同步失败')
  } finally {
    syncing.value = false
  }
}

async function loadSyncLogs() {
  try {
    const res = await adminApi.getSyncLogs()
    if (res.code === 200) {
      syncLogs.value = res.data
    }
  } catch (e) {
    console.error('加载同步记录失败:', e)
  }
}

function previewPage() {
  window.open('/about', '_blank')
}

// 技能相关
function showSkillInput() {
  inputVisible.value = true
  nextTick(() => {
    skillInputRef.value?.focus()
  })
}

function addSkill() {
  if (inputValue.value) {
    form.skills.push(inputValue.value)
    inputValue.value = ''
  }
  inputVisible.value = false
}

function removeSkill(index) {
  form.skills.splice(index, 1)
}

// 时间线相关
function generateId() {
  return Date.now() + Math.random().toString(36).substr(2, 9)
}

function addTimelineItem() {
  form.timeline.push({
    id: generateId(),
    type: 'school',
    date: '',
    status: '',
    title: '',
    description: '',
    tags: [],
    showTagInput: false,
    newTag: ''
  })
}

function removeTimelineItem(index) {
  form.timeline.splice(index, 1)
}

// 获取类型标签样式
function getTypeTagType(typeKey) {
  const type = timelineTypes.value.find(t => t.type_key === typeKey)
  return type?.tag_type || 'default'
}

// 获取类型显示名称
function getTypeLabel(typeKey) {
  const type = timelineTypes.value.find(t => t.type_key === typeKey)
  return type?.label || typeKey
}

// 获取类型颜色
function getTypeColor(typeKey) {
  const type = timelineTypes.value.find(t => t.type_key === typeKey)
  return type?.color || '#409eff'
}

// 获取类型图标
function getTypeIcon(typeKey) {
  const type = timelineTypes.value.find(t => t.type_key === typeKey)
  return type?.icon || 'Clock'
}

function showTimelineTagInput(index) {
  form.timeline[index].showTagInput = true
  form.timeline[index].newTag = ''
}

function addTimelineTag(index) {
  if (form.timeline[index].newTag) {
    form.timeline[index].tags.push(form.timeline[index].newTag)
  }
  form.timeline[index].showTagInput = false
  form.timeline[index].newTag = ''
}

function removeTimelineTag(index, tagIndex) {
  form.timeline[index].tags.splice(tagIndex, 1)
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleString('zh-CN')
}

onMounted(() => {
  loadConfig()
  loadSyncLogs()
  loadTypes()
})

// 加载时间线类型
async function loadTypes() {
  try {
    const res = await adminApi.getTimelineTypes()
    if (res.code === 200) {
      timelineTypes.value = res.data
    }
  } catch (e) {
    console.error('加载时间线类型失败:', e)
  }
}

// 打开类型对话框
function openTypeDialog(type = null) {
  editingType.value = type
  if (type) {
    typeForm.type_key = type.type_key
    typeForm.label = type.label
    typeForm.icon = type.icon
    typeForm.color = type.color
    typeForm.tag_type = type.tag_type
    typeForm.sort_order = type.sort_order
  } else {
    typeForm.type_key = ''
    typeForm.label = ''
    typeForm.icon = 'Clock'
    typeForm.color = '#409eff'
    typeForm.tag_type = 'default'
    typeForm.sort_order = 0
  }
  typeDialogVisible.value = true
}

// 保存类型
async function saveType() {
  if (!typeForm.type_key || !typeForm.label) {
    ElMessage.warning('类型键和名称不能为空')
    return
  }

  typeSaving.value = true
  try {
    let res
    if (editingType.value) {
      res = await adminApi.updateTimelineType(editingType.value.id, { ...typeForm })
    } else {
      res = await adminApi.createTimelineType({ ...typeForm })
    }

    if (res.code === 200) {
      ElMessage.success(editingType.value ? '更新成功' : '创建成功')
      typeDialogVisible.value = false
      loadTypes()
    } else {
      ElMessage.error(res.message)
    }
  } catch (e) {
    ElMessage.error('保存失败')
  } finally {
    typeSaving.value = false
  }
}

// 删除类型
async function deleteType(type) {
  try {
    await ElMessageBox.confirm(`确定删除类型"${type.label}"吗？`, '提示', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning'
    })

    const res = await adminApi.deleteTimelineType(type.id)
    if (res.code === 200) {
      ElMessage.success('删除成功')
      loadTypes()
    } else {
      ElMessage.error(res.message)
    }
  } catch (e) {
    if (e !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}
</script>

<style lang="scss" scoped>
.manager-page {
  padding: 20px;
  max-width: 900px;
  margin: 0 auto;
}

.manager-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;

  h2 {
    font-size: 20px;
    font-weight: 700;
    margin: 0;
  }
}

.header-actions {
  display: flex;
  gap: 12px;
}

.switch-card {
  margin-bottom: 20px;
  background: var(--bg-card);
  border: 1px solid var(--border);
}

.switch-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;

  .switch-info {
    h3 {
      margin: 0 0 4px;
      font-size: 16px;
      font-weight: 600;
      color: var(--text-primary);
    }
    p {
      margin: 0;
      font-size: 13px;
      color: var(--text-secondary);
    }
  }
}

.form-card {
  margin-bottom: 20px;
  background: var(--bg-card);
  border: 1px solid var(--border);

  :deep(.el-card__header) {
    background: var(--bg-card2);
    border-bottom: 1px solid var(--border);
    font-weight: 600;
  }

  :deep(.el-form-item) {
    margin-bottom: 16px;
  }

  :deep(.el-form-item__label) {
    color: var(--text-secondary);
  }
}

.form-tip {
  margin-left: 12px;
  color: var(--text-muted);
  font-size: 12px;
}

.skills-input {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;

  .skill-tag {
    margin-right: 0;
  }
}

.timeline-editor {
  :deep(.vue-draggable) {
    min-height: 20px;
  }

  .timeline-item-editor {
    padding: 16px;
    margin-bottom: 12px;
    background: var(--bg-card2);
    border: 1px solid var(--border);
    border-radius: 8px;
    transition: all 0.2s;

    &:hover {
      border-color: var(--primary);
    }

    &:last-child {
      margin-bottom: 0;
    }
  }

  .add-timeline-btn {
    width: 100%;
    margin-top: 12px;
  }
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

// 拖拽样式
.timeline-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;

  .timeline-left {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .drag-handle {
    cursor: grab;
    color: var(--text-muted);
    font-size: 16px;
    padding: 4px;
    border-radius: 4px;
    transition: all 0.2s;

    &:hover {
      color: var(--primary);
      background: var(--bg-card);
    }

    &:active {
      cursor: grabbing;
    }
  }

  .timeline-index {
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--primary);
    color: #fff;
    border-radius: 50%;
    font-size: 12px;
    font-weight: 600;
  }
}

// 拖拽时的幽灵元素样式
.ghost-item {
  opacity: 0.5;
  background: var(--primary) !important;
  border-color: var(--primary) !important;
}
</style>
