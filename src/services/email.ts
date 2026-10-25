import { env, isEmailConfigured } from '../config/env';

export interface EmailMessage {
  to: { email: string; name: string };
  subject: string;
  html: string;
  text: string;
}

const BREVO_ENDPOINT = 'https://api.brevo.com/v3/smtp/email';

/** האם שירות המייל מוגדר (מפתח Brevo + כתובת שולח) */
export function emailEnabled(): boolean {
  return isEmailConfigured;
}

/**
 * שליחת מייל דרך ה-API של Brevo (בקשת HTTPS רגילה, לא SMTP -
 * כי בשרתים חינמיים של Render יציאת SMTP חסומה).
 */
export async function sendEmail(message: EmailMessage): Promise<void> {
  if (!env.BREVO_API_KEY || !env.EMAIL_FROM_ADDRESS) {
    throw new Error('Email is not configured');
  }

  const response = await fetch(BREVO_ENDPOINT, {
    method: 'POST',
    headers: {
      'api-key': env.BREVO_API_KEY,
      'content-type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify({
      sender: { name: env.EMAIL_FROM_NAME, email: env.EMAIL_FROM_ADDRESS },
      to: [{ email: message.to.email, name: message.to.name }],
      subject: message.subject,
      htmlContent: message.html,
      textContent: message.text,
    }),
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Brevo responded ${response.status}: ${body.slice(0, 300)}`);
  }
}
