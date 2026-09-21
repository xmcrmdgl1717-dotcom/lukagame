const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // 1. 创建测试用户
  await prisma.user.upsert({
    where: { username: 'test' },
    update: {},
    create: { username: 'test', password: '123', coins: 100000 }
  });

  // 2. 创建卡牌
  const c1 = await prisma.card.upsert({
    where: { id: 'card-1' },
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
          { cardId: c1.id, weight: 1 },
          { cardId: c2.id, weight: 9 },
          { cardId: c3.id, weight: 90 }
        ]
      }
    }
  });

  // 4. 创建默认充值套餐（价格单位：分）
  const rechargeOptions = [
    { id: 'rc-1', coins: 300, bonus: 0, price: 3000, sortOrder: 1 },
    { id: 'rc-2', coins: 1500, bonus: 100, price: 15000, sortOrder: 2 },
    { id: 'rc-3', coins: 3000, bonus: 300, price: 30000, sortOrder: 3 },
    { id: 'rc-4', coins: 6000, bonus: 800, price: 60000, sortOrder: 4 },
    { id: 'rc-5', coins: 15000, bonus: 2500, price: 150000, sortOrder: 5 },
    { id: 'rc-6', coins: 30000, bonus: 6000, price: 300000, sortOrder: 6 },
  ];
  for (const opt of rechargeOptions) {
    await prisma.rechargeOption.upsert({
      where: { id: opt.id },
      update: {},
      create: opt
    });
  }

  // 5. 创建默认轮播图
  const banners = [
    { id: 'bn-1', imageUrl: 'https://via.placeholder.com/800x400/2d1410/ff6600?text=1+Week+Spending+Leaderboard', link: 'https://luka.game', title: '1 Week Spending', sortOrder: 1 },
    { id: 'bn-2', imageUrl: 'https://via.placeholder.com/800x400/1a0f2a/aa66ff?text=Heaven+%26+Hell+Limited+Event', link: 'https://luka.game', title: 'Heaven & Hell', sortOrder: 2 },
    { id: 'bn-3', imageUrl: 'https://via.placeholder.com/800x400/0f1a2a/66aaff?text=New+User+Bonus', link: 'https://luka.game', title: 'New User Bonus', sortOrder: 3 },
  ];
  for (const b of banners) {
    await prisma.banner.upsert({
      where: { id: b.id },
      update: {},
      create: b
    });
  }

  console.log('✅ 数据初始化完成！');
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
