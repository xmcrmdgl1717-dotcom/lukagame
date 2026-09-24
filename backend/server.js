const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { authenticator } = require('otplib');
const QRCode = require('qrcode');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const app = express();

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));

// ================= 辅助函数 =================
function getClientIp(req) {
  return (req.headers['x-forwarded-for'] || '').split(',')[0].trim()
    || req.headers['x-real-ip'] || req.connection?.remoteAddress || '';
}
function getClientUA(req) {
  return (req.headers['user-agent'] || '').slice(0, 200);
}
// ================= 邮件模块 =================

let _transporter = null;
let _transporterConfig = '';

async function getTransporter() {
  const s = await prisma.emailSetting.findUnique({ where: { id: 'singleton' } });
  if (!s || !s.enabled || !s.host || !s.user || !s.pass) return null;

  const cfg = `${s.host}:${s.port}:${s.user}:${s.pass}:${s.secure}`;
  if (_transporter && _transporterConfig === cfg) return _transporter;

  _transporter = nodemailer.createTransport({
    host: s.host,
    port: s.port,
    secure: s.secure,
    auth: { user: s.user, pass: s.pass },
    connectionTimeout: 10000,
    greetingTimeout: 8000,
    socketTimeout: 12000,
  });
  _transporterConfig = cfg;
  return _transporter;
}

const EMAIL_TEMPLATES = {
  WELCOME: (data) => ({
    subject: `🎉 欢迎加入 LUKA，${data.username}！`,
    html: `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:560px;margin:0 auto;background:#0d0d0d;color:#fff;border-radius:12px;overflow:hidden;">
        <div style="background:linear-gradient(135deg,#b83d22,#9a2c18);padding:32px 24px;text-align:center;">
          <div style="font-size:32px;font-weight:900;font-style:italic;color:#fff;letter-spacing:4px;">LUKA!</div>
        </div>
        <div style="padding:32px 24px;">
          <h2 style="margin:0 0 16px;font-size:20px;">你好，${data.username} 👋</h2>
          <p style="color:#aaa;line-height:1.7;margin:0 0 16px;">欢迎加入 LUKA 抽卡平台！我们已为你准备 <strong style="color:#fbbf24;">${data.initCoins || 10000}</strong> 金币作为新手礼包。</p>
          <p style="color:#aaa;line-height:1.7;margin:0 0 24px;">现在就可以前往首页，开启你的抽卡之旅。如果遇到任何问题，随时在 App 内「联系客服」提交工单。</p>
          <div style="text-align:center;margin:32px 0;">
            <a href="${data.siteUrl || '#'}" style="display:inline-block;background:#dc2626;color:#fff;text-decoration:none;padding:14px 32px;border-radius:24px;font-weight:bold;">开始抽卡</a>
          </div>
        </div>
        <div style="padding:20px;text-align:center;color:#555;font-size:12px;border-top:1px solid #222;">
          LUKA 抽卡平台 · 本邮件由系统自动发出，请勿回复
        </div>
      </div>
    `,
  }),

  RECHARGE: (data) => ({
    subject: `💰 充值成功：${data.coinsAdded} 金币已到账`,
    html: `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:560px;margin:0 auto;background:#0d0d0d;color:#fff;border-radius:12px;overflow:hidden;">
        <div style="background:linear-gradient(135deg,#16a34a,#15803d);padding:32px 24px;text-align:center;">
          <div style="font-size:28px;font-weight:900;color:#fff;">💰 充值成功</div>
        </div>
        <div style="padding:32px 24px;">
          <h2 style="margin:0 0 20px;font-size:18px;">亲爱的 ${data.username}：</h2>
          <p style="color:#aaa;line-height:1.7;">您的充值已到账，详情如下：</p>
          <div style="background:#1a0f0c;border:1px solid #3d1a1a;border-radius:8px;padding:16px;margin:20px 0;">
            <table style="width:100%;color:#fff;font-size:14px;">
              <tr><td style="color:#888;padding:6px 0;">订单号</td><td style="text-align:right;font-family:monospace;font-size:12px;">${data.orderId}</td></tr>
              <tr><td style="color:#888;padding:6px 0;">支付金额</td><td style="text-align:right;color:#4ade80;font-weight:bold;">¥${(data.amount/100).toFixed(2)}</td></tr>
              <tr><td style="color:#888;padding:6px 0;">到账金币</td><td style="text-align:right;color:#fbbf24;font-weight:bold;">+${data.coinsAdded.toLocaleString()}</td></tr>
              <tr><td style="color:#888;padding:6px 0;">当前余额</td><td style="text-align:right;color:#fbbf24;">${data.newBalance.toLocaleString()} 🪙</td></tr>
            </table>
          </div>
          <p style="color:#aaa;line-height:1.7;">祝您抽到心仪的卡牌！</p>
        </div>
        <div style="padding:20px;text-align:center;color:#555;font-size:12px;border-top:1px solid #222;">
          LUKA 抽卡平台 · 本邮件由系统自动发出
        </div>
      </div>
    `,
  }),

  VIP_UPGRADE: (data) => ({
    subject: `👑 恭喜升级到 VIP${data.level}！`,
    html: `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:560px;margin:0 auto;background:#0d0d0d;color:#fff;border-radius:12px;overflow:hidden;">
        <div style="background:linear-gradient(135deg,#d97706,#b45309);padding:32px 24px;text-align:center;">
          <div style="font-size:48px;margin-bottom:8px;">👑</div>
          <div style="font-size:24px;font-weight:900;color:#fff;">VIP${data.level} 达成！</div>
        </div>
        <div style="padding:32px 24px;">
          <h2 style="margin:0 0 16px;font-size:18px;">亲爱的 ${data.username}：</h2>
          <p style="color:#aaa;line-height:1.7;">恭喜您成功升级到 <strong style="color:#fbbf24;">${data.levelName}</strong>！</p>
          <p style="color:#aaa;line-height:1.7;">作为升级奖励，我们已为您发放 <strong style="color:#fbbf24;">${data.reward.toLocaleString()}</strong> 金币。继续充值或消费，解锁更多 VIP 特权！</p>
        </div>
        <div style="padding:20px;text-align:center;color:#555;font-size:12px;border-top:1px solid #222;">
          LUKA 抽卡平台 · 本邮件由系统自动发出
        </div>
      </div>
    `,
  }),

  SHIP: (data) => ({
    subject: `📦 您的卡片已发货：${data.trackingNo || '物流更新'}`,
    html: `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:560px;margin:0 auto;background:#0d0d0d;color:#fff;border-radius:12px;overflow:hidden;">
        <div style="background:linear-gradient(135deg,#0891b2,#0e7490);padding:32px 24px;text-align:center;">
          <div style="font-size:48px;margin-bottom:8px;">📦</div>
          <div style="font-size:22px;font-weight:900;color:#fff;">卡片已发货</div>
        </div>
        <div style="padding:32px 24px;">
          <h2 style="margin:0 0 16px;font-size:18px;">亲爱的 ${data.username}：</h2>
          <p style="color:#aaa;line-height:1.7;">您申请的卡片发货订单已处理，物流信息如下：</p>
          <div style="background:#1a0f0c;border:1px solid #3d1a1a;border-radius:8px;padding:16px;margin:20px 0;">
            <table style="width:100%;color:#fff;font-size:14px;">
              <tr><td style="color:#888;padding:6px 0;">订单号</td><td style="text-align:right;font-family:monospace;font-size:12px;">${data.orderId}</td></tr>
              <tr><td style="color:#888;padding:6px 0;">快递公司</td><td style="text-align:right;">${data.expressCompany || '-'}</td></tr>
              <tr><td style="color:#888;padding:6px 0;">快递单号</td><td style="text-align:right;color:#22d3ee;font-family:monospace;font-weight:bold;">${data.trackingNo || '-'}</td></tr>
            </table>
          </div>
          <p style="color:#aaa;line-height:1.7;">请留意物流信息，收到后请在 App 内确认收货。</p>
        </div>
        <div style="padding:20px;text-align:center;color:#555;font-size:12px;border-top:1px solid #222;">
          LUKA 抽卡平台 · 本邮件由系统自动发出
        </div>
      </div>
    `,
  }),
};

// 统一发送入口（fire-and-forget，不阻塞业务）
async function sendEmail({ to, type, userId, data }) {
  if (!to || !to.includes('@')) return;
  const tpl = EMAIL_TEMPLATES[type];
  if (!tpl) return;

  const { subject, html } = tpl(data);

  // 先写日志
  let logId = null;
  try {
    const log = await prisma.emailLog.create({
      data: { userId: userId || null, toEmail: to, type, subject, status: 'PENDING' },
    });
    logId = log.id;
  } catch (e) { console.error('emailLog create fail:', e.message); }

  try {
    const transporter = await getTransporter();
    if (!transporter) throw new Error('SMTP 未配置或未启用');
    const s = await prisma.emailSetting.findUnique({ where: { id: 'singleton' } });
    const from = s.fromEmail ? `"${s.fromName}" <${s.fromEmail}>` : s.user;
    await transporter.sendMail({ from, to, subject, html });
    if (logId) await prisma.emailLog.update({ where: { id: logId }, data: { status: 'SENT', sentAt: new Date() } });
  } catch (e) {
    console.error(`[Email ${type}] to=${to} fail:`, e.message);
    if (logId) await prisma.emailLog.update({ where: { id: logId }, data: { status: 'FAILED', error: e.message.slice(0, 500) } });
  }
}

// 检查用户是否订阅某类邮件
function userWantsEmail(user, type) {
  if (!user || !user.email) return false;
  if (type === 'WELCOME' && !user.emailWelcome) return false;
  if (type === 'RECHARGE' && !user.emailRecharge) return false;
  if (type === 'VIP_UPGRADE' && !user.emailVip) return false;
  if (type === 'SHIP' && !user.emailShip) return false;
  return true;
}

// ================= 2FA 模块 =================

// 内存缓存：临时登录 token -> { adminId, expiresAt }
// 5 分钟过期，进程重启后失效（生产可换 Redis）
const pending2FA = new Map();

setInterval(() => {
  const now = Date.now();
  for (const [token, info] of pending2FA.entries()) {
    if (info.expiresAt < now) pending2FA.delete(token);
  }
}, 60 * 1000).unref();

function newTempToken(adminId) {
  const token = crypto.randomBytes(24).toString('hex');
  pending2FA.set(token, { adminId, expiresAt: Date.now() + 5 * 60 * 1000 });
  return token;
}

function consumeTempToken(token) {
  const info = pending2FA.get(token);
  if (!info) return null;
  if (info.expiresAt < Date.now()) {
    pending2FA.delete(token);
    return null;
  }
  pending2FA.delete(token);
  return info;
}

// 生成 8 个一次性备份码（每个 10 位，格式 XXXX-XXXX）
function generateBackupCodes() {
  const codes = [];
  for (let i = 0; i < 8; i++) {
    const part1 = crypto.randomBytes(2).toString('hex').toUpperCase();
    const part2 = crypto.randomBytes(2).toString('hex').toUpperCase();
    codes.push(`${part1}-${part2}`);
  }
  return codes;
}

// 备份码 hash（用 sha256，不存明文）
function hashBackupCode(code) {
  return crypto.createHash('sha256').update(code.toUpperCase().replace(/\s/g, '')).digest('hex');
}

// 消费备份码（验证成功后从列表中移除）
function tryConsumeBackupCode(storedCodesJson, inputCode) {
  try {
    const codes = JSON.parse(storedCodesJson || '[]');
    const hashed = hashBackupCode(inputCode);
    const idx = codes.indexOf(hashed);
    if (idx === -1) return null;
    codes.splice(idx, 1); // 一次性
    return JSON.stringify(codes);
  } catch (e) {
    return null;
  }
}

// 判断管理员是否需要 2FA
function adminNeeds2FA(admin) {
  return admin && admin.totpEnabled && admin.totpSecret;
}

// ================= 权限定义 =================
const ALL_PERMISSIONS = [
  { key: 'users.view', label: '查看用户', group: '用户管理' },
  { key: 'users.edit', label: '编辑用户', group: '用户管理' },
  { key: 'users.delete', label: '删除用户', group: '用户管理' },
  { key: 'users.vip', label: 'VIP等级设置', group: '用户管理' },
  { key: 'groups.view', label: '查看用户分组', group: '用户管理' },
  { key: 'groups.edit', label: '编辑用户分组', group: '用户管理' },
  { key: 'bankcards.view', label: '查看绑卡', group: '用户管理' },
  { key: 'bankcards.edit', label: '编辑绑卡', group: '用户管理' },
  { key: 'games.view', label: '查看游戏', group: '游戏管理' },
  { key: 'games.create', label: '新增游戏', group: '游戏管理' },
  { key: 'games.edit', label: '编辑游戏', group: '游戏管理' },
  { key: 'games.delete', label: '删除游戏', group: '游戏管理' },
  { key: 'cards.view', label: '查看卡牌', group: '卡牌管理' },
  { key: 'cards.create', label: '新增卡牌', group: '卡牌管理' },
  { key: 'cards.edit', label: '编辑卡牌', group: '卡牌管理' },
  { key: 'cards.delete', label: '删除卡牌', group: '卡牌管理' },
  { key: 'boxes.view', label: '查看盲盒', group: '盲盒管理' },
  { key: 'boxes.create', label: '新增盲盒', group: '盲盒管理' },
  { key: 'boxes.edit', label: '编辑盲盒', group: '盲盒管理' },
  { key: 'boxes.delete', label: '删除盲盒', group: '盲盒管理' },
  { key: 'boxes.probability', label: '概率配置', group: '盲盒管理' },
  { key: 'recharge.view', label: '查看套餐', group: '充值套餐' },
  { key: 'recharge.create', label: '新增套餐', group: '充值套餐' },
  { key: 'recharge.edit', label: '编辑套餐', group: '充值套餐' },
  { key: 'recharge.delete', label: '删除套餐', group: '充值套餐' },
  { key: 'orders.view', label: '查看订单', group: '资金管理' },
  { key: 'orders.refund', label: '手动补单', group: '资金管理' },
  { key: 'payments.view', label: '查看支付渠道', group: '资金管理' },
  { key: 'payments.edit', label: '编辑支付渠道', group: '资金管理' },
  { key: 'transactions.view', label: '查看交易明细', group: '资金管理' },
  { key: 'drawlogs.view', label: '查看抽奖记录', group: '抽奖管理' },
  { key: 'drawlogs.export', label: '导出抽奖记录', group: '抽奖管理' },
  { key: 'cardorders.view', label: '查看卡片订单', group: '抽奖管理' },
  { key: 'cardorders.process', label: '处理卡片订单', group: '抽奖管理' },
  { key: 'transfers.view', label: '查看赠送订单', group: '抽奖管理' },
  { key: 'transfers.delete', label: '删除赠送记录', group: '抽奖管理' },
  { key: 'adchannels.view', label: '查看投放渠道', group: '广告管理' },
  { key: 'adchannels.create', label: '新增投放渠道', group: '广告管理' },
  { key: 'adchannels.edit', label: '编辑投放渠道', group: '广告管理' },
  { key: 'adchannels.delete', label: '删除投放渠道', group: '广告管理' },
  { key: 'adcampaigns.view', label: '查看投放活动', group: '广告管理' },
  { key: 'adcampaigns.create', label: '新增投放活动', group: '广告管理' },
  { key: 'adcampaigns.edit', label: '编辑投放活动', group: '广告管理' },
  { key: 'adcampaigns.delete', label: '删除投放活动', group: '广告管理' },
  { key: 'kols.view', label: '查看KOL', group: '广告管理' },
  { key: 'kols.create', label: '新增KOL', group: '广告管理' },
  { key: 'kols.edit', label: '编辑KOL', group: '广告管理' },
  { key: 'kols.delete', label: '删除KOL', group: '广告管理' },
  { key: 'adreports.view', label: '查看广告报表', group: '广告管理' },
  { key: 'banners.view', label: '查看轮播图', group: '通知管理' },
  { key: 'banners.create', label: '新增轮播图', group: '通知管理' },
  { key: 'banners.edit', label: '编辑轮播图', group: '通知管理' },
  { key: 'banners.delete', label: '删除轮播图', group: '通知管理' },
  { key: 'popups.view', label: '查看弹窗', group: '通知管理' },
  { key: 'popups.create', label: '新增弹窗', group: '通知管理' },
  { key: 'popups.edit', label: '编辑弹窗', group: '通知管理' },
  { key: 'popups.delete', label: '删除弹窗', group: '通知管理' },
  { key: 'articles.view', label: '查看文章', group: '通知管理' },
  { key: 'articles.create', label: '新增文章', group: '通知管理' },
  { key: 'articles.edit', label: '编辑文章', group: '通知管理' },
  { key: 'articles.delete', label: '删除文章', group: '通知管理' },
  { key: 'ads.view', label: '查看站内广告', group: '通知管理' },
  { key: 'ads.create', label: '新增站内广告', group: '通知管理' },
  { key: 'ads.edit', label: '编辑站内广告', group: '通知管理' },
  { key: 'ads.delete', label: '删除站内广告', group: '通知管理' },
  { key: 'tasks.view', label: '查看任务', group: '活动管理' },
  { key: 'tasks.create', label: '新增任务', group: '活动管理' },
  { key: 'tasks.edit', label: '编辑任务', group: '活动管理' },
  { key: 'tasks.delete', label: '删除任务', group: '活动管理' },
  { key: 'redeem.view', label: '查看兑换码', group: '活动管理' },
  { key: 'redeem.create', label: '新增兑换码', group: '活动管理' },
  { key: 'redeem.delete', label: '删除兑换码', group: '活动管理' },
  { key: 'notifications.view', label: '查看通知', group: '通知管理' },
  { key: 'notifications.create', label: '发布通知', group: '通知管理' },
  { key: 'notifications.delete', label: '删除通知', group: '通知管理' },
  { key: 'tickets.view', label: '查看工单', group: '客服工单' },
  { key: 'tickets.reply', label: '回复工单', group: '客服工单' },
  { key: 'tickets.close', label: '关闭工单', group: '客服工单' },
  { key: 'tickets.delete', label: '删除工单', group: '客服工单' },
  { key: 'reports.view', label: '查看报表', group: '报表管理' },
  { key: 'reports.export', label: '导出报表', group: '报表管理' },
  { key: 'admins.view', label: '查看管理员', group: '系统管理' },
  { key: 'admins.create', label: '新增管理员', group: '系统管理' },
  { key: 'admins.edit', label: '编辑管理员', group: '系统管理' },
  { key: 'admins.delete', label: '删除管理员', group: '系统管理' },
  { key: 'roles.view', label: '查看角色', group: '系统管理' },
  { key: 'roles.create', label: '新增角色', group: '系统管理' },
  { key: 'roles.edit', label: '编辑角色', group: '系统管理' },
  { key: 'roles.delete', label: '删除角色', group: '系统管理' },
  { key: 'menus.view', label: '查看菜单', group: '系统管理' },
  { key: 'menus.edit', label: '编辑菜单', group: '系统管理' },
  { key: 'languages.view', label: '查看语言', group: '系统管理' },
  { key: 'languages.edit', label: '编辑语言', group: '系统管理' },
  { key: 'audit.view', label: '查看操作日志', group: '系统管理' },
];

