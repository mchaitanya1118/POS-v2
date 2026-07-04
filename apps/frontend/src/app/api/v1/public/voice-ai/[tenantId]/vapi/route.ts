import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId } = await context.params;
    const body = await request.json();
    
    // Forward the webhook call to the NestJS backend
    const backendHost = process.env.BACKEND_URL || 'http://localhost:3001';
    const backendUrl = `${backendHost}/api/v1/public/voice-ai/${tenantId}/vapi`;
    
    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error: any) {
    console.error('Error forwarding Vapi webhook:', error);
    return NextResponse.json(
      { result: `Internal forwarding error: ${error.message}` },
      { status: 500 }
    );
  }
}
