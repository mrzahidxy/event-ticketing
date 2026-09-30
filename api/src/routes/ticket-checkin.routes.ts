import { Role } from '@prisma/client';
import { Router } from 'express';

import { ticketCheckInController } from '../controllers/ticket-checkin.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import { ticketCheckInSchema } from '../schemas/ticket-checkin.schema';

const router = Router();

router.post(
  '/check-in',
  requireAuth([Role.STAFF, Role.OWNER]),
  validateRequest(ticketCheckInSchema),
  ticketCheckInController.checkIn
);

export default router;
