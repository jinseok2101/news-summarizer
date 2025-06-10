import { NextRequest, NextResponse } from 'next/server';
import { SummaryResponse } from '../../../types/news';

// 다양한 뉴스 사이트별 셀렉터 매핑
const NEWS_SITE_SELECTORS = {
  'naver.com': {
    title: 'h2.media_end_head_headline, h3#articleTitle, .end_tit',
    content: '#dic_area, .go_trans._article_content, #articleBodyContents, .news_end_body_container'
  },
  'daum.net': {
    title: '.tit_view, h3.tit_view',
    content: '.article_view, #harmonyContainer'
  },
  'chosun.com': {
    title: '.article-header__title, h1.title',
    content: '.article-body, .par'
  },
  'joongang.co.kr': {
    title: '.headline, h1.headline',
    content: '.article_body, #article_body'
  },
  'donga.com': {
    title: '.title, h1.title',
    content: '.article_txt, .news_view'
  },
  'hani.co.kr': {
    title: '.article-title, h4.article-title',
    content: '.article-text, .text'
  },
  'khan.co.kr': {
    title: '.art_header h1, .news_title',
    content: '.art_body, .news_body_area'
  }
};

// URL에서 도메인 추출
function extractDomain(url: string): string {
  try {
    const domain = new URL(url).hostname;
    return domain.replace('www.', '');
  } catch {
    return '';
  }
}

