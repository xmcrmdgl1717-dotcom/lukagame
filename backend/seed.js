const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // 默认管理员账号
  await prisma.admin.upsert({
    where: { username: 'admin' },
    update: {},
    create: { username: 'admin', password: 'admin123', role: 'super' }
  });
  await prisma.admin.upsert({
    where: { username: 'operator' },
    update: {},
    create: { username: 'operator', password: 'op123', role: 'operator' }
  });

  // 测试用户
  await prisma.user.upsert({
    where: { username: 'test' },
    update: {},
    create: { username: 'test', password: '123', coins: 100000 }
  });

  const c1 = await prisma.card.upsert({ where: { id: 'card-1' }, update: {}, create: { id: 'card-1', name: '喷火龙', rarity: 'SSR', imageUrl: '' } });
  const c2 = await prisma.card.upsert({ where: { id: 'card-2' }, update: {}, create: { id: 'card-2', name: '皮卡丘', rarity: 'SR', imageUrl: '' } });
  const c3 = await prisma.card.upsert({ where: { id: 'card-3' }, update: {}, create: { id: 'card-3', name: '杰尼龟', rarity: 'R', imageUrl: '' } });

  await prisma.box.upsert({
    where: { id: 'box-1' }, update: {},
    create: {
      id: 'box-1', name: 'Heaven & Hell', price: 450, coverUrl: '',
      items: { create: [{ cardId: c1.id, weight: 1 }, { cardId: c2.id, weight: 9 }, { cardId: c3.id, weight: 90 }] }
    }
  });

  const rechargeOptions = [
    { id: 'rc-1', coins: 300, bonus: 0, price: 3000, sortOrder: 1 },
    { id: 'rc-2', coins: 1500, bonus: 100, price: 15000, sortOrder: 2 },
    { id: 'rc-3', coins: 3000, bonus: 300, price: 30000, sortOrder: 3 },
    { id: 'rc-4', coins: 6000, bonus: 800, price: 60000, sortOrder: 4 },
    { id: 'rc-5', coins: 15000, bonus: 2500, price: 150000, sortOrder: 5 },
    { id: 'rc-6', coins: 30000, bonus: 6000, price: 300000, sortOrder: 6 },
  ];
  for (const opt of rechargeOptions) await prisma.rechargeOption.upsert({ where: { id: opt.id }, update: {}, create: opt });

  const banners = [
    { id: 'bn-1', imageUrl: 'https://via.placeholder.com/800x400/2d1410/ff6600?text=1+Week+Spending+Leaderboard', link: 'https://luka.game', title: '1 Week Spending', sortOrder: 1 },
    { id: 'bn-2', imageUrl: 'https://via.placeholder.com/800x400/1a0f2a/aa66ff?text=Heaven+%26+Hell+Limited+Event', link: 'https://luka.game', title: 'Heaven & Hell', sortOrder: 2 },
    { id: 'bn-3', imageUrl: 'https://via.placeholder.com/800x400/0f1a2a/66aaff?text=New+User+Bonus', link: 'https://luka.game', title: 'New User Bonus', sortOrder: 3 },
  ];
  for (const b of banners) await prisma.banner.upsert({ where: { id: b.id }, update: {}, create: b });

  const tasks = [
    { id: 'task-1', title: '每日抽卡 1 次', description: '完成任意盲盒抽卡 1 次', action: 'DRAW', targetCount: 1, rewardCoins: 100, sortOrder: 1 },
    { id: 'task-2', title: '每日抽卡 10 次', description: '今日累计抽卡 10 次', action: 'DRAW', targetCount: 10, rewardCoins: 500, sortOrder: 2 },
    { id: 'task-3', title: '每日抽卡 50 次', description: '今日累计抽卡 50 次', action: 'DRAW', targetCount: 50, rewardCoins: 3000, sortOrder: 3 },
    { id: 'task-4', title: '消耗 5000 金币', description: '今日累计消费 5000 金币', action: 'SPEND', targetCount: 5000, rewardCoins: 500, sortOrder: 4 },
  ];
  for (const t of tasks) await prisma.task.upsert({ where: { id: t.id }, update: {}, create: t });

  console.log('✅ 数据初始化完成！管理员: admin/admin123 (super) 或 operator/op123');
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
