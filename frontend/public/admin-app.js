const { createApp, ref, computed } = Vue;
const API_URL = 'https://luka-1i4g.onrender.com';

createApp({
  setup() {
    const isLoggedIn = ref(false);
    const adminUsername = ref('admin');
    const password = ref('');
    const adminInfo = ref(null);
    const activeTab = ref('users');
    const stats = ref({ userCount: 0, cardCount: 0, boxCount: 0, orderCount: 0, openTicketCount: 0, totalRevenue: 0 });

    const users = ref([]);
    const cards = ref([]);
    const boxes = ref([]);
    const rechargeOptions = ref([]);
    const orders = ref([]);
    const banners = ref([]);
    const tasks = ref([]);
    const redeemCodes = ref([]);
    const tickets = ref([]);
    const admins = ref([]);
    const notifications = ref([]);

    const newCard = ref({ name: '', rarity: 'R', imageUrl: '' });
    const newBox = ref({ name: '', price: 300, coverUrl: '' });
    const newRecharge = ref({ coins: 300, bonus: 0, price: 3000, sortOrder: 0 });
    const newBanner = ref({ imageUrl: '', link: '', title: '', sortOrder: 0 });
    const newTask = ref({ title: '', description: '', action: 'DRAW', targetCount: 1, rewardCoins: 100, sortOrder: 0 });
    const newCode = ref({ code: '', coins: 100, maxUses: 1 });
    const batchCode = ref({ count: 10, prefix: 'LUKA' });
    const newAdmin = ref({ username: '', password: '', role: 'operator' });
    const newNotification = ref({ userId: '', title: '', content: '' });
    const ticketReplies = ref({});

    const showEditUserModal = ref(false);
    const editUserForm = ref({ id: '', username: '', password: '', coins: 0, tags: '', remark: '' });
    const showEditCardModal = ref(false);
    const editCardForm = ref({ id: '', name: '', rarity: 'R', imageUrl: '' });
    const showProbabilityModal = ref(false);
    const currentBox = ref(null);
    const newItemCardId = ref('');
    const newItemWeight = ref(10);

    const headers = () => ({
      'x-admin-username': adminInfo.value?.username || '',
      'x-admin-password': password.value
    });

    const login = async () => {
      try {
        const res = await axios.post(`${API_URL}/api/admin/login`, {
          username: adminUsername.value,
          password: password.value
        });
        adminInfo.value = res.data.admin;
        isLoggedIn.value = true;
        fetchData();
      } catch (e) { alert(e.response?.data?.error || '登录失败'); }
    };

    const logout = () => { isLoggedIn.value = false; password.value = ''; adminInfo.value = null; };

    const fetchData = async () => {
      const h = headers();
      const [s, u, c, b, r, o, bn, tk, rc, tp, nt] = await Promise.all([
        axios.get(`${API_URL}/api/admin/stats`, { headers: h }),
        axios.get(`${API_URL}/api/admin/users`, { headers: h }),
        axios.get(`${API_URL}/api/admin/cards`, { headers: h }),
        axios.get(`${API_URL}/api/admin/boxes`, { headers: h }),
        axios.get(`${API_URL}/api/admin/recharge-options`, { headers: h }),
        axios.get(`${API_URL}/api/admin/orders`, { headers: h }),
        axios.get(`${API_URL}/api/admin/banners`, { headers: h }),
        axios.get(`${API_URL}/api/admin/tasks`, { headers: h }),
        axios.get(`${API_URL}/api/admin/redeem-codes`, { headers: h }),
        axios.get(`${API_URL}/api/admin/tickets`, { headers: h }),
        axios.get(`${API_URL}/api/admin/notifications`, { headers: h })
      ]);
      stats.value = s.data;
      users.value = u.data;
      cards.value = c.data;
      boxes.value = b.data;
      rechargeOptions.value = r.data;
      orders.value = o.data;
      banners.value = bn.data;
      tasks.value = tk.data;
      redeemCodes.value = rc.data;
      tickets.value = tp.data;
      notifications.value = nt.data;
      if (adminInfo.value?.role === 'super') {
        const a = await axios.get(`${API_URL}/api/admin/admins`, { headers: h });
        admins.value = a.data;
      }
    };

    const formatDate = (dateStr) => {
      if (!dateStr) return '-';
      const d = new Date(dateStr);
      return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
    };

    const tabClass = (tab) => ['px-4 py-2 rounded-lg text-sm font-bold transition',
      activeTab.value === tab ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'];

    // 用户
    const openEditUser = (u) => {
      editUserForm.value = { id: u.id, username: u.username, password: '', coins: u.coins, tags: u.tags || '', remark: u.remark || '' };
      showEditUserModal.value = true;
    };
    const saveUser = async () => {
      try {
        await axios.put(`${API_URL}/api/admin/users/${editUserForm.value.id}`, editUserForm.value, { headers: headers() });
        showEditUserModal.value = false;
        fetchData();
      } catch (e) { alert('保存失败: ' + (e.response?.data?.error || e.message)); }
    };
    const deleteUser = async (id) => {
      if (confirm('确定要彻底删除该用户吗？此操作不可恢复！')) {
        try {
          await axios.delete(`${API_URL}/api/admin/users/${id}`, { headers: headers() });
          fetchData();
        } catch (e) { alert('删除失败: ' + (e.response?.data?.error || e.message)); }
      }
    };

    // 卡牌
    const addCard = async () => {
      if (!newCard.value.name) return alert('请输入卡牌名称');
      try {
        await axios.post(`${API_URL}/api/admin/cards`, newCard.value, { headers: headers() });
        newCard.value = { name: '', rarity: 'R', imageUrl: '' };
        fetchData();
      } catch (e) { alert('添加失败: ' + (e.response?.data?.error || e.message)); }
    };
    const openEditCard = (c) => {
      editCardForm.value = { id: c.id, name: c.name, rarity: c.rarity, imageUrl: c.imageUrl || '' };
      showEditCardModal.value = true;
    };
    const saveCard = async () => {
      try {
        await axios.put(`${API_URL}/api/admin/cards/${editCardForm.value.id}`, editCardForm.value, { headers: headers() });
        showEditCardModal.value = false;
        fetchData();
      } catch (e) { alert('保存失败: ' + (e.response?.data?.error || e.message)); }
    };
    const deleteCard = async (id) => {
      if (confirm('确定要删除这张卡牌吗？')) {
        try {
          await axios.delete(`${API_URL}/api/admin/cards/${id}`, { headers: headers() });
          fetchData();
        } catch (e) { alert('删除失败: ' + (e.response?.data?.error || e.message)); }
      }
    };

    // 盲盒
    const addBox = async () => {
      if (!newBox.value.name || !newBox.value.price) return alert('请填写名称和价格');
      try {
        await axios.post(`${API_URL}/api/admin/boxes`, newBox.value, { headers: headers() });
        newBox.value = { name: '', price: 300, coverUrl: '' };
        fetchData();
      } catch (e) { alert('添加失败: ' + (e.response?.data?.error || e.message)); }
    };
    const toggleBoxStatus = async (box) => {
      await axios.put(`${API_URL}/api/admin/boxes/${box.id}`, { isActive: !box.isActive }, { headers: headers() });
      fetchData();
    };
    const deleteBox = async (id) => {
      if (confirm('确定要删除这个盲盒吗？所有概率配置会一并删除！')) {
        try {
          await axios.delete(`${API_URL}/api/admin/boxes/${id}`, { headers: headers() });
          fetchData();
        } catch (e) { alert('删除失败: ' + (e.response?.data?.error || e.message)); }
      }
    };

    // 概率配置
    const openProbabilityModal = (box) => {
      currentBox.value = JSON.parse(JSON.stringify(box));
      newItemCardId.value = '';
      newItemWeight.value = 10;
      showProbabilityModal.value = true;
    };
    const closeProbabilityModal = () => {
      showProbabilityModal.value = false;
      currentBox.value = null;
      fetchData();
    };
    const availableCards = computed(() => {
      if (!currentBox.value) return [];
      const existingIds = currentBox.value.items.map(i => i.card.id);
      return cards.value.filter(c => !existingIds.includes(c.id));
    });
    const totalWeight = computed(() => {
      if (!currentBox.value) return 0;
      return currentBox.value.items.reduce((sum, i) => sum + (i.weight || 0), 0);
    });
    const calculateProbability = (item) => {
      if (!totalWeight.value || !item.weight) return '0.00';
      return ((item.weight / totalWeight.value) * 100).toFixed(2);
    };
    const getProbabilityColor = (item) => {
      const p = parseFloat(calculateProbability(item));
      if (p >= 50) return 'text-green-400';
      if (p >= 10) return 'text-yellow-400';
      return 'text-red-400';
    };
    const updateItemWeight = async (item) => {
      if (item.weight < 1) item.weight = 1;
      await axios.post(`${API_URL}/api/admin/boxes/${currentBox.value.id}/items`, { cardId: item.card.id, weight: item.weight }, { headers: headers() });
    };
    const removeItem = async (itemId) => {
      if (confirm('确定要移除该卡牌吗？')) {
        await axios.delete(`${API_URL}/api/admin/boxes/${currentBox.value.id}/items/${itemId}`, { headers: headers() });
        currentBox.value.items = currentBox.value.items.filter(i => i.id !== itemId);
      }
    };
    const addItemToBox = async () => {
      if (!newItemCardId.value) return alert('请选择卡牌');
      if (newItemWeight.value < 1) return alert('权重至少为 1');
      await axios.post(`${API_URL}/api/admin/boxes/${currentBox.value.id}/items`, { cardId: newItemCardId.value, weight: newItemWeight.value }, { headers: headers() });
      const res = await axios.get(`${API_URL}/api/admin/boxes`, { headers: headers() });
      currentBox.value = JSON.parse(JSON.stringify(res.data.find(b => b.id === currentBox.value.id)));
      newItemCardId.value = '';
      newItemWeight.value = 10;
    };

    // 充值
    const addRecharge = async () => {
      if (!newRecharge.value.coins || !newRecharge.value.price) return alert('请填写基础金币和价格');
      try {
        await axios.post(`${API_URL}/api/admin/recharge-options`, newRecharge.value, { headers: headers() });
        newRecharge.value = { coins: 300, bonus: 0, price: 3000, sortOrder: 0 };
        fetchData();
      } catch (e) { alert('添加失败: ' + (e.response?.data?.error || e.message)); }
    };
    const toggleRecharge = async (opt) => {
      await axios.put(`${API_URL}/api/admin/recharge-options/${opt.id}`, { isActive: !opt.isActive }, { headers: headers() });
      fetchData();
    };
    const deleteRecharge = async (id) => {
      if (confirm('确定要删除该充值套餐吗？')) {
        try {
          await axios.delete(`${API_URL}/api/admin/recharge-options/${id}`, { headers: headers() });
          fetchData();
        } catch (e) { alert('删除失败: ' + (e.response?.data?.error || e.message)); }
      }
    };

    // 订单
    const markOrderPaid = async (id) => {
      if (confirm('确认将该订单标记为已支付，并为用户增加金币？')) {
        try {
          await axios.put(`${API_URL}/api/admin/orders/${id}/paid`, {}, { headers: headers() });
          fetchData();
        } catch (e) { alert('操作失败: ' + (e.response?.data?.error || e.message)); }
      }
    };

    // 轮播图
    const addBanner = async () => {
      if (!newBanner.value.imageUrl) return alert('请填写图片 URL');
      try {
        await axios.post(`${API_URL}/api/admin/banners`, newBanner.value, { headers: headers() });
        newBanner.value = { imageUrl: '', link: '', title: '', sortOrder: 0 };
        fetchData();
      } catch (e) { alert('添加失败: ' + (e.response?.data?.error || e.message)); }
    };
    const toggleBanner = async (b) => {
      await axios.put(`${API_URL}/api/admin/banners/${b.id}`, { isActive: !b.isActive }, { headers: headers() });
      fetchData();
    };
    const deleteBanner = async (id) => {
      if (confirm('确定要删除这张轮播图吗？')) {
        try {
          await axios.delete(`${API_URL}/api/admin/banners/${id}`, { headers: headers() });
          fetchData();
        } catch (e) { alert('删除失败: ' + (e.response?.data?.error || e.message)); }
      }
    };

    // 任务
    const addTask = async () => {
      if (!newTask.value.title) return alert('请输入标题');
      await axios.post(`${API_URL}/api/admin/tasks`, newTask.value, { headers: headers() });
      newTask.value = { title: '', description: '', action: 'DRAW', targetCount: 1, rewardCoins: 100, sortOrder: 0 };
      fetchData();
    };
    const toggleTask = async (t) => {
      await axios.put(`${API_URL}/api/admin/tasks/${t.id}`, { isActive: !t.isActive }, { headers: headers() });
      fetchData();
    };
    const deleteTask = async (id) => {
      if (confirm('确定要删除该任务吗？')) {
        await axios.delete(`${API_URL}/api/admin/tasks/${id}`, { headers: headers() });
        fetchData();
      }
    };

    // 兑换码
    const addCode = async () => {
      if (!newCode.value.code) return alert('请输入兑换码');
      try {
        await axios.post(`${API_URL}/api/admin/redeem-codes`, newCode.value, { headers: headers() });
        newCode.value = { code: '', coins: 100, maxUses: 1 };
        fetchData();
      } catch (e) { alert(e.response?.data?.error || '添加失败'); }
    };
    const batchAddCodes = async () => {
      try {
        const res = await axios.post(`${API_URL}/api/admin/redeem-codes/batch`, batchCode.value, { headers: headers() });
        alert(`成功生成 ${res.data.codes.length} 个兑换码：\n${res.data.codes.join('\n')}`);
        fetchData();
      } catch (e) { alert('批量生成失败'); }
    };
    const deleteCode = async (id) => {
      if (confirm('确定要删除该兑换码吗？')) {
        await axios.delete(`${API_URL}/api/admin/redeem-codes/${id}`, { headers: headers() });
        fetchData();
      }
    };

    // 工单
    const replyTicket = async (id) => {
      const content = ticketReplies.value[id];
      if (!content) return alert('请输入回复内容');
      await axios.post(`${API_URL}/api/admin/tickets/${id}/reply`, { content }, { headers: headers() });
      ticketReplies.value[id] = '';
      fetchData();
    };
    const closeTicket = async (id) => {
      if (confirm('确定关闭该工单吗？')) {
        await axios.put(`${API_URL}/api/admin/tickets/${id}/close`, {}, { headers: headers() });
        fetchData();
      }
    };
    const deleteTicket = async (id) => {
      if (confirm('确定删除该工单吗？')) {
        await axios.delete(`${API_URL}/api/admin/tickets/${id}`, { headers: headers() });
        fetchData();
      }
    };

    // 管理员
    const addAdmin = async () => {
      if (!newAdmin.value.username || !newAdmin.value.password) return alert('请填写用户名和密码');
      try {
        await axios.post(`${API_URL}/api/admin/admins`, newAdmin.value, { headers: headers() });
        newAdmin.value = { username: '', password: '', role: 'operator' };
        fetchData();
      } catch (e) { alert(e.response?.data?.error || '添加失败'); }
    };
    const deleteAdmin = async (id) => {
      if (confirm('确定要删除该管理员吗？')) {
        try {
          await axios.delete(`${API_URL}/api/admin/admins/${id}`, { headers: headers() });
          fetchData();
        } catch (e) { alert(e.response?.data?.error || '删除失败'); }
      }
    };

    // 通知（新增）
    const addNotification = async () => {
      if (!newNotification.value.title || !newNotification.value.content) return alert('请填写标题和内容');
      try {
        await axios.post(`${API_URL}/api/admin/notifications`, newNotification.value, { headers: headers() });
        newNotification.value = { userId: '', title: '', content: '' };
        fetchData();
      } catch (e) { alert(e.response?.data?.error || '发布失败'); }
    };
    const deleteNotification = async (id) => {
      if (confirm('确定要删除该通知吗？')) {
        await axios.delete(`${API_URL}/api/admin/notifications/${id}`, { headers: headers() });
        fetchData();
      }
    };

    return {
      isLoggedIn, adminUsername, password, adminInfo, activeTab, stats,
      users, cards, boxes, rechargeOptions, orders, banners, tasks, redeemCodes, tickets, admins, notifications,
      newCard, newBox, newRecharge, newBanner, newTask, newCode, batchCode, newAdmin, newNotification, ticketReplies,
      showEditUserModal, editUserForm, showEditCardModal, editCardForm,
      showProbabilityModal, currentBox, newItemCardId, newItemWeight,
      availableCards, totalWeight,
      login, logout, formatDate, tabClass,
      openEditUser, saveUser, deleteUser,
      addCard, openEditCard, saveCard, deleteCard,
      addBox, toggleBoxStatus, deleteBox,
      openProbabilityModal, closeProbabilityModal, calculateProbability, getProbabilityColor, updateItemWeight, removeItem, addItemToBox,
      addRecharge, toggleRecharge, deleteRecharge,
      markOrderPaid,
      addBanner, toggleBanner, deleteBanner,
      addTask, toggleTask, deleteTask,
      addCode, batchAddCodes, deleteCode,
      replyTicket, closeTicket, deleteTicket,
      addAdmin, deleteAdmin,
      addNotification, deleteNotification
    };
  }
}).mount('#app');
