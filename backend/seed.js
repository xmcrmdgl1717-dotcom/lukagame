const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // 1. 创建测试用户，初始金币 100,000
  await prisma.user.upsert({
    where: { username: 'test' },
    update: {},
    create: { username: 'test', password: '123', coins: 100000 }
  });

  // 2. 创建卡牌
  const c1 = await prisma.card.upsert({
    where: { id: 'card-1' }, // 指定固定 ID，防止重复创建
    update: {},
    create: { id: 'card-1', name: '喷火龙', rarity: 'SSR', imageUrl: '' }
  });

  const c2 = await prisma.card.upsert({
    where: { id: 'card-2' },
    update: {},
    create: { id: 'card-2', name: '皮卡丘', rarity: 'SR', imageUrl: '' }
  });

  const c3 = await prisma.card.upsert({
    where: { id: 'card-3' },
    update: {},
    create: { id: 'card-3', name: '杰尼龟', rarity: 'R', imageUrl: '' }
  });

  // 3. 创建盲盒
  await prisma.box.upsert({
    where: { id: 'box-1' },
    update: {},
    create: {
      id: 'box-1',
      name: 'Heaven & Hell',
      price: 450,
      coverUrl: '',
      items: {
        create: [
          { cardId: c1.id, weight: 1 },  // 1% 概率
          { cardId: c2.id, weight: 9 },  // 9% 概率
          { cardId: c3.id, weight: 90 }  // 90% 概率
        ]
      }
    }
  });

  console.log('✅ 数据初始化完成！测试用户: test, 密码: 123, 初始金币: 100,000');
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
