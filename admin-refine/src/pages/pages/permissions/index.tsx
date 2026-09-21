import React, { useEffect, useState } from 'react';
import axios from 'axios';

interface PermissionDef {
  key: string;
  label: string;
  group: string;
}

interface RoleItem {
  id: string;
  name: string;
  displayName: string;
  permissions: string;
  isSystem: boolean;
}

const API_URL = import.meta.env.VITE_API_URL || 'https://luka-1i4g.onrender.com';

const getHeaders = () => {
  const adminInfo = JSON.parse(localStorage.getItem('adminInfo') || 'null');
  const password = localStorage.getItem('adminPassword') || '';
  return {
    'x-admin-username': adminInfo?.username || '',
    'x-admin-password': password,
  };
};

// 权限用途说明映射（补充更详细的描述）
const PERMISSION_DESC: Record<string, string> = {
  'users.view': '查看用户列表和详情',
  'users.edit': '编辑用户资料、金币、标签、备注',
  'users.delete': '删除用户（不可恢复）',
  'cards.view': '查看卡牌列表',
  'cards.create': '新增卡牌',
  'cards.edit': '编辑卡牌名称、稀有度、图片',
  'cards.delete': '删除卡牌',
  'boxes.view': '查看盲盒列表',
  'boxes.create': '新增盲盒',
  'boxes.edit': '编辑盲盒名称、价格、封面',
  'boxes.delete': '删除盲盒及其概率配置',
  'boxes.probability': '配置盲盒内卡牌的权重和概率',
  'recharge.view': '查看充值套餐',
  'recharge.create': '新增充值套餐',
  'recharge.edit': '编辑充值套餐',
  'recharge.delete': '删除充值套餐',
  'orders.view': '查看订单列表',
  'orders.refund': '手动补单（为用户增加金币）',
  'banners.view': '查看轮播图',
  'banners.create': '新增轮播图',
  'banners.edit': '编辑轮播图',
  'banners.delete': '删除轮播图',
  'tasks.view': '查看任务列表',
  'tasks.create': '新增任务',
  'tasks.edit': '编辑任务',
  'tasks.delete': '删除任务',
  'redeem.view': '查看兑换码',
  'redeem.create': '新增或批量生成兑换码',
  'redeem.delete': '删除兑换码',
  'notifications.view': '查看通知记录',
  'notifications.create': '发布通知（全员或指定用户）',
  'notifications.delete': '删除通知',
  'tickets.view': '查看客服工单',
  'tickets.reply': '回复工单',
  'tickets.close': '关闭工单',
  'tickets.delete': '删除工单',
  'admins.view': '查看管理员列表',
  'admins.create': '新增管理员',
  'admins.edit': '编辑管理员（角色、密码、状态）',
  'admins.delete': '删除管理员',
  'roles.view': '查看角色列表',
  'roles.create': '新增角色',
  'roles.edit': '编辑角色权限',
  'roles.delete': '删除角色',
  'audit.view': '查看操作日志',
};

export default function PermissionList() {
  const [permissions, setPermissions] = useState<PermissionDef[]>([]);
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      axios.get(`${API_URL}/api/admin/permissions`, { headers: getHeaders() }),
      axios.get(`${API_URL}/api/admin/roles`, { headers: getHeaders() }),
    ])
      .then(([p, r]) => {
        setPermissions(p.data);
        setRoles(r.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const permissionGroups = permissions.reduce<Record<string, PermissionDef[]>>((acc, p) => {
    if (!acc[p.group]) acc[p.group] = [];
    acc[p.group].push(p);
    return acc;
  }, {});

  // 统计某个权限被多少个角色拥有
  const getRoleCount = (permKey: string) => {
    return roles.filter((r) => {
      if (r.name === 'super') return true;
      return r.permissions.split(',').includes(permKey);
    }).length;
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">权限说明</h1>
        <div className="text-sm text-gray-500">
          共 {permissions.length} 个权限点，分为 {Object.keys(permissionGroups).length} 个模块
        </div>
      </div>

      <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-4 mb-6 text-sm text-gray-400">
        <p className="mb-1">💡 <span className="text-white font-bold">权限说明</span></p>
        <p className="mb-1">• 系统采用「角色 - 权限」模型，权限不直接分配给管理员，而是通过角色间接分配。</p>
        <p className="mb-1">• 超级管理员角色拥有全部权限，不可编辑、不可删除。</p>
        <p>• 如需调整某位管理员的权限，请前往「角色管理」编辑该管理员所属的角色。</p>
      </div>

      {loading ? (
        <div className="text-center text-gray-500 py-20">加载中...</div>
      ) : (
        <div className="space-y-4">
          {Object.entries(permissionGroups).map(([group, perms]) => (
            <div key={group} className="bg-[#161616] border border-[#2a2a2a] rounded-xl overflow-hidden">
              <div className="bg-[#1f1f1f] px-4 py-3 border-b border-[#2a2a2a]">
                <div className="font-bold text-orange-400">{group}</div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {perms.length} 个权限点
                </div>
              </div>
              <table className="w-full text-left text-sm">
                <thead className="bg-[#1a1a1a] text-gray-500 text-xs uppercase">
                  <tr>
                    <th className="p-3 w-64">权限标识</th>
                    <th className="p-3 w-40">操作</th>
                    <th className="p-3">说明</th>
                    <th className="p-3 w-32 text-center">拥有角色数</th>
                  </tr>
                </thead>
                <tbody>
                  {perms.map((p) => (
                    <tr key={p.key} className="border-b border-[#2a2a2a] last:border-0">
                      <td className="p-3 font-mono text-xs text-blue-400">{p.key}</td>
                      <td className="p-3 font-bold">{p.label}</td>
                      <td className="p-3 text-gray-400 text-xs">
                        {PERMISSION_DESC[p.key] || '—'}
                      </td>
                      <td className="p-3 text-center text-yellow-400 font-bold">
                        {getRoleCount(p.key)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
