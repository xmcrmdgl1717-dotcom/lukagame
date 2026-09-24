import React, { useState } from 'react';
import { useTable, useCreate, useUpdate, useDelete } from '@refinedev/core';
import axios from 'axios';
import { useSensitiveConfirm } from '../../components/SensitiveConfirm';

interface BoxItem {
  id: string;
  name: string;
  price: number;
  coverUrl: string;
  description: string;
  isActive: boolean;
  isFeatured: boolean;
  allowTransfer: boolean;
  gameId: string | null;
  game: { id: string; displayName: string } | null;
  items: Array<{
    id: string;
    weight: number;
    card: { id: string; name: string; rarity: string; imageUrl: string };
  }>;
}

interface CardItem { id: string; name: string; rarity: string; imageUrl: string; }

const API_URL = import.meta.env.VITE_API_URL || 'https://luka-1i4g.onrender.com';

const hdr = () => {
  const a = JSON.parse(localStorage.getItem('adminInfo') || 'null');
  return {
    'x-admin-username': a?.username || '',
    'x-admin-password': localStorage.getItem('adminPassword') || '',
    'Content-Type': 'application/json',
  };
};

const readAsBase64 = (f: File): Promise<string> =>
  new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = rej;
    r.readAsDataURL(f);
  });

const emptyForm = {
  name: '',
  price: 300,
  coverUrl: '',
  description: '',
  gameId: '',
  isFeatured: false,
  allowTransfer: false,
};

