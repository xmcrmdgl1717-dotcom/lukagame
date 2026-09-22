import { useState } from 'react';
import { useI18n } from '../i18n';

export default function LanguageSwitcher() {
  const { lang, languages, changeLang } = useI18n();
  const [open, setOpen] = useState(false);

  if (!languages || languages.length <= 1) return null;

  const current = languages.find((l) => l.code === lang) || languages[0];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="text-xs text-gray-400 border border-gray-600 px-2 py-1 rounded-full hover:text-white hover:border-white transition flex items-center gap-1"
      >
        <span>{current.flag || '🌐'}</span>
        <span>{current.code}</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)}></div>
          <div className="absolute right-0 top-full mt-1 bg-[#1a0f0c] border border-[#3d1a1a] rounded-lg shadow-xl z-50 min-w-[140px] overflow-hidden">
            {languages.map((l) => (
              <button
                key={l.code}
                onClick={() => { changeLang(l.code); setOpen(false); }}
                className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2 hover:bg-[#2a1414] transition ${l.code === lang ? 'text-orange-400 font-bold' : 'text-gray-300'}`}
              >
                <span>{l.flag || '🌐'}</span>
                <span>{l.name}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
