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
  const boxes = await prisma.box.findMany({ where: { isActive: true } });
  res.json(boxes);
});

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
      return { success: true, drawnCards };
    });
    res.json(result);
  } catch (error) { res.status(400).json({ error: error.message }); }
});

// ---- 用户端充值相关 ----
// 获取所有上架的充值套餐
app.get('/api/recharge-options', async (req, res) => {
  const options = await prisma.rechargeOption.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' }
  });
  res.json(options);
});

// 创建充值订单（模拟支付）
app.post('/api/recharge', async (req, res) => {
  const { userId, optionId } = req.body;
  try {
    const result = await prisma.$transaction(async (tx) => {
      const option = await tx.rechargeOption.findUnique({ where: { id: optionId } });
      if (!option || !option.isActive) throw new Error('充值套餐已下架');

      const totalCoins = option.coins + option.bonus;

      // 创建订单
      const order = await tx.order.create({
        data: { userId, optionId, amount: option.price, coins: totalCoins, status: 'PAID', paidAt: new Date() }
      });

      // 加金币
      await tx.user.update({
        where: { id: userId },
        data: { 
          coins: { increment: totalCoins },
          rechargeCount: { increment: 1 }
        }
      });

      return { success: true, order, coinsAdded: totalCoins };
    });
    res.json(result);
  } catch (error) { res.status(400).json({ error: error.message }); }
});

// 用户端获取首页轮播图
app.get('/api/banners', async (req, res) => {
  const banners = await prisma.banner.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' }
  });
  res.json(banners);
});

// ================= 管理后台 API =================
const ADMIN_PASSWORD = 'admin123';
app.use('/api/admin', (req, res, next) => {
  if (req.headers['x-admin-password'] !== ADMIN_PASSWORD) return res.status(401).json({ error: '密码错误' });
  next();
});

app.get('/api/admin/stats', async (req, res) => {
  res.json({
    userCount: await prisma.user.count(),
    cardCount: await prisma.card.count(),
    boxCount: await prisma.box.count(),
    orderCount: await prisma.order.count(),
    totalRevenue: (await prisma.order.aggregate({ where: { status: 'PAID' }, _sum: { amount: true } }))._sum.amount || 0
  });
});

// --- 用户管理（保持不变） ---
app.get('/api/admin/users', async (req, res) => {
  const users = await prisma.user.findMany({
    select: { id: true, username: true, coins: true, createdAt: true, lastLoginAt: true,
      tags: true, remark: true, rechargeCount: true, withdrawalCount: true, withdrawalAmount: true },
    orderBy: { createdAt: 'desc' }
  });
  res.json(users);
});

