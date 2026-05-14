// ==MuYunAPI==
// @name         QQ号信息查询 (BugPk)
// @slug         bugpk_qq_info
// @description  通过BugPk接口查询QQ号的详细信息，包括昵称、邮箱和头像链接
// @category     2
// @method       GET
// @requireAuth  false
// @isFree       true
// @theme        both
// @params       [{"name":"qq","type":"string","required":true,"description":"需要查询的QQ号","example":"2823280574"}]
// @response     {"code":200,"data":{"qq":"2823280574","name":"江十二","email":"2823280574@qq.com","avatar":"https://q2.qlogo.cn/headimg_dl?dst_uin=2823280574&spec=640"}}
// ==/MuYunAPI==

/**
 * QQ号信息查询 (BugPk版)
 * 文档：https://api.bugpk.com/doc-qq_info.html
 * 
 * 参数说明：
 * - qq: 需要查询的QQ号（必填）
 * 
 * 调用示例：
 * GET https://your-domain/api/bugpk_qq_info?qq=2823280574
 */

const axios = require('axios');

module.exports = {
  async execute(slug, params, req) {
    // 从 params 中提取 QQ 号
    const qq = params && params.qq;

    // 验证 QQ 号是否提供
    if (!qq) {
      return {
        code: 400,
        message: '缺少必填参数：qq',
        data: null,
      };
    }

    // 简单的 QQ 号格式校验（5-11位纯数字）
    const qqRegex = /^[1-9][0-9]{4,10}$/;
    if (!qqRegex.test(qq)) {
      return {
        code: 400,
        message: 'QQ号格式不正确，请输入5-11位的数字',
        data: null,
      };
    }

    try {
      // 调用上游 API (BugPk)
      const response = await axios.get(`https://api.bugpk.com/api/qq_info`, {
        params: { qq: qq }, // 将 qq 作为查询参数
        timeout: 10000,
      });

      // 根据 BugPk 文档，返回格式为 { success: true, msg: "查询成功！", data: {...} }
      if (response.data && response.data.success === true) {
        const apiData = response.data.data;
        return {
          code: 200,
          data: {
            qq: apiData.qq,
            name: apiData.name,
            email: apiData.email,
            avatar: apiData.avatar
          },
          message: 'success',
        };
      } else {
        return {
          code: 500,
          message: response.data.msg || '上游接口查询失败',
          data: null,
        };
      }
    } catch (e) {
      return {
        code: 500,
        message: '请求失败：' + (e.message || '未知错误'),
        data: null,
      };
    }
  }
};