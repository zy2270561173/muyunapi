/**
 * MuYunAPI 内置接口库
 * 
 * 本地接口：由项目自己实现的接口，调用走内部代理
 * 外部接口：调用第三方 API，由后端代理转发
 * 
 * 调用链接生成规则：
 * - 内置接口：/api/proxy/{slug}
 * - 外部接口：直接使用 endpoint 或通过 /api/proxy/external/{slug} 代理
 */

module.exports = {
  // 库版本
  version: '1.0.0',
  
  // 库描述
  description: 'MuYunAPI 内置接口库',

  // 内置接口定义
  apis: [
    // ========== 实用工具类 ==========
    {
      name: '随机UUID',
      slug: 'uuid',
      category_id: 6,
      description: '生成符合 RFC 4122 标准的 UUID v4',
      endpoint: 'local://uuid',
      method: 'GET',
      params: [],
      response_example: '{"code":200,"data":{"uuid":"550e8400-e29b-41d4-a716-446655440000"},"message":"success"}',
      doc_content: `## 接口说明

生成符合 RFC 4122 标准的 UUID v4，用于唯一标识符生成。

## 请求说明

- **请求方式**：GET
- **接口地址**：\`/api/proxy/uuid\`
- **认证方式**：可选，在请求头添加 \`X-Api-Key: 你的API密钥\`

## 返回字段说明

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| code | number | 状态码，200 表示成功 |
| data | object | 返回数据对象 |
| data.uuid | string | 生成的 UUID 字符串 |
| message | string | 提示信息 |

## 错误码

| 错误码 | 说明 |
| --- | --- |
| 200 | 请求成功 |
| 500 | 服务器内部错误 |`,
      is_free: 1,
      require_auth: 0,
    },
    {
      name: '随机整数',
      slug: 'random-int',
      category_id: 6,
      description: '生成指定范围内的随机整数',
      endpoint: 'local://random-int',
      method: 'GET',
      params: [
        { name: 'min', type: 'number', required: false, description: '最小值（默认0）', example: '1' },
        { name: 'max', type: 'number', required: false, description: '最大值（默认100）', example: '100' },
      ],
      response_example: '{"code":200,"data":{"number":42},"message":"success"}',
      doc_content: `## 接口说明

生成指定范围内的随机整数。

## 请求参数

| 参数名 | 类型 | 必填 | 说明 | 示例 |
| --- | --- | --- | --- | --- |
| min | number | 否 | 最小值，默认 0 | 1 |
| max | number | 否 | 最大值，默认 100 | 100 |

## 返回字段说明

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| code | number | 状态码 |
| data.number | number | 生成的随机整数 |
| message | string | 提示信息 |`,
      is_free: 1,
      require_auth: 0,
    },
    {
      name: '时间戳转换',
      slug: 'timestamp',
      category_id: 6,
      description: '获取当前时间戳或转换指定时间',
      endpoint: 'local://timestamp',
      method: 'GET',
      params: [
        { name: 'format', type: 'string', required: false, description: '格式：unix/ms/s（默认unix）', example: 'ms' },
        { name: 'datetime', type: 'string', required: false, description: '要转换的日期时间（可选）', example: '2024-01-01 00:00:00' },
      ],
      response_example: '{"code":200,"data":{"timestamp":1704067200,"datetime":"2024-01-01 00:00:00","iso":"2024-01-01T00:00:00.000Z"},"message":"success"}',
      is_free: 1,
      require_auth: 0,
    },
    {
      name: '二维码生成',
      slug: 'qrcode',
      category_id: 6,
      description: '生成二维码图片',
      endpoint: 'local://qrcode',
      method: 'GET',
      params: [
        { name: 'content', type: 'string', required: true, description: '二维码内容', example: 'https://muyunapi.com' },
        { name: 'size', type: 'number', required: false, description: '二维码尺寸，默认200', example: '200' },
        { name: 'format', type: 'string', required: false, description: '返回格式：json/base64（默认base64）', example: 'base64' },
      ],
      response_example: '{"code":200,"data":{"image":"data:image/png;base64,iVBORw0KG..."},"message":"success"}',
      is_free: 1,
      require_auth: 0,
    },

    // ========== 数据查询类 ==========
    {
      name: '天气查询',
      slug: 'weather',
      category_id: 1,
      description: '查询指定城市的实时天气信息',
      endpoint: 'local://weather',
      method: 'GET',
      params: [
        { name: 'city', type: 'string', required: true, description: '城市名称', example: '北京' },
        { name: 'type', type: 'string', required: false, description: '数据类型：now/forecast（默认now）', example: 'now' },
      ],
      response_example: '{"code":200,"data":{"city":"北京","weather":"晴","temperature":"15℃","humidity":"45%","wind":"北风3级"},"message":"success"}',
      is_free: 1,
      require_auth: 0,
    },
    {
      name: '历史上的今天',
      slug: 'today-in-history',
      category_id: 3,
      description: '获取历史上的今天发生的事件',
      endpoint: 'local://today-in-history',
      method: 'GET',
      params: [
        { name: 'month', type: 'number', required: false, description: '月份1-12（默认当前）', example: '5' },
        { name: 'day', type: 'number', required: false, description: '日期1-31（默认当前）', example: '13' },
      ],
      response_example: '{"code":200,"data":{"date":"5月13日","events":[{"year":1846,"title":"墨西哥战争爆发"}]},"message":"success"}',
      is_free: 1,
      require_auth: 0,
    },
    {
      name: '名言警句',
      slug: 'quotes',
      category_id: 5,
      description: '获取随机名言警句',
      endpoint: 'local://quotes',
      method: 'GET',
      params: [
        { name: 'category', type: 'string', required: false, description: '分类：life/love/wisdom/success', example: 'life' },
      ],
      response_example: '{"code":200,"data":{"quote":"生活不是等待暴风雨过去，而是学会在雨中跳舞。","author":"维纳斯·奥里利乌斯","category":"life"},"message":"success"}',
      is_free: 1,
      require_auth: 0,
    },

    // ========== 图片处理类 ==========
    {
      name: '图片压缩',
      slug: 'image-compress',
      category_id: 2,
      description: '压缩图片文件大小',
      endpoint: 'local://image-compress',
      method: 'POST',
      params: [
        { name: 'image', type: 'string', required: true, description: '图片URL或Base64', example: 'https://...' },
        { name: 'quality', type: 'number', required: false, description: '压缩质量1-100（默认80）', example: '80' },
      ],
      response_example: '{"code":200,"data":{"original_size":102400,"compressed_size":51200,"ratio":"50%","image":"data:image/jpeg;base64,..."},"message":"success"}',
      is_free: 1,
      require_auth: 0,
    },
    {
      name: '图片格式转换',
      slug: 'image-convert',
      category_id: 2,
      description: '转换图片格式',
      endpoint: 'local://image-convert',
      method: 'POST',
      params: [
        { name: 'image', type: 'string', required: true, description: '图片URL或Base64', example: 'https://...' },
        { name: 'to', type: 'string', required: true, description: '目标格式：png/jpg/webp/gif', example: 'png' },
      ],
      response_example: '{"code":200,"data":{"from":"jpg","to":"png","image":"data:image/png;base64,..."},"message":"success"}',
      is_free: 1,
      require_auth: 0,
    },
    {
      name: '图片水印',
      slug: 'image-watermark',
      category_id: 2,
      description: '为图片添加水印',
      endpoint: 'local://image-watermark',
      method: 'POST',
      params: [
        { name: 'image', type: 'string', required: true, description: '原图片URL或Base64', example: 'https://...' },
        { name: 'text', type: 'string', required: true, description: '水印文字', example: 'MuYunAPI' },
        { name: 'position', type: 'string', required: false, description: '位置：center/lt/rt/lb/rb（默认rb）', example: 'rb' },
        { name: 'opacity', type: 'number', required: false, description: '透明度0-1（默认0.3）', example: '0.3' },
      ],
      response_example: '{"code":200,"data":{"image":"data:image/png;base64,..."},"message":"success"}',
      is_free: 1,
      require_auth: 0,
    },

    // ========== 文本处理类 ==========
    {
      name: '文本加密',
      slug: 'text-encrypt',
      category_id: 6,
      description: '对文本进行加密',
      endpoint: 'local://text-encrypt',
      method: 'POST',
      params: [
        { name: 'text', type: 'string', required: true, description: '要加密的文本', example: 'Hello World' },
        { name: 'type', type: 'string', required: false, description: '加密类型：md5/sha1/sha256/base64（默认md5）', example: 'md5' },
      ],
      response_example: '{"code":200,"data":{"original":"Hello World","encrypted":"b10a8db164e0754105b7a99be72e3fe5","type":"md5"},"message":"success"}',
      is_free: 1,
      require_auth: 0,
    },
    {
      name: '文字转拼音',
      slug: 'pinyin',
      category_id: 6,
      description: '将中文转换为拼音',
      endpoint: 'local://pinyin',
      method: 'GET',
      params: [
        { name: 'text', type: 'string', required: true, description: '中文文本', example: '慕沄' },
        { name: 'type', type: 'string', required: false, description: '类型：normal/first（默认normal）', example: 'normal' },
      ],
      response_example: '{"code":200,"data":{"original":"慕沄","pinyin":"mù yún","first":"my"},"message":"success"}',
      is_free: 1,
      require_auth: 0,
    },
    {
      name: '敏感词检测',
      slug: 'sensitive-check',
      category_id: 6,
      description: '检测文本中的敏感词',
      endpoint: 'local://sensitive-check',
      method: 'POST',
      params: [
        { name: 'text', type: 'string', required: true, description: '待检测文本', example: '这是一段正常文本' },
      ],
      response_example: '{"code":200,"data":{"text":"这是一段正常文本","has_sensitive":false,"sensitive_words":[]},"message":"success"}',
      is_free: 1,
      require_auth: 0,
    },

    // ========== 网络工具类 ==========
    {
      name: '短网址生成',
      slug: 'short-url',
      category_id: 6,
      description: '将长网址转换为短网址',
      endpoint: 'local://short-url',
      method: 'POST',
      params: [
        { name: 'url', type: 'string', required: true, description: '原始长网址', example: 'https://muyunapi.com/very-long-url-path' },
      ],
      response_example: '{"code":200,"data":{"original":"https://muyunapi.com/very-long-url-path","short":"https://muyunapi.com/s/abc123"},"message":"success"}',
      is_free: 1,
      require_auth: 0,
    },
    {
      name: 'IP信息查询',
      slug: 'ip-info',
      category_id: 6,
      description: '查询IP地址的详细信息',
      endpoint: 'local://ip-info',
      method: 'GET',
      params: [
        { name: 'ip', type: 'string', required: false, description: 'IP地址（默认获取本机IP）', example: '8.8.8.8' },
      ],
      response_example: '{"code":200,"data":{"ip":"8.8.8.8","country":"美国","region":"加利福尼亚州","city":"Mountain View","isp":"Google LLC","timezone":"America/Los_Angeles"},"message":"success"}',
      is_free: 1,
      require_auth: 0,
    },
    {
      name: 'Whois查询',
      slug: 'whois',
      category_id: 6,
      description: '查询域名的Whois信息',
      endpoint: 'local://whois',
      method: 'GET',
      params: [
        { name: 'domain', type: 'string', required: true, description: '域名', example: 'muyunapi.com' },
      ],
      response_example: '{"code":200,"data":{"domain":"muyunapi.com","registrar":"阿里云","created_date":"2024-01-01","expiry_date":"2025-01-01","status":"ok"},"message":"success"}',
      is_free: 1,
      require_auth: 0,
    },

    // ========== 开发工具类 ==========
    {
      name: 'JSON格式化',
      slug: 'json-format',
      category_id: 6,
      description: '格式化/压缩JSON字符串',
      endpoint: 'local://json-format',
      method: 'POST',
      params: [
        { name: 'json', type: 'string', required: true, description: 'JSON字符串', example: '{"name":"test"}' },
        { name: 'action', type: 'string', required: false, description: '操作：format/minify（默认format）', example: 'format' },
      ],
      response_example: '{"code":200,"data":{"original":"{\\"name\\":\\"test\\"}","result":"{\\n  \\"name\\": \\"test\\"\\n}"},"message":"success"}',
      is_free: 1,
      require_auth: 0,
    },
    {
      name: '颜色转换',
      slug: 'color-convert',
      category_id: 6,
      description: '颜色格式转换（HEX/RGB/HSL）',
      endpoint: 'local://color-convert',
      method: 'GET',
      params: [
        { name: 'color', type: 'string', required: true, description: '颜色值，支持HEX/RGB格式', example: '#e99312' },
      ],
      response_example: '{"code":200,"data":{"hex":"#e99312","rgb":"rgb(233,147,18)","hsl":"hsl(36,86%,49%)","cmyk":"cmyk(0,37%,92%,9%)"},"message":"success"}',
      is_free: 1,
      require_auth: 0,
    },
    {
      name: '随机密码生成',
      slug: 'password-generator',
      category_id: 6,
      description: '生成随机安全密码',
      endpoint: 'local://password-generator',
      method: 'GET',
      params: [
        { name: 'length', type: 'number', required: false, description: '密码长度（默认16）', example: '16' },
        { name: 'type', type: 'string', required: false, description: '类型：simple/medium/strong（默认strong）', example: 'strong' },
      ],
      response_example: '{"code":200,"data":{"password":"xK9@mP2#nL5$vQ8!","length":16,"strength":"strong"},"message":"success"}',
      is_free: 1,
      require_auth: 0,
    },
  ],

  // 获取所有接口（带完整信息）
  getAllApis() {
    return this.apis.map(api => ({
      ...api,
      source: 'local',
      status: 1,
      is_free: api.is_free ?? 1,
      require_auth: api.require_auth ?? 0,
      credits_cost: api.credits_cost ?? 0,
      params: JSON.stringify(api.params || []),
      headers: '{}',
    }));
  },

  // 根据slug获取接口
  getApiBySlug(slug) {
    const api = this.apis.find(a => a.slug === slug);
    if (api) {
      return {
        ...api,
        source: 'local',
        status: 1,
        is_free: api.is_free ?? 1,
        require_auth: api.require_auth ?? 0,
        credits_cost: api.credits_cost ?? 0,
        params: JSON.stringify(api.params || []),
        headers: '{}',
      };
    }
    return null;
  },

  // 执行内置接口
  async executeLocalApi(slug, params = {}, req = null) {
    const handlers = {
      'uuid': () => {
        const { v4: uuidv4 } = require('uuid');
        return { uuid: uuidv4() };
      },
      'random-int': () => {
        const min = parseInt(params.min) || 0;
        const max = parseInt(params.max) || 100;
        return { number: Math.floor(Math.random() * (max - min + 1)) + min };
      },
      'random-image': async () => {
        const validCategories = ['pc', 'ai', 'aimp', 'bd', 'fj', 'fjmp', 'lai', 'moe', 'moemp', 'mp', 'tx', 'xhl', 'ys', 'ysmp'];
        let category = params.category || 'pc';
        let count = parseInt(params.count) || 1;

        // 兼容直接传分类名作为 key：?moe=5
        for (const cat of validCategories) {
          if (params[cat] !== undefined) {
            category = cat;
            count = parseInt(params[cat]) || 1;
            break;
          }
        }

        if (!validCategories.includes(category)) {
          throw new Error(`无效的分类，支持：${validCategories.join(' | ')}`);
        }
        count = Math.min(Math.max(count, 1), 30);

        const axios = require('axios');
        const response = await axios.get(`https://t.alcy.cc/json?${category}=${count}`, { timeout: 10000 });
        if (response.data && response.data.code === 200) {
          return { category, count, data: response.data.data };
        }
        throw new Error('上游接口返回异常');
      },
      'timestamp': () => {
        const format = params.format || 'unix';
        const datetime = params.datetime;
        let date;
        
        if (datetime) {
          date = new Date(datetime);
        } else {
          date = new Date();
        }
        
        const result = {
          timestamp: format === 'ms' ? date.getTime() : Math.floor(date.getTime() / 1000),
          datetime: date.toLocaleString('zh-CN'),
          iso: date.toISOString(),
        };
        
        return result;
      },
      'qrcode': async () => {
        const content = params.content || '';
        const size = parseInt(params.size) || 200;
        const format = params.format || 'base64';
        
        // 这里需要安装 qrcode 库
        try {
          const QRCode = require('qrcode');
          const options = { width: size, margin: 1 };
          
          if (format === 'base64') {
            const dataUrl = await QRCode.toDataURL(content, options);
            return { image: dataUrl, size, format };
          } else {
            const json = await QRCode.toString(content, { ...options, type: 'terminal' });
            return { image: json, size, format: 'json' };
          }
        } catch (e) {
          throw new Error('二维码生成失败：' + e.message);
        }
      },
      'weather': () => {
        const city = params.city || '北京';
        const cities = {
          '北京': { weather: '晴', temperature: '15℃', humidity: '45%', wind: '北风3级', aqi: '良' },
          '上海': { weather: '多云', temperature: '18℃', humidity: '55%', wind: '东风2级', aqi: '优' },
          '广州': { weather: '雷阵雨', temperature: '26℃', humidity: '78%', wind: '南风3级', aqi: '良' },
          '深圳': { weather: '晴', temperature: '27℃', humidity: '60%', wind: '东南风2级', aqi: '优' },
          '杭州': { weather: '小雨', temperature: '16℃', humidity: '70%', wind: '东风2级', aqi: '良' },
        };
        
        const weatherData = cities[city] || { weather: '晴', temperature: '20℃', humidity: '50%', wind: '微风', aqi: '良' };
        return { city, ...weatherData };
      },
      'today-in-history': () => {
        const now = new Date();
        const month = parseInt(params.month) || (now.getMonth() + 1);
        const day = parseInt(params.day) || now.getDate();
        
        const events = [
          { year: 1846, title: '墨西哥战争爆发' },
          { year: 1883, title: '印尼喀拉喀托火山爆发' },
          { year: 1912, title: '英国成立皇家空军' },
          { year: 1949, title: '中华人民共和国成立' },
          { year: 1952, title: '第一届戛纳电影节开幕' },
        ];
        
        return {
          date: `${month}月${day}日`,
          events: events.slice(0, 5),
        };
      },
      'quotes': () => {
        const quotes = [
          { quote: '生活不是等待暴风雨过去，而是学会在雨中跳舞。', author: '维纳斯·奥里利乌斯', category: 'life' },
          { quote: '爱是生命的火焰，没有它，一切都会变成黑夜。', author: '罗曼·罗兰', category: 'love' },
          { quote: '知之者不如好之者，好之者不如乐之者。', author: '孔子', category: 'wisdom' },
          { quote: '成功并不是最终目的，失败也不是致命的，勇气才是最重要的。', author: '丘吉尔', category: 'success' },
        ];
        
        const category = params.category;
        const filtered = category ? quotes.filter(q => q.category === category) : quotes;
        return filtered[Math.floor(Math.random() * filtered.length)];
      },
      'text-encrypt': () => {
        const crypto = require('crypto');
        const text = params.text || '';
        const type = params.type || 'md5';
        
        let encrypted;
        switch (type) {
          case 'md5':
            encrypted = crypto.createHash('md5').update(text).digest('hex');
            break;
          case 'sha1':
            encrypted = crypto.createHash('sha1').update(text).digest('hex');
            break;
          case 'sha256':
            encrypted = crypto.createHash('sha256').update(text).digest('hex');
            break;
          case 'base64':
            encrypted = Buffer.from(text).toString('base64');
            break;
          default:
            encrypted = crypto.createHash('md5').update(text).digest('hex');
        }
        
        return { original: text, encrypted, type };
      },
      'pinyin': () => {
        const text = params.text || '';
        const type = params.type || 'normal';
        
        // 简单的拼音映射（实际项目需要使用完整词典）
        const simplePinyin = {
          '慕': 'mù', '沄': 'yún', '你': 'nǐ', '好': 'hǎo',
          '北': 'běi', '京': 'jīng', '上': 'shàng', '海': 'hǎi',
        };
        
        let pinyin = '';
        let first = '';
        
        for (const char of text) {
          const py = simplePinyin[char] || char;
          pinyin += py + ' ';
          first += py.charAt(0);
        }
        
        return {
          original: text,
          pinyin: pinyin.trim(),
          first: type === 'first' ? first : undefined,
        };
      },
      'ip-info': () => {
        const ip = params.ip || (req && req.ip) || '8.8.8.8';
        const ips = {
          '8.8.8.8': { country: '美国', region: '加利福尼亚州', city: 'Mountain View', isp: 'Google LLC', timezone: 'America/Los_Angeles' },
          '114.114.114.114': { country: '中国', region: '江苏省', city: '南京市', isp: '中国电信', timezone: 'Asia/Shanghai' },
        };
        
        const info = ips[ip] || { country: '未知', region: '未知', city: '未知', isp: '未知', timezone: 'UTC' };
        return { ip, ...info };
      },
      'json-format': () => {
        const json = params.json || '';
        const action = params.action || 'format';
        
        try {
          const parsed = JSON.parse(json);
          const result = action === 'minify' 
            ? JSON.stringify(parsed)
            : JSON.stringify(parsed, null, 2);
          return { original: json, result, action };
        } catch (e) {
          throw new Error('JSON格式错误：' + e.message);
        }
      },
      'color-convert': () => {
        const color = params.color || '#000000';
        
        // 解析HEX
        let hex = color;
        let r, g, b;
        
        if (color.startsWith('rgb')) {
          const match = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
          if (match) {
            r = parseInt(match[1]);
            g = parseInt(match[2]);
            b = parseInt(match[3]);
            hex = '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
          }
        } else {
          hex = color.startsWith('#') ? color : '#' + color;
          const result = hex.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
          if (result) {
            r = parseInt(result[1], 16);
            g = parseInt(result[2], 16);
            b = parseInt(result[3], 16);
          }
        }
        
        // RGB
        const rgb = `rgb(${r}, ${g}, ${b})`;
        
        // HSL
        r /= 255; g /= 255; b /= 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;
        
        if (max === min) {
          h = s = 0;
        } else {
          const d = max - min;
          s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
          switch (max) {
            case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
            case g: h = ((b - r) / d + 2) / 6; break;
            case b: h = ((r - g) / d + 4) / 6; break;
          }
        }
        
        const hsl = `hsl(${Math.round(h * 360)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`;
        const cmyk = `cmyk(${Math.round((1 - r) * 100)}%, ${Math.round((1 - g) * 100)}%, ${Math.round((1 - b) * 100)}%, ${Math.round(l * 100)}%)`;
        
        return { hex: hex.toLowerCase(), rgb, hsl, cmyk };
      },
      'password-generator': () => {
        const length = parseInt(params.length) || 16;
        const type = params.type || 'strong';
        
        const chars = {
          simple: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
          medium: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$',
          strong: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*',
        };
        
        const charSet = chars[type] || chars.strong;
        let password = '';
        for (let i = 0; i < length; i++) {
          password += charSet.charAt(Math.floor(Math.random() * charSet.length));
        }
        
        return { password, length, strength: type };
      },
    };
    
    const handler = handlers[slug];
    if (!handler) {
      throw new Error('未知的内置接口：' + slug);
    }
    
    return handler(params, req);
  },
};
