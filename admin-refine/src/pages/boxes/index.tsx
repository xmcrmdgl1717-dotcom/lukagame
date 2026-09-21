import React, { useState } from 'react';
import { useTable, useCreate, useUpdate, useDelete, useCustom } from '@refinedev/core';
import { useSensitiveConfirm } from '../../components/SensitiveConfirm';
import SearchBar from '../../components/SearchBar';
import { useSearch } from '../../hooks/useSearch';

interface BoxItem {
  id: string; name: string; price: number; coverUrl: string; isActive: boolean;
  items: Array<{ id: string; weight: number; card: { id: string; name: string; rarity: string; imageUrl: string } }>;
}
interface CardItem { id: string; name: string; rarity: string; imageUrl: string; }

const API_URL = import.meta.env.VITE_API_URL || 'https://luka-1i4g.onrender.com';

const readAsBase64 = (f: File): Promise<string> =>
  new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result as string); r.onerror = rej; r.readAsDataURL(f); });

const SEARCH_FIELDS = [
  { key: 'name', label: '盲盒名称', type: 'text' as const },
  { key: 'price', label: '价格', type: 'number-range' as const },
  { key: 'isActive', label: '状态', type: 'select' as const, options: [
    { value: 'true', label: '上架' }, { value: 'false', label: '下架' },
  ]},
  { key: 'createdAt', label: '创建时间', type: 'date-range' as const },
];

