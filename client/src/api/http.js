import axios from 'axios'
import { ElMessage } from 'element-plus'
import router from '../router'
import NProgress from 'nprogress'
import 'nprogress/nprogress.css'

NProgress.configure({ showSpinner: false })

const http = axios.create({
  baseURL: '/api',
  timeout: 15000,
})

http.interceptors.request.use(config => {
  NProgress.start()
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

http.interceptors.response.use(
  res => {
    NProgress.done()
    return res.data
  },
  err => {
    NProgress.done()
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      router.push('/login')
      ElMessage.error('登录已过期，请重新登录')
    } else if (err.response?.status === 429) {
      ElMessage.warning('请求过于频繁，请稍后再试')
    } else {
      ElMessage.error(err.response?.data?.message || '网络请求失败')
    }
    return Promise.reject(err)
  }
)

export default http
