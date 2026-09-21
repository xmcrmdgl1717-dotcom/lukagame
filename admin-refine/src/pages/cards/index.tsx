import React, { useState } from 'react';
import { useTable, useCreate, useUpdate, useDelete } from '@refinedev/core';

interface CardItem {
  id: string;
  name: string;
  rarity: string;
  imageUrl: string;
  createdAt: string;
}

const readFileAsBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const rarityColor = (rarity: string) => {
  if (rarity === 'SSR') return 'text-yellow-400';
  if (rarity === 'SR') return 'text-purple-400';
  return 'text-blue-400';
};

export default function CardList() {
  const { tableQueryResult, current, setCurrent, pageSize } = useTable<CardItem>({
    resource: 'cards',
    pagination: { pageSize: 12 },
  });

  const { mutate: createCard } = useCreate();
  const { mutate: updateCard } = useUpdate();
  const { mutate: deleteCard } = useDelete();

  // 新增表单
  const [newCard, setNewCard] = useState({ name: '', rarity: 'R', imageUrl: '' });
  // 编辑弹窗
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);

  const cards = tableQueryResult.data?.data || [];
  const total = tableQueryResult.data?.total || 0;
  const totalPages = Math.ceil(total / pageSize);
  const pagedCards = cards.slice((current - 1) * pageSize, current * pageSize);

  const handleNewImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const base64 = await readFileAsBase64(file);
    setNewCard((c) => ({ ...c, imageUrl: base64 }));
  };

  const handleEditImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const base64 = await readFileAsBase64(file);
    setEditForm((f: any) => ({ ...f, imageUrl: base64 }));
  };

  const handleCreate = () => {
    if (!newCard.name) return alert('请输入卡牌名称');
    setCreating(true);
    createCard(
      { resource: 'cards', values: newCard },
      {
        onSuccess: () => {
          setNewCard({ name: '', rarity: 'R', imageUrl: '' });
          setCreating(false);
          tableQueryResult.refetch();
        },
        onError: (err: any) => {
          alert('添加失败: ' + (err?.message || '未知错误'));
          setCreating(false);
        },
      }
    );
  };

  const openEdit = (card: CardItem) => {
    setEditForm({ ...card });
    setShowEditModal(true);
  };

  const handleSaveEdit = () => {
    setSaving(true);
    updateCard(
      {
        resource: 'cards',
        id: editForm.id,
        values: {
          name: editForm.name,
          rarity: editForm.rarity,
          imageUrl: editForm.imageUrl,
        },
      },
      {
        onSuccess: () => {
          setShowEditModal(false);
          setSaving(false);
          tableQueryResult.refetch();
        },
        onError: (err: any) => {
          alert('保存失败: ' + (err?.message || '未知错误'));
          setSaving(false);
        },
      }
    );
  };

  const handleDelete = (card: CardItem) => {
    if (!confirm(`确定要删除卡牌「${card.name}」吗？`)) return;
    deleteCard(
      { resource: 'cards', id: card.id },
      {
        onSuccess: () => tableQueryResult.refetch(),
        onError: (err: any) =>
          alert('删除失败（可能被盲盒引用）: ' + (err?.message || '未知错误')),
      }
    );
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">卡牌管理</h1>
        <div className="text-sm text-gray-500">共 {total} 张卡牌</div>
      </div>

      {/* 新增卡牌 */}
      <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-4 mb-6">
        <div className="text-sm font-bold mb-3">新增卡牌</div>
        <div className="flex flex-wrap gap-2 items-center">
          <input
            value={newCard.name}
            onChange={(e) => setNewCard({ ...newCard, name: e.target.value })}
            placeholder="卡牌名称"
            className="bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-1.5 text-sm w-40 focus:outline-none focus:border-red-500"
          />
          <select
            value={newCard.rarity}
            onChange={(e) => setNewCard({ ...newCard, rarity: e.target.value })}
            className="bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-1.5 text-sm"
          >
            <option value="SSR">SSR</option>
            <option value="SR">SR</option>
            <option value="R">R</option>
          </select>
          <label className="cursor-pointer bg-[#2a2a2a] hover:bg-[#3a3a3a] text-xs px-3 py-2 rounded">
            选择图片
            <input
              type="file"
              accept="image/*"
              onChange={handleNewImageChange}
              className="hidden"
            />
          </label>
          {newCard.imageUrl && (
            <img
              src={newCard.imageUrl}
              className="w-10 h-14 object-cover rounded border border-[#2a2a2a]"
            />
          )}
          <button
            onClick={handleCreate}
            disabled={creating}
            className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm px-4 py-1.5 rounded font-bold"
          >
            {creating ? '添加中...' : '+ 添加卡牌'}
          </button>
        </div>
      </div>

      {/* 卡牌列表 */}
      {tableQueryResult.isLoading ? (
        <div className="text-center text-gray-500 py-20">加载中...</div>
      ) : pagedCards.length === 0 ? (
        <div className="text-center text-gray-500 py-20">暂无卡牌</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {pagedCards.map((card) => (
            <div
              key={card.id}
              className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-3 flex flex-col items-center"
            >
              {card.imageUrl ? (
                <img
                  src={card.imageUrl}
                  className="w-full h-32 object-cover rounded mb-2"
                  alt={card.name}
                />
              ) : (
                <div className="w-full h-32 bg-[#0d0d0d] rounded mb-2 flex items-center justify-center text-3xl">
                  🃏
                </div>
              )}
              <div className="text-sm font-bold truncate w-full text-center mb-1">
                {card.name}
              </div>
              <div className={`text-xs font-bold mb-2 ${rarityColor(card.rarity)}`}>
                {card.rarity}
              </div>
              <div className="flex gap-1 w-full">
                <button
                  onClick={() => openEdit(card)}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs py-1 rounded"
                >
                  编辑
                </button>
                <button
                  onClick={() => handleDelete(card)}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white text-xs py-1 rounded"
                >
                  删除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-6">
          <button
            disabled={current <= 1}
            onClick={() => setCurrent(current - 1)}
            className="px-3 py-1 rounded bg-[#1f1f1f] disabled:opacity-30 text-sm"
          >
            上一页
          </button>
          <span className="text-sm text-gray-400">
            {current} / {totalPages}
          </span>
          <button
            disabled={current >= totalPages}
            onClick={() => setCurrent(current + 1)}
            className="px-3 py-1 rounded bg-[#1f1f1f] disabled:opacity-30 text-sm"
          >
            下一页
          </button>
        </div>
      )}

      {/* 编辑弹窗 */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#161616] rounded-xl border border-[#2a2a2a] p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">编辑卡牌</h3>
            <div className="space-y-3 text-sm">
              <div>
                <label className="block text-gray-400 mb-1 text-xs">名称</label>
                <input
                  value={editForm.name || ''}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white focus:outline-none focus:border-red-500"
                />
              </div>
              <div>
                <label className="block text-gray-400 mb-1 text-xs">稀有度</label>
                <select
                  value={editForm.rarity || 'R'}
                  onChange={(e) => setEditForm({ ...editForm, rarity: e.target.value })}
                  className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white"
                >
                  <option value="SSR">SSR</option>
                  <option value="SR">SR</option>
                  <option value="R">R</option>
                </select>
              </div>
              <div>
                <label className="block text-gray-400 mb-1 text-xs">卡图</label>
                <label className="cursor-pointer inline-block bg-[#2a2a2a] hover:bg-[#3a3a3a] text-xs px-3 py-1.5 rounded mb-2">
                  选择新图片
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleEditImageChange}
                    className="hidden"
                  />
                </label>
                {editForm.imageUrl && (
                  <img
                    src={editForm.imageUrl}
                    className="mt-2 h-24 rounded border border-[#2a2a2a]"
                  />
                )}
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-5">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 bg-[#2a2a2a] rounded text-sm hover:bg-[#3a3a3a]"
              >
                取消
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 rounded text-sm font-bold hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
