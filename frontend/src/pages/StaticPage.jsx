import { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const FALLBACK_TITLES = {
  about: '关于我们',
  terms: '用户协议',
  privacy: '隐私政策',
  contact: '联系我们',
};

export default function StaticPage({ slug, onBack }) {
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setNotFound(false);
    axios.get(`${API_URL}/api/articles/${slug}`)
      .then((res) => setArticle(res.data))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [slug]);

  const title = article?.title || FALLBACK_TITLES[slug] || slug;

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <button onClick={onBack} className="text-gray-400 text-sm hover:text-white">← 返回</button>
        <h2 className="text-lg font-bold text-orange-400">{title}</h2>
      </div>

      {loading ? (
        <div className="text-center text-gray-500 py-20 text-sm">加载中...</div>
      ) : notFound ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-500">
          <div className="text-5xl mb-4 opacity-30">📄</div>
          <div className="text-sm">页面内容暂未配置</div>
          <div className="text-xs text-gray-600 mt-2">管理员可在后台「通知管理 → 文章管理」中配置此页面内容</div>
        </div>
      ) : (
        <div>
          {article?.coverUrl && (
            <img src={article.coverUrl} className="w-full rounded-xl mb-4" alt={title} />
          )}
          <div
            className="prose prose-invert max-w-none text-sm text-gray-300 leading-relaxed article-content"
            dangerouslySetInnerHTML={{ __html: article?.content || '<p>暂无内容</p>' }}
          />
        </div>
      )}

      <style>{`
        .article-content h1, .article-content h2, .article-content h3 {
          color: #fff;
          font-weight: 700;
          margin-top: 1.2em;
          margin-bottom: 0.6em;
        }
        .article-content h2 { font-size: 1.15rem; }
        .article-content h3 { font-size: 1rem; }
        .article-content p {
          margin-bottom: 0.8em;
          color: #d1d5db;
        }
        .article-content img {
          max-width: 100%;
          border-radius: 8px;
          margin: 1em 0;
        }
        .article-content a {
          color: #f97316;
          text-decoration: underline;
        }
        .article-content ul, .article-content ol {
          margin: 0.8em 0;
          padding-left: 1.5em;
        }
        .article-content li { margin-bottom: 0.4em; }
        .article-content strong { color: #fff; }
      `}</style>
    </div>
  );
}
