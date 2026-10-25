import type { CelebrationType } from '@prisma/client';

/** סוגי השמחות ושמם בעברית, לפי סדר ההצגה בטופס */
export const CELEBRATION_TYPE_LABELS: Record<CelebrationType, string> = {
  ENGAGEMENT: 'אירוסין / ווארט',
  WEDDING: 'חתונה',
  SHEVA_BRACHOT: 'שבע ברכות',
  BRIT_MILAH: 'ברית מילה',
  PIDYON_HABEN: 'פדיון הבן',
  KIDDUSH: 'קידוש / שמחת בת',
  UPSHERIN: 'חלאקה / תספורת',
  BAR_MITZVAH: 'בר מצווה',
  BAT_MITZVAH: 'בת מצווה',
  SIYUM: 'סיום מסכת',
  CHANUKAT_BAYIT: 'חנוכת בית',
  OTHER: 'אחר',
};

export const CELEBRATION_TYPES = Object.keys(CELEBRATION_TYPE_LABELS) as [
  CelebrationType,
  ...CelebrationType[],
];