const ALL_PERMISSION_KEYS = ALL_PERMISSIONS.map(p => p.key);

const SYSTEM_ROLES = [
  { name: 'super', displayName: '超级管理员', description: '拥有全部权限', permissions: ALL_PERMISSION_KEYS.join(','), isSystem: true },
  { name: 'admin', displayName: '管理员', description: '日常运营管理', permissions: ALL_PERMISSION_KEYS.filter(k => !k.startsWith('admins.') && !k.startsWith('roles.') && !k.startsWith('menus.') && !k.startsWith('languages.')).join(','), isSystem: true },
  { name: 'operator', displayName: '运营专员', description: '管理卡牌、盲盒、活动等运营内容', permissions: ['users.view', 'groups.view', 'games.view', 'cards.view', 'cards.create', 'cards.edit', 'boxes.view', 'boxes.create', 'boxes.edit', 'boxes.probability', 'banners.view', 'banners.create', 'banners.edit', 'popups.view', 'popups.create', 'popups.edit', 'articles.view', 'articles.create', 'articles.edit', 'adchannels.view', 'adcampaigns.view', 'adcampaigns.create', 'adcampaigns.edit', 'kols.view', 'kols.create', 'kols.edit', 'adreports.view', 'tasks.view', 'tasks.create', 'tasks.edit', 'redeem.view', 'redeem.create', 'notifications.view', 'notifications.create', 'orders.view', 'transfers.view'].join(','), isSystem: true },
  { name: 'support', displayName: '客服专员', description: '处理用户问题和工单', permissions: ['users.view', 'tickets.view', 'tickets.reply', 'tickets.close', 'cardorders.view', 'cardorders.process', 'transfers.view', 'notifications.view', 'notifications.create', 'orders.view'].join(','), isSystem: true },
];

// ================= 用户端 API =================

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await prisma.user.findUnique({
    where: { username },
    include: {
      inventory: { include: { card: true } },
      group: true,
    }
  });
  if (!user || user.password !== password) return res.status(401).json({ error: '用户名或密码错误' });
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  res.json(user);
});

app.post('/api/register', async (req, res) => {
  const { username, password, email, utmSource, utmMedium, utmCampaign, ref } = req.body;
  if (!username || !password) return res.status(400).json({ error: '请输入用户名和密码' });
  try {
    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) return res.status(400).json({ error: '用户名已存在' });
    const newUser = await prisma.user.create({
      data: {
        username, password, coins: 10000,
        email: (email || '').trim(),
        adSource: utmSource || '',
        adMedium: utmMedium || '',
        adCampaign: utmCampaign || '',
        adRef: ref || '',
      },
    });

    // 异步发欢迎邮件（不阻塞响应）
    if (newUser.email) {
      sendEmail({
        to: newUser.email,
        type: 'WELCOME',
        userId: newUser.id,
        data: { username: newUser.username, initCoins: 10000, siteUrl: process.env.SITE_URL || '' },
      }).catch(() => {});
    }

    res.json({ success: true, user: newUser });
  } catch (error) { res.status(500).json({ error: '注册失败' }); }
});

// 用户端 VIP 信息
app.get('/api/user/vip-info/:userId', async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.params.userId } });
    if (!user) return res.status(404).json({ error: '用户不存在' });
    const currentLevel = await prisma.vipLevel.findUnique({ where: { level: user.vipLevel } });
    const nextLevel = await prisma.vipLevel.findFirst({ where: { level: user.vipLevel + 1, isActive: true } });
    let rechargeProgress = 100, consumeProgress = 100;
    let needRecharge = 0, needConsume = 0;
    if (nextLevel) {
      rechargeProgress = nextLevel.rechargeAmount > 0 ? Math.min(Math.round((user.totalRecharge / nextLevel.rechargeAmount) * 100), 100) : 100;
      consumeProgress = nextLevel.consumeAmount > 0 ? Math.min(Math.round((user.totalConsume / nextLevel.consumeAmount) * 100), 100) : 100;
      needRecharge = Math.max(nextLevel.rechargeAmount - user.totalRecharge, 0);
      needConsume = Math.max(nextLevel.consumeAmount - user.totalConsume, 0);
    }
    let benefits = [];
    try { if (currentLevel?.benefits) benefits = JSON.parse(currentLevel.benefits); } catch (e) { benefits = []; }
    res.json({
      currentLevel: currentLevel?.level || 0,
      currentName: currentLevel?.name || 'VIP0',
      currentIcon: currentLevel?.iconUrl || '',
      nextLevel: nextLevel?.level || null,
      nextName: nextLevel?.name || null,
      nextIcon: nextLevel?.iconUrl || '',
      totalRecharge: user.totalRecharge,
      totalConsume: user.totalConsume,
      rechargeProgress,
      consumeProgress,
      needRecharge,
      needConsume,
      benefits,
      isMaxLevel: !nextLevel,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 语言
app.get('/api/languages', async (req, res) => {
  res.json(await prisma.language.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } }));
});

app.get('/api/translations/:lang', async (req, res) => {
  const { lang } = req.params;
  const all = await prisma.translation.findMany();
  const result = {};
  all.forEach(t => { try { const obj = JSON.parse(t.translations); if (obj[lang]) result[t.key] = obj[lang]; } catch (e) {} });
  res.json(result);
});

// 游戏
app.get('/api/games', async (req, res) => {
  res.json(await prisma.game.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } }));
});

app.get('/api/games/:id', async (req, res) => {
  const game = await prisma.game.findUnique({ where: { id: req.params.id }, include: { boxes: { where: { isActive: true } } } });
  if (!game) return res.status(404).json({ error: '游戏不存在' });
  res.json(game);
});

app.post('/api/games/:id/check-access', async (req, res) => {
  const { userId } = req.body;
  const game = await prisma.game.findUnique({ where: { id: req.params.id } });
  if (!game) return res.status(404).json({ error: '游戏不存在' });
  if (!game.isActive) return res.json({ allowed: false, reason: '游戏未开放' });
  if (!userId) return res.json({ allowed: false, reason: '请先登录' });
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return res.json({ allowed: false, reason: '用户不存在' });
  if (game.minVipLevel > 0 && user.vipLevel < game.minVipLevel) return res.json({ allowed: false, reason: `需要 VIP${game.minVipLevel} 以上` });
  if (game.minCoins > 0 && user.coins < game.minCoins) return res.json({ allowed: false, reason: `需要余额 ${game.minCoins} 以上` });
  res.json({ allowed: true });
});

// 盲盒
app.get('/api/boxes', async (req, res) => {
  const { featured, gameId } = req.query;
  const where = { isActive: true };
  if (featured === 'true') where.isFeatured = true;
  if (gameId) where.gameId = gameId;
  res.json(await prisma.box.findMany({ where, include: { game: true } }));
});

