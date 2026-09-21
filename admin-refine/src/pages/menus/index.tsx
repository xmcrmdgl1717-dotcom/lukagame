import React, { useEffect, useState } from 'react';
import axios from 'axios';
import type { AdminMenu } from '../../hooks/useMenuTree';

const API_URL = import.meta.env.VITE_API_URL || 'https://luka-1i4g.onrender.com';

const getHeaders = () => {
  const a = JSON.parse(localStorage.getItem('adminInfo') || 'null');
  return {
    'x-admin-username': a?.username || '',
    'x-admin-password': localStorage.getItem('adminPassword') || '',
    'Content-Type': 'application/json',
  };
};

const COMPONENT_OPTIONS = [
  'DashboardPage', 'UserList', 'CardList', 'BoxList', 'RechargeList', 'OrderList',
  'BannerList', 'TaskList', 'RedeemCodeList', 'NotificationList', 'TicketList',
  'AdminList', 'RoleList', 'PermissionList', 'AuditLogList', 'SessionList',
  'VipLevels', 'MenuManage',
];

export default function MenuManage() {
  const [menus, setMenus] = useState<AdminMenu[]>([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [form, setForm] = useState<any>({
    id: '', parentId: '', title: '', type: 'MENU', icon: '', path: '', component: '',
    permission: '', sortOrder: 0, isVisible: true, isActive: true,
  });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API_URL}/api/admin/menus`, { headers: getHeaders() });
      setMenus(data);
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  // 展平菜单树以便下拉选择
  const flatten = (list: AdminMenu[], depth = 0): { id: string; title: string; depth: number }[] => {
    const result: { id: string; title: string; depth: number }[] = [];
    list.forEach((m) => {
      result.push({ id: m.id, title: m.title, depth });
      if (m.children?.length) result.push(...flatten(m.children, depth + 1));
    });
    return result;
  };
  const flatMenus = flatten(menus);

  const openCreate = (parentId?: string) => {
    setModalMode('create');
    setForm({
      id: '', parentId: parentId || '', title: '', type: 'MENU', icon: '', path: '',
      component: '', permission: '', sortOrder: 0, isVisible: true, isActive: true,
    });
    setShowModal(true);
  };

  const openEdit = (m: AdminMenu) => {
    setModalMode('edit');
    setForm({ ...m });
    setShowModal(true);
  };

  const save = async () => {
    if (!form.title) return alert('请填写菜单标题');
    setSaving(true);
    try {
      const payload: any = {
        parentId: form.parentId || null,
        title: form.title,
        type: form.type,
        icon: form.icon,
        path: form.path,
        component: form.component,
        permission: form.permission,
        sortOrder: form.sortOrder,
        isVisible: form.isVisible,
        isActive: form.isActive,
      };
      if (modalMode === 'create') {
        await axios.post(`${API_URL}/api/admin/menus`, payload, { headers: getHeaders() });
      } else {
        await axios.put(`${API_URL}/api/admin/menus/${form.id}`, payload, { headers: getHeaders() });
      }
      setShowModal(false);
      load();
    } catch (e: any) {
      alert('失败: ' + (e.response?.data?.error || e.message));
    } finally { setSaving(false); }
  };

  const del = async (m: AdminMenu) => {
    if (m.children?.length) {
      if (!confirm(`「${m.title}」下还有 ${m.children.length} 个子菜单，删除后会一起删除。确定继续？`)) return;
    } else {
      if (!confirm(`确定删除「${m.title}」吗？`)) return;
    }
    try {
      await axios.delete(`${API_URL}/api/admin/menus/${m.id}`, { headers: getHeaders() });
      load();
    } catch (e: any) {
      alert('删除失败: ' + (e.response?.data?.error || e.message));
    }
  };

  const toggleField = async (m: AdminMenu, field: 'isVisible' | 'isActive') => {
    try {
      await axios.put(`${API_URL}/api/admin/menus/${m.id}`, { [field]: !m[field] }, { headers: getHeaders() });
      load();
    } catch (e: any) { alert('操作失败'); }
  };

  // 渲染树形
  const renderRow = (m: AdminMenu, depth = 0) => {
    const rows: JSX.Element[] = [];
    rows.push(
      <tr key={m.id} className="border-b border-[#2a2a2a] hover:bg-[#1a1a1a]">
        <td className="p-3">
          <div style={{ paddingLeft: depth * 24 }} className="flex items-center gap-2">
            {m.type === 'DIRECTORY' && <span className="text-gray-500">{m.children?.length ? '▾' : '▸'}</span>}
            <span className="text-lg">{m.icon || '•'}</span>
            <span className="font-bold">{m.title}</span>
          </div>
        </td>
        <td className="p-3">
          <span className={`text-xs px-2 py-0.5 rounded ${m.type === 'DIRECTORY' ? 'bg-purple-900/60 text-purple-200' : 'bg-blue-900/60 text-blue-200'}`}>
            {m.type === 'DIRECTORY' ? '目录' : '菜单'}
          </span>
        </td>
        <td className="p-3 text-xs text-gray-400 font-mono">{m.path || '-'}</td>
        <td className="p-3 text-xs text-gray-400 font-mono">{m.component || '-'}</td>
        <td className="p-3 text-xs text-gray-400 font-mono">{m.permission || '-'}</td>
        <td className="p-3 text-gray-400 text-xs">{m.sortOrder}</td>
        <td className="p-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => toggleField(m, 'isVisible')}
              className={`text-xs px-2 py-0.5 rounded ${m.isVisible ? 'bg-green-900/60 text-green-200' : 'bg-gray-700 text-gray-300'}`}
            >
              {m.isVisible ? '显示' : '隐藏'}
            </button>
            <button
              onClick={() => toggleField(m, 'isActive')}
              className={`text-xs px-2 py-0.5 rounded ${m.isActive ? 'bg-green-900/60 text-green-200' : 'bg-red-900/60 text-red-200'}`}
            >
              {m.isActive ? '启用' : '停用'}
            </button>
          </div>
        </td>
        <td className="p-3 text-center">
          <button onClick={() => openCreate(m.id)} className="bg-green-600 hover:bg-green-700 text-white text-xs px-2 py-1 rounded mr-1">+ 下级</button>
          <button onClick={() => openEdit(m)} className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-2 py-1 rounded mr-1">修改</button>
          <button onClick={() => del(m)} className="bg-red-600 hover:bg-red-700 text-white text-xs px-2 py-1 rounded">删除</button>
        </td>
      </tr>
    );
    if (m.children?.length) {
      m.children.forEach((c) => rows.push(...renderRow(c, depth + 1)));
    }
    return rows;
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">菜单管理</h1>
        <button onClick={() => openCreate()} className="bg-green-600 hover:bg-green-700 text-white text-sm px-4 py-2 rounded font-bold">+ 新增菜单</button>
      </div>

      <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-4 mb-4 text-sm text-gray-400">
        💡 <span className="text-white font-bold">说明</span>：
        <p className="mt-1">• 目录类型不跳转，只作为二级菜单的容器</p>
        <p>• 菜单的「组件名」必须从下拉列表中选择（这是前端已注册的组件）</p>
        <p>• 修改菜单后刷新页面即生效，不需要重新部署</p>
      </div>

      {loading ? (
        <div className="text-center text-gray-500 py-20">加载中...</div>
      ) : (
        <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#1f1f1f] text-gray-400 text-xs uppercase">
              <tr>
                <th className="p-3">菜单标题</th>
                <th className="p-3">类型</th>
                <th className="p-3">路由路径</th>
                <th className="p-3">组件名</th>
                <th className="p-3">权限标识</th>
                <th className="p-3">排序</th>
                <th className="p-3">状态</th>
                <th className="p-3 text-center">操作</th>
              </tr>
            </thead>
            <tbody>
              {menus.length === 0 ? (
                <tr><td colSpan={8} className="text-center text-gray-500 py-10">暂无菜单，点击「+ 新增菜单」创建</td></tr>
              ) : (
                menus.map((m) => renderRow(m))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* 弹窗 */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#161616] rounded-xl border border-[#2a2a2a] p-6 w-full max-w-lg">
            <h3 className="text-lg font-bold mb-4">{modalMode === 'create' ? '新增菜单' : '编辑菜单'}</h3>
            <div className="space-y-3 text-sm">
              <div>
                <label className="block text-gray-400 mb-1 text-xs">上级菜单</label>
                <select value={form.parentId || ''} onChange={(e) => setForm({ ...form, parentId: e.target.value })} className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white">
                  <option value="">-- 顶级菜单 --</option>
                  {flatMenus.filter((x) => x.id !== form.id).map((x) => (
                    <option key={x.id} value={x.id}>{'　'.repeat(x.depth) + x.title}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-gray-400 mb-1 text-xs">菜单标题</label>
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-400 mb-1 text-xs">类型</label>
                  <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white">
                    <option value="MENU">菜单</option>
                    <option value="DIRECTORY">目录</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-400 mb-1 text-xs">图标（emoji）</label>
                  <input value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} placeholder="📊" className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white" />
                </div>
              </div>
              <div>
                <label className="block text-gray-400 mb-1 text-xs">路由路径</label>
                <input value={form.path} onChange={(e) => setForm({ ...form, path: e.target.value })} placeholder="/users" className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white font-mono" />
              </div>
              <div>
                <label className="block text-gray-400 mb-1 text-xs">组件名</label>
                <select value={form.component} onChange={(e) => setForm({ ...form, component: e.target.value })} className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white font-mono">
                  <option value="">-- 无（目录不用选） --</option>
                  {COMPONENT_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-gray-400 mb-1 text-xs">权限标识</label>
                <input value={form.permission} onChange={(e) => setForm({ ...form, permission: e.target.value })} placeholder="users.view" className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white font-mono" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-400 mb-1 text-xs">排序</label>
                  <input type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: parseInt(e.target.value) || 0 })} className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white" />
                </div>
                <div className="flex items-end gap-2">
                  <label className="flex items-center gap-1 text-xs">
                    <input type="checkbox" checked={form.isVisible} onChange={(e) => setForm({ ...form, isVisible: e.target.checked })} />
                    显示
                  </label>
                  <label className="flex items-center gap-1 text-xs">
                    <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
                    启用
                  </label>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-5">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 bg-[#2a2a2a] rounded text-sm">取消</button>
              <button onClick={save} disabled={saving} className="px-4 py-2 bg-blue-600 rounded text-sm font-bold disabled:opacity-50">
                {saving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
