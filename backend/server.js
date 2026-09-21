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

// ================= 管理后台 API =================
const ADMIN_PASSWORD = 'admin123';
app.use('/api/admin', (req, res, next) => {
  if (req.headers['x-admin-password'] !== ADMIN_PASSWORD) return res.status(401).json({ error: '密码错误' });
  next();
});

// --- 数据概览 ---
app.get('/api/admin/stats', async (req, res) => {
  res.json({
    userCount: await prisma.user.count(),
    cardCount: await prisma.card.count(),
    boxCount: await prisma.box.count()
  });
});

// --- 用户管理 ---
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

// --- 卡牌管理 ---
app.get('/api/admin/cards', async (req, res) => {
  const cards = await prisma.card.findMany({ orderBy: { createdAt: 'desc' } });
  res.json(cards);
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
  } catch (e) { res.status(400).json({ error: '删除失败，可能有盲盒正在引用该卡牌' }); }
});

// --- 盲盒管理 ---
app.get('/api/admin/boxes', async (req, res) => {
  const boxes = await prisma.box.findMany({
    include: { items: { include: { card: true } } },
    orderBy: { createdAt: 'desc' }
  });
  res.json(boxes);
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

// --- 盲盒概率配置（核心） ---
app.post('/api/admin/boxes/:id/items', async (req, res) => {
  const { cardId, weight } = req.body;
  try {
    // 先看该盲盒里是否已经有这张卡，有就更新权重，没有就新增
    const existing = await prisma.boxItem.findFirst({ where: { boxId: req.params.id, cardId } });
    if (existing) {
      const item = await prisma.boxItem.update({ where: { id: existing.id }, data: { weight: parseInt(weight) } });
      res.json({ success: true, item });
    } else {
      const item = await prisma.boxItem.create({
        data: { boxId: req.params.id, cardId, weight: parseInt(weight) }
      });
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

// ================= 服务启动 =================
const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => console.log(`🚀 后端服务器运行在 http://localhost:${PORT}`));
