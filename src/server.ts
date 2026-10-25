import { env } from './config/env';
import { prisma } from './db/prisma';
import { createApp } from './app';

const app = createApp();

const server = app.listen(env.PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`✅ השרת פועל בפורט ${env.PORT}`);
  // eslint-disable-next-line no-console
  console.log(`📖 תיעוד Swagger: http://localhost:${env.PORT}/api-docs`);
});

/** סגירה מסודרת (למשל כש-Render מפעיל גרסה חדשה) */
function shutdown(signal: string) {
  // eslint-disable-next-line no-console
  console.log(`${signal} received - shutting down`);
  server.close(() => {
    void prisma.$disconnect().finally(() => process.exit(0));
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