// 웹페이지 스크래핑 함수
async function scrapeNewsContent(url: string): Promise<{ title: string; content: string }> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();
    const domain = extractDomain(url);
    
    // Cheerio 대신 간단한 정규식으로 HTML 파싱 (서버 환경에서 안전)
    let title = '';
    let content = '';

    // 기본 title 태그에서 제목 추출
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch) {
      title = titleMatch[1].trim().replace(/\s*-\s*[^-]*$/, ''); // 사이트명 제거
    }

    // Open Graph 태그에서 제목 추출 (더 정확함)
    const ogTitleMatch = html.match(/<meta[^>]*property=['"]\s*og:title\s*['"][^>]*content=['"]\s*([^'"]+)\s*['"]/i);
    if (ogTitleMatch) {
      title = ogTitleMatch[1].trim();
    }

    // 사이트별 맞춤 콘텐츠 추출
    const siteConfig = Object.entries(NEWS_SITE_SELECTORS).find(([site]) => 
      domain.includes(site)
    )?.[1];

    if (siteConfig) {
      // 사이트별 커스텀 추출 로직
      content = extractContentWithSelectors(html, siteConfig.content);
    }

    // 기본 콘텐츠 추출 (사이트별 설정이 없거나 실패한 경우)
    if (!content) {
      content = extractGenericContent(html);
    }

    return {
      title: title || '제목을 찾을 수 없습니다',
      content: content || '내용을 추출할 수 없습니다'
    };

  } catch (error) {
    console.error('스크래핑 오류:', error);
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
    throw new Error(`웹페이지를 가져올 수 없습니다: ${errorMessage}`);
  }
}

// 셀렉터 기반 콘텐츠 추출
function extractContentWithSelectors(html: string, selectors: string): string {
  const selectorList = selectors.split(',').map(s => s.trim());
  
  for (const selector of selectorList) {
    // ID 셀렉터 처리
    if (selector.startsWith('#')) {
      const id = selector.slice(1);
      const idRegex = new RegExp(`<[^>]*id=['"]${id}['"][^>]*>([\s\S]*?)<\/[^>]+>`, 'i');
      const match = html.match(idRegex);
      if (match) {
        return cleanTextContent(match[1]);
      }
    }
    
    // 클래스 셀렉터 처리
    if (selector.startsWith('.')) {
      const className = selector.slice(1);
      const classRegex = new RegExp(`<[^>]*class=['"][^'"]*${className}[^'"]*['"][^>]*>([\s\S]*?)<\/[^>]+>`, 'i');
      const match = html.match(classRegex);
      if (match) {
        return cleanTextContent(match[1]);
      }
    }
  }
  
  return '';
}

// 일반적인 콘텐츠 추출
function extractGenericContent(html: string): string {
  // 여러 일반적인 패턴으로 본문 추출 시도
  const patterns = [
    /<article[^>]*>([\s\S]*?)<\/article>/i,
    /<div[^>]*class=['"][^'"]*content[^'"]*['"][^>]*>([\s\S]*?)<\/div>/i,
    /<div[^>]*class=['"][^'"]*article[^'"]*['"][^>]*>([\s\S]*?)<\/div>/i,
    /<div[^>]*class=['"][^'"]*body[^'"]*['"][^>]*>([\s\S]*?)<\/div>/i,
    /<p[^>]*>([\s\S]*?)<\/p>/gi
  ];

  for (const pattern of patterns) {
    const matches = html.match(pattern);
    if (matches) {
      if (pattern.flags?.includes('g')) {
        // 모든 p 태그 내용 결합
        return matches.map(match => cleanTextContent(match)).join(' ');
      } else {
        const content = cleanTextContent(matches[1]);
        if (content.length > 100) { // 충분한 길이의 콘텐츠만 사용
          return content;
        }
      }
    }
  }

  return '';
}

// HTML 태그 제거 및 텍스트 정리
function cleanTextContent(html: string): string {
  return html
    .replace(/<[^>]+>/g, '') // HTML 태그 제거
    .replace(/&nbsp;/g, ' ') // HTML 엔티티 변환
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ') // 연속된 공백 정리
    .trim();
}

// 개선된 추출 요약 함수
function extractiveSummary(content: string, maxSentences: number = 5): string {
  // 문장 단위로 분리 (한국어 처리 개선)
  const sentences = content
    .split(/[.!?。！？]+/)
    .map(s => s.trim())
    .filter(s => s.length > 15 && !s.match(/^\d+$/) && !s.includes('©')); // 숫자만 있거나 저작권 표시 제외

  if (sentences.length <= maxSentences) {
    return sentences.join('. ') + '.';
  }

  // 불용어 리스트 (한국어)
  const stopwords = new Set(['은', '는', '을', '를', '이', '가', '에', '에서', '로', '으로', '와', '과', '의', '도', '만', '라서', '하지만', '그리고', '또한', '하지만']);

  // 단어 빈도 계산 (불용어 제외)
  const wordFreq: { [key: string]: number } = {};
  const words = content.toLowerCase().match(/[가-힣a-z0-9]+/g) || [];
  
  words.forEach(word => {
    if (word.length > 1 && !stopwords.has(word)) {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    }
  });

  // 문장별 점수 계산 (개선된 알고리즘)
  const sentenceScores = sentences.map((sentence, index) => {
    const sentenceWords = sentence.toLowerCase().match(/[가-힣a-z0-9]+/g) || [];
    
    // 기본 키워드 점수
    const keywordScore = sentenceWords.reduce((sum, word) => {
      return sum + (wordFreq[word] || 0);
    }, 0) / sentenceWords.length;

    // 위치 점수 (앞쪽 문장에 가중치)
    const positionScore = 1 - (index / sentences.length) * 0.3;

    // 길이 점수 (너무 짧거나 긴 문장 페널티)
    const lengthScore = sentence.length > 30 && sentence.length < 200 ? 1 : 0.7;

    return { 
      sentence, 
      score: keywordScore * positionScore * lengthScore,
      originalIndex: index
    };
  });

  // 점수 기준으로 정렬하고 상위 문장들 선택
  const topSentences = sentenceScores
    .sort((a, b) => b.score - a.score)
    .slice(0, maxSentences)
    .sort((a, b) => a.originalIndex - b.originalIndex); // 원래 순서대로 재정렬

  return topSentences.map(item => item.sentence).join('. ') + '.';
}

// Hugging Face API 호출 함수 (개선)
async function summarizeWithHuggingFace(text: string): Promise<string> {
  const API_URL = "https://api-inference.huggingface.co/models/facebook/bart-large-cnn";
  const headers = {
    "Authorization": `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
    "Content-Type": "application/json",
  };

  try {
    // 텍스트를 적절한 길이로 자르기 (토큰 제한 고려)
    const truncatedText = text.substring(0, 800);
    
    const response = await fetch(API_URL, {
      method: "POST",
      headers,
      body: JSON.stringify({
        inputs: truncatedText,
        parameters: {
          max_length: 200,
          min_length: 50,
          do_sample: false,
          temperature: 0.7,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const result = await response.json();
    
    // 에러 응답 처리
    if (result.error) {
      console.error('Hugging Face API 에러:', result.error);
      return '';
    }

    return result[0]?.summary_text || result.summary_text || '';
  } catch (error) {
    console.error('Hugging Face API 오류:', error);
    return '';
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    let title = '';
    let content = '';

    // URL이 제공된 경우 스크래핑
    if (body.url) {
      try {
        const scraped = await scrapeNewsContent(body.url);
        title = scraped.title;
        content = scraped.content;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '웹페이지를 가져올 수 없습니다';
        return NextResponse.json({
          success: false,
          error: errorMessage
        } as SummaryResponse);
      }
    } else {
      // 직접 제목과 내용이 제공된 경우
      title = body.title;
      content = body.content;
    }

    if (!title || !content) {
      return NextResponse.json({
        success: false,
        error: '제목과 본문을 찾을 수 없습니다. 지원되지 않는 웹사이트이거나 콘텐츠에 접근할 수 없습니다.'
      } as SummaryResponse);
    }

    // 콘텐츠가 너무 짧은 경우
    if (content.length < 100) {
      return NextResponse.json({
        success: false,
        error: '요약하기에는 콘텐츠가 너무 짧습니다.'
      } as SummaryResponse);
    }

    let summary = '';

    // 1. Hugging Face API 시도 (환경변수가 있는 경우)
    if (process.env.HUGGINGFACE_API_KEY) {
      summary = await summarizeWithHuggingFace(content);
    }

    // 2. Hugging Face API 실패 시 또는 키가 없는 경우 추출 요약 사용
    if (!summary) {
      summary = extractiveSummary(content);
      
      // 한국어 요약 개선
      summary = `📋 **${title}**

${summary}

---
💡 주요 내용을 추출하여 요약했습니다.`;
    } else {
      // Hugging Face 결과 포맷팅
      summary = `📋 **${title}**

${summary}

---
🤖 AI가 생성한 요약입니다.`;
    }

    return NextResponse.json({
      success: true,
      summary: summary.trim(),
      title,
      contentLength: content.length
    } as SummaryResponse);

  } catch (error) {
    console.error('요약 생성 오류:', error);
    const errorMessage = error instanceof Error ? error.message : '요약 생성 중 오류가 발생했습니다';

    return NextResponse.json({
      success: false,
      error: errorMessage
    } as SummaryResponse);
  }
}