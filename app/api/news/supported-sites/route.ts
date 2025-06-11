// app/api/news/supported-sites/route.ts
import { NextResponse } from 'next/server';

// 지원되는 뉴스 사이트 목록
const SUPPORTED_NEWS_SITES = {
  'naver.com': '네이버 뉴스',
  'daum.net': '다음 뉴스', 
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

export async function GET() {
  try {
    const sites = Object.entries(SUPPORTED_NEWS_SITES).map(([domain, name]) => ({
      domain,
      name,
      url: `https://${domain}`
    }));

    return NextResponse.json({
      success: true,
      count: sites.length,
      sites,
      message: '현재 지원되는 뉴스 사이트 목록입니다.'
    });
  } catch (error) {
    // 에러 로깅 추가
    console.error('지원 사이트 목록 조회 오류:', error);
    
    return NextResponse.json({
      success: false,
      error: '지원 사이트 목록을 가져오는 중 오류가 발생했습니다.',
      // 개발 환경에서만 상세 오류 정보 제공
      ...(process.env.NODE_ENV === 'development' && { 
        details: error instanceof Error ? error.message : String(error) 
      })
    }, { status: 500 });
  }
}