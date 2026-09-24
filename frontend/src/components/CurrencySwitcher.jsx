import { useState } from 'react';
import { useStore } from '../store';

const FIAT_STYLE = {
  USD: { bg: 'bg-green-700' },
  CNY: { bg: 'bg-red-700' },
  EUR: { bg: 'bg-blue-700' },
  JPY: { bg: 'bg-pink-700' },
  HKD: { bg: 'bg-yellow-700' },
  GBP: { bg: 'bg-purple-700' },
  KRW: { bg: 'bg-cyan-700' },
  SGD: { bg: 'bg-orange-700' },
};

export default function CurrencySwitcher() {
  const { currency } = useStore();
  const [open, setOpen] = useState(false);

  const fiats = currency?.fiats || [];
  if (fiats.length <= 1) return null;

  const preferredCode = localStorage.getItem('luka_preferred_fiat');
  const current = fiats.find(f => f.code === preferredCode)
    || fiats.find(f => f.isDefault)
    || fiats[0];

  const style = FIAT_STYLE[current.code] || { bg: 'bg-gray-600' };

  const changeFiat = (code) => {
    localStorage.setItem('luka_preferred_fiat', code);
    setOpen(false);
    // 触发重新渲染（自定义事件让父组件感知）
    window.dispatchEvent(new CustomEvent('fiat-changed', { detail: { code } }));
    // 简单刷新方案
    window.location.reload();
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`${style.bg} text-white text-[10px] font-bold h-7 px-2 rounded-full flex items-center gap-1 shadow-md`}
        title={`当前币种：${current.name}`}
      >
        {current.flag ? <span className="text-xs">{current.flag}</span> : null}
        <span>{current.code}</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)}></div>
          <div className="absolute right-0 top-full mt-2 bg-[#1a0f0c] border border-[#3d1a1a] rounded-lg shadow-xl z-50 min-w-[180px] overflow-hidden">
            <div className="px-3 py-2 border-b border-[#2a1414] text-[10px] text-gray-500">
              选择结算币种
            </div>
            {fiats.map((f) => {
              const s = FIAT_STYLE[f.code] || { bg: 'bg-gray-600' };
              return (
                <button
                  key={f.code}
                  onClick={() => changeFiat(f.code)}
                  className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2 hover:bg-[#2a1414] transition ${
                    f.code === current.code ? 'text-orange-400 font-bold' : 'text-gray-300'
                  }`}
                >
                  <span className={`${s.bg} text-white text-[10px] font-bold w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0`}>
                    {f.symbol}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      {f.flag && <span>{f.flag}</span>}
                      <span className="truncate">{f.name}</span>
                    </div>
                    <div className="text-[9px] text-gray-500 font-mono">
                      {f.code} · 1 = {f.ratio} 💎
                    </div>
                  </div>
                  {f.code === current.code && <span className="text-orange-400">✓</span>}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
