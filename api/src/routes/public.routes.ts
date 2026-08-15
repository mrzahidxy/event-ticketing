import { Role } from '@prisma/client';
import { Router } from 'express';

import { organizerController } from '../controllers/organizer.controller';
import { bookingController } from '../controllers/booking.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import { organizerIdParamSchema } from '../schemas/organizer.schema';
import { createPublicBookingSchema } from '../schemas/booking.schema';

const router = Router();

router.get('/organizers', organizerController.listPublic);

router.get(
  '/organizers/:organizerId',
  validateRequest(organizerIdParamSchema, 'params'),
  organizerController.getPublicById
);

router.post(
  '/organizers/:organizerId/bookings',
  requireAuth([Role.USER]),
  validateRequest(organizerIdParamSchema, 'params'),
  validateRequest(createPublicBookingSchema),
  bookingController.createPublicSubmission
);

export default router;
