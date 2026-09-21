import React, { useState } from 'react';
import { useTable, useUpdate, useDelete } from '@refinedev/core';

interface UserItem {
  id: string;
  username: string;
  coins: number;
  createdAt: string;
  lastLoginAt: string;
  tags: string;
  remark: string;
  rechargeCount: number;
}

const formatDate = (d: string) => {
  if (!d) return '-';
  const dt = new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')} ${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;
};

export default function UserList() {
  const { tableQueryResult, current, setCurrent, pageSize } = useTable<UserItem>({
    resource: 'users',
    pagination: { pageSize: 10 },
  });

  const { mutate: updateUser } = useUpdate();
  const { mutate: deleteUser } = useDelete();

  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [saving, setSaving] = useState(false);

  const users = tableQueryResult.data?.data || [];
  const total = tableQueryResult.data?.total || 0;
  const totalPages = Math.ceil(total / pageSize);
  const pagedUsers = users.slice((current - 1) * pageSize, current * pageSize);

  const openEdit = (user: UserItem) => {
    setEditForm({ ...user, password: '' });
    setShowEditModal(true);
  };

  const handleSave = async () => {
    setSaving(true);
    const payload: any = {
      username: editForm.username,
      coins: editForm.coins,
      tags: editForm.tags || '',
      remark: editForm.remark || '',
    };
    if (editForm.password) payload.password = editForm.password;

    updateUser(
      { resource: 'users', id: editForm.id, values: payload },
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

  const handleDelete = (user: UserItem) => {
    if (!confirm(`确定要删除用户「${user.username}」吗？此操作不可恢复！`)) return;
    deleteUser(
      { resource: 'users', id: user.id },
      {
        onSuccess: () => tableQueryResult.refetch(),
        onError: (err: any) => alert('删除失败: ' + (err?.message || '未知错误')),
      }
    );
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">用户管理</h1>
        <div className="text-sm text-gray-500">共 {total} 位用户</div>
      </div>

      {tableQueryResult.isLoading ? (
        <div className="text-center text-gray-500 py-20">加载中...</div>
      ) : tableQueryResult.isError ? (
        <div className="text-center text-red-500 py-20">加载失败，请刷新重试</div>
      ) : (
        <>
          <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-[#1f1f1f] text-gray-400 text-xs uppercase">
                  <tr>
                    <th className="p-3">用户名</th>
                    <th className="p-3">注册时间</th>
                    <th className="p-3">最近登录</th>
                    <th className="p-3">余额</th>
                    <th className="p-3">充值次数</th>
                    <th className="p-3">标签</th>
                    <th className="p-3">备注</th>
                    <th className="p-3 text-center">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedUsers.map((u) => (
                    <tr key={u.id} className="border-b border-[#2a2a2a] hover:bg-[#1a1a1a]">
                      <td className="p-3 font-bold">{u.username}</td>
                      <td className="p-3 text-gray-400 text-xs">{formatDate(u.createdAt)}</td>
                      <td className="p-3 text-gray-400 text-xs">{formatDate(u.lastLoginAt)}</td>
                      <td className="p-3 text-yellow-500 font-bold">{u.coins}</td>
                      <td className="p-3 text-blue-400 text-center">{u.rechargeCount}</td>
                      <td className="p-3">
                        {u.tags ? (
                          <span className="bg-blue-900/60 text-blue-200 text-xs px-2 py-0.5 rounded">
                            {u.tags}
                          </span>
                        ) : (
                          <span className="text-gray-600 text-xs">-</span>
                        )}
                      </td>
                      <td className="p-3 text-gray-400 text-xs max-w-[200px] truncate" title={u.remark}>
                        {u.remark || '-'}
                      </td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => openEdit(u)}
                          className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1 rounded mr-1"
                        >
                          编辑
                        </button>
                        <button
                          onClick={() => handleDelete(u)}
                          className="bg-red-600 hover:bg-red-700 text-white text-xs px-3 py-1 rounded"
                        >
                          删除
                        </button>
                      </td>
                    </tr>
                  ))}
                  {pagedUsers.length === 0 && (
                    <tr>
                      <td colSpan={8} className="text-center text-gray-500 py-10">
                        暂无用户
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* 分页 */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-4">
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
        </>
      )}

      {/* 编辑弹窗 */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#161616] rounded-xl border border-[#2a2a2a] p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">编辑用户: {editForm.username}</h3>
            <div className="space-y-3 text-sm">
              <div>
                <label className="block text-gray-400 mb-1 text-xs">用户名</label>
                <input
                  value={editForm.username || ''}
                  onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                  className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white focus:outline-none focus:border-red-500"
                />
              </div>
              <div>
                <label className="block text-gray-400 mb-1 text-xs">重置密码（留空不改）</label>
                <input
                  type="password"
                  value={editForm.password || ''}
                  onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                  placeholder="留空则不修改"
                  className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white focus:outline-none focus:border-red-500"
                />
              </div>
              <div>
                <label className="block text-gray-400 mb-1 text-xs">金币余额</label>
                <input
                  type="number"
                  value={editForm.coins ?? 0}
                  onChange={(e) => setEditForm({ ...editForm, coins: parseInt(e.target.value) || 0 })}
                  className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white focus:outline-none focus:border-red-500"
                />
              </div>
              <div>
                <label className="block text-gray-400 mb-1 text-xs">标签</label>
                <input
                  value={editForm.tags || ''}
                  onChange={(e) => setEditForm({ ...editForm, tags: e.target.value })}
                  placeholder="多个标签用逗号分隔"
                  className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white focus:outline-none focus:border-red-500"
                />
              </div>
              <div>
                <label className="block text-gray-400 mb-1 text-xs">备注</label>
                <textarea
                  rows={2}
                  value={editForm.remark || ''}
                  onChange={(e) => setEditForm({ ...editForm, remark: e.target.value })}
                  className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white focus:outline-none focus:border-red-500"
                ></textarea>
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
                onClick={handleSave}
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
