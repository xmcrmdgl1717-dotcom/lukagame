const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const ALL_PERM = [
    'users.view','users.edit','users.delete','users.vip',
    'groups.view','groups.edit',
    'bankcards.view','bankcards.edit',
    'games.view','games.create','games.edit','games.delete',
    'cards.view','cards.create','cards.edit','cards.delete',
    'boxes.view','boxes.create','boxes.edit','boxes.delete','boxes.probability',
    'recharge.view','recharge.create','recharge.edit','recharge.delete',
    'orders.view','orders.refund',
    'payments.view','payments.edit',
    'withdrawals.view','withdrawals.approve',
    'transactions.view',
    'drawlogs.view','drawlogs.export',
    'cardorders.view','cardorders.process',
    'popups.view','popups.create','popups.edit','popups.delete',
    'articles.view','articles.create','articles.edit','articles.delete',
    'banners.view','banners.create','banners.edit','banners.delete',
    'ads.view','ads.create','ads.edit','ads.delete',
    'tasks.view','tasks.create','tasks.edit','tasks.delete',
    'redeem.view','redeem.create','redeem.delete',
    'notifications.view','notifications.create','notifications.delete',
    'tickets.view','tickets.reply','tickets.close','tickets.delete',
    'reports.view','reports.export',
    'admins.view','admins.create','admins.edit','admins.delete',
    'roles.view','roles.create','roles.edit','roles.delete',
    'menus.view','menus.edit',
    'languages.view','languages.edit',
    'audit.view',
  ].join(',');

  await prisma.role.upsert({
    where: { name: 'super' },
    update: { permissions: ALL_PERM },
    create: { name: 'super', displayName: '超级管理员', description: '拥有全部权限', permissions: ALL_PERM, isSystem: true },
  });

  const superRole = await prisma.role.findUnique({ where: { name: 'super' } });
  await prisma.admin.upsert({
    where: { username: 'admin' },
    update: {},
    create: { username: 'admin', password: 'admin123', roleId: superRole.id, role: 'super' },
  });

  // ================= 语言 =================
  const languages = [
    { code: 'zh-CN', name: '简体中文', flag: '🇨🇳', isDefault: true, sortOrder: 1 },
    { code: 'en-US', name: 'English', flag: '🇺🇸', isDefault: false, sortOrder: 2 },
    { code: 'es-ES', name: 'Español', flag: '🇪🇸', isDefault: false, sortOrder: 3 },
  ];
  for (const l of languages) {
    await prisma.language.upsert({ where: { code: l.code }, update: {}, create: l });
  }

  // ================= 翻译词条（示例） =================
  const translations = [
    { key: 'common.home', namespace: 'common', translations: JSON.stringify({ 'zh-CN': '首页', 'en-US': 'Home', 'es-ES': 'Inicio' }) },
    { key: 'common.activity', namespace: 'common', translations: JSON.stringify({ 'zh-CN': '活动', 'en-US': 'Activity', 'es-ES': 'Actividad' }) },
    { key: 'common.recharge', namespace: 'common', translations: JSON.stringify({ 'zh-CN': '充值', 'en-US': 'Recharge', 'es-ES': 'Recargar' }) },
    { key: 'common.inventory', namespace: 'common', translations: JSON.stringify({ 'zh-CN': '存货', 'en-US': 'Inventory', 'es-ES': 'Inventario' }) },
    { key: 'common.profile', namespace: 'common', translations: JSON.stringify({ 'zh-CN': '我的', 'en-US': 'Profile', 'es-ES': 'Mi cuenta' }) },
    { key: 'common.login', namespace: 'common', translations: JSON.stringify({ 'zh-CN': '登录', 'en-US': 'Sign In', 'es-ES': 'Iniciar sesión' }) },
    { key: 'common.register', namespace: 'common', translations: JSON.stringify({ 'zh-CN': '注册', 'en-US': 'Sign Up', 'es-ES': 'Registrarse' }) },
    { key: 'common.submit', namespace: 'common', translations: JSON.stringify({ 'zh-CN': '提交', 'en-US': 'Submit', 'es-ES': 'Enviar' }) },
    { key: 'common.cancel', namespace: 'common', translations: JSON.stringify({ 'zh-CN': '取消', 'en-US': 'Cancel', 'es-ES': 'Cancelar' }) },
    { key: 'common.confirm', namespace: 'common', translations: JSON.stringify({ 'zh-CN': '确认', 'en-US': 'Confirm', 'es-ES': 'Confirmar' }) },
  ];
  for (const t of translations) {
    await prisma.translation.upsert({ where: { key: t.key }, update: {}, create: t });
  }

  // ================= VIP 等级 =================
  const vipLevels = [
    { level: 0, name: 'VIP0', sortOrder: 1, rechargeAmount: 0, consumeAmount: 0 },
    { level: 1, name: 'VIP1', sortOrder: 2, rechargeAmount: 30000, consumeAmount: 100000 },
    { level: 2, name: 'VIP2', sortOrder: 3, rechargeAmount: 100000, consumeAmount: 300000 },
    { level: 3, name: 'VIP3', sortOrder: 4, rechargeAmount: 500000, consumeAmount: 1500000 },
    { level: 4, name: 'VIP4', sortOrder: 5, rechargeAmount: 1000000, consumeAmount: 3000000 },
    { level: 5, name: 'VIP5', sortOrder: 6, rechargeAmount: 3000000, consumeAmount: 10000000 },
    { level: 6, name: 'VIP6', sortOrder: 7, rechargeAmount: 10000000, consumeAmount: 30000000 },
    { level: 7, name: 'VIP7', sortOrder: 8, rechargeAmount: 30000000, consumeAmount: 90000000 },
    { level: 8, name: 'VIP8', sortOrder: 9, rechargeAmount: 100000000, consumeAmount: 300000000 },
    { level: 9, name: 'VIP9', sortOrder: 10, rechargeAmount: 300000000, consumeAmount: 900000000 },
  ];
  for (const v of vipLevels) await prisma.vipLevel.upsert({ where: { level: v.level }, update: {}, create: v });

  // ================= 用户分组 =================
  const groups = [
    { name: 'normal', displayName: '普通用户', color: '#6b7280', sortOrder: 1 },
    { name: 'bigr', displayName: '大R用户', color: '#ef4444', sortOrder: 2 },
    { name: 'potential', displayName: '潜力用户', color: '#f59e0b', sortOrder: 3 },
    { name: 'lost', displayName: '流失用户', color: '#9ca3af', sortOrder: 4 },
  ];
  for (const g of groups) await prisma.userGroup.upsert({ where: { name: g.name }, update: {}, create: g });

  // ================= 支付渠道 =================
  const channels = [
    { name: 'alipay', displayName: '支付宝', sortOrder: 1 },
    { name: 'wechat', displayName: '微信支付', sortOrder: 2 },
    { name: 'stripe', displayName: 'Stripe', sortOrder: 3 },
  ];
  for (const c of channels) await prisma.paymentChannel.upsert({ where: { name: c.name }, update: {}, create: c });

  // ================= 测试用户 =================
  await prisma.user.upsert({
    where: { username: 'test' },
    update: {},
    create: { username: 'test', password: '123', coins: 100000, vipLevel: 2, totalRecharge: 100000, totalConsume: 300000 },
  });

  // ================= 卡牌 / 游戏 / 盲盒 =================
  const c1 = await prisma.card.upsert({ where: { id: 'card-1' }, update: {}, create: { id: 'card-1', name: '喷火龙', rarity: 'SSR', value: 50000 } });
  const c2 = await prisma.card.upsert({ where: { id: 'card-2' }, update: {}, create: { id: 'card-2', name: '皮卡丘', rarity: 'SR', value: 5000 } });
  const c3 = await prisma.card.upsert({ where: { id: 'card-3' }, update: {}, create: { id: 'card-3', name: '杰尼龟', rarity: 'R', value: 500 } });

  const game = await prisma.game.upsert({
    where: { name: 'heaven_hell' },
    update: {},
    create: {
      name: 'heaven_hell', displayName: '天堂与地狱', description: '经典卡牌抽奖', icon: '🎴',
      minVipLevel: 0, minCoins: 0, enableLeaderboard: true, leaderboardMetric: 'CONSUME', leaderboardType: 'WEEKLY',
    },
  });

  await prisma.box.upsert({
    where: { id: 'box-1' },
    update: { gameId: game.id },
    create: {
      id: 'box-1', name: 'Heaven & Hell', price: 450, coverUrl: '', gameId: game.id, isFeatured: true,
      items: { create: [{ cardId: c1.id, weight: 1 }, { cardId: c2.id, weight: 9 }, { cardId: c3.id, weight: 90 }] },
    },
  });

  // ================= 充值套餐 =================
  const opts = [
    { id: 'rc-1', coins: 300, bonus: 0, price: 3000, sortOrder: 1 },
    { id: 'rc-2', coins: 1500, bonus: 100, price: 15000, sortOrder: 2 },
    { id: 'rc-3', coins: 3000, bonus: 300, price: 30000, sortOrder: 3 },
    { id: 'rc-4', coins: 6000, bonus: 800, price: 60000, sortOrder: 4 },
    { id: 'rc-5', coins: 15000, bonus: 2500, price: 150000, sortOrder: 5 },
    { id: 'rc-6', coins: 30000, bonus: 6000, price: 300000, sortOrder: 6 },
  ];
  for (const o of opts) await prisma.rechargeOption.upsert({ where: { id: o.id }, update: {}, create: o });

  // ================= 轮播图 =================
  const banners = [
    { id: 'bn-1', imageUrl: 'https://via.placeholder.com/800x400/2d1410/ff6600?text=Welcome', link: 'https://luka.game', title: 'Welcome', sortOrder: 1 },
  ];
  for (const b of banners) await prisma.banner.upsert({ where: { id: b.id }, update: {}, create: b });

  // ================= 任务 =================
  const tasks = [
    { id: 'task-1', title: '每日抽卡 1 次', action: 'DRAW', targetCount: 1, rewardCoins: 100, sortOrder: 1 },
    { id: 'task-2', title: '每日抽卡 10 次', action: 'DRAW', targetCount: 10, rewardCoins: 500, sortOrder: 2 },
  ];
  for (const t of tasks) await prisma.task.upsert({ where: { id: t.id }, update: {}, create: t });

  // ================= 预置文章 =================
  const articles = [
    { slug: 'about', category: 'SYSTEM', title: '关于我们', content: '<p>LUKA 是一家专注于宝可梦卡牌数字抽奖的平台...</p>', isPublished: true, sortOrder: 1 },
    { slug: 'terms', category: 'SYSTEM', title: '用户协议', content: '<p>欢迎使用 LUKA 平台。在使用本平台前，请仔细阅读以下条款...</p>', isPublished: true, sortOrder: 2 },
    { slug: 'privacy', category: 'SYSTEM', title: '隐私政策', content: '<p>LUKA 非常重视用户隐私。本政策说明我们如何收集、使用、保护您的信息...</p>', isPublished: true, sortOrder: 3 },
    { slug: 'contact', category: 'SYSTEM', title: '联系我们', content: '<p>如需帮助，请通过以下方式联系我们：</p><p>邮箱：support@luka.game</p>', isPublished: true, sortOrder: 4 },
  ];
  for (const a of articles) {
    await prisma.article.upsert({ where: { slug: a.slug }, update: {}, create: a });
  }

  console.log('✅ 数据初始化完成');
  console.log('管理员: admin / admin123');
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
