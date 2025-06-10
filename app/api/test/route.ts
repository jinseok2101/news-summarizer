import { NextResponse } from 'next/server';

export async function GET() {
  const apiKey = process.env.OPENAI_API_KEY;
  
  return NextResponse.json({
    hasApiKey: !!apiKey,
    keyPrefix: apiKey ? apiKey.substring(0, 10) + '...' : 'No key found'
  });
}