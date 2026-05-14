import http from './http'
export { http }

export const authApi = {
  sendCode: (data) => http.post('/auth/send-code', data),
  register: (data) => http.post('/auth/register', data),
  login: (data) => http.post('/auth/login', data),
  resetPassword: (data) => http.post('/auth/reset-password', data),
}

export const userApi = {
  getProfile: () => http.get('/user/profile'),
  updateProfile: (data) => http.put('/user/profile', data),
  uploadAvatar: (formData) => http.post('/user/avatar', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  changePassword: (data) => http.put('/user/password', data),
  regenerateKey: () => http.post('/user/regenerate-key'),
  getKeys: () => http.get('/user/keys'),
  createKey: (data) => http.post('/user/keys', data),
  deleteKey: (id) => http.delete(`/user/keys/${id}`),
  toggleKey: (id) => http.patch(`/user/keys/${id}/toggle`),
  getFavorites: () => http.get('/user/favorites'),
  getStats: () => http.get('/user/stats'),
}

export const apiApi = {
  getCategories: () => http.get('/apis/categories'),
  getList: (params) => http.get('/apis', { params }),
  getDetail: (slug) => http.get(`/apis/${slug}`),
  toggleFavorite: (id) => http.post(`/apis/${id}/favorite`),
  test: (slug, params) => http.post(`/apis/${slug}/test`, { params }),
  ping: (slug) => http.get(`/apis/${slug}/ping`),
  getExamples: (slug) => http.get(`/apis/${slug}/examples`),
}

export const adminApi = {
  getDashboard: () => http.get('/admin/dashboard'),
  // API管理
  getApis: (params) => http.get('/admin/apis', { params }),
  createApi: (data) => http.post('/admin/apis', data),
  updateApi: (id, data) => http.put(`/admin/apis/${id}`, data),
  deleteApi: (id) => http.delete(`/admin/apis/${id}`),
  hardDeleteApi: (id) => http.delete(`/admin/apis/${id}/hard`),
  // 分类管理
  getCategories: (params) => http.get('/admin/categories', { params }),
  createCategory: (data) => http.post('/admin/categories', data),
  updateCategory: (id, data) => http.put(`/admin/categories/${id}`, data),
  deleteCategory: (id) => http.delete(`/admin/categories/${id}`),
  // 用户管理
  getUsers: (params) => http.get('/admin/users', { params }),
  getUserDetail: (id) => http.get(`/admin/users/${id}`),
  createUser: (data) => http.post('/admin/users', data),
  updateUser: (id, data) => http.put(`/admin/users/${id}`, data),
  toggleUser: (id) => http.patch(`/admin/users/${id}/toggle`),
  updateUserRole: (id, data) => http.put(`/admin/users/${id}/role`, data),
  deleteUser: (id) => http.delete(`/admin/users/${id}`),
  resetUserKey: (id) => http.post(`/admin/users/${id}/reset-key`),
  // 配置
  getConfigs: () => http.get('/admin/configs'),
  saveConfigs: (data) => http.put('/admin/configs', data),
  // 公告
  getAnnouncements: () => http.get('/admin/announcements'),
  createAnnouncement: (data) => http.post('/admin/announcements', data),
  updateAnnouncement: (id, data) => http.put(`/admin/announcements/${id}`, data),
  deleteAnnouncement: (id) => http.delete(`/admin/announcements/${id}`),
  // 日志
  getLogs: (params) => http.get('/admin/logs', { params }),
  // 内置库
  getAvailableLocalApis: (params) => http.get('/libraries/available', { params }),
}

export const siteApi = {
  getInfo: () => http.get('/site-info'),
  getAnnouncements: () => http.get('/announcements'),
  getPopupAnnouncements: (lastId) => http.get('/announcements/popup', { params: { last_id: lastId } }),
}

export const themeApi = {
  // 公开主题列表（支持分页/搜索）
  getPublicThemes: (params) => http.get('/themes/public', { params }),
  // 我的主题（需要登录，支持分页/搜索）
  getMyThemes: (params) => http.get('/themes/my', { params }),
  // 后台获取所有主题（支持分页/搜索）
  getAllThemes: (params) => http.get('/themes', { params }),
  // 单个主题详情
  getTheme: (id) => http.get(`/themes/${id}`),
  // 创建主题
  createTheme: (data) => http.post('/themes', data),
  // 更新主题
  updateTheme: (id, data) => http.put(`/themes/${id}`, data),
  // 删除主题
  deleteTheme: (id) => http.delete(`/themes/${id}`),
}

export const friendshipApi = {
  getList: () => http.get('/friendships'),
  getRedirectInfo: (id) => http.get(`/friendships/goto/${id}`),
  // 管理端
  getAdminList: () => http.get('/friendships/admin'),
  create: (data) => http.post('/friendships', data),
  update: (id, data) => http.put(`/friendships/${id}`, data),
  delete: (id) => http.delete(`/friendships/${id}`),
}
