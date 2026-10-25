import type { EmailMessage } from '../../services/email';

export interface ReminderDetails {
  celebrationId: number;
  title: string;
  typeLabel: string;
  hebrewDateText: string;
  date: string; // YYYY-MM-DD
  time: string;
  venueName: string;
  address: string | null;
  ownerName: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatIsoForIsrael(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}.${m}.${y}`;
}

/** בניית מייל התזכורת (HTML מימין לשמאל + גרסת טקסט) */
export function buildReminderEmail(
  recipient: { email: string; name: string },
  details: ReminderDetails,
  frontendUrl?: string,
): EmailMessage {
  const link = frontendUrl ? `${frontendUrl.replace(/\/$/, '')}/celebrations/${details.celebrationId}` : null;
  const when = `${details.hebrewDateText} (${formatIsoForIsrael(details.date)}) בשעה ${details.time}`;
  const where = details.address ? `${details.venueName}, ${details.address}` : details.venueName;

  const rows: [string, string][] = [
    ['סוג השמחה', details.typeLabel],
    ['מתי', when],
    ['איפה', where],
    ['פורסם על ידי', details.ownerName],
  ];

  const html = `<!doctype html>
<html lang="he" dir="rtl">
<body style="margin:0;padding:24px;background:#f6f4ef;font-family:Arial,Helvetica,sans-serif;color:#2b2b2b;direction:rtl;text-align:right">
  <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px;padding:28px;border:1px solid #e8e2d6">
    <p style="margin:0 0 8px;font-size:15px">שלום ${escapeHtml(recipient.name)},</p>
    <h1 style="margin:0 0 20px;font-size:22px;color:#7a5c1e">היום: ${escapeHtml(details.title)} 🎉</h1>
    <table style="width:100%;border-collapse:collapse;font-size:15px">
      ${rows
        .map(
          ([label, value]) =>
            `<tr><td style="padding:6px 0;color:#777;width:110px;vertical-align:top">${escapeHtml(label)}</td><td style="padding:6px 0">${escapeHtml(value)}</td></tr>`,
        )
        .join('\n      ')}
    </table>
    ${link ? `<p style="margin:24px 0 0"><a href="${escapeHtml(link)}" style="background:#7a5c1e;color:#ffffff;text-decoration:none;padding:10px 18px;border-radius:8px;display:inline-block">לפרטי השמחה</a></p>` : ''}
    <p style="margin:28px 0 0;font-size:12px;color:#999">קיבלת את ההודעה כי את/ה חבר/ה בקבוצה בלוח השמחות. אפשר לכבות תזכורות בהגדרות הפרופיל.</p>
  </div>
</body>
</html>`;

  const text = [
    `שלום ${recipient.name},`,
    `היום: ${details.title}`,
    ...rows.map(([label, value]) => `${label}: ${value}`),
    ...(link ? [`לפרטים: ${link}`] : []),
    '',
    'אפשר לכבות תזכורות בהגדרות הפרופיל.',
  ].join('\n');

  return { to: recipient, subject: `תזכורת: ${details.title} - היום`, html, text };
}
