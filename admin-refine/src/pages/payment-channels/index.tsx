import React, { useState } from 'react';
import { useTable, useUpdate } from '@refinedev/core';

interface Channel {
  id: string;
  name: string;
  displayName: string;
  iconUrl: string;
  config: string;
  isActive: boolean;
  sortOrder: number;
}

export default function PaymentChannelList() {
  const { tableQueryResult } = useTable<Channel>({ resource: 'payment-channels', pagination: { pageSize: 100 } });
  const { mutate: update_ } = useUpdate();

  const all = tableQueryResult.data?.data || [];

  const [showEdit, setShowEdit] = useState(false);
  const [ed, setEd] = useState<any>({});
  const [saving, setSaving] = useState(false);

  const openEdit = (c: Channel) => {
    setEd({ ...c });
    setShowEdit(true);
  };

  const handleSave = () => {
    setSaving(true);
    update_({
      resource: 'payment-channels', id: ed.id,
      values: {
        displayName: ed.displayName,
        config: ed.config,
        isActive: ed.isActive,
        sortOrder: ed.sortOrder,
      },
    }, {
      onSuccess: () => { setShowEdit(false); setSaving(false); tableQueryResult.refetch(); },
      onError: (e: any) => { alert('保存失败: ' + (e?.message || '')); setSaving(false); },
    });
  };

  const toggleStatus = (c: Channel) => {
    update_({ resource: 'payment-channels', id: c.id, values: { isActive: !c.isActive } }, {
      onSuccess: () => tableQueryResult.refetch(),
    });
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">支付管理</h1>
        <div className="text-sm text-gray-500">共 {all.length} 个支付渠道</div>
      </div>

      <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-4 mb-4 text-sm text-gray-400">
        💡 支付渠道的启用/停用会影响用户在充值页看到的可选支付方式。具体的 API 密钥在「配置」中填写。
      </div>

      {tableQueryResult.isLoading ? (
        <div className="text-center text-gray-500 py-20">加载中...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {all.map((c) => (
            <div key={c.id} className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-[#0d0d0d] flex items-center justify-center text-2xl">
                    {c.name === 'alipay' ? '🅰️' : c.name === 'wechat' ? '💬' : c.name === 'stripe' ? '💳' : '💰'}
                  </div>
                  <div>
                    <div className="font-bold">{c.displayName}</div>
                    <div className="text-xs text-gray-500 font-mono">{c.name}</div>
                  </div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded ${c.isActive ? 'bg-green-900/60 text-green-200' : 'bg-red-900/60 text-red-200'}`}>
                  {c.isActive ? '启用' : '停用'}
                </span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => openEdit(c)} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs py-1.5 rounded">配置</button>
                <button onClick={() => toggleStatus(c)} className="flex-1 bg-orange-600 hover:bg-orange-700 text-white text-xs py-1.5 rounded">
                  {c.isActive ? '停用' : '启用'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showEdit && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#161616] rounded-xl border border-[#2a2a2a] p-6 w-full max-w-lg">
            <h3 className="text-lg font-bold mb-4">配置 {ed.displayName}</h3>
            <div className="space-y-3 text-sm">
              <div>
                <label className="block text-gray-400 mb-1 text-xs">显示名</label>
                <input value={ed.displayName || ''} onChange={(e) => setEd({ ...ed, displayName: e.target.value })} className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white" />
              </div>
              <div>
                <label className="block text-gray-400 mb-1 text-xs">图标 URL（可选）</label>
                <input value={ed.iconUrl || ''} onChange={(e) => setEd({ ...ed, iconUrl: e.target.value })} className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white" />
              </div>
              <div>
                <label className="block text-gray-400 mb-1 text-xs">配置 JSON（API 密钥等）</label>
                <textarea rows={5} value={ed.config || ''} onChange={(e) => setEd({ ...ed, config: e.target.value })} placeholder='{"appId":"xxx","secretKey":"yyy"}' className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white font-mono text-xs"></textarea>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-400 mb-1 text-xs">排序</label>
                  <input type="number" value={ed.sortOrder ?? 0} onChange={(e) => setEd({ ...ed, sortOrder: parseInt(e.target.value) || 0 })} className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white" />
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 text-xs cursor-pointer">
                    <input type="checkbox" checked={ed.isActive || false} onChange={(e) => setEd({ ...ed, isActive: e.target.checked })} />
                    启用
                  </label>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-5">
              <button onClick={() => setShowEdit(false)} className="px-4 py-2 bg-[#2a2a2a] rounded text-sm">取消</button>
              <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-blue-600 rounded text-sm font-bold disabled:opacity-50">{saving ? '保存中...' : '保存'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
