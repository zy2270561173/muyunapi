import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useDeviceStore = defineStore('device', () => {
  const userAgent = ref(typeof navigator !== 'undefined' ? navigator.userAgent : '')

  // 仅基于 UA 识别移动设备
  const isMobile = computed(() => {
    const ua = userAgent.value
    return /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|Tablet/i.test(ua)
  })

  const isIOS = computed(() => /iPhone|iPad|iPod/i.test(userAgent.value))
  const isAndroid = computed(() => /Android/i.test(userAgent.value))
  const isTouchDevice = computed(() => {
    if (typeof window === 'undefined') return false
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0
  })

  return {
    isMobile,
    isIOS,
    isAndroid,
    isTouchDevice
  }
})
