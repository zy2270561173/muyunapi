const nodemailer = require('nodemailer');
const db = require('../db/init');

function getSmtpConfig() {
  const configs = db.prepare('SELECT key, value FROM configs WHERE key IN (?, ?, ?, ?, ?)').all(
    'smtp_host', 'smtp_port', 'smtp_user', 'smtp_pass', 'smtp_from'
  );
  const cfg = {};
  configs.forEach(c => { cfg[c.key] = c.value; });
  return cfg;
}

async function sendMail({ to, subject, html }) {
  const cfg = getSmtpConfig();
  if (!cfg.smtp_user || !cfg.smtp_pass) {
    throw new Error('SMTP未配置，请在后台配置邮件服务');
  }

  const smtpHost = cfg.smtp_host || 'smtp.qq.com';
  const smtpPort = parseInt(cfg.smtp_port || '465');
  const useSecure = smtpPort === 465;

  console.log(`[邮件] 连接 ${smtpHost}:${smtpPort} (secure=${useSecure})`);

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: useSecure,
    auth: {
      user: cfg.smtp_user,
      pass: cfg.smtp_pass,
    },
    tls: useSecure ? {
      rejectUnauthorized: false,
      minVersion: 'TLSv1',
    } : undefined,
    socketTimeout: 30000,
    connectTimeout: 20000,
  });

  // 调试用：打印 SMTP 握手过程
  transporter.on('log', (msg) => {
    console.log(`[SMTP] ${msg}`);
  });

  await transporter.sendMail({
    from: cfg.smtp_user,  // 必须与认证账号一致，不能用自定义名称
    to,
    subject,
    html,
  });
}

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function sendVerifyCode(email, type = 'register') {
  const code = generateCode();
  // 清理旧验证码
  db.prepare("DELETE FROM email_codes WHERE email = ? AND type = ?").run(email, type);
  db.prepare("INSERT INTO email_codes (email, code, type) VALUES (?, ?, ?)").run(email, code, type);

  const siteName = db.prepare("SELECT value FROM configs WHERE key='site_name'").get()?.value || 'MuYunAPI';
  const typeLabel = type === 'register' ? '注册' : type === 'reset' ? '重置密码' : '验证';

  await sendMail({
    to: email,
    subject: `[${siteName}] ${typeLabel}验证码`,
    html: `
      <div style="max-width:600px;margin:0 auto;font-family:Arial,sans-serif;background:#f8f9fa;padding:0;">
        <div style="background:#e99312;padding:32px;text-align:center;border-radius:12px 12px 0 0;">
          <h1 style="color:#fff;margin:0;font-size:28px;font-weight:700;letter-spacing:2px">${siteName}</h1>
          <p style="color:rgba(255,255,255,.85);margin:8px 0 0;font-size:14px">API 聚合分享平台</p>
        </div>
        <div style="background:#fff;padding:40px;border-radius:0 0 12px 12px;box-shadow:0 4px 24px rgba(0,0,0,.08);">
          <p style="color:#333;font-size:16px;margin:0 0 24px">您好，您正在进行 <strong>${typeLabel}</strong> 操作。</p>
          <p style="color:#555;font-size:14px;margin:0 0 16px">您的验证码为：</p>
          <div style="background:#1a1a2e;border-radius:12px;padding:24px;text-align:center;margin:0 0 24px;">
            <span style="font-size:42px;font-weight:700;letter-spacing:12px;color:#e99312;font-family:monospace">${code}</span>
          </div>
          <p style="color:#888;font-size:13px;margin:0 0 8px">验证码 <strong>10分钟</strong> 内有效，请尽快完成验证</p>
          <p style="color:#888;font-size:13px;margin:0">如非本人操作，请忽略此邮件</p>
          <hr style="border:none;border-top:1px solid #f0f0f0;margin:24px 0">
          <p style="color:#bbb;font-size:12px;text-align:center;margin:0">${siteName}</p>
        </div>
      </div>
    `,
  });
  return code;
}

function verifyCode(email, code, type = 'register') {
  const row = db.prepare(
    "SELECT * FROM email_codes WHERE email = ? AND code = ? AND type = ? AND used = 0 AND created_at > datetime('now', '-10 minutes') ORDER BY id DESC LIMIT 1"
  ).get(email, code, type);
  if (row) {
    db.prepare("UPDATE email_codes SET used = 1 WHERE id = ?").run(row.id);
    return true;
  }
  return false;
}

module.exports = { sendMail, sendVerifyCode, verifyCode };
