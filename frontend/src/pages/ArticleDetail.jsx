import { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function ArticleDetail({ slug, onBack }) {
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setError('');
    axios.get(`${API_URL}/api/articles/${slug}`)
      .then((res) => setArticle(res.data))
      .catch((e) => setError(e.response?.data?.error || '加载失败'))
      .finally(() => setLoading(false));
  }, [slug]);

  const fmtDate = (d) => {
    if (!d) return '';
    const t = new Date(d);
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <button onClick={onBack} className="text-gray-400 text-sm hover:text-white">← 返回</button>
        <h2 className="text-lg font-bold text-orange-400">文章详情</h2>
      </div>

      {loading ? (
        <div className="text-center text-gray-500 py-20 text-sm">加载中...</div>
      ) : error ? (
        <div className="text-center text-red-500 py-20 text-sm">{error}</div>
      ) : !article ? (
        <div className="text-center text-gray-500 py-20 text-sm">文章不存在</div>
      ) : (
        <div>
          {article.coverUrl && (
            <img src={article.coverUrl} className="w-full rounded-xl mb-4" alt={article.title} />
          )}
          <h1 className="text-xl font-bold text-white mb-2">{article.title}</h1>
          <div className="flex items-center gap-3 text-xs text-gray-500 mb-4 pb-4 border-b border-[#2a2a2a]">
            <span>{fmtDate(article.createdAt)}</span>
            <span>👁 {article.viewCount} 次阅读</span>
          </div>
          <div
            className="prose prose-invert max-w-none text-sm text-gray-300 leading-relaxed article-content"
            dangerouslySetInnerHTML={{ __html: article.content || '<p>暂无内容</p>' }}
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
        .article-content blockquote {
          border-left: 3px solid #f97316;
          padding-left: 1em;
          margin: 1em 0;
          color: #9ca3af;
        }
      `}</style>
    </div>
  );
}
