import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import { corsOrigins } from './config/env';
import { openApiDocument } from './docs/openapi';
import { errorHandler, notFoundHandler } from './middleware/error-handler';
import { authRouter } from './modules/auth/auth.routes';
import { calendarRouter } from './modules/calendar/calendar.routes';
import { celebrationsRouter, imagesRouter } from './modules/celebrations/celebrations.routes';
import { groupsRouter } from './modules/groups/groups.routes';
import { metaRouter } from './modules/meta/meta.routes';
import { remindersRouter } from './modules/reminders/reminders.routes';
import './validation/zod-setup'; // הודעות שגיאה בעברית

export function createApp() {
  const app = express();

  // השרת רץ מאחורי Proxy בענן (Render) - כדי לזהות נכון https וכתובות IP
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(
    helmet({
      // זה שרת API - אין צורך במדיניות CSP, והיא מפריעה ל-Swagger UI
      contentSecurityPolicy: false,
    }),
  );

  app.use(
    cors({
      origin: corsOrigins.includes('*') ? true : corsOrigins,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      maxAge: 600,
    }),
  );

  app.use(express.json({ limit: '100kb' }));

  // ----- תיעוד -----
  app.get('/api-docs/openapi.json', (_req, res) => {
    res.json(openApiDocument);
  });
  app.use(
    '/api-docs',
    swaggerUi.serve,
    swaggerUi.setup(openApiDocument, {
      customSiteTitle: 'לוח שמחות - API',
      // הצגת הטקסטים העבריים מימין לשמאל
      customCss:
        '.swagger-ui .info .description, .swagger-ui .opblock-summary-description, .swagger-ui .opblock-description-wrapper, .swagger-ui .response-col_description { direction: rtl; text-align: right; }',
      swaggerOptions: { persistAuthorization: true, displayRequestDuration: true },
    }),
  );
  app.get('/', (_req, res) => {
    res.redirect('/api-docs');
  });

  // ----- API -----
  app.use('/api', metaRouter); // /api/health, /api/celebration-types
  app.use('/api/auth', authRouter);
  app.use('/api/groups', groupsRouter);
  app.use('/api/celebrations', celebrationsRouter);
  app.use('/api/images', imagesRouter);
  app.use('/api/hebrew-calendar', calendarRouter);
  app.use('/api/reminders', remindersRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
