const express = require('express');
const router = express.Router();
const axios = require('axios');
const db = require('../db/init');
const { auth, optionalAuth } = require('../middleware/auth');
const loader = require('../libraries/loader');

// 获取所有分类
router.get('/categories', (req, res) => {
  const cats = db.prepare('SELECT c.*, COUNT(a.id) as api_count FROM categories c LEFT JOIN apis a ON c.id = a.category_id AND a.status = 1 GROUP BY c.id ORDER BY c.sort_order').all();
  res.json({ code: 200, data: cats });
});

// 获取API列表（支持分页、分类、搜索）
router.get('/', optionalAuth, (req, res) => {
  const { category, keyword, page = 1, limit = 12, free } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  let where = 'WHERE a.status = 1';
  const params = [];

  if (category && category !== 'all') {
    where += ' AND a.category_id = ?';
    params.push(parseInt(category));
  }
  if (keyword) {
    where += ' AND (a.name LIKE ? OR a.description LIKE ?)';
    params.push(`%${keyword}%`, `%${keyword}%`);
  }
  if (free === '1') {
    where += ' AND a.is_free = 1';
  }

  const total = db.prepare(`SELECT COUNT(*) as cnt FROM apis a ${where}`).get(...params).cnt;
  const apis = db.prepare(`
    SELECT a.*, c.name as category_name, c.icon as category_icon,
           (SELECT AVG(response_time) FROM api_speed_logs WHERE api_id = a.id AND tested_at > datetime('now', '-1 hour')) as avg_speed
    FROM apis a
    LEFT JOIN categories c ON a.category_id = c.id
    ${where}
    ORDER BY a.sort_order DESC, a.calls_count DESC, a.id DESC
    LIMIT ? OFFSET ?
  `).all(...params, parseInt(limit), offset);

  // 如果用户已登录，标记收藏状态
  if (req.user) {
    const favIds = new Set(
      db.prepare('SELECT api_id FROM favorites WHERE user_id = ?').all(req.user.id).map(f => f.api_id)
    );
    apis.forEach(a => { a.is_favorited = favIds.has(a.id); });
  }

  res.json({ code: 200, data: { list: apis, total, page: parseInt(page), limit: parseInt(limit) } });
});

// 获取API详情
router.get('/:slug', optionalAuth, (req, res) => {
  const api = db.prepare(`
    SELECT a.*, c.name as category_name, c.icon as category_icon,
           u.nickname as creator_name,
           COALESCE(a.doc_content, '') as doc_content
    FROM apis a
    LEFT JOIN categories c ON a.category_id = c.id
    LEFT JOIN users u ON a.created_by = u.id
    WHERE a.slug = ? AND a.status = 1
  `).get(req.params.slug);

  if (!api) return res.json({ code: 404, message: 'API不存在' });

  // 最近速度记录
  api.speed_records = db.prepare('SELECT response_time, status_code, success, tested_at FROM api_speed_logs WHERE api_id = ? ORDER BY tested_at DESC LIMIT 10').all(api.id);
  api.avg_speed = api.speed_records.length > 0
    ? Math.round(api.speed_records.reduce((s, r) => s + (r.response_time || 0), 0) / api.speed_records.length)
    : null;
  api.params = JSON.parse(api.params || '[]');
  api.headers = JSON.parse(api.headers || '{}');

  if (req.user) {
    api.is_favorited = !!db.prepare('SELECT id FROM favorites WHERE user_id = ? AND api_id = ?').get(req.user.id, api.id);
  }

  res.json({ code: 200, data: api });
});

// 收藏/取消收藏
router.post('/:id/favorite', auth, (req, res) => {
  const apiId = parseInt(req.params.id);
  const existing = db.prepare('SELECT id FROM favorites WHERE user_id = ? AND api_id = ?').get(req.user.id, apiId);
  if (existing) {
    db.prepare('DELETE FROM favorites WHERE id = ?').run(existing.id);
    res.json({ code: 200, message: '已取消收藏', data: { favorited: false } });
  } else {
    db.prepare('INSERT INTO favorites (user_id, api_id) VALUES (?, ?)').run(req.user.id, apiId);
    res.json({ code: 200, message: '收藏成功', data: { favorited: true } });
  }
});