export default function BoxList() {
  const { tableQueryResult } = useTable<BoxItem>({ resource: 'boxes', pagination: { pageSize: 100 } });
  const { tableQueryResult: cardsQ } = useTable<CardItem>({ resource: 'cards', pagination: { pageSize: 500 } });
  const { tableQueryResult: gamesQ } = useTable<{ id: string; displayName: string }>({ resource: 'games', pagination: { pageSize: 100 } });
  const { mutate: createBox } = useCreate();
  const { mutate: updateBox } = useUpdate();
  const { mutate: deleteBox } = useDelete();
  const { confirm } = useSensitiveConfirm();

  const all = tableQueryResult.data?.data || [];
  const allCards = cardsQ.data?.data || [];
  const allGames = gamesQ.data?.data || [];

  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [form, setForm] = useState<any>({ ...emptyForm });
  const [saving, setSaving] = useState(false);

  // 概率配置相关
  const [showProb, setShowProb] = useState(false);
  const [curBox, setCurBox] = useState<BoxItem | null>(null);
  const [itemCard, setItemCard] = useState('');
  const [itemWeight, setItemWeight] = useState(10);

  const openCreate = () => {
    setModalMode('create');
    setForm({ ...emptyForm });
    setShowModal(true);
  };

  const openEdit = (b: BoxItem) => {
    setModalMode('edit');
    setForm({
      id: b.id,
      name: b.name,
      price: b.price,
      coverUrl: b.coverUrl,
      description: b.description || '',
      gameId: b.gameId || '',
      isFeatured: b.isFeatured,
      allowTransfer: b.allowTransfer,
      isActive: b.isActive,
    });
    setShowModal(true);
  };

  const handleCover = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 2 * 1024 * 1024) return alert('图片不能超过 2MB');
    const img = await readAsBase64(f);
    setForm((x: any) => ({ ...x, coverUrl: img }));
  };

  const handleSubmit = () => {
    if (!form.name || !form.name.trim()) return alert('请填写盲盒名称');
    if (!form.price || form.price <= 0) return alert('请填写有效价格');

    setSaving(true);
    const payload: any = {
      name: form.name.trim(),
      price: parseInt(form.price),
      coverUrl: form.coverUrl || '',
      description: form.description || '',
      gameId: form.gameId || null,
      isFeatured: !!form.isFeatured,
      allowTransfer: !!form.allowTransfer,
    };
    if (modalMode === 'edit') payload.isActive = form.isActive;

    const onSuccess = () => {
      setShowModal(false);
      setSaving(false);
      tableQueryResult.refetch();
    };
    const onError = (e: any) => {
      alert('保存失败: ' + (e?.message || '未知错误'));
      setSaving(false);
    };

    if (modalMode === 'create') {
      createBox({ resource: 'boxes', values: payload }, { onSuccess, onError });
    } else {
      updateBox({ resource: 'boxes', id: form.id, values: payload }, { onSuccess, onError });
    }
  };

  const toggle = (b: BoxItem) => {
    updateBox(
      { resource: 'boxes', id: b.id, values: { isActive: !b.isActive } },
      { onSuccess: () => tableQueryResult.refetch() }
    );
  };

  const toggleFeatured = (b: BoxItem) => {
    updateBox(
      { resource: 'boxes', id: b.id, values: { isFeatured: !b.isFeatured } },
      { onSuccess: () => tableQueryResult.refetch() }
    );
  };

  const toggleTransfer = (b: BoxItem) => {
    updateBox(
      { resource: 'boxes', id: b.id, values: { allowTransfer: !b.allowTransfer } },
      { onSuccess: () => tableQueryResult.refetch() }
    );
  };

  const handleDelete = async (b: BoxItem) => {
    const ok = await confirm(`删除盲盒「${b.name}」？概率配置会一并删除！`);
    if (!ok) return;
    deleteBox({ resource: 'boxes', id: b.id }, {
      onSuccess: () => tableQueryResult.refetch(),
    });
  };

  const openProb = (b: BoxItem) => {
    setCurBox(JSON.parse(JSON.stringify(b)));
    setItemCard('');
    setItemWeight(10);
    setShowProb(true);
  };

  const closeProb = () => {
    setShowProb(false);
    setCurBox(null);
    tableQueryResult.refetch();
  };

  const calcP = (it: any) => {
    if (!curBox) return '0.00';
    const t = curBox.items.reduce((s, i) => s + (i.weight || 0), 0);
    return t ? ((it.weight / t) * 100).toFixed(2) : '0.00';
  };

  const pColor = (it: any) => {
    const p = parseFloat(calcP(it));
    return p >= 50 ? 'text-green-400' : p >= 10 ? 'text-yellow-400' : 'text-red-400';
  };

  const updateWeight = async (it: any) => {
    if (!curBox) return;
    if (it.weight < 1) it.weight = 1;
    const ok = await confirm(`将「${it.card.name}」权重改为 ${it.weight}？`);
    if (!ok) return;
    try {
      await axios.post(
        `${API_URL}/api/admin/boxes/${curBox.id}/items`,
        { cardId: it.card.id, weight: it.weight },
        { headers: hdr() }
      );
    } catch (e: any) {
      alert('权重更新失败: ' + (e.response?.data?.error || e.message));
    }
  };

  const removeItem = async (id: string) => {
    if (!curBox) return;
    const ok = await confirm('从盲盒移除该卡牌？');
    if (!ok) return;
    try {
      await axios.delete(
        `${API_URL}/api/admin/boxes/${curBox.id}/items/${id}`,
        { headers: hdr() }
      );
      setCurBox((p: any) => ({ ...p, items: p.items.filter((i: any) => i.id !== id) }));
    } catch (e: any) {
      alert('移除失败: ' + (e.response?.data?.error || e.message));
    }
  };

  const addItem = async () => {
    if (!curBox) return;
    if (!itemCard) return alert('请选择卡牌');
    try {
      await axios.post(
        `${API_URL}/api/admin/boxes/${curBox.id}/items`,
        { cardId: itemCard, weight: itemWeight },
        { headers: hdr() }
      );
      const res = await axios.get(`${API_URL}/api/admin/boxes`, { headers: hdr() });
      const found = res.data.find((b: any) => b.id === curBox.id);
      if (found) setCurBox(JSON.parse(JSON.stringify(found)));
      setItemCard('');
      setItemWeight(10);
    } catch (e: any) {
      alert('添加失败: ' + (e.response?.data?.error || e.message));
    }
  };

  const avail = curBox ? allCards.filter((c) => !curBox.items.some((i) => i.card.id === c.id)) : [];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">盲盒管理</h1>
          <div className="text-sm text-gray-500 mt-1">共 {all.length} 个盲盒</div>
        </div>
        <button
          onClick={openCreate}
          className="bg-green-600 hover:bg-green-700 text-white text-sm px-4 py-2 rounded font-bold"
        >
          + 新建盲盒
        </button>
      </div>

      {tableQueryResult.isLoading ? (
        <div className="text-center text-gray-500 py-20">加载中...</div>
      ) : tableQueryResult.isError ? (
        <div className="text-center text-red-500 py-20">加载失败，请刷新重试</div>
      ) : (
        <div className="space-y-3">
          {all.map((b) => (
            <div key={b.id} className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-4">
              <div className="flex justify-between items-center flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  {b.coverUrl && <img src={b.coverUrl} className="w-12 h-16 object-cover rounded" />}
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold">{b.name}</span>
                      {!b.isActive && <span className="text-xs bg-red-900/60 text-red-200 px-2 py-0.5 rounded">已下架</span>}
                      {b.isFeatured && <span className="text-xs bg-yellow-600 text-white px-2 py-0.5 rounded">⭐推荐</span>}
                      {b.allowTransfer && <span className="text-xs bg-purple-600 text-white px-2 py-0.5 rounded">可赠送</span>}
                    </div>
                    <div className="text-yellow-500 text-sm mt-1">价格: {b.price} 🪙</div>
                    {b.description && (
                      <div className="text-gray-400 text-xs mt-1 max-w-md truncate" title={b.description}>
                        {b.description}
                      </div>
                    )}
                    <div className="text-gray-500 text-xs mt-1">
                      归属游戏: {b.game?.displayName || '无'} · 包含 {b.items?.length || 0} 种卡牌
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <button onClick={() => openEdit(b)} className="bg-blue-600 text-white text-xs px-3 py-1.5 rounded">编辑</button>
                  <button onClick={() => openProb(b)} className="bg-purple-600 text-white text-xs px-3 py-1.5 rounded font-bold">概率配置</button>
                  <button onClick={() => toggleFeatured(b)} className="bg-yellow-600 hover:bg-yellow-700 text-white text-xs px-3 py-1.5 rounded">
                    {b.isFeatured ? '取消推荐' : '⭐ 推荐'}
                  </button>
                  <button onClick={() => toggleTransfer(b)} className="bg-pink-600 hover:bg-pink-700 text-white text-xs px-3 py-1.5 rounded">
                    {b.allowTransfer ? '禁止转让' : '允许转让'}
                  </button>
                  <button onClick={() => toggle(b)} className="bg-orange-600 text-white text-xs px-3 py-1.5 rounded">{b.isActive ? '下架' : '上架'}</button>
                  <button onClick={() => handleDelete(b)} className="bg-red-600 text-white text-xs px-3 py-1.5 rounded">删除</button>
                </div>
              </div>
            </div>
          ))}
          {all.length === 0 && <div className="text-center text-gray-500 py-10">暂无盲盒</div>}
        </div>
      )}

      {/* 新建/编辑弹窗 */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#161616] rounded-xl border border-[#2a2a2a] p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4">
              {modalMode === 'create' ? '📦 新建盲盒' : `📦 编辑盲盒: ${form.name}`}
            </h3>

            <div className="space-y-3 text-sm">
              <div>
                <label className="block text-gray-400 mb-1 text-xs">
                  盲盒名称 <span className="text-red-500">*</span>
                </label>
                <input
                  value={form.name || ''}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="如：天堂与地狱"
                  className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-400 mb-1 text-xs">
                    价格（金币） <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={form.price ?? 0}
                    onChange={(e) => setForm({ ...form, price: parseInt(e.target.value) || 0 })}
                    className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 mb-1 text-xs">归属游戏（可选）</label>
                  <select
                    value={form.gameId || ''}
                    onChange={(e) => setForm({ ...form, gameId: e.target.value })}
                    className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white"
                  >
                    <option value="">-- 无归属 --</option>
                    {allGames.map(g => <option key={g.id} value={g.id}>{g.displayName}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-gray-400 mb-1 text-xs">封面图</label>
                <label className="cursor-pointer inline-block bg-[#2a2a2a] hover:bg-[#3a3a3a] text-xs px-3 py-1.5 rounded text-white">
                  选择封面
                  <input type="file" accept="image/*" onChange={handleCover} className="hidden" />
                </label>
                {form.coverUrl && (
                  <div className="mt-2 relative inline-block">
                    <img src={form.coverUrl} className="h-32 rounded border border-[#2a2a2a]" />
                    <button
                      onClick={() => setForm({ ...form, coverUrl: '' })}
                      className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-6 h-6 text-xs"
                    >×</button>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-gray-400 mb-1 text-xs">盲盒说明</label>
                <textarea
                  rows={3}
                  value={form.description || ''}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="比如：经典宝可梦系列，内含 10 种卡牌……（用户在盲盒详情页可看到）"
                  className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white text-xs"
                  maxLength={500}
                />
                <div className="text-[10px] text-gray-600 mt-1 text-right">
                  {(form.description || '').length} / 500
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="flex items-center gap-2 text-xs cursor-pointer bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg p-3">
                  <input
                    type="checkbox"
                    checked={!!form.isFeatured}
                    onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })}
                  />
                  <span>⭐ 推荐到首页</span>
                </label>
                <label className="flex items-center gap-2 text-xs cursor-pointer bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg p-3">
                  <input
                    type="checkbox"
                    checked={!!form.allowTransfer}
                    onChange={(e) => setForm({ ...form, allowTransfer: e.target.checked })}
                  />
                  <span>🎁 允许转让</span>
                </label>
              </div>

              {modalMode === 'edit' && (
                <label className="flex items-center gap-2 text-xs cursor-pointer bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg p-3">
                  <input
                    type="checkbox"
                    checked={!!form.isActive}
                    onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  />
                  <span>上架（用户可见）</span>
                </label>
              )}

              <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-lg p-2.5 text-[10px] text-yellow-200 leading-relaxed">
                ⚠️ 开启「允许转让」后，用户可以在库存页面将此盲盒抽到的、且卡牌本身也允许转让的卡牌赠送给其他用户。
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-[#2a2a2a] rounded text-sm"
              >
                取消
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm font-bold disabled:opacity-50"
              >
                {saving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 概率配置弹窗 */}
      {showProb && curBox && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#161616] rounded-xl border border-[#2a2a2a] p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4">概率配置 - {curBox.name}</h3>
            <div className="space-y-2 mb-4">
              {(curBox.items || []).map((it) => (
                <div key={it.id} className="flex items-center gap-3 bg-[#0d0d0d] p-2 rounded">
                  {it.card?.imageUrl ? <img src={it.card.imageUrl} className="w-6 h-8 object-cover rounded" /> : <span className="text-xl">🃏</span>}
                  <div className="flex-1 text-sm">{it.card?.name || '未知'}</div>
                  <span className={`text-xs font-bold ${it.card?.rarity === 'SSR' ? 'text-yellow-400' : it.card?.rarity === 'SR' ? 'text-purple-400' : 'text-blue-400'}`}>{it.card?.rarity}</span>
                  <input type="number" value={it.weight} onChange={(e) => setCurBox((p: any) => ({ ...p, items: p.items.map((i: any) => i.id === it.id ? { ...i, weight: parseInt(e.target.value) || 1 } : i) }))} onBlur={() => updateWeight(it)} className="w-20 bg-[#1a1a1a] border border-[#2a2a2a] rounded px-2 py-1 text-xs text-white" />
                  <div className={`text-xs font-bold w-16 text-right ${pColor(it)}`}>{calcP(it)}%</div>
                  <button onClick={() => removeItem(it.id)} className="bg-red-600 text-white text-xs px-2 py-1 rounded">移除</button>
                </div>
              ))}
              {(curBox.items || []).length === 0 && <div className="text-gray-500 text-sm text-center py-4">尚未添加卡牌</div>}
            </div>
            <div className="border-t border-[#2a2a2a] pt-4 flex gap-2">
              <select value={itemCard} onChange={(e) => setItemCard(e.target.value)} className="flex-1 bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-sm text-white">
                <option value="">-- 选择卡牌 --</option>
                {avail.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.rarity})</option>)}
              </select>
              <input type="number" value={itemWeight} onChange={(e) => setItemWeight(parseInt(e.target.value) || 1)} className="w-24 bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-sm text-white" />
              <button onClick={addItem} className="bg-green-600 text-white text-sm px-4 py-2 rounded font-bold">添加</button>
            </div>
            <div className="flex justify-end mt-6">
              <button onClick={closeProb} className="px-4 py-2 bg-blue-600 rounded text-sm font-bold">完成</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
