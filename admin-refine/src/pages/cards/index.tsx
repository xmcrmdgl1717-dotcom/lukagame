import React, { useState } from 'react';
import { useTable, useCreate, useUpdate, useDelete } from '@refinedev/core';
import SearchBar from '../../components/SearchBar';
import { useSearch } from '../../hooks/useSearch';

interface CardItem { id: string; name: string; rarity: string; imageUrl: string; createdAt: string; }

const readAsBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });

const SEARCH_FIELDS = [
  { key: 'name', label: '卡牌名称', type: 'text' as const },
  { key: 'rarity', label: '稀有度', type: 'select' as const, options: [
    { value: 'SSR', label: 'SSR' }, { value: 'SR', label: 'SR' }, { value: 'R', label: 'R' },
  ]},
  { key: 'createdAt', label: '创建时间', type: 'date-range' as const },
];

const rarityColor = (r: string) => r === 'SSR' ? 'text-yellow-400' : r === 'SR' ? 'text-purple-400' : 'text-blue-400';

export default function CardList() {
  const { tableQueryResult } = useTable<CardItem>({ resource: 'cards', pagination: { pageSize: 500 } });
  const { mutate: createCard } = useCreate();
  const { mutate: updateCard } = useUpdate();
  const { mutate: deleteCard } = useDelete();

  const all = tableQueryResult.data?.data || [];
  const { filters, setFilters, filtered, reset } = useSearch(all, SEARCH_FIELDS);

  const [newCard, setNewCard] = useState({ name: '', rarity: 'R', imageUrl: '' });
  const [creating, setCreating] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [saving, setSaving] = useState(false);

  // ✅ 修复：先把 base64 算出来，再 setState
  const onNewImg = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const img = await readAsBase64(f);
    setNewCard((c) => ({ ...c, imageUrl: img }));
  };

  const onEditImg = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const img = await readAsBase64(f);
    setEditForm((c: any) => ({ ...c, imageUrl: img }));
  };

  const handleCreate = () => {
    if (!newCard.name) return alert('请输入名称');
    setCreating(true);
    createCard({ resource: 'cards', values: newCard }, {
      onSuccess: () => { setNewCard({ name: '', rarity: 'R', imageUrl: '' }); setCreating(false); tableQueryResult.refetch(); },
      onError: (e: any) => { alert('添加失败: ' + (e?.message || '')); setCreating(false); },
    });
  };

  const handleSave = () => {
    setSaving(true);
    updateCard({ resource: 'cards', id: editForm.id, values: { name: editForm.name, rarity: editForm.rarity, imageUrl: editForm.imageUrl } }, {
      onSuccess: () => { setShowEdit(false); setSaving(false); tableQueryResult.refetch(); },
      onError: () => { alert('保存失败'); setSaving(false); },
    });
  };

  const handleDelete = (c: CardItem) => {
    if (!confirm(`删除卡牌「${c.name}」？`)) return;
    deleteCard({ resource: 'cards', id: c.id }, { onSuccess: () => tableQueryResult.refetch() });
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">卡牌管理</h1>
      </div>

      <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-4 mb-4">
        <div className="text-sm font-bold mb-3">新增卡牌</div>
        <div className="flex flex-wrap gap-2 items-center">
          <input value={newCard.name} onChange={(e) => setNewCard({ ...newCard, name: e.target.value })} placeholder="卡牌名称" className="bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-1.5 text-sm w-40 text-white" />
          <select value={newCard.rarity} onChange={(e) => setNewCard({ ...newCard, rarity: e.target.value })} className="bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-1.5 text-sm text-white">
            <option value="SSR">SSR</option><option value="SR">SR</option><option value="R">R</option>
          </select>
          <label className="cursor-pointer bg-[#2a2a2a] hover:bg-[#3a3a3a] text-xs px-3 py-2 rounded text-white">
            选择图片
            <input type="file" accept="image/*" onChange={onNewImg} className="hidden" />
          </label>
          {newCard.imageUrl && <img src={newCard.imageUrl} className="w-10 h-14 object-cover rounded" />}
          <button onClick={handleCreate} disabled={creating} className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm px-4 py-1.5 rounded font-bold">
            {creating ? '添加中...' : '+ 添加'}
          </button>
        </div>
      </div>

      <SearchBar fields={SEARCH_FIELDS} filters={filters} setFilters={setFilters} onReset={reset} total={all.length} filtered={filtered.length} />

      {tableQueryResult.isLoading ? (
        <div className="text-center text-gray-500 py-20">加载中...</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {filtered.map((c) => (
            <div key={c.id} className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-3 flex flex-col items-center">
              {c.imageUrl ? <img src={c.imageUrl} className="w-full h-32 object-cover rounded mb-2" /> : <div className="w-full h-32 bg-[#0d0d0d] rounded mb-2 flex items-center justify-center text-3xl">🃏</div>}
              <div className="text-sm font-bold truncate w-full text-center mb-1">{c.name}</div>
              <div className={`text-xs font-bold mb-2 ${rarityColor(c.rarity)}`}>{c.rarity}</div>
              <div className="flex gap-1 w-full">
                <button onClick={() => { setEditForm({ ...c }); setShowEdit(true); }} className="flex-1 bg-blue-600 text-white text-xs py-1 rounded">编辑</button>
                <button onClick={() => handleDelete(c)} className="flex-1 bg-red-600 text-white text-xs py-1 rounded">删除</button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && <div className="col-span-6 text-center text-gray-500 py-10">无匹配结果</div>}
        </div>
      )}

      {showEdit && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#161616] rounded-xl border border-[#2a2a2a] p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">编辑卡牌</h3>
            <div className="space-y-3 text-sm">
              <div><label className="block text-gray-400 mb-1 text-xs">名称</label><input value={editForm.name || ''} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white" /></div>
              <div><label className="block text-gray-400 mb-1 text-xs">稀有度</label>
                <select value={editForm.rarity || 'R'} onChange={(e) => setEditForm({ ...editForm, rarity: e.target.value })} className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white">
                  <option value="SSR">SSR</option><option value="SR">SR</option><option value="R">R</option>
                </select></div>
              <div><label className="block text-gray-400 mb-1 text-xs">卡图</label>
                <label className="cursor-pointer inline-block bg-[#2a2a2a] text-xs px-3 py-1.5 rounded mb-2 text-white">选择新图片<input type="file" accept="image/*" onChange={onEditImg} className="hidden" /></label>
                {editForm.imageUrl && <img src={editForm.imageUrl} className="mt-2 h-24 rounded" />}
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-5">
              <button onClick={() => setShowEdit(false)} className="px-4 py-2 bg-[#2a2a2a] rounded text-sm">取消</button>
              <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-blue-600 rounded text-sm font-bold disabled:opacity-50">{saving ? '保存中...' : '保存'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
