import { NextRequest, NextResponse } from 'next/server';
import { SummaryResponse } from '../../../types/news';

// 지원되는 뉴스 사이트 목록 (실제 도메인 패턴 포함)
const SUPPORTED_NEWS_SITES = {
  'naver.com': '네이버 뉴스',
  'n.news.naver.com': '네이버 뉴스',
  'news.naver.com': '네이버 뉴스',
  'daum.net': '다음 뉴스',
  'v.daum.net': '다음 뉴스',
  'chosun.com': '조선일보',
  'joongang.co.kr': '중앙일보',
  'donga.com': '동아일보',
  'hani.co.kr': '한겨레',
  'khan.co.kr': '경향신문',
  'hankyung.com': '한국경제',
  'mk.co.kr': '매일경제',
  'newsis.com': '뉴시스',
  'ytn.co.kr': 'YTN',
  'sbs.co.kr': 'SBS',
  'kbs.co.kr': 'KBS'
};

// 다양한 뉴스 사이트별 셀렉터 매핑 (네이버 뉴스 셀렉터 개선)
const NEWS_SITE_SELECTORS = {
  'naver': {
    title: 'h2.media_end_head_headline, h3#articleTitle, .end_tit, .media_end_head_headline',
    content: '#dic_area, .go_trans._article_content, #articleBodyContents, .news_end_body_container, .media_end_body_container'
  },
  'daum': {
    title: '.tit_view, h3.tit_view, .head_view .tit_view',
    content: '.article_view, #harmonyContainer, .news_view .article_view'
  },
  'chosun': {
    title: '.article-header__title, h1.title, .news-title',
    content: '.article-body, .par, .news-letter-content'
  },
  'joongang': {
    title: '.headline, h1.headline, .article-headline',
    content: '.article_body, #article_body, .article-content'
  },
  'donga': {
    title: '.title, h1.title, .article-title',
    content: '.article_txt, .news_view, .article-content'
  },
  'hani': {
    title: '.article-title, h4.article-title, .news-title',
    content: '.article-text, .text, .article-content'
  },
  'khan': {
    title: '.art_header h1, .news_title, .article-title',
    content: '.art_body, .news_body_area, .article-body'
  },
  'hankyung': {
    title: '.headline, .article-headline, h1.title',
    content: '.article-body, .txt, .article-txt'
  },
  'mk': {
    title: '.news_ttl, h1.news_ttl, .article-title',
    content: '.news_cnt_detail_wrap, .news_cnt, .article-body'
  },
  'newsis': {
    title: '.articleSubject, h1.articleSubject, .news-title',
    content: '.viewer, .articleBody, .article-content'
  },
  'ytn': {
    title: '.headline, .article_title, .news-title',
    content: '.article_txt, .news_content, .article-body'
  },
  'sbs': {
    title: '.text-h1, h1.title, .article-title',
    content: '.article_body, .text_area, .article-content'
  },
  'kbs': {
    title: '.headline-title, h1.title, .article-title',
    content: '.detail-body, .article-body, .news-content'
  }
};

// URL에서 도메인 추출 및 지원 여부 확인
function extractDomain(url: string): string {
  try {
    const domain = new URL(url).hostname;
    return domain.replace('www.', '');
  } catch {
    return '';
  }
}

function isSupportedSite(domain: string): boolean {
  return Object.keys(SUPPORTED_NEWS_SITES).some(site => 
    domain.includes(site) || domain === site
  );
}

function getSiteKey(domain: string): string {
  // 도메인에서 사이트 키 추출
  if (domain.includes('naver')) return 'naver';
  if (domain.includes('daum')) return 'daum';
  if (domain.includes('chosun')) return 'chosun';
  if (domain.includes('joongang')) return 'joongang';
  if (domain.includes('donga')) return 'donga';
  if (domain.includes('hani')) return 'hani';
  if (domain.includes('khan')) return 'khan';
  if (domain.includes('hankyung')) return 'hankyung';
  if (domain.includes('mk')) return 'mk';
  if (domain.includes('newsis')) return 'newsis';
  if (domain.includes('ytn')) return 'ytn';
  if (domain.includes('sbs')) return 'sbs';
  if (domain.includes('kbs')) return 'kbs';
  return '';
}

function getSupportedSitesList(): string {
  const uniqueSites = new Set(Object.values(SUPPORTED_NEWS_SITES));
  return Array.from(uniqueSites)
    .map(name => `• ${name}`)
    .join('\n');
}

