import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface RoleItem {
  id: string;
  name: string;
  displayName: string;
  description: string;
  permissions: string;
  isSystem: boolean;
  adminCount?: number;
  createdAt: string;
}

interface PermissionDef {
  key: string;
  label: string;
  group: string;
}

const API_URL = import.meta.env.VITE_API_URL || 'https://luka-1i4g.onrender.com';

const getHeaders = () => {
  const adminInfo = JSON.parse(localStorage.getItem('adminInfo') || 'null');
  const password = localStorage.getItem('adminPassword') || '';
  return {
    'x-admin-username': adminInfo?.username || '',
    'x-admin-password': password,
    'Content-Type': 'application/json',
  };
};

export default function RoleList() {
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [permissions, setPermissions] = useState<PermissionDef[]>([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [form, setForm] = useState({
    id: '',
    name: '',
    displayName: '',
    description: '',
    permissionsArr: [] as string[],
  });
  const [saving, setSaving] = useState(false);

  const [showViewModal, setShowViewModal] = useState(false);
  const [viewRole, setViewRole] = useState<RoleItem | null>(null);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [r, p] = await Promise.all([
        axios.get(`${API_URL}/api/admin/roles`, { headers: getHeaders() }),
        axios.get(`${API_URL}/api/admin/permissions`, { headers: getHeaders() }),
      ]);
      setRoles(r.data);
      setPermissions(p.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  // 按 group 分组权限
  const permissionGroups = permissions.reduce<Record<string, PermissionDef[]>>((acc, p) => {
    if (!acc[p.group]) acc[p.group] = [];
    acc[p.group].push(p);
    return acc;
  }, {});

  const openCreate = () => {
    setModalMode('create');
    setForm({
      id: '',
      name: '',
      displayName: '',
      description: '',
      permissionsArr: [],
    });
    setShowModal(true);
  };

  const openEdit = (role: RoleItem) => {
    if (role.name === 'super') return;
    setModalMode('edit');
    setForm({
      id: role.id,
      name: role.name,
      displayName: role.displayName,
      description: role.description,
      permissionsArr: role.permissions ? role.permissions.split(',') : [],
    });
    setShowModal(true);
  };

  const openView = (role: RoleItem) => {
    setViewRole(role);
    setShowViewModal(true);
  };

  const togglePermission = (key: string) => {
    setForm((f) => ({
      ...f,
      permissionsArr: f.permissionsArr.includes(key)
        ? f.permissionsArr.filter((k) => k !== key)
        : [...f.permissionsArr, key],
    }));
  };

  const toggleGroup = (group: string, checked: boolean) => {
    const groupKeys = permissionGroups[group].map((p) => p.key);
    setForm((f) => ({
      ...f,
      permissionsArr: checked
        ? Array.from(new Set([...f.permissionsArr, ...groupKeys]))
        : f.permissionsArr.filter((k) => !groupKeys.includes(k)),
    }));
  };

  const handleSave = async () => {
    if (!form.displayName) return alert('请填写显示名');
    if (modalMode === 'create' && !form.name) return alert('请填写角色标识（英文）');

    setSaving(true);
    try {
      if (modalMode === 'create') {
        await axios.post(
          `${API_URL}/api/admin/roles`,
          {
            name: form.name,
            displayName: form.displayName,
            description: form.description,
            permissions: form.permissionsArr,
          },
          { headers: getHeaders() }
        );
      } else {
        await axios.put(
          `${API_URL}/api/admin/roles/${form.id}`,
          {
            displayName: form.displayName,
            description: form.description,
            permissions: form.permissionsArr,
          },
          { headers: getHeaders() }
        );
      }
      setShowModal(false);
      fetchAll();
    } catch (e: any) {
      alert('保存失败: ' + (e.response?.data?.error || e.message));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (role: RoleItem) => {
    if (role.isSystem) return alert('系统内置角色不可删除');
    if (!confirm(`确定要删除角色「${role.displayName}」吗？`)) return;
    try {
      await axios.delete(`${API_URL}/api/admin/roles/${role.id}`, { headers: getHeaders() });
      fetchAll();
    } catch (e: any) {
      alert('删除失败: ' + (e.response?.data?.error || e.message));
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">角色管理</h1>
        <button
          onClick={openCreate}
          className="bg-green-600 hover:bg-green-700 text-white text-sm px-4 py-2 rounded font-bold"
        >
          + 新建角色
        </button>
      </div>

      {loading ? (
        <div className="text-center text-gray-500 py-20">加载中...</div>
      ) : (
        <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#1f1f1f] text-gray-400 text-xs uppercase">
              <tr>
                <th className="p-3">显示名</th>
                <th className="p-3">标识</th>
                <th className="p-3">描述</th>
                <th className="p-3">权限数</th>
                <th className="p-3">管理员数</th>
                <th className="p-3">类型</th>
                <th className="p-3 text-center">操作</th>
              </tr>
            </thead>
            <tbody>
              {roles.map((r) => {
                const permCount = r.permissions ? r.permissions.split(',').filter(Boolean).length : 0;
                return (
                  <tr key={r.id} className="border-b border-[#2a2a2a] hover:bg-[#1a1a1a]">
                    <td className="p-3 font-bold">{r.displayName}</td>
                    <td className="p-3 text-gray-400 font-mono text-xs">{r.name}</td>
                    <td className="p-3 text-gray-400 text-xs max-w-[200px] truncate" title={r.description}>
                      {r.description || '-'}
                    </td>
                    <td className="p-3 text-yellow-400 font-bold">{permCount}</td>
                    <td className="p-3 text-blue-400">{r.adminCount ?? 0}</td>
                    <td className="p-3">
                      <span
                        className={`text-xs px-2 py-0.5 rounded ${
                          r.isSystem
                            ? 'bg-orange-900/60 text-orange-200'
                            : 'bg-blue-900/60 text-blue-200'
                        }`}
                      >
                        {r.isSystem ? '系统' : '自定义'}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => openView(r)}
                        className="bg-gray-600 hover:bg-gray-700 text-white text-xs px-3 py-1 rounded mr-1"
                      >
                        查看
                      </button>
                      <button
                        onClick={() => openEdit(r)}
                        disabled={r.name === 'super'}
                        className="bg-blue-600 hover:bg-blue-700 disabled:opacity-30 disabled:cursor-not-allowed text-white text-xs px-3 py-1 rounded mr-1"
                      >
                        编辑
                      </button>
                      <button
                        onClick={() => handleDelete(r)}
                        disabled={r.isSystem}
                        className="bg-red-600 hover:bg-red-700 disabled:opacity-30 disabled:cursor-not-allowed text-white text-xs px-3 py-1 rounded"
                      >
                        删除
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* 新建/编辑 弹窗 */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#161616] rounded-xl border border-[#2a2a2a] p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4">
              {modalMode === 'create' ? '新建角色' : `编辑角色: ${form.displayName}`}
            </h3>

            <div className="space-y-3 text-sm mb-4">
              {modalMode === 'create' && (
                <div>
                  <label className="block text-gray-400 mb-1 text-xs">角色标识（英文，唯一，如 vip_cs）</label>
                  <input
                    value={form.name}
                    onChange={(e) =>
                      setForm({ ...form, name: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') })
                    }
                    className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white font-mono"
                    placeholder="例如: vip_cs"
                  />
                </div>
              )}
              <div>
                <label className="block text-gray-400 mb-1 text-xs">显示名（中文）</label>
                <input
                  value={form.displayName}
                  onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                  className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white"
                  placeholder="例如: VIP客服"
                />
              </div>
              <div>
                <label className="block text-gray-400 mb-1 text-xs">描述</label>
                <input
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white"
                  placeholder="简短描述该角色的职责"
                />
              </div>
            </div>

            <div className="border-t border-[#2a2a2a] pt-4">
              <div className="flex justify-between items-center mb-3">
                <div className="text-sm font-bold">权限配置</div>
                <div className="text-xs text-gray-500">
                  已勾选 {form.permissionsArr.length} 项
                </div>
              </div>

              <div className="space-y-3">
                {Object.entries(permissionGroups).map(([group, perms]) => {
                  const allChecked = perms.every((p) => form.permissionsArr.includes(p.key));
                  const someChecked = perms.some((p) => form.permissionsArr.includes(p.key));
                  return (
                    <div key={group} className="bg-[#0d0d0d] rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <input
                          type="checkbox"
                          checked={allChecked}
                          ref={(el) => {
                            if (el) el.indeterminate = someChecked && !allChecked;
                          }}
                          onChange={(e) => toggleGroup(group, e.target.checked)}
                          className="cursor-pointer"
                        />
                        <div className="text-sm font-bold text-orange-400">{group}</div>
                        <div className="text-xs text-gray-500">
                          ({perms.filter((p) => form.permissionsArr.includes(p.key)).length}/{perms.length})
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {perms.map((p) => {
                          const checked = form.permissionsArr.includes(p.key);
                          return (
                            <label
                              key={p.key}
                              className={`flex items-center gap-1 text-xs px-2 py-1 rounded cursor-pointer ${
                                checked
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-[#1a1a1a] text-gray-400 hover:bg-[#2a2a2a]'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => togglePermission(p.key)}
                                className="hidden"
                              />
                              {p.label}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-[#2a2a2a] rounded text-sm hover:bg-[#3a3a3a]"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2 bg-blue-600 rounded text-sm font-bold hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 查看角色弹窗 */}
      {showViewModal && viewRole && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#161616] rounded-xl border border-[#2a2a2a] p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4">
              查看角色: {viewRole.displayName}
            </h3>
            <div className="space-y-2 text-sm mb-4">
              <div className="flex gap-2">
                <span className="text-gray-400 w-24">标识：</span>
                <span className="font-mono">{viewRole.name}</span>
              </div>
              <div className="flex gap-2">
                <span className="text-gray-400 w-24">描述：</span>
                <span>{viewRole.description || '-'}</span>
              </div>
              <div className="flex gap-2">
                <span className="text-gray-400 w-24">类型：</span>
                <span>{viewRole.isSystem ? '系统内置' : '自定义'}</span>
              </div>
            </div>
            <div className="border-t border-[#2a2a2a] pt-4">
              <div className="text-sm font-bold mb-3">权限列表</div>
              <div className="space-y-2">
                {Object.entries(permissionGroups).map(([group, perms]) => {
                  const owned = perms.filter((p) =>
                    viewRole.name === 'super'
                      ? true
                      : viewRole.permissions.split(',').includes(p.key)
                  );
                  if (owned.length === 0) return null;
                  return (
                    <div key={group} className="bg-[#0d0d0d] rounded-lg p-3">
                      <div className="text-sm font-bold text-orange-400 mb-2">
                        {group} ({owned.length})
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {owned.map((p) => (
                          <span
                            key={p.key}
                            className="text-xs bg-green-900/60 text-green-200 px-2 py-1 rounded"
                          >
                            {p.label}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="flex justify-end mt-6">
              <button
                onClick={() => setShowViewModal(false)}
                className="px-4 py-2 bg-[#2a2a2a] rounded text-sm hover:bg-[#3a3a3a]"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