// 测试调用API
router.post('/:slug/test', optionalAuth, async (req, res) => {
  const api = db.prepare('SELECT * FROM apis WHERE slug = ? AND status = 1').get(req.params.slug);
  if (!api) return res.json({ code: 404, message: 'API不存在' });

  const { params = {} } = req.body;
  const startTime = Date.now();

  // 内置接口直接执行
  if (api.source === 'local') {
    try {
      const result = await loader.execute(api.slug, params, req);
      const responseTime = Date.now() - startTime;
      
      // 记录速度日志
      db.prepare('INSERT INTO api_speed_logs (api_id, response_time, status_code, success) VALUES (?, ?, ?, 1)')
        .run(api.id, responseTime, 200);
      
      // 更新调用次数
      db.prepare('UPDATE apis SET calls_count = calls_count + 1 WHERE id = ?').run(api.id);
      
      // 记录调用日志
      if (req.user) {
        db.prepare('INSERT INTO call_logs (api_id, user_id, ip, method, params, response_code, response_time) VALUES (?, ?, ?, ?, ?, ?, ?)')
          .run(api.id, req.user.id, req.ip, api.method, JSON.stringify(params), 200, responseTime);
      }

      res.json({
        code: 200,
        data: {
          response_time: responseTime,
          status_code: 200,
          data: result,
        }
      });
    } catch (e) {
      const responseTime = Date.now() - startTime;
      db.prepare('INSERT INTO api_speed_logs (api_id, response_time, status_code, success) VALUES (?, ?, ?, 0)')
        .run(api.id, responseTime, 500);
      res.json({
        code: 200,
        data: {
          response_time: responseTime,
          status_code: 500,
          error: e.message,
        }
      });
    }
    return;
  }

  // 外部接口通过代理调用
  try {
    let url = api.endpoint;
    let requestConfig = {
      method: api.method.toLowerCase(),
      timeout: 10000,
      headers: { 'User-Agent': 'MuYunAPI-Tester/1.0' },
    };

    const parsedHeaders = JSON.parse(api.headers || '{}');
    Object.assign(requestConfig.headers, parsedHeaders);

    if (api.method === 'GET') {
      const queryParams = new URLSearchParams(params).toString();
      if (queryParams) url += (url.includes('?') ? '&' : '?') + queryParams;
    } else {
      requestConfig.data = params;
    }
    requestConfig.url = url;

    const response = await axios(requestConfig);
    const responseTime = Date.now() - startTime;

    // 记录速度日志
    db.prepare('INSERT INTO api_speed_logs (api_id, response_time, status_code, success) VALUES (?, ?, ?, 1)')
      .run(api.id, responseTime, response.status);

    // 更新调用次数
    db.prepare('UPDATE apis SET calls_count = calls_count + 1 WHERE id = ?').run(api.id);

    // 记录调用日志
    if (req.user) {
      db.prepare('INSERT INTO call_logs (api_id, user_id, ip, method, params, response_code, response_time) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .run(api.id, req.user.id, req.ip, api.method, JSON.stringify(params), response.status, responseTime);
    }

    res.json({
      code: 200,
      data: {
        response_time: responseTime,
        status_code: response.status,
        data: response.data,
        headers: response.headers,
      }
    });
  } catch (e) {
    const responseTime = Date.now() - startTime;
    db.prepare('INSERT INTO api_speed_logs (api_id, response_time, status_code, success) VALUES (?, ?, ?, 0)')
      .run(api.id, responseTime, e.response?.status || 0);
    res.json({
      code: 200,
      data: {
        response_time: responseTime,
        status_code: e.response?.status || 0,
        error: e.message,
        data: e.response?.data || null,
      }
    });
  }
});

// 自动检测API速度
router.get('/:slug/ping', async (req, res) => {
  const api = db.prepare('SELECT * FROM apis WHERE slug = ? AND status = 1').get(req.params.slug);
  if (!api) return res.json({ code: 404, message: 'API不存在' });

  const startTime = Date.now();
  try {
    await axios.get(api.endpoint, { timeout: 8000, validateStatus: () => true });
    const rt = Date.now() - startTime;
    db.prepare('INSERT INTO api_speed_logs (api_id, response_time, status_code, success) VALUES (?, ?, 200, 1)').run(api.id, rt);
    res.json({ code: 200, data: { response_time: rt, status: 'online' } });
  } catch (e) {
    const rt = Date.now() - startTime;
    db.prepare('INSERT INTO api_speed_logs (api_id, response_time, status_code, success) VALUES (?, ?, 0, 0)').run(api.id, rt);
    res.json({ code: 200, data: { response_time: rt, status: 'offline', error: e.message } });
  }
});

// 生成调用示例代码
router.get('/:slug/examples', (req, res) => {
  const api = db.prepare('SELECT * FROM apis WHERE slug = ? AND status = 1').get(req.params.slug);
  if (!api) return res.json({ code: 404, message: 'API不存在' });

  const params = JSON.parse(api.params || '[]');
  const exampleParams = {};
  params.forEach(p => { if (p.example) exampleParams[p.name] = p.example; });

  const baseUrl = `${req.protocol}://${req.get('host')}`;
  
  // 根据接口来源生成不同的调用链接
  let apiUrl;
  if (api.source === 'local') {
    // 内置接口：通过代理调用
    apiUrl = `${baseUrl}/api/proxy/${api.slug}`;
  } else {
    // 外部接口：通过外部代理调用
    apiUrl = `${baseUrl}/api/proxy/external/${api.slug}`;
  }

  const queryStr = Object.keys(exampleParams).length
    ? '?' + new URLSearchParams(exampleParams).toString()
    : '';

  const examples = {
    curl: api.method === 'GET'
      ? `curl -X GET "${apiUrl}${queryStr}" \\\n  -H "Content-Type: application/json"`
      : `curl -X ${api.method} "${apiUrl}" \\\n  -H "Content-Type: application/json" \\\n  -d '${JSON.stringify(exampleParams, null, 2)}'`,

    javascript: api.method === 'GET'
      ? `fetch("${apiUrl}${queryStr}")
  .then(res => res.json())
  .then(data => console.log(data))
  .catch(err => console.error(err));`
      : `fetch("${apiUrl}", {
  method: "${api.method}",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(${JSON.stringify(exampleParams, null, 2)})
})
  .then(res => res.json())
  .then(data => console.log(data));`,

    python: api.method === 'GET'
      ? `import requests

url = "${apiUrl}"
params = ${JSON.stringify(exampleParams, null, 2)}
response = requests.get(url, params=params)
print(response.json())`
      : `import requests

url = "${apiUrl}"
data = ${JSON.stringify(exampleParams, null, 2)}
response = requests.${api.method.toLowerCase()}(url, json=data)
print(response.json())`,

    php: api.method === 'GET'
      ? `<?php
$url = "${apiUrl}${queryStr}";
$response = file_get_contents($url);
$data = json_decode($response, true);
print_r($data);
?>`
      : `<?php
$url = "${apiUrl}";
$data = ${JSON.stringify(exampleParams)};
$options = [
    'http' => [
        'method' => '${api.method}',
        'header' => 'Content-type: application/json',
        'content' => json_encode($data)
    ]
];
$context = stream_context_create($options);
$response = file_get_contents($url, false, $context);
print_r(json_decode($response, true));
?>`,

    nodejs: api.method === 'GET'
      ? `const axios = require('axios');

axios.get("${apiUrl}", {
  params: ${JSON.stringify(exampleParams, null, 2)}
}).then(res => console.log(res.data));`
      : `const axios = require('axios');

axios.${api.method.toLowerCase()}("${apiUrl}", ${JSON.stringify(exampleParams, null, 2)})
  .then(res => console.log(res.data));`,

    cpp: api.method === 'GET'
      ? `#include <iostream>
#include <curl/curl.h>
#include <nlohmann/json.hpp>

using json = nlohmann::json;

int main() {
    CURL *curl = curl_easy_init();
    if(curl) {
        std::string response;
        curl_easy_setopt(curl, CURLOPT_URL, "${apiUrl}${queryStr}");
        curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, [](char* ptr, size_t size, size_t nmemb, std::string* data) {
            data->append(ptr, size * nmemb);
            return size * nmemb;
        });
        curl_easy_setopt(curl, CURLOPT_WRITEDATA, &response);
        curl_easy_perform(curl);
        auto data = json::parse(response);
        std::cout << data.dump() << std::endl;
        curl_easy_cleanup(curl);
    }
    return 0;
}`
      : `#include <iostream>
#include <curl/curl.h>
#include <nlohmann/json.hpp>

using json = nlohmann::json;

int main() {
    CURL *curl = curl_easy_init();
    if(curl) {
        json payload = ${JSON.stringify(exampleParams, null, 4)};
        std::string postData = payload.dump();
        
        std::string response;
        struct curl_slist *headers = nullptr;
        headers = curl_slist_append(headers, "Content-Type: application/json");
        
        curl_easy_setopt(curl, CURLOPT_URL, "${apiUrl}");
        curl_easy_setopt(curl, CURLOPT_POSTFIELDS, postData.c_str());
        curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
        curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, [](char* ptr, size_t size, size_t nmemb, std::string* data) {
            data->append(ptr, size * nmemb);
            return size * nmemb;
        });
        curl_easy_setopt(curl, CURLOPT_WRITEDATA, &response);
        curl_easy_perform(curl);
        auto data = json::parse(response);
        std::cout << data.dump() << std::endl;
        curl_slist_free_all(headers);
        curl_easy_cleanup(curl);
    }
    return 0;
}`,

    java: api.method === 'GET'
      ? `import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

public class ApiExample {
    public static void main(String[] args) throws Exception {
        HttpClient client = HttpClient.newHttpClient();
        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create("${apiUrl}${queryStr}"))
            .header("Content-Type", "application/json")
            .GET()
            .build();
        
        HttpResponse<String> response = client.send(request,
            HttpResponse.BodyHandlers.ofString());
        System.out.println(response.body());
    }
}`
      : `import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.http.HttpRequest.BodyPublishers;

public class ApiExample {
    public static void main(String[] args) throws Exception {
        HttpClient client = HttpClient.newHttpClient();
        String jsonBody = "${JSON.stringify(exampleParams).replace(/"/g, '\\"')}";
        
        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create("${apiUrl}"))
            .header("Content-Type", "application/json")
            .POST(BodyPublishers.ofString(jsonBody))
            .build();
        
        HttpResponse<String> response = client.send(request,
            HttpResponse.BodyHandlers.ofString());
        System.out.println(response.body());
    }
}`,
  };

  res.json({ code: 200, data: { examples, source: api.source, apiUrl } });
});

module.exports = router;
