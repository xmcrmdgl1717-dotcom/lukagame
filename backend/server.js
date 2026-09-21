const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const app = express();

app.use(cors());
app.use(express.json());

app.post('/api/login', async (req, res) => {
  const { username } = req.body;
  const user = await prisma.user.findUnique({
    where: { username },
    include: { inventory: { include: { card: true } } }
  });
  if (!user) return res.status(404).json({ error: '用户不存在' });
  res.json(user);
});

app.get('/api/boxes', async (req, res) => {
  const boxes = await prisma.box.findMany();
  res.json(boxes);
});

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

const PORT = 3001;
app.listen(PORT, () => console.log(`🚀 后端服务器运行在 http://localhost:${PORT}`));
