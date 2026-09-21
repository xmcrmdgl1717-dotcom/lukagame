import React, { useState } from 'react';
import { useTable, useCreate, useUpdate, useDelete } from '@refinedev/core';

interface AdminItem {
  id: string;
  username: string;
  role: string;
  permissions: string;
  isActive: boolean;
  createdAt: string;
  lastLoginAt: string;
}

const ALL_PERMISSIONS = [
  { key: 'users', label: '用户管理' },
  { key: 'cards', label: '卡牌管理' },
  { key: 'boxes', label: '盲盒管理' },
  { key: 'recharge', label: '充值套餐' },
  { key: 'orders', label: '订单管理' },
  { key: 'banners', label: '轮播图' },
  { key: 'tasks', label: '任务管理' },
  { key: 'redeem', label: '兑换码' },
  { key: 'notifications', label: '通知管理' },
  { key: 'tickets', label: '客服工单' },
  { key: 'admins', label: '管理员' },
];

const roleLabel = (role: string) => {
  if (role === 'super') return '超级管理员';
  if (role === 'admin') return '管理员';
  if (role === 'operator') return '运营';
  if (role === 'viewer') return '只读';
  return role;
};

const formatDate = (d: string) => {
  if (!d) return '-';
  const dt = new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')} ${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;
};

