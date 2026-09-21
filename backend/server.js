const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const app = express();

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));

// ================= 辅助函数 =================
function getClientIp(req) {
  return (req.headers['x-forwarded-for'] || '').split(',')[0].trim()
    || req.headers['x-real-ip']
    || req.connection?.remoteAddress
    || '';
}
function getClientUA(req) {
  return (req.headers['user-agent'] || '').slice(0, 200);
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
  { key: 'withdrawals.view', label: '查看提现', group: '资金管理' },
  { key: 'withdrawals.approve', label: '审批提现', group: '资金管理' },
  { key: 'transactions.view', label: '查看交易明细', group: '资金管理' },
  { key: 'drawlogs.view', label: '查看抽奖记录', group: '抽奖管理' },
  { key: 'drawlogs.export', label: '导出抽奖记录', group: '抽奖管理' },
  { key: 'banners.view', label: '查看轮播图', group: '广告管理' },
  { key: 'banners.create', label: '新增轮播图', group: '广告管理' },
  { key: 'banners.edit', label: '编辑轮播图', group: '广告管理' },
  { key: 'banners.delete', label: '删除轮播图', group: '广告管理' },
  { key: 'ads.view', label: '查看广告', group: '广告管理' },
  { key: 'ads.create', label: '新增广告', group: '广告管理' },
  { key: 'ads.edit', label: '编辑广告', group: '广告管理' },
  { key: 'ads.delete', label: '删除广告', group: '广告管理' },
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
  { key: 'audit.view', label: '查看操作日志', group: '系统管理' },
];

const ALL_PERMISSION_KEYS = ALL_PERMISSIONS.map(p => p.key);

const SYSTEM_ROLES = [
  {
    name: 'super',
    displayName: '超级管理员',
    description: '拥有全部权限，不可编辑、不可删除',
    permissions: ALL_PERMISSION_KEYS.join(','),
    isSystem: true,
  },
  {
    name: 'admin',
    displayName: '管理员',
    description: '日常运营管理',
    permissions: ALL_PERMISSION_KEYS.filter(k => !k.startsWith('admins.') && !k.startsWith('roles.') && !k.startsWith('menus.')).join(','),
    isSystem: true,
  },
  {
    name: 'operator',
    displayName: '运营专员',
    description: '管理卡牌、盲盒、活动等运营内容',
    permissions: [
      'users.view', 'groups.view',
      'games.view',
      'cards.view', 'cards.create', 'cards.edit',
      'boxes.view', 'boxes.create', 'boxes.edit', 'boxes.probability',
      'banners.view', 'banners.create', 'banners.edit',
      'ads.view', 'ads.create', 'ads.edit',
      'tasks.view', 'tasks.create', 'tasks.edit',
      'redeem.view', 'redeem.create',
      'notifications.view', 'notifications.create',
      'orders.view',
    ].join(','),
    isSystem: true,
  },
  {
    name: 'support',
    displayName: '客服专员',
    description: '处理用户问题和工单',
    permissions: [
      'users.view',
      'tickets.view', 'tickets.reply', 'tickets.close',
      'notifications.view', 'notifications.create',
      'orders.view',
    ].join(','),
    isSystem: true,
  },
];

// ================= 用户端 API =================

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await prisma.user.findUnique({
    where: { username },
    include: { inventory: { include: { card: true } } }
  });
  if (!user || user.password !== password) return res.status(401).json({ error: '用户名或密码错误' });
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  res.json(user);
});

app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: '请输入用户名和密码' });
  try {
    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) return res.status(400).json({ error: '用户名已存在' });
    const newUser = await prisma.user.create({ data: { username, password, coins: 10000 } });
    res.json({ success: true, user: newUser });
  } catch (error) { res.status(500).json({ error: '注册失败' }); }
});

app.get('/api/games', async (req, res) => {
  res.json(await prisma.game.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
  }));
});

app.get('/api/games/:id', async (req, res) => {
  const game = await prisma.game.findUnique({
    where: { id: req.params.id },
    include: { boxes: { where: { isActive: true } } },
  });
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
  if (game.minVipLevel > 0 && user.vipLevel < game.minVipLevel) {
    return res.json({ allowed: false, reason: `需要 VIP${game.minVipLevel} 以上` });
  }
  if (game.minCoins > 0 && user.coins < game.minCoins) {
    return res.json({ allowed: false, reason: `需要余额 ${game.minCoins} 以上` });
  }
  res.json({ allowed: true });
});

app.get('/api/boxes', async (req, res) => {
  res.json(await prisma.box.findMany({ where: { isActive: true }, include: { game: true } }));
});

app.post('/api/draw', async (req, res) => {
  const { userId, boxId, count } = req.body;
  try {
    const result = await prisma.$transaction(async (tx) => {
      const box = await tx.box.findUnique({
        where: { id: boxId },
        include: { game: true, items: { include: { card: true } } }
      });
      const user = await tx.user.findUnique({ where: { id: userId } });

      if (box.game && box.game.minVipLevel > 0 && user.vipLevel < box.game.minVipLevel) {
        throw new Error(`需要 VIP${box.game.minVipLevel} 以上`);
      }
      if (box.game && box.game.minCoins > 0 && user.coins < box.game.minCoins) {
        throw new Error(`需要余额 ${box.game.minCoins} 以上`);
      }

      const totalCost = box.price * count;
      if (user.coins < totalCost) throw new Error('金币不足');

      await tx.user.update({
        where: { id: userId },
        data: { coins: { decrement: totalCost }, totalConsume: { increment: totalCost } },
      });

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
      await tx.transaction.create({
        data: { userId, type: 'CONSUME', amount: -totalCost, balance: user.coins - totalCost, refType: 'DRAW', refId: boxId, remark: `抽卡 ${count} 次` },
      });

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

async function checkVipUpgrade(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return;
  const levels = await prisma.vipLevel.findMany({ where: { isActive: true }, orderBy: { level: 'desc' } });
  for (const lv of levels) {
    if (user.totalRecharge >= lv.rechargeAmount && user.totalConsume >= lv.consumeAmount) {
      if (user.vipLevel !== lv.level) {
        await prisma.user.update({ where: { id: userId }, data: { vipLevel: lv.level } });
      }
      break;
    }
  }
}

app.get('/api/tasks/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    const tasks = await prisma.task.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } });
    const result = [];
    for (const task of tasks) {
      let ut = await prisma.userTask.findUnique({ where: { userId_taskId: { userId, taskId: task.id } } });
      if (!ut) ut = await prisma.userTask.create({ data: { userId, taskId: task.id, progress: 0 } });
      result.push({
        taskId: task.id, title: task.title, description: task.description,
        action: task.action, targetCount: task.targetCount, rewardCoins: task.rewardCoins,
        progress: ut.progress, isClaimed: ut.isClaimed
      });
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
      const order = await tx.order.create({
        data: { userId, optionId, amount: option.price, coins: totalCoins, status: 'PAID', paidAt: new Date() }
      });
      await tx.user.update({
        where: { id: userId },
        data: {
          coins: { increment: totalCoins },
          rechargeCount: { increment: 1 },
          totalRecharge: { increment: option.price },
        }
      });
      await tx.transaction.create({
        data: { userId, type: 'RECHARGE', amount: option.price, balance: 0, refType: 'ORDER', refId: order.id, remark: `充值 ¥${(option.price / 100).toFixed(2)}` },
      });
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
  res.json(await prisma.order.findMany({
    where: { userId: req.params.userId }, include: { option: true },
    orderBy: { createdAt: 'desc' }, take: 100
  }));
});

app.get('/api/leaderboard/weekly', async (req, res) => {
  const since = new Date(); since.setDate(since.getDate() - 7);
  const result = await prisma.drawLog.groupBy({
    by: ['userId'], where: { createdAt: { gte: since } },
    _sum: { cost: true }, orderBy: { _sum: { cost: 'desc' } }, take: 10
  });
  const data = [];
  for (const row of result) {
    const user = await prisma.user.findUnique({ where: { id: row.userId }, select: { username: true, vipLevel: true } });
    data.push({ username: user?.username || '未知', vipLevel: user?.vipLevel || 0, totalCost: row._sum.cost || 0 });
  }
  res.json(data);
});

app.get('/api/leaderboard/monthly', async (req, res) => {
  const since = new Date(); since.setDate(since.getDate() - 30);
  const result = await prisma.drawLog.groupBy({
    by: ['userId'], where: { createdAt: { gte: since } },
    _sum: { cost: true }, orderBy: { _sum: { cost: 'desc' } }, take: 10
  });
  const data = [];
  for (const row of result) {
    const user = await prisma.user.findUnique({ where: { id: row.userId }, select: { username: true, vipLevel: true } });
    data.push({ username: user?.username || '未知', vipLevel: user?.vipLevel || 0, totalCost: row._sum.cost || 0 });
  }
  res.json(data);
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
  res.json(await prisma.ticket.findMany({
    where: { userId: req.params.userId },
    include: { replies: { orderBy: { createdAt: 'asc' } } },
    orderBy: { createdAt: 'desc' }
  }));
});

app.get('/api/notifications/:userId', async (req, res) => {
  const { userId } = req.params;
  const notifications = await prisma.notification.findMany({
    where: { OR: [{ userId }, { userId: null }] },
    orderBy: { createdAt: 'desc' }, take: 50
  });
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
  const existing = await prisma.notificationRead.findUnique({
    where: { notificationId_userId: { notificationId: req.params.id, userId } }
  });
  if (!existing) await prisma.notificationRead.create({ data: { notificationId: req.params.id, userId } });
  res.json({ success: true });
});

// ================= 管理后台 API =================

async function migrateRoles() {
  try {
    for (const r of SYSTEM_ROLES) {
      await prisma.role.upsert({
        where: { name: r.name },
        update: { permissions: r.permissions, displayName: r.displayName, description: r.description },
        create: r,
      });
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
migrateRoles();

app.post('/api/admin/login', async (req, res) => {
  const { username, password } = req.body;
  const admin = await prisma.admin.findUnique({ where: { username }, include: { roleRef: true } });
  if (!admin || admin.password !== password || !admin.isActive) {
    return res.status(401).json({ error: '账号或密码错误' });
  }
  await prisma.admin.update({ where: { id: admin.id }, data: { lastLoginAt: new Date() } });

  try {
    await prisma.adminSession.create({
      data: { adminId: admin.id, adminName: admin.username, ip: getClientIp(req), userAgent: getClientUA(req) },
    });
  } catch (e) { console.error('会话记录失败:', e); }

  const permissions = admin.roleRef?.name === 'super'
    ? ALL_PERMISSION_KEYS
    : (admin.roleRef?.permissions || '').split(',').filter(Boolean);

  res.json({
    success: true,
    admin: {
      id: admin.id, username: admin.username, roleId: admin.roleId,
      role: admin.roleRef?.name || 'admin',
      roleDisplayName: admin.roleRef?.displayName || '管理员',
      permissions,
    },
  });
});

app.use('/api/admin', async (req, res, next) => {
  const username = req.headers['x-admin-username'];
  const pwd = req.headers['x-admin-password'];
  if (!username || !pwd) return res.status(401).json({ error: '未授权' });
  const admin = await prisma.admin.findUnique({ where: { username }, include: { roleRef: true } });
  if (!admin || admin.password !== pwd || !admin.isActive) {
    return res.status(401).json({ error: '账号或密码错误' });
  }
  req.admin = admin;
  req.permissions = admin.roleRef?.name === 'super'
    ? ALL_PERMISSION_KEYS
    : (admin.roleRef?.permissions || '').split(',').filter(Boolean);

  prisma.adminSession.updateMany({
    where: { adminId: admin.id, ip: getClientIp(req) },
    data: { lastActiveAt: new Date() },
  }).catch(() => {});

  next();
});

function requirePermission(perm) {
  return (req, res, next) => {
    if (!req.permissions.includes(perm)) return res.status(403).json({ error: '权限不足' });
    next();
  };
}

async function writeAuditLog(admin, action, targetType, targetId, detail) {
  try {
    await prisma.auditLog.create({
      data: {
        adminId: admin.id, adminName: admin.username, action,
        targetType: targetType || '', targetId: targetId || '',
        detail: typeof detail === 'string' ? detail : JSON.stringify(detail || {}),
      },
    });
  } catch (e) { console.error('审计日志写入失败:', e); }
}

app.get('/api/admin/me', async (req, res) => {
  res.json({
    id: req.admin.id, username: req.admin.username, roleId: req.admin.roleId,
    role: req.admin.roleRef?.name, roleDisplayName: req.admin.roleRef?.displayName,
    permissions: req.permissions,
  });
});

app.get('/api/admin/stats', async (req, res) => {
  res.json({
    userCount: await prisma.user.count(),
    cardCount: await prisma.card.count(),
    boxCount: await prisma.box.count(),
    gameCount: await prisma.game.count(),
    orderCount: await prisma.order.count(),
    openTicketCount: await prisma.ticket.count({ where: { status: { not: 'CLOSED' } } }),
    totalRevenue: (await prisma.order.aggregate({ where: { status: 'PAID' }, _sum: { amount: true } }))._sum.amount || 0,
  });
});

app.post('/api/admin/verify-password', async (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: '请输入密码' });
  if (req.admin.password !== password) return res.status(401).json({ error: '密码错误' });
  res.json({ success: true });
});

// ============ 会话管理 ============
app.get('/api/admin/sessions', requirePermission('audit.view'), async (req, res) => {
  const since = new Date(); since.setDate(since.getDate() - 7);
  res.json(await prisma.adminSession.findMany({
    where: { createdAt: { gte: since } },
    orderBy: { lastActiveAt: 'desc' }, take: 200,
  }));
});

app.delete('/api/admin/sessions/cleanup', requirePermission('audit.view'), async (req, res) => {
  const before = new Date(); before.setDate(before.getDate() - 30);
  const result = await prisma.adminSession.deleteMany({ where: { createdAt: { lt: before } } });
  await writeAuditLog(req.admin, 'session.cleanup', 'session', '', { deleted: result.count });
  res.json({ success: true, deleted: result.count });
});

// ============ 数据导出 ============
app.get('/api/admin/export/users', requirePermission('users.view'), async (req, res) => {
  const users = await prisma.user.findMany({ orderBy: { createdAt: 'desc' } });
  const header = 'ID,用户名,金币,VIP,累计充值,累计消耗,注册时间,最近登录\n';
  const rows = users.map(u => [
    u.id, u.username, u.coins, u.vipLevel, u.totalRecharge, u.totalConsume,
    u.createdAt.toISOString(), u.lastLoginAt.toISOString(),
  ].join(',')).join('\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="users_${Date.now()}.csv"`);
  res.send('\uFEFF' + header + rows);
});

app.get('/api/admin/export/orders', requirePermission('orders.view'), async (req, res) => {
  const orders = await prisma.order.findMany({
    include: { user: { select: { username: true } }, option: true },
    orderBy: { createdAt: 'desc' },
  });
  const header = '订单ID,用户名,套餐金币,赠送,金额(元),到账金币,状态,创建时间,支付时间\n';
  const rows = orders.map(o => [
    o.id, o.user.username, o.option.coins, o.option.bonus,
    (o.amount / 100).toFixed(2), o.coins, o.status,
    o.createdAt.toISOString(), o.paidAt ? o.paidAt.toISOString() : '',
  ].join(',')).join('\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="orders_${Date.now()}.csv"`);
  res.send('\uFEFF' + header + rows);
});

// ============ 用户管理 ============
app.get('/api/admin/users', requirePermission('users.view'), async (req, res) => {
  res.json(await prisma.user.findMany({
    select: {
      id: true, username: true, coins: true, vipLevel: true, totalRecharge: true, totalConsume: true,
      createdAt: true, lastLoginAt: true, tags: true, remark: true, groupId: true,
      rechargeCount: true, withdrawalCount: true, withdrawalAmount: true,
      group: { select: { id: true, name: true, displayName: true, color: true } },
    },
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
  try {
    const user = await prisma.user.update({ where: { id: req.params.id }, data });
    await writeAuditLog(req.admin, 'user.update', 'user', user.id, { username, coins });
    res.json({ success: true, user });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

app.delete('/api/admin/users/:id', requirePermission('users.delete'), async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    await prisma.user.delete({ where: { id: req.params.id } });
    await writeAuditLog(req.admin, 'user.delete', 'user', req.params.id, { username: user?.username });
    res.json({ success: true });
  } catch (e) { res.status(400).json({ error: '删除失败' }); }
});

// ============ VIP 等级管理 ============
app.get('/api/admin/vip-levels', requirePermission('users.vip'), async (req, res) => {
  res.json(await prisma.vipLevel.findMany({ orderBy: { level: 'asc' } }));
});

app.post('/api/admin/vip-levels', requirePermission('users.vip'), async (req, res) => {
  const { level, name, sortOrder, iconUrl, rechargeAmount, consumeAmount, benefits } = req.body;
  try {
    const vip = await prisma.vipLevel.create({
      data: {
        level: parseInt(level), name, sortOrder: parseInt(sortOrder || 0),
        iconUrl: iconUrl || '', rechargeAmount: parseInt(rechargeAmount || 0),
        consumeAmount: parseInt(consumeAmount || 0), benefits: benefits || '',
      },
    });
    await writeAuditLog(req.admin, 'vip.create', 'vip', vip.id, { level, name });
    res.json({ success: true, vip });
  } catch (e) { res.status(400).json({ error: '等级可能已存在' }); }
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
  try {
    const vip = await prisma.vipLevel.update({ where: { id: req.params.id }, data });
    await writeAuditLog(req.admin, 'vip.update', 'vip', vip.id, { name });
    res.json({ success: true, vip });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

app.delete('/api/admin/vip-levels/:id', requirePermission('users.vip'), async (req, res) => {
  try {
    const vip = await prisma.vipLevel.findUnique({ where: { id: req.params.id } });
    if (vip?.level === 0) return res.status(400).json({ error: 'VIP0 不可删除' });
    await prisma.vipLevel.delete({ where: { id: req.params.id } });
    await writeAuditLog(req.admin, 'vip.delete', 'vip', req.params.id, { level: vip?.level });
    res.json({ success: true });
  } catch (e) { res.status(400).json({ error: '删除失败' }); }
});

// ============ 用户分组 ============
app.get('/api/admin/user-groups', requirePermission('groups.view'), async (req, res) => {
  const groups = await prisma.userGroup.findMany({ orderBy: { sortOrder: 'asc' } });
  const result = [];
  for (const g of groups) {
    const count = await prisma.user.count({ where: { groupId: g.id } });
    result.push({ ...g, userCount: count });
  }
  res.json(result);
});

app.post('/api/admin/user-groups', requirePermission('groups.edit'), async (req, res) => {
  const { name, displayName, description, color, sortOrder } = req.body;
  try {
    const g = await prisma.userGroup.create({
      data: { name, displayName, description: description || '', color: color || '#6366f1', sortOrder: parseInt(sortOrder || 0) },
    });
    await writeAuditLog(req.admin, 'usergroup.create', 'usergroup', g.id, { name });
    res.json({ success: true, group: g });
  } catch (e) { res.status(400).json({ error: '分组标识可能已存在' }); }
});

app.put('/api/admin/user-groups/:id', requirePermission('groups.edit'), async (req, res) => {
  const { displayName, description, color, sortOrder } = req.body;
  const data = {};
  if (displayName) data.displayName = displayName;
  if (description !== undefined) data.description = description;
  if (color !== undefined) data.color = color;
  if (sortOrder !== undefined) data.sortOrder = parseInt(sortOrder);
  try {
    const g = await prisma.userGroup.update({ where: { id: req.params.id }, data });
    res.json({ success: true, group: g });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

app.delete('/api/admin/user-groups/:id', requirePermission('groups.edit'), async (req, res) => {
  try {
    await prisma.userGroup.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (e) { res.status(400).json({ error: '删除失败' }); }
});

// ============ 绑卡管理 ============
app.get('/api/admin/bankcards', requirePermission('bankcards.view'), async (req, res) => {
  res.json(await prisma.bankCard.findMany({
    include: { user: { select: { username: true } } },
    orderBy: { createdAt: 'desc' }, take: 200,
  }));
});

app.delete('/api/admin/bankcards/:id', requirePermission('bankcards.edit'), async (req, res) => {
  try {
    await prisma.bankCard.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (e) { res.status(400).json({ error: '删除失败' }); }
});

// ============ 游戏管理 ============
app.get('/api/admin/games', requirePermission('games.view'), async (req, res) => {
  const games = await prisma.game.findMany({ orderBy: { sortOrder: 'asc' } });
  const result = [];
  for (const g of games) {
    const boxCount = await prisma.box.count({ where: { gameId: g.id } });
    result.push({ ...g, boxCount });
  }
  res.json(result);
});

app.post('/api/admin/games', requirePermission('games.create'), async (req, res) => {
  const { name, displayName, description, icon, coverUrl, minVipLevel, minCoins, allowedRoles, enableLeaderboard, leaderboardMetric, leaderboardType, sortOrder } = req.body;
  try {
    const g = await prisma.game.create({
      data: {
        name: name.toLowerCase().replace(/[^a-z0-9_]/g, '_'),
        displayName,
        description: description || '',
        icon: icon || '',
        coverUrl: coverUrl || '',
        minVipLevel: parseInt(minVipLevel || 0),
        minCoins: parseInt(minCoins || 0),
        allowedRoles: allowedRoles || '',
        enableLeaderboard: !!enableLeaderboard,
        leaderboardMetric: leaderboardMetric || 'CONSUME',
        leaderboardType: leaderboardType || 'WEEKLY',
        sortOrder: parseInt(sortOrder || 0),
      },
    });
    await writeAuditLog(req.admin, 'game.create', 'game', g.id, { name });
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
  try {
    const g = await prisma.game.update({ where: { id: req.params.id }, data });
    await writeAuditLog(req.admin, 'game.update', 'game', g.id, { displayName });
    res.json({ success: true, game: g });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

app.delete('/api/admin/games/:id', requirePermission('games.delete'), async (req, res) => {
  try {
    await prisma.game.delete({ where: { id: req.params.id } });
    await writeAuditLog(req.admin, 'game.delete', 'game', req.params.id, {});
    res.json({ success: true });
  } catch (e) { res.status(400).json({ error: '删除失败' }); }
});

// ============ 卡牌管理 ============
app.get('/api/admin/cards', requirePermission('cards.view'), async (req, res) => {
  res.json(await prisma.card.findMany({ orderBy: { createdAt: 'desc' } }));
});
app.post('/api/admin/cards', requirePermission('cards.create'), async (req, res) => {
  const { name, rarity, imageUrl, value } = req.body;
  try {
    const card = await prisma.card.create({ data: { name, rarity, imageUrl: imageUrl || '', value: parseInt(value || 0) } });
    await writeAuditLog(req.admin, 'card.create', 'card', card.id, { name });
    res.json({ success: true, card });
  } catch (e) { res.status(400).json({ error: e.message }); }
});
app.put('/api/admin/cards/:id', requirePermission('cards.edit'), async (req, res) => {
  const { name, rarity, imageUrl, value } = req.body;
  try {
    const card = await prisma.card.update({ where: { id: req.params.id }, data: { name, rarity, imageUrl, value: parseInt(value || 0) } });
    await writeAuditLog(req.admin, 'card.update', 'card', card.id, { name });
    res.json({ success: true, card });
  } catch (e) { res.status(400).json({ error: e.message }); }
});
app.delete('/api/admin/cards/:id', requirePermission('cards.delete'), async (req, res) => {
  try {
    const card = await prisma.card.findUnique({ where: { id: req.params.id } });
    await prisma.card.delete({ where: { id: req.params.id } });
    await writeAuditLog(req.admin, 'card.delete', 'card', req.params.id, { name: card?.name });
    res.json({ success: true });
  } catch (e) { res.status(400).json({ error: '删除失败' }); }
});

// ============ 盲盒管理 ============
app.get('/api/admin/boxes', requirePermission('boxes.view'), async (req, res) => {
  res.json(await prisma.box.findMany({
    include: { items: { include: { card: true } }, game: { select: { id: true, displayName: true } } },
    orderBy: { createdAt: 'desc' },
  }));
});
app.post('/api/admin/boxes', requirePermission('boxes.create'), async (req, res) => {
  const { name, price, coverUrl, gameId } = req.body;
  try {
    const box = await prisma.box.create({
      data: { name, price: parseInt(price), coverUrl: coverUrl || '', gameId: gameId || null },
    });
    await writeAuditLog(req.admin, 'box.create', 'box', box.id, { name });
    res.json({ success: true, box });
  } catch (e) { res.status(400).json({ error: e.message }); }
});
app.put('/api/admin/boxes/:id', requirePermission('boxes.edit'), async (req, res) => {
  const { name, price, coverUrl, isActive, gameId } = req.body;
  const data = {};
  if (name) data.name = name;
  if (price !== undefined) data.price = parseInt(price);
  if (coverUrl !== undefined) data.coverUrl = coverUrl;
  if (isActive !== undefined) data.isActive = isActive;
  if (gameId !== undefined) data.gameId = gameId || null;
  try {
    const box = await prisma.box.update({ where: { id: req.params.id }, data });
    await writeAuditLog(req.admin, 'box.update', 'box', box.id, { name });
    res.json({ success: true, box });
  } catch (e) { res.status(400).json({ error: e.message }); }
});
app.delete('/api/admin/boxes/:id', requirePermission('boxes.delete'), async (req, res) => {
  try {
    const box = await prisma.box.findUnique({ where: { id: req.params.id } });
    await prisma.box.delete({ where: { id: req.params.id } });
    await writeAuditLog(req.admin, 'box.delete', 'box', req.params.id, { name: box?.name });
    res.json({ success: true });
  } catch (e) { res.status(400).json({ error: '删除失败' }); }
});
app.post('/api/admin/boxes/:id/items', requirePermission('boxes.probability'), async (req, res) => {
  const { cardId, weight } = req.body;
  try {
    const existing = await prisma.boxItem.findFirst({ where: { boxId: req.params.id, cardId } });
    if (existing) {
      const item = await prisma.boxItem.update({ where: { id: existing.id }, data: { weight: parseInt(weight) } });
      await writeAuditLog(req.admin, 'box.probability.update', 'box', req.params.id, { cardId, weight });
      res.json({ success: true, item });
    } else {
      const item = await prisma.boxItem.create({ data: { boxId: req.params.id, cardId, weight: parseInt(weight) } });
      await writeAuditLog(req.admin, 'box.probability.add', 'box', req.params.id, { cardId, weight });
      res.json({ success: true, item });
    }
  } catch (e) { res.status(400).json({ error: e.message }); }
});
app.delete('/api/admin/boxes/:boxId/items/:itemId', requirePermission('boxes.probability'), async (req, res) => {
  try {
    await prisma.boxItem.delete({ where: { id: req.params.itemId } });
    await writeAuditLog(req.admin, 'box.probability.remove', 'box', req.params.boxId, { itemId: req.params.itemId });
    res.json({ success: true });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// ============ 充值套餐 ============
app.get('/api/admin/recharge-options', requirePermission('recharge.view'), async (req, res) => {
  res.json(await prisma.rechargeOption.findMany({ orderBy: { sortOrder: 'asc' } }));
});
app.post('/api/admin/recharge-options', requirePermission('recharge.create'), async (req, res) => {
  const { coins, bonus, price, sortOrder } = req.body;
  try {
    const option = await prisma.rechargeOption.create({
      data: { coins: parseInt(coins), bonus: parseInt(bonus || 0), price: parseInt(price), sortOrder: parseInt(sortOrder || 0) }
    });
    await writeAuditLog(req.admin, 'recharge.create', 'recharge', option.id, { coins });
    res.json({ success: true, option });
  } catch (e) { res.status(400).json({ error: e.message }); }
});
app.put('/api/admin/recharge-options/:id', requirePermission('recharge.edit'), async (req, res) => {
  const { coins, bonus, price, isActive, sortOrder } = req.body;
  const data = {};
  if (coins !== undefined) data.coins = parseInt(coins);
  if (bonus !== undefined) data.bonus = parseInt(bonus);
  if (price !== undefined) data.price = parseInt(price);
  if (isActive !== undefined) data.isActive = isActive;
  if (sortOrder !== undefined) data.sortOrder = parseInt(sortOrder);
  try {
    const option = await prisma.rechargeOption.update({ where: { id: req.params.id }, data });
    res.json({ success: true, option });
  } catch (e) { res.status(400).json({ error: e.message }); }
});
app.delete('/api/admin/recharge-options/:id', requirePermission('recharge.delete'), async (req, res) => {
  try {
    await prisma.rechargeOption.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (e) { res.status(400).json({ error: '删除失败，可能有订单引用' }); }
});

// ============ 订单管理 ============
app.get('/api/admin/orders', requirePermission('orders.view'), async (req, res) => {
  res.json(await prisma.order.findMany({
    include: { user: { select: { username: true } }, option: true },
    orderBy: { createdAt: 'desc' }, take: 200,
  }));
});
app.put('/api/admin/orders/:id/paid', requirePermission('orders.refund'), async (req, res) => {
  try {
    const order = await prisma.order.findUnique({ where: { id: req.params.id } });
    if (!order || order.status === 'PAID') return res.status(400).json({ error: '状态异常' });
    await prisma.$transaction(async (tx) => {
      await tx.order.update({ where: { id: req.params.id }, data: { status: 'PAID', paidAt: new Date() } });
      await tx.user.update({
        where: { id: order.userId },
        data: { coins: { increment: order.coins }, rechargeCount: { increment: 1 }, totalRecharge: { increment: order.amount } },
      });
    });
    checkVipUpgrade(order.userId).catch(() => {});
    await writeAuditLog(req.admin, 'order.paid', 'order', req.params.id, { coins: order.coins });
    res.json({ success: true });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// ============ 支付渠道管理 ============
app.get('/api/admin/payment-channels', requirePermission('payments.view'), async (req, res) => {
  res.json(await prisma.paymentChannel.findMany({ orderBy: { sortOrder: 'asc' } }));
});
app.put('/api/admin/payment-channels/:id', requirePermission('payments.edit'), async (req, res) => {
  const { displayName, config, isActive, sortOrder } = req.body;
  const data = {};
  if (displayName) data.displayName = displayName;
  if (config !== undefined) data.config = config;
  if (isActive !== undefined) data.isActive = isActive;
  if (sortOrder !== undefined) data.sortOrder = parseInt(sortOrder);
  try {
    const c = await prisma.paymentChannel.update({ where: { id: req.params.id }, data });
    res.json({ success: true, channel: c });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// ============ 提现管理 ============
app.get('/api/admin/withdrawals', requirePermission('withdrawals.view'), async (req, res) => {
  res.json(await prisma.withdrawal.findMany({ orderBy: { createdAt: 'desc' }, take: 200 }));
});
app.put('/api/admin/withdrawals/:id/approve', requirePermission('withdrawals.approve'), async (req, res) => {
  const { approve, remark } = req.body;
  try {
    const w = await prisma.withdrawal.update({
      where: { id: req.params.id },
      data: { status: approve ? 'APPROVED' : 'REJECTED', remark: remark || '', processedAt: new Date() },
    });
    await writeAuditLog(req.admin, 'withdrawal.approve', 'withdrawal', w.id, { approve });
    res.json({ success: true });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// ============ 交易明细 ============
app.get('/api/admin/transactions', requirePermission('transactions.view'), async (req, res) => {
  const { type, userId } = req.query;
  const where = {};
  if (type) where.type = type;
  if (userId) where.userId = userId;
  res.json(await prisma.transaction.findMany({
    where, orderBy: { createdAt: 'desc' }, take: 500,
  }));
});

// ============ 抽奖记录 ============
app.get('/api/admin/drawlogs', requirePermission('drawlogs.view'), async (req, res) => {
  const { userId, boxId } = req.query;
  const where = {};
  if (userId) where.userId = userId;
  if (boxId) where.boxId = boxId;
  res.json(await prisma.drawLog.findMany({
    where,
    include: { user: { select: { username: true } }, box: { select: { name: true } } },
    orderBy: { createdAt: 'desc' }, take: 500,
  }));
});
app.get('/api/admin/export/drawlogs', requirePermission('drawlogs.export'), async (req, res) => {
  const logs = await prisma.drawLog.findMany({
    include: { user: { select: { username: true } }, box: { select: { name: true } } },
    orderBy: { createdAt: 'desc' }, take: 10000,
  });
  const header = '用户,盲盒,消耗金币,抽卡次数,产出价值,时间\n';
  const rows = logs.map(l => [
    l.user.username, l.box.name, l.cost, l.count, l.outputValue,
    l.createdAt.toISOString(),
  ].join(',')).join('\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="drawlogs_${Date.now()}.csv"`);
  res.send('\uFEFF' + header + rows);
});

// ============ 轮播图 ============
app.get('/api/admin/banners', requirePermission('banners.view'), async (req, res) => {
  res.json(await prisma.banner.findMany({ orderBy: { sortOrder: 'asc' } }));
});
app.post('/api/admin/banners', requirePermission('banners.create'), async (req, res) => {
  const { imageUrl, link, title, sortOrder } = req.body;
  try {
    const banner = await prisma.banner.create({
      data: { imageUrl, link: link || '', title: title || '', sortOrder: parseInt(sortOrder || 0) }
    });
    res.json({ success: true, banner });
  } catch (e) { res.status(400).json({ error: e.message }); }
});
app.put('/api/admin/banners/:id', requirePermission('banners.edit'), async (req, res) => {
  const { imageUrl, link, title, isActive, sortOrder } = req.body;
  const data = {};
  if (imageUrl) data.imageUrl = imageUrl;
  if (link !== undefined) data.link = link;
  if (title !== undefined) data.title = title;
  if (isActive !== undefined) data.isActive = isActive;
  if (sortOrder !== undefined) data.sortOrder = parseInt(sortOrder);
  try {
    const banner = await prisma.banner.update({ where: { id: req.params.id }, data });
    res.json({ success: true, banner });
  } catch (e) { res.status(400).json({ error: e.message }); }
});
app.delete('/api/admin/banners/:id', requirePermission('banners.delete'), async (req, res) => {
  try {
    await prisma.banner.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// ============ 广告管理 ============
app.get('/api/admin/ads', requirePermission('ads.view'), async (req, res) => {
  res.json(await prisma.ad.findMany({ orderBy: { sortOrder: 'asc' } }));
});
app.post('/api/admin/ads', requirePermission('ads.create'), async (req, res) => {
  const { title, imageUrl, linkType, linkValue, position, sortOrder, startAt, endAt } = req.body;
  try {
    const ad = await prisma.ad.create({
      data: {
        title, imageUrl,
        linkType: linkType || 'URL',
        linkValue: linkValue || '',
        position: position || 'HOME_BANNER',
        sortOrder: parseInt(sortOrder || 0),
        startAt: startAt ? new Date(startAt) : null,
        endAt: endAt ? new Date(endAt) : null,
      },
    });
    res.json({ success: true, ad });
  } catch (e) { res.status(400).json({ error: e.message }); }
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
  try {
    const ad = await prisma.ad.update({ where: { id: req.params.id }, data });
    res.json({ success: true, ad });
  } catch (e) { res.status(400).json({ error: e.message }); }
});
app.delete('/api/admin/ads/:id', requirePermission('ads.delete'), async (req, res) => {
  try {
    await prisma.ad.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// ============ 任务 ============
app.get('/api/admin/tasks', requirePermission('tasks.view'), async (req, res) => {
  res.json(await prisma.task.findMany({ orderBy: { sortOrder: 'asc' } }));
});
app.post('/api/admin/tasks', requirePermission('tasks.create'), async (req, res) => {
  const { title, description, action, targetCount, rewardCoins, sortOrder } = req.body;
  try {
    const task = await prisma.task.create({
      data: { title, description: description || '', action, targetCount: parseInt(targetCount), rewardCoins: parseInt(rewardCoins), sortOrder: parseInt(sortOrder || 0) }
    });
    res.json({ success: true, task });
  } catch (e) { res.status(400).json({ error: e.message }); }
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
  try {
    const task = await prisma.task.update({ where: { id: req.params.id }, data });
    res.json({ success: true, task });
  } catch (e) { res.status(400).json({ error: e.message }); }
});
app.delete('/api/admin/tasks/:id', requirePermission('tasks.delete'), async (req, res) => {
  try {
    await prisma.task.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (e) { res.status(400).json({ error: '删除失败' }); }
});

// ============ 兑换码 ============
app.get('/api/admin/redeem-codes', requirePermission('redeem.view'), async (req, res) => {
  res.json(await prisma.redeemCode.findMany({ orderBy: { createdAt: 'desc' }, take: 200 }));
});
app.post('/api/admin/redeem-codes', requirePermission('redeem.create'), async (req, res) => {
  const { code, coins, maxUses } = req.body;
  try {
    const newCode = await prisma.redeemCode.create({
      data: { code: code.trim().toUpperCase(), coins: parseInt(coins || 0), maxUses: parseInt(maxUses || 1) }
    });
    res.json({ success: true, code: newCode });
  } catch (e) { res.status(400).json({ error: '兑换码可能已存在' }); }
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
  try {
    await prisma.redeemCode.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (e) { res.status(400).json({ error: '删除失败' }); }
});

// ============ 工单 ============
app.get('/api/admin/tickets', requirePermission('tickets.view'), async (req, res) => {
  res.json(await prisma.ticket.findMany({
    include: { user: { select: { username: true } }, replies: { orderBy: { createdAt: 'asc' } } },
    orderBy: { updatedAt: 'desc' },
  }));
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
  try {
    await prisma.ticket.update({ where: { id: req.params.id }, data: { status: 'CLOSED' } });
    res.json({ success: true });
  } catch (e) { res.status(400).json({ error: e.message }); }
});
app.delete('/api/admin/tickets/:id', requirePermission('tickets.delete'), async (req, res) => {
  try {
    await prisma.ticket.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (e) { res.status(400).json({ error: '删除失败' }); }
});

// ============ 通知 ============
app.get('/api/admin/notifications', requirePermission('notifications.view'), async (req, res) => {
  res.json(await prisma.notification.findMany({
    include: { reads: true }, orderBy: { createdAt: 'desc' }, take: 100,
  }));
});
app.post('/api/admin/notifications', requirePermission('notifications.create'), async (req, res) => {
  const { userId, title, content } = req.body;
  if (!title || !content) return res.status(400).json({ error: '请填写标题和内容' });
  try {
    const notification = await prisma.notification.create({
      data: { userId: userId || null, title, content }
    });
    res.json({ success: true, notification });
  } catch (e) { res.status(400).json({ error: e.message }); }
});
app.delete('/api/admin/notifications/:id', requirePermission('notifications.delete'), async (req, res) => {
  try {
    await prisma.notification.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (e) { res.status(400).json({ error: '删除失败' }); }
});

// ============ 管理员管理 ============
app.get('/api/admin/admins', requirePermission('admins.view'), async (req, res) => {
  const admins = await prisma.admin.findMany({ include: { roleRef: true }, orderBy: { createdAt: 'asc' } });
  res.json(admins.map(a => ({
    id: a.id, username: a.username, roleId: a.roleId,
    role: a.roleRef?.name, roleDisplayName: a.roleRef?.displayName,
    rolePermissions: a.roleRef?.permissions,
    isActive: a.isActive, createdAt: a.createdAt, lastLoginAt: a.lastLoginAt,
  })));
});
app.post('/api/admin/admins', requirePermission('admins.create'), async (req, res) => {
  const { username, password, roleId } = req.body;
  if (!username || !password || !roleId) return res.status(400).json({ error: '请填写用户名、密码、角色' });
  try {
    const admin = await prisma.admin.create({ data: { username, password, roleId, role: 'custom' } });
    res.json({ success: true, admin: { id: admin.id, username: admin.username, roleId: admin.roleId } });
  } catch (e) { res.status(400).json({ error: '用户名可能已存在' }); }
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
  try {
    await prisma.admin.update({ where: { id: req.params.id }, data });
    res.json({ success: true });
  } catch (e) { res.status(400).json({ error: e.message }); }
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

// ============ 角色管理 ============
app.get('/api/admin/roles', requirePermission('roles.view'), async (req, res) => {
  const roles = await prisma.role.findMany({ orderBy: { createdAt: 'asc' } });
  const result = [];
  for (const r of roles) {
    const adminCount = await prisma.admin.count({ where: { roleId: r.id } });
    result.push({ ...r, adminCount });
  }
  res.json(result);
});
app.post('/api/admin/roles', requirePermission('roles.create'), async (req, res) => {
  const { name, displayName, description, permissions } = req.body;
  if (!name || !displayName) return res.status(400).json({ error: '请填写角色标识和显示名' });
  try {
    const role = await prisma.role.create({
      data: {
        name: name.toLowerCase().replace(/[^a-z0-9_]/g, '_'),
        displayName, description: description || '',
        permissions: (permissions || []).join(','),
        isSystem: false,
      },
    });
    res.json({ success: true, role });
  } catch (e) { res.status(400).json({ error: '角色标识可能已存在' }); }
});
app.put('/api/admin/roles/:id', requirePermission('roles.edit'), async (req, res) => {
  const { displayName, description, permissions } = req.body;
  const role = await prisma.role.findUnique({ where: { id: req.params.id } });
  if (!role) return res.status(404).json({ error: '角色不存在' });
  if (role.name === 'super') return res.status(400).json({ error: '超级管理员角色不可编辑' });
  try {
    const updated = await prisma.role.update({
      where: { id: req.params.id },
      data: {
        displayName: displayName || role.displayName,
        description: description ?? role.description,
        permissions: permissions ? permissions.join(',') : role.permissions,
      },
    });
    res.json({ success: true, role: updated });
  } catch (e) { res.status(400).json({ error: e.message }); }
});
app.delete('/api/admin/roles/:id', requirePermission('roles.delete'), async (req, res) => {
  const role = await prisma.role.findUnique({ where: { id: req.params.id } });
  if (!role) return res.status(404).json({ error: '角色不存在' });
  if (role.isSystem) return res.status(400).json({ error: '系统内置角色不可删除' });
  const adminCount = await prisma.admin.count({ where: { roleId: role.id } });
  if (adminCount > 0) return res.status(400).json({ error: `还有 ${adminCount} 位管理员使用该角色，请先更换` });
  try {
    await prisma.role.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// ============ 权限元数据 ============
app.get('/api/admin/permissions', async (req, res) => {
  res.json(ALL_PERMISSIONS);
});

// ============ 菜单管理（B 方案） ============
// 注意：GET 不要求 menus.edit 权限，任何登录的管理员都能拉取菜单树（前端会自行按权限过滤）
app.get('/api/admin/menus', async (req, res) => {
  const menus = await prisma.adminMenu.findMany({ orderBy: { sortOrder: 'asc' } });
  const tree = [];
  const map = {};
  menus.forEach(m => { map[m.id] = { ...m, children: [] }; });
  menus.forEach(m => {
    if (m.parentId && map[m.parentId]) map[m.parentId].children.push(map[m.id]);
    else tree.push(map[m.id]);
  });
  res.json(tree);
});

app.post('/api/admin/menus', requirePermission('menus.edit'), async (req, res) => {
  const { parentId, title, type, icon, path, component, permission, sortOrder } = req.body;
  try {
    const menu = await prisma.adminMenu.create({
      data: {
        parentId: parentId || null, title, type: type || 'MENU',
        icon: icon || '', path: path || '', component: component || '',
        permission: permission || '', sortOrder: parseInt(sortOrder || 0),
      },
    });
    await writeAuditLog(req.admin, 'menu.create', 'menu', menu.id, { title });
    res.json({ success: true, menu });
  } catch (e) { res.status(400).json({ error: e.message }); }
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
  try {
    const menu = await prisma.adminMenu.update({ where: { id: req.params.id }, data });
    res.json({ success: true, menu });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

app.delete('/api/admin/menus/:id', requirePermission('menus.edit'), async (req, res) => {
  try {
    await prisma.adminMenu.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (e) { res.status(400).json({ error: '删除失败' }); }
});

// ============ 菜单管理（B 方案） ============
app.get('/api/admin/menus', async (req, res) => {
  const menus = await prisma.adminMenu.findMany({ orderBy: { sortOrder: 'asc' } });
  const tree = [];
  const map = {};
  menus.forEach(m => { map[m.id] = { ...m, children: [] }; });
  menus.forEach(m => {
    if (m.parentId && map[m.parentId]) map[m.parentId].children.push(map[m.id]);
    else tree.push(map[m.id]);
  });
  res.json(tree);
});

app.post('/api/admin/menus', requirePermission('menus.edit'), async (req, res) => {
  const { parentId, title, type, icon, path, component, permission, sortOrder } = req.body;
  try {
    const menu = await prisma.adminMenu.create({
      data: {
        parentId: parentId || null, title, type: type || 'MENU',
        icon: icon || '', path: path || '', component: component || '',
        permission: permission || '', sortOrder: parseInt(sortOrder || 0),
      },
    });
    await writeAuditLog(req.admin, 'menu.create', 'menu', menu.id, { title });
    res.json({ success: true, menu });
  } catch (e) { res.status(400).json({ error: e.message }); }
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
  try {
    const menu = await prisma.adminMenu.update({ where: { id: req.params.id }, data });
    res.json({ success: true, menu });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

app.delete('/api/admin/menus/:id', requirePermission('menus.edit'), async (req, res) => {
  try {
    await prisma.adminMenu.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (e) { res.status(400).json({ error: '删除失败' }); }
});


// ============ 审计日志 ============
app.get('/api/admin/audit-logs', requirePermission('audit.view'), async (req, res) => {
  const { action, adminName } = req.query;
  const where = {};
  if (action) where.action = { contains: action };
  if (adminName) where.adminName = { contains: adminName };
  res.json(await prisma.auditLog.findMany({ where, orderBy: { createdAt: 'desc' }, take: 500 }));
});

// ============ 报表：汇总 ============
app.get('/api/admin/reports/summary', requirePermission('reports.view'), async (req, res) => {
  const days = parseInt(req.query.days || '7');
  const since = new Date();
  since.setDate(since.getDate() - days);

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
  for (let i = 0; i < days; i++) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    dailyData[key] = { date: key, revenue: 0, consume: 0, drawCount: 0 };
  }
  orders.forEach(o => {
    const key = o.createdAt.toISOString().slice(0, 10);
    if (dailyData[key]) dailyData[key].revenue += o.amount;
  });
  draws.forEach(d => {
    const key = d.createdAt.toISOString().slice(0, 10);
    if (dailyData[key]) { dailyData[key].consume += d.cost; dailyData[key].drawCount += d.count; }
  });

  res.json({
    summary: {
      newUsers, activeUsers, totalRevenue, totalConsume, totalDrawCount,
      orderCount: orders.length,
      avgOrderAmount: orders.length ? Math.round(totalRevenue / orders.length) : 0,
    },
    daily: Object.values(dailyData).reverse(),
  });
});

// ============ 报表：资金 ============
app.get('/api/admin/reports/finance', requirePermission('reports.view'), async (req, res) => {
  const days = parseInt(req.query.days || '7');
  const since = new Date(); since.setDate(since.getDate() - days);

  const orders = await prisma.order.findMany({
    where: { status: 'PAID', createdAt: { gte: since } },
    select: { amount: true, createdAt: true },
  });
  const draws = await prisma.drawLog.findMany({
    where: { createdAt: { gte: since } },
    select: { cost: true, outputValue: true, createdAt: true },
  });

  const dailyData = {};
  for (let i = 0; i < days; i++) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    dailyData[key] = { date: key, recharge: 0, consume: 0, output: 0 };
  }
  orders.forEach(o => {
    const key = o.createdAt.toISOString().slice(0, 10);
    if (dailyData[key]) dailyData[key].recharge += o.amount;
  });
  draws.forEach(d => {
    const key = d.createdAt.toISOString().slice(0, 10);
    if (dailyData[key]) { dailyData[key].consume += d.cost; dailyData[key].output += d.outputValue; }
  });

  res.json({
    summary: {
      totalRecharge: orders.reduce((s, o) => s + o.amount, 0),
      totalConsume: draws.reduce((s, d) => s + d.cost, 0),
      totalOutput: draws.reduce((s, d) => s + d.outputValue, 0),
    },
    daily: Object.values(dailyData).reverse(),
  });
});

// ============ 报表：抽奖 ============
app.get('/api/admin/reports/draw', requirePermission('reports.view'), async (req, res) => {
  const days = parseInt(req.query.days || '7');
  const since = new Date(); since.setDate(since.getDate() - days);

  const logs = await prisma.drawLog.findMany({
    where: { createdAt: { gte: since } },
    include: { box: { select: { name: true } } },
  });

  const dailyData = {};
  for (let i = 0; i < days; i++) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    dailyData[key] = { date: key, count: 0, cost: 0, output: 0, users: new Set() };
  }
  logs.forEach(l => {
    const key = l.createdAt.toISOString().slice(0, 10);
    if (dailyData[key]) {
      dailyData[key].count += l.count;
      dailyData[key].cost += l.cost;
      dailyData[key].output += l.outputValue;
      dailyData[key].users.add(l.userId);
    }
  });

  const result = Object.values(dailyData).map(d => ({
    date: d.date, count: d.count, cost: d.cost, output: d.output,
    uniqueUsers: d.users.size,
    roi: d.cost > 0 ? ((d.output / d.cost) * 100).toFixed(2) + '%' : '0%',
  })).reverse();

  res.json({
    summary: {
      totalCount: logs.reduce((s, l) => s + l.count, 0),
      totalCost: logs.reduce((s, l) => s + l.cost, 0),
      totalOutput: logs.reduce((s, l) => s + l.outputValue, 0),
    },
    daily: result,
  });
});

// ============ 报表：用户抽奖 ============
app.get('/api/admin/reports/user-draw', requirePermission('reports.view'), async (req, res) => {
  const days = parseInt(req.query.days || '7');
  const since = new Date(); since.setDate(since.getDate() - days);

  const logs = await prisma.drawLog.findMany({
    where: { createdAt: { gte: since } },
    include: { user: { select: { username: true, vipLevel: true } } },
  });

  const userMap = {};
  logs.forEach(l => {
    if (!userMap[l.userId]) {
      userMap[l.userId] = { userId: l.userId, username: l.user.username, vipLevel: l.user.vipLevel, count: 0, cost: 0, output: 0 };
    }
    userMap[l.userId].count += l.count;
    userMap[l.userId].cost += l.cost;
    userMap[l.userId].output += l.outputValue;
  });

  const list = Object.values(userMap).sort((a, b) => b.cost - a.cost).slice(0, 100);
  res.json({ list });
});

// ============ 报表：用户资金 ============
app.get('/api/admin/reports/user-finance', requirePermission('reports.view'), async (req, res) => {
  const users = await prisma.user.findMany({
    select: {
      id: true, username: true, coins: true, vipLevel: true,
      totalRecharge: true, totalConsume: true, rechargeCount: true,
      createdAt: true,
    },
    orderBy: { totalRecharge: 'desc' },
    take: 200,
  });
  res.json({ list: users });
});

// ============ 报表：VIP 分布 ============
app.get('/api/admin/reports/vip-distribution', requirePermission('reports.view'), async (req, res) => {
  const levels = await prisma.vipLevel.findMany({ orderBy: { level: 'asc' } });
  const result = [];
  for (const lv of levels) {
    const count = await prisma.user.count({ where: { vipLevel: lv.level } });
    const totalRecharge = await prisma.user.aggregate({
      where: { vipLevel: lv.level },
      _sum: { totalRecharge: true, totalConsume: true },
    });
    result.push({
      level: lv.level, name: lv.name, userCount: count,
      totalRecharge: totalRecharge._sum.totalRecharge || 0,
      totalConsume: totalRecharge._sum.totalConsume || 0,
    });
  }
  res.json({ list: result });
});

// ============ 临时：初始化数据库 ============
const { execSync } = require('child_process');
app.get('/api/setup-db', async (req, res) => {
  try {
    console.log('开始同步数据库...');
    execSync('npx prisma db push', { stdio: 'inherit' });
    console.log('开始写入种子数据...');
    execSync('node seed.js', { stdio: 'inherit' });
    res.json({ success: true, message: '数据库已同步，种子数据已写入' });
  } catch (e) {
    console.error('初始化失败:', e);
    res.status(500).json({ error: e.message });
  }
});
// ============ 临时接口结束 ============


// ================= 服务启动 =================
const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => console.log(`🚀 后端服务器运行在 http://localhost:${PORT}`));
