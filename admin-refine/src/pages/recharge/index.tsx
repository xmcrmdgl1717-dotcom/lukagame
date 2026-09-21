import React, { useState } from 'react';
import { useTable, useCreate, useUpdate, useDelete } from '@refinedev/core';

interface RechargeOption {
  id: string;
  coins: number;
  bonus: number;
  price: number;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
}

export default function RechargeList() {
  const { tableQueryResult } = useTable<RechargeOption>({
    resource: 'recharge-options',
    pagination: { pageSize: 100 },
  });

  const { mutate: createOption } = useCreate();
  const { mutate: updateOption } = useUpdate();
  const { mutate: deleteOption } = useDelete();

  const [newOption, setNewOption] = useState({ coins: 300, bonus: 0, price: 3000, sortOrder: 0 });
  const [creating, setCreating] = useState(false);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [saving, setSaving] = useState(false);

  const options = tableQueryResult.data?.data || [];

  const handleCreate = () => {
    if (!newOption.coins || !newOption.price) return alert('请填写基础金币和价格');
    setCreating(true);
    createOption(
      { resource: 'recharge-options', values: newOption },
      {
        onSuccess: () => {
          setNewOption({ coins: 300, bonus: 0, price: 3000, sortOrder: 0 });
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

  const openEdit = (opt: RechargeOption) => {
    setEditForm({ ...opt });
    setShowEditModal(true);
  };

  const handleSaveEdit = () => {
    setSaving(true);
    updateOption(
      {
        resource: 'recharge-options',
        id: editForm.id,
        values: {
          coins: editForm.coins,
          bonus: editForm.bonus,
          price: editForm.price,
          sortOrder: editForm.sortOrder,
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

  const toggleStatus = (opt: RechargeOption) => {
    updateOption(
      { resource: 'recharge-options', id: opt.id, values: { isActive: !opt.isActive } },
      { onSuccess: () => tableQueryResult.refetch() }
    );
  };

  const handleDelete = (opt: RechargeOption) => {
    if (!confirm(`确定要删除套餐「${opt.coins} 金币」吗？`)) return;
    deleteOption(
      { resource: 'recharge-options', id: opt.id },
      {
        onSuccess: () => tableQueryResult.refetch(),
        onError: (err: any) =>
          alert('删除失败（可能有订单引用）: ' + (err?.message || '未知错误')),
      }
    );
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">充值套餐</h1>
        <div className="text-sm text-gray-500">共 {options.length} 个套餐</div>
      </div>

      {/* 新增 */}
      <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-4 mb-6">
        <div className="text-sm font-bold mb-3">新增套餐</div>
        <div className="flex flex-wrap gap-2 items-center">
          <input
            type="number"
            value={newOption.coins}
            onChange={(e) => setNewOption({ ...newOption, coins: parseInt(e.target.value) || 0 })}
            placeholder="基础金币"
            className="bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-1.5 text-sm w-28 focus:outline-none focus:border-red-500"
          />
          <input
            type="number"
            value={newOption.bonus}
            onChange={(e) => setNewOption({ ...newOption, bonus: parseInt(e.target.value) || 0 })}
            placeholder="赠送金币"
            className="bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-1.5 text-sm w-28 focus:outline-none focus:border-red-500"
          />
          <input
            type="number"
            value={newOption.price}
            onChange={(e) => setNewOption({ ...newOption, price: parseInt(e.target.value) || 0 })}
            placeholder="价格（分）"
            className="bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-1.5 text-sm w-28 focus:outline-none focus:border-red-500"
          />
          <input
            type="number"
            value={newOption.sortOrder}
            onChange={(e) => setNewOption({ ...newOption, sortOrder: parseInt(e.target.value) || 0 })}
            placeholder="排序"
            className="bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-1.5 text-sm w-20 focus:outline-none focus:border-red-500"
          />
          <button
            onClick={handleCreate}
            disabled={creating}
            className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm px-4 py-1.5 rounded font-bold"
          >
            {creating ? '添加中...' : '+ 添加套餐'}
          </button>
        </div>
      </div>

      {/* 列表 */}
      {tableQueryResult.isLoading ? (
        <div className="text-center text-gray-500 py-20">加载中...</div>
      ) : (
        <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#1f1f1f] text-gray-400 text-xs uppercase">
              <tr>
                <th className="p-3">基础金币</th>
                <th className="p-3">赠送</th>
                <th className="p-3">价格</th>
                <th className="p-3">状态</th>
                <th className="p-3">排序</th>
                <th className="p-3 text-center">操作</th>
              </tr>
            </thead>
            <tbody>
              {options.map((opt) => (
                <tr key={opt.id} className="border-b border-[#2a2a2a] hover:bg-[#1a1a1a]">
                  <td className="p-3 text-yellow-400 font-bold">{opt.coins}</td>
                  <td className="p-3 text-green-400">+{opt.bonus}</td>
                  <td className="p-3 font-bold">¥{(opt.price / 100).toFixed(2)}</td>
                  <td className="p-3">
                    <span
                      className={`text-xs px-2 py-0.5 rounded ${
                        opt.isActive
                          ? 'bg-green-900/60 text-green-200'
                          : 'bg-red-900/60 text-red-200'
                      }`}
                    >
                      {opt.isActive ? '上架' : '下架'}
                    </span>
                  </td>
                  <td className="p-3 text-gray-400">{opt.sortOrder}</td>
                  <td className="p-3 text-center">
                    <button
                      onClick={() => openEdit(opt)}
                      className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1 rounded mr-1"
                    >
                      编辑
                    </button>
                    <button
                      onClick={() => toggleStatus(opt)}
                      className="bg-orange-600 hover:bg-orange-700 text-white text-xs px-3 py-1 rounded mr-1"
                    >
                      {opt.isActive ? '下架' : '上架'}
                    </button>
                    <button
                      onClick={() => handleDelete(opt)}
                      className="bg-red-600 hover:bg-red-700 text-white text-xs px-3 py-1 rounded"
                    >
                      删除
                    </button>
                  </td>
                </tr>
              ))}
              {options.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center text-gray-500 py-10">
                    暂无套餐
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* 编辑弹窗 */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#161616] rounded-xl border border-[#2a2a2a] p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">编辑充值套餐</h3>
            <div className="space-y-3 text-sm">
              <div>
                <label className="block text-gray-400 mb-1 text-xs">基础金币</label>
                <input
                  type="number"
                  value={editForm.coins ?? 0}
                  onChange={(e) => setEditForm({ ...editForm, coins: parseInt(e.target.value) || 0 })}
                  className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-gray-400 mb-1 text-xs">赠送金币</label>
                <input
                  type="number"
                  value={editForm.bonus ?? 0}
                  onChange={(e) => setEditForm({ ...editForm, bonus: parseInt(e.target.value) || 0 })}
                  className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-gray-400 mb-1 text-xs">价格（分）</label>
                <input
                  type="number"
                  value={editForm.price ?? 0}
                  onChange={(e) => setEditForm({ ...editForm, price: parseInt(e.target.value) || 0 })}
                  className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-gray-400 mb-1 text-xs">排序</label>
                <input
                  type="number"
                  value={editForm.sortOrder ?? 0}
                  onChange={(e) => setEditForm({ ...editForm, sortOrder: parseInt(e.target.value) || 0 })}
                  className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white"
                />
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
