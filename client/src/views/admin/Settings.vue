<template>
  <div class="settings-page">
    <h2 style="font-size:20px;font-weight:700;color:var(--text-primary);margin-bottom:24px">系统设置</h2>
    
    <div v-loading="loading">
      <!-- 站点基本配置 -->
      <div class="settings-section">
        <div class="section-title">🌐 站点信息</div>
        <div class="settings-form">
          <el-row :gutter="20">
            <el-col :span="12">
              <div class="field-item">
                <label>站点名称</label>
                <el-input v-model="configs.site_name" />
              </div>
            </el-col>
            <el-col :span="12">
              <div class="field-item">
                <label>ICP备案号</label>
                <el-input v-model="configs.icp" placeholder="京ICP备xxxxxxxx号" />
              </div>
            </el-col>
          </el-row>
          <div class="field-item">
            <label>站点描述</label>
            <el-input v-model="configs.site_description" />
          </div>
          <div class="field-item">
            <label>站点关键词</label>
            <el-input v-model="configs.site_keywords" placeholder="API,接口,开放平台" />
          </div>
        </div>
      </div>

      <!-- SMTP邮件配置 -->
      <div class="settings-section">
        <div class="section-title">📧 邮件服务（SMTP）</div>
        <p class="section-desc">QQ邮箱：需要在QQ邮箱设置中开启SMTP服务，获取授权码（非登录密码）</p>
        <div class="settings-form">
          <el-row :gutter="20">
            <el-col :span="14">
              <div class="field-item">
                <label>SMTP服务器</label>
                <el-input v-model="configs.smtp_host" placeholder="smtp.qq.com" />
              </div>
            </el-col>
            <el-col :span="10">
              <div class="field-item">
                <label>SMTP端口</label>
                <el-input v-model="configs.smtp_port" placeholder="465" />
              </div>
            </el-col>
          </el-row>
          <el-row :gutter="20">
            <el-col :span="12">
              <div class="field-item">
                <label>发件人邮箱</label>
                <el-input v-model="configs.smtp_user" placeholder="xxx@qq.com" />
              </div>
            </el-col>
            <el-col :span="12">
              <div class="field-item">
                <label>SMTP密码/授权码</label>
                <el-input v-model="configs.smtp_pass" type="password" show-password placeholder="QQ邮箱授权码" />
              </div>
            </el-col>
          </el-row>
          <div class="field-item">
            <label>发件人显示名称邮箱</label>
            <el-input v-model="configs.smtp_from" placeholder="留空则同发件人邮箱" />
          </div>
          <el-button plain @click="testSmtp" :loading="testingSmtp">发送测试邮件验证配置</el-button>
        </div>
      </div>

      <!-- 注册与安全 -->
      <div class="settings-section">
        <div class="section-title">🛡 注册与安全</div>
        <div class="settings-form">
          <div class="toggle-item">
            <div>
              <div class="toggle-label">允许注册</div>
              <div class="toggle-desc">关闭后新用户将无法注册账号</div>
            </div>
            <el-switch v-model="configs.allow_register" active-value="1" inactive-value="0" />
          </div>
          <div class="toggle-item">
            <div>
              <div class="toggle-label">邮箱验证码注册</div>
              <div class="toggle-desc">开启后注册必须验证邮箱（需配置SMTP）</div>
            </div>
            <el-switch v-model="configs.require_email_verify" active-value="1" inactive-value="0" />
          </div>
          <div class="toggle-item">
            <div>
              <div class="toggle-label">开启友链</div>
              <div class="toggle-desc">开启后在页脚显示友链链接，可在「友链管理」中配置</div>
            </div>
            <el-switch v-model="configs.friendship_enabled" active-value="1" inactive-value="0" />
          </div>
          <el-row :gutter="20">
            <el-col :span="12">
              <div class="field-item">
                <label>每分钟API调用限制（全局）</label>
                <el-input-number v-model.number="configs.api_rate_limit" :min="1" :max="10000" style="width:100%" />
              </div>
            </el-col>
            <el-col :span="12">
              <div class="field-item">
                <label>免费用户每日调用限制</label>
                <el-input-number v-model.number="configs.free_daily_limit" :min="1" :max="100000" style="width:100%" />
              </div>
            </el-col>
          </el-row>
        </div>
      </div>

      <!-- 页面显示设置 -->
      <div class="settings-section">
        <div class="section-title">🎨 页面显示</div>
        <div class="settings-form">
          <div class="toggle-item">
            <div>
              <div class="toggle-label">页脚运行时间</div>
              <div class="toggle-desc">开启后在页脚显示本站已运行时间（年/月/天/时/分/秒，实时刷新）</div>
            </div>
            <el-switch v-model="configs.footer_time_enabled" active-value="1" inactive-value="0" />
          </div>
          <div class="field-item">
            <label>运行时间风格</label>
            <el-select v-model="configs.footer_time_style" style="width:100%">
              <el-option label="运行了（本站已运行了 X年X月X天...）" value="running" />
              <el-option label="穿越了（本站已穿越了 X年X月X天...）" value="time_travel" />
              <el-option label="稳定运行了（本站已稳定运行了 X年...）" value="stable" />
            </el-select>
          </div>
          <div class="field-item">
            <label>站点上线日期</label>
            <el-date-picker
              v-model="siteStartDate"
              type="date"
              format="YYYY-MM-DD"
              value-format="YYYY-MM-DD"
              placeholder="选择站点上线日期"
              style="width:100%"
            />
          </div>
        </div>
      </div>

      <el-button type="primary" size="large" @click="saveAll" :loading="saving" style="min-width:140px">
        <el-icon><Check /></el-icon> 保存所有设置
      </el-button>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { adminApi } from '../../api'
