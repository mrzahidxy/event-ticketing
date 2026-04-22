import { Router } from 'express';
import rateLimit from 'express-rate-limit';

import { authController } from '../controllers/auth.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import { loginSchema, registerSchema } from '../schemas/auth.schema';

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: 'Too many authentication requests from this IP, please try again later.',
  },
});

router.post('/register', authLimiter, validateRequest(registerSchema), authController.register);

router.post('/login', authLimiter, validateRequest(loginSchema), authController.login);

router.post('/refresh', authLimiter, authController.refresh);

router.post('/logout', authLimiter, authController.logout);

router.get('/me', requireAuth(), authController.me);

export default router;
