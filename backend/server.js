const express = require('express');
const cors = require('cors');
const { execSync } = require('child_process');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const app = express();

app.use(cors());
app.use(express.json());

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

// 3. 核心抽卡接口
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

// 4. 【新增】线上数据库初始化接口（只执行一次）
app.get('/api/setup-db', async (req, res) => {
  try {
    console.log('开始执行数据库初始化...');
    // 执行 prisma db push
    execSync('npx prisma db push', { stdio: 'inherit' });
    // 执行 seed.js
    execSync('node seed.js', { stdio: 'inherit' });
    res.json({ success: true, message: '数据库初始化完成！请回到前端刷新页面。' });
  } catch (error) {
    console.error('初始化失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => console.log(`🚀 后端服务器运行在 http://localhost:${PORT}`));