export default function AdminList() {
  const { tableQueryResult } = useTable<AdminItem>({
    resource: 'admins',
    pagination: { pageSize: 100 },
  });

  const { mutate: createAdmin } = useCreate();
  const { mutate: updateAdmin } = useUpdate();
  const { mutate: deleteAdmin } = useDelete();

  const [newAdmin, setNewAdmin] = useState({
    username: '',
    password: '',
    role: 'operator',
    permissions: [] as string[],
  });
  const [creating, setCreating] = useState(false);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState<any>({ permissionsArr: [] });
  const [saving, setSaving] = useState(false);

  const admins = tableQueryResult.data?.data || [];

  const handleCreate = () => {
    if (!newAdmin.username || !newAdmin.password) return alert('请填写用户名和密码');
    setCreating(true);
    createAdmin(
      {
        resource: 'admins',
        values: {
          username: newAdmin.username,
          password: newAdmin.password,
          role: newAdmin.role,
          permissions: newAdmin.role === 'super' ? '' : newAdmin.permissions.join(','),
        },
      },
      {
        onSuccess: () => {
          setNewAdmin({ username: '', password: '', role: 'operator', permissions: [] });
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

  const openEdit = (a: AdminItem) => {
    setEditForm({
      ...a,
      password: '',
      permissionsArr: a.permissions ? a.permissions.split(',') : [],
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = () => {
    setSaving(true);
    updateAdmin(
      {
        resource: 'admins',
        id: editForm.id,
        values: {
          password: editForm.password || undefined,
          role: editForm.role,
          permissions: editForm.role === 'super' ? '' : editForm.permissionsArr.join(','),
          isActive: editForm.isActive,
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

  const handleDelete = (a: AdminItem) => {
    if (!confirm(`确定要删除管理员「${a.username}」吗？`)) return;
    deleteAdmin(
      { resource: 'admins', id: a.id },
      {
        onSuccess: () => tableQueryResult.refetch(),
        onError: (err: any) => alert('删除失败: ' + (err?.message || '未知错误')),
      }
    );
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">管理员权限</h1>
        <div className="text-sm text-gray-500">共 {admins.length} 位管理员</div>
      </div>

      {/* 新增管理员 */}
      <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-4 mb-6">
        <div className="text-sm font-bold mb-3">添加新管理员</div>
        <div className="flex flex-wrap gap-2 items-center mb-3">
          <input
            value={newAdmin.username}
            onChange={(e) => setNewAdmin({ ...newAdmin, username: e.target.value })}
            placeholder="用户名"
            className="bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-1.5 text-sm w-40 focus:outline-none focus:border-red-500"
          />
          <input
            type="password"
            value={newAdmin.password}
            onChange={(e) => setNewAdmin({ ...newAdmin, password: e.target.value })}
            placeholder="密码"
            className="bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-1.5 text-sm w-40 focus:outline-none focus:border-red-500"
          />
          <select
            value={newAdmin.role}
            onChange={(e) => setNewAdmin({ ...newAdmin, role: e.target.value })}
            className="bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-1.5 text-sm"
          >
            <option value="super">超级管理员</option>
            <option value="admin">管理员</option>
            <option value="operator">运营</option>
            <option value="viewer">只读</option>
          </select>
          <button
            onClick={handleCreate}
            disabled={creating}
            className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm px-4 py-1.5 rounded font-bold"
          >
            {creating ? '添加中...' : '+ 添加'}
          </button>
        </div>

        {newAdmin.role !== 'super' && (
          <div>
            <div className="text-xs text-gray-400 mb-2">选择权限（勾选后该管理员可以访问对应模块）：</div>
            <div className="flex flex-wrap gap-2">
              {ALL_PERMISSIONS.map((p) => (
                <label
                  key={p.key}
                  className={`flex items-center gap-1 text-xs px-2 py-1 rounded cursor-pointer ${
                    newAdmin.permissions.includes(p.key)
                      ? 'bg-blue-600 text-white'
                      : 'bg-[#0d0d0d] text-gray-400'
                  }`}
                >
                  <input
                    type="checkbox"
                    value={p.key}
                    checked={newAdmin.permissions.includes(p.key)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setNewAdmin({
                          ...newAdmin,
                          permissions: [...newAdmin.permissions, p.key],
                        });
                      } else {
                        setNewAdmin({
                          ...newAdmin,
                          permissions: newAdmin.permissions.filter((x) => x !== p.key),
                        });
                      }
                    }}
                    className="hidden"
                  />
                  {p.label}
                </label>
              ))}
            </div>
          </div>
        )}
        {newAdmin.role === 'super' && (
          <div className="text-xs text-yellow-400">
            ⚠️ 超级管理员默认拥有全部权限，无需单独勾选
          </div>
        )}
      </div>

      {/* 列表 */}
      {tableQueryResult.isLoading ? (
        <div className="text-center text-gray-500 py-20">加载中...</div>
      ) : (
        <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#1f1f1f] text-gray-400 text-xs uppercase">
              <tr>
                <th className="p-3">用户名</th>
                <th className="p-3">角色</th>
                <th className="p-3">权限</th>
                <th className="p-3">状态</th>
                <th className="p-3">最近登录</th>
                <th className="p-3 text-center">操作</th>
              </tr>
            </thead>
            <tbody>
              {admins.map((a) => (
                <tr key={a.id} className="border-b border-[#2a2a2a] hover:bg-[#1a1a1a]">
                  <td className="p-3 font-bold">{a.username}</td>
                  <td className="p-3 text-orange-400">{roleLabel(a.role)}</td>
                  <td className="p-3 text-xs text-gray-400 max-w-[280px]">
                    {a.role === 'super' ? (
                      <span className="text-yellow-400">全部权限</span>
                    ) : a.permissions ? (
                      a.permissions
                        .split(',')
                        .map((p) => {
                          const found = ALL_PERMISSIONS.find((x) => x.key === p);
                          return found?.label || p;
                        })
                        .join('、')
                    ) : (
                      <span className="text-gray-600">无</span>
                    )}
                  </td>
                  <td className="p-3">
                    <span
                      className={`text-xs px-2 py-0.5 rounded ${
                        a.isActive
                          ? 'bg-green-900/60 text-green-200'
                          : 'bg-red-900/60 text-red-200'
                      }`}
                    >
                      {a.isActive ? '启用' : '停用'}
                    </span>
                  </td>
                  <td className="p-3 text-gray-400 text-xs">{formatDate(a.lastLoginAt)}</td>
                  <td className="p-3 text-center">
                    <button
                      onClick={() => openEdit(a)}
                      className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1 rounded mr-1"
                    >
                      编辑
                    </button>
                    <button
                      onClick={() => handleDelete(a)}
                      className="bg-red-600 hover:bg-red-700 text-white text-xs px-3 py-1 rounded"
                    >
                      删除
                    </button>
                  </td>
                </tr>
              ))}
              {admins.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center text-gray-500 py-10">
                    暂无管理员
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
          <div className="bg-[#161616] rounded-xl border border-[#2a2a2a] p-6 w-full max-w-lg">
            <h3 className="text-lg font-bold mb-4">编辑管理员: {editForm.username}</h3>
            <div className="space-y-3 text-sm">
              <div>
                <label className="block text-gray-400 mb-1 text-xs">重置密码（留空不改）</label>
                <input
                  type="password"
                  value={editForm.password || ''}
                  onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                  placeholder="留空则不修改"
                  className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-gray-400 mb-1 text-xs">角色</label>
                <select
                  value={editForm.role || 'admin'}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                  className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white"
                >
                  <option value="super">超级管理员</option>
                  <option value="admin">管理员</option>
                  <option value="operator">运营</option>
                  <option value="viewer">只读</option>
                </select>
              </div>

              {editForm.role !== 'super' && (
                <div>
                  <label className="block text-gray-400 mb-2 text-xs">权限配置</label>
                  <div className="flex flex-wrap gap-2">
                    {ALL_PERMISSIONS.map((p) => (
                      <label
                        key={p.key}
                        className={`flex items-center gap-1 text-xs px-2 py-1 rounded cursor-pointer ${
                          editForm.permissionsArr?.includes(p.key)
                            ? 'bg-blue-600 text-white'
                            : 'bg-[#0d0d0d] text-gray-400'
                        }`}
                      >
                        <input
                          type="checkbox"
                          value={p.key}
                          checked={editForm.permissionsArr?.includes(p.key)}
                          onChange={(e) => {
                            const arr = editForm.permissionsArr || [];
                            if (e.target.checked) {
                              setEditForm({ ...editForm, permissionsArr: [...arr, p.key] });
                            } else {
                              setEditForm({
                                ...editForm,
                                permissionsArr: arr.filter((x: string) => x !== p.key),
                              });
                            }
                          }}
                          className="hidden"
                        />
                        {p.label}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-gray-400 mb-1 text-xs">状态</label>
                <select
                  value={String(editForm.isActive)}
                  onChange={(e) =>
                    setEditForm({ ...editForm, isActive: e.target.value === 'true' })
                  }
                  className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white"
                >
                  <option value="true">启用</option>
                  <option value="false">停用</option>
                </select>
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
