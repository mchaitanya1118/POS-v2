/**
 * utility helper to dispatch webhook events to n8n workflow automation via a local API proxy.
 * Events are triggered client-side when key actions happen in the POS.
 */

export async function triggerN8nWebhook(event: string, data: any) {
  try {
    const payload = {
      event,
      timestamp: new Date().toISOString(),
      data,
    };

    // Call our local Next.js proxy route, completely avoiding CORS issues
    fetch('/api/webhook/n8n', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    }).then((response) => {
      if (!response.ok) {
        console.warn(`[n8n Webhook Proxy] Local route responded with status ${response.status}`);
      }
    }).catch((err) => {
      console.warn('[n8n Webhook Proxy] Network error:', err);
    });

  } catch (error) {
    console.error('[n8n Webhook Proxy] Setup error:', error);
  }
}