import http from '../../api/http'

const configs = reactive({})
const loading = ref(true)
const saving = ref(false)
const testingSmtp = ref(false)
const siteStartDate = ref(null)

async function load() {
  loading.value = true
  const res = await adminApi.getConfigs()
  if (res.code === 200) {
    Object.entries(res.data).forEach(([k, v]) => { configs[k] = v.value })
  }
  // 将 site_start_date 字符串转为 Date 对象供日期选择器使用
  if (configs.site_start_date) {
    siteStartDate.value = new Date(configs.site_start_date + 'T00:00:00')
  }
  loading.value = false
}

async function saveAll() {
  saving.value = true
  // 将日期对象转回字符串
  if (siteStartDate.value) {
    const d = new Date(siteStartDate.value)
    configs.site_start_date = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
  } else {
    configs.site_start_date = ''
  }
  const res = await adminApi.saveConfigs(configs)
  if (res.code === 200) ElMessage.success('设置已保存')
  else ElMessage.error(res.message)
  saving.value = false
}

async function testSmtp() {
  if (!configs.smtp_user) return ElMessage.warning('请先填写SMTP配置')
  testingSmtp.value = true
  try {
    const res = await http.post('/admin/test-smtp', { email: configs.smtp_user })
    ElMessage.success(res.message || '测试邮件已发送，请检查邮箱')
  } catch (e) {
    ElMessage.error('发送失败：' + e.message)
  } finally { testingSmtp.value = false }
}

onMounted(load)
</script>

<style lang="scss" scoped>
.settings-page { max-width: 900px; }

.settings-section {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 24px;
  margin-bottom: 20px;
}
.section-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border);
}
.section-desc { font-size: 13px; color: var(--text-muted); margin-bottom: 16px; }
.settings-form { display: flex; flex-direction: column; gap: 16px; }

.field-item {
  label { display: block; font-size: 13px; color: var(--text-secondary); margin-bottom: 8px; font-weight: 500; }
}

.toggle-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px;
  background: var(--bg-card2);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  
  .toggle-label { font-size: 14px; color: var(--text-primary); font-weight: 500; margin-bottom: 4px; }
  .toggle-desc { font-size: 12px; color: var(--text-muted); }
}
</style>
