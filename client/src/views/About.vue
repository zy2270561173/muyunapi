<template>
  <div class="about-page">
    <!-- 页面关闭提示 -->
    <div v-if="pageClosed" class="page-closed">
      <div class="closed-content">
        <el-icon class="closed-icon"><Warning /></el-icon>
        <h2>关于我页面已关闭</h2>
        <p>该页面暂时不可用</p>
        <el-button type="primary" @click="$router.push('/')">返回首页</el-button>
      </div>
    </div>

    <div v-else class="about-container">
      <!-- 顶部个人简介卡片 -->
      <div class="profile-card">
        <div class="profile-avatar">
          <el-avatar :size="100" :src="aboutData.avatar || defaultAvatar" />
          <div class="status-dot" title="在线"></div>
        </div>
        <div class="profile-info">
          <h1 class="profile-name">{{ aboutData.name || '开发者' }}</h1>
          <p class="profile-bio">{{ aboutData.bio || '热爱技术的全栈开发者' }}</p>
          <div class="profile-tags">
            <el-tag size="small" effect="plain">全栈开发</el-tag>
            <el-tag size="small" effect="plain">开源爱好者</el-tag>
            <el-tag size="small" effect="plain">教育工作者</el-tag>
          </div>
        </div>
      </div>

      <!-- 时间线经历 -->
      <div class="timeline-section" v-if="aboutData.timeline && aboutData.timeline.length > 0">
        <h2 class="section-title">
          <el-icon><Clock /></el-icon>
          我的经历
        </h2>
        
        <div class="timeline">
          <div
            v-for="(item, index) in aboutData.timeline"
            :key="index"
            class="timeline-item"
          >
            <div class="timeline-marker" :style="{ background: getTypeColor(item.type), borderColor: getTypeColor(item.type) }">
              <el-icon>
                <component :is="getTimelineIcon(item.type)" />
              </el-icon>
            </div>
            <div class="timeline-content">
              <div class="timeline-header">
                <span class="timeline-date">{{ item.date }}</span>
                <el-tag v-if="item.status" :type="getTypeTagType(item.type)" size="small">
                  {{ item.status }}
                </el-tag>
              </div>
              <h3 class="timeline-title">{{ item.title }}</h3>
              <p class="timeline-desc">{{ item.description }}</p>
              
              <!-- GitHub链接（项目类型） -->
              <a
                v-if="item.type === 'project' && aboutData.github_url"
                :href="aboutData.github_url"
                target="_blank"
                class="github-link"
              >
                <el-icon><svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg></el-icon>
                <span>查看 GitHub 仓库</span>
                <el-icon><ArrowRight /></el-icon>
              </a>

              <!-- 成就标签 -->
              <div class="achievement-tags" v-if="item.tags && item.tags.length > 0">
                <el-tag
                  v-for="tag in item.tags"
                  :key="tag"
                  size="small"
                  effect="light"
                >
                  {{ tag }}
                </el-tag>
              </div>

              <!-- 学校详情 -->
              <div class="school-detail" v-if="item.type === 'school'">
                <el-icon><Location /></el-icon>
                <span>广东省普宁市</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 技能展示 -->
      <div class="skills-section" v-if="aboutData.skills && aboutData.skills.length > 0">
        <h2 class="section-title">
          <el-icon><Star /></el-icon>
          技能专长
        </h2>
        <div class="skills-grid">
          <div v-for="skill in aboutData.skills" :key="skill" class="skill-item">
            <div class="skill-icon">
              <el-icon><Check /></el-icon>
            </div>
            <span class="skill-name">{{ skill }}</span>
          </div>
        </div>
      </div>

      <!-- 联系方式 -->
      <div class="contact-section" v-if="hasContact">
        <h2 class="section-title">
          <el-icon><Message /></el-icon>
          联系我
        </h2>
        <div class="contact-grid">
          <a v-if="aboutData.email" :href="`mailto:${aboutData.email}`" class="contact-card">
            <el-icon><Message /></el-icon>
            <span>{{ aboutData.email }}</span>
          </a>
          <div v-if="aboutData.qq" class="contact-card">
            <el-icon><ChatDotRound /></el-icon>
            <span>QQ: {{ aboutData.qq }}</span>
          </div>
          <div v-if="aboutData.wechat" class="contact-card">
            <el-icon><ChatLineRound /></el-icon>
            <span>微信: {{ aboutData.wechat }}</span>
          </div>
        </div>
      </div>

      <!-- 页脚 -->
      <div class="about-footer">
        <p>© {{ new Date().getFullYear() }} {{ aboutData.name || '开发者' }} · 用 ❤️ 构建</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, markRaw } from 'vue'
