import React, { useState } from 'react';
import { useTable, useCreate, useDelete } from '@refinedev/core';
import axios from 'axios';

interface CodeItem {
  id: string;
  code: string;
  coins: number;
  maxUses: number;
  usedCount: number;
  isActive: boolean;
  createdAt: string;
}

const API_URL = import.meta.env.VITE_API_URL || 'https://luka-1i4g.onrender.com';

const formatDate = (d: string) => {
  if (!d) return '-';
  const dt = new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')} ${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;
};

export default function RedeemCodeList() {
  const { tableQueryResult } = useTable<CodeItem>({
    resource: 'redeem-codes',
    pagination: { pageSize: 200 },
  });

  const { mutate: createCode } = useCreate();
  const { mutate: deleteCode } = useDelete();

  const [newCode, setNewCode] = useState({ code: '', coins: 100, maxUses: 1 });
  const [creating, setCreating] = useState(false);

  // 批量生成
  const [batch, setBatch] = useState({ count: 10, coins: 100, maxUses: 1, prefix: 'LUKA' });
  const [batching, setBatching] = useState(false);

  const codes = tableQueryResult.data?.data || [];

  const handleCreate = () => {
    if (!newCode.code) return alert('请输入兑换码');
    setCreating(true);
    createCode(
      { resource: 'redeem-codes', values: newCode },
      {
        onSuccess: () => {
          setNewCode({ code: '', coins: 100, maxUses: 1 });
          setCreating(false);
          tableQueryResult.refetch();
        },
        onError: (err: any) => {
          alert('添加失败（兑换码可能已存在）: ' + (err?.message || '未知错误'));
          setCreating(false);
        },
      }
    );
  };

  const handleBatch = async () => {
    if (batch.count < 1) return alert('数量至少为 1');
    if (batch.count > 100) return alert('单次最多生成 100 个');
    if (!confirm(`确定要生成 ${batch.count} 个兑换码吗？每个 ${batch.coins} 金币。`)) return;

    setBatching(true);
    try {
      const adminInfo = JSON.parse(localStorage.getItem('adminInfo') || 'null');
      const password = localStorage.getItem('adminPassword') || '';
      const { data } = await axios.post(
        `${API_URL}/api/admin/redeem-codes/batch`,
        batch,
        {
          headers: {
            'x-admin-username': adminInfo?.username || '',
            'x-admin-password': password,
          },
        }
      );
      alert(`成功生成 ${data.codes.length} 个兑换码：\n\n${data.codes.join('\n')}`);
      tableQueryResult.refetch();
    } catch (e: any) {
      alert('批量生成失败: ' + (e.response?.data?.error || e.message));
    } finally {
      setBatching(false);
    }
  };

  const handleDelete = (c: CodeItem) => {
    if (!confirm(`确定要删除兑换码「${c.code}」吗？`)) return;
    deleteCode(
      { resource: 'redeem-codes', id: c.id },
      {
        onSuccess: () => tableQueryResult.refetch(),
        onError: (err: any) => alert('删除失败: ' + (err?.message || '未知错误')),
      }
    );
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">兑换码管理</h1>
        <div className="text-sm text-gray-500">共 {codes.length} 个兑换码</div>
      </div>

      {/* 单个添加 */}
      <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-4 mb-4">
        <div className="text-sm font-bold mb-3">单个添加</div>
        <div className="flex flex-wrap gap-2 items-center">
          <input
            value={newCode.code}
            onChange={(e) => setNewCode({ ...newCode, code: e.target.value.toUpperCase() })}
            placeholder="兑换码（大写）"
            className="bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-1.5 text-sm w-44 font-mono focus:outline-none focus:border-red-500"
          />
          <input
            type="number"
            value={newCode.coins}
            onChange={(e) => setNewCode({ ...newCode, coins: parseInt(e.target.value) || 0 })}
            placeholder="金币"
            className="bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-1.5 text-sm w-24 focus:outline-none focus:border-red-500"
          />
          <input
            type="number"
            value={newCode.maxUses}
            onChange={(e) => setNewCode({ ...newCode, maxUses: parseInt(e.target.value) || 1 })}
            placeholder="最多使用"
            className="bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-1.5 text-sm w-24 focus:outline-none focus:border-red-500"
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

      {/* 批量生成 */}
      <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-4 mb-6">
        <div className="text-sm font-bold mb-3">批量生成</div>
        <div className="flex flex-wrap gap-2 items-center">
          <input
            type="number"
            value={batch.count}
            onChange={(e) => setBatch({ ...batch, count: parseInt(e.target.value) || 1 })}
            placeholder="数量（最多100）"
            className="bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-1.5 text-sm w-32 focus:outline-none focus:border-red-500"
          />
          <input
            type="number"
            value={batch.coins}
            onChange={(e) => setBatch({ ...batch, coins: parseInt(e.target.value) || 0 })}
            placeholder="每个金币数"
            className="bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-1.5 text-sm w-28 focus:outline-none focus:border-red-500"
          />
          <input
            type="number"
            value={batch.maxUses}
            onChange={(e) => setBatch({ ...batch, maxUses: parseInt(e.target.value) || 1 })}
            placeholder="每人限用次数"
            className="bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-1.5 text-sm w-28 focus:outline-none focus:border-red-500"
          />
          <input
            value={batch.prefix}
            onChange={(e) => setBatch({ ...batch, prefix: e.target.value.toUpperCase() })}
            placeholder="前缀"
            className="bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-1.5 text-sm w-24 font-mono focus:outline-none focus:border-red-500"
          />
          <button
            onClick={handleBatch}
            disabled={batching}
            className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm px-4 py-1.5 rounded font-bold"
          >
            {batching ? '生成中...' : '⚡ 批量生成'}
          </button>
        </div>
        <div className="text-xs text-gray-500 mt-2">
          格式：{batch.prefix || 'LUKA'}-XXXXXXXX（8位随机字符）
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
                <th className="p-3">兑换码</th>
                <th className="p-3">金币</th>
                <th className="p-3">已用/上限</th>
                <th className="p-3">状态</th>
                <th className="p-3">创建时间</th>
                <th className="p-3 text-center">操作</th>
              </tr>
            </thead>
            <tbody>
              {codes.map((c) => (
                <tr key={c.id} className="border-b border-[#2a2a2a] hover:bg-[#1a1a1a]">
                  <td className="p-3 font-mono text-orange-400">{c.code}</td>
                  <td className="p-3 text-yellow-500 font-bold">+{c.coins}</td>
                  <td className="p-3 text-gray-400">
                    {c.usedCount} / {c.maxUses}
                  </td>
                  <td className="p-3">
                    <span
                      className={`text-xs px-2 py-0.5 rounded ${
                        c.isActive
                          ? 'bg-green-900/60 text-green-200'
                          : 'bg-red-900/60 text-red-200'
                      }`}
                    >
                      {c.isActive ? '启用' : '停用'}
                    </span>
                  </td>
                  <td className="p-3 text-gray-500 text-xs">{formatDate(c.createdAt)}</td>
                  <td className="p-3 text-center">
                    <button
                      onClick={() => handleDelete(c)}
                      className="bg-red-600 hover:bg-red-700 text-white text-xs px-3 py-1 rounded"
                    >
                      删除
                    </button>
                  </td>
                </tr>
              ))}
              {codes.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center text-gray-500 py-10">
                    暂无兑换码
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
