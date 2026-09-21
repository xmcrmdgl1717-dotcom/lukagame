const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.user.create({
    data: { username: 'test', password: '123', coins: 100000 }
  });

  const c1 = await prisma.card.create({ data: { name: '喷火龙', rarity: 'SSR', imageUrl: '' } });
  const c2 = await prisma.card.create({ data: { name: '皮卡丘', rarity: 'SR', imageUrl: '' } });
  const c3 = await prisma.card.create({ data: { name: '杰尼龟', rarity: 'R', imageUrl: '' } });

  await prisma.box.create({
    data: {
      name: 'Heaven & Hell',
      price: 450,
      coverUrl: '',
      items: {
        create: [
          { cardId: c1.id, weight: 1 },
          { cardId: c2.id, weight: 9 },
          { cardId: c3.id, weight: 90 }
        ]
      }
    }
  });

  console.log('✅ 数据初始化完成！测试用户: test, 密码: 123, 初始金币: 100,000');
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
