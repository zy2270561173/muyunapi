const express = require('express');
const router = express.Router();
const axios = require('axios');
const db = require('../db/init');
const loader = require('../libraries/loader');  // 动态脚本加载器
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../middleware/auth');

// 获取当前请求的用户（从 JWT token）
function getUserFromRequest(req) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return db.prepare('SELECT id, uid, username, role, status, credits FROM users WHERE id = ?').get(decoded.id);
  } catch (e) { return null; }
}

// 扣除用户积分
function deductCredits(userId, apiId, apiName, creditsCost) {
  if (creditsCost <= 0) return true; // 免费接口不扣积分
  
  const user = db.prepare('SELECT credits FROM users WHERE id = ? AND status = 1').get(userId);
  if (!user) return false;
  
  if (user.credits < creditsCost) return false; // 积分不足
  
  // 扣除积分
  db.prepare('UPDATE users SET credits = credits - ? WHERE id = ?').run(creditsCost, userId);
  
  // 记录积分消费
  db.prepare('INSERT INTO credit_transactions (user_id, amount, type, description) VALUES (?, ?, ?, ?)')
    .run(userId, -creditsCost, 'consume', `调用API: ${apiName}`);
  
  return true;
}

// API代理转发（自动加上用户鉴权等）
router.all('/:slug', async (req, res) => {
  const { slug } = req.params;
  const startTime = Date.now();
  let apiId = null;
  let apiName = null;
  let creditsCost = 0;
  let userId = null;

  // 获取当前用户
  const user = getUserFromRequest(req);
  if (user && user.status === 1) userId = user.id;

  // 1. 先检查是否为内置接口（动态脚本）
  const localApi = loader.getApiBySlug(slug);
  if (localApi) {
    apiName = localApi.name;
    apiId = 0; // 内置接口标记
    creditsCost = localApi.credits_cost || 0;
    
    // 检查积分
    if (userId && creditsCost > 0) {
      const success = deductCredits(userId, apiId, apiName, creditsCost);
      if (!success) {
        return res.json({ code: 402, message: '积分不足，请充值', error: 'INSUFFICIENT_CREDITS' });
      }
    }
    
    const params = req.method === 'GET' ? req.query : req.body;
    try {
      const data = await loader.execute(slug, params, req);
      
      // 记录调用（内置接口）
      if (userId) {
        db.prepare('INSERT INTO call_logs (api_id, user_id, ip, method, params, response_code, response_time) VALUES (?, ?, ?, ?, ?, ?, ?)')
          .run(apiId, userId, req.ip, req.method, JSON.stringify(params), 200, Date.now() - startTime);
      }
      
      return res.json({ code: 200, data, message: 'success' });
    } catch (e) {
      console.error(`[proxy] 内置接口 ${slug} 执行失败:`, e.message);
      return res.json({ 
        code: 500, 
        message: e.message,
        error: 'SCRIPT_ERROR',
        hint: '请联系管理员检查内置脚本配置'
      });
    }
  }

  // 2. 非内置接口，查询数据库
  const api = db.prepare('SELECT * FROM apis WHERE slug = ? AND status = 1').get(slug);
  if (!api) return res.json({ code: 404, message: 'API不存在或已下线' });

  apiId = api.id;
  apiName = api.name;
  creditsCost = api.credits_cost || 0;
  
  // 检查积分
  if (userId && creditsCost > 0) {
    const success = deductCredits(userId, apiId, apiName, creditsCost);
    if (!success) {
      return res.json({ code: 402, message: '积分不足，请充值', error: 'INSUFFICIENT_CREDITS' });
    }
  }

  const params = req.method === 'GET' ? req.query : req.body;
  
  try {
    let url = api.endpoint;
    
    // 如果是 local:// 协议，调用动态脚本接口
    if (url && url.startsWith('local://')) {
      const localSlug = url.replace('local://', '');
      try {
        const data = await loader.execute(localSlug, params, req);
        
        // 记录调用
        if (userId) {
          db.prepare('INSERT INTO call_logs (api_id, user_id, ip, method, params, response_code, response_time) VALUES (?, ?, ?, ?, ?, ?, ?)')
            .run(apiId, userId, req.ip, req.method, JSON.stringify(params), 200, Date.now() - startTime);
        }
        
        return res.json({ code: 200, data, message: 'success' });
      } catch (e) {
        return res.json({ code: 500, message: '请求失败', error: e.message });
      }
    }
    
    const config = {
      method: api.method.toLowerCase(),
      timeout: 15000,
      headers: { 'User-Agent': 'MuYunAPI-Proxy/1.0' },
    };

    // 合并自定义请求头
    const customHeaders = JSON.parse(api.headers || '{}');
    Object.assign(config.headers, customHeaders);

    if (api.method === 'GET') {
      const qs = new URLSearchParams(params).toString();
      if (qs) url += (url.includes('?') ? '&' : '?') + qs;
      config.url = url;
    } else {
      config.url = url;
      config.data = params;
    }

    const response = await axios(config);
    const rt = Date.now() - startTime;
    db.prepare('UPDATE apis SET calls_count = calls_count + 1 WHERE id = ?').run(api.id);
    db.prepare('INSERT INTO api_speed_logs (api_id, response_time, status_code, success) VALUES (?, ?, ?, 1)').run(api.id, rt, response.status);
    
    // 记录调用
    if (userId) {
      db.prepare('INSERT INTO call_logs (api_id, user_id, ip, method, params, response_code, response_time) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .run(apiId, userId, req.ip, req.method, JSON.stringify(params), 200, rt);
    }

    res.json({
      code: 200,
      data: response.data,
      meta: { response_time: rt, status_code: response.status }
    });
  } catch (e) {
    const rt = Date.now() - startTime;
    db.prepare('INSERT INTO api_speed_logs (api_id, response_time, status_code, success) VALUES (?, ?, ?, 0)').run(api.id, rt, e.response?.status || 0);
    
    // 记录失败的调用
    if (userId) {
      db.prepare('INSERT INTO call_logs (api_id, user_id, ip, method, params, response_code, response_time) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .run(apiId, userId, req.ip, req.method, JSON.stringify(params), 500, rt);
    }
    
    res.json({ code: 500, message: '请求失败', error: e.message });
  }
});

module.exports = router;
