import React, { useState, useEffect } from 'react';
import { useTable, useCreate, useUpdate, useDelete, useCustom } from '@refinedev/core';

interface BoxItem {
  id: string;
  name: string;
  price: number;
  coverUrl: string;
  isActive: boolean;
  items: Array<{
    id: string;
    weight: number;
    card: { id: string; name: string; rarity: string; imageUrl: string };
  }>;
}

interface CardItem {
  id: string;
  name: string;
  rarity: string;
  imageUrl: string;
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

export default function BoxList() {
  const { tableQueryResult } = useTable<BoxItem>({ resource: 'boxes', pagination: { pageSize: 100 } });
  const { tableQueryResult: cardsQuery } = useTable<CardItem>({ resource: 'cards', pagination: { pageSize: 500 } });

  const { mutate: createBox } = useCreate();
  const { mutate: updateBox } = useUpdate();
  const { mutate: deleteBox } = useDelete();
  const { mutate: customRequest } = useCustom();

  const [newBox, setNewBox] = useState({ name: '', price: 300, coverUrl: '' });
  const [creating, setCreating] = useState(false);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [saving, setSaving] = useState(false);

  // 概率配置弹窗
  const [showProbModal, setShowProbModal] = useState(false);
  const [currentBox, setCurrentBox] = useState<BoxItem | null>(null);
  const [newItemCardId, setNewItemCardId] = useState('');
  const [newItemWeight, setNewItemWeight] = useState(10);

  const boxes = tableQueryResult.data?.data || [];
  const allCards = cardsQuery.data?.data || [];

  // 上传图片
  const handleNewCover = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const base64 = await readFileAsBase64(file);
    setNewBox((b) => ({ ...b, coverUrl: base64 }));
  };

