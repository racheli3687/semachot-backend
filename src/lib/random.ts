import { randomBytes, randomInt } from 'node:crypto';

// בלי תווים שקל להתבלבל ביניהם: O/0, I/1
const JOIN_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const JOIN_CODE_LENGTH = 8;

/** קוד הצטרפות אקראי לקבוצה, למשל K7M2QX9P */
export function generateJoinCode(): string {
  let code = '';
  for (let i = 0; i < JOIN_CODE_LENGTH; i++) {
    code += JOIN_CODE_ALPHABET[randomInt(JOIN_CODE_ALPHABET.length)];
  }
  return code;
}

/** מזהה אקראי וארוך לכתובת של תמונה (192 ביט - בלתי ניתן לניחוש) */
export function generateImageKey(): string {
  return randomBytes(24).toString('base64url');
}
