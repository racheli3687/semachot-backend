import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authRateLimit } from '../../middleware/rate-limit';
import * as controller from './auth.controller';

export const authRouter = Router();

authRouter.post('/register', authRateLimit, controller.register);
authRouter.post('/login', authRateLimit, controller.login);
authRouter.get('/me', authenticate, controller.getMe);
authRouter.patch('/me', authenticate, controller.updateMe);
