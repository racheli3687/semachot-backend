import multer from 'multer';
import { MAX_IMAGE_BYTES } from '../lib/image-type';

/**
 * קבלת קובץ תמונה אחד בשדה image (multipart/form-data).
 * הקובץ נשמר בזיכרון בלבד, ומשם עובר למסד הנתונים.
 */
export const uploadImage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_BYTES, files: 1 },
}).single('image');