import axios from 'axios'
import {
  Clock,
  School,
  Star,
  Message,
  ChatDotRound,
  ChatLineRound,
  OfficeBuilding,
  Collection,
  Medal,
  UserFilled,
  Location,
  Check,
  ArrowRight,
  Warning,
  Trophy
} from '@element-plus/icons-vue'

const aboutData = ref({
  name: '',
  avatar: '',
  bio: '',
  skills: [],
  github_url: '',
  email: '',
  wechat: '',
  qq: '',
  timeline: []
})

const pageClosed = ref(false)
const defaultAvatar = 'https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png'

const hasContact = computed(() => {
  return aboutData.value.email || aboutData.value.qq || aboutData.value.wechat
})

// 时间线类型映射
const timelineTypes = ref([])
const iconComponents = {
  Clock: markRaw(Clock),
  School: markRaw(School),
  OfficeBuilding: markRaw(OfficeBuilding),
  Collection: markRaw(Collection),
  Medal: markRaw(Medal),
  UserFilled: markRaw(UserFilled),
  Star: markRaw(Star),
  Trophy: markRaw(Trophy)
}

function getTypeTagType(typeKey) {
  const type = timelineTypes.value.find(t => t.type_key === typeKey)
  return type?.tag_type || 'default'
}

function getTypeColor(typeKey) {
  const type = timelineTypes.value.find(t => t.type_key === typeKey)
  return type?.color || '#409eff'
}

function getTimelineIcon(typeKey) {
  const type = timelineTypes.value.find(t => t.type_key === typeKey)
  const iconName = type?.icon || 'Clock'
  return iconComponents[iconName] || markRaw(Clock)
}

async function loadTimelineTypes() {
  try {
    const res = await axios.get('/api/timeline-types')
    if (res.data.code === 200) {
      timelineTypes.value = res.data.data
    }
  } catch (e) {
    console.error('加载时间线类型失败:', e)
  }
}

async function loadAboutData() {
  try {
    const res = await axios.get('/api/about')
    if (res.data.code === 200) {
      pageClosed.value = false
      aboutData.value = { ...aboutData.value, ...res.data.data }
    } else if (res.data.code === 403) {
      pageClosed.value = true
    }
  } catch (e) {
    console.error('加载关于我数据失败:', e)
    pageClosed.value = true
  }
}

onMounted(async () => {
  await loadTimelineTypes()
  await loadAboutData()
})
</script>

<style lang="scss" scoped>
.about-page {
  min-height: 100vh;
  padding: 60px 20px;
  background: var(--bg-main);
}

.about-container {
  max-width: 800px;
  margin: 0 auto;
}

/* 页面关闭 */
.page-closed {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
}

.closed-content {
  text-align: center;
  padding: 40px;

  .closed-icon {
    font-size: 64px;
    color: var(--text-muted);
    margin-bottom: 20px;
  }

  h2 {
    font-size: 24px;
    color: var(--text-primary);
    margin: 0 0 12px;
  }

  p {
    font-size: 14px;
    color: var(--text-secondary);
    margin: 0 0 24px;
  }
}