// 웹페이지 스크래핑 함수 (개선된 네이버 뉴스 처리)
async function scrapeNewsContent(url: string): Promise<{ title: string; content: string }> {
  try {
    console.log('스크래핑 시작:', url);
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    const domain = extractDomain(url);
    const siteKey = getSiteKey(domain);
    
    console.log('도메인:', domain, '사이트 키:', siteKey);
    
    let title = '';
    let content = '';

    // 기본 title 태그에서 제목 추출
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch) {
      title = titleMatch[1].trim().replace(/\s*-\s*[^-]*$/, '');
    }

    // Open Graph 태그에서 제목 추출 (더 정확함)
    const ogTitleMatch = html.match(/<meta[^>]*property=['"]\s*og:title\s*['"][^>]*content=['"]\s*([^'"]+)\s*['"]/i);
    if (ogTitleMatch) {
      title = ogTitleMatch[1].trim();
    }

    // 사이트별 맞춤 콘텐츠 추출
    const siteConfig = NEWS_SITE_SELECTORS[siteKey as keyof typeof NEWS_SITE_SELECTORS];
    
    if (siteConfig) {
      console.log('사이트 설정 찾음:', siteKey);
      
      // 사이트별 커스텀 제목 추출 시도
      const customTitle = extractContentWithSelectors(html, siteConfig.title);
      if (customTitle && customTitle.length > 3) {
        title = customTitle;
        console.log('커스텀 제목 추출 성공:', title);
      }
      
      // 사이트별 커스텀 콘텐츠 추출
      content = extractContentWithSelectors(html, siteConfig.content);
      console.log('커스텀 콘텐츠 추출 결과:', content ? `${content.length}자` : '실패');
    } else {
      console.log('사이트 설정을 찾을 수 없음');
    }

    // 기본 콘텐츠 추출 (사이트별 설정이 없거나 실패한 경우)
    if (!content) {
      console.log('일반 콘텐츠 추출 시도');
      content = extractGenericContent(html);
    }

    // 추가 제목 추출 시도
    if (!title || title.includes('|') || title.includes('-')) {
      console.log('일반 제목 추출 시도');
      const genericTitlePatterns = [
        /<h1[^>]*class=['"][^'"]*title[^'"]*['"][^>]*>([^<]+)<\/h1>/i,
        /<h1[^>]*class=['"][^'"]*headline[^'"]*['"][^>]*>([^<]+)<\/h1>/i,
        /<h2[^>]*class=['"][^'"]*title[^'"]*['"][^>]*>([^<]+)<\/h2>/i,
        /<h2[^>]*class=['"][^'"]*headline[^'"]*['"][^>]*>([^<]+)<\/h2>/i,
        /<h1[^>]*>([^<]+)<\/h1>/i
      ];

      for (const pattern of genericTitlePatterns) {
        const match = html.match(pattern);
        if (match && match[1].trim().length > 5) {
          const extractedTitle = cleanTextContent(match[1]);
          if (!extractedTitle.includes('http') && extractedTitle.length < 200) {
            title = extractedTitle;
            console.log('일반 제목 추출 성공:', title);
            break;
          }
        }
      }
    }

    console.log('최종 결과 - 제목:', title ? '성공' : '실패', '내용:', content ? `${content.length}자` : '실패');

    // 제목이 없어도 빈 문자열로 반환 (에러 메시지 대신)
    return {
      title: title || '',
      content: content || '내용을 추출할 수 없습니다'
    };

  } catch (error) {
    console.error('스크래핑 오류:', error);
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
    throw new Error(`웹페이지를 가져올 수 없습니다: ${errorMessage}`);
  }
}

// 셀렉터 기반 콘텐츠 추출 (개선된 정규식)
function extractContentWithSelectors(html: string, selectors: string): string {
  const selectorList = selectors.split(',').map(s => s.trim());
  
  for (const selector of selectorList) {
    let content = '';
    
    // ID 셀렉터 처리
    if (selector.startsWith('#')) {
      const id = selector.slice(1);
      const idRegex = new RegExp(`<[^>]*id=['"]${id}['"][^>]*>([\s\S]*?)<\/[^>]+>`, 'i');
      const match = html.match(idRegex);
      if (match) {
        content = cleanTextContent(match[1]);
      }
    }
    // 클래스 셀렉터 처리
    else if (selector.startsWith('.')) {
      const className = selector.slice(1);
      const classRegex = new RegExp(`<[^>]*class=['"][^'"]*${className}[^'"]*['"][^>]*>([\s\S]*?)<\/[^>]+>`, 'i');
      const match = html.match(classRegex);
      if (match) {
        content = cleanTextContent(match[1]);
      }
    }
    // 요소 셀렉터 처리
    else {
      const elementRegex = new RegExp(`<${selector}[^>]*>([\s\S]*?)<\/${selector}>`, 'i');
      const match = html.match(elementRegex);
      if (match) {
        content = cleanTextContent(match[1]);
      }
    }
    
    if (content && content.length > 20) {
      return content;
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
    /<div[^>]*class=['"][^'"]*txt[^'"]*['"][^>]*>([\s\S]*?)<\/div>/i,
    /<section[^>]*class=['"][^'"]*article[^'"]*['"][^>]*>([\s\S]*?)<\/section>/i,
    /<main[^>]*>([\s\S]*?)<\/main>/i
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) {
      const content = cleanTextContent(match[1]);
      if (content.length > 100) {
        return content;
      }
    }
  }

  // p 태그들을 모두 수집해서 합치기
  const pTagMatches = html.match(/<p[^>]*>([\s\S]*?)<\/p>/gi);
  if (pTagMatches && pTagMatches.length > 2) {
    const combinedContent = pTagMatches
      .map(match => {
        const pContent = match.replace(/<[^>]+>/g, '');
        return cleanTextContent(pContent);
      })
      .filter(text => text.length > 20)
      .join(' ');
    
    if (combinedContent.length > 100) {
      return combinedContent;
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
  const sentences = content
    .split(/[.!?。！？]+/)
    .map(s => s.trim())
    .filter(s => s.length > 15 && !s.match(/^\d+$/) && !s.includes('©'));

  if (sentences.length <= maxSentences) {
    return sentences.join('. ') + '.';
  }

  const stopwords = new Set(['은', '는', '을', '를', '이', '가', '에', '에서', '로', '으로', '와', '과', '의', '도', '만', '라서', '하지만', '그리고', '또한']);

  const wordFreq: { [key: string]: number } = {};
  const words = content.toLowerCase().match(/[가-힣a-z0-9]+/g) || [];
  
  words.forEach(word => {
    if (word.length > 1 && !stopwords.has(word)) {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    }
  });

  const sentenceScores = sentences.map((sentence, index) => {
    const sentenceWords = sentence.toLowerCase().match(/[가-힣a-z0-9]+/g) || [];
    
    const keywordScore = sentenceWords.reduce((sum, word) => {
      return sum + (wordFreq[word] || 0);
    }, 0) / sentenceWords.length;

    const positionScore = 1 - (index / sentences.length) * 0.3;
    const lengthScore = sentence.length > 30 && sentence.length < 200 ? 1 : 0.7;

    return { 
      sentence, 
      score: keywordScore * positionScore * lengthScore,
      originalIndex: index
    };
  });

  const topSentences = sentenceScores
    .sort((a, b) => b.score - a.score)
    .slice(0, maxSentences)
    .sort((a, b) => a.originalIndex - b.originalIndex);

  return topSentences.map(item => item.sentence).join('. ') + '.';
}

// Hugging Face API 호출 함수
async function summarizeWithHuggingFace(text: string): Promise<string> {
  const API_URL = "https://api-inference.huggingface.co/models/facebook/bart-large-cnn";
  const headers = {
    "Authorization": `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
    "Content-Type": "application/json",
  };

  try {
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
      const domain = extractDomain(body.url);
      console.log('요청 URL:', body.url, '도메인:', domain);
      
      // 지원되는 사이트인지 확인
      if (!isSupportedSite(domain)) {
        return NextResponse.json({
          success: false,
          error: `죄송합니다. '${domain}'은 현재 지원되지 않는 뉴스 사이트입니다.\n\n📰 현재 지원되는 뉴스 사이트:\n${getSupportedSitesList()}\n\n💡 지원되지 않는 사이트의 경우, 뉴스 제목과 본문을 직접 복사해서 붙여넣어 주세요.`
        } as SummaryResponse);
      }

      try {
        const scraped = await scrapeNewsContent(body.url);
        title = scraped.title;
        content = scraped.content;
      } catch (error) {
        console.error('스크래핑 실패:', error);
        const errorMessage = error instanceof Error ? error.message : '웹페이지를 가져올 수 없습니다';
        return NextResponse.json({
          success: false,
          error: `${errorMessage}\n\n💡 문제가 지속되면 뉴스 제목과 본문을 직접 복사해서 붙여넣어 주세요.`
        } as SummaryResponse);
      }
    } else {
      title = body.title;
      content = body.content;
    }

    // 본문이 없으면 에러 반환, 제목이 없어도 본문만 있으면 계속 진행
    if (!content || content === '내용을 추출할 수 없습니다') {
      return NextResponse.json({
        success: false,
        error: '본문을 찾을 수 없습니다.\n\n💡 해결 방법:\n1. 뉴스 제목과 본문을 직접 복사해서 붙여넣기\n2. 지원되는 뉴스 사이트 URL 사용\n\n📰 지원되는 뉴스 사이트:\n' + getSupportedSitesList()
      } as SummaryResponse);
    }

    // 제목이 없으면 기본 제목 설정
    if (!title || title === '제목을 찾을 수 없습니다') {
      title = '뉴스 요약';
    }

    if (content.length < 100) {
      return NextResponse.json({
        success: false,
        error: '요약하기에는 콘텐츠가 너무 짧습니다.'
      } as SummaryResponse);
    }

    let summary = '';

    // Hugging Face API 시도
    if (process.env.HUGGINGFACE_API_KEY) {
      summary = await summarizeWithHuggingFace(content);
    }

    // 추출 요약 사용
    if (!summary) {
      summary = extractiveSummary(content);
      
      summary = `📋 **${title}**

${summary}

---
💡 주요 내용을 추출하여 요약했습니다.`;
    } else {
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