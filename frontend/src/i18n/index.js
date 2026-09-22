import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const I18nContext = createContext(null);

export function I18nProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem('lang') || 'zh-CN');
  const [translations, setTranslations] = useState({});
  const [languages, setLanguages] = useState([]);

  // 加载语言列表
  useEffect(() => {
    axios.get(`${API_URL}/api/languages`).then((res) => {
      setLanguages(res.data);
      const has = res.data.find((l) => l.code === lang);
      if (!has && res.data.length > 0) {
        const def = res.data.find((l) => l.isDefault) || res.data[0];
        setLang(def.code);
        localStorage.setItem('lang', def.code);
      }
    }).catch(() => {});
  }, []);

  // 加载当前语言的词条
  useEffect(() => {
    if (!lang) return;
    axios.get(`${API_URL}/api/translations/${lang}`).then((res) => {
      setTranslations(res.data || {});
    }).catch(() => {});
  }, [lang]);

  const changeLang = (code) => {
    setLang(code);
    localStorage.setItem('lang', code);
  };

  const t = (key, fallback) => {
    return translations[key] || fallback || key;
  };

  return (
    <I18nContext.Provider value={{ lang, languages, changeLang, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n 必须在 I18nProvider 内使用');
  return ctx;
}