/* 顶部个人简介卡片 */
.profile-card {
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 32px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 16px;
  margin-bottom: 40px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.profile-avatar {
  position: relative;
  flex-shrink: 0;

  .status-dot {
    position: absolute;
    bottom: 4px;
    right: 4px;
    width: 16px;
    height: 16px;
    background: #67c23a;
    border: 3px solid var(--bg-card);
    border-radius: 50%;
  }
}

.profile-info {
  flex: 1;

  .profile-name {
    font-size: 28px;
    font-weight: 700;
    color: var(--text-primary);
    margin: 0 0 8px;
  }

  .profile-bio {
    font-size: 15px;
    color: var(--text-secondary);
    margin: 0 0 16px;
    line-height: 1.5;
  }

  .profile-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
}

/* 章节标题 */
.section-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 24px;
  padding-bottom: 12px;
  border-bottom: 2px solid var(--border);

  .el-icon {
    color: var(--primary);
    font-size: 22px;
  }
}

/* 时间线 */
.timeline-section {
  margin-bottom: 40px;
}

.timeline {
  position: relative;
  padding-left: 32px;

  &::before {
    content: '';
    position: absolute;
    left: 20px;
    top: 0;
    bottom: 0;
    width: 2px;
    background: linear-gradient(to bottom, var(--primary), var(--border));
  }
}

.timeline-item {
  position: relative;
  margin-bottom: 32px;

  &:last-child {
    margin-bottom: 0;
  }
}

.timeline-marker {
  position: absolute;
  left: -32px;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-card);
  border: 2px solid var(--border);
  color: #fff;
  font-size: 18px;
  z-index: 1;
}

.timeline-content {
  padding: 20px 24px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 12px;
  transition: all 0.3s ease;

  &:hover {
    border-color: var(--primary);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
}

.timeline-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.timeline-date {
  font-size: 14px;
  font-weight: 600;
  color: var(--primary);
}

.timeline-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 8px;
}

.timeline-desc {
  font-size: 14px;
  color: var(--text-secondary);
  margin: 0 0 12px;
  line-height: 1.6;
}

.github-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: var(--bg-card2);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text-primary);
  text-decoration: none;
  font-size: 14px;
  transition: all 0.3s ease;

  &:hover {
    background: var(--primary);
    border-color: var(--primary);
    color: #fff;
  }
}

.achievement-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

.school-detail {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 12px;
  font-size: 13px;
  color: var(--text-secondary);

  .el-icon {
    color: var(--primary);
  }
}

/* 技能展示 */
.skills-section {
  margin-bottom: 40px;
}

.skills-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 12px;
}

.skill-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 8px;
  transition: all 0.3s ease;

  &:hover {
    border-color: var(--primary);
    transform: translateY(-2px);
  }

  .skill-icon {
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(233, 147, 18, 0.1);
    border-radius: 6px;
    color: var(--primary);
  }

  .skill-name {
    font-size: 14px;
    color: var(--text-primary);
  }
}

/* 联系方式 */
.contact-section {
  margin-bottom: 40px;
}

.contact-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 16px;
}

.contact-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 12px;
  color: var(--text-primary);
  text-decoration: none;
  transition: all 0.3s ease;

  &:hover {
    border-color: var(--primary);
    background: var(--bg-card2);
  }

  .el-icon {
    font-size: 20px;
    color: var(--primary);
  }

  span {
    font-size: 14px;
  }
}

/* 页脚 */
.about-footer {
  text-align: center;
  padding: 32px;
  color: var(--text-secondary);
  font-size: 14px;
  border-top: 1px solid var(--border);
  margin-top: 20px;
}

/* 响应式 */
@media (max-width: 640px) {
  .about-page {
    padding: 30px 16px;
  }

  .profile-card {
    flex-direction: column;
    text-align: center;
    padding: 24px;
  }

  .profile-info .profile-tags {
    justify-content: center;
  }

  .timeline {
    padding-left: 24px;

    &::before {
      left: 12px;
    }
  }

  .timeline-marker {
    left: -24px;
    width: 32px;
    height: 32px;
    font-size: 14px;
  }

  .timeline-content {
    padding: 16px;
  }

  .skills-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
