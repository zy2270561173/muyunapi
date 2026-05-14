#!/usr/bin/env node
/**
 * MuYunAPI 更新包上传脚本
 * 
 * 用法:
 *   node scripts/upload-update.js --file=dist/muyunapi-v1.3.0-win-x64.zip --server=http://localhost:3001
 *   node scripts/upload-update.js --file=dist/xxx.zip --server=http://localhost:3001 --username=admin --password=admin123
 *   node scripts/upload-update.js --file=dist/xxx.zip --server=http://localhost:3001 --token=eyJhbG...
 * 
 * 可选参数:
 *   --version=1.3.0         版本号（不传则从文件名解析）
 *   --channel=stable        更新通道
 *   --platform=win          平台
 *   --arch=x64              架构
 *   --changelog="更新内容"  更新日志
 *   --forceUpdate           强制更新
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const { execSync } = require('child_process');

// ─── 工具函数 ───

function log(msg, color = '') {
  const colors = { green: '\x1b[32m', yellow: '\x1b[33m', red: '\x1b[31m', blue: '\x1b[34m', cyan: '\x1b[36m' };
  console.log(`${colors[color] || ''}${msg}\x1b[0m`);
}

function parseArgs() {
  const args = {};
  process.argv.slice(2).forEach(arg => {
    if (arg.startsWith('--')) {
      const [key, value] = arg.substring(2).split('=');
      args[key] = value || true;
    }
  });
  return args;
}

function request(method, urlPath, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const serverUrl = args.server.replace(/\/$/, '');
    const parsed = new URL(serverUrl + urlPath);
    const client = parsed.protocol === 'https:' ? https : http;

    const postData = body ? JSON.stringify(body) : '';
    const options = {
      hostname: parsed.hostname,
      port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path: urlPath,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(postData ? { 'Content-Length': Buffer.byteLength(postData) } : {}),
        ...headers
      },
      timeout: 30000
    };

    const req = client.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`响应解析失败: ${data.substring(0, 200)}`));
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('请求超时')); });
    if (postData) req.write(postData);
    req.end();
  });
}

// 全局 args（供 request 函数使用）
let args = {};

// ─── 主流程 ───

async function main() {
  args = parseArgs();

  log('\n╔══════════════════════════════════════╗', 'cyan');
  log('║    MuYunAPI 更新包上传工具 (Windows)  ║', 'cyan');
  log('╚══════════════════════════════════════╝', 'cyan');

  // 参数校验
  if (!args.file || !args.server) {
    log('\n❌ 缺少必要参数', 'red');
    log('用法: node scripts/upload-update.js --file=dist/xxx.zip --server=http://localhost:3001', 'yellow');
    log('可选: --username=admin --password=admin123 或 --token=xxx', 'yellow');
    process.exit(1);
  }

  // 解析文件路径
  const filePath = path.resolve(args.file);
  if (!fs.existsSync(filePath)) {
    log(`\n❌ 文件不存在: ${filePath}`, 'red');
    process.exit(1);
  }

  // 从文件名解析版本号（如果没传 --version）
  let version = args.version;
  if (!version) {
    const match = path.basename(filePath).match(/v([\d.]+)-/);
    if (match) version = match[1];
  }
  if (!version) {
    log('\n❌ 无法解析版本号，请用 --version=1.3.0 指定', 'red');
    process.exit(1);
  }

  const channel = args.channel || 'stable';
  const platform = args.platform || 'win';
  const arch = args.arch || 'x64';
  const changelog = args.changelog || '版本更新';
  const forceUpdate = args.forceUpdate || false;

  const fileSize = fs.statSync(filePath).size;

  log(`\n📤 上传信息:`, 'blue');
  log(`   文件:   ${path.basename(filePath)}`, 'cyan');
  log(`   大小:   ${(fileSize / 1024 / 1024).toFixed(2)} MB`, 'cyan');
  log(`   版本:   v${version}`, 'cyan');
  log(`   通道:   ${channel}`, 'cyan');
  log(`   服务器: ${args.server}`, 'cyan');

  // ─── Step 1: 登录获取 Token ───
  let token = args.token;

  if (!token) {
    const username = args.username || 'admin';
    const password = args.password || 'admin123';

    log(`\n🔐 登录 (${username})...`, 'blue');
    try {
      const loginRes = await request('POST', '/api/auth/login', { username, password });
      if (loginRes.code === 200) {
        token = loginRes.data.token;
        log('   ✓ 登录成功', 'green');
      } else {
        log(`   ✗ 登录失败: ${loginRes.message}`, 'red');
        process.exit(1);
      }
    } catch (e) {
      log(`   ✗ 登录失败: ${e.message}`, 'red');
      log('   请确认更新服务器已启动', 'yellow');
      process.exit(1);
    }
  }

  // ─── Step 2: 使用 curl 上传文件（Windows 兼容） ───
  log('\n📤 正在上传...', 'blue');

  try {
    const serverUrl = args.server.replace(/\/$/, '');
    const changelogJson = JSON.stringify([changelog]);

    // 构建 curl 命令
    const curlArgs = [
      '-X', 'POST',
      `"${serverUrl}/api/upload"`,
      `-H "Authorization: Bearer ${token}"`,
      `-F "file=@${filePath}"`,
      `-F "version=${version}"`,
      `-F "channel=${channel}"`,
      `-F "platform=${platform}"`,
      `-F "arch=${arch}"`,
      `-F "changelogZh=${changelogJson}"`,
      `-F "changelogEn=${changelogJson}"`,
      `-F "forceUpdate=${forceUpdate}"`,
      '-s'
    ];

    const curlCmd = `curl ${curlArgs.join(' ')}`;
    const resultStr = execSync(curlCmd, { encoding: 'utf-8', timeout: 300000 });
    const result = JSON.parse(resultStr);

    if (result.code === 200) {
      log('\n✅ 上传成功!\n', 'green');
      log(`   📦 版本: v${result.data.version}`, 'cyan');
      log(`   🆔 ID:   ${result.data.id}`, 'cyan');
      log(`   📐 大小: ${(result.data.size / 1024 / 1024).toFixed(2)} MB`, 'cyan');
      log(`   🔐 MD5:  ${result.data.checksum.md5}`, 'cyan');
      log('');
    } else {
      log(`\n❌ 上传失败: ${result.message}`, 'red');
      process.exit(1);
    }
  } catch (e) {
    // 如果 curl 不可用，尝试用 PowerShell
    log('   curl 不可用，尝试 PowerShell...', 'yellow');
    try {
      const serverUrl = args.server.replace(/\/$/, '');
      const changelogJson = JSON.stringify([changelog]);

      const psCmd = `
        $boundary = [System.Guid]::NewGuid().ToString()
        $filePath = '${filePath}'
        $fileName = '${path.basename(filePath)}'
        $fileBytes = [System.IO.File]::ReadAllBytes($filePath)
        $encoding = [System.Text.Encoding]::GetEncoding('iso-8859-1')

        $bodyLines = @(
          "--$boundary",
          "Content-Disposition: form-data; name=\`"file\`"; filename=\`"$fileName\`"",
          "Content-Type: application/octet-stream",
          "",
          $encoding.GetString($fileBytes),
          "--$boundary",
          "Content-Disposition: form-data; name=\`"version\`"",
          "",
          "${version}",
          "--$boundary",
          "Content-Disposition: form-data; name=\`"channel\`"",
          "",
          "${channel}",
          "--$boundary",
          "Content-Disposition: form-data; name=\`"platform\`"",
          "",
          "${platform}",
          "--$boundary",
          "Content-Disposition: form-data; name=\`"arch\`"",
          "",
          "${arch}",
          "--$boundary",
          "Content-Disposition: form-data; name=\`"changelogZh\`"",
          "",
          '${changelogJson}',
          "--$boundary",
          "Content-Disposition: form-data; name=\`"changelogEn\`"",
          "",
          '${changelogJson}',
          "--$boundary--"
        )

        $body = $bodyLines -join "`r`n"
        $contentType = "multipart/form-data; boundary=$boundary"
        $headers = @{ "Authorization" = "Bearer ${token}" }

        try {
          $response = Invoke-WebRequest -Uri "${serverUrl}/api/upload" -Method Post -ContentType $contentType -Headers $headers -Body $body -UseBasicParsing -TimeoutSec 300
          $response.Content
        } catch {
          $_.Exception.Response.StatusCode
          $streamReader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
          $streamReader.ReadToEnd()
        }
      `;

      const resultStr = execSync(`powershell -Command "${psCmd.replace(/"/g, '\\"')}"`, {
        encoding: 'utf-8',
        timeout: 300000,
        maxBuffer: 50 * 1024 * 1024
      });

      const result = JSON.parse(resultStr.trim());
      if (result.code === 200) {
        log('\n✅ 上传成功!\n', 'green');
        log(`   📦 版本: v${result.data.version}`, 'cyan');
        log(`   🆔 ID:   ${result.data.id}`, 'cyan');
        log('');
      } else {
        log(`\n❌ 上传失败: ${result.message}`, 'red');
        process.exit(1);
      }
    } catch (e2) {
      log(`\n❌ 上传失败: ${e2.message}`, 'red');
      log('请确保更新服务器已启动并且网络可达', 'yellow');
      process.exit(1);
    }
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
