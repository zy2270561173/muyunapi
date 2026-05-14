import request from './http'

export const updateApi = {
  // 获取当前版本
  getVersion() {
    return request.get('/update/version')
  },

  // 获取更新配置
  getUpdateConfig() {
    return request.get('/update/config')
  },

  // 保存更新配置
  saveUpdateConfig(data) {
    return request.post('/update/config', data)
  },

  // 检查更新
  checkUpdate() {
    return request.post('/update/check')
  },

  // 下载更新
  downloadUpdate(updateInfo) {
    return request.post('/update/download', { updateInfo })
  },

  // 应用更新
  applyUpdate(filePath, backup = true) {
    return request.post('/update/apply', { filePath, backup })
  },

  // 获取更新历史
  getUpdateHistory() {
    return request.get('/update/history')
  },

  // 获取备份列表
  getBackups() {
    return request.get('/update/backups')
  },

  // 恢复备份
  restoreBackup(backupName) {
    return request.post('/update/restore', { backupName })
  },

  // 删除备份
  deleteBackup(name) {
    return request.delete(`/update/backups/${name}`)
  }
}
