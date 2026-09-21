const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const app = express();

app.use(cors());
app.use(express.json());

// ================= 用户端 API =================

// 1. 登录接口
app.post('/api/login', async (req, res) => {
  const { username } = req.body;
  const user = await prisma.user.findUnique({
    where: { username },
    include: { inventory: { include: { card: true } } }
  });
  if (!user) return res.status(404).json({ error: '用户不存在' });
  res.json(user);
});

// 2. 获取盲盒列表
app.get('/api/boxes', async (req, res) => {
  const boxes = await prisma.box.findMany();
  res.json(boxes);
});

// 3. 抽卡接口
app.post('/api/draw', async (req, res) => {
  const { userId, boxId, count } = req.body;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const box = await tx.box.findUnique({
        where: { id: boxId },
        include: { items: { include: { card: true } } }
      });
      
      const user = await tx.user.findUnique({ where: { id: userId } });
      const totalCost = box.price * count;

      if (user.coins < totalCost) {
        throw new Error('金币不足');
      }

      await tx.user.update({
        where: { id: userId },
        data: { coins: { decrement: totalCost } }
      });

      const drawnCards = [];
      const totalWeight = box.items.reduce((sum, item) => sum + item.weight, 0);

      for (let i = 0; i < count; i++) {
        let random = Math.random() * totalWeight;
        for (const item of box.items) {
          if (random < item.weight) {
            drawnCards.push(item.card);
            break;
          }
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
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ================= 管理后台 API =================
// 管理员密码（强烈建议部署后修改这个密码！）
const ADMIN_PASSWORD = 'admin123';

// 密码校验中间件
app.use('/api/admin', (req, res, next) => {
  const pwd = req.headers['x-admin-password'];
  if (pwd !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: '密码错误，无权访问' });
  }
  next();
});

// 1. 获取统计数据
app.get('/api/admin/stats', async (req, res) => {
  const userCount = await prisma.user.count();
  const cardCount = await prisma.card.count();
  const boxCount = await prisma.box.count();
  res.json({ userCount, cardCount, boxCount });
});

// 2. 获取所有卡牌
app.get('/api/admin/cards', async (req, res) => {
  const cards = await prisma.card.findMany();
  res.json(cards);
});

// 3. 添加卡牌
app.post('/api/admin/cards', async (req, res) => {
  const { name, rarity, imageUrl } = req.body;
  try {
    const card = await prisma.card.create({ data: { name, rarity, imageUrl: imageUrl || '' } });
    res.json({ success: true, card });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// 4. 删除卡牌
app.delete('/api/admin/cards/:id', async (req, res) => {
  try {
    await prisma.card.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: '删除失败，可能存在关联的盲盒数据' });
  }
});

// 5. 获取所有盲盒
app.get('/api/admin/boxes', async (req, res) => {
  const boxes = await prisma.box.findMany({ include: { items: { include: { card: true } } } });
  res.json(boxes);
});

// 6. 修改盲盒价格
app.put('/api/admin/boxes/:id', async (req, res) => {
  const { price } = req.body;
  try {
    const box = await prisma.box.update({ where: { id: req.params.id }, data: { price: parseInt(price) } });
    res.json({ success: true, box });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// 7. 获取所有用户
app.get('/api/admin/users', async (req, res) => {
  const users = await prisma.user.findMany({ select: { id: true, username: true, coins: true } });
  res.json(users);
});

// 8. 修改用户金币
app.put('/api/admin/users/:id/coins', async (req, res) => {
  const { coins } = req.body;
  try {
    const user = await prisma.user.update({ where: { id: req.params.id }, data: { coins: parseInt(coins) } });
    res.json({ success: true, user });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ================= 服务启动 =================
const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => console.log(`🚀 后端服务器运行在 http://localhost:${PORT}`));
