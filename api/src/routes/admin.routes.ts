import { Role } from '@prisma/client';
import { Router } from 'express';

import { adminController } from '../controllers/admin.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import { organizerIdParamSchema } from '../schemas/organizer.schema';

const router = Router();

router.use(requireAuth([Role.ADMIN]));

router.get('/organizers', adminController.listOrganizers);
router.get('/support/logs', adminController.listAuditLogs);
router.get(
  '/organizers/:organizerId/activity',
  validateRequest(organizerIdParamSchema, 'params'),
  adminController.getOrganizerActivity
);
router.get('/system/overview', adminController.getSystemOverview);

export default router;
