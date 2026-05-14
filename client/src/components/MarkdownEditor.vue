<template>
  <div class="markdown-editor">
    <div class="editor-toolbar">
      <div class="toolbar-left">
        <el-button-group>
          <el-button size="small" @click="insertText('**', '**')" title="加粗">
            <el-icon><Document /></el-icon>B
          </el-button>
          <el-button size="small" @click="insertText('*', '*')" title="斜体">
            <el-icon><Document /></el-icon>I
          </el-button>
          <el-button size="small" @click="insertText('`', '`')" title="代码">
            <el-icon><Document /></el-icon>&lt;/&gt;
          </el-button>
          <el-button size="small" @click="insertText('[', '](url)')" title="链接">
            <el-icon><Link /></el-icon>
          </el-button>
        </el-button-group>
        <el-button-group style="margin-left: 8px;">
          <el-button size="small" @click="insertLine('- ')" title="列表">列表</el-button>
          <el-button size="small" @click="insertLine('1. ')" title="有序列表">有序</el-button>
          <el-button size="small" @click="insertLine('> ')" title="引用">引用</el-button>
          <el-button size="small" @click="insertLine('### ')" title="标题">H3</el-button>
        </el-button-group>
        <el-button size="small" style="margin-left: 8px;" @click="insertCodeBlock">代码块</el-button>
        <el-button size="small" @click="insertTable">表格</el-button>
      </div>
      <div class="toolbar-right">
        <el-radio-group v-model="viewMode" size="small">
          <el-radio-button label="edit">编辑</el-radio-button>
          <el-radio-button label="preview">预览</el-radio-button>
          <el-radio-button label="split">分栏</el-radio-button>
        </el-radio-group>
      </div>
    </div>
    <div class="editor-content" :class="viewMode">
      <div class="editor-pane" v-show="viewMode !== 'preview'">
        <textarea
          ref="textareaRef"
          v-model="localContent"
          @input="onInput"
          placeholder="请输入 Markdown 文档内容..."
        ></textarea>
      </div>
      <div class="preview-pane" v-show="viewMode !== 'edit'">
        <div class="markdown-body" v-html="renderedHtml"></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { Document, Link } from '@element-plus/icons-vue'

const props = defineProps({
  modelValue: { type: String, default: '' }
})
const emit = defineEmits(['update:modelValue'])

const textareaRef = ref(null)
const localContent = ref(props.modelValue || '')
const viewMode = ref('split')

// 简单的 Markdown 渲染器
function renderMarkdown(md) {
  if (!md) return ''
  
  let html = md
    // 转义HTML
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // 代码块
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>')
    // 行内代码
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // 标题
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    // 粗体和斜体
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    // 链接
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>')
    // 引用
    .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
    // 无序列表
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    // 有序列表
    .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
    // 分隔线
    .replace(/^---$/gm, '<hr>')
    // 段落
    .split('\n\n').map(p => {
      if (p.startsWith('<h') || p.startsWith('<pre') || p.startsWith('<blockquote') || p.startsWith('<li')) {
        return p
      }
      return `<p>${p.replace(/\n/g, '<br>')}</p>`
    }).join('')
  
  // 包装列表
  html = html.replace(/(<li>.*<\/li>)+/gs, '<ul>$&</ul>')
  
  return html
}

const renderedHtml = computed(() => renderMarkdown(localContent.value))

watch(() => props.modelValue, (val) => {
  localContent.value = val || ''
})

function onInput() {
  emit('update:modelValue', localContent.value)
}

function insertText(before, after) {
  const ta = textareaRef.value
  if (!ta) return
  const start = ta.selectionStart
  const end = ta.selectionEnd
  const selected = localContent.value.substring(start, end)
  const newText = before + selected + after
  localContent.value = localContent.value.substring(0, start) + newText + localContent.value.substring(end)
  emit('update:modelValue', localContent.value)
  // 恢复光标位置
  setTimeout(() => {
    ta.focus()
    ta.setSelectionRange(start + before.length, start + before.length + selected.length)
  }, 0)
}

function insertLine(prefix) {
  const ta = textareaRef.value
  if (!ta) return
  const start = ta.selectionStart
  // 找到当前行的开始位置
  const lineStart = localContent.value.lastIndexOf('\n', start - 1) + 1
  localContent.value = localContent.value.substring(0, lineStart) + prefix + localContent.value.substring(lineStart)
  emit('update:modelValue', localContent.value)
  setTimeout(() => {
    ta.focus()
    ta.setSelectionRange(lineStart + prefix.length, lineStart + prefix.length)
  }, 0)
}

function insertCodeBlock() {
  const ta = textareaRef.value
  if (!ta) return
  const start = ta.selectionStart
  const end = ta.selectionEnd
  const selected = localContent.value.substring(start, end)
  const codeBlock = '```\n' + (selected || 'code here') + '\n```'
  localContent.value = localContent.value.substring(0, start) + codeBlock + localContent.value.substring(end)
  emit('update:modelValue', localContent.value)
}

function insertTable() {
  const table = '| 列1 | 列2 | 列3 |\n|-----|-----|-----|\n| 数据 | 数据 | 数据 |'
  const ta = textareaRef.value
  if (!ta) return
  const start = ta.selectionStart
  localContent.value = localContent.value.substring(0, start) + table + localContent.value.substring(start)
  emit('update:modelValue', localContent.value)
}
</script>

<style lang="scss" scoped>
.markdown-editor {
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.editor-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: var(--bg-card2);
  border-bottom: 1px solid var(--border);
}

.editor-content {
  display: flex;
  height: 400px;
  
  &.edit .editor-pane { width: 100%; }
  &.preview .preview-pane { width: 100%; }
  &.split {
    .editor-pane, .preview-pane { width: 50%; }
  }
}

.editor-pane {
  textarea {
    width: 100%;
    height: 100%;
    padding: 16px;
    border: none;
    resize: none;
    font-family: 'Fira Code', 'Consolas', monospace;
    font-size: 14px;
    line-height: 1.6;
    background: var(--bg-card);
    color: var(--text-primary);
    outline: none;
    
    &::placeholder {
      color: var(--text-muted);
    }
  }
}

.preview-pane {
  padding: 16px;
  overflow: auto;
  border-left: 1px solid var(--border);
  background: var(--bg-card);
}

.markdown-body {
  font-size: 14px;
  line-height: 1.8;
  color: var(--text-primary);
  
  :deep(h1) { font-size: 24px; font-weight: 700; margin: 16px 0 12px; color: var(--primary); }
  :deep(h2) { font-size: 20px; font-weight: 600; margin: 14px 0 10px; }
  :deep(h3) { font-size: 16px; font-weight: 600; margin: 12px 0 8px; }
  :deep(p) { margin: 8px 0; }
  :deep(code) {
    background: rgba(233,147,18,0.1);
    padding: 2px 6px;
    border-radius: 4px;
    font-family: 'Fira Code', monospace;
    font-size: 13px;
  }
  :deep(pre) {
    background: rgba(0,0,0,0.05);
    padding: 12px;
    border-radius: 6px;
    overflow-x: auto;
    margin: 12px 0;
    code {
      background: none;
      padding: 0;
    }
  }
  :deep(blockquote) {
    border-left: 3px solid var(--primary);
    padding-left: 12px;
    margin: 12px 0;
    color: var(--text-secondary);
  }
  :deep(ul) { padding-left: 20px; margin: 8px 0; }
  :deep(li) { margin: 4px 0; }
  :deep(a) { color: var(--primary); text-decoration: none; &:hover { text-decoration: underline; } }
  :deep(hr) { border: none; border-top: 1px solid var(--border); margin: 16px 0; }
  :deep(table) {
    width: 100%;
    border-collapse: collapse;
    margin: 12px 0;
    th, td {
      border: 1px solid var(--border);
      padding: 8px 12px;
      text-align: left;
    }
    th { background: var(--bg-card2); }
  }
}
</style>
