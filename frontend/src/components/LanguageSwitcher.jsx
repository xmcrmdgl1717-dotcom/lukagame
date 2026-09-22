import { useState } from 'react';
import { useI18n } from '../i18n/index.jsx';

// 语言代码 → 显示样式（避免 emoji 在 Windows 下不显示）
const LANG_STYLE = {
  'zh-CN': { label: 'CN', bg: 'bg-red-600' },
  'en-US': { label: 'US', bg: 'bg-blue-600' },
  'es-ES': { label: 'ES', bg: 'bg-yellow-600' },
  'ja-JP': { label: 'JP', bg: 'bg-pink-600' },
  'ko-KR': { label: 'KR', bg: 'bg-purple-600' },
};

export default function LanguageSwitcher() {
  const { lang, languages, changeLang } = useI18n();
  const [open, setOpen] = useState(false);

  if (!languages || languages.length <= 1) return null;

  const current = languages.find((l) => l.code === lang) || languages[0];
  const style = LANG_STYLE[current.code] || { label: current.code.slice(0, 2).toUpperCase(), bg: 'bg-gray-600' };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`${style.bg} text-white text-[10px] font-bold w-7 h-7 rounded-full flex items-center justify-center shadow-md`}
      >
        {style.label}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)}></div>
          <div className="absolute right-0 top-full mt-2 bg-[#1a0f0c] border border-[#3d1a1a] rounded-lg shadow-xl z-50 min-w-[150px] overflow-hidden">
            {languages.map((l) => {
              const s = LANG_STYLE[l.code] || { label: l.code.slice(0, 2).toUpperCase(), bg: 'bg-gray-600' };
              return (
                <button
                  key={l.code}
                  onClick={() => { changeLang(l.code); setOpen(false); }}
                  className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2 hover:bg-[#2a1414] transition ${l.code === lang ? 'text-orange-400 font-bold' : 'text-gray-300'}`}
                >
                  <span className={`${s.bg} text-white text-[10px] font-bold w-6 h-6 rounded-full flex items-center justify-center`}>{s.label}</span>
                  <span>{l.name}</span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