// 单个盲盒详情（含卡池概率 + 抽奖动态）
app.get('/api/boxes/:id', async (req, res) => {
  try {
    const box = await prisma.box.findUnique({
      where: { id: req.params.id },
      include: {
        game: { select: { id: true, displayName: true, icon: true } },
        items: { include: { card: true } },
      },
    });
    if (!box || !box.isActive) return res.status(404).json({ error: '盲盒不存在或已下架' });

    const totalWeight = box.items.reduce((s, i) => s + (i.weight || 0), 0);
    const pool = box.items.map(i => ({
      cardId: i.card.id,
      name: i.card.name,
      rarity: i.card.rarity,
      imageUrl: i.card.imageUrl,
      description: i.card.description,
      weight: i.weight,
      probability: totalWeight > 0 ? ((i.weight / totalWeight) * 100).toFixed(2) : '0.00',
    })).sort((a, b) => b.weight - a.weight);

    res.json({
      id: box.id,
      name: box.name,
      price: box.price,
      coverUrl: box.coverUrl,
      description: box.description,
      allowTransfer: box.allowTransfer,
      game: box.game,
      totalWeight,
      pool,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 盲盒最近抽奖动态（全服）
app.get('/api/boxes/:id/recent-draws', async (req, res) => {
  try {
    const logs = await prisma.drawLog.findMany({
      where: { boxId: req.params.id },
      include: { user: { select: { username: true, vipLevel: true } } },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    res.json(logs.map(l => ({
      id: l.id,
      username: l.user?.username || '神秘用户',
      vipLevel: l.user?.vipLevel || 0,
      count: l.count,
      cost: l.cost,
      createdAt: l.createdAt,
    })));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 抽卡
app.post('/api/draw', async (req, res) => {
  const { userId, boxId, count } = req.body;
  try {
    const result = await prisma.$transaction(async (tx) => {
      const box = await tx.box.findUnique({ where: { id: boxId }, include: { game: true, items: { include: { card: true } } } });
      const user = await tx.user.findUnique({ where: { id: userId } });
      if (!user) throw new Error('用户不存在');
      if (box.game && box.game.minVipLevel > 0 && user.vipLevel < box.game.minVipLevel) throw new Error(`需要 VIP${box.game.minVipLevel} 以上`);
      if (box.game && box.game.minCoins > 0 && user.coins < box.game.minCoins) throw new Error(`需要余额 ${box.game.minCoins} 以上`);
      const totalCost = box.price * count;
      if (user.coins < totalCost) throw new Error('金币不足');
      await tx.user.update({ where: { id: userId }, data: { coins: { decrement: totalCost }, totalConsume: { increment: totalCost } } });
      const drawnCards = [];
      const totalWeight = box.items.reduce((sum, item) => sum + item.weight, 0);
      for (let i = 0; i < count; i++) {
        let random = Math.random() * totalWeight;
        for (const item of box.items) {
          if (random < item.weight) { drawnCards.push(item.card); break; }
          random -= item.weight;
        }
      }
      let outputValue = 0;
      for (const card of drawnCards) {
        outputValue += card.value || 0;
        await tx.inventory.upsert({
          where: { userId_cardId: { userId, cardId: card.id } },
          update: { quantity: { increment: 1 } },
          create: { userId, cardId: card.id, quantity: 1 }
        });
      }
      await tx.drawLog.create({ data: { userId, boxId, cost: totalCost, count, outputValue } });
      await tx.transaction.create({ data: { userId, type: 'CONSUME', amount: -totalCost, balance: user.coins - totalCost, refType: 'DRAW', refId: boxId, remark: `抽卡 ${count} 次` } });
      await updateTaskProgress(tx, userId, 'DRAW', count);
      await updateTaskProgress(tx, userId, 'SPEND', totalCost);
      return { success: true, drawnCards };
    });
    checkVipUpgrade(userId).catch(() => {});
    res.json(result);
  } catch (error) { res.status(400).json({ error: error.message }); }
});

async function updateTaskProgress(tx, userId, action, amount) {
  const tasks = await tx.task.findMany({ where: { action, isActive: true } });
  for (const task of tasks) {
    const existing = await tx.userTask.findUnique({ where: { userId_taskId: { userId, taskId: task.id } } });
    if (existing) {
      if (!existing.isClaimed) await tx.userTask.update({ where: { id: existing.id }, data: { progress: { increment: amount } } });
    } else {
      await tx.userTask.create({ data: { userId, taskId: task.id, progress: amount } });
    }
  }
}

// VIP 升级
async function checkVipUpgrade(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return;
  const levels = await prisma.vipLevel.findMany({ where: { isActive: true }, orderBy: { level: 'desc' } });
  for (const lv of levels) {
    if (user.totalRecharge >= lv.rechargeAmount && user.totalConsume >= lv.consumeAmount) {
      if (user.vipLevel !== lv.level) {
        const reward = lv.level * 500;
        const updated = await prisma.user.update({ where: { id: userId }, data: { vipLevel: lv.level, coins: { increment: reward } } });
        await prisma.transaction.create({
          data: { userId, type: 'VIP_BONUS', amount: reward, balance: updated.coins, refType: 'VIP', refId: String(lv.level), remark: `VIP${lv.level} 升级奖励` }
        });
        await prisma.notification.create({
          data: { userId, title: `🎉 恭喜升级到 VIP${lv.level}！`, content: `您已成功升级到 ${lv.name}，获得 ${reward} 金币奖励。继续充值或消费可解锁更多特权！` }
        });

        // 异步发 VIP 升级邮件
        if (userWantsEmail(updated, 'VIP_UPGRADE')) {
          sendEmail({
            to: updated.email,
            type: 'VIP_UPGRADE',
            userId: updated.id,
            data: { username: updated.username, level: lv.level, levelName: lv.name, reward },
          }).catch(() => {});
        }
      }
      break;
    }
  }
}

// 任务
app.get('/api/tasks/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    const tasks = await prisma.task.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } });
    const result = [];
    for (const task of tasks) {
      let ut = await prisma.userTask.findUnique({ where: { userId_taskId: { userId, taskId: task.id } } });
      if (!ut) ut = await prisma.userTask.create({ data: { userId, taskId: task.id, progress: 0 } });
      result.push({ taskId: task.id, title: task.title, description: task.description, action: task.action, targetCount: task.targetCount, rewardCoins: task.rewardCoins, progress: ut.progress, isClaimed: ut.isClaimed });
    }
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/tasks/claim', async (req, res) => {
  const { userId, taskId } = req.body;
  try {
    const result = await prisma.$transaction(async (tx) => {
      const ut = await tx.userTask.findUnique({ where: { userId_taskId: { userId, taskId } }, include: { task: true } });
      if (!ut) throw new Error('任务不存在');
      if (ut.isClaimed) throw new Error('已领取');
      if (ut.progress < ut.task.targetCount) throw new Error('任务未完成');
      await tx.userTask.update({ where: { id: ut.id }, data: { isClaimed: true } });
      await tx.user.update({ where: { id: userId }, data: { coins: { increment: ut.task.rewardCoins } } });
      return { success: true, reward: ut.task.rewardCoins };
    });
    res.json(result);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

app.get('/api/recharge-options', async (req, res) => {
  res.json(await prisma.rechargeOption.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } }));
});

app.post('/api/recharge', async (req, res) => {
  const { userId, optionId } = req.body;
  try {
    const result = await prisma.$transaction(async (tx) => {
      const option = await tx.rechargeOption.findUnique({ where: { id: optionId } });
      if (!option || !option.isActive) throw new Error('套餐已下架');
      const totalCoins = option.coins + option.bonus;
      const order = await tx.order.create({ data: { userId, optionId, amount: option.price, coins: totalCoins, status: 'PAID', paidAt: new Date() } });
      await tx.user.update({ where: { id: userId }, data: { coins: { increment: totalCoins }, rechargeCount: { increment: 1 }, totalRecharge: { increment: option.price } } });
      await tx.transaction.create({ data: { userId, type: 'RECHARGE', amount: option.price, balance: 0, refType: 'ORDER', refId: order.id, remark: `充值 ¥${(option.price / 100).toFixed(2)}` } });
      await updateTaskProgress(tx, userId, 'RECHARGE', 1);
      return { success: true, order, coinsAdded: totalCoins };
    });
    checkVipUpgrade(userId).catch(() => {});
    res.json(result);
  } catch (error) { res.status(400).json({ error: error.message }); }
});

app.get('/api/banners', async (req, res) => {
  res.json(await prisma.banner.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } }));
});

app.get('/api/orders/:userId', async (req, res) => {
  res.json(await prisma.order.findMany({ where: { userId: req.params.userId }, include: { option: true }, orderBy: { createdAt: 'desc' }, take: 100 }));
});

// ================= 排行榜（日榜 / 周榜 / 月榜） =================
async function buildLeaderboard(sinceDate, take = 10) {
  const result = await prisma.drawLog.groupBy({
    by: ['userId'],
    where: { createdAt: { gte: sinceDate } },
    _sum: { cost: true },
    orderBy: { _sum: { cost: 'desc' } },
    take,
  });
  const data = [];
  for (const row of result) {
    const user = await prisma.user.findUnique({ where: { id: row.userId }, select: { username: true, vipLevel: true } });
    data.push({ username: user?.username || '未知', vipLevel: user?.vipLevel || 0, totalCost: row._sum.cost || 0 });
  }
  return data;
}

app.get('/api/leaderboard/daily', async (req, res) => {
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  res.json(await buildLeaderboard(since, 10));
});

app.get('/api/leaderboard/weekly', async (req, res) => {
  const since = new Date();
  since.setDate(since.getDate() - 7);
  res.json(await buildLeaderboard(since, 10));
});

app.get('/api/leaderboard/monthly', async (req, res) => {
  const since = new Date();
  since.setDate(since.getDate() - 30);
  res.json(await buildLeaderboard(since, 10));
});

// 卡牌持有排行榜：按所有用户库存聚合统计
async function buildCardRanking(rarity, limit) {
  const cardWhere = {};
  if (rarity && rarity !== 'ALL') cardWhere.rarity = rarity;
  const cards = await prisma.card.findMany({ where: cardWhere, select: { id: true } });
  const cardIds = cards.map(c => c.id);
  if (cardIds.length === 0) return [];

  const grouped = await prisma.inventory.groupBy({
    by: ['cardId'],
    where: { cardId: { in: cardIds }, quantity: { gt: 0 } },
    _sum: { quantity: true },
    _count: { userId: true },
    orderBy: { _sum: { quantity: 'desc' } },
    take: limit,
  });

  const result = [];
  for (const g of grouped) {
    const card = await prisma.card.findUnique({ where: { id: g.cardId } });
    if (card) {
      result.push({
        cardId: card.id,
        name: card.name,
        rarity: card.rarity,
        imageUrl: card.imageUrl,
        description: card.description,
        totalQuantity: g._sum.quantity || 0,
        holderCount: g._count.userId || 0,
      });
    }
  }
  return result;
}

app.get('/api/leaderboard/cards', async (req, res) => {
  const rarity = req.query.rarity || 'ALL';
  const limit = Math.min(parseInt(req.query.limit || '20'), 100);
  try {
    res.json(await buildCardRanking(rarity, limit));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/redeem', async (req, res) => {
  const { userId, code } = req.body;
  if (!code) return res.status(400).json({ error: '请输入兑换码' });
  try {
    const result = await prisma.$transaction(async (tx) => {
      const rc = await tx.redeemCode.findUnique({ where: { code: code.trim().toUpperCase() } });
      if (!rc || !rc.isActive) throw new Error('兑换码无效');
      if (rc.usedCount >= rc.maxUses) throw new Error('兑换码已用完');
      const alreadyUsed = await tx.redeemCodeUse.findUnique({ where: { codeId_userId: { codeId: rc.id, userId } } });
      if (alreadyUsed) throw new Error('您已使用过该兑换码');
      await tx.redeemCodeUse.create({ data: { codeId: rc.id, userId } });
      await tx.redeemCode.update({ where: { id: rc.id }, data: { usedCount: { increment: 1 } } });
      if (rc.coins > 0) await tx.user.update({ where: { id: userId }, data: { coins: { increment: rc.coins } } });
      return { success: true, coins: rc.coins };
    });
    res.json(result);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

app.post('/api/tickets', async (req, res) => {
  const { userId, title, content } = req.body;
  if (!title || !content) return res.status(400).json({ error: '请填写标题和内容' });
  const ticket = await prisma.ticket.create({ data: { userId, title, content } });
  res.json({ success: true, ticket });
});

app.get('/api/tickets/:userId', async (req, res) => {
  res.json(await prisma.ticket.findMany({ where: { userId: req.params.userId }, include: { replies: { orderBy: { createdAt: 'asc' } } }, orderBy: { createdAt: 'desc' } }));
});

app.get('/api/notifications/:userId', async (req, res) => {
  const { userId } = req.params;
  const notifications = await prisma.notification.findMany({ where: { OR: [{ userId }, { userId: null }] }, orderBy: { createdAt: 'desc' }, take: 50 });
  const reads = await prisma.notificationRead.findMany({ where: { userId } });
  const readIds = reads.map(r => r.notificationId);
  res.json(notifications.map(n => ({ ...n, isRead: readIds.includes(n.id) })));
});

app.get('/api/notifications/:userId/unread-count', async (req, res) => {
  const { userId } = req.params;
  const total = await prisma.notification.count({ where: { OR: [{ userId }, { userId: null }] } });
  const reads = await prisma.notificationRead.count({ where: { userId } });
  res.json({ unread: Math.max(total - reads, 0) });
});

app.put('/api/notifications/:id/read', async (req, res) => {
  const { userId } = req.body;
  const existing = await prisma.notificationRead.findUnique({ where: { notificationId_userId: { notificationId: req.params.id, userId } } });
  if (!existing) await prisma.notificationRead.create({ data: { notificationId: req.params.id, userId } });
  res.json({ success: true });
});

app.get('/api/popups', async (req, res) => {
  const now = new Date();
  const popups = await prisma.popup.findMany({
    where: { isActive: true, OR: [{ startAt: null }, { startAt: { lte: now } }], AND: [{ OR: [{ endAt: null }, { endAt: { gte: now } }] }] },
    orderBy: { sortOrder: 'asc' },
  });
  res.json(popups);
});

app.post('/api/popups/:id/view', async (req, res) => { try { await prisma.popup.update({ where: { id: req.params.id }, data: { viewCount: { increment: 1 } } }); } catch (e) {} res.json({ success: true }); });
app.post('/api/popups/:id/click', async (req, res) => { try { await prisma.popup.update({ where: { id: req.params.id }, data: { clickCount: { increment: 1 } } }); } catch (e) {} res.json({ success: true }); });
app.post('/api/popups/:id/close', async (req, res) => { try { await prisma.popup.update({ where: { id: req.params.id }, data: { closeCount: { increment: 1 } } }); } catch (e) {} res.json({ success: true }); });

app.get('/api/articles', async (req, res) => {
  const { category } = req.query;
  const where = { isPublished: true };
  if (category) where.category = category;
  res.json(await prisma.article.findMany({ where, orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }] }));
});

app.get('/api/articles/:slug', async (req, res) => {
  const article = await prisma.article.findUnique({ where: { slug: req.params.slug } });
  if (!article || !article.isPublished) return res.status(404).json({ error: '文章不存在' });
  await prisma.article.update({ where: { id: article.id }, data: { viewCount: { increment: 1 } } });
  res.json(article);
});

app.post('/api/card-orders', async (req, res) => {
  const { userId, items, receiverName, receiverPhone, receiverAddress, remark } = req.body;
  if (!userId || !items || !items.length) return res.status(400).json({ error: '请选择要发货的卡牌' });
  if (!receiverName || !receiverPhone || !receiverAddress) return res.status(400).json({ error: '请填写收货信息' });
  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(400).json({ error: '用户不存在' });
    const order = await prisma.cardOrder.create({ data: { userId, userName: user.username, items: JSON.stringify(items), receiverName, receiverPhone, receiverAddress, remark: remark || '', status: 'PENDING' } });
    res.json({ success: true, order });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

app.get('/api/card-orders/:userId', async (req, res) => {
  res.json(await prisma.cardOrder.findMany({ where: { userId: req.params.userId }, orderBy: { createdAt: 'desc' }, take: 100 }));
});

app.get('/api/user/transactions/:userId', async (req, res) => {
  const { userId } = req.params;
  const { type, page = 1, pageSize = 20 } = req.query;
  const where = { userId };
  if (type) where.type = type;
  try {
    const total = await prisma.transaction.count({ where });
    const list = await prisma.transaction.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (parseInt(page) - 1) * parseInt(pageSize), take: parseInt(pageSize) });
    res.json({ list, total, page: parseInt(page), pageSize: parseInt(pageSize) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
// ================= 用户端：邮件设置 =================

// 获取用户邮件设置
app.get('/api/user/email-settings/:userId', async (req, res) => {
  try {
    const u = await prisma.user.findUnique({
      where: { id: req.params.userId },
      select: { email: true, emailWelcome: true, emailRecharge: true, emailVip: true, emailShip: true },
    });
    if (!u) return res.status(404).json({ error: '用户不存在' });
    res.json(u);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 更新用户邮件设置
app.put('/api/user/email-settings/:userId', async (req, res) => {
  const { email, emailWelcome, emailRecharge, emailVip, emailShip } = req.body;
  const data = {};
  if (email !== undefined) {
    const trimmed = (email || '').trim();
    if (trimmed && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      return res.status(400).json({ error: '邮箱格式不正确' });
    }
    data.email = trimmed;
  }
  if (emailWelcome !== undefined) data.emailWelcome = !!emailWelcome;
  if (emailRecharge !== undefined) data.emailRecharge = !!emailRecharge;
  if (emailVip !== undefined) data.emailVip = !!emailVip;
  if (emailShip !== undefined) data.emailShip = !!emailShip;
  try {
    const updated = await prisma.user.update({
      where: { id: req.params.userId },
      data,
      select: { email: true, emailWelcome: true, emailRecharge: true, emailVip: true, emailShip: true },
    });
    res.json({ success: true, settings: updated });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// ================= 后台：邮件设置 & 日志 =================

app.get('/api/admin/email-setting', requirePermission('audit.view'), async (req, res) => {
  try {
    let s = await prisma.emailSetting.findUnique({ where: { id: 'singleton' } });
    if (!s) s = await prisma.emailSetting.create({ data: { id: 'singleton' } });
    // 不返回密码原文，只告知是否已配置
    res.json({ ...s, pass: s.pass ? '********' : '', passConfigured: !!s.pass });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/admin/email-setting', requirePermission('audit.view'), async (req, res) => {
  const { enabled, host, port, secure, user, pass, fromName, fromEmail } = req.body;
  const data = {};
  if (enabled !== undefined) data.enabled = !!enabled;
  if (host !== undefined) data.host = host;
  if (port !== undefined) data.port = parseInt(port) || 587;
  if (secure !== undefined) data.secure = !!secure;
  if (user !== undefined) data.user = user;
  // 密码字段：如果传了 "********" 表示不改
  if (pass !== undefined && pass !== '********') data.pass = pass;
  if (fromName !== undefined) data.fromName = fromName;
  if (fromEmail !== undefined) data.fromEmail = fromEmail;

  try {
    const s = await prisma.emailSetting.upsert({
      where: { id: 'singleton' },
      update: data,
      create: { id: 'singleton', ...data },
    });
    // 配置变了，清除 transporter 缓存
    _transporter = null;
    _transporterConfig = '';
    res.json({ success: true, setting: { ...s, pass: s.pass ? '********' : '' } });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// 测试发信
app.post('/api/admin/email-setting/test', requirePermission('audit.view'), async (req, res) => {
  const { to } = req.body;
  if (!to || !to.includes('@')) return res.status(400).json({ error: '请输入有效的收件邮箱' });
  try {
    const transporter = await getTransporter();
    if (!transporter) return res.status(400).json({ error: 'SMTP 未配置或未启用，请先保存配置并启用' });
    const s = await prisma.emailSetting.findUnique({ where: { id: 'singleton' } });
    const from = s.fromEmail ? `"${s.fromName}" <${s.fromEmail}>` : s.user;
    await transporter.sendMail({
      from,
      to,
      subject: '✅ LUKA 邮件配置测试',
      html: '<div style="font-family:sans-serif;padding:24px;background:#0d0d0d;color:#fff;border-radius:8px;"><h2>✅ 邮件配置成功</h2><p style="color:#aaa;">这是一封测试邮件。如果你收到了它，说明 SMTP 配置正确。</p></div>',
    });
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ error: '发送失败: ' + e.message });
  }
});

// 邮件日志列表
app.get('/api/admin/email-logs', requirePermission('audit.view'), async (req, res) => {
  const { type, status, search } = req.query;
  const where = {};
  if (type) where.type = type;
  if (status) where.status = status;
  if (search) where.OR = [{ toEmail: { contains: search } }, { subject: { contains: search } }];
  try {
    const list = await prisma.emailLog.findMany({
      where,
      include: { user: { select: { id: true, username: true } } },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
    res.json(list);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/admin/email-logs/:id', requirePermission('audit.view'), async (req, res) => {
  try {
    await prisma.emailLog.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (e) { res.status(400).json({ error: '删除失败' }); }
});

// 重发
app.post('/api/admin/email-logs/:id/resend', requirePermission('audit.view'), async (req, res) => {
  try {
    const log = await prisma.emailLog.findUnique({ where: { id: req.params.id } });
    if (!log) return res.status(404).json({ error: '记录不存在' });
    const tpl = EMAIL_TEMPLATES[log.type];
    if (!tpl) return res.status(400).json({ error: '模板不存在，无法重发' });

    const transporter = await getTransporter();
    if (!transporter) return res.status(400).json({ error: 'SMTP 未配置或未启用' });
    const s = await prisma.emailSetting.findUnique({ where: { id: 'singleton' } });
    const from = s.fromEmail ? `"${s.fromName}" <${s.fromEmail}>` : s.user;

    // 用最近一次业务数据重发（如果有 user，从 user 拉上下文）
    // 简化：直接用现有 subject 重发一个占位内容
    await transporter.sendMail({
      from,
      to: log.toEmail,
      subject: `[重发] ${log.subject}`,
      html: `<div style="font-family:sans-serif;padding:24px;background:#0d0d0d;color:#fff;border-radius:8px;"><h2>${log.subject}</h2><p style="color:#aaa;">这是重发的通知邮件。</p></div>`,
    });
    await prisma.emailLog.update({ where: { id: log.id }, data: { status: 'SENT', sentAt: new Date(), error: '' } });
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ error: '重发失败: ' + e.message });
  }
});

// ================= 用户间转让/赠与 =================

// 获取用户可转让的库存（仅允许转让的卡牌）
app.get('/api/inventory/transferable/:userId', async (req, res) => {
  try {
    const inv = await prisma.inventory.findMany({
      where: { userId: req.params.userId, card: { allowTransfer: true } },
      include: { card: true },
      orderBy: { id: 'desc' }
    });
    res.json(inv);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 提交转让
app.post('/api/inventory/transfer', async (req, res) => {
  const { fromUserId, toUsername, cardId, quantity, remark } = req.body;
  if (!fromUserId) return res.status(400).json({ error: '请先登录' });
  if (!toUsername || !toUsername.trim()) return res.status(400).json({ error: '请输入接收人用户名' });
  if (!cardId) return res.status(400).json({ error: '请选择要转让的卡牌' });

  const qty = parseInt(quantity) || 1;
  if (qty < 1) return res.status(400).json({ error: '数量至少为 1' });

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 找接收人
      const toUser = await tx.user.findUnique({ where: { username: toUsername.trim() } });
      if (!toUser) throw new Error('接收人不存在');
      if (toUser.id === fromUserId) throw new Error('不能转让给自己');

      // 检查卡牌
      const card = await tx.card.findUnique({ where: { id: cardId } });
      if (!card) throw new Error('卡牌不存在');
      if (!card.allowTransfer) throw new Error('该卡牌不允许转让');

      // 检查发送方库存
      const inv = await tx.inventory.findUnique({ where: { userId_cardId: { userId: fromUserId, cardId } } });
      if (!inv || inv.quantity < qty) throw new Error('库存不足');

      // 扣减发送方
      if (inv.quantity === qty) {
        await tx.inventory.delete({ where: { id: inv.id } });
      } else {
        await tx.inventory.update({ where: { id: inv.id }, data: { quantity: { decrement: qty } } });
      }

      // 增加接收方
      await tx.inventory.upsert({
        where: { userId_cardId: { userId: toUser.id, cardId } },
        update: { quantity: { increment: qty } },
        create: { userId: toUser.id, cardId, quantity: qty }
      });

      // 写转让记录
      const log = await tx.transferLog.create({
        data: { fromUserId, toUserId: toUser.id, cardId, quantity: qty, remark: remark || '' }
      });

      // 通知接收方
      await tx.notification.create({
        data: {
          userId: toUser.id,
          title: `🎁 您收到一份礼物`,
          content: `用户 ${(await tx.user.findUnique({ where: { id: fromUserId }, select: { username: true } }))?.username || '某用户'} 赠送了您 ${qty} 张「${card.name}」${remark ? `，留言：${remark}` : ''}。`
        }
      });

      return { success: true, log };
    });
    res.json(result);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// 用户的转让记录（收到的 + 发出的）
app.get('/api/user/transfers/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    const sent = await prisma.transferLog.findMany({
      where: { fromUserId: userId },
      include: { card: true, toUser: { select: { username: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100
    });
    const received = await prisma.transferLog.findMany({
      where: { toUserId: userId },
      include: { card: true, fromUser: { select: { username: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100
    });
    res.json({ sent, received });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ================= 管理后台 API =================

async function migrateRoles() {
  try {
    for (const r of SYSTEM_ROLES) {
      await prisma.role.upsert({ where: { name: r.name }, update: { permissions: r.permissions, displayName: r.displayName, description: r.description }, create: r });
    }
    const admins = await prisma.admin.findMany();
    for (const a of admins) {
      if (a.roleId) continue;
      let role = await prisma.role.findUnique({ where: { name: a.role } });
      if (!role) role = await prisma.role.findUnique({ where: { name: 'admin' } });
      if (role) await prisma.admin.update({ where: { id: a.id }, data: { roleId: role.id } });
    }
    console.log('✅ 角色迁移完成');
  } catch (e) { console.error('角色迁移失败:', e); }
}

// 统一构造登录成功后的 admin 对象
function buildAdminPayload(admin, permissions) {
  return {
    id: admin.id,
    username: admin.username,
    roleId: admin.roleId,
    role: admin.roleRef?.name || 'admin',
    roleDisplayName: admin.roleRef?.displayName || '管理员',
    permissions,
    totpEnabled: admin.totpEnabled,
  };
}

app.post('/api/admin/login', async (req, res) => {
  const { username, password, totpCode } = req.body;
  const admin = await prisma.admin.findUnique({ where: { username }, include: { roleRef: true } });
  if (!admin || admin.password !== password || !admin.isActive) {
    return res.status(401).json({ error: '账号或密码错误' });
  }

  // 已启用 2FA：密码校验通过后，如果没带 totpCode → 返回 need2FA
  if (adminNeeds2FA(admin)) {
    if (!totpCode) {
      const tempToken = newTempToken(admin.id);
      return res.json({
        success: false,
        need2FA: true,
        tempToken,
        message: '需要输入 2FA 验证码',
      });
    }

    // 校验 TOTP 或备份码
    const codeClean = String(totpCode).trim();
    let verified = false;
    let usedBackup = false;

    if (/^\d{6}$/.test(codeClean)) {
      verified = authenticator.verify({ token: codeClean, secret: admin.totpSecret });
    } else {
      // 尝试作为备份码
      const newCodesJson = tryConsumeBackupCode(admin.totpBackupCodes, codeClean);
      if (newCodesJson !== null) {
        verified = true;
        usedBackup = true;
        await prisma.admin.update({ where: { id: admin.id }, data: { totpBackupCodes: newCodesJson } });
      }
    }

    if (!verified) {
      return res.status(401).json({ error: usedBackup ? '备份码无效' : '验证码错误或已过期' });
    }

    await prisma.admin.update({ where: { id: admin.id }, data: { totpVerifiedAt: new Date() } });
  }

  await prisma.admin.update({ where: { id: admin.id }, data: { lastLoginAt: new Date() } });
  try { await prisma.adminSession.create({ data: { adminId: admin.id, adminName: admin.username, ip: getClientIp(req), userAgent: getClientUA(req) } }); } catch (e) {}
  const permissions = admin.roleRef?.name === 'super' ? ALL_PERMISSION_KEYS : (admin.roleRef?.permissions || '').split(',').filter(Boolean);
  res.json({ success: true, admin: buildAdminPayload(admin, permissions) });
});

app.use('/api/admin', async (req, res, next) => {
  const username = req.headers['x-admin-username'];
  const pwd = req.headers['x-admin-password'];
  if (!username || !pwd) return res.status(401).json({ error: '未授权' });
  const admin = await prisma.admin.findUnique({ where: { username }, include: { roleRef: true } });
  if (!admin || admin.password !== pwd || !admin.isActive) return res.status(401).json({ error: '账号或密码错误' });
  req.admin = admin;
  req.permissions = admin.roleRef?.name === 'super' ? ALL_PERMISSION_KEYS : (admin.roleRef?.permissions || '').split(',').filter(Boolean);
  prisma.adminSession.updateMany({ where: { adminId: admin.id, ip: getClientIp(req) }, data: { lastActiveAt: new Date() } }).catch(() => {});
  next();
});

function requirePermission(perm) {
  return (req, res, next) => {
    if (!req.permissions.includes(perm)) return res.status(403).json({ error: '权限不足' });
    next();
  };
}

async function writeAuditLog(admin, action, targetType, targetId, detail) {
  try { await prisma.auditLog.create({ data: { adminId: admin.id, adminName: admin.username, action, targetType: targetType || '', targetId: targetId || '', detail: typeof detail === 'string' ? detail : JSON.stringify(detail || {}) } }); } catch (e) {}
}

app.get('/api/admin/me', async (req, res) => { res.json({ id: req.admin.id, username: req.admin.username, roleId: req.admin.roleId, role: req.admin.roleRef?.name, roleDisplayName: req.admin.roleRef?.displayName, permissions: req.permissions }); });

app.get('/api/admin/stats', async (req, res) => {
  res.json({ userCount: await prisma.user.count(), cardCount: await prisma.card.count(), boxCount: await prisma.box.count(), gameCount: await prisma.game.count(), orderCount: await prisma.order.count(), openTicketCount: await prisma.ticket.count({ where: { status: { not: 'CLOSED' } } }), totalRevenue: (await prisma.order.aggregate({ where: { status: 'PAID' }, _sum: { amount: true } }))._sum.amount || 0 });
});

app.post('/api/admin/verify-password', async (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: '请输入密码' });
  if (req.admin.password !== password) return res.status(401).json({ error: '密码错误' });
  res.json({ success: true });
});

// ============ 2FA 管理 ============

// 查询当前 2FA 状态
app.get('/api/admin/2fa/status', async (req, res) => {
  try {
    const admin = await prisma.admin.findUnique({ where: { id: req.admin.id } });
    if (!admin) return res.status(404).json({ error: '管理员不存在' });
    let backupCodesLeft = 0;
    try { backupCodesLeft = JSON.parse(admin.totpBackupCodes || '[]').length; } catch (e) {}
    res.json({
      enabled: admin.totpEnabled,
      verifiedAt: admin.totpVerifiedAt,
      backupCodesLeft,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 步骤 1：生成新 secret + 二维码（不保存，用户扫码验证后再启用）
app.post('/api/admin/2fa/setup', async (req, res) => {
  try {
    const admin = await prisma.admin.findUnique({ where: { id: req.admin.id } });
    if (!admin) return res.status(404).json({ error: '管理员不存在' });
    if (admin.totpEnabled) return res.status(400).json({ error: '2FA 已启用，请先停用' });

    const secret = authenticator.generateSecret(20); // base32
    const otpauth = authenticator.keyuri(admin.username, 'LUKA Admin', secret);
    const qrDataUrl = await QRCode.toDataURL(otpauth, {
      width: 240,
      margin: 1,
      color: { dark: '#ffffff', light: '#0d0d0d' },
    });

    // 生成备份码（明文返回给用户，DB 存 hash）
    const plainBackupCodes = generateBackupCodes();

    res.json({
      secret,
      otpauth,
      qrDataUrl,
      plainBackupCodes, // 只在这里返回一次，之后无法查看明文
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 步骤 2：用 secret + 用户输入的 6 位码验证，成功后正式启用
app.post('/api/admin/2fa/enable', async (req, res) => {
  const { secret, code, plainBackupCodes } = req.body;
  if (!secret || !code) return res.status(400).json({ error: '缺少参数' });
  if (!/^\d{6}$/.test(String(code).trim())) return res.status(400).json({ error: '请输入 6 位数字验证码' });

  try {
    const isValid = authenticator.verify({ token: String(code).trim(), secret });
    if (!isValid) return res.status(400).json({ error: '验证码不正确，请检查手机时间是否准确' });

    // 把明文备份码 hash 后存库
    const hashedCodes = (plainBackupCodes || []).map(hashBackupCode);

    await prisma.admin.update({
      where: { id: req.admin.id },
      data: {
        totpSecret: secret,
        totpEnabled: true,
        totpBackupCodes: JSON.stringify(hashedCodes),
        totpVerifiedAt: new Date(),
      },
    });

    await writeAuditLog(req.admin, 'admin.2fa.enable', 'admin', req.admin.id, {});
    res.json({ success: true });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// 停用 2FA（需要输入密码 + 6 位验证码）
app.post('/api/admin/2fa/disable', async (req, res) => {
  const { password, code } = req.body;
  if (!password || !code) return res.status(400).json({ error: '请输入密码和验证码' });

  try {
    const admin = await prisma.admin.findUnique({ where: { id: req.admin.id } });
    if (!admin) return res.status(404).json({ error: '管理员不存在' });
    if (!admin.totpEnabled) return res.status(400).json({ error: '2FA 未启用' });
    if (admin.password !== password) return res.status(401).json({ error: '密码错误' });

    const isValid = authenticator.verify({ token: String(code).trim(), secret: admin.totpSecret });
    if (!isValid) return res.status(400).json({ error: '验证码错误' });

    await prisma.admin.update({
      where: { id: admin.id },
      data: { totpEnabled: false, totpSecret: '', totpBackupCodes: '', totpVerifiedAt: null },
    });

    await writeAuditLog(req.admin, 'admin.2fa.disable', 'admin', admin.id, {});
    res.json({ success: true });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// 重新生成备份码（需要密码 + 当前验证码）
app.post('/api/admin/2fa/regenerate-backup', async (req, res) => {
  const { password, code } = req.body;
  if (!password || !code) return res.status(400).json({ error: '请输入密码和验证码' });

  try {
    const admin = await prisma.admin.findUnique({ where: { id: req.admin.id } });
    if (!admin) return res.status(404).json({ error: '管理员不存在' });
    if (!admin.totpEnabled) return res.status(400).json({ error: '2FA 未启用' });
    if (admin.password !== password) return res.status(401).json({ error: '密码错误' });

    const isValid = authenticator.verify({ token: String(code).trim(), secret: admin.totpSecret });
    if (!isValid) return res.status(400).json({ error: '验证码错误' });

    const plainCodes = generateBackupCodes();
    await prisma.admin.update({
      where: { id: admin.id },
      data: { totpBackupCodes: JSON.stringify(plainCodes.map(hashBackupCode)) },
    });

    await writeAuditLog(req.admin, 'admin.2fa.regenerate_backup', 'admin', admin.id, {});
    res.json({ success: true, plainBackupCodes: plainCodes });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// ============ 赠送订单管理（后台） ============
app.get('/api/admin/transfer-logs', requirePermission('transfers.view'), async (req, res) => {
  const { username, cardName, status } = req.query;
  const where = {};
  if (username) {
    where.OR = [
      { fromUser: { username: { contains: username } } },
      { toUser: { username: { contains: username } } }
    ];
  }
  if (cardName) where.card = { name: { contains: cardName } };
  try {
    const list = await prisma.transferLog.findMany({
      where,
      include: {
        card: { select: { id: true, name: true, rarity: true, imageUrl: true } },
        fromUser: { select: { id: true, username: true } },
        toUser: { select: { id: true, username: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 500
    });
    res.json(list);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/admin/transfer-logs/:id', requirePermission('transfers.delete'), async (req, res) => {
  try {
    await prisma.transferLog.delete({ where: { id: req.params.id } });
    await writeAuditLog(req.admin, 'transfer.delete', 'transfer', req.params.id, {});
    res.json({ success: true });
  } catch (e) { res.status(400).json({ error: '删除失败' }); }
});

// ============ 投流广告管理 ============
app.get('/api/admin/ad-channels', requirePermission('adchannels.view'), async (req, res) => {
  const channels = await prisma.adChannel.findMany({ orderBy: { sortOrder: 'asc' } });
  const result = [];
  for (const c of channels) {
    const campaignCount = await prisma.adCampaign.count({ where: { channelId: c.id } });
    const kolCount = await prisma.kol.count({ where: { channelId: c.id } });
    result.push({ ...c, campaignCount, kolCount });
  }
  res.json(result);
});

app.post('/api/admin/ad-channels', requirePermission('adchannels.create'), async (req, res) => {
  const { name, displayName, type, icon, description, sortOrder } = req.body;
  if (!name || !displayName) return res.status(400).json({ error: '请填写标识和名称' });
  try {
    const c = await prisma.adChannel.create({ data: { name: name.toLowerCase().replace(/[^a-z0-9_]/g, '_'), displayName, type: type || 'PAID', icon: icon || '', description: description || '', sortOrder: parseInt(sortOrder || 0) } });
    await writeAuditLog(req.admin, 'adchannel.create', 'adchannel', c.id, { name });
    res.json({ success: true, channel: c });
  } catch (e) { res.status(400).json({ error: '标识可能已存在' }); }
});

app.put('/api/admin/ad-channels/:id', requirePermission('adchannels.edit'), async (req, res) => {
  const { displayName, type, icon, description, isActive, sortOrder } = req.body;
  const data = {};
  if (displayName) data.displayName = displayName;
  if (type) data.type = type;
  if (icon !== undefined) data.icon = icon;
  if (description !== undefined) data.description = description;
  if (isActive !== undefined) data.isActive = isActive;
  if (sortOrder !== undefined) data.sortOrder = parseInt(sortOrder);
  try { res.json({ success: true, channel: await prisma.adChannel.update({ where: { id: req.params.id }, data }) }); }
  catch (e) { res.status(400).json({ error: e.message }); }
});

app.delete('/api/admin/ad-channels/:id', requirePermission('adchannels.delete'), async (req, res) => {
  try { await prisma.adChannel.delete({ where: { id: req.params.id } }); res.json({ success: true }); }
  catch (e) { res.status(400).json({ error: '删除失败，可能有关联活动' }); }
});

app.get('/api/admin/ad-campaigns', requirePermission('adcampaigns.view'), async (req, res) => {
  res.json(await prisma.adCampaign.findMany({ include: { channel: true }, orderBy: { createdAt: 'desc' } }));
});

app.post('/api/admin/ad-campaigns', requirePermission('adcampaigns.create'), async (req, res) => {
  const { channelId, name, utmSource, utmMedium, utmCampaign, budget, actualCost, startAt, endAt, status, remark } = req.body;
  if (!channelId || !name) return res.status(400).json({ error: '请填写渠道和活动名' });
  try {
    const c = await prisma.adCampaign.create({
      data: { channelId, name, utmSource: utmSource || '', utmMedium: utmMedium || '', utmCampaign: utmCampaign || '', budget: parseInt(budget || 0), actualCost: parseInt(actualCost || 0), startAt: startAt ? new Date(startAt) : null, endAt: endAt ? new Date(endAt) : null, status: status || 'ACTIVE', remark: remark || '' }
    });
    res.json({ success: true, campaign: c });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

app.put('/api/admin/ad-campaigns/:id', requirePermission('adcampaigns.edit'), async (req, res) => {
  const { channelId, name, utmSource, utmMedium, utmCampaign, budget, actualCost, startAt, endAt, status, remark } = req.body;
  const data = {};
  if (channelId) data.channelId = channelId;
  if (name) data.name = name;
  if (utmSource !== undefined) data.utmSource = utmSource;
  if (utmMedium !== undefined) data.utmMedium = utmMedium;
  if (utmCampaign !== undefined) data.utmCampaign = utmCampaign;
  if (budget !== undefined) data.budget = parseInt(budget);
  if (actualCost !== undefined) data.actualCost = parseInt(actualCost);
  if (startAt !== undefined) data.startAt = startAt ? new Date(startAt) : null;
  if (endAt !== undefined) data.endAt = endAt ? new Date(endAt) : null;
  if (status) data.status = status;
  if (remark !== undefined) data.remark = remark;
  try { res.json({ success: true, campaign: await prisma.adCampaign.update({ where: { id: req.params.id }, data }) }); }
  catch (e) { res.status(400).json({ error: e.message }); }
});

app.delete('/api/admin/ad-campaigns/:id', requirePermission('adcampaigns.delete'), async (req, res) => {
  try { await prisma.adCampaign.delete({ where: { id: req.params.id } }); res.json({ success: true }); }
  catch (e) { res.status(400).json({ error: '删除失败' }); }
});

app.get('/api/admin/kols', requirePermission('kols.view'), async (req, res) => {
  res.json(await prisma.kol.findMany({ include: { channel: true }, orderBy: { createdAt: 'desc' } }));
});

app.post('/api/admin/kols', requirePermission('kols.create'), async (req, res) => {
  const { channelId, name, platform, contact, followers, cost, promoCode, promoLink, remark } = req.body;
  if (!name) return res.status(400).json({ error: '请填写博主名' });
  try {
    const k = await prisma.kol.create({
      data: { channelId: channelId || null, name, platform: platform || '', contact: contact || '', followers: parseInt(followers || 0), cost: parseInt(cost || 0), promoCode: promoCode || '', promoLink: promoLink || '', remark: remark || '' }
    });
    res.json({ success: true, kol: k });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

app.put('/api/admin/kols/:id', requirePermission('kols.edit'), async (req, res) => {
  const { channelId, name, platform, contact, followers, cost, promoCode, promoLink, isActive, remark } = req.body;
  const data = {};
  if (channelId !== undefined) data.channelId = channelId || null;
  if (name) data.name = name;
  if (platform !== undefined) data.platform = platform;
  if (contact !== undefined) data.contact = contact;
  if (followers !== undefined) data.followers = parseInt(followers);
  if (cost !== undefined) data.cost = parseInt(cost);
  if (promoCode !== undefined) data.promoCode = promoCode;
  if (promoLink !== undefined) data.promoLink = promoLink;
  if (isActive !== undefined) data.isActive = isActive;
  if (remark !== undefined) data.remark = remark;
  try { res.json({ success: true, kol: await prisma.kol.update({ where: { id: req.params.id }, data }) }); }
  catch (e) { res.status(400).json({ error: e.message }); }
});

app.delete('/api/admin/kols/:id', requirePermission('kols.delete'), async (req, res) => {
  try { await prisma.kol.delete({ where: { id: req.params.id } }); res.json({ success: true }); }
  catch (e) { res.status(400).json({ error: '删除失败' }); }
});

// 广告报表
app.get('/api/admin/reports/ad', requirePermission('adreports.view'), async (req, res) => {
  const days = parseInt(req.query.days || '30');
  const since = new Date(); since.setDate(since.getDate() - days);

  const channels = await prisma.adChannel.findMany({ orderBy: { sortOrder: 'asc' } });
  const result = [];

  for (const c of channels) {
    const users = await prisma.user.findMany({
      where: { adSource: c.name, createdAt: { gte: since } },
      select: { id: true, createdAt: true },
    });
    const userIds = users.map(u => u.id);
    const registerCount = userIds.length;

    const paidOrders = userIds.length > 0 ? await prisma.order.findMany({
      where: { userId: { in: userIds }, status: 'PAID' },
      select: { userId: true, amount: true },
    }) : [];
    const paidUserIds = [...new Set(paidOrders.map(o => o.userId))];
    const totalRevenue = paidOrders.reduce((s, o) => s + o.amount, 0);

    const totalCost = await prisma.adCampaign.aggregate({
      where: { channelId: c.id },
      _sum: { actualCost: true },
    });
    const cost = totalCost._sum.actualCost || 0;

    result.push({
      channelId: c.id,
      channelName: c.displayName,
      channelIcon: c.icon,
      channelType: c.type,
      registerCount,
      paidUserCount: paidUserIds.length,
      payRate: registerCount > 0 ? ((paidUserIds.length / registerCount) * 100).toFixed(2) : '0.00',
      totalRevenue,
      cost,
      roi: cost > 0 ? ((totalRevenue / cost) * 100).toFixed(2) : '0.00',
    });
  }

  const campaigns = await prisma.adCampaign.findMany({ include: { channel: true } });
  const campaignResult = [];
  for (const cp of campaigns) {
    const users = await prisma.user.findMany({
      where: { adCampaign: cp.utmCampaign, createdAt: { gte: since } },
      select: { id: true },
    });
    const userIds = users.map(u => u.id);
    const registerCount = userIds.length;

    const paidOrders = userIds.length > 0 ? await prisma.order.findMany({
      where: { userId: { in: userIds }, status: 'PAID' },
      select: { userId: true, amount: true },
    }) : [];
    const paidUserIds = [...new Set(paidOrders.map(o => o.userId))];
    const totalRevenue = paidOrders.reduce((s, o) => s + o.amount, 0);

    campaignResult.push({
      campaignId: cp.id,
      campaignName: cp.name,
      channelName: cp.channel?.displayName || '',
      utmCampaign: cp.utmCampaign,
      registerCount,
      paidUserCount: paidUserIds.length,
      payRate: registerCount > 0 ? ((paidUserIds.length / registerCount) * 100).toFixed(2) : '0.00',
      totalRevenue,
      cost: cp.actualCost,
      roi: cp.actualCost > 0 ? ((totalRevenue / cp.actualCost) * 100).toFixed(2) : '0.00',
    });
  }

  res.json({ channels: result, campaigns: campaignResult });
});

// ============ 语言管理 ============
app.get('/api/admin/languages', async (req, res) => {
  res.json(await prisma.language.findMany({ orderBy: { sortOrder: 'asc' } }));
});
app.post('/api/admin/languages', requirePermission('languages.edit'), async (req, res) => {
  const { code, name, flag, isDefault, sortOrder } = req.body;
  if (!code || !name) return res.status(400).json({ error: '请填写代码和名称' });
  try {
    if (isDefault) await prisma.language.updateMany({ data: { isDefault: false } });
    const lang = await prisma.language.create({ data: { code, name, flag: flag || '', isDefault: !!isDefault, sortOrder: parseInt(sortOrder || 0) } });
    res.json({ success: true, language: lang });
  } catch (e) { res.status(400).json({ error: '语言代码可能已存在' }); }
});
app.put('/api/admin/languages/:id', requirePermission('languages.edit'), async (req, res) => {
  const { name, flag, isDefault, isActive, sortOrder } = req.body;
  const data = {};
  if (name) data.name = name;
  if (flag !== undefined) data.flag = flag;
  if (isDefault !== undefined) { if (isDefault) await prisma.language.updateMany({ data: { isDefault: false } }); data.isDefault = isDefault; }
  if (isActive !== undefined) data.isActive = isActive;
  if (sortOrder !== undefined) data.sortOrder = parseInt(sortOrder);
  try { res.json({ success: true, language: await prisma.language.update({ where: { id: req.params.id }, data }) }); }
  catch (e) { res.status(400).json({ error: e.message }); }
});
app.delete('/api/admin/languages/:id', requirePermission('languages.edit'), async (req, res) => {
  try {
    const lang = await prisma.language.findUnique({ where: { id: req.params.id } });
    if (lang?.isDefault) return res.status(400).json({ error: '默认语言不可删除' });
    await prisma.language.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (e) { res.status(400).json({ error: '删除失败' }); }
});

app.get('/api/admin/translations', requirePermission('languages.view'), async (req, res) => {
  const { namespace, search } = req.query;
  const where = {};
  if (namespace) where.namespace = namespace;
  if (search) where.OR = [{ key: { contains: search } }, { translations: { contains: search } }];
  res.json(await prisma.translation.findMany({ where, orderBy: { key: 'asc' }, take: 2000 }));
});
app.post('/api/admin/translations', requirePermission('languages.edit'), async (req, res) => {
  const { key, namespace, translations } = req.body;
  if (!key) return res.status(400).json({ error: '请填写 key' });
  try { res.json({ success: true, translation: await prisma.translation.create({ data: { key, namespace: namespace || 'common', translations: typeof translations === 'string' ? translations : JSON.stringify(translations || {}) } }) }); }
  catch (e) { res.status(400).json({ error: '词条可能已存在' }); }
});
app.put('/api/admin/translations/:id', requirePermission('languages.edit'), async (req, res) => {
  const { namespace, translations } = req.body;
  const data = {};
  if (namespace) data.namespace = namespace;
  if (translations !== undefined) data.translations = typeof translations === 'string' ? translations : JSON.stringify(translations);
  try { res.json({ success: true, translation: await prisma.translation.update({ where: { id: req.params.id }, data }) }); }
  catch (e) { res.status(400).json({ error: e.message }); }
});
app.delete('/api/admin/translations/:id', requirePermission('languages.edit'), async (req, res) => {
  try { await prisma.translation.delete({ where: { id: req.params.id } }); res.json({ success: true }); }
  catch (e) { res.status(400).json({ error: '删除失败' }); }
});

// ============ 卡片订单 ============
app.get('/api/admin/card-orders', requirePermission('cardorders.view'), async (req, res) => {
  const { status, userId } = req.query;
  const where = {};
  if (status) where.status = status;
  if (userId) where.userId = userId;
  res.json(await prisma.cardOrder.findMany({ where, orderBy: { createdAt: 'desc' }, take: 500 }));
});
app.put('/api/admin/card-orders/:id', requirePermission('cardorders.process'), async (req, res) => {
  const { status, trackingNo, expressCompany, adminRemark } = req.body;
  const data = {};
  if (status) data.status = status;
  if (trackingNo !== undefined) data.trackingNo = trackingNo;
  if (expressCompany !== undefined) data.expressCompany = expressCompany;
  if (adminRemark !== undefined) data.adminRemark = adminRemark;
  if (status === 'SHIPPED') data.shippedAt = new Date();
  if (status && status !== 'PENDING') data.processedAt = new Date();
  try {
    const order = await prisma.cardOrder.update({ where: { id: req.params.id }, data });

    // 发货时发邮件
    if (status === 'SHIPPED' && order.userId) {
      const user = await prisma.user.findUnique({ where: { id: order.userId } });
      if (user && userWantsEmail(user, 'SHIP')) {
        sendEmail({
          to: user.email,
          type: 'SHIP',
          userId: user.id,
          data: {
            username: user.username,
            orderId: order.id.slice(0, 8),
            trackingNo: order.trackingNo,
            expressCompany: order.expressCompany,
          },
        }).catch(() => {});
      }
    }

    res.json({ success: true, order });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// ============ 弹窗 ============
app.get('/api/admin/popups', requirePermission('popups.view'), async (req, res) => {
  res.json(await prisma.popup.findMany({ orderBy: { sortOrder: 'asc' } }));
});
app.post('/api/admin/popups', requirePermission('popups.create'), async (req, res) => {
  const b = req.body;
  try {
    const popup = await prisma.popup.create({
      data: {
        title: b.title, imageUrl: b.imageUrl || '', content: b.content || '',
        buttonText: b.buttonText || '', buttonLink: b.buttonLink || '',
        position: b.position || 'HOME', positionPath: b.positionPath || '',
        delay: parseInt(b.delay || 0), frequency: b.frequency || 'ONCE', dailyLimit: parseInt(b.dailyLimit || 1),
        targetVipMin: parseInt(b.targetVipMin || 0), targetVipMax: parseInt(b.targetVipMax || 99),
        targetTags: b.targetTags || '', targetGroups: b.targetGroups || '',
        registerDaysMin: parseInt(b.registerDaysMin || 0), registerDaysMax: parseInt(b.registerDaysMax || 9999),
        minRecharge: parseInt(b.minRecharge || 0),
        startAt: b.startAt ? new Date(b.startAt) : null, endAt: b.endAt ? new Date(b.endAt) : null,
        sortOrder: parseInt(b.sortOrder || 0),
      },
    });
    res.json({ success: true, popup });
  } catch (e) { res.status(400).json({ error: e.message }); }
});
app.put('/api/admin/popups/:id', requirePermission('popups.edit'), async (req, res) => {
  const b = req.body;
  const data = {};
  const intFields = ['delay', 'dailyLimit', 'targetVipMin', 'targetVipMax', 'registerDaysMin', 'registerDaysMax', 'minRecharge', 'sortOrder'];
  const strFields = ['title', 'imageUrl', 'content', 'buttonText', 'buttonLink', 'position', 'positionPath', 'frequency', 'targetTags', 'targetGroups'];
  strFields.forEach(f => { if (b[f] !== undefined) data[f] = b[f]; });
  intFields.forEach(f => { if (b[f] !== undefined) data[f] = parseInt(b[f]); });
  if (b.isActive !== undefined) data.isActive = b.isActive;
  if (b.startAt !== undefined) data.startAt = b.startAt ? new Date(b.startAt) : null;
  if (b.endAt !== undefined) data.endAt = b.endAt ? new Date(b.endAt) : null;
  try { res.json({ success: true, popup: await prisma.popup.update({ where: { id: req.params.id }, data }) }); }
  catch (e) { res.status(400).json({ error: e.message }); }
});
app.delete('/api/admin/popups/:id', requirePermission('popups.delete'), async (req, res) => {
  try { await prisma.popup.delete({ where: { id: req.params.id } }); res.json({ success: true }); }
  catch (e) { res.status(400).json({ error: '删除失败' }); }
});

// ============ 文章 ============
app.get('/api/admin/articles', requirePermission('articles.view'), async (req, res) => {
  res.json(await prisma.article.findMany({ orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }] }));
});
app.post('/api/admin/articles', requirePermission('articles.create'), async (req, res) => {
  const b = req.body;
  try {
    const a = await prisma.article.create({ data: { slug: b.slug, category: b.category || 'NEWS', title: b.title, titleI18n: b.titleI18n || '{}', coverUrl: b.coverUrl || '', summary: b.summary || '', content: b.content || '', contentI18n: b.contentI18n || '{}', isPublished: !!b.isPublished, sortOrder: parseInt(b.sortOrder || 0) } });
    res.json({ success: true, article: a });
  } catch (e) { res.status(400).json({ error: 'slug 可能已存在' }); }
});
app.put('/api/admin/articles/:id', requirePermission('articles.edit'), async (req, res) => {
  const b = req.body;
  const data = {};
  ['slug', 'category', 'title', 'titleI18n', 'coverUrl', 'summary', 'content', 'contentI18n'].forEach(f => { if (b[f] !== undefined) data[f] = b[f]; });
  if (b.isPublished !== undefined) data.isPublished = b.isPublished;
  if (b.sortOrder !== undefined) data.sortOrder = parseInt(b.sortOrder);
  try { res.json({ success: true, article: await prisma.article.update({ where: { id: req.params.id }, data }) }); }
  catch (e) { res.status(400).json({ error: e.message }); }
});
app.delete('/api/admin/articles/:id', requirePermission('articles.delete'), async (req, res) => {
  try { await prisma.article.delete({ where: { id: req.params.id } }); res.json({ success: true }); }
  catch (e) { res.status(400).json({ error: '删除失败' }); }
});

// ============ 会话 / 导出 / 用户 / VIP / 分组 / 绑卡 ============
app.get('/api/admin/sessions', requirePermission('audit.view'), async (req, res) => {
  const since = new Date(); since.setDate(since.getDate() - 7);
  res.json(await prisma.adminSession.findMany({ where: { createdAt: { gte: since } }, orderBy: { lastActiveAt: 'desc' }, take: 200 }));
});
app.delete('/api/admin/sessions/cleanup', requirePermission('audit.view'), async (req, res) => {
  const before = new Date(); before.setDate(before.getDate() - 30);
  const result = await prisma.adminSession.deleteMany({ where: { createdAt: { lt: before } } });
  res.json({ success: true, deleted: result.count });
});

app.get('/api/admin/export/users', requirePermission('users.view'), async (req, res) => {
  const users = await prisma.user.findMany({ orderBy: { createdAt: 'desc' } });
  const header = 'ID,用户名,金币,VIP,累计充值,累计消耗,来源,注册时间,最近登录\n';
  const rows = users.map(u => [u.id, u.username, u.coins, u.vipLevel, u.totalRecharge, u.totalConsume, u.adSource || '-', u.createdAt.toISOString(), u.lastLoginAt.toISOString()].join(',')).join('\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="users_${Date.now()}.csv"`);
  res.send('\uFEFF' + header + rows);
});

app.get('/api/admin/export/orders', requirePermission('orders.view'), async (req, res) => {
  const orders = await prisma.order.findMany({ include: { user: { select: { username: true } }, option: true }, orderBy: { createdAt: 'desc' } });
  const header = '订单ID,用户名,套餐金币,赠送,金额(元),到账金币,状态,创建时间,支付时间\n';
  const rows = orders.map(o => [o.id, o.user.username, o.option.coins, o.option.bonus, (o.amount / 100).toFixed(2), o.coins, o.status, o.createdAt.toISOString(), o.paidAt ? o.paidAt.toISOString() : ''].join(',')).join('\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="orders_${Date.now()}.csv"`);
  res.send('\uFEFF' + header + rows);
});

app.get('/api/admin/users', requirePermission('users.view'), async (req, res) => {
  res.json(await prisma.user.findMany({
    select: { id: true, username: true, coins: true, vipLevel: true, totalRecharge: true, totalConsume: true, createdAt: true, lastLoginAt: true, tags: true, remark: true, groupId: true, rechargeCount: true, withdrawalCount: true, withdrawalAmount: true, adSource: true, adCampaign: true, adRef: true, group: { select: { id: true, name: true, displayName: true, color: true } } },
    orderBy: { createdAt: 'desc' }
  }));
});

app.put('/api/admin/users/:id', requirePermission('users.edit'), async (req, res) => {
  const { username, password, coins, tags, remark, vipLevel, groupId } = req.body;
  const data = {};
  if (username) data.username = username;
  if (password) data.password = password;
  if (coins !== undefined) data.coins = parseInt(coins);
  if (tags !== undefined) data.tags = tags;
  if (remark !== undefined) data.remark = remark;
  if (vipLevel !== undefined) data.vipLevel = parseInt(vipLevel);
  if (groupId !== undefined) data.groupId = groupId || null;
  try { res.json({ success: true, user: await prisma.user.update({ where: { id: req.params.id }, data }) }); }
  catch (e) { res.status(400).json({ error: e.message }); }
});

app.delete('/api/admin/users/:id', requirePermission('users.delete'), async (req, res) => {
  try { await prisma.user.delete({ where: { id: req.params.id } }); res.json({ success: true }); }
  catch (e) { res.status(400).json({ error: '删除失败' }); }
});

// 查看某用户的库存（后台用）
app.get('/api/admin/users/:id/inventory', requirePermission('users.view'), async (req, res) => {
  try {
    const list = await prisma.inventory.findMany({
      where: { userId: req.params.id },
      include: { card: true },
      orderBy: { id: 'desc' }
    });
    res.json(list);
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.get('/api/admin/vip-levels', requirePermission('users.vip'), async (req, res) => { res.json(await prisma.vipLevel.findMany({ orderBy: { level: 'asc' } })); });
app.post('/api/admin/vip-levels', requirePermission('users.vip'), async (req, res) => {
  const { level, name, sortOrder, iconUrl, rechargeAmount, consumeAmount, benefits } = req.body;
  try { res.json({ success: true, vip: await prisma.vipLevel.create({ data: { level: parseInt(level), name, sortOrder: parseInt(sortOrder || 0), iconUrl: iconUrl || '', rechargeAmount: parseInt(rechargeAmount || 0), consumeAmount: parseInt(consumeAmount || 0), benefits: benefits || '' } }) }); }
  catch (e) { res.status(400).json({ error: '等级可能已存在' }); }
});
app.put('/api/admin/vip-levels/:id', requirePermission('users.vip'), async (req, res) => {
  const { name, sortOrder, iconUrl, rechargeAmount, consumeAmount, benefits, isActive } = req.body;
  const data = {};
  if (name) data.name = name;
  if (sortOrder !== undefined) data.sortOrder = parseInt(sortOrder);
  if (iconUrl !== undefined) data.iconUrl = iconUrl;
  if (rechargeAmount !== undefined) data.rechargeAmount = parseInt(rechargeAmount);
  if (consumeAmount !== undefined) data.consumeAmount = parseInt(consumeAmount);
  if (benefits !== undefined) data.benefits = benefits;
  if (isActive !== undefined) data.isActive = isActive;
  try { res.json({ success: true, vip: await prisma.vipLevel.update({ where: { id: req.params.id }, data }) }); }
  catch (e) { res.status(400).json({ error: e.message }); }
});
app.delete('/api/admin/vip-levels/:id', requirePermission('users.vip'), async (req, res) => {
  try {
    const vip = await prisma.vipLevel.findUnique({ where: { id: req.params.id } });
    if (vip?.level === 0) return res.status(400).json({ error: 'VIP0 不可删除' });
    await prisma.vipLevel.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (e) { res.status(400).json({ error: '删除失败' }); }
});

app.get('/api/admin/user-groups', requirePermission('groups.view'), async (req, res) => {
  const groups = await prisma.userGroup.findMany({ orderBy: { sortOrder: 'asc' } });
  const result = [];
  for (const g of groups) { const count = await prisma.user.count({ where: { groupId: g.id } }); result.push({ ...g, userCount: count }); }
  res.json(result);
});
app.post('/api/admin/user-groups', requirePermission('groups.edit'), async (req, res) => {
  const { name, displayName, description, color, sortOrder } = req.body;
  try { res.json({ success: true, group: await prisma.userGroup.create({ data: { name, displayName, description: description || '', color: color || '#6366f1', sortOrder: parseInt(sortOrder || 0) } }) }); }
  catch (e) { res.status(400).json({ error: '分组标识可能已存在' }); }
});
app.put('/api/admin/user-groups/:id', requirePermission('groups.edit'), async (req, res) => {
  const { displayName, description, color, sortOrder } = req.body;
  const data = {};
  if (displayName) data.displayName = displayName;
  if (description !== undefined) data.description = description;
  if (color !== undefined) data.color = color;
  if (sortOrder !== undefined) data.sortOrder = parseInt(sortOrder);
  try { res.json({ success: true, group: await prisma.userGroup.update({ where: { id: req.params.id }, data }) }); }
  catch (e) { res.status(400).json({ error: e.message }); }
});
app.delete('/api/admin/user-groups/:id', requirePermission('groups.edit'), async (req, res) => {
  try { await prisma.userGroup.delete({ where: { id: req.params.id } }); res.json({ success: true }); }
  catch (e) { res.status(400).json({ error: '删除失败' }); }
});

app.get('/api/admin/bankcards', requirePermission('bankcards.view'), async (req, res) => {
  res.json(await prisma.bankCard.findMany({ include: { user: { select: { username: true } } }, orderBy: { createdAt: 'desc' }, take: 200 }));
});
app.delete('/api/admin/bankcards/:id', requirePermission('bankcards.edit'), async (req, res) => {
  try { await prisma.bankCard.delete({ where: { id: req.params.id } }); res.json({ success: true }); }
  catch (e) { res.status(400).json({ error: '删除失败' }); }
});

// ============ 游戏 / 卡牌 / 盲盒 ============
app.get('/api/admin/games', requirePermission('games.view'), async (req, res) => {
  const games = await prisma.game.findMany({ orderBy: { sortOrder: 'asc' } });
  const result = [];
  for (const g of games) { const boxCount = await prisma.box.count({ where: { gameId: g.id } }); result.push({ ...g, boxCount }); }
  res.json(result);
});
app.post('/api/admin/games', requirePermission('games.create'), async (req, res) => {
  const { name, displayName, description, icon, coverUrl, minVipLevel, minCoins, allowedRoles, enableLeaderboard, leaderboardMetric, leaderboardType, sortOrder } = req.body;
  try {
    const g = await prisma.game.create({ data: { name: name.toLowerCase().replace(/[^a-z0-9_]/g, '_'), displayName, description: description || '', icon: icon || '', coverUrl: coverUrl || '', minVipLevel: parseInt(minVipLevel || 0), minCoins: parseInt(minCoins || 0), allowedRoles: allowedRoles || '', enableLeaderboard: !!enableLeaderboard, leaderboardMetric: leaderboardMetric || 'CONSUME', leaderboardType: leaderboardType || 'WEEKLY', sortOrder: parseInt(sortOrder || 0) } });
    res.json({ success: true, game: g });
  } catch (e) { res.status(400).json({ error: '标识可能已存在' }); }
});
app.put('/api/admin/games/:id', requirePermission('games.edit'), async (req, res) => {
  const { displayName, description, icon, coverUrl, minVipLevel, minCoins, allowedRoles, enableLeaderboard, leaderboardMetric, leaderboardType, sortOrder, isActive } = req.body;
  const data = {};
  if (displayName) data.displayName = displayName;
  if (description !== undefined) data.description = description;
  if (icon !== undefined) data.icon = icon;
  if (coverUrl !== undefined) data.coverUrl = coverUrl;
  if (minVipLevel !== undefined) data.minVipLevel = parseInt(minVipLevel);
  if (minCoins !== undefined) data.minCoins = parseInt(minCoins);
  if (allowedRoles !== undefined) data.allowedRoles = allowedRoles;
  if (enableLeaderboard !== undefined) data.enableLeaderboard = enableLeaderboard;
  if (leaderboardMetric) data.leaderboardMetric = leaderboardMetric;
  if (leaderboardType) data.leaderboardType = leaderboardType;
  if (sortOrder !== undefined) data.sortOrder = parseInt(sortOrder);
  if (isActive !== undefined) data.isActive = isActive;
  try { res.json({ success: true, game: await prisma.game.update({ where: { id: req.params.id }, data }) }); }
  catch (e) { res.status(400).json({ error: e.message }); }
});
app.delete('/api/admin/games/:id', requirePermission('games.delete'), async (req, res) => {
  try { await prisma.game.delete({ where: { id: req.params.id } }); res.json({ success: true }); }
  catch (e) { res.status(400).json({ error: '删除失败' }); }
});

app.get('/api/admin/cards', requirePermission('cards.view'), async (req, res) => { res.json(await prisma.card.findMany({ orderBy: { createdAt: 'desc' } })); });
app.post('/api/admin/cards', requirePermission('cards.create'), async (req, res) => {
  const { name, rarity, imageUrl, description, value, allowTransfer } = req.body;
  if (!name) return res.status(400).json({ error: '请填写卡牌名称' });
  try {
    const card = await prisma.card.create({
      data: {
        name,
        rarity: rarity || 'R',
        imageUrl: imageUrl || '',
        description: description || '',
        value: parseInt(value || 0),
        allowTransfer: !!allowTransfer,
      }
    });
    res.json({ success: true, card });
  } catch (e) { res.status(400).json({ error: e.message }); }
});
app.put('/api/admin/cards/:id', requirePermission('cards.edit'), async (req, res) => {
  const { name, rarity, imageUrl, description, value, allowTransfer } = req.body;
  const data = {};
  if (name) data.name = name;
  if (rarity) data.rarity = rarity;
  if (imageUrl !== undefined) data.imageUrl = imageUrl;
  if (description !== undefined) data.description = description;
  if (value !== undefined) data.value = parseInt(value);
  if (allowTransfer !== undefined) data.allowTransfer = !!allowTransfer;
  try { res.json({ success: true, card: await prisma.card.update({ where: { id: req.params.id }, data }) }); }
  catch (e) { res.status(400).json({ error: e.message }); }
});
app.delete('/api/admin/cards/:id', requirePermission('cards.delete'), async (req, res) => {
  try { await prisma.card.delete({ where: { id: req.params.id } }); res.json({ success: true }); }
  catch (e) { res.status(400).json({ error: '删除失败' }); }
});

app.get('/api/admin/boxes', requirePermission('boxes.view'), async (req, res) => {
  res.json(await prisma.box.findMany({ include: { items: { include: { card: true } }, game: { select: { id: true, displayName: true } } }, orderBy: { createdAt: 'desc' } }));
});
app.post('/api/admin/boxes', requirePermission('boxes.create'), async (req, res) => {
  const { name, price, coverUrl, description, gameId, isFeatured, allowTransfer } = req.body;
  if (!name || price === undefined) return res.status(400).json({ error: '请填写名称和价格' });
  try {
    const box = await prisma.box.create({
      data: {
        name,
        price: parseInt(price),
        coverUrl: coverUrl || '',
        description: description || '',
        gameId: gameId || null,
        isFeatured: !!isFeatured,
        allowTransfer: !!allowTransfer,
      }
    });
    res.json({ success: true, box });
  } catch (e) { res.status(400).json({ error: e.message }); }
});
app.put('/api/admin/boxes/:id', requirePermission('boxes.edit'), async (req, res) => {
  const { name, price, coverUrl, description, isActive, gameId, isFeatured, allowTransfer } = req.body;
  const data = {};
  if (name) data.name = name;
  if (price !== undefined) data.price = parseInt(price);
  if (coverUrl !== undefined) data.coverUrl = coverUrl;
  if (description !== undefined) data.description = description;
  if (isActive !== undefined) data.isActive = isActive;
  if (gameId !== undefined) data.gameId = gameId || null;
  if (isFeatured !== undefined) data.isFeatured = !!isFeatured;
  if (allowTransfer !== undefined) data.allowTransfer = !!allowTransfer;
  try { res.json({ success: true, box: await prisma.box.update({ where: { id: req.params.id }, data }) }); }
  catch (e) { res.status(400).json({ error: e.message }); }
});
app.delete('/api/admin/boxes/:id', requirePermission('boxes.delete'), async (req, res) => {
  try { await prisma.box.delete({ where: { id: req.params.id } }); res.json({ success: true }); }
  catch (e) { res.status(400).json({ error: '删除失败' }); }
});
app.post('/api/admin/boxes/:id/items', requirePermission('boxes.probability'), async (req, res) => {
  const { cardId, weight } = req.body;
  try {
    const existing = await prisma.boxItem.findFirst({ where: { boxId: req.params.id, cardId } });
    if (existing) res.json({ success: true, item: await prisma.boxItem.update({ where: { id: existing.id }, data: { weight: parseInt(weight) } }) });
    else res.json({ success: true, item: await prisma.boxItem.create({ data: { boxId: req.params.id, cardId, weight: parseInt(weight) } }) });
  } catch (e) { res.status(400).json({ error: e.message }); }
});
app.delete('/api/admin/boxes/:boxId/items/:itemId', requirePermission('boxes.probability'), async (req, res) => {
  try { await prisma.boxItem.delete({ where: { id: req.params.itemId } }); res.json({ success: true }); }
  catch (e) { res.status(400).json({ error: e.message }); }
});

// ============ 充值套餐 / 订单 / 支付 / 交易 ============
app.get('/api/admin/recharge-options', requirePermission('recharge.view'), async (req, res) => { res.json(await prisma.rechargeOption.findMany({ orderBy: { sortOrder: 'asc' } })); });
app.post('/api/admin/recharge-options', requirePermission('recharge.create'), async (req, res) => {
  const { coins, bonus, price, sortOrder } = req.body;
  try { res.json({ success: true, option: await prisma.rechargeOption.create({ data: { coins: parseInt(coins), bonus: parseInt(bonus || 0), price: parseInt(price), sortOrder: parseInt(sortOrder || 0) } }) }); }
  catch (e) { res.status(400).json({ error: e.message }); }
});
app.put('/api/admin/recharge-options/:id', requirePermission('recharge.edit'), async (req, res) => {
  const { coins, bonus, price, isActive, sortOrder } = req.body;
  const data = {};
  if (coins !== undefined) data.coins = parseInt(coins);
  if (bonus !== undefined) data.bonus = parseInt(bonus);
  if (price !== undefined) data.price = parseInt(price);
  if (isActive !== undefined) data.isActive = isActive;
  if (sortOrder !== undefined) data.sortOrder = parseInt(sortOrder);
  try { res.json({ success: true, option: await prisma.rechargeOption.update({ where: { id: req.params.id }, data }) }); }
  catch (e) { res.status(400).json({ error: e.message }); }
});
app.delete('/api/admin/recharge-options/:id', requirePermission('recharge.delete'), async (req, res) => {
  try { await prisma.rechargeOption.delete({ where: { id: req.params.id } }); res.json({ success: true }); }
  catch (e) { res.status(400).json({ error: '删除失败' }); }
});

app.get('/api/admin/orders', requirePermission('orders.view'), async (req, res) => {
  res.json(await prisma.order.findMany({ include: { user: { select: { username: true } }, option: true }, orderBy: { createdAt: 'desc' }, take: 200 }));
});
app.put('/api/admin/orders/:id/paid', requirePermission('orders.refund'), async (req, res) => {
  try {
    const order = await prisma.order.findUnique({ where: { id: req.params.id } });
    if (!order || order.status === 'PAID') return res.status(400).json({ error: '状态异常' });
    await prisma.$transaction(async (tx) => {
      await tx.order.update({ where: { id: req.params.id }, data: { status: 'PAID', paidAt: new Date() } });
      await tx.user.update({ where: { id: order.userId }, data: { coins: { increment: order.coins }, rechargeCount: { increment: 1 }, totalRecharge: { increment: order.amount } } });
    });
    checkVipUpgrade(order.userId).catch(() => {});
    res.json({ success: true });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

app.get('/api/admin/payment-channels', requirePermission('payments.view'), async (req, res) => { res.json(await prisma.paymentChannel.findMany({ orderBy: { sortOrder: 'asc' } })); });
app.put('/api/admin/payment-channels/:id', requirePermission('payments.edit'), async (req, res) => {
  const { displayName, config, isActive, sortOrder, iconUrl } = req.body;
  const data = {};
  if (displayName) data.displayName = displayName;
  if (config !== undefined) data.config = config;
  if (isActive !== undefined) data.isActive = isActive;
  if (sortOrder !== undefined) data.sortOrder = parseInt(sortOrder);
  if (iconUrl !== undefined) data.iconUrl = iconUrl;
  try { res.json({ success: true, channel: await prisma.paymentChannel.update({ where: { id: req.params.id }, data }) }); }
  catch (e) { res.status(400).json({ error: e.message }); }
});

app.get('/api/admin/transactions', requirePermission('transactions.view'), async (req, res) => {
  const { type, userId } = req.query;
  const where = {};
  if (type) where.type = type;
  if (userId) where.userId = userId;
  res.json(await prisma.transaction.findMany({ where, orderBy: { createdAt: 'desc' }, take: 500 }));
});

app.get('/api/admin/drawlogs', requirePermission('drawlogs.view'), async (req, res) => {
  const { userId, boxId } = req.query;
  const where = {};
  if (userId) where.userId = userId;
  if (boxId) where.boxId = boxId;
  res.json(await prisma.drawLog.findMany({ where, include: { user: { select: { username: true } }, box: { select: { name: true } } }, orderBy: { createdAt: 'desc' }, take: 500 }));
});
app.get('/api/admin/export/drawlogs', requirePermission('drawlogs.export'), async (req, res) => {
  const logs = await prisma.drawLog.findMany({ include: { user: { select: { username: true } }, box: { select: { name: true } } }, orderBy: { createdAt: 'desc' }, take: 10000 });
  const header = '用户,盲盒,消耗金币,抽卡次数,产出价值,时间\n';
  const rows = logs.map(l => [l.user.username, l.box.name, l.cost, l.count, l.outputValue, l.createdAt.toISOString()].join(',')).join('\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="drawlogs_${Date.now()}.csv"`);
  res.send('\uFEFF' + header + rows);
});

// ============ 轮播图 / 站内广告 / 任务 / 兑换码 / 工单 / 通知 ============
app.get('/api/admin/banners', requirePermission('banners.view'), async (req, res) => { res.json(await prisma.banner.findMany({ orderBy: { sortOrder: 'asc' } })); });
app.post('/api/admin/banners', requirePermission('banners.create'), async (req, res) => {
  const { imageUrl, link, title, sortOrder } = req.body;
  try { res.json({ success: true, banner: await prisma.banner.create({ data: { imageUrl, link: link || '', title: title || '', sortOrder: parseInt(sortOrder || 0) } }) }); }
  catch (e) { res.status(400).json({ error: e.message }); }
});
app.put('/api/admin/banners/:id', requirePermission('banners.edit'), async (req, res) => {
  const { imageUrl, link, title, isActive, sortOrder } = req.body;
  const data = {};
  if (imageUrl) data.imageUrl = imageUrl;
  if (link !== undefined) data.link = link;
  if (title !== undefined) data.title = title;
  if (isActive !== undefined) data.isActive = isActive;
  if (sortOrder !== undefined) data.sortOrder = parseInt(sortOrder);
  try { res.json({ success: true, banner: await prisma.banner.update({ where: { id: req.params.id }, data }) }); }
  catch (e) { res.status(400).json({ error: e.message }); }
});
app.delete('/api/admin/banners/:id', requirePermission('banners.delete'), async (req, res) => {
  try { await prisma.banner.delete({ where: { id: req.params.id } }); res.json({ success: true }); }
  catch (e) { res.status(400).json({ error: e.message }); }
});

app.get('/api/admin/ads', requirePermission('ads.view'), async (req, res) => { res.json(await prisma.ad.findMany({ orderBy: { sortOrder: 'asc' } })); });
app.post('/api/admin/ads', requirePermission('ads.create'), async (req, res) => {
  const { title, imageUrl, linkType, linkValue, position, sortOrder, startAt, endAt } = req.body;
  try { res.json({ success: true, ad: await prisma.ad.create({ data: { title, imageUrl, linkType: linkType || 'URL', linkValue: linkValue || '', position: position || 'HOME_BANNER', sortOrder: parseInt(sortOrder || 0), startAt: startAt ? new Date(startAt) : null, endAt: endAt ? new Date(endAt) : null } }) }); }
  catch (e) { res.status(400).json({ error: e.message }); }
});
app.put('/api/admin/ads/:id', requirePermission('ads.edit'), async (req, res) => {
  const { title, imageUrl, linkType, linkValue, position, isActive, sortOrder, startAt, endAt } = req.body;
  const data = {};
  if (title) data.title = title;
  if (imageUrl) data.imageUrl = imageUrl;
  if (linkType) data.linkType = linkType;
  if (linkValue !== undefined) data.linkValue = linkValue;
  if (position) data.position = position;
  if (isActive !== undefined) data.isActive = isActive;
  if (sortOrder !== undefined) data.sortOrder = parseInt(sortOrder);
  if (startAt !== undefined) data.startAt = startAt ? new Date(startAt) : null;
  if (endAt !== undefined) data.endAt = endAt ? new Date(endAt) : null;
  try { res.json({ success: true, ad: await prisma.ad.update({ where: { id: req.params.id }, data }) }); }
  catch (e) { res.status(400).json({ error: e.message }); }
});
app.delete('/api/admin/ads/:id', requirePermission('ads.delete'), async (req, res) => {
  try { await prisma.ad.delete({ where: { id: req.params.id } }); res.json({ success: true }); }
  catch (e) { res.status(400).json({ error: e.message }); }
});

app.get('/api/admin/tasks', requirePermission('tasks.view'), async (req, res) => { res.json(await prisma.task.findMany({ orderBy: { sortOrder: 'asc' } })); });
app.post('/api/admin/tasks', requirePermission('tasks.create'), async (req, res) => {
  const { title, description, action, targetCount, rewardCoins, sortOrder } = req.body;
  try { res.json({ success: true, task: await prisma.task.create({ data: { title, description: description || '', action, targetCount: parseInt(targetCount), rewardCoins: parseInt(rewardCoins), sortOrder: parseInt(sortOrder || 0) } }) }); }
  catch (e) { res.status(400).json({ error: e.message }); }
});
app.put('/api/admin/tasks/:id', requirePermission('tasks.edit'), async (req, res) => {
  const { title, description, action, targetCount, rewardCoins, isActive, sortOrder } = req.body;
  const data = {};
  if (title) data.title = title;
  if (description !== undefined) data.description = description;
  if (action) data.action = action;
  if (targetCount !== undefined) data.targetCount = parseInt(targetCount);
  if (rewardCoins !== undefined) data.rewardCoins = parseInt(rewardCoins);
  if (isActive !== undefined) data.isActive = isActive;
  if (sortOrder !== undefined) data.sortOrder = parseInt(sortOrder);
  try { res.json({ success: true, task: await prisma.task.update({ where: { id: req.params.id }, data }) }); }
  catch (e) { res.status(400).json({ error: e.message }); }
});
app.delete('/api/admin/tasks/:id', requirePermission('tasks.delete'), async (req, res) => {
  try { await prisma.task.delete({ where: { id: req.params.id } }); res.json({ success: true }); }
  catch (e) { res.status(400).json({ error: '删除失败' }); }
});

app.get('/api/admin/redeem-codes', requirePermission('redeem.view'), async (req, res) => { res.json(await prisma.redeemCode.findMany({ orderBy: { createdAt: 'desc' }, take: 200 })); });
app.post('/api/admin/redeem-codes', requirePermission('redeem.create'), async (req, res) => {
  const { code, coins, maxUses } = req.body;
  try { res.json({ success: true, code: await prisma.redeemCode.create({ data: { code: code.trim().toUpperCase(), coins: parseInt(coins || 0), maxUses: parseInt(maxUses || 1) } }) }); }
  catch (e) { res.status(400).json({ error: '兑换码可能已存在' }); }
});
app.post('/api/admin/redeem-codes/batch', requirePermission('redeem.create'), async (req, res) => {
  const { count, coins, maxUses, prefix } = req.body;
  try {
    const created = [];
    const total = Math.min(parseInt(count), 100);
    for (let i = 0; i < total; i++) {
      const randomPart = Math.random().toString(36).substring(2, 10).toUpperCase();
      const code = `${(prefix || 'LUKA').toUpperCase()}-${randomPart}`;
      const c = await prisma.redeemCode.create({ data: { code, coins: parseInt(coins || 0), maxUses: parseInt(maxUses || 1) } });
      created.push(c.code);
    }
    res.json({ success: true, codes: created });
  } catch (e) { res.status(400).json({ error: e.message }); }
});
app.delete('/api/admin/redeem-codes/:id', requirePermission('redeem.delete'), async (req, res) => {
  try { await prisma.redeemCode.delete({ where: { id: req.params.id } }); res.json({ success: true }); }
  catch (e) { res.status(400).json({ error: '删除失败' }); }
});

app.get('/api/admin/tickets', requirePermission('tickets.view'), async (req, res) => {
  res.json(await prisma.ticket.findMany({ include: { user: { select: { username: true } }, replies: { orderBy: { createdAt: 'asc' } } }, orderBy: { updatedAt: 'desc' } }));
});
app.post('/api/admin/tickets/:id/reply', requirePermission('tickets.reply'), async (req, res) => {
  const { content } = req.body;
  if (!content) return res.status(400).json({ error: '请填写回复内容' });
  try {
    await prisma.$transaction(async (tx) => {
      await tx.ticketReply.create({ data: { ticketId: req.params.id, fromAdmin: true, content } });
      await tx.ticket.update({ where: { id: req.params.id }, data: { status: 'PROCESSING', updatedAt: new Date() } });
    });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.put('/api/admin/tickets/:id/close', requirePermission('tickets.close'), async (req, res) => {
  try { await prisma.ticket.update({ where: { id: req.params.id }, data: { status: 'CLOSED' } }); res.json({ success: true }); }
  catch (e) { res.status(400).json({ error: e.message }); }
});
app.delete('/api/admin/tickets/:id', requirePermission('tickets.delete'), async (req, res) => {
  try { await prisma.ticket.delete({ where: { id: req.params.id } }); res.json({ success: true }); }
  catch (e) { res.status(400).json({ error: '删除失败' }); }
});

app.get('/api/admin/notifications', requirePermission('notifications.view'), async (req, res) => {
  res.json(await prisma.notification.findMany({ include: { reads: true }, orderBy: { createdAt: 'desc' }, take: 100 }));
});
app.post('/api/admin/notifications', requirePermission('notifications.create'), async (req, res) => {
  const { userId, title, content } = req.body;
  if (!title || !content) return res.status(400).json({ error: '请填写标题和内容' });
  try { res.json({ success: true, notification: await prisma.notification.create({ data: { userId: userId || null, title, content } }) }); }
  catch (e) { res.status(400).json({ error: e.message }); }
});
app.delete('/api/admin/notifications/:id', requirePermission('notifications.delete'), async (req, res) => {
  try { await prisma.notification.delete({ where: { id: req.params.id } }); res.json({ success: true }); }
  catch (e) { res.status(400).json({ error: '删除失败' }); }
});

// ============ 管理员 / 角色 / 权限 / 菜单 / 审计 ============
app.get('/api/admin/admins', requirePermission('admins.view'), async (req, res) => {
  const admins = await prisma.admin.findMany({ include: { roleRef: true }, orderBy: { createdAt: 'asc' } });
  res.json(admins.map(a => ({ id: a.id, username: a.username, roleId: a.roleId, role: a.roleRef?.name, roleDisplayName: a.roleRef?.displayName, rolePermissions: a.roleRef?.permissions, isActive: a.isActive, createdAt: a.createdAt, lastLoginAt: a.lastLoginAt })));
});
app.post('/api/admin/admins', requirePermission('admins.create'), async (req, res) => {
  const { username, password, roleId } = req.body;
  if (!username || !password || !roleId) return res.status(400).json({ error: '请填写完整' });
  try { const admin = await prisma.admin.create({ data: { username, password, roleId, role: 'custom' } }); res.json({ success: true, admin: { id: admin.id, username: admin.username, roleId: admin.roleId } }); }
  catch (e) { res.status(400).json({ error: '用户名可能已存在' }); }
});
app.put('/api/admin/admins/:id', requirePermission('admins.edit'), async (req, res) => {
  const { password, roleId, isActive } = req.body;
  const target = await prisma.admin.findUnique({ where: { id: req.params.id }, include: { roleRef: true } });
  if (!target) return res.status(404).json({ error: '管理员不存在' });
  if (target.roleRef?.name === 'super') {
    if (roleId || password) return res.status(400).json({ error: '超级管理员不可编辑' });
    if (isActive === false) return res.status(400).json({ error: '超级管理员不可停用' });
    return res.json({ success: true });
  }
  const data = {};
  if (password) data.password = password;
  if (roleId) data.roleId = roleId;
  if (isActive !== undefined) data.isActive = isActive;
  try { await prisma.admin.update({ where: { id: req.params.id }, data }); res.json({ success: true }); }
  catch (e) { res.status(400).json({ error: e.message }); }
});
app.delete('/api/admin/admins/:id', requirePermission('admins.delete'), async (req, res) => {
  try {
    if (req.admin.id === req.params.id) return res.status(400).json({ error: '不能删除自己' });
    const target = await prisma.admin.findUnique({ where: { id: req.params.id }, include: { roleRef: true } });
    if (target?.roleRef?.name === 'super') return res.status(400).json({ error: '超级管理员不可删除' });
    await prisma.admin.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (e) { res.status(400).json({ error: '删除失败' }); }
});

app.get('/api/admin/roles', requirePermission('roles.view'), async (req, res) => {
  const roles = await prisma.role.findMany({ orderBy: { createdAt: 'asc' } });
  const result = [];
  for (const r of roles) { const adminCount = await prisma.admin.count({ where: { roleId: r.id } }); result.push({ ...r, adminCount }); }
  res.json(result);
});
app.post('/api/admin/roles', requirePermission('roles.create'), async (req, res) => {
  const { name, displayName, description, permissions } = req.body;
  if (!name || !displayName) return res.status(400).json({ error: '请填写角色标识和显示名' });
  try { res.json({ success: true, role: await prisma.role.create({ data: { name: name.toLowerCase().replace(/[^a-z0-9_]/g, '_'), displayName, description: description || '', permissions: (permissions || []).join(','), isSystem: false } }) }); }
  catch (e) { res.status(400).json({ error: '角色标识可能已存在' }); }
});
app.put('/api/admin/roles/:id', requirePermission('roles.edit'), async (req, res) => {
  const { displayName, description, permissions } = req.body;
  const role = await prisma.role.findUnique({ where: { id: req.params.id } });
  if (!role) return res.status(404).json({ error: '角色不存在' });
  if (role.name === 'super') return res.status(400).json({ error: '超级管理员角色不可编辑' });
  try { res.json({ success: true, role: await prisma.role.update({ where: { id: req.params.id }, data: { displayName: displayName || role.displayName, description: description ?? role.description, permissions: permissions ? permissions.join(',') : role.permissions } }) }); }
  catch (e) { res.status(400).json({ error: e.message }); }
});
app.delete('/api/admin/roles/:id', requirePermission('roles.delete'), async (req, res) => {
  const role = await prisma.role.findUnique({ where: { id: req.params.id } });
  if (!role) return res.status(404).json({ error: '角色不存在' });
  if (role.isSystem) return res.status(400).json({ error: '系统内置角色不可删除' });
  const adminCount = await prisma.admin.count({ where: { roleId: role.id } });
  if (adminCount > 0) return res.status(400).json({ error: `还有 ${adminCount} 位管理员使用该角色` });
  try { await prisma.role.delete({ where: { id: req.params.id } }); res.json({ success: true }); }
  catch (e) { res.status(400).json({ error: e.message }); }
});

app.get('/api/admin/permissions', async (req, res) => { res.json(ALL_PERMISSIONS); });

app.get('/api/admin/menus', async (req, res) => {
  const menus = await prisma.adminMenu.findMany({ orderBy: { sortOrder: 'asc' } });
  const tree = [];
  const map = {};
  menus.forEach(m => { map[m.id] = { ...m, children: [] }; });
  menus.forEach(m => { if (m.parentId && map[m.parentId]) map[m.parentId].children.push(map[m.id]); else tree.push(map[m.id]); });
  res.json(tree);
});
app.post('/api/admin/menus', requirePermission('menus.edit'), async (req, res) => {
  const { parentId, title, type, icon, path, component, permission, sortOrder } = req.body;
  try { res.json({ success: true, menu: await prisma.adminMenu.create({ data: { parentId: parentId || null, title, type: type || 'MENU', icon: icon || '', path: path || '', component: component || '', permission: permission || '', sortOrder: parseInt(sortOrder || 0) } }) }); }
  catch (e) { res.status(400).json({ error: e.message }); }
});
app.put('/api/admin/menus/:id', requirePermission('menus.edit'), async (req, res) => {
  const { title, icon, path, component, permission, sortOrder, isVisible, isActive } = req.body;
  const data = {};
  if (title) data.title = title;
  if (icon !== undefined) data.icon = icon;
  if (path !== undefined) data.path = path;
  if (component !== undefined) data.component = component;
  if (permission !== undefined) data.permission = permission;
  if (sortOrder !== undefined) data.sortOrder = parseInt(sortOrder);
  if (isVisible !== undefined) data.isVisible = isVisible;
  if (isActive !== undefined) data.isActive = isActive;
  try { res.json({ success: true, menu: await prisma.adminMenu.update({ where: { id: req.params.id }, data }) }); }
  catch (e) { res.status(400).json({ error: e.message }); }
});
app.delete('/api/admin/menus/:id', requirePermission('menus.edit'), async (req, res) => {
  try { await prisma.adminMenu.delete({ where: { id: req.params.id } }); res.json({ success: true }); }
  catch (e) { res.status(400).json({ error: '删除失败' }); }
});

app.get('/api/admin/audit-logs', requirePermission('audit.view'), async (req, res) => {
  const { action, adminName } = req.query;
  const where = {};
  if (action) where.action = { contains: action };
  if (adminName) where.adminName = { contains: adminName };
  res.json(await prisma.auditLog.findMany({ where, orderBy: { createdAt: 'desc' }, take: 500 }));
});

// ============ 报表 ============
app.get('/api/admin/reports/summary', requirePermission('reports.view'), async (req, res) => {
  const days = parseInt(req.query.days || '7');
  const since = new Date(); since.setDate(since.getDate() - days);
  const [newUsers, activeUsers, orders, draws] = await Promise.all([
    prisma.user.count({ where: { createdAt: { gte: since } } }),
    prisma.user.count({ where: { lastLoginAt: { gte: since } } }),
    prisma.order.findMany({ where: { status: 'PAID', createdAt: { gte: since } }, select: { amount: true, createdAt: true } }),
    prisma.drawLog.findMany({ where: { createdAt: { gte: since } }, select: { cost: true, count: true, createdAt: true } }),
  ]);
  const totalRevenue = orders.reduce((s, o) => s + o.amount, 0);
  const totalConsume = draws.reduce((s, d) => s + d.cost, 0);
  const totalDrawCount = draws.reduce((s, d) => s + d.count, 0);
  const dailyData = {};
  for (let i = 0; i < days; i++) { const d = new Date(); d.setDate(d.getDate() - i); const key = d.toISOString().slice(0, 10); dailyData[key] = { date: key, revenue: 0, consume: 0, drawCount: 0 }; }
  orders.forEach(o => { const key = o.createdAt.toISOString().slice(0, 10); if (dailyData[key]) dailyData[key].revenue += o.amount; });
  draws.forEach(d => { const key = d.createdAt.toISOString().slice(0, 10); if (dailyData[key]) { dailyData[key].consume += d.cost; dailyData[key].drawCount += d.count; } });
  res.json({ summary: { newUsers, activeUsers, totalRevenue, totalConsume, totalDrawCount, orderCount: orders.length, avgOrderAmount: orders.length ? Math.round(totalRevenue / orders.length) : 0 }, daily: Object.values(dailyData).reverse() });
});

app.get('/api/admin/reports/finance', requirePermission('reports.view'), async (req, res) => {
  const days = parseInt(req.query.days || '7');
  const since = new Date(); since.setDate(since.getDate() - days);
  const orders = await prisma.order.findMany({ where: { status: 'PAID', createdAt: { gte: since } }, select: { amount: true, createdAt: true } });
  const draws = await prisma.drawLog.findMany({ where: { createdAt: { gte: since } }, select: { cost: true, outputValue: true, createdAt: true } });
  const dailyData = {};
  for (let i = 0; i < days; i++) { const d = new Date(); d.setDate(d.getDate() - i); const key = d.toISOString().slice(0, 10); dailyData[key] = { date: key, recharge: 0, consume: 0, output: 0 }; }
  orders.forEach(o => { const key = o.createdAt.toISOString().slice(0, 10); if (dailyData[key]) dailyData[key].recharge += o.amount; });
  draws.forEach(d => { const key = d.createdAt.toISOString().slice(0, 10); if (dailyData[key]) { dailyData[key].consume += d.cost; dailyData[key].output += d.outputValue; } });
  res.json({ summary: { totalRecharge: orders.reduce((s, o) => s + o.amount, 0), totalConsume: draws.reduce((s, d) => s + d.cost, 0), totalOutput: draws.reduce((s, d) => s + d.outputValue, 0) }, daily: Object.values(dailyData).reverse() });
});

app.get('/api/admin/reports/draw', requirePermission('reports.view'), async (req, res) => {
  const days = parseInt(req.query.days || '7');
  const since = new Date(); since.setDate(since.getDate() - days);
  const logs = await prisma.drawLog.findMany({ where: { createdAt: { gte: since } } });
  const dailyData = {};
  for (let i = 0; i < days; i++) { const d = new Date(); d.setDate(d.getDate() - i); const key = d.toISOString().slice(0, 10); dailyData[key] = { date: key, count: 0, cost: 0, output: 0, users: new Set() }; }
  logs.forEach(l => { const key = l.createdAt.toISOString().slice(0, 10); if (dailyData[key]) { dailyData[key].count += l.count; dailyData[key].cost += l.cost; dailyData[key].output += l.outputValue; dailyData[key].users.add(l.userId); } });
  const result = Object.values(dailyData).map(d => ({ date: d.date, count: d.count, cost: d.cost, output: d.output, uniqueUsers: d.users.size, roi: d.cost > 0 ? ((d.output / d.cost) * 100).toFixed(2) + '%' : '0%' })).reverse();
  res.json({ summary: { totalCount: logs.reduce((s, l) => s + l.count, 0), totalCost: logs.reduce((s, l) => s + l.cost, 0), totalOutput: logs.reduce((s, l) => s + l.outputValue, 0) }, daily: result });
});

app.get('/api/admin/reports/user-draw', requirePermission('reports.view'), async (req, res) => {
  const days = parseInt(req.query.days || '7');
  const since = new Date(); since.setDate(since.getDate() - days);
  const logs = await prisma.drawLog.findMany({ where: { createdAt: { gte: since } }, include: { user: { select: { username: true, vipLevel: true } } } });
  const userMap = {};
  logs.forEach(l => {
    if (!userMap[l.userId]) userMap[l.userId] = { userId: l.userId, username: l.user.username, vipLevel: l.user.vipLevel, count: 0, cost: 0, output: 0 };
    userMap[l.userId].count += l.count;
    userMap[l.userId].cost += l.cost;
    userMap[l.userId].output += l.outputValue;
  });
  res.json({ list: Object.values(userMap).sort((a, b) => b.cost - a.cost).slice(0, 100) });
});

app.get('/api/admin/reports/user-finance', requirePermission('reports.view'), async (req, res) => {
  res.json({ list: await prisma.user.findMany({ select: { id: true, username: true, coins: true, vipLevel: true, totalRecharge: true, totalConsume: true, rechargeCount: true, createdAt: true, adSource: true }, orderBy: { totalRecharge: 'desc' }, take: 200 }) });
});

app.get('/api/admin/reports/vip-distribution', requirePermission('reports.view'), async (req, res) => {
  const levels = await prisma.vipLevel.findMany({ orderBy: { level: 'asc' } });
  const result = [];
  for (const lv of levels) {
    const count = await prisma.user.count({ where: { vipLevel: lv.level } });
    const totalRecharge = await prisma.user.aggregate({ where: { vipLevel: lv.level }, _sum: { totalRecharge: true, totalConsume: true } });
    result.push({ level: lv.level, name: lv.name, userCount: count, totalRecharge: totalRecharge._sum.totalRecharge || 0, totalConsume: totalRecharge._sum.totalConsume || 0 });
  }
  res.json({ list: result });
});

// ============ 付费留存报表 ============
// 计算两个日期之间相差的天数（忽略时分秒）
function daysBetween(a, b) {
  const d1 = new Date(a); d1.setHours(0, 0, 0, 0);
  const d2 = new Date(b); d2.setHours(0, 0, 0, 0);
  return Math.floor((d2 - d1) / (1000 * 60 * 60 * 24));
}

app.get('/api/admin/reports/retention', requirePermission('reports.view'), async (req, res) => {
  const days = parseInt(req.query.days || '30');
  const since = new Date(); since.setDate(since.getDate() - days);
  const now = new Date();

  try {
    // ---- 1. 核心指标 ----
    const totalUsers = await prisma.user.count();
    const newUsersInRange = await prisma.user.count({ where: { createdAt: { gte: since } } });

    // 所有付费用户（至少完成 1 笔 PAID 订单）
    const paidOrders = await prisma.order.findMany({
      where: { status: 'PAID' },
      select: { userId: true, amount: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });
    const paidUserIds = [...new Set(paidOrders.map(o => o.userId))];
    const paidUserCount = paidUserIds.length;

    // 区间内新增付费用户（首次付费在区间内的）
    const firstPayByUser = {};
    for (const o of paidOrders) {
      if (!firstPayByUser[o.userId]) firstPayByUser[o.userId] = o.createdAt;
    }
    const newPaidUserIds = Object.entries(firstPayByUser)
      .filter(([, t]) => new Date(t) >= since)
      .map(([uid]) => uid);
    const newPaidUserCount = newPaidUserIds.length;

    const totalRevenue = paidOrders.reduce((s, o) => s + o.amount, 0);
    const revenueInRange = paidOrders
      .filter(o => new Date(o.createdAt) >= since)
      .reduce((s, o) => s + o.amount, 0);

    const arpu = totalUsers > 0 ? Math.round(totalRevenue / totalUsers) : 0;
    const arppu = paidUserCount > 0 ? Math.round(totalRevenue / paidUserCount) : 0;
    const payRate = totalUsers > 0 ? ((paidUserCount / totalUsers) * 100).toFixed(2) : '0.00';

    // ---- 2. 充值金额分布 ----
    const amountDistribution = [
      { label: '0 元', min: 0, max: 0, count: 0 },
      { label: '1 - 30 元', min: 1, max: 3000, count: 0 },
      { label: '30 - 100 元', min: 3001, max: 10000, count: 0 },
      { label: '100 - 300 元', min: 10001, max: 30000, count: 0 },
      { label: '300 - 1000 元', min: 30001, max: 100000, count: 0 },
      { label: '1000 元以上', min: 100001, max: Infinity, count: 0 },
    ];
    const allUsers = await prisma.user.findMany({
      select: { id: true, totalRecharge: true }
    });
    for (const u of allUsers) {
      const dist = amountDistribution.find(d => u.totalRecharge >= d.min && u.totalRecharge <= d.max);
      if (dist) dist.count += 1;
    }

    // ---- 3. 复购分析 ----
    const rechargeCountByUser = {};
    for (const o of paidOrders) {
      rechargeCountByUser[o.userId] = (rechargeCountByUser[o.userId] || 0) + 1;
    }
    const repeatBuyers = Object.values(rechargeCountByUser).filter(c => c >= 2).length;
    const repeatRate = paidUserCount > 0 ? ((repeatBuyers / paidUserCount) * 100).toFixed(2) : '0.00';
    const multiPayBuckets = [
      { label: '1 次', count: Object.values(rechargeCountByUser).filter(c => c === 1).length },
      { label: '2 次', count: Object.values(rechargeCountByUser).filter(c => c === 2).length },
      { label: '3-5 次', count: Object.values(rechargeCountByUser).filter(c => c >= 3 && c <= 5).length },
      { label: '6-10 次', count: Object.values(rechargeCountByUser).filter(c => c >= 6 && c <= 10).length },
      { label: '10 次以上', count: Object.values(rechargeCountByUser).filter(c => c > 10).length },
    ];

    // ---- 4. 首充后留存（1/3/7/14/30 天） ----
    // 定义：首次付费后第 N 天是否有登录（lastLoginAt >= 首充日 + N 天）
    const retentionMilestones = [1, 3, 7, 14, 30];
    const retention = retentionMilestones.map(n => ({ day: n, cohort: 0, retained: 0, rate: '0.00' }));

    // 只统计首充日在 N 天前、有足够时间观察的用户
    for (const uid of paidUserIds) {
      const firstPayAt = firstPayByUser[uid];
      const user = allUsers.find(u => u.id === uid);
      if (!user) continue;
      // 取详细用户信息
      const fullUser = await prisma.user.findUnique({ where: { id: uid }, select: { lastLoginAt: true, createdAt: true } });
      if (!fullUser) continue;

      for (const r of retention) {
        const obsDate = new Date(firstPayAt);
        obsDate.setDate(obsDate.getDate() + r.day);
        if (obsDate > now) continue; // 还没到观察期
        r.cohort += 1;
        if (fullUser.lastLoginAt && new Date(fullUser.lastLoginAt) >= obsDate) {
          r.retained += 1;
        }
      }
    }
    for (const r of retention) {
      r.rate = r.cohort > 0 ? ((r.retained / r.cohort) * 100).toFixed(2) : '0.00';
    }

    // ---- 5. 每日新增付费用户 & 收入趋势 ----
    const dailyData = {};
    for (let i = 0; i < days; i++) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      dailyData[key] = { date: key, newPaidUsers: 0, revenue: 0, orderCount: 0, repeatRevenue: 0 };
    }
    for (const o of paidOrders) {
      const key = new Date(o.createdAt).toISOString().slice(0, 10);
      if (dailyData[key]) {
        dailyData[key].revenue += o.amount;
        dailyData[key].orderCount += 1;
      }
    }
    for (const uid of newPaidUserIds) {
      const t = firstPayByUser[uid];
      const key = new Date(t).toISOString().slice(0, 10);
      if (dailyData[key]) dailyData[key].newPaidUsers += 1;
    }

    // 复购收入 = 首充之后的订单收入
    for (const o of paidOrders) {
      const key = new Date(o.createdAt).toISOString().slice(0, 10);
      if (!dailyData[key]) continue;
      if (firstPayByUser[o.userId] !== o.createdAt) {
        dailyData[key].repeatRevenue += o.amount;
      }
    }

    res.json({
      range: { days, since: since.toISOString(), to: now.toISOString() },
      core: {
        totalUsers,
        newUsersInRange,
        paidUserCount,
        newPaidUserCount,
        payRate,
        totalRevenue,
        revenueInRange,
        arpu,
        arppu,
      },
      amountDistribution,
      repeat: {
        repeatBuyers,
        repeatRate,
        multiPayBuckets,
      },
      retention,
      daily: Object.values(dailyData).reverse(),
    });
  } catch (e) {
    console.error('retention report error:', e);
    res.status(500).json({ error: e.message });
  }
});

// ============ 广告留存报表 ============
// 结合投放渠道看用户质量：注册 → 付费 → 留存 → LTV → ROI
app.get('/api/admin/reports/ad-retention', requirePermission('adreports.view'), async (req, res) => {
  const days = parseInt(req.query.days || '30');
  const since = new Date(); since.setDate(since.getDate() - days);
  const now = new Date();

  try {
    const channels = await prisma.adChannel.findMany({ orderBy: { sortOrder: 'asc' } });
    const result = [];

    for (const c of channels) {
      // 该渠道带来的用户（时间范围内注册）
      const users = await prisma.user.findMany({
        where: { adSource: c.name, createdAt: { gte: since } },
        select: { id: true, createdAt: true, lastLoginAt: true },
      });
      const userIds = users.map(u => u.id);
      const registerCount = userIds.length;

      // 渠道花费（累计所有活动）
      const totalCost = await prisma.adCampaign.aggregate({
        where: { channelId: c.id },
        _sum: { actualCost: true },
      });
      const cost = totalCost._sum.actualCost || 0;

      // 无注册用户 → 全 0
      if (registerCount === 0) {
        result.push({
          channelId: c.id,
          channelName: c.displayName,
          channelIcon: c.icon,
          channelType: c.type,
          registerCount: 0,
          paidUserCount: 0,
          payRate: '0.00',
          totalRevenue: 0,
          avgLTV: 0,
          retentionD1: '0.00',
          retentionD3: '0.00',
          retentionD7: '0.00',
          retentionD14: '0.00',
          retentionD30: '0.00',
          cost,
          roi: '0.00',
          cac: 0,
        });
        continue;
      }

      // 付费统计
      const paidOrders = await prisma.order.findMany({
        where: { userId: { in: userIds }, status: 'PAID' },
        select: { userId: true, amount: true },
      });
      const paidUserIds = [...new Set(paidOrders.map(o => o.userId))];
      const totalRevenue = paidOrders.reduce((s, o) => s + o.amount, 0);
      const avgLTV = Math.round(totalRevenue / registerCount);
      const cac = registerCount > 0 ? Math.round(cost / registerCount) : 0;

      // 留存（按注册日算第 N 天）
      const calcRetention = (dayN) => {
        let cohort = 0, retained = 0;
        for (const u of users) {
          const obsDate = new Date(u.createdAt);
          obsDate.setDate(obsDate.getDate() + dayN);
          if (obsDate > now) continue;
          cohort += 1;
          if (u.lastLoginAt && new Date(u.lastLoginAt) >= obsDate) retained += 1;
        }
        return cohort > 0 ? ((retained / cohort) * 100).toFixed(2) : '0.00';
      };

      result.push({
        channelId: c.id,
        channelName: c.displayName,
        channelIcon: c.icon,
        channelType: c.type,
        registerCount,
        paidUserCount: paidUserIds.length,
        payRate: registerCount > 0 ? ((paidUserIds.length / registerCount) * 100).toFixed(2) : '0.00',
        totalRevenue,
        avgLTV,
        retentionD1: calcRetention(1),
        retentionD3: calcRetention(3),
        retentionD7: calcRetention(7),
        retentionD14: calcRetention(14),
        retentionD30: calcRetention(30),
        cost,
        roi: cost > 0 ? ((totalRevenue / cost) * 100).toFixed(2) : '0.00',
        cac,
      });
    }

    // 按 ROI 从高到低排序，无花费的排最后
    result.sort((a, b) => {
      const ra = parseFloat(a.roi) || 0;
      const rb = parseFloat(b.roi) || 0;
      return rb - ra;
    });

    // 汇总
    const summary = result.reduce((acc, r) => ({
      totalRegisters: acc.totalRegisters + r.registerCount,
      totalPaidUsers: acc.totalPaidUsers + r.paidUserCount,
      totalRevenue: acc.totalRevenue + r.totalRevenue,
      totalCost: acc.totalCost + r.cost,
    }), { totalRegisters: 0, totalPaidUsers: 0, totalRevenue: 0, totalCost: 0 });
    summary.payRate = summary.totalRegisters > 0 ? ((summary.totalPaidUsers / summary.totalRegisters) * 100).toFixed(2) : '0.00';
    summary.roi = summary.totalCost > 0 ? ((summary.totalRevenue / summary.totalCost) * 100).toFixed(2) : '0.00';
    summary.avgLTV = summary.totalRegisters > 0 ? Math.round(summary.totalRevenue / summary.totalRegisters) : 0;
    summary.cac = summary.totalRegisters > 0 ? Math.round(summary.totalCost / summary.totalRegisters) : 0;

    res.json({ list: result, summary, range: { days, since: since.toISOString() } });
  } catch (e) {
    console.error('ad-retention report error:', e);
    res.status(500).json({ error: e.message });
  }
});

// ================= 菜单自动同步 =================
async function syncMenus() {
  const menus = [
    { id: 'menu-dashboard', parentId: null, title: '仪表盘', type: 'MENU', icon: '📊', path: '/', component: 'DashboardPage', permission: '', sortOrder: 1 },
    { id: 'menu-user-group', parentId: null, title: '用户管理', type: 'DIRECTORY', icon: '👥', path: '', component: '', permission: '', sortOrder: 2 },
    { id: 'menu-users', parentId: 'menu-user-group', title: '用户列表', type: 'MENU', icon: '👥', path: '/users', component: 'UserList', permission: 'users.view', sortOrder: 1 },
    { id: 'menu-user-groups', parentId: 'menu-user-group', title: '用户分组', type: 'MENU', icon: '📁', path: '/user-groups', component: 'UserGroupList', permission: 'groups.view', sortOrder: 2 },
    { id: 'menu-bankcards', parentId: 'menu-user-group', title: '绑卡管理', type: 'MENU', icon: '💳', path: '/bankcards', component: 'BankCardList', permission: 'bankcards.view', sortOrder: 3 },
    { id: 'menu-vip-levels', parentId: 'menu-user-group', title: 'VIP等级设置', type: 'MENU', icon: '👑', path: '/vip-levels', component: 'VipLevels', permission: 'users.vip', sortOrder: 4 },
    { id: 'menu-game-group', parentId: null, title: '游戏管理', type: 'DIRECTORY', icon: '🎮', path: '', component: '', permission: '', sortOrder: 3 },
    { id: 'menu-games', parentId: 'menu-game-group', title: '分类管理', type: 'MENU', icon: '🎮', path: '/games', component: 'GameList', permission: 'games.view', sortOrder: 1 },
    { id: 'menu-cards', parentId: 'menu-game-group', title: '卡牌管理', type: 'MENU', icon: '🃏', path: '/cards', component: 'CardList', permission: 'cards.view', sortOrder: 2 },
    { id: 'menu-boxes', parentId: 'menu-game-group', title: '盲盒管理', type: 'MENU', icon: '📦', path: '/boxes', component: 'BoxList', permission: 'boxes.view', sortOrder: 3 },
    { id: 'menu-drawlog-group', parentId: 'menu-game-group', title: '抽奖管理', type: 'DIRECTORY', icon: '🎰', path: '', component: '', permission: '', sortOrder: 4 },
    { id: 'menu-drawlogs', parentId: 'menu-drawlog-group', title: '抽奖记录', type: 'MENU', icon: '📝', path: '/drawlogs', component: 'DrawLogList', permission: 'drawlogs.view', sortOrder: 1 },
    { id: 'menu-card-orders', parentId: 'menu-drawlog-group', title: '卡片订单', type: 'MENU', icon: '📦', path: '/card-orders', component: 'CardOrderList', permission: 'cardorders.view', sortOrder: 2 },
    { id: 'menu-transfer-logs', parentId: 'menu-drawlog-group', title: '赠送订单管理', type: 'MENU', icon: '🎁', path: '/transfer-logs', component: 'TransferLogList', permission: 'transfers.view', sortOrder: 3 },
    { id: 'menu-fund-group', parentId: null, title: '资金管理', type: 'DIRECTORY', icon: '💰', path: '', component: '', permission: '', sortOrder: 4 },
    { id: 'menu-payment-channels', parentId: 'menu-fund-group', title: '支付管理', type: 'MENU', icon: '💳', path: '/payment-channels', component: 'PaymentChannelList', permission: 'payments.view', sortOrder: 1 },
    { id: 'menu-orders', parentId: 'menu-fund-group', title: '充值记录', type: 'MENU', icon: '📥', path: '/orders', component: 'OrderList', permission: 'orders.view', sortOrder: 2 },
    { id: 'menu-transactions', parentId: 'menu-fund-group', title: '交易明细', type: 'MENU', icon: '📊', path: '/transactions', component: 'TransactionList', permission: 'transactions.view', sortOrder: 4 },
    { id: 'menu-recharge', parentId: 'menu-fund-group', title: '充值套餐', type: 'MENU', icon: '💰', path: '/recharge-options', component: 'RechargeList', permission: 'recharge.view', sortOrder: 5 },
    { id: 'menu-report-group', parentId: null, title: '报表管理', type: 'DIRECTORY', icon: '📈', path: '', component: '', permission: '', sortOrder: 5 },
    { id: 'menu-report-summary', parentId: 'menu-report-group', title: '汇总报表', type: 'MENU', icon: '📊', path: '/reports/summary', component: 'ReportSummary', permission: 'reports.view', sortOrder: 1 },
    { id: 'menu-report-finance', parentId: 'menu-report-group', title: '资金报表', type: 'MENU', icon: '💰', path: '/reports/finance', component: 'ReportFinance', permission: 'reports.view', sortOrder: 2 },
    { id: 'menu-report-draw', parentId: 'menu-report-group', title: '抽奖报表', type: 'MENU', icon: '🎰', path: '/reports/draw', component: 'ReportDraw', permission: 'reports.view', sortOrder: 3 },
    { id: 'menu-report-user-draw', parentId: 'menu-report-group', title: '用户抽奖报表', type: 'MENU', icon: '👤', path: '/reports/user-draw', component: 'ReportUserDraw', permission: 'reports.view', sortOrder: 4 },
    { id: 'menu-report-user-finance', parentId: 'menu-report-group', title: '用户资金报表', type: 'MENU', icon: '💵', path: '/reports/user-finance', component: 'ReportUserFinance', permission: 'reports.view', sortOrder: 5 },
    { id: 'menu-report-vip', parentId: 'menu-report-group', title: 'VIP分布报表', type: 'MENU', icon: '👑', path: '/reports/vip-distribution', component: 'ReportVipDistribution', permission: 'reports.view', sortOrder: 6 },
    { id: 'menu-report-card-ranking', parentId: 'menu-report-group', title: '卡牌排行榜', type: 'MENU', icon: '🏆', path: '/reports/card-ranking', component: 'ReportCardRanking', permission: 'reports.view', sortOrder: 7 },
    { id: 'menu-report-retention', parentId: 'menu-report-group', title: '付费留存报表', type: 'MENU', icon: '💹', path: '/reports/retention', component: 'ReportRetention', permission: 'reports.view', sortOrder: 8 },
    { id: 'menu-ad-group', parentId: null, title: '广告管理', type: 'DIRECTORY', icon: '📣', path: '', component: '', permission: '', sortOrder: 6 },
    { id: 'menu-ad-channels', parentId: 'menu-ad-group', title: '投放渠道', type: 'MENU', icon: '📡', path: '/ad-channels', component: 'AdChannelList', permission: 'adchannels.view', sortOrder: 1 },
    { id: 'menu-ad-campaigns', parentId: 'menu-ad-group', title: '投放活动', type: 'MENU', icon: '📢', path: '/ad-campaigns', component: 'AdCampaignList', permission: 'adcampaigns.view', sortOrder: 2 },
    { id: 'menu-kols', parentId: 'menu-ad-group', title: 'KOL/博主管理', type: 'MENU', icon: '👤', path: '/kols', component: 'KolList', permission: 'kols.view', sortOrder: 3 },
    { id: 'menu-ad-reports', parentId: 'menu-ad-group', title: '广告报表', type: 'MENU', icon: '📊', path: '/ad-reports', component: 'AdReport', permission: 'adreports.view', sortOrder: 4 },
    { id: 'menu-ad-retention', parentId: 'menu-ad-group', title: '广告留存报表', type: 'MENU', icon: '📈', path: '/ad-retention', component: 'AdRetentionReport', permission: 'adreports.view', sortOrder: 5 },
    { id: 'menu-notification-group', parentId: null, title: '通知管理', type: 'DIRECTORY', icon: '🔔', path: '', component: '', permission: '', sortOrder: 7 },
    { id: 'menu-notifications', parentId: 'menu-notification-group', title: '通知列表', type: 'MENU', icon: '🔔', path: '/notifications', component: 'NotificationList', permission: 'notifications.view', sortOrder: 1 },
    { id: 'menu-banners', parentId: 'menu-notification-group', title: '轮播图', type: 'MENU', icon: '🖼️', path: '/banners', component: 'BannerList', permission: 'banners.view', sortOrder: 2 },
    { id: 'menu-popups', parentId: 'menu-notification-group', title: '弹窗管理', type: 'MENU', icon: '💬', path: '/popups', component: 'PopupList', permission: 'popups.view', sortOrder: 3 },
    { id: 'menu-articles', parentId: 'menu-notification-group', title: '文章管理', type: 'MENU', icon: '📄', path: '/articles', component: 'ArticleList', permission: 'articles.view', sortOrder: 4 },
    { id: 'menu-ads', parentId: 'menu-notification-group', title: '站内广告', type: 'MENU', icon: '📺', path: '/ads', component: 'AdList', permission: 'ads.view', sortOrder: 5 },
    { id: 'menu-tasks', parentId: null, title: '任务管理', type: 'MENU', icon: '🎯', path: '/tasks', component: 'TaskList', permission: 'tasks.view', sortOrder: 8 },
    { id: 'menu-redeem', parentId: null, title: '兑换码', type: 'MENU', icon: '🎁', path: '/redeem-codes', component: 'RedeemCodeList', permission: 'redeem.view', sortOrder: 9 },
    { id: 'menu-tickets', parentId: null, title: '客服工单', type: 'MENU', icon: '🎧', path: '/tickets', component: 'TicketList', permission: 'tickets.view', sortOrder: 10 },
    { id: 'menu-system-group', parentId: null, title: '系统管理', type: 'DIRECTORY', icon: '⚙️', path: '', component: '', permission: '', sortOrder: 99 },
    { id: 'menu-email-setting', parentId: 'menu-system-group', title: '邮件配置', type: 'MENU', icon: '📧', path: '/system/email-setting', component: 'EmailSettingPage', permission: 'audit.view', sortOrder: 7 },
    { id: 'menu-email-logs', parentId: 'menu-system-group', title: '邮件日志', type: 'MENU', icon: '📨', path: '/system/email-logs', component: 'EmailLogList', permission: 'audit.view', sortOrder: 8 },
    { id: 'menu-security', parentId: 'menu-system-group', title: '账号安全', type: 'MENU', icon: '🔐', path: '/system/security', component: 'SecurityPage', permission: '', sortOrder: 9 },
    { id: 'menu-admins', parentId: 'menu-system-group', title: '管理员列表', type: 'MENU', icon: '👤', path: '/admins', component: 'AdminList', permission: 'admins.view', sortOrder: 1 },
    { id: 'menu-roles', parentId: 'menu-system-group', title: '角色管理', type: 'MENU', icon: '🎭', path: '/admins/roles', component: 'RoleList', permission: 'roles.view', sortOrder: 2 },
    { id: 'menu-permissions', parentId: 'menu-system-group', title: '权限说明', type: 'MENU', icon: '📖', path: '/admins/permissions', component: 'PermissionList', permission: '', sortOrder: 3 },
    { id: 'menu-menus', parentId: 'menu-system-group', title: '菜单管理', type: 'MENU', icon: '🧩', path: '/admins/menus', component: 'MenuManage', permission: 'menus.edit', sortOrder: 4 },
    { id: 'menu-languages', parentId: 'menu-system-group', title: '语言列表', type: 'MENU', icon: '🌐', path: '/system/languages', component: 'LanguageList', permission: 'languages.view', sortOrder: 5 },
    { id: 'menu-translations', parentId: 'menu-system-group', title: '翻译词条', type: 'MENU', icon: '📝', path: '/system/translations', component: 'TranslationList', permission: 'languages.view', sortOrder: 6 },
    { id: 'menu-audit-logs', parentId: 'menu-system-group', title: '操作日志', type: 'MENU', icon: '📝', path: '/admins/audit-logs', component: 'AuditLogList', permission: 'audit.view', sortOrder: 7 },
    { id: 'menu-sessions', parentId: 'menu-system-group', title: '会话管理', type: 'MENU', icon: '💻', path: '/admins/sessions', component: 'SessionList', permission: 'audit.view', sortOrder: 8 },
  ];

  let created = 0, updated = 0;
  for (const m of menus) {
    const existing = await prisma.adminMenu.findUnique({ where: { id: m.id } });
    await prisma.adminMenu.upsert({
      where: { id: m.id },
      update: { title: m.title, icon: m.icon, path: m.path, component: m.component, permission: m.permission, sortOrder: m.sortOrder, parentId: m.parentId },
      create: m,
    });
    if (existing) updated++; else created++;
  }
  // 清理已废弃的提现菜单
  try { await prisma.adminMenu.delete({ where: { id: 'menu-withdrawals' } }); } catch (e) {}
  console.log(`✅ 菜单同步完成：新增 ${created} 条，更新 ${updated} 条`);
}

// ================= 服务启动 =================
const PORT = process.env.PORT || 3001;

async function bootstrap() {
  await migrateRoles();
  await syncMenus();
  app.listen(PORT, '0.0.0.0', () => console.log(`🚀 后端服务器运行在 http://localhost:${PORT}`));
}

bootstrap().catch(e => { console.error('启动失败:', e); process.exit(1); });
