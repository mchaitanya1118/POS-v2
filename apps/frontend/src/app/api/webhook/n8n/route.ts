import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    const webhookUrl = process.env.N8N_WEBHOOK_URL;

    if (!webhookUrl) {
      console.warn('[n8n Proxy] N8N_WEBHOOK_URL environment variable is not defined.');
      return NextResponse.json({ error: 'Webhook URL not configured' }, { status: 400 });
    }

    console.log(`[n8n Proxy] Forwarding event to n8n: ${payload.event}`);

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[n8n Proxy] n8n responded with status ${response.status}: ${errText}`);
      return NextResponse.json({ error: `n8n responded with error: ${response.status}` }, { status: response.status });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[n8n Proxy] Error forwarding to n8n:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
