import React, { useState } from 'react';
import { useTable, useCreate, useUpdate, useDelete } from '@refinedev/core';

interface TaskItem {
  id: string;
  title: string;
  description: string;
  action: string;
  targetCount: number;
  rewardCoins: number;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
}

const actionLabel = (action: string) => {
  if (action === 'DRAW') return '抽卡';
  if (action === 'SPEND') return '消费';
  if (action === 'RECHARGE') return '充值';
  return action;
};

export default function TaskList() {
  const { tableQueryResult } = useTable<TaskItem>({
    resource: 'tasks',
    pagination: { pageSize: 100 },
  });

  const { mutate: createTask } = useCreate();
  const { mutate: updateTask } = useUpdate();
  const { mutate: deleteTask } = useDelete();

  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    action: 'DRAW',
    targetCount: 1,
    rewardCoins: 100,
    sortOrder: 0,
  });
  const [creating, setCreating] = useState(false);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [saving, setSaving] = useState(false);

  const tasks = tableQueryResult.data?.data || [];

  const handleCreate = () => {
    if (!newTask.title) return alert('请输入标题');
    setCreating(true);
    createTask(
      { resource: 'tasks', values: newTask },
      {
        onSuccess: () => {
          setNewTask({ title: '', description: '', action: 'DRAW', targetCount: 1, rewardCoins: 100, sortOrder: 0 });
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

  const openEdit = (t: TaskItem) => {
    setEditForm({ ...t });
    setShowEditModal(true);
  };

  const handleSaveEdit = () => {
    setSaving(true);
    updateTask(
      {
        resource: 'tasks',
        id: editForm.id,
        values: {
          title: editForm.title,
          description: editForm.description,
          action: editForm.action,
          targetCount: editForm.targetCount,
          rewardCoins: editForm.rewardCoins,
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

  const toggleStatus = (t: TaskItem) => {
    updateTask(
      { resource: 'tasks', id: t.id, values: { isActive: !t.isActive } },
      { onSuccess: () => tableQueryResult.refetch() }
    );
  };

  const handleDelete = (t: TaskItem) => {
    if (!confirm(`确定要删除任务「${t.title}」吗？`)) return;
    deleteTask(
      { resource: 'tasks', id: t.id },
      {
        onSuccess: () => tableQueryResult.refetch(),
        onError: (err: any) => alert('删除失败: ' + (err?.message || '未知错误')),
      }
    );
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">任务管理</h1>
        <div className="text-sm text-gray-500">共 {tasks.length} 个任务</div>
      </div>

      {/* 新增 */}
      <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-4 mb-6">
        <div className="text-sm font-bold mb-3">新增任务</div>
        <div className="flex flex-wrap gap-2 items-center">
          <input
            value={newTask.title}
            onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
            placeholder="任务标题"
            className="bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-1.5 text-sm w-44 focus:outline-none focus:border-red-500"
          />
          <input
            value={newTask.description}
            onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
            placeholder="描述"
            className="bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-1.5 text-sm flex-1 min-w-[200px] focus:outline-none focus:border-red-500"
          />
          <select
            value={newTask.action}
            onChange={(e) => setNewTask({ ...newTask, action: e.target.value })}
            className="bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-1.5 text-sm"
          >
            <option value="DRAW">抽卡</option>
            <option value="SPEND">消费</option>
            <option value="RECHARGE">充值</option>
          </select>
          <input
            type="number"
            value={newTask.targetCount}
            onChange={(e) => setNewTask({ ...newTask, targetCount: parseInt(e.target.value) || 1 })}
            placeholder="目标"
            className="bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-1.5 text-sm w-20 focus:outline-none focus:border-red-500"
          />
          <input
            type="number"
            value={newTask.rewardCoins}
            onChange={(e) => setNewTask({ ...newTask, rewardCoins: parseInt(e.target.value) || 0 })}
            placeholder="奖励金币"
            className="bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-1.5 text-sm w-24 focus:outline-none focus:border-red-500"
          />
          <input
            type="number"
            value={newTask.sortOrder}
            onChange={(e) => setNewTask({ ...newTask, sortOrder: parseInt(e.target.value) || 0 })}
            placeholder="排序"
            className="bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-1.5 text-sm w-16 focus:outline-none focus:border-red-500"
          />
          <button
            onClick={handleCreate}
            disabled={creating}
            className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm px-4 py-1.5 rounded font-bold"
          >
            {creating ? '添加中...' : '+ 添加'}
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
                <th className="p-3">标题</th>
                <th className="p-3">类型</th>
                <th className="p-3">目标</th>
                <th className="p-3">奖励</th>
                <th className="p-3">状态</th>
                <th className="p-3">排序</th>
                <th className="p-3 text-center">操作</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((t) => (
                <tr key={t.id} className="border-b border-[#2a2a2a] hover:bg-[#1a1a1a]">
                  <td className="p-3 font-bold">{t.title}</td>
                  <td className="p-3 text-gray-400">{actionLabel(t.action)}</td>
                  <td className="p-3 text-gray-400">{t.targetCount}</td>
                  <td className="p-3 text-yellow-500 font-bold">+{t.rewardCoins}</td>
                  <td className="p-3">
                    <span
                      className={`text-xs px-2 py-0.5 rounded ${
                        t.isActive
                          ? 'bg-green-900/60 text-green-200'
                          : 'bg-red-900/60 text-red-200'
                      }`}
                    >
                      {t.isActive ? '启用' : '停用'}
                    </span>
                  </td>
                  <td className="p-3 text-gray-400">{t.sortOrder}</td>
                  <td className="p-3 text-center">
                    <button
                      onClick={() => openEdit(t)}
                      className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1 rounded mr-1"
                    >
                      编辑
                    </button>
                    <button
                      onClick={() => toggleStatus(t)}
                      className="bg-orange-600 hover:bg-orange-700 text-white text-xs px-3 py-1 rounded mr-1"
                    >
                      {t.isActive ? '停用' : '启用'}
                    </button>
                    <button
                      onClick={() => handleDelete(t)}
                      className="bg-red-600 hover:bg-red-700 text-white text-xs px-3 py-1 rounded"
                    >
                      删除
                    </button>
                  </td>
                </tr>
              ))}
              {tasks.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center text-gray-500 py-10">
                    暂无任务
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
            <h3 className="text-lg font-bold mb-4">编辑任务</h3>
            <div className="space-y-3 text-sm">
              <div>
                <label className="block text-gray-400 mb-1 text-xs">标题</label>
                <input
                  value={editForm.title || ''}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-gray-400 mb-1 text-xs">描述</label>
                <input
                  value={editForm.description || ''}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-gray-400 mb-1 text-xs">类型</label>
                <select
                  value={editForm.action || 'DRAW'}
                  onChange={(e) => setEditForm({ ...editForm, action: e.target.value })}
                  className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white"
                >
                  <option value="DRAW">抽卡</option>
                  <option value="SPEND">消费</option>
                  <option value="RECHARGE">充值</option>
                </select>
              </div>
              <div>
                <label className="block text-gray-400 mb-1 text-xs">目标</label>
                <input
                  type="number"
                  value={editForm.targetCount ?? 1}
                  onChange={(e) => setEditForm({ ...editForm, targetCount: parseInt(e.target.value) || 1 })}
                  className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-gray-400 mb-1 text-xs">奖励金币</label>
                <input
                  type="number"
                  value={editForm.rewardCoins ?? 0}
                  onChange={(e) => setEditForm({ ...editForm, rewardCoins: parseInt(e.target.value) || 0 })}
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