app.put('/api/admin/users/:id', async (req, res) => {
  const { username, password, coins, tags, remark } = req.body;
  const data = {};
  if (username) data.username = username;
  if (password) data.password = password;
  if (coins !== undefined) data.coins = parseInt(coins);
  if (tags !== undefined) data.tags = tags;
  if (remark !== undefined) data.remark = remark;
  try {
    const user = await prisma.user.update({ where: { id: req.params.id }, data });
    res.json({ success: true, user });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

app.delete('/api/admin/users/:id', async (req, res) => {
  try {
    await prisma.user.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (e) { res.status(400).json({ error: '删除失败，可能有关联数据' }); }
});

// --- 卡牌管理（保持不变） ---
app.get('/api/admin/cards', async (req, res) => {
  res.json(await prisma.card.findMany({ orderBy: { createdAt: 'desc' } }));
});
app.post('/api/admin/cards', async (req, res) => {
  const { name, rarity, imageUrl } = req.body;
  try {
    const card = await prisma.card.create({ data: { name, rarity, imageUrl: imageUrl || '' } });
    res.json({ success: true, card });
  } catch (e) { res.status(400).json({ error: e.message }); }
});
app.put('/api/admin/cards/:id', async (req, res) => {
  const { name, rarity, imageUrl } = req.body;
  try {
    const card = await prisma.card.update({ where: { id: req.params.id }, data: { name, rarity, imageUrl } });
    res.json({ success: true, card });
  } catch (e) { res.status(400).json({ error: e.message }); }
});
app.delete('/api/admin/cards/:id', async (req, res) => {
  try {
    await prisma.card.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (e) { res.status(400).json({ error: '删除失败' }); }
});

// --- 盲盒管理（保持不变） ---
app.get('/api/admin/boxes', async (req, res) => {
  res.json(await prisma.box.findMany({ include: { items: { include: { card: true } } }, orderBy: { createdAt: 'desc' } }));
});
app.post('/api/admin/boxes', async (req, res) => {
  const { name, price, coverUrl } = req.body;
  try {
    const box = await prisma.box.create({ data: { name, price: parseInt(price), coverUrl: coverUrl || '' } });
    res.json({ success: true, box });
  } catch (e) { res.status(400).json({ error: e.message }); }
});
app.put('/api/admin/boxes/:id', async (req, res) => {
  const { name, price, coverUrl, isActive } = req.body;
  const data = {};
  if (name) data.name = name;
  if (price !== undefined) data.price = parseInt(price);
  if (coverUrl !== undefined) data.coverUrl = coverUrl;
  if (isActive !== undefined) data.isActive = isActive;
  try {
    const box = await prisma.box.update({ where: { id: req.params.id }, data });
    res.json({ success: true, box });
  } catch (e) { res.status(400).json({ error: e.message }); }
});
app.delete('/api/admin/boxes/:id', async (req, res) => {
  try {
    await prisma.box.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (e) { res.status(400).json({ error: '删除失败' }); }
});
app.post('/api/admin/boxes/:id/items', async (req, res) => {
  const { cardId, weight } = req.body;
  try {
    const existing = await prisma.boxItem.findFirst({ where: { boxId: req.params.id, cardId } });
    if (existing) {
      const item = await prisma.boxItem.update({ where: { id: existing.id }, data: { weight: parseInt(weight) } });
      res.json({ success: true, item });
    } else {
      const item = await prisma.boxItem.create({ data: { boxId: req.params.id, cardId, weight: parseInt(weight) } });
      res.json({ success: true, item });
    }
  } catch (e) { res.status(400).json({ error: e.message }); }
});
app.delete('/api/admin/boxes/:boxId/items/:itemId', async (req, res) => {
  try {
    await prisma.boxItem.delete({ where: { id: req.params.itemId } });
    res.json({ success: true });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// --- 充值套餐管理（新增） ---
app.get('/api/admin/recharge-options', async (req, res) => {
  res.json(await prisma.rechargeOption.findMany({ orderBy: { sortOrder: 'asc' } }));
});
app.post('/api/admin/recharge-options', async (req, res) => {
  const { coins, bonus, price, sortOrder } = req.body;
  try {
    const option = await prisma.rechargeOption.create({
      data: { coins: parseInt(coins), bonus: parseInt(bonus || 0), price: parseInt(price), sortOrder: parseInt(sortOrder || 0) }
    });
    res.json({ success: true, option });
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
  try {
    const option = await prisma.rechargeOption.update({ where: { id: req.params.id }, data });
    res.json({ success: true, option });
  } catch (e) { res.status(400).json({ error: e.message }); }
});
app.delete('/api/admin/recharge-options/:id', async (req, res) => {
  try {
    await prisma.rechargeOption.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (e) { res.status(400).json({ error: '删除失败，可能有订单引用该套餐' }); }
});

// --- 订单管理（新增） ---
app.get('/api/admin/orders', async (req, res) => {
  const orders = await prisma.order.findMany({
    include: { user: { select: { username: true } }, option: true },
    orderBy: { createdAt: 'desc' },
    take: 200
  });
  res.json(orders);
});
app.put('/api/admin/orders/:id/paid', async (req, res) => {
  try {
    const order = await prisma.order.findUnique({ where: { id: req.params.id } });
    if (!order || order.status === 'PAID') return res.status(400).json({ error: '订单状态异常' });

    await prisma.$transaction(async (tx) => {
      await tx.order.update({ where: { id: req.params.id }, data: { status: 'PAID', paidAt: new Date() } });
      await tx.user.update({
        where: { id: order.userId },
        data: { coins: { increment: order.coins }, rechargeCount: { increment: 1 } }
      });
    });
    res.json({ success: true });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// --- 轮播图管理（新增） ---
app.get('/api/admin/banners', async (req, res) => {
  res.json(await prisma.banner.findMany({ orderBy: { sortOrder: 'asc' } }));
});
app.post('/api/admin/banners', async (req, res) => {
  const { imageUrl, link, title, sortOrder } = req.body;
  try {
    const banner = await prisma.banner.create({
      data: { imageUrl, link: link || '', title: title || '', sortOrder: parseInt(sortOrder || 0) }
    });
    res.json({ success: true, banner });
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
  try {
    const banner = await prisma.banner.update({ where: { id: req.params.id }, data });
    res.json({ success: true, banner });
  } catch (e) { res.status(400).json({ error: e.message }); }
});
app.delete('/api/admin/banners/:id', async (req, res) => {
  try {
    await prisma.banner.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// ================= 服务启动 =================
const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => console.log(`🚀 后端服务器运行在 http://localhost:${PORT}`));
