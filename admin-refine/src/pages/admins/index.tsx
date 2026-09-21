import React, { useState, useEffect } from 'react';
import { useTable, useCreate, useUpdate, useDelete } from '@refinedev/core';
import axios from 'axios';

interface AdminItem {
  id: string;
  username: string;
  roleId: string | null;
  role: string;
  roleDisplayName: string;
  rolePermissions: string;
  isActive: boolean;
  createdAt: string;
  lastLoginAt: string;
}

interface RoleItem {
  id: string;
  name: string;
  displayName: string;
  permissions: string;
  isSystem: boolean;
}

const API_URL = import.meta.env.VITE_API_URL || 'https://luka-1i4g.onrender.com';

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

  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [newAdmin, setNewAdmin] = useState({ username: '', password: '', roleId: '' });
  const [creating, setCreating] = useState(false);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState<any>({ password: '', roleId: '', isActive: true });
  const [saving, setSaving] = useState(false);

  const admins = tableQueryResult.data?.data || [];

  // 加载角色列表
  useEffect(() => {
    const adminInfo = JSON.parse(localStorage.getItem('adminInfo') || 'null');
    const password = localStorage.getItem('adminPassword') || '';
    axios
      .get(`${API_URL}/api/admin/roles`, {
        headers: {
          'x-admin-username': adminInfo?.username || '',
          'x-admin-password': password,
        },
      })
      .then((res) => {
        setRoles(res.data);
        // 默认选中第一个非 super 角色作为默认
        const defaultRole = res.data.find((r: RoleItem) => r.name !== 'super');
        if (defaultRole) {
          setNewAdmin((n) => ({ ...n, roleId: defaultRole.id }));
        }
      })
      .catch(() => {});
  }, []);

  const handleCreate = () => {
    if (!newAdmin.username || !newAdmin.password || !newAdmin.roleId) {
      return alert('请填写用户名、密码和角色');
    }
    setCreating(true);
    createAdmin(
      { resource: 'admins', values: newAdmin },
      {
        onSuccess: () => {
          setNewAdmin({
            username: '',
            password: '',
            roleId: roles.find((r) => r.name !== 'super')?.id || '',
          });
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
      id: a.id,
      username: a.username,
      password: '',
      roleId: a.roleId || '',
      isActive: a.isActive,
      role: a.role,
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = () => {
    setSaving(true);
    const values: any = {
      isActive: editForm.isActive,
      roleId: editForm.roleId,
    };
    if (editForm.password) values.password = editForm.password;

    updateAdmin(
      { resource: 'admins', id: editForm.id, values },
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
    if (!confirm(`确定要删除管理员「${a.username}」吗？此操作不可恢复！`)) return;
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
        <h1 className="text-2xl font-bold">管理员列表</h1>
        <div className="text-sm text-gray-500">共 {admins.length} 位管理员</div>
      </div>

      {/* 新增管理员 */}
      <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-4 mb-6">
        <div className="text-sm font-bold mb-3">添加新管理员</div>
        <div className="flex flex-wrap gap-2 items-center">
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
            value={newAdmin.roleId}
            onChange={(e) => setNewAdmin({ ...newAdmin, roleId: e.target.value })}
            className="bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-1.5 text-sm w-48"
          >
            <option value="">-- 选择角色 --</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.displayName} ({r.name})
              </option>
            ))}
          </select>
          <button
            onClick={handleCreate}
            disabled={creating}
            className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm px-4 py-1.5 rounded font-bold"
          >
            {creating ? '添加中...' : '+ 添加'}
          </button>
        </div>
        <div className="text-xs text-gray-500 mt-2">
          提示：管理员权限由其所属角色决定，如需修改权限请前往「角色管理」
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
                <th className="p-3">用户名</th>
                <th className="p-3">角色</th>
                <th className="p-3">状态</th>
                <th className="p-3">最近登录</th>
                <th className="p-3 text-center">操作</th>
              </tr>
            </thead>
            <tbody>
              {admins.map((a) => (
                <tr key={a.id} className="border-b border-[#2a2a2a] hover:bg-[#1a1a1a]">
                  <td className="p-3 font-bold">{a.username}</td>
                  <td className="p-3">
                    <span
                      className={`text-xs px-2 py-0.5 rounded ${
                        a.role === 'super'
                          ? 'bg-red-900/60 text-red-200'
                          : a.role === 'admin'
                          ? 'bg-orange-900/60 text-orange-200'
                          : 'bg-blue-900/60 text-blue-200'
                      }`}
                    >
                      {a.roleDisplayName || a.role}
                    </span>
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
                      disabled={a.role === 'super'}
                      className="bg-blue-600 hover:bg-blue-700 disabled:opacity-30 disabled:cursor-not-allowed text-white text-xs px-3 py-1 rounded mr-1"
                    >
                      编辑
                    </button>
                    <button
                      onClick={() => handleDelete(a)}
                      disabled={a.role === 'super'}
                      className="bg-red-600 hover:bg-red-700 disabled:opacity-30 disabled:cursor-not-allowed text-white text-xs px-3 py-1 rounded"
                    >
                      删除
                    </button>
                  </td>
                </tr>
              ))}
              {admins.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center text-gray-500 py-10">
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
          <div className="bg-[#161616] rounded-xl border border-[#2a2a2a] p-6 w-full max-w-md">
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
                  value={editForm.roleId || ''}
                  onChange={(e) => setEditForm({ ...editForm, roleId: e.target.value })}
                  className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white"
                >
                  <option value="">-- 选择角色 --</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.displayName} ({r.name})
                    </option>
                  ))}
                </select>
              </div>
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
