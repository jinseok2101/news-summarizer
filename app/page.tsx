'use client';

import { useState } from 'react';
import { NewsArticle } from '../types/news';

export default function Home() {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [newsData, setNewsData] = useState<NewsArticle | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!url.trim()) {
      setError('URL을 입력해주세요.');
      return;
    }

    // URL 유효성 검사
    try {
      new URL(url);
    } catch {
      setError('올바른 URL을 입력해주세요.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setNewsData(null);

    try {
      // 1단계: 뉴스 본문 추출
      const extractResponse = await fetch('/api/extract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      const extractData = await extractResponse.json();

      if (!extractData.success) {
        throw new Error(extractData.error || '뉴스 추출에 실패했습니다.');
      }

      // 2단계: AI 요약
      const summaryResponse = await fetch('/api/summarize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          title: extractData.title,
          content: extractData.content 
        }),
      });

      const summaryData = await summaryResponse.json();

      if (!summaryData.success) {
        throw new Error(summaryData.error || '요약 생성에 실패했습니다.');
      }

      // 결과 저장
      setNewsData({
        url,
        title: extractData.title,
        content: extractData.content,
        summary: summaryData.summary,
        extractedAt: new Date(),
      });

    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setUrl('');
    setNewsData(null);
    setError(null);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* 헤더 */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            📰 뉴스 요약기
          </h1>
          <p className="text-lg text-gray-600">
            뉴스 URL을 입력하면 AI가 핵심 내용을 요약해드립니다
          </p>
        </div>

        {/* URL 입력 폼 */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-2">
                뉴스 URL
              </label>
              <input
                type="url"
                id="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/news-article"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition duration-200"
                disabled={isLoading}
              />
            </div>
            
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-3 px-6 rounded-lg transition duration-200 flex items-center justify-center"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    요약 중...
                  </>
                ) : (
                  '요약하기'
                )}
              </button>
              
              {(newsData || error) && (
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition duration-200"
                >
                  초기화
                </button>
              )}
            </div>
          </form>
        </div>

        {/* 에러 표시 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <p className="text-red-800">{error}</p>
            </div>
          </div>
        )}

        {/* 요약 결과 */}
        {newsData && (
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            {/* 뉴스 제목 */}
            <div className="bg-gray-50 px-6 py-4 border-b">
              <h2 className="text-xl font-semibold text-gray-800 leading-tight">
                {newsData.title}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {newsData.extractedAt.toLocaleString('ko-KR')} • {newsData.url}
              </p>
            </div>

            {/* AI 요약 */}
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className="bg-blue-100 p-2 rounded-lg mr-3">
                  🤖
                </div>
                <h3 className="text-lg font-semibold text-gray-800">AI 요약</h3>
              </div>
              
              <div className="bg-blue-50 rounded-lg p-4 mb-6">
                <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">
                  {newsData.summary}
                </p>
              </div>

              {/* 원문 미리보기 */}
              <details className="group">
                <summary className="flex items-center cursor-pointer text-gray-600 hover:text-gray-800 font-medium">
                  <svg className="w-4 h-4 mr-2 transform group-open:rotate-90 transition-transform" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                  원문 보기
                </summary>
                <div className="mt-4 p-4 bg-gray-50 rounded-lg max-h-96 overflow-y-auto">
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {newsData.content.substring(0, 2000)}
                    {newsData.content.length > 2000 && '...'}
                  </p>
                </div>
              </details>
            </div>
          </div>
        )}

        {/* 푸터 */}
        <div className="text-center mt-12 text-gray-500">
          <p>Made with Next.js & TypeScript</p>
        </div>
      </div>
    </main>
  );
}