<template>
  <div class="about-page">
    <div class="about-container">
      <!-- 头部 -->
      <div class="about-header">
        <div class="avatar-section">
          <el-avatar :size="120" :src="aboutData.avatar || defaultAvatar" />
          <h1 class="name">{{ aboutData.name }}</h1>
          <p class="title">{{ aboutData.bio }}</p>
        </div>
      </div>

      <!-- 学校信息卡片 -->
      <el-card class="info-card" shadow="hover">
        <template #header>
          <div class="card-header">
            <el-icon><School /></el-icon>
            <span>教育背景</span>
          </div>
        </template>
        <div class="school-info">
          <div class="info-item">
            <span class="label">学校名称：</span>
            <span class="value">{{ aboutData.school_name }}</span>
          </div>
          <div class="info-item">
            <span class="label">招生代码：</span>
            <el-tag type="primary" size="small">{{ aboutData.school_code }}</el-tag>
          </div>
          <div class="info-item">
            <span class="label">所学专业：</span>
            <span class="value">{{ aboutData.major }}</span>
          </div>
          <div class="info-item" v-if="aboutData.class_name">
            <span class="label">所在班级：</span>
            <span class="value">{{ aboutData.class_name }}</span>
          </div>
        </div>
      </el-card>

      <!-- 技能标签 -->
      <el-card class="info-card" shadow="hover" v-if="aboutData.skills && aboutData.skills.length > 0">
        <template #header>
          <div class="card-header">
            <el-icon><Star /></el-icon>
            <span>技能专长</span>
          </div>
        </template>
        <div class="skills-tags">
          <el-tag
            v-for="skill in aboutData.skills"
            :key="skill"
            type="success"
            effect="dark"
            class="skill-tag"
          >
            {{ skill }}
          </el-tag>
        </div>
      </el-card>

      <!-- 开源项目 -->
      <el-card class="info-card" shadow="hover">
        <template #header>
          <div class="card-header">
            <el-icon><Link /></el-icon>
            <span>开源项目</span>
          </div>
        </template>
        <div class="project-info">
          <div class="project-item" v-if="aboutData.github_url">
            <el-icon class="github-icon"><svg viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg></el-icon>
            <div class="project-detail">
              <h3>MuYunAPI</h3>
              <p>免费开源的全栈API聚合管理平台</p>
              <el-link :href="aboutData.github_url" target="_blank" type="primary">
                访问 GitHub 仓库 →
              </el-link>
            </div>
          </div>
        </div>
      </el-card>

      <!-- 更新日志 -->
      <el-card class="info-card" shadow="hover">
        <template #header>
          <div class="card-header">
            <el-icon><Clock /></el-icon>
            <span>更新日志</span>
          </div>
        </template>
        <el-timeline>
          <el-timeline-item
            v-for="(log, index) in aboutData.update_log"
            :key="index"
            :type="index === 0 ? 'primary' : ''"
            :timestamp="log.date"
          >
            <h4 class="version-title">{{ log.version }}</h4>
            <p class="version-content">{{ log.content }}</p>
          </el-timeline-item>
        </el-timeline>
      </el-card>

      <!-- 联系方式 -->
      <el-card class="info-card" shadow="hover" v-if="hasContact">
        <template #header>
          <div class="card-header">
            <el-icon><Message /></el-icon>
            <span>联系方式</span>
          </div>
        </template>
        <div class="contact-list">
          <div class="contact-item" v-if="aboutData.email">
            <el-icon><Message /></el-icon>
            <span>邮箱：{{ aboutData.email }}</span>
          </div>
          <div class="contact-item" v-if="aboutData.qq">
            <el-icon><ChatDotRound /></el-icon>
            <span>QQ：{{ aboutData.qq }}</span>
          </div>
          <div class="contact-item" v-if="aboutData.wechat">
            <el-icon><ChatLineRound /></el-icon>
            <span>微信：{{ aboutData.wechat }}</span>
          </div>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import {
  School,
  Star,
  Link,
  Clock,
  Message,
  ChatDotRound,
  ChatLineRound
} from '@element-plus/icons-vue'
import axios from 'axios'

const aboutData = ref({
  name: '开发者',
  avatar: '',
  school_name: '普宁职业技术学校',
  school_code: '8800587',
  major: '计算机网络技术',
  class_name: '',
  bio: '',
  skills: [],
  github_url: 'https://github.com/zy2270561173/muyunapi',
  email: '',
  wechat: '',
  qq: '',
  update_log: []
})

const defaultAvatar = 'https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png'

const hasContact = computed(() => {
  return aboutData.value.email || aboutData.value.qq || aboutData.value.wechat
})

async function loadAboutData() {
  try {
    const res = await axios.get('/api/about')
    if (res.data.code === 200) {
      aboutData.value = { ...aboutData.value, ...res.data.data }
    } else if (res.data.code === 403) {
      ElMessage.warning('关于我页面已关闭')
    } else {
      ElMessage.error(res.data.message || '加载失败')
    }
  } catch (e) {
    console.error('加载关于我数据失败:', e)
    ElMessage.error('加载失败')
  }
}

onMounted(() => {
  loadAboutData()
})
</script>

<style lang="scss" scoped>
.about-page {
  min-height: 100vh;
  padding: 40px 20px;
  background: var(--bg-main);
}

.about-container {
  max-width: 800px;
  margin: 0 auto;
}

.about-header {
  text-align: center;
  margin-bottom: 40px;

  .avatar-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;

    .name {
      font-size: 32px;
      font-weight: 700;
      color: var(--text-primary);
      margin: 0;
    }

    .title {
      font-size: 16px;
      color: var(--text-secondary);
      margin: 0;
    }
  }
}

.info-card {
  margin-bottom: 24px;
  background: var(--bg-card);
  border: 1px solid var(--border);

  :deep(.el-card__header) {
    background: var(--bg-card2);
    border-bottom: 1px solid var(--border);
  }
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);

  .el-icon {
    color: var(--primary);
  }
}

.school-info {
  .info-item {
    display: flex;
    align-items: center;
    padding: 12px 0;
    border-bottom: 1px solid var(--border);

    &:last-child {
      border-bottom: none;
    }

    .label {
      width: 100px;
      color: var(--text-secondary);
      font-size: 14px;
    }

    .value {
      flex: 1;
      color: var(--text-primary);
      font-size: 14px;
    }
  }
}

.skills-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;

  .skill-tag {
    font-size: 14px;
  }
}

.project-info {
  .project-item {
    display: flex;
    align-items: flex-start;
    gap: 16px;
    padding: 16px;
    background: var(--bg-card2);
    border-radius: var(--radius-sm);

    .github-icon {
      font-size: 48px;
      color: var(--text-primary);
    }

    .project-detail {
      flex: 1;

      h3 {
        margin: 0 0 8px;
        font-size: 18px;
        color: var(--text-primary);
      }

      p {
        margin: 0 0 12px;
        font-size: 14px;
        color: var(--text-secondary);
      }
    }
  }
}

.version-title {
  margin: 0 0 4px;
  font-size: 16px;
  font-weight: 600;
  color: var(--primary);
}

.version-content {
  margin: 0;
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.6;
}

.contact-list {
  .contact-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 0;
    border-bottom: 1px solid var(--border);

    &:last-child {
      border-bottom: none;
    }

    .el-icon {
      color: var(--primary);
      font-size: 18px;
    }

    span {
      color: var(--text-primary);
      font-size: 14px;
    }
  }
}
</style>