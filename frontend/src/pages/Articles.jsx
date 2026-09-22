import { useState, useEffect } from 'react';
import { useI18n } from '../i18n/index.jsx';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const CAT_LABELS = { NEWS: '新闻', HELP: '帮助', ACTIVITY: '活动', SYSTEM: '系统' };

export default function Articles({ onOpenArticle, onBack }) {
  const { t } = useI18n();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterCat, setFilterCat] = useState('');

  useEffect(() => {
    const url = filterCat ? `${API_URL}/api/articles?category=${filterCat}` : `${API_URL}/api/articles`;
    setLoading(true);
    axios.get(url).then(res => setList(res.data)).catch(() => {}).finally(() => setLoading(false));
  }, [filterCat]);

  const fmtDate = (d) => { const x = new Date(d); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`; };

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        {onBack && <button onClick={onBack} className="text-gray-400 text-sm hover:text-white">← {t('common.cancel', '返回')}</button>}
        <h2 className="text-lg font-bold text-orange-400">{t('profile.articles', '新闻资讯')}</h2>
      </div>

      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        <button onClick={() => setFilterCat('')} className={`text-xs px-3 py-1.5 rounded-full whitespace-nowrap font-bold ${filterCat === '' ? 'bg-orange-600 text-white' : 'bg-[#1c0e0e] text-gray-400 border border-[#3d1a1a]'}`}>{t('articles.all', '全部')}</button>
        {['NEWS', 'HELP', 'ACTIVITY'].map(c => (
          <button key={c} onClick={() => setFilterCat(c)} className={`text-xs px-3 py-1.5 rounded-full whitespace-nowrap font-bold ${filterCat === c ? 'bg-orange-600 text-white' : 'bg-[#1c0e0e] text-gray-400 border border-[#3d1a1a]'}`}>{CAT_LABELS[c]}</button>
        ))}
      </div>

      {loading ? (
        <div className="text-center text-gray-500 py-20 text-sm">加载中...</div>
      ) : list.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-500">
          <div className="text-5xl mb-4 opacity-30">📰</div>
          <div className="text-sm">暂无文章</div>
        </div>
      ) : (
        <div className="space-y-3">
          {list.map(a => (
            <div key={a.id} onClick={() => onOpenArticle(a.slug)} className="bg-[#161616] border border-[#2a2a2a] rounded-xl overflow-hidden cursor-pointer hover:border-orange-600/50 transition">
              {a.coverUrl && <img src={a.coverUrl} className="w-full h-40 object-cover" alt={a.title} />}
              <div className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] bg-orange-900/60 text-orange-200 px-2 py-0.5 rounded">{CAT_LABELS[a.category] || a.category}</span>
                  <span className="text-[10px] text-gray-500">{fmtDate(a.createdAt)}</span>
                </div>
                <div className="text-sm font-bold text-white mb-1 truncate">{a.title}</div>
                {a.summary && <div className="text-xs text-gray-500 line-clamp-2">{a.summary}</div>}
                <div className="text-[10px] text-gray-600 mt-2">👁 {a.viewCount}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
