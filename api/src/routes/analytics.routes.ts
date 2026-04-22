import { Role } from '@prisma/client';
import rateLimit from 'express-rate-limit';
import { Router } from 'express';

import { analyticsController } from '../controllers/analytics.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import { analyticsQuerySchema } from '../schemas/analytics.schema';

const analyticsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: 'Too many analytics requests from this IP, please try again later.',
  },
});

const router = Router();

router.use(
  requireAuth([Role.ADMIN, Role.OWNER, Role.STAFF]),
  analyticsLimiter
);

router.get('/overview', validateRequest(analyticsQuerySchema, 'query'), analyticsController.overview);
router.get('/bookings', validateRequest(analyticsQuerySchema, 'query'), analyticsController.bookings);
router.get('/payments', validateRequest(analyticsQuerySchema, 'query'), analyticsController.payments);
router.get('/events', validateRequest(analyticsQuerySchema, 'query'), analyticsController.events);
router.get('/users', validateRequest(analyticsQuerySchema, 'query'), analyticsController.users);

export default router;
