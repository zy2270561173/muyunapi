/**
 * 更新客户端 SDK
 * 用于从自建更新服务器检查和下载更新
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const https = require('https');
const http = require('http');
const { execSync } = require('child_process');

class UpdateClient {
  constructor(config = {}) {
    this.serverUrl = config.serverUrl || process.env.UPDATE_SERVER_URL || '';
    this.platform = config.platform || this.detectPlatform();
    this.arch = config.arch || this.detectArch();
    this.channel = config.channel || process.env.UPDATE_CHANNEL || 'stable';
    this.currentVersion = config.currentVersion || this.getCurrentVersion();
    this.downloadDir = config.downloadDir || path.join(process.cwd(), 'updates');
    this.backupDir = config.backupDir || path.join(process.cwd(), 'backups');
    
    // 确保目录存在
    if (!fs.existsSync(this.downloadDir)) {
      fs.mkdirSync(this.downloadDir, { recursive: true });
    }
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  /**
   * 检测当前平台
   */
  detectPlatform() {
    const platform = process.platform;
    if (platform === 'win32') return 'win';
    if (platform === 'darwin') return 'macos';
    return 'linux';
  }

  /**
   * 检测当前架构
   */
  detectArch() {
    const arch = process.arch;
    if (arch === 'x64') return 'x64';
    if (arch === 'arm64') return 'arm64';
    return 'x64';
  }

  /**
   * 获取当前版本
   */
  getCurrentVersion() {
    try {
      const packageJson = require(path.join(process.cwd(), 'package.json'));
      return packageJson.version || '1.0.0';
    } catch (e) {
      return '1.0.0';
    }
  }

  /**
   * 设置更新服务器地址
   */
  setServerUrl(url) {
    this.serverUrl = url.replace(/\/$/, '');
  }

  /**
   * 检查更新
   */
  async checkUpdate() {
    if (!this.serverUrl) {
      throw new Error('未配置更新服务器地址');
    }

    const url = `${this.serverUrl}/api/packages/check`;
    const data = {
      version: this.currentVersion,
      platform: this.platform,
      arch: this.arch,
      channel: this.channel
    };

    return new Promise((resolve, reject) => {
      const client = url.startsWith('https') ? https : http;
      const postData = JSON.stringify(data);
      
      const options = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        },
        timeout: 30000
      };

      const req = client.request(url, options, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try {
            const result = JSON.parse(body);
            if (result.code === 200) {
              resolve(result.data);
            } else {
              reject(new Error(result.message || '检查更新失败'));
            }
          } catch (e) {
            reject(new Error('解析响应失败'));
          }
        });
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('请求超时'));
      });

      req.write(postData);
      req.end();
    });
  }

  /**
   * 下载更新包
   */
  async downloadUpdate(updateInfo, onProgress) {
    const { downloadUrl, version, checksum, packageId } = updateInfo;
    const fullUrl = `${this.serverUrl}${downloadUrl}?version=${this.currentVersion}`;
    const filename = `update-v${version}-${this.platform}-${this.arch}.zip`;
    const filePath = path.join(this.downloadDir, filename);

    return new Promise((resolve, reject) => {
      const client = fullUrl.startsWith('https') ? https : http;
      
      const req = client.get(fullUrl, { timeout: 300000 }, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          // 处理重定向
          const redirectUrl = res.headers.location;
          this.downloadFromUrl(redirectUrl, filePath, checksum, onProgress, packageId)
            .then(resolve)
            .catch(reject);
          return;
        }

        if (res.statusCode !== 200) {
          reject(new Error(`下载失败: HTTP ${res.statusCode}`));
          return;
        }

        const totalSize = parseInt(res.headers['content-length'], 10);
        let downloadedSize = 0;
        const fileStream = fs.createWriteStream(filePath);

        res.on('data', (chunk) => {
          downloadedSize += chunk.length;
          fileStream.write(chunk);
          
          if (onProgress && totalSize) {
            const progress = Math.round((downloadedSize / totalSize) * 100);
            onProgress(progress, downloadedSize, totalSize);
          }
        });

        res.on('end', async () => {
          fileStream.end();
          
          // 调用更新端 API 进行服务端校验
          if (packageId) {
            try {
              const verifyResult = await this.verifyFileWithServer(filePath, packageId);
              if (!verifyResult.valid) {
                fs.unlinkSync(filePath);
                reject(new Error(`文件校验失败：${verifyResult.message}`));
                return;
              }
              console.log(`[Update] ✅ 文件校验通过（服务端）: ${verifyResult.data.md5.actual}`);
            } catch (e) {
              // 校验失败才阻止（网络错误等只警告）
              console.warn(`[Update] ⚠️ 服务端校验异常: ${e.message}，将跳过服务端校验`);
            }
          }
          
          resolve({
            filePath,
            version,
            size: downloadedSize
          });
        });

        res.on('error', (err) => {
          fileStream.destroy();
          if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
          reject(err);
        });
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('下载超时'));
      });
    });
  }

  /**
   * 从URL下载（处理重定向）
   */
  downloadFromUrl(url, filePath, checksum, onProgress, packageId) {
    return new Promise((resolve, reject) => {
      const client = url.startsWith('https') ? https : http;
      
      const req = client.get(url, { timeout: 300000 }, (res) => {
        const totalSize = parseInt(res.headers['content-length'], 10);
        let downloadedSize = 0;
        const fileStream = fs.createWriteStream(filePath);

        res.on('data', (chunk) => {
          downloadedSize += chunk.length;
          fileStream.write(chunk);
          
          if (onProgress && totalSize) {
            const progress = Math.round((downloadedSize / totalSize) * 100);
            onProgress(progress, downloadedSize, totalSize);
          }
        });

        res.on('end', async () => {
          fileStream.end();
          
          // 调用更新端 API 进行服务端校验
          if (packageId) {
            try {
              const verifyResult = await this.verifyFileWithServer(filePath, packageId);
              if (!verifyResult.valid) {
                if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
                reject(new Error(`文件校验失败：${verifyResult.message}`));
                return;
              }
              console.log(`[Update] ✅ 文件校验通过（服务端）: ${verifyResult.data.md5.actual}`);
            } catch (e) {
              console.warn(`[Update] ⚠️ 服务端校验异常: ${e.message}，将跳过服务端校验`);
            }
          }

          resolve({
            filePath,
            size: downloadedSize
          });
        });

        res.on('error', (err) => {
          fileStream.destroy();
          if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
          reject(err);
        });
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('下载超时'));
      });
    });
  }

  /**
   * 预览更新包内容（下载后、解压安装前读取 update.json）
   * @param {string} filePath - zip 文件路径
   * @returns {Promise<object>} update.json 内容
   */
  previewZip(filePath) {
    return new Promise((resolve, reject) => {
      try {
        const AdmZip = (() => { try { return require('adm-zip'); } catch (_) { return null; } })();
        if (!AdmZip) {
          reject(new Error('adm-zip 模块未安装'));
          return;
        }

        const zip = new AdmZip(filePath);
        const entry = zip.getEntry('update.json');
        if (!entry) {
          reject(new Error('更新包内未找到 update.json'));
          return;
        }

        const content = entry.getData().toString('utf8');
        const data = JSON.parse(content);

        resolve({
          version: data.version || '',
          versionCode: data.versionCode || 0,
          platform: data.platform || this.platform,
          arch: data.arch || this.arch,
          channel: data.channel || this.channel,
          changelog: data.changelog || { zh: [], en: [] },
          releaseDate: data.releaseDate || new Date().toISOString().split('T')[0],
          forceUpdate: data.forceUpdate || false,
          breakingChanges: data.breakingChanges || false,
          includesUpdateServer: data.includesUpdateServer || false,
          files: data.files || []
        });
      } catch (e) {
        reject(new Error('读取更新包预览失败: ' + e.message));
      }
    });
  }

  /**
   * 调用更新端 API 验证文件完整性（服务端到服务端校验）
   * @param {string} filePath - 本地文件路径
   * @param {number} packageId - 更新包 ID
   * @returns {Promise<object>} 校验结果
   */
  async verifyFileWithServer(filePath, packageId) {
    return new Promise((resolve, reject) => {
      const url = `${this.serverUrl}/api/packages/verify/${packageId}`;
      const client = url.startsWith('https') ? https : http;

      const req = client.request(url, {
        method: 'POST',
        timeout: 120000
      }, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try {
            const result = JSON.parse(body);
            if (result.code === 200) {
              resolve(result);
            } else {
              reject(new Error(result.message || '校验失败'));
            }
          } catch (e) {
            reject(new Error('解析校验响应失败'));
          }
        });
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('校验请求超时'));
      });

      req.end();
    });
  }

  /**
   * 计算文件MD5
   */
  calculateMd5(filePath) {
    const hash = crypto.createHash('md5');
    const data = fs.readFileSync(filePath);
    hash.update(data);
    return hash.digest('hex');
  }

  /**
   * 备份当前版本
   */
  async backupCurrentVersion() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = `backup-v${this.currentVersion}-${timestamp}.zip`;
    const backupPath = path.join(this.backupDir, backupName);

    // 需要备份的目录
    const dirsToBackup = ['server', 'client/dist', 'scripts'];
    const filesToBackup = ['package.json', 'package-lock.json', 'README.md'];

    try {
      // 使用系统zip命令创建备份
      const dirs = dirsToBackup.filter(d => fs.existsSync(d)).join(' ');
      const files = filesToBackup.filter(f => fs.existsSync(f)).join(' ');
      
      if (this.platform === 'win') {
        // Windows使用PowerShell
        execSync(`powershell -Command "Compress-Archive -Path ${dirs} ${files} -DestinationPath ${backupPath} -Force"`, {
          cwd: process.cwd(),
          stdio: 'ignore'
        });
      } else {
        // Linux/Mac使用zip
        execSync(`zip -r "${backupPath}" ${dirs} ${files}`, {
          cwd: process.cwd(),
          stdio: 'ignore'
        });
      }

      return { backupPath, backupName };
    } catch (e) {
      console.error('备份失败:', e);
      throw new Error('备份当前版本失败');
    }
  }

  /**
   * 应用更新
   */
  async applyUpdate(updateFilePath, options = {}) {
    const { backup = true, restart = false } = options;

    try {
      // 1. 备份当前版本
      if (backup) {
        await this.backupCurrentVersion();
      }

      // 2. 解压更新包
      const extractDir = path.join(this.downloadDir, 'extract');
      if (!fs.existsSync(extractDir)) {
        fs.mkdirSync(extractDir, { recursive: true });
      }

      await this.extractZip(updateFilePath, extractDir);

      // 3. 读取更新配置
      const updateConfigPath = path.join(extractDir, 'update.json');
      if (!fs.existsSync(updateConfigPath)) {
        throw new Error('更新包缺少update.json配置文件');
      }

      const updateConfig = JSON.parse(fs.readFileSync(updateConfigPath, 'utf8'));

      // 4. 执行更新脚本（如果有）
      if (updateConfig.scripts && updateConfig.scripts.preInstall) {
        const preInstallScript = path.join(extractDir, updateConfig.scripts.preInstall);
        if (fs.existsSync(preInstallScript)) {
          execSync(`node "${preInstallScript}"`, { cwd: process.cwd(), stdio: 'inherit' });
        }
      }

      // 5. 复制文件
      const files = updateConfig.files || [];
      for (const file of files) {
        const srcPath = path.join(extractDir, file.src);
        const destPath = path.join(process.cwd(), file.dest);

        if (!fs.existsSync(srcPath)) continue;

        const stat = fs.statSync(srcPath);

        if (stat.isDirectory()) {
          // 递归复制整个目录
          this._copyDirSync(srcPath, destPath);
        } else {
          // 复制单文件
          const destDir = path.dirname(destPath);
          if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
          fs.copyFileSync(srcPath, destPath);
        }
      }

      // 6. 执行安装后脚本
      if (updateConfig.scripts && updateConfig.scripts.postInstall) {
        const postInstallScript = path.join(extractDir, updateConfig.scripts.postInstall);
        if (fs.existsSync(postInstallScript)) {
          execSync(`node "${postInstallScript}"`, { cwd: process.cwd(), stdio: 'inherit' });
        }
      }

      // 7. 安装依赖（如果有package.json更新）
      if (fs.existsSync(path.join(process.cwd(), 'package.json'))) {
        try {
          execSync('npm install --production', { 
            cwd: process.cwd(), 
            stdio: 'ignore',
            timeout: 120000
          });
        } catch (e) {
          console.warn('依赖安装失败，请手动运行 npm install');
        }
      }

      // 8. 清理临时文件
      this.cleanup(extractDir);

      // 9. 更新 package.json 版本号，使前端显示与更新包一致
      try {
        const packageJsonPath = path.join(process.cwd(), 'package.json');
        if (fs.existsSync(packageJsonPath)) {
          const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
          if (updateConfig.version) {
            pkg.version = updateConfig.version;
            fs.writeFileSync(packageJsonPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
            console.log(`[Update] package.json 版本已更新为 ${updateConfig.version}`);
          }
        }
      } catch (e) {
        console.warn('[Update] 更新 package.json 版本失败:', e.message);
      }

      // 10. 如果需要重启
      if (restart) {
        console.log('更新完成，正在重启服务...');
        process.exit(0); // 由进程管理器重启
      }

      return {
        success: true,
        message: '更新成功',
        newVersion: updateConfig.version
      };
    } catch (e) {
      console.error('应用更新失败:', e);
      throw e;
    }
  }

  /**
   * 解压ZIP文件（纯 Node.js 实现，跨平台兼容）
   */
  extractZip(zipPath, extractDir) {
    return new Promise((resolve, reject) => {
      try {
        let AdmZip;
        try { AdmZip = require('adm-zip'); } catch (_) {
          reject(new Error('adm-zip 模块未安装，请执行: npm install adm-zip'));
          return;
        }

        if (!fs.existsSync(zipPath)) {
          reject(new Error('更新包文件不存在: ' + zipPath));
          return;
        }

        if (!fs.existsSync(extractDir)) {
          fs.mkdirSync(extractDir, { recursive: true });
        }

        const zip = new AdmZip(zipPath);
        zip.extractAllTo(extractDir, true);
        resolve();
      } catch (e) {
        reject(new Error('解压更新包失败: ' + e.message));
      }
    });
  }

  /**
   * 递归复制目录
   */
  _copyDirSync(src, dest) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    const entries = fs.readdirSync(src, { withFileTypes: true });
    for (const entry of entries) {
      const srcPath  = path.join(src,  entry.name);
      const destPath = path.join(dest, entry.name);
      if (entry.isDirectory()) {
        this._copyDirSync(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }

  /**
   * 清理临时文件
   */
  cleanup(dir) {
    try {
      if (fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    } catch (e) {
      console.warn('清理临时文件失败:', e);
    }
  }

  /**
   * 获取更新历史
   */
  async getUpdateHistory(limit = 10) {
    if (!this.serverUrl) {
      throw new Error('未配置更新服务器地址');
    }

    const url = `${this.serverUrl}/api/packages/history?platform=${this.platform}&arch=${this.arch}&channel=${this.channel}&limit=${limit}`;

    return new Promise((resolve, reject) => {
      const client = url.startsWith('https') ? https : http;
      
      const req = client.get(url, { timeout: 30000 }, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try {
            const result = JSON.parse(body);
            if (result.code === 200) {
              resolve(result.data);
            } else {
              reject(new Error(result.message || '获取历史失败'));
            }
          } catch (e) {
            reject(new Error('解析响应失败'));
          }
        });
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('请求超时'));
      });
    });
  }
}

module.exports = UpdateClient;
