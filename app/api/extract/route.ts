import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { ExtractRequest, ExtractResponse } from '../../../types/news';

export async function POST(request: NextRequest) {
  try {
    const { url }: ExtractRequest = await request.json();

    if (!url) {
      return NextResponse.json({
        success: false,
        error: 'URL이 필요합니다.'
      } as ExtractResponse);
    }

    // URL 유효성 검사
    try {
      new URL(url);
    } catch {
      return NextResponse.json({
        success: false,
        error: '올바른 URL 형식이 아닙니다.'
      } as ExtractResponse);
    }

    // 웹페이지 가져오기
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
      timeout: 10000, // 10초 타임아웃
    });

    const $ = cheerio.load(response.data);

    // 제목 추출 (여러 선택자 시도)
    let title = '';
    const titleSelectors = [
      'h1',
      '.title',
      '.headline',
      '[class*="title"]',
      '[class*="headline"]',
      'title'
    ];

    for (const selector of titleSelectors) {
      const titleText = $(selector).first().text().trim();
      if (titleText && titleText.length > 0) {
        title = titleText;
        break;
      }
    }

    // 본문 추출 (여러 선택자 시도)
    let content = '';
    const contentSelectors = [
      'article',
      '.article-content',
      '.content',
      '.post-content',
      '.entry-content',
      '[class*="article"]',
      '[class*="content"]',
      'main',
      '.main-content',
      '#content',
      'p'
    ];

    for (const selector of contentSelectors) {
      const contentElements = $(selector);
      if (contentElements.length > 0) {
        let extractedText = '';
        
        if (selector === 'p') {
          // p 태그의 경우 모든 p 태그 텍스트 결합
          contentElements.each((_, element) => {
            const text = $(element).text().trim();
            if (text.length > 20) { // 최소 길이 필터
              extractedText += text + '\n\n';
            }
          });
        } else {
          // 다른 선택자의 경우 첫 번째 요소의 텍스트
          extractedText = contentElements.first().text().trim();
        }

        if (extractedText.length > 200) { // 충분한 내용이 있는 경우
          content = extractedText;
          break;
        }
      }
    }

    // 불필요한 내용 제거
    content = content
      .replace(/\s+/g, ' ') // 연속된 공백 제거
      .replace(/\n\s*\n/g, '\n\n') // 연속된 개행 정리
      .trim();

    // 최소 길이 검사
    if (!title || title.length < 5) {
      return NextResponse.json({
        success: false,
        error: '뉴스 제목을 찾을 수 없습니다. 다른 URL을 시도해보세요.'
      } as ExtractResponse);
    }

    if (!content || content.length < 100) {
      return NextResponse.json({
        success: false,
        error: '뉴스 본문을 찾을 수 없습니다. 다른 URL을 시도해보세요.'
      } as ExtractResponse);
    }

    // 내용이 너무 긴 경우 자르기 (AI API 토큰 제한 고려)
    if (content.length > 8000) {
      content = content.substring(0, 8000) + '...';
    }

    return NextResponse.json({
      success: true,
      title,
      content
    } as ExtractResponse);

  } catch (error) {
    console.error('뉴스 추출 오류:', error);
    
    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNABORTED') {
        return NextResponse.json({
          success: false,
          error: '요청 시간이 초과되었습니다. 다시 시도해보세요.'
        } as ExtractResponse);
      }
      
      if (error.response?.status === 403) {
        return NextResponse.json({
          success: false,
          error: '해당 사이트에서 접근을 차단했습니다.'
        } as ExtractResponse);
      }
      
      if (error.response?.status === 404) {
        return NextResponse.json({
          success: false,
          error: '페이지를 찾을 수 없습니다.'
        } as ExtractResponse);
      }
    }

    return NextResponse.json({
      success: false,
      error: '뉴스를 가져오는 중 오류가 발생했습니다.'
    } as ExtractResponse);
  }
}