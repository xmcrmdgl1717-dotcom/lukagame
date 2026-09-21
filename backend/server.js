const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const app = express();

app.use(cors());
app.use(express.json());

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

app.get('/api/boxes', async (req, res) => {
  res.json(await prisma.box.findMany({ where: { isActive: true } }));
});

// 抽卡（新增 DrawLog 写入）
app.post('/api/draw', async (req, res) => {
  const { userId, boxId, count } = req.body;
  try {
    const result = await prisma.$transaction(async (tx) => {
      const box = await tx.box.findUnique({ where: { id: boxId }, include: { items: { include: { card: true } } } });
      const user = await tx.user.findUnique({ where: { id: userId } });
      const totalCost = box.price * count;
      if (user.coins < totalCost) throw new Error('金币不足');
      await tx.user.update({ where: { id: userId }, data: { coins: { decrement: totalCost } } });

      const drawnCards = [];
      const totalWeight = box.items.reduce((sum, item) => sum + item.weight, 0);
      for (let i = 0; i < count; i++) {
        let random = Math.random() * totalWeight;
        for (const item of box.items) {
          if (random < item.weight) { drawnCards.push(item.card); break; }
          random -= item.weight;
        }
      }
      for (const card of drawnCards) {
        await tx.inventory.upsert({
          where: { userId_cardId: { userId, cardId: card.id } },
          update: { quantity: { increment: 1 } },
          create: { userId, cardId: card.id, quantity: 1 }
        });
      }
      // 记录抽卡日志（用于排行榜）
      await tx.drawLog.create({ data: { userId, boxId, cost: totalCost, count } });

      await updateTaskProgress(tx, userId, 'DRAW', count);
      await updateTaskProgress(tx, userId, 'SPEND', totalCost);
      return { success: true, drawnCards };
    });
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
        data: { coins: { increment: totalCoins }, rechargeCount: { increment: 1 } }
      });
      await updateTaskProgress(tx, userId, 'RECHARGE', 1);
      return { success: true, order, coinsAdded: totalCoins };
    });
    res.json(result);
  } catch (error) { res.status(400).json({ error: error.message }); }
});

app.get('/api/banners', async (req, res) => {
  res.json(await prisma.banner.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } }));
});

// === 用户端：我的订单 ===
app.get('/api/orders/:userId', async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      where: { userId: req.params.userId },
      include: { option: true },
      orderBy: { createdAt: 'desc' },
      take: 100
    });
    res.json(orders);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// === 用户端：排行榜 ===
// 周榜：最近 7 天，按消耗金币排名
app.get('/api/leaderboard/weekly', async (req, res) => {
  try {
    const since = new Date();
    since.setDate(since.getDate() - 7);
    const result = await prisma.drawLog.groupBy({
      by: ['userId'],
      where: { createdAt: { gte: since } },
      _sum: { cost: true },
      orderBy: { _sum: { cost: 'desc' } },
      take: 10
    });
    // 关联用户名
    const data = [];
    for (const row of result) {
      const user = await prisma.user.findUnique({ where: { id: row.userId }, select: { username: true } });
      data.push({ username: user?.username || '未知', totalCost: row._sum.cost || 0 });
    }
    res.json(data);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 月榜：最近 30 天
app.get('/api/leaderboard/monthly', async (req, res) => {
  try {
    const since = new Date();
    since.setDate(since.getDate() - 30);
    const result = await prisma.drawLog.groupBy({
      by: ['userId'],
      where: { createdAt: { gte: since } },
      _sum: { cost: true },
      orderBy: { _sum: { cost: 'desc' } },
      take: 10
    });
    const data = [];
    for (const row of result) {
      const user = await prisma.user.findUnique({ where: { id: row.userId }, select: { username: true } });
      data.push({ username: user?.username || '未知', totalCost: row._sum.cost || 0 });
    }
    res.json(data);
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
  try {
    const ticket = await prisma.ticket.create({ data: { userId, title, content } });
    res.json({ success: true, ticket });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/tickets/:userId', async (req, res) => {
  const tickets = await prisma.ticket.findMany({
    where: { userId: req.params.userId },
    include: { replies: { orderBy: { createdAt: 'asc' } } },
    orderBy: { createdAt: 'desc' }
  });
  res.json(tickets);
});

// === 用户端：通知系统 ===
app.get('/api/notifications/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const notifications = await prisma.notification.findMany({
      where: {
        OR: [
          { userId: userId },
          { userId: null } // 全员通知
        ]
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    const reads = await prisma.notificationRead.findMany({ where: { userId } });
    const readIds = reads.map(r => r.notificationId);
    res.json(notifications.map(n => ({ ...n, isRead: readIds.includes(n.id) })));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/notifications/:id/read', async (req, res) => {
  const { userId } = req.body;
  try {
    const existing = await prisma.notificationRead.findUnique({
      where: { notificationId_userId: { notificationId: req.params.id, userId } }
    });
    if (!existing) {
      await prisma.notificationRead.create({ data: { notificationId: req.params.id, userId } });
    }
    res.json({ success: true });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// ================= 管理后台 API =================
app.post('/api/admin/login', async (req, res) => {
  const { username, password } = req.body;
  const admin = await prisma.admin.findUnique({ where: { username } });
  if (!admin || admin.password !== password || !admin.isActive) {
    return res.status(401).json({ error: '账号或密码错误' });
  }
  await prisma.admin.update({ where: { id: admin.id }, data: { lastLoginAt: new Date() } });
  res.json({ success: true, admin: { id: admin.id, username: admin.username, role: admin.role } });
});

app.use('/api/admin', async (req, res, next) => {
  const username = req.headers['x-admin-username'];
  const pwd = req.headers['x-admin-password'];
  if (!username || !pwd) return res.status(401).json({ error: '未授权' });
  const admin = await prisma.admin.findUnique({ where: { username } });
  if (!admin || admin.password !== pwd || !admin.isActive) {
    return res.status(401).json({ error: '账号或密码错误' });
  }
  req.admin = admin;
  next();
});

function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.admin.role) && req.admin.role !== 'super') {
      return res.status(403).json({ error: '权限不足' });
    }
    next();
  };
}

app.get('/api/admin/stats', async (req, res) => {
  res.json({
    userCount: await prisma.user.count(),
    cardCount: await prisma.card.count(),
    boxCount: await prisma.box.count(),
    orderCount: await prisma.order.count(),
    openTicketCount: await prisma.ticket.count({ where: { status: { not: 'CLOSED' } } }),
    totalRevenue: (await prisma.order.aggregate({ where: { status: 'PAID' }, _sum: { amount: true } }))._sum.amount || 0
  });
});

// --- 用户管理 ---
app.get('/api/admin/users', async (req, res) => {
  res.json(await prisma.user.findMany({
    select: { id: true, username: true, coins: true, createdAt: true, lastLoginAt: true,
      tags: true, remark: true, rechargeCount: true, withdrawalCount: true, withdrawalAmount: true },
    orderBy: { createdAt: 'desc' }
  }));
});
app.put('/api/admin/users/:id', async (req, res) => {
  const { username, password, coins, tags, remark } = req.body;
  const data = {};
  if (username) data.username = username;
  if (password) data.password = password;
  if (coins !== undefined) data.coins = parseInt(coins);
  if (tags !== undefined) data.tags = tags;
  if (remark !== undefined) data.remark = remark;
  try { res.json({ success: true, user: await prisma.user.update({ where: { id: req.params.id }, data }) }); }
  catch (e) { res.status(400).json({ error: e.message }); }
});
app.delete('/api/admin/users/:id', async (req, res) => {
  try { await prisma.user.delete({ where: { id: req.params.id } }); res.json({ success: true }); }
  catch (e) { res.status(400).json({ error: '删除失败' }); }
});

// --- 卡牌 ---
app.get('/api/admin/cards', async (req, res) => res.json(await prisma.card.findMany({ orderBy: { createdAt: 'desc' } })));
app.post('/api/admin/cards', async (req, res) => {
  const { name, rarity, imageUrl } = req.body;
  try { res.json({ success: true, card: await prisma.card.create({ data: { name, rarity, imageUrl: imageUrl || '' } }) }); }
  catch (e) { res.status(400).json({ error: e.message }); }
});
app.put('/api/admin/cards/:id', async (req, res) => {
  const { name, rarity, imageUrl } = req.body;
  try { res.json({ success: true, card: await prisma.card.update({ where: { id: req.params.id }, data: { name, rarity, imageUrl } }) }); }
  catch (e) { res.status(400).json({ error: e.message }); }
});
app.delete('/api/admin/cards/:id', async (req, res) => {
  try { await prisma.card.delete({ where: { id: req.params.id } }); res.json({ success: true }); }
  catch (e) { res.status(400).json({ error: '删除失败' }); }
});

// --- 盲盒 ---
app.get('/api/admin/boxes', async (req, res) => {
  res.json(await prisma.box.findMany({ include: { items: { include: { card: true } } }, orderBy: { createdAt: 'desc' } }));
});
app.post('/api/admin/boxes', async (req, res) => {
  const { name, price, coverUrl } = req.body;
  try { res.json({ success: true, box: await prisma.box.create({ data: { name, price: parseInt(price), coverUrl: coverUrl || '' } }) }); }
  catch (e) { res.status(400).json({ error: e.message }); }
});
app.put('/api/admin/boxes/:id', async (req, res) => {
  const { name, price, coverUrl, isActive } = req.body;
  const data = {};
  if (name) data.name = name;
  if (price !== undefined) data.price = parseInt(price);
  if (coverUrl !== undefined) data.coverUrl = coverUrl;
  if (isActive !== undefined) data.isActive = isActive;
  try { res.json({ success: true, box: await prisma.box.update({ where: { id: req.params.id }, data }) }); }
  catch (e) { res.status(400).json({ error: e.message }); }
});
app.delete('/api/admin/boxes/:id', async (req, res) => {
  try { await prisma.box.delete({ where: { id: req.params.id } }); res.json({ success: true }); }
  catch (e) { res.status(400).json({ error: '删除失败' }); }
});
app.post('/api/admin/boxes/:id/items', async (req, res) => {
  const { cardId, weight } = req.body;
  try {
    const existing = await prisma.boxItem.findFirst({ where: { boxId: req.params.id, cardId } });
    if (existing) res.json({ success: true, item: await prisma.boxItem.update({ where: { id: existing.id }, data: { weight: parseInt(weight) } }) });
    else res.json({ success: true, item: await prisma.boxItem.create({ data: { boxId: req.params.id, cardId, weight: parseInt(weight) } }) });
  } catch (e) { res.status(400).json({ error: e.message }); }
});
app.delete('/api/admin/boxes/:boxId/items/:itemId', async (req, res) => {
  try { await prisma.boxItem.delete({ where: { id: req.params.itemId } }); res.json({ success: true }); }
  catch (e) { res.status(400).json({ error: e.message }); }
});

// --- 充值套餐 ---
app.get('/api/admin/recharge-options', async (req, res) => res.json(await prisma.rechargeOption.findMany({ orderBy: { sortOrder: 'asc' } })));
app.post('/api/admin/recharge-options', async (req, res) => {
  const { coins, bonus, price, sortOrder } = req.body;
  try {
    res.json({ success: true, option: await prisma.rechargeOption.create({
      data: { coins: parseInt(coins), bonus: parseInt(bonus || 0), price: parseInt(price), sortOrder: parseInt(sortOrder || 0) }
    })});
  } catch (e) { res.status(400).json({ error: e.message }); }
});
app.put('/api/admin/recharge-options/:id', async (req, res) => {
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
app.delete('/api/admin/recharge-options/:id', async (req, res) => {
  try { await prisma.rechargeOption.delete({ where: { id: req.params.id } }); res.json({ success: true }); }
  catch (e) { res.status(400).json({ error: '删除失败，可能有订单引用' }); }
});

// --- 订单 ---
app.get('/api/admin/orders', async (req, res) => {
  res.json(await prisma.order.findMany({
    include: { user: { select: { username: true } }, option: true },
    orderBy: { createdAt: 'desc' },
    take: 200
  }));
});
app.put('/api/admin/orders/:id/paid', async (req, res) => {
  try {
    const order = await prisma.order.findUnique({ where: { id: req.params.id } });
    if (!order || order.status === 'PAID') return res.status(400).json({ error: '状态异常' });
    await prisma.$transaction(async (tx) => {
      await tx.order.update({ where: { id: req.params.id }, data: { status: 'PAID', paidAt: new Date() } });
      await tx.user.update({ where: { id: order.userId }, data: { coins: { increment: order.coins }, rechargeCount: { increment: 1 } } });
    });
    res.json({ success: true });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// --- 轮播图 ---
app.get('/api/admin/banners', async (req, res) => res.json(await prisma.banner.findMany({ orderBy: { sortOrder: 'asc' } })));
app.post('/api/admin/banners', async (req, res) => {
  const { imageUrl, link, title, sortOrder } = req.body;
  try {
    res.json({ success: true, banner: await prisma.banner.create({
      data: { imageUrl, link: link || '', title: title || '', sortOrder: parseInt(sortOrder || 0) }
    })});
  } catch (e) { res.status(400).json({ error: e.message }); }
});
app.put('/api/admin/banners/:id', async (req, res) => {
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
app.delete('/api/admin/banners/:id', async (req, res) => {
  try { await prisma.banner.delete({ where: { id: req.params.id } }); res.json({ success: true }); }
  catch (e) { res.status(400).json({ error: e.message }); }
});

// --- 任务 ---
app.get('/api/admin/tasks', async (req, res) => res.json(await prisma.task.findMany({ orderBy: { sortOrder: 'asc' } })));
app.post('/api/admin/tasks', async (req, res) => {
  const { title, description, action, targetCount, rewardCoins, sortOrder } = req.body;
  try {
    res.json({ success: true, task: await prisma.task.create({
      data: { title, description: description || '', action, targetCount: parseInt(targetCount), rewardCoins: parseInt(rewardCoins), sortOrder: parseInt(sortOrder || 0) }
    })});
  } catch (e) { res.status(400).json({ error: e.message }); }
});
app.put('/api/admin/tasks/:id', async (req, res) => {
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
app.delete('/api/admin/tasks/:id', async (req, res) => {
  try { await prisma.task.delete({ where: { id: req.params.id } }); res.json({ success: true }); }
  catch (e) { res.status(400).json({ error: '删除失败' }); }
});

// --- 兑换码 ---
app.get('/api/admin/redeem-codes', async (req, res) => res.json(await prisma.redeemCode.findMany({ orderBy: { createdAt: 'desc' }, take: 200 })));
app.post('/api/admin/redeem-codes', async (req, res) => {
  const { code, coins, maxUses } = req.body;
  try {
    const newCode = await prisma.redeemCode.create({
      data: { code: code.trim().toUpperCase(), coins: parseInt(coins || 0), maxUses: parseInt(maxUses || 1) }
    });
    res.json({ success: true, code: newCode });
  } catch (e) { res.status(400).json({ error: '兑换码可能已存在' }); }
});
app.post('/api/admin/redeem-codes/batch', async (req, res) => {
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
app.delete('/api/admin/redeem-codes/:id', async (req, res) => {
  try { await prisma.redeemCode.delete({ where: { id: req.params.id } }); res.json({ success: true }); }
  catch (e) { res.status(400).json({ error: '删除失败' }); }
});

// --- 工单 ---
app.get('/api/admin/tickets', async (req, res) => {
  res.json(await prisma.ticket.findMany({
    include: { user: { select: { username: true } }, replies: { orderBy: { createdAt: 'asc' } } },
    orderBy: { updatedAt: 'desc' }
  }));
});
app.post('/api/admin/tickets/:id/reply', async (req, res) => {
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
app.put('/api/admin/tickets/:id/close', async (req, res) => {
  try {
    await prisma.ticket.update({ where: { id: req.params.id }, data: { status: 'CLOSED' } });
    res.json({ success: true });
  } catch (e) { res.status(400).json({ error: e.message }); }
});
app.delete('/api/admin/tickets/:id', async (req, res) => {
  try { await prisma.ticket.delete({ where: { id: req.params.id } }); res.json({ success: true }); }
  catch (e) { res.status(400).json({ error: '删除失败' }); }
});

// --- 管理员账号 ---
app.get('/api/admin/admins', requireRole('super'), async (req, res) => {
  res.json(await prisma.admin.findMany({
    select: { id: true, username: true, role: true, isActive: true, createdAt: true, lastLoginAt: true },
    orderBy: { createdAt: 'asc' }
  }));
});
app.post('/api/admin/admins', requireRole('super'), async (req, res) => {
  const { username, password, role } = req.body;
  if (!username || !password) return res.status(400).json({ error: '请填写用户名和密码' });
  try {
    const admin = await prisma.admin.create({ data: { username, password, role: role || 'admin' } });
    res.json({ success: true, admin: { id: admin.id, username: admin.username, role: admin.role } });
  } catch (e) { res.status(400).json({ error: '用户名可能已存在' }); }
});
app.put('/api/admin/admins/:id', requireRole('super'), async (req, res) => {
  const { password, role, isActive } = req.body;
  const data = {};
  if (password) data.password = password;
  if (role) data.role = role;
  if (isActive !== undefined) data.isActive = isActive;
  try { await prisma.admin.update({ where: { id: req.params.id }, data }); res.json({ success: true }); }
  catch (e) { res.status(400).json({ error: e.message }); }
});
app.delete('/api/admin/admins/:id', requireRole('super'), async (req, res) => {
  try {
    if (req.admin.id === req.params.id) return res.status(400).json({ error: '不能删除自己' });
    await prisma.admin.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (e) { res.status(400).json({ error: '删除失败' }); }
});

// --- 通知管理 ---
app.get('/api/admin/notifications', async (req, res) => {
  res.json(await prisma.notification.findMany({ orderBy: { createdAt: 'desc' }, take: 100 }));
});
app.post('/api/admin/notifications', async (req, res) => {
  const { userId, title, content } = req.body;
  if (!title || !content) return res.status(400).json({ error: '请填写标题和内容' });
  try {
    const notification = await prisma.notification.create({
      data: { userId: userId || null, title, content }
    });
    res.json({ success: true, notification });
  } catch (e) { res.status(400).json({ error: e.message }); }
});
app.delete('/api/admin/notifications/:id', async (req, res) => {
  try { await prisma.notification.delete({ where: { id: req.params.id } }); res.json({ success: true }); }
  catch (e) { res.status(400).json({ error: '删除失败' }); }
});

// ================= 服务启动 =================
const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => console.log(`🚀 后端服务器运行在 http://localhost:${PORT}`));
