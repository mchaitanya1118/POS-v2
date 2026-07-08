import { Injectable } from '@nestjs/common';

@Injectable()
export class WhatsappService {
  async sendMessage(recipient: string, text: string): Promise<{ success: boolean; status: string; error?: string }> {
    const twilioSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioFrom = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886'; // Twilio sandbox number

    const metaToken = process.env.WHATSAPP_API_TOKEN;
    const metaPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;

    // Clean phone number format
    let cleanPhone = recipient.replace(/\s+/g, '');
    if (!cleanPhone.startsWith('+')) {
      cleanPhone = '+' + cleanPhone;
    }

    try {
      // 1. Try Meta WhatsApp Cloud API
      if (metaToken && metaPhoneId) {
        console.log(`[WhatsApp Service] Dispatching via Meta Cloud API to ${cleanPhone}...`);
        const metaRecipient = cleanPhone.replace(/^\+/, ''); // Meta format lacks leading '+'

        const response = await fetch(
          `https://graph.facebook.com/v18.0/${metaPhoneId}/messages`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${metaToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              messaging_product: 'whatsapp',
              to: metaRecipient,
              type: 'text',
              text: { body: text },
            }),
          }
        );

        const resData = (await response.json()) as any;
        if (!response.ok) {
          console.error(`[WhatsApp Service] Meta API Error:`, resData);
          return { success: false, status: 'failed', error: resData?.error?.message || 'Meta API error' };
        }

        console.log(`[WhatsApp Service] Meta message sent successfully:`, resData?.messages?.[0]?.id);
        return { success: true, status: 'sent' };
      }

      // 2. Try Twilio WhatsApp API
      if (twilioSid && twilioAuthToken) {
        console.log(`[WhatsApp Service] Dispatching via Twilio to ${cleanPhone}...`);
        
        const params = new URLSearchParams();
        params.append('To', `whatsapp:${cleanPhone}`);
        params.append('From', twilioFrom.startsWith('whatsapp:') ? twilioFrom : `whatsapp:${twilioFrom}`);
        params.append('Body', text);

        const auth = Buffer.from(`${twilioSid}:${twilioAuthToken}`).toString('base64');

        const response = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Basic ${auth}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: params.toString(),
          }
        );

        const resData = (await response.json()) as any;
        if (!response.ok) {
          console.error(`[WhatsApp Service] Twilio API Error:`, resData);
          return { success: false, status: 'failed', error: resData?.message || 'Twilio API error' };
        }

        console.log(`[WhatsApp Service] Twilio message sent successfully:`, resData?.sid);
        return { success: true, status: 'sent' };
      }

      // 3. Simulation fallback
      console.log(`[WhatsApp Service] Simulation Mode (No Credentials Configured): logged message to ${cleanPhone}: "${text}"`);
      return { success: true, status: 'sent' };
    } catch (err: any) {
      console.error(`[WhatsApp Service] Exception during sending:`, err);
      return { success: false, status: 'failed', error: err.message || 'Network error' };
    }
  }
}