  const handleEditCover = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const base64 = await readFileAsBase64(file);
    setEditForm((f: any) => ({ ...f, coverUrl: base64 }));
  };

  // 新增
  const handleCreate = () => {
    if (!newBox.name || !newBox.price) return alert('请填写名称和价格');
    setCreating(true);
    createBox(
      { resource: 'boxes', values: newBox },
      {
        onSuccess: () => {
          setNewBox({ name: '', price: 300, coverUrl: '' });
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

  // 编辑
  const openEdit = (box: BoxItem) => {
    setEditForm({ ...box });
    setShowEditModal(true);
  };

  const handleSaveEdit = () => {
    setSaving(true);
    updateBox(
      {
        resource: 'boxes',
        id: editForm.id,
        values: { name: editForm.name, price: editForm.price, coverUrl: editForm.coverUrl },
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

  // 上下架
  const toggleStatus = (box: BoxItem) => {
    updateBox(
      { resource: 'boxes', id: box.id, values: { isActive: !box.isActive } },
      { onSuccess: () => tableQueryResult.refetch() }
    );
  };

  // 删除
  const handleDelete = (box: BoxItem) => {
    if (!confirm(`确定要删除盲盒「${box.name}」吗？所有概率配置会一并删除！`)) return;
    deleteBox(
      { resource: 'boxes', id: box.id },
      {
        onSuccess: () => tableQueryResult.refetch(),
        onError: (err: any) => alert('删除失败: ' + (err?.message || '未知错误')),
      }
    );
  };

  // ========== 概率配置 ==========
  const openProbModal = (box: BoxItem) => {
    setCurrentBox(JSON.parse(JSON.stringify(box)));
    setNewItemCardId('');
    setNewItemWeight(10);
    setShowProbModal(true);
  };

  const closeProbModal = () => {
    setShowProbModal(false);
    setCurrentBox(null);
    tableQueryResult.refetch();
  };

  const calculateProbability = (item: any) => {
    if (!currentBox) return '0.00';
    const total = currentBox.items.reduce((sum, i) => sum + (i.weight || 0), 0);
    if (!total || !item.weight) return '0.00';
    return ((item.weight / total) * 100).toFixed(2);
  };

  const getProbColor = (item: any) => {
    const p = parseFloat(calculateProbability(item));
    if (p >= 50) return 'text-green-400';
    if (p >= 10) return 'text-yellow-400';
    return 'text-red-400';
  };

  const updateItemWeight = (item: any) => {
    if (item.weight < 1) item.weight = 1;
    customRequest(
      {
        url: `/api/admin/boxes/${currentBox!.id}/items`,
        method: 'post',
        payload: { cardId: item.card.id, weight: item.weight },
      },
      {
        onError: (err: any) => alert('权重更新失败: ' + (err?.message || '未知错误')),
      }
    );
  };

  const removeItem = (itemId: string) => {
    if (!confirm('确定要移除该卡牌吗？')) return;
    customRequest(
      {
        url: `/api/admin/boxes/${currentBox!.id}/items/${itemId}`,
        method: 'delete',
      },
      {
        onSuccess: () => {
          setCurrentBox((prev: any) => ({
            ...prev,
            items: prev.items.filter((i: any) => i.id !== itemId),
          }));
        },
      }
    );
  };

  const addItemToBox = () => {
    if (!newItemCardId) return alert('请选择卡牌');
    if (newItemWeight < 1) return alert('权重至少为 1');
    customRequest(
      {
        url: `/api/admin/boxes/${currentBox!.id}/items`,
        method: 'post',
        payload: { cardId: newItemCardId, weight: newItemWeight },
      },
      {
        onSuccess: async () => {
          // 重新拉取盲盒数据
          const res: any = await fetch(
            `${import.meta.env.VITE_API_URL || 'https://luka-1i4g.onrender.com'}/api/admin/boxes`,
            {
              headers: {
                'x-admin-username': JSON.parse(localStorage.getItem('adminInfo') || 'null')?.username || '',
                'x-admin-password': localStorage.getItem('adminPassword') || '',
              },
            }
          );
          const all = await res.json();
          const updated = all.find((b: any) => b.id === currentBox!.id);
          setCurrentBox(JSON.parse(JSON.stringify(updated)));
          setNewItemCardId('');
          setNewItemWeight(10);
        },
        onError: (err: any) => alert('添加失败: ' + (err?.message || '未知错误')),
      }
    );
  };

  const availableCards = currentBox
    ? allCards.filter((c) => !currentBox.items.some((i) => i.card.id === c.id))
    : [];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">盲盒管理</h1>
        <div className="text-sm text-gray-500">共 {boxes.length} 个盲盒</div>
      </div>

      {/* 新增盲盒 */}
      <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-4 mb-6">
        <div className="text-sm font-bold mb-3">新增盲盒</div>
        <div className="flex flex-wrap gap-2 items-center">
          <input
            value={newBox.name}
            onChange={(e) => setNewBox({ ...newBox, name: e.target.value })}
            placeholder="盲盒名称"
            className="bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-1.5 text-sm w-40 focus:outline-none focus:border-red-500"
          />
          <input
            type="number"
            value={newBox.price}
            onChange={(e) => setNewBox({ ...newBox, price: parseInt(e.target.value) || 0 })}
            placeholder="价格"
            className="bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-1.5 text-sm w-24 focus:outline-none focus:border-red-500"
          />
          <label className="cursor-pointer bg-[#2a2a2a] hover:bg-[#3a3a3a] text-xs px-3 py-2 rounded">
            选择封面
            <input type="file" accept="image/*" onChange={handleNewCover} className="hidden" />
          </label>
          {newBox.coverUrl && (
            <img src={newBox.coverUrl} className="w-10 h-14 object-cover rounded border border-[#2a2a2a]" />
          )}
          <button
            onClick={handleCreate}
            disabled={creating}
            className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm px-4 py-1.5 rounded font-bold"
          >
            {creating ? '添加中...' : '+ 添加盲盒'}
          </button>
        </div>
      </div>

      {/* 盲盒列表 */}
      {tableQueryResult.isLoading ? (
        <div className="text-center text-gray-500 py-20">加载中...</div>
      ) : boxes.length === 0 ? (
        <div className="text-center text-gray-500 py-20">暂无盲盒</div>
      ) : (
        <div className="space-y-3">
          {boxes.map((box) => (
            <div key={box.id} className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-4">
              <div className="flex justify-between items-center flex-wrap gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold">{box.name}</span>
                    {!box.isActive && (
                      <span className="text-xs bg-red-900/60 text-red-200 px-2 py-0.5 rounded">已下架</span>
                    )}
                  </div>
                  <div className="text-yellow-500 text-sm mt-1">价格: {box.price} 🪙</div>
                  <div className="text-gray-500 text-xs mt-1">包含 {box.items.length} 种卡牌</div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => openEdit(box)}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 rounded"
                  >
                    编辑
                  </button>
                  <button
                    onClick={() => openProbModal(box)}
                    className="bg-purple-600 hover:bg-purple-700 text-white text-xs px-3 py-1.5 rounded font-bold"
                  >
                    概率配置
                  </button>
                  <button
                    onClick={() => toggleStatus(box)}
                    className="bg-orange-600 hover:bg-orange-700 text-white text-xs px-3 py-1.5 rounded"
                  >
                    {box.isActive ? '下架' : '上架'}
                  </button>
                  <button
                    onClick={() => handleDelete(box)}
                    className="bg-red-600 hover:bg-red-700 text-white text-xs px-3 py-1.5 rounded"
                  >
                    删除
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 编辑盲盒弹窗 */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#161616] rounded-xl border border-[#2a2a2a] p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">编辑盲盒</h3>
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
                <label className="block text-gray-400 mb-1 text-xs">价格</label>
                <input
                  type="number"
                  value={editForm.price ?? 0}
                  onChange={(e) => setEditForm({ ...editForm, price: parseInt(e.target.value) || 0 })}
                  className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white focus:outline-none focus:border-red-500"
                />
              </div>
              <div>
                <label className="block text-gray-400 mb-1 text-xs">封面图</label>
                <label className="cursor-pointer inline-block bg-[#2a2a2a] hover:bg-[#3a3a3a] text-xs px-3 py-1.5 rounded mb-2">
                  选择新封面
                  <input type="file" accept="image/*" onChange={handleEditCover} className="hidden" />
                </label>
                {editForm.coverUrl && (
                  <img src={editForm.coverUrl} className="mt-2 h-24 rounded border border-[#2a2a2a]" />
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

      {/* 概率配置弹窗 */}
      {showProbModal && currentBox && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#161616] rounded-xl border border-[#2a2a2a] p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4">概率配置 - {currentBox.name}</h3>

            {/* 已有卡牌 */}
            <div className="mb-4">
              <div className="text-sm text-gray-400 mb-2">
                当前盲盒内卡牌（共 {currentBox.items.length} 种）
              </div>
              {currentBox.items.length === 0 ? (
                <div className="text-gray-500 text-sm text-center py-4">尚未添加任何卡牌</div>
              ) : (
                <div className="space-y-2">
                  {currentBox.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 bg-[#0d0d0d] p-2 rounded"
                    >
                      <div className="w-8 text-center">
                        {item.card.imageUrl ? (
                          <img src={item.card.imageUrl} className="w-6 h-8 object-cover rounded" />
                        ) : (
                          <span className="text-xl">🃏</span>
                        )}
                      </div>
                      <div className="flex-1 text-sm">{item.card.name}</div>
                      <span className={`text-xs font-bold ${rarityColor(item.card.rarity)}`}>
                        {item.card.rarity}
                      </span>
                      <div className="text-xs text-gray-400">权重</div>
                      <input
                        type="number"
                        value={item.weight}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 1;
                          setCurrentBox((prev: any) => ({
                            ...prev,
                            items: prev.items.map((i: any) =>
                              i.id === item.id ? { ...i, weight: val } : i
                            ),
                          }));
                        }}
                        onBlur={() => updateItemWeight(item)}
                        className="w-20 bg-[#1a1a1a] border border-[#2a2a2a] rounded px-2 py-1 text-xs text-white"
                      />
                      <div className={`text-xs font-bold w-16 text-right ${getProbColor(item)}`}>
                        {calculateProbability(item)}%
                      </div>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="bg-red-600 hover:bg-red-700 text-white text-xs px-2 py-1 rounded"
                      >
                        移除
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 添加卡牌 */}
            <div className="border-t border-[#2a2a2a] pt-4">
              <div className="text-sm text-gray-400 mb-2">添加卡牌到该盲盒</div>
              <div className="flex gap-2">
                <select
                  value={newItemCardId}
                  onChange={(e) => setNewItemCardId(e.target.value)}
                  className="flex-1 bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-sm"
                >
                  <option value="">-- 选择卡牌 --</option>
                  {availableCards.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.rarity})
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  value={newItemWeight}
                  onChange={(e) => setNewItemWeight(parseInt(e.target.value) || 1)}
                  placeholder="权重"
                  className="w-24 bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-sm"
                />
                <button
                  onClick={addItemToBox}
                  className="bg-green-600 hover:bg-green-700 text-white text-sm px-4 py-2 rounded font-bold"
                >
                  添加
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={closeProbModal}
                className="px-4 py-2 bg-blue-600 rounded text-sm font-bold hover:bg-blue-700"
              >
                完成
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
