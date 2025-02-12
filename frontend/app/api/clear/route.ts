import { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  const body = await req.json();
  console.log('Clear request body:', body);  // 요청 바디 로깅
  
  const response = await fetch('http://localhost:8000/api/clear', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();
  console.log('Clear response:', data);  // 응답 로깅
  return Response.json(data, { status: response.status });
} 