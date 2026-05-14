// 内置主题配置

export const builtInThemes = [
  {
    id: 'default-dark',
    name: '默认暗夜',
    type: 'dark',
    isBuiltIn: true,
    preview: '',
    description: '经典深色主题，橙色强调色',
    cssVars: {
      '--primary': '#e99312',
      '--primary-light': '#f5c842',
      '--primary-dark': '#c47d0a',
      '--bg-primary': '#0d0d1a',
      '--bg-main': '#0d0d1a',
      '--bg-card': '#12122a',
      '--bg-card2': '#1a1a35',
      '--bg-card3': '#1e1e3f',
      '--border': 'rgba(255,255,255,0.06)',
      '--border-active': 'rgba(233,147,18,0.4)',
      '--text-primary': '#f0f0f8',
      '--text-secondary': '#a0a0c0',
      '--text-muted': '#6060a0',
      '--success': '#67c23a',
      '--danger': '#f56c6c',
      '--info': '#409eff',
      '--warning': '#e99312',
      '--shadow-sm': '0 2px 12px rgba(0,0,0,0.3)',
      '--shadow-md': '0 8px 32px rgba(0,0,0,0.4)',
      '--shadow-lg': '0 16px 48px rgba(0,0,0,0.5)',
      '--glow': '0 0 24px rgba(233,147,18,0.15)',
      '--radius-sm': '8px',
      '--radius-md': '12px',
      '--radius-lg': '16px',
      '--radius-xl': '24px',
      '--code-bg': '#0a0a18',
      '--code-text': '#a8d8a8',
      '--code-header-bg': '#1a1a2e',
      '--code-header-border': '#2a2a4a',
      '--code-lang-text': '#8888aa',
      '--overlay-bg': 'rgba(13,13,26,0.8)',
      '--row-hover-bg': 'rgba(255,255,255,0.03)',
      '--btn-text': '#fff',
    }
  },
  {
    id: 'mint-light',
    name: '薄荷清风',
    type: 'light',
    isBuiltIn: true,
    preview: '',
    description: '简约薄荷绿，清爽现代风格',
    cssVars: {
      '--primary': '#00d9a5',
      '--primary-light': '#33e3b5',
      '--primary-dark': '#00b88a',
      '--bg-primary': '#f8fffe',
      '--bg-main': '#f8fffe',
      '--bg-card': '#ffffff',
      '--bg-card2': '#f0faf7',
      '--bg-card3': '#e6f5f0',
      '--border': 'rgba(0,0,0,0.08)',
      '--border-active': 'rgba(0,217,165,0.4)',
      '--text-primary': '#1a1a2e',
      '--text-secondary': '#4a5568',
      '--text-muted': '#718096',
      '--success': '#10b981',
      '--danger': '#ef4444',
      '--info': '#3b82f6',
      '--warning': '#f59e0b',
      '--shadow-sm': '0 2px 12px rgba(0,0,0,0.05)',
      '--shadow-md': '0 8px 32px rgba(0,0,0,0.08)',
      '--shadow-lg': '0 16px 48px rgba(0,0,0,0.1)',
      '--glow': '0 0 24px rgba(0,217,165,0.12)',
      '--radius-sm': '8px',
      '--radius-md': '12px',
      '--radius-lg': '16px',
      '--radius-xl': '24px',
      '--code-bg': '#f5f7f9',
      '--code-text': '#2d3748',
      '--code-header-bg': '#e8ecf0',
      '--code-header-border': '#d1d5db',
      '--code-lang-text': '#6b7280',
      '--overlay-bg': 'rgba(255,255,255,0.85)',
      '--row-hover-bg': 'rgba(0,0,0,0.04)',
      '--btn-text': '#fff',
    }
  }
]

// 获取主题CSS变量字符串
export function getThemeCssVars(cssVars) {
  const entries = Object.entries(cssVars)
  const lines = entries.map(([key, value]) => `  ${key}: ${value};`)
  return `:root {\n${lines.join('\n')}\n}`
}

// 验证主题配置
export function validateTheme(theme) {
  if (!theme.id || typeof theme.id !== 'string') return false
  if (!theme.name || typeof theme.name !== 'string') return false
  if (!theme.cssVars || typeof theme.cssVars !== 'object') return false
  // 检查必需的颜色变量
  const requiredVars = ['--primary', '--bg-main', '--bg-card', '--text-primary']
  for (const v of requiredVars) {
    if (!theme.cssVars[v]) return false
  }
  return true
}
