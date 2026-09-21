const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const app = express();

app.use(cors());
app.use(express.json());

// ================= 用户端 API =================

// 1. 登录接口（校验密码）
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await prisma.user.findUnique({
    where: { username },
    include: { inventory: { include: { card: true } } }
  });
  if (!user || user.password !== password) {
    return res.status(401).json({ error: '用户名或密码错误' });
  }
  res.json(user);
});

// 2. 注册接口
app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: '请输入用户名和密码' });
  
  try {
    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) return res.status(400).json({ error: '用户名已存在' });

    const newUser = await prisma.user.create({
      data: { username, password, coins: 10000 } // 注册送1万金币
    });
    res.json({ success: true, user: newUser });
  } catch (error) {
    res.status(500).json({ error: '注册失败，请重试' });
  }
});

// 3. 获取盲盒列表
app.get('/api/boxes', async (req, res) => {
  const boxes = await prisma.box.findMany();
  res.json(boxes);
});

// 4. 抽卡接口
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
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ================= 管理后台 API =================
const ADMIN_PASSWORD = 'admin123';

app.use('/api/admin', (req, res, next) => {
  const pwd = req.headers['x-admin-password'];
  if (pwd !== ADMIN_PASSWORD) return res.status(401).json({ error: '密码错误，无权访问' });
  next();
});

app.get('/api/admin/stats', async (req, res) => {
  res.json({ 
    userCount: await prisma.user.count(), 
    cardCount: await prisma.card.count(), 
    boxCount: await prisma.box.count() 
  });
});

app.get('/api/admin/users', async (req, res) => {
  res.json(await prisma.user.findMany({ select: { id: true, username: true, coins: true } }));
});

app.put('/api/admin/users/:id/coins', async (req, res) => {
  const user = await prisma.user.update({ 
    where: { id: req.params.id }, 
    data: { coins: parseInt(req.body.coins) } 
  });
  res.json({ success: true, user });
});

// 启动服务
const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => console.log(`🚀 后端服务器运行在 http://localhost:${PORT}`));
