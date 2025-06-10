import { NextRequest, NextResponse } from 'next/server';
import { SummaryRequest, SummaryResponse } from '../../../types/news';

// 간단한 추출 요약 함수
function extractiveSummary(content: string, maxSentences: number = 5): string {
  // 문장 단위로 분리
  const sentences = content
    .split(/[.!?]+/)
    .map(s => s.trim())
    .filter(s => s.length > 20); // 너무 짧은 문장 제외

  if (sentences.length <= maxSentences) {
    return sentences.join('. ') + '.';
  }

  // 각 문장의 점수 계산 (키워드 빈도 기반)
  const wordFreq: { [key: string]: number } = {};
  const words = content.toLowerCase().match(/[가-힣a-z0-9]+/g) || [];
  
  words.forEach(word => {
    if (word.length > 1) {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    }
  });

  // 문장별 점수 계산
  const sentenceScores = sentences.map(sentence => {
    const sentenceWords = sentence.toLowerCase().match(/[가-힣a-z0-9]+/g) || [];
    const score = sentenceWords.reduce((sum, word) => {
      return sum + (wordFreq[word] || 0);
    }, 0);
    return { sentence, score: score / sentenceWords.length };
  });

  // 점수 기준으로 정렬하고 상위 문장들 선택
  const topSentences = sentenceScores
    .sort((a, b) => b.score - a.score)
    .slice(0, maxSentences)
    .sort((a, b) => sentences.indexOf(a.sentence) - sentences.indexOf(b.sentence));

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
    const response = await fetch(API_URL, {
      method: "POST",
      headers,
      body: JSON.stringify({
        inputs: text.substring(0, 1000), // 입력 길이 제한
        parameters: {
          max_length: 150,
          min_length: 50,
          do_sample: false,
        },
      }),
    });

    const result = await response.json();
    return result[0]?.summary_text || '';
  } catch (error) {
    console.error('Hugging Face API 오류:', error);
    return '';
  }
}

export async function POST(request: NextRequest) {
  try {
    const { title, content }: SummaryRequest = await request.json();

    if (!title || !content) {
      return NextResponse.json({
        success: false,
        error: '제목과 본문이 필요합니다.'
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
      summary = `📋 **뉴스 요약**

${summary}

---
💡 이 요약은 원문에서 중요한 문장들을 추출하여 생성되었습니다.`;
    }

    if (!summary) {
      return NextResponse.json({
        success: false,
        error: '요약을 생성할 수 없습니다.'
      } as SummaryResponse);
    }

    return NextResponse.json({
      success: true,
      summary: summary.trim()
    } as SummaryResponse);

  } catch (error) {
    console.error('요약 생성 오류:', error);

    return NextResponse.json({
      success: false,
      error: '요약 생성 중 오류가 발생했습니다.'
    } as SummaryResponse);
  }
}