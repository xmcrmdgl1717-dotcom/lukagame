import React, { useEffect, useState } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'https://luka-1i4g.onrender.com';

const hdr = () => ({
  'x-admin-username': JSON.parse(localStorage.getItem('adminInfo') || 'null')?.username || '',
  'x-admin-password': localStorage.getItem('adminPassword') || '',
  'Content-Type': 'application/json',
});

const PRESET_SYMBOLS = ['💎', '🪙', '💰', '⭐', '🔮', '💠', '👑', '🎖️', '🏆'];

export default function CurrencySettingPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '钻石',
    symbol: '💎',
    shortName: 'DIAMOND',
    ratio: 100,
    enabled: true,
  });

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API_URL}/api/admin/currency-setting`, { headers: hdr() });
      setForm({
        name: data.name,
        symbol: data.symbol,
        shortName: data.shortName,
        ratio: data.ratio,
        enabled: data.enabled,
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.name || !form.name.trim()) return alert('请填写币种名称');
    if (!form.symbol || !form.symbol.trim()) return alert('请填写币种符号');
    if (!form.ratio || form.ratio <= 0) return alert('比例必须是正整数');

    setSaving(true);
    try {
      await axios.put(`${API_URL}/api/admin/currency-setting`, {
        name: form.name.trim(),
        symbol: form.symbol.trim(),
        shortName: form.shortName.trim().toUpperCase(),
        ratio: parseInt(form.ratio),
        enabled: !!form.enabled,
      }, { headers: hdr() });
      alert('✅ 保存成功，用户端将在下次刷新后生效');
    } catch (e: any) {
      alert('保存失败: ' + (e.response?.data?.error || e.message));
    } finally {
      setSaving(false);
    }
  };

  // 预设充值金额，展示换算
  const presets = [1000, 3000, 5000, 10000, 30000, 100000]; // 分

  if (loading) return <div className="text-center text-gray-500 py-20">加载中...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">💎 币种管理</h1>
          <div className="text-xs text-gray-500 mt-1">
            配置平台虚拟货币的显示名称、符号，以及充值比例
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={form.enabled}
            onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
            className="w-4 h-4"
          />
          <span className={form.enabled ? 'text-green-400 font-bold' : 'text-gray-500'}>
            {form.enabled ? '已启用' : '已停用'}
          </span>
        </label>
      </div>

      {/* 说明 */}
      <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-4 mb-4 text-sm text-gray-400">
        💡 <span className="text-white font-bold">说明：</span>
        <div className="mt-2 space-y-1 text-xs">
          <div>• 币种名称和符号会显示在用户端所有余额位置（顶部、账变、抽奖等）</div>
          <div>• 「充值比例」定义 1 元人民币可兑换的虚拟币数量，用于充值套餐的换算参考</div>
          <div>• 修改后会立即影响用户端展示（用户下次刷新页面生效）</div>
        </div>
      </div>

      {/* 配置表单 */}
      <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-6 mb-4">
        <div className="text-sm font-bold mb-4">🔧 基础配置</div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-400 mb-1 text-xs">
                币种名称 <span className="text-red-500">*</span>
              </label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="钻石"
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white focus:outline-none focus:border-orange-500"
              />
              <div className="text-[10px] text-gray-600 mt-1">显示给用户看的中文名称，如「钻石」、「金币」</div>
            </div>

            <div>
              <label className="block text-gray-400 mb-1 text-xs">
                英文简称
              </label>
              <input
                value={form.shortName}
                onChange={(e) => setForm({ ...form, shortName: e.target.value.toUpperCase() })}
                placeholder="DIAMOND"
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white font-mono focus:outline-none focus:border-orange-500"
              />
              <div className="text-[10px] text-gray-600 mt-1">用于 API 或内部标识</div>
            </div>
          </div>

          <div>
            <label className="block text-gray-400 mb-1 text-xs">
              币种符号 <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2 items-center flex-wrap">
              <input
                value={form.symbol}
                onChange={(e) => setForm({ ...form, symbol: e.target.value })}
                placeholder="💎"
                maxLength={4}
                className="w-24 bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white text-center text-2xl focus:outline-none focus:border-orange-500"
              />
              <div className="flex gap-1 flex-wrap">
                {PRESET_SYMBOLS.map(s => (
                  <button
                    key={s}
                    onClick={() => setForm({ ...form, symbol: s })}
                    className={`w-10 h-10 rounded text-xl transition ${
                      form.symbol === s
                        ? 'bg-orange-600 border-2 border-orange-400'
                        : 'bg-[#2a2a2a] hover:bg-[#3a3a3a] border border-[#2a2a2a]'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div className="text-[10px] text-gray-600 mt-2">
              建议使用简单的 emoji，兼容 Windows 老系统。如果显示为方框，说明该 emoji 字体缺失，换一个更通用的符号。
            </div>
          </div>

          <div>
            <label className="block text-gray-400 mb-1 text-xs">
              充值比例 <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-sm whitespace-nowrap">1 元 =</span>
              <input
                type="number"
                value={form.ratio}
                onChange={(e) => setForm({ ...form, ratio: parseInt(e.target.value) || 0 })}
                className="w-32 bg-[#0d0d0d] border border-[#2a2a2a] rounded px-3 py-2 text-white text-center font-bold focus:outline-none focus:border-orange-500"
              />
              <span className="text-gray-400 text-sm whitespace-nowrap">
                {form.symbol} {form.name}
              </span>
            </div>
            <div className="text-[10px] text-gray-600 mt-1">
              用于充值套餐的换算参考。例如设置 100，则 30 元充值套餐应配置 3000 钻石。
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-[#2a2a2a]">
          <button
            onClick={load}
            className="px-4 py-2 bg-[#2a2a2a] hover:bg-[#3a3a3a] rounded text-sm"
          >
            重置
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm font-bold disabled:opacity-50"
          >
            {saving ? '保存中...' : '💾 保存配置'}
          </button>
        </div>
      </div>

      {/* 实时预览 */}
      <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-6 mb-4">
        <div className="text-sm font-bold mb-4">👁️ 显示预览</div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-gray-500 mb-2">余额显示（顶部导航栏）</div>
            <div className="bg-[#2a1414] border border-yellow-900/50 rounded-full px-4 py-1.5 inline-flex items-center gap-1">
              <span className="text-yellow-500 font-bold text-sm">{form.symbol}</span>
              <span className="text-yellow-500 font-bold text-sm">9,200</span>
            </div>
          </div>

          <div>
            <div className="text-xs text-gray-500 mb-2">余额卡片</div>
            <div className="bg-gradient-to-br from-[#2d1410] to-[#4a1c12] border border-[#6b2a1e] rounded-xl p-4 text-center">
              <div className="text-[10px] text-gray-400 mb-1">当前余额</div>
              <div className="text-2xl font-black text-yellow-400 flex items-center justify-center gap-2">
                <span>{form.symbol}</span>
                <span>9,200</span>
              </div>
              <div className="text-[10px] text-gray-500 mt-1">{form.name}</div>
            </div>
          </div>
        </div>
      </div>

      {/* 充值金额换算参考 */}
      <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-6">
        <div className="text-sm font-bold mb-4">💡 充值金额换算参考</div>
        <div className="text-xs text-gray-500 mb-3">
          按当前比例（1 元 = {form.ratio} {form.symbol}），常见充值金额的换算：
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {presets.map(cents => {
            const yuan = cents / 100;
            const coins = yuan * form.ratio;
            return (
              <div key={cents} className="bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg p-3 text-center">
                <div className="text-[10px] text-gray-500 mb-1">¥{yuan.toFixed(2)}</div>
                <div className="text-lg font-black text-yellow-400 flex items-center justify-center gap-1">
                  <span className="text-sm">{form.symbol}</span>
                  <span>{coins.toLocaleString()}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
