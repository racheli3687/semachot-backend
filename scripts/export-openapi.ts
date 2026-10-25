/**
 * שמירת תיעוד ה-API כקובץ docs/openapi.json
 * הרצה: npm run openapi:export
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { openApiDocument } from '../src/docs/openapi';

const outDir = join(__dirname, '..', 'docs');
mkdirSync(outDir, { recursive: true });
const outFile = join(outDir, 'openapi.json');
writeFileSync(outFile, `${JSON.stringify(openApiDocument, null, 2)}\n`, 'utf8');
console.log(`OpenAPI written to ${outFile}`);
