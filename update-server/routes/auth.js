/**
 * 管理员认证
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { prepare } = require('../db/init');

const JWT_SECRET = process.env.JWT_SECRET || 'muyun-update-secret';

// 登录
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.json({ code: 400, message: '请输入用户名和密码' });
  }
  
  try {
    const admin = prepare('SELECT * FROM admins WHERE username = ?').get(username);
    
    if (!admin) {
      return res.json({ code: 401, message: '用户名或密码错误' });
    }
    
    const valid = bcrypt.compareSync(password, admin.password);
    
    if (!valid) {
      return res.json({ code: 401, message: '用户名或密码错误' });
    }
    
    const token = jwt.sign(
      { id: admin.id, username: admin.username, role: admin.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.json({
      code: 200,
      data: {
        token,
        username: admin.username,
        role: admin.role
      },
      message: '登录成功'
    });
  } catch (e) {
    console.error('[login] 登录失败:', e);
    res.json({ code: 500, message: '登录失败' });
  }
});

// 验证Token
router.get('/verify', (req, res) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.json({ code: 401, message: '未提供认证令牌' });
  }
  
  const token = authHeader.split(' ')[1];
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    res.json({
      code: 200,
      data: decoded
    });
  } catch (e) {
    res.json({ code: 401, message: '令牌无效或已过期' });
  }
});

// 获取管理员信息
router.get('/profile', (req, res) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.json({ code: 401, message: '未提供认证令牌' });
  }
  
  const token = authHeader.split(' ')[1];
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const admin = prepare('SELECT id, username, role, created_at FROM admins WHERE id = ?').get(decoded.id);
    
    if (!admin) {
      return res.json({ code: 404, message: '管理员不存在' });
    }
    
    res.json({
      code: 200,
      data: admin
    });
  } catch (e) {
    res.json({ code: 401, message: '令牌无效' });
  }
});

// 修改密码
router.post('/password', (req, res) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.json({ code: 401, message: '未提供认证令牌' });
  }
  
  const token = authHeader.split(' ')[1];
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const { oldPassword, newPassword } = req.body;
    
    if (!oldPassword || !newPassword) {
      return res.json({ code: 400, message: '请填写完整信息' });
    }
    
    if (newPassword.length < 6) {
      return res.json({ code: 400, message: '新密码长度不能少于6位' });
    }
    
    const admin = prepare('SELECT * FROM admins WHERE id = ?').get(decoded.id);
    
    if (!admin) {
      return res.json({ code: 404, message: '管理员不存在' });
    }
    
    const valid = bcrypt.compareSync(oldPassword, admin.password);
    
    if (!valid) {
      return res.json({ code: 400, message: '原密码错误' });
    }
    
    const hashedPassword = bcrypt.hashSync(newPassword, 10);
    prepare('UPDATE admins SET password = ? WHERE id = ?').run(hashedPassword, decoded.id);
    
    res.json({
      code: 200,
      message: '密码修改成功'
    });
  } catch (e) {
    console.error('[password] 修改密码失败:', e);
    res.json({ code: 500, message: '修改密码失败' });
  }
});

module.exports = router;
