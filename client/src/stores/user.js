import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { userApi } from '../api'

export const useUserStore = defineStore('user', () => {
  const token = ref(localStorage.getItem('token') || '')
  const userInfo = ref(JSON.parse(localStorage.getItem('user') || 'null') || null)

  const isLoggedIn = computed(() => !!token.value)
  const isAdmin = computed(() => userInfo.value?.role === 'admin')

  function setToken(t) {
    token.value = t
    localStorage.setItem('token', t)
  }

  function setUser(u) {
    userInfo.value = u
    localStorage.setItem('user', JSON.stringify(u))
  }

  function logout() {
    token.value = ''
    userInfo.value = null
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }

  async function fetchProfile() {
    try {
      const res = await userApi.getProfile()
      if (res.code === 200) {
        setUser(res.data)
        return res.data
      }
    } catch (e) {}
  }

  return { token, userInfo, isLoggedIn, isAdmin, setToken, setUser, logout, fetchProfile }
})
