/**
 * 更新包上传
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const { prepare } = require('../db/init');
const { authMiddleware } = require('../middleware/auth');

const PACKAGES_DIR = path.join(__dirname, '..', 'packages');

if (!fs.existsSync(PACKAGES_DIR)) {
  fs.mkdirSync(PACKAGES_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, PACKAGES_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + '.zip');
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/zip' || file.originalname.endsWith('.zip')) {
      cb(null, true);
    } else {
      cb(new Error('只接受ZIP文件'));
    }
  }
});

function calculateChecksums(filePath) {
  const md5 = crypto.createHash('md5');
  const sha256 = crypto.createHash('sha256');
  const fileData = fs.readFileSync(filePath);
  return {
    md5: md5.update(fileData).digest('hex'),
    sha256: sha256.update(fileData).digest('hex')
  };
}

function versionToCode(version) {
  const [major, minor, patch] = version.split('.').map(Number);
  return major * 10000 + minor * 100 + patch;
}

/**
 * 从 zip 包内嵌的 update.json 读取元数据（后备数据）
 * @param {string} filePath - zip 文件路径
 * @returns {object|null} update.json 内容，解析失败返回 null
 */
function readZipUpdateJson(filePath) {
  try {
    // 动态加载 adm-zip
    let AdmZip;
    try { AdmZip = require('adm-zip'); } catch (_) { return null; }

    const zip = new AdmZip(filePath);
    const entry = zip.getEntry('update.json');
    if (!entry) return null;

    const content = entry.getData().toString('utf8');
    return JSON.parse(content);
  } catch (e) {
    console.warn('[upload] 读取 zip 内嵌 update.json 失败:', e.message);
    return null;
  }
}

router.post('/', authMiddleware, upload.single('file'), (req, res) => {
  try {
    const { version: formVersion, channel: formChannel, platform: formPlatform, arch: formArch, minVersion: formMinVersion, forceUpdate: formForceUpdate, breakingChanges, changelogZh, changelogEn } = req.body;

    if (!req.file) {
      return res.json({ code: 400, message: '请上传更新包文件' });
    }

    // 尝试从 zip 内嵌的 update.json 读取元数据作为后备
    const zipMeta = readZipUpdateJson(req.file.path);

    // 优先使用表单数据，否则回退到 zip 内嵌数据
    const version   = formVersion  || (zipMeta && zipMeta.version);
    const channel   = formChannel || (zipMeta && zipMeta.channel) || 'stable';
    const platform  = formPlatform || (zipMeta && zipMeta.platform);
    const arch      = formArch     || (zipMeta && zipMeta.arch);
    const minVersion = formMinVersion || (zipMeta && (zipMeta.minVersion || zipMeta.min_client_version)) || '0.0.0';
    const forceUpdate = formForceUpdate === 'true'
      ? true
      : (formForceUpdate === 'false' ? false : !!(zipMeta && zipMeta.forceUpdate));

    if (!version || !platform || !arch) {
      fs.unlinkSync(req.file.path);
      return res.json({ code: 400, message: '缺少必要参数（version/platform/arch）：请确保 zip 内嵌 update.json 包含这些字段，或通过表单提供' });
    }

    const versionRegex = /^\d+\.\d+\.\d+$/;
    if (!versionRegex.test(version)) {
      fs.unlinkSync(req.file.path);
      return res.json({ code: 400, message: '版本号格式错误' });
    }

    const checksums = calculateChecksums(req.file.path);
    const filename = `muyunapi-v${version}-${platform}-${arch}.zip`;
    const newPath = path.join(PACKAGES_DIR, filename);

    if (fs.existsSync(newPath)) {
      fs.unlinkSync(newPath);
    }
    fs.renameSync(req.file.path, newPath);

    const existing = prepare('SELECT id FROM packages WHERE version = ? AND platform = ? AND arch = ? AND channel = ?')
      .get(version, platform, arch, channel);

    // 合并更新日志：表单 > zip 内嵌
    const zipChangelog = zipMeta && zipMeta.changelog ? zipMeta.changelog : {};
    let changelogZhParsed = changelogZh ? JSON.parse(changelogZh) : [];
    let changelogEnParsed = changelogEn ? JSON.parse(changelogEn) : [];
    if (!changelogZhParsed.length) changelogZhParsed = Array.isArray(zipChangelog.zh) ? zipChangelog.zh : (Array.isArray(zipChangelog.zh_cn) ? zipChangelog.zh_cn : []);
    if (!changelogEnParsed.length) changelogEnParsed = Array.isArray(zipChangelog.en) ? zipChangelog.en : [];

    if (existing) {
      prepare(`UPDATE packages SET filename=?, size=?, checksum_md5=?, checksum_sha256=?, min_version=?, force_update=?, breaking_changes=?, changelog_zh=?, changelog_en=?, release_date=? WHERE id=?`)
        .run(filename, req.file.size, checksums.md5, checksums.sha256, minVersion,
          forceUpdate ? 1 : 0, breakingChanges === 'true' ? 1 : 0,
          JSON.stringify(changelogZhParsed), JSON.stringify(changelogEnParsed),
          new Date().toISOString().split('T')[0], existing.id);

      res.json({ code: 200, message: '更新包已更新', data: { id: existing.id, version, platform, arch, channel, size: req.file.size, checksum: checksums } });
    } else {
      const result = prepare(`INSERT INTO packages (version, version_code, channel, platform, arch, filename, size, checksum_md5, checksum_sha256, min_version, force_update, breaking_changes, changelog_zh, changelog_en, release_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(version, versionToCode(version), channel, platform, arch, filename, req.file.size,
          checksums.md5, checksums.sha256, minVersion,
          forceUpdate ? 1 : 0, breakingChanges === 'true' ? 1 : 0,
          JSON.stringify(changelogZhParsed), JSON.stringify(changelogEnParsed),
          new Date().toISOString().split('T')[0]);

      res.json({ code: 200, message: '更新包上传成功', data: { id: result.lastId || 0, version, platform, arch, channel, size: req.file.size, checksum: checksums } });
    }
  } catch (e) {
    console.error('[upload] 上传失败:', e);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.json({ code: 500, message: '上传失败' });
  }
});

router.get('/stats', authMiddleware, (req, res) => {
  try {
    const totalPackages = prepare('SELECT COUNT(*) as count FROM packages').get();
    const totalDownloads = prepare('SELECT SUM(download_count) as total FROM packages').get();
    const platformStats = prepare('SELECT platform, COUNT(*) as count FROM packages GROUP BY platform').all();
    res.json({ code: 200, data: { totalPackages: totalPackages?.count || 0, totalDownloads: totalDownloads?.total || 0, platformStats } });
  } catch (e) {
    res.json({ code: 500, message: '获取统计失败' });
  }
});

router.get('/logs', authMiddleware, (req, res) => {
  const { limit = 50, offset = 0 } = req.query;
  try {
    const logs = prepare(`SELECT dl.*, p.version, p.platform, p.arch FROM download_logs dl LEFT JOIN packages p ON dl.package_id = p.id ORDER BY dl.downloaded_at DESC LIMIT ? OFFSET ?`).all(parseInt(limit), parseInt(offset));
    res.json({ code: 200, data: logs });
  } catch (e) {
    res.json({ code: 500, message: '获取日志失败' });
  }
});

module.exports = router;