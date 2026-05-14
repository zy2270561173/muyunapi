/**
 * 更新包管理
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { prepare } = require('../db/init');
const { authMiddleware } = require('../middleware/auth');

const PACKAGES_DIR = path.join(__dirname, '..', 'packages');

// 确保目录存在
if (!fs.existsSync(PACKAGES_DIR)) {
  fs.mkdirSync(PACKAGES_DIR, { recursive: true });
}

// 版本号转版本代码
function versionToCode(version) {
  const [major, minor, patch] = version.split('.').map(Number);
  return major * 10000 + minor * 100 + patch;
}

// 检查更新
router.post('/check', (req, res) => {
  const { version, platform, arch, channel = 'stable' } = req.body;
  
  if (!version || !platform || !arch) {
    return res.json({ code: 400, message: '缺少必要参数' });
  }
  
  const currentCode = versionToCode(version);
  
  try {
    // 查找最新版本
    const latest = prepare(`
      SELECT * FROM packages 
      WHERE platform = ? AND arch = ? AND channel = ? AND is_active = 1
      AND version_code > ?
      ORDER BY version_code DESC LIMIT 1
    `).get(platform, arch, channel, currentCode);
    
    if (!latest) {
      return res.json({
        code: 200,
        data: {
          hasUpdate: false,
          message: '已是最新版本'
        }
      });
    }
    
    // 检查是否强制更新
    const minVersionCode = versionToCode(latest.min_version);
    const forceUpdate = currentCode < minVersionCode || latest.force_update === 1;
    
    res.json({
      code: 200,
      data: {
        hasUpdate: true,
        forceUpdate,
        packageId: latest.id,
        version: latest.version,
        versionCode: latest.version_code,
        downloadUrl: `/api/packages/download/${latest.id}`,
        size: latest.size,
        checksum: {
          md5: latest.checksum_md5,
          sha256: latest.checksum_sha256
        },
        releaseDate: latest.release_date,
        changelog: {
          zh: latest.changelog_zh ? JSON.parse(latest.changelog_zh) : [],
          en: latest.changelog_en ? JSON.parse(latest.changelog_en) : []
        },
        breakingChanges: latest.breaking_changes === 1
      }
    });
  } catch (e) {
    console.error('[check] 检查更新失败:', e);
    res.json({ code: 500, message: '检查更新失败' });
  }
});

// 下载更新包
router.get('/download/:id', (req, res) => {
  const { id } = req.params;
  const clientVersion = req.query.version || 'unknown';
  
  try {
    const pkg = prepare('SELECT * FROM packages WHERE id = ? AND is_active = 1').get(id);
    if (!pkg) {
      return res.status(404).json({ code: 404, message: '更新包不存在' });
    }
    
    const filePath = path.join(PACKAGES_DIR, pkg.filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ code: 404, message: '文件不存在' });
    }
    
    // 记录下载日志
    prepare(`
      INSERT INTO download_logs (package_id, client_version, client_ip, user_agent)
      VALUES (?, ?, ?, ?)
    `).run(id, clientVersion, req.ip, req.headers['user-agent']);
    
    // 增加下载计数
    prepare('UPDATE packages SET download_count = download_count + 1 WHERE id = ?').run(id);
    
    // 发送文件（禁用任何压缩，确保文件原始字节与上传时一致）
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${pkg.filename}"`);
    res.setHeader('Content-Length', pkg.size);
    res.setHeader('Content-MD5', pkg.checksum_md5); // 让客户端可自行验证
    // 强制不压缩
    res.setHeader('Content-Encoding', 'identity');
    res.removeHeader('Transfer-Encoding');

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  } catch (e) {
    console.error('[download] 下载失败:', e);
    res.status(500).json({ code: 500, message: '下载失败' });
  }
});

// 获取更新历史
router.get('/history', (req, res) => {
  const { platform, arch, channel = 'stable', limit = 10, offset = 0 } = req.query;
  
  try {
    let sql = 'SELECT * FROM packages WHERE is_active = 1';
    const params = [];
    
    if (platform) {
      sql += ' AND platform = ?';
      params.push(platform);
    }
    if (arch) {
      sql += ' AND arch = ?';
      params.push(arch);
    }
    if (channel) {
      sql += ' AND channel = ?';
      params.push(channel);
    }
    
    sql += ' ORDER BY version_code DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
    
    const list = prepare(sql).all(...params);
    
    // 获取总数
    let countSql = 'SELECT COUNT(*) as total FROM packages WHERE is_active = 1';
    const countParams = [];
    if (platform) {
      countSql += ' AND platform = ?';
      countParams.push(platform);
    }
    if (arch) {
      countSql += ' AND arch = ?';
      countParams.push(arch);
    }
    if (channel) {
      countSql += ' AND channel = ?';
      countParams.push(channel);
    }
    const { total } = prepare(countSql).get(...countParams);
    
    res.json({
      code: 200,
      data: {
        total,
        list: list.map(item => ({
          id: item.id,
          version: item.version,
          versionCode: item.version_code,
          platform: item.platform,
          arch: item.arch,
          channel: item.channel,
          size: item.size,
          releaseDate: item.release_date,
          downloadCount: item.download_count,
          changelog: {
            zh: item.changelog_zh ? JSON.parse(item.changelog_zh) : [],
            en: item.changelog_en ? JSON.parse(item.changelog_en) : []
          }
        }))
      }
    });
  } catch (e) {
    console.error('[history] 获取历史失败:', e);
    res.json({ code: 500, message: '获取历史失败' });
  }
});

// 获取所有更新包（管理员）
router.get('/', authMiddleware, (req, res) => {
  try {
    const list = prepare(`
      SELECT * FROM packages ORDER BY release_date DESC
    `).all();
    
    res.json({
      code: 200,
      data: list
    });
  } catch (e) {
    res.json({ code: 500, message: '获取失败' });
  }
});

// 删除更新包（管理员）
router.delete('/:id', authMiddleware, (req, res) => {
  const { id } = req.params;
  
  try {
    const pkg = prepare('SELECT * FROM packages WHERE id = ?').get(id);
    if (!pkg) {
      return res.json({ code: 404, message: '更新包不存在' });
    }
    
    // 删除文件
    const filePath = path.join(PACKAGES_DIR, pkg.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
    // 删除记录
    prepare('DELETE FROM packages WHERE id = ?').run(id);
    
    res.json({ code: 200, message: '删除成功' });
  } catch (e) {
    console.error('[delete] 删除失败:', e);
    res.json({ code: 500, message: '删除失败' });
  }
});

// 切换更新包状态（管理员）
router.patch('/:id/toggle', authMiddleware, (req, res) => {
  const { id } = req.params;
  
  try {
    const pkg = prepare('SELECT * FROM packages WHERE id = ?').get(id);
    if (!pkg) {
      return res.json({ code: 404, message: '更新包不存在' });
    }
    
    const newStatus = pkg.is_active === 1 ? 0 : 1;
    prepare('UPDATE packages SET is_active = ? WHERE id = ?').run(newStatus, id);
    
    res.json({
      code: 200,
      data: { isActive: newStatus === 1 },
      message: newStatus === 1 ? '已启用' : '已禁用'
    });
  } catch (e) {
    res.json({ code: 500, message: '操作失败' });
  }
});

// 验证更新包（接收文件流，实时计算 MD5 与数据库比对）
router.post('/verify/:id', (req, res) => {
  const { id } = req.params;

  try {
    const pkg = prepare('SELECT * FROM packages WHERE id = ?').get(id);
    if (!pkg) {
      return res.status(404).json({ code: 404, message: '更新包不存在' });
    }

    const expectedMd5 = pkg.checksum_md5;
    const expectedSize = pkg.size;

    // 实时计算文件 MD5
    const hash = crypto.createHash('md5');
    let actualSize = 0;

    // 分块读取，避免大文件内存溢出
    const filePath = path.join(PACKAGES_DIR, pkg.filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ code: 404, message: '文件不存在' });
    }

    const stream = fs.createReadStream(filePath);

    stream.on('data', (chunk) => {
      hash.update(chunk);
      actualSize += chunk.length;
    });

    stream.on('end', () => {
      const actualMd5 = hash.digest('hex');

      const sizeMatch = actualSize === expectedSize;
      const md5Match = actualMd5 === expectedMd5;

      if (sizeMatch && md5Match) {
        res.json({
          code: 200,
          valid: true,
          message: '文件完整，校验通过',
          data: {
            size: { expected: expectedSize, actual: actualSize, match: sizeMatch },
            md5: { expected: expectedMd5, actual: actualMd5, match: md5Match }
          }
        });
      } else {
        res.json({
          code: 200,
          valid: false,
          message: sizeMatch
            ? 'MD5 不匹配，文件可能损坏'
            : `大小不匹配（期望 ${expectedSize} 字节，实际 ${actualSize} 字节）`,
          data: {
            size: { expected: expectedSize, actual: actualSize, match: sizeMatch },
            md5: { expected: expectedMd5, actual: actualMd5, match: md5Match }
          }
        });
      }
    });

    stream.on('error', (e) => {
      console.error('[verify] 读取文件失败:', e);
      res.status(500).json({ code: 500, message: '校验失败：文件读取错误' });
    });
  } catch (e) {
    console.error('[verify] 校验失败:', e);
    res.status(500).json({ code: 500, message: '校验失败' });
  }
});

module.exports = router;