export default function BoxList() {
  const { tableQueryResult } = useTable<BoxItem>({ resource: 'boxes', pagination: { pageSize: 100 } });
  const { tableQueryResult: cardsQ } = useTable<CardItem>({ resource: 'cards', pagination: { pageSize: 500 } });
  const { mutate: createBox } = useCreate();
  const { mutate: updateBox } = useUpdate();
  const { mutate: deleteBox } = useDelete();
  const { mutate: custom } = useCustom();
  const { confirm } = useSensitiveConfirm();

  const all = tableQueryResult.data?.data || [];
  const allCards = cardsQ.data?.data || [];
  const { filters, setFilters, filtered, reset } = useSearch(all, SEARCH_FIELDS);

  const [newBox, setNewBox] = useState({ name: '', price: 300, coverUrl: '' });
  const [creating, setCreating] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [showProb, setShowProb] = useState(false);
  const [curBox, setCurBox] = useState<BoxItem | null>(null);
  const [itemCard, setItemCard] = useState('');
  const [itemWeight, setItemWeight] = useState(10);

  const onCoverNew = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    setNewBox((b) => ({ ...b, coverUrl: await readAsBase64(f) }));
  };
  const onCoverEdit = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    setEditForm((b: any) => ({ ...b, coverUrl: await readAsBase64(f) }));
  };

  const handleCreate = () => {
    if (!newBox.name) return alert('请输入名称');
    setCreating(true);
    createBox({ resource: 'boxes', values: newBox }, {
      onSuccess: () => { setNewBox({ name: '', price: 300, coverUrl: '' }); setCreating(false); tableQueryResult.refetch(); },
      onError: () => setCreating(false),
    });
  };

  const handleSave = () => {
    setSaving(true);
    updateBox({ resource: 'boxes', id: editForm.id, values: { name: editForm.name, price: editForm.price, coverUrl: editForm.coverUrl } }, {
      onSuccess: () => { setShowEdit(false); setSaving(false); tableQueryResult.refetch(); },
      onError: () => setSaving(false),
    });
  };

  const toggle = (b: BoxItem) => updateBox({ resource: 'boxes', id: b.id, values: { isActive: !b.isActive } }, { onSuccess: () => tableQueryResult.refetch() });

  const handleDelete = async (b: BoxItem) => {
    const ok = await confirm(`删除盲盒「${b.name}」？概率配置会一并删除！`);
    if (!ok) return;
    deleteBox({ resource: 'boxes', id: b.id }, { onSuccess: () => tableQueryResult.refetch() });
  };

  const openProb = (b: BoxItem) => { setCurBox(JSON.parse(JSON.stringify(b))); setItemCard(''); setItemWeight(10); setShowProb(true); };
  const closeProb = () => { setShowProb(false); setCurBox(null); tableQueryResult.refetch(); };
  const calcP = (it: any) => { if (!curBox) return '0.00'; const t = curBox.items.reduce((s, i) => s + (i.weight || 0), 0); return t ? ((it.weight / t) * 100).toFixed(2) : '0.00'; };
  const pColor = (it: any) => { const p = parseFloat(calcP(it)); return p >= 50 ? 'text-green-400' : p >= 10 ? 'text-yellow-400' : 'text-red-400'; };

  const updateWeight = async (it: any) => {
    if (it.weight < 1) it.weight = 1;
    const ok = await confirm(`将「${it.card.name}」权重改为 ${it.weight}？`);
    if (!ok) return;
    custom({ url: `/api/admin/boxes/${curBox!.id}/items`, method: 'post', payload: { cardId: it.card.id, weight: it.weight } }, {});
  };

  const removeItem = async (id: string) => {
    const ok = await confirm('从盲盒移除该卡牌？');
    if (!ok) return;
    custom({ url: `/api/admin/boxes/${curBox!.id}/items/${id}`, method: 'delete' }, {
      onSuccess: () => setCurBox((p: any) => ({ ...p, items: p.items.filter((i: any) => i.id !== id) })),
    });
  };

  const addItem = () => {
    if (!itemCard) return alert('请选择卡牌');
    custom({ url: `/api/admin/boxes/${curBox!.id}/items`, method: 'post', payload: { cardId: itemCard, weight: itemWeight } }, {
      onSuccess: async () => {
        const adminInfo = JSON.parse(localStorage.getItem('adminInfo') || 'null');
        const pwd = localStorage.getItem('adminPassword') || '';
        const res = await fetch(`${API_URL}/api/admin/boxes`, { headers: { 'x-admin-username': adminInfo?.username || '', 'x-admin-password': pwd } });
        const data = await res.json();
        setCurBox(JSON.parse(JSON.stringify(data.find((b: any) => b.id === curBox!.id))));
        setItemCard(''); setItemWeight(10);
      },
    });
  };

  const avail = curBox ? allCards.filter((c) => !curBox.items.some((i) => i.card.id === c.id)) : [];

  return (
    <div>
      <div className="flex justify-between items-center mb-6"><h1 className="text-2xl font-bold">盲盒管理</h1></div>

      <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-4 mb-4">
        <div className="text-sm font-bold mb-3">新增盲盒</div>
        <div className="flex flex-wrap gap-2 items-center">
          <input value={newBox.name} onChange={(e) => setNewBox({ ...newBox, name: e.target.value })} placeholder="名称" className="bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-1.5 text-sm w-40 text-white" />
          <input type="number" value={newBox.price} onChange={(e) => setNewBox({ ...newBox, price: parseInt(e.target.value) || 0 })} placeholder="价格" className="bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-1.5 text-sm w-24 text-white" />
          <label className="cursor-pointer bg-[#2a2a2a] text-xs px-3 py-2 rounded text-white">选择封面<input type="file" accept="image/*" onChange={onCoverNew} className="hidden" /></label>
          {newBox.coverUrl && <img src={newBox.coverUrl} className="w-10 h-14 object-cover rounded" />}
          <button onClick={handleCreate} disabled={creating} className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm px-4 py-1.5 rounded font-bold">{creating ? '添加中...' : '+ 添加'}</button>
        </div>
      </div>

      <SearchBar fields={SEARCH_FIELDS} filters={filters} setFilters={setFilters} onReset={reset} total={all.length} filtered={filtered.length} />

      <div className="space-y-3">
        {filtered.map((b) => (
          <div key={b.id} className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-4">
            <div className="flex justify-between items-center flex-wrap gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold">{b.name}</span>
                  {!b.isActive && <span className="text-xs bg-red-900/60 text-red-200 px-2 py-0.5 rounded">已下架</span>}
                </div>
                <div className="text-yellow-500 text-sm mt-1">价格: {b.price} 🪙</div>
                <div className="text-gray-500 text-xs mt-1">包含 {b.items.length} 种卡牌</div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setEditForm({ ...b }); setShowEdit(true); }} className="bg-blue-600 text-white text-xs px-3 py-1.5 rounded">编辑</button>
                <button onClick={() => openProb(b)} className="bg-purple-600 text-white text-xs px-3 py-1.5 rounded font-bold">概率配置</button>
                <button onClick={() => toggle(b)} className="bg-orange-600 text-white text-xs px-3 py-1.5 rounded">{b.isActive ? '下架' : '上架'}</button>
                <button onClick={() => handleDelete(b)} className="bg-red-600 text-white text-xs px-3 py-1.5 rounded">删除</button>
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && <div className="text-center text-gray-500 py-10">无匹配结果</div>}
      </div>

      {showEdit && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#161616] rounded-xl border border-[#2a2a2a] p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">编辑盲盒</h3>
            <div className="space-y-3 text-sm">
              <div><label className="block text-gray-400 mb-1 text-xs">名称</label><input value={editForm.name || ''} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white" /></div>
              <div><label className="block text-gray-400 mb-1 text-xs">价格</label><input type="number" value={editForm.price ?? 0} onChange={(e) => setEditForm({ ...editForm, price: parseInt(e.target.value) || 0 })} className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white" /></div>
              <div><label className="block text-gray-400 mb-1 text-xs">封面</label>
                <label className="cursor-pointer inline-block bg-[#2a2a2a] text-xs px-3 py-1.5 rounded mb-2 text-white">选择新封面<input type="file" accept="image/*" onChange={onCoverEdit} className="hidden" /></label>
                {editForm.coverUrl && <img src={editForm.coverUrl} className="mt-2 h-24 rounded" />}
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-5">
              <button onClick={() => setShowEdit(false)} className="px-4 py-2 bg-[#2a2a2a] rounded text-sm">取消</button>
              <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-blue-600 rounded text-sm font-bold disabled:opacity-50">{saving ? '保存中...' : '保存'}</button>
            </div>
          </div>
        </div>
      )}

      {showProb && curBox && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#161616] rounded-xl border border-[#2a2a2a] p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4">概率配置 - {curBox.name}</h3>
            <div className="space-y-2 mb-4">
              {curBox.items.map((it) => (
                <div key={it.id} className="flex items-center gap-3 bg-[#0d0d0d] p-2 rounded">
                  {it.card.imageUrl ? <img src={it.card.imageUrl} className="w-6 h-8 object-cover rounded" /> : <span className="text-xl">🃏</span>}
                  <div className="flex-1 text-sm">{it.card.name}</div>
                  <span className={`text-xs font-bold ${it.card.rarity === 'SSR' ? 'text-yellow-400' : it.card.rarity === 'SR' ? 'text-purple-400' : 'text-blue-400'}`}>{it.card.rarity}</span>
                  <input type="number" value={it.weight} onChange={(e) => setCurBox((p: any) => ({ ...p, items: p.items.map((i: any) => i.id === it.id ? { ...i, weight: parseInt(e.target.value) || 1 } : i) }))} onBlur={() => updateWeight(it)} className="w-20 bg-[#1a1a1a] border border-[#2a2a2a] rounded px-2 py-1 text-xs text-white" />
                  <div className={`text-xs font-bold w-16 text-right ${pColor(it)}`}>{calcP(it)}%</div>
                  <button onClick={() => removeItem(it.id)} className="bg-red-600 text-white text-xs px-2 py-1 rounded">移除</button>
                </div>
              ))}
              {curBox.items.length === 0 && <div className="text-gray-500 text-sm text-center py-4">尚未添加卡牌</div>}
            </div>
            <div className="border-t border-[#2a2a2a] pt-4 flex gap-2">
              <select value={itemCard} onChange={(e) => setItemCard(e.target.value)} className="flex-1 bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-sm text-white">
                <option value="">-- 选择卡牌 --</option>
                {avail.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.rarity})</option>)}
              </select>
              <input type="number" value={itemWeight} onChange={(e) => setItemWeight(parseInt(e.target.value) || 1)} className="w-24 bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-sm text-white" />
              <button onClick={addItem} className="bg-green-600 text-white text-sm px-4 py-2 rounded font-bold">添加</button>
            </div>
            <div className="flex justify-end mt-6"><button onClick={closeProb} className="px-4 py-2 bg-blue-600 rounded text-sm font-bold">完成</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
