import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { builtInThemes, getThemeCssVars, validateTheme } from '../themes'

const STORAGE_KEY = 'muyunapi_theme'
const CUSTOM_THEMES_KEY = 'muyunapi_custom_themes'

export const useThemeStore = defineStore('theme', () => {
  // 状态
  const currentThemeId = ref(localStorage.getItem(STORAGE_KEY) || 'default-dark')
  const customThemes = ref(JSON.parse(localStorage.getItem(CUSTOM_THEMES_KEY) || '[]') || [])

  // 计算属性
  const currentTheme = computed(() => {
    // 先从自定义主题查找
    const custom = customThemes.value.find(t => t.id === currentThemeId.value)
    if (custom) return custom

    // 再从内置主题查找
    const builtIn = builtInThemes.find(t => t.id === currentThemeId.value)
    if (builtIn) return builtIn

    // 默认返回暗色主题
    return builtInThemes[0]
  })

  const allThemes = computed(() => {
    return [...builtInThemes, ...customThemes.value]
  })

  const builtInThemesList = computed(() => builtInThemes)

  const isDark = computed(() => currentTheme.value?.type === 'dark')

  // 应用主题到DOM
  function applyTheme(theme) {
    if (!theme || !theme.cssVars) return

    const root = document.documentElement
    Object.entries(theme.cssVars).forEach(([key, value]) => {
      root.style.setProperty(key, value)
    })
  }

  // 切换主题
  function setTheme(themeId) {
    if (!themeId) return

    // 验证主题是否存在
    const theme = builtInThemes.find(t => t.id === themeId) ||
                  customThemes.value.find(t => t.id === themeId)

    if (!theme) {
      console.warn(`Theme ${themeId} not found, using default`)
      themeId = 'default-dark'
    }

    currentThemeId.value = themeId
    localStorage.setItem(STORAGE_KEY, themeId)
    applyTheme(theme || builtInThemes[0])
  }

  // 保存自定义主题
  function saveCustomTheme(theme) {
    if (!validateTheme(theme)) {
      throw new Error('Invalid theme configuration')
    }

    // 确保有ID
    if (!theme.id) {
      theme.id = 'custom_' + Date.now()
    }

    theme.isBuiltIn = false

    // 更新或添加
    const index = customThemes.value.findIndex(t => t.id === theme.id)
    if (index >= 0) {
      customThemes.value[index] = theme
    } else {
      customThemes.value.push(theme)
    }

    // 保存到localStorage
    localStorage.setItem(CUSTOM_THEMES_KEY, JSON.stringify(customThemes.value))

    return theme
  }

  // 删除自定义主题
  function deleteCustomTheme(themeId) {
    const index = customThemes.value.findIndex(t => t.id === themeId)
    if (index >= 0) {
      customThemes.value.splice(index, 1)
      localStorage.setItem(CUSTOM_THEMES_KEY, JSON.stringify(customThemes.value))

      // 如果删除的是当前主题，切换到默认
      if (currentThemeId.value === themeId) {
        setTheme('default-dark')
      }
      return true
    }
    return false
  }

  // 导出主题为JSON
  function exportTheme(themeId) {
    const theme = builtInThemes.find(t => t.id === themeId) ||
                  customThemes.value.find(t => t.id === themeId)

    if (!theme) return null

    return JSON.stringify(theme, null, 2)
  }

  // 导入主题
  function importTheme(jsonStr) {
    try {
      const theme = JSON.parse(jsonStr)
      return saveCustomTheme(theme)
    } catch (e) {
      throw new Error('Invalid theme JSON')
    }
  }

  // 初始化主题
  function initTheme() {
    const savedId = localStorage.getItem(STORAGE_KEY)
    const theme = builtInThemes.find(t => t.id === savedId) ||
                  customThemes.value.find(t => t.id === savedId) ||
                  builtInThemes[0]

    currentThemeId.value = theme.id
    applyTheme(theme)
  }

  // 监听主题变化，自动应用
  watch(currentTheme, (newTheme) => {
    applyTheme(newTheme)
  }, { deep: true })

  return {
    // 状态
    currentThemeId,
    customThemes,
    // 计算属性
    currentTheme,
    allThemes,
    builtInThemesList,
    isDark,
    // 方法
    setTheme,
    saveCustomTheme,
    deleteCustomTheme,
    exportTheme,
    importTheme,
    initTheme,
    applyTheme,
  }
})
