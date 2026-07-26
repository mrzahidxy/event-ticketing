import { Router } from 'express';
import { Role } from '@prisma/client';

import { organizerController } from '../controllers/organizer.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import {
  assignStaffSchema,
  organizerIdParamSchema,
  organizerEventParamsSchema,
  organizerStaffParamsSchema,
  ticketTierIdParamSchema,
  staffCandidateQuerySchema,
  createOrganizerSchema,
  createEventSchema,
  createTicketTierSchema,
  updateOrganizerSchema,
  updateEventSchema,
  updateTicketTierSchema,
} from '../schemas/organizer.schema';
import { updateOrganizerStatusSchema } from '../schemas/admin.schema';

const router = Router();

router.post(
  '/',
  requireAuth({ permissions: ['ORGANIZER_CREATE'] }),
  validateRequest(createOrganizerSchema),
  organizerController.create
);

router.patch(
  '/:organizerId/status',
  requireAuth([Role.ADMIN]),
  validateRequest(organizerIdParamSchema, 'params'),
  validateRequest(updateOrganizerStatusSchema),
  organizerController.updateStatus
);

router.get(
  '/:organizerId',
  requireAuth({ permissions: ['ORGANIZER_READ_OWN'] }),
  validateRequest(organizerIdParamSchema, 'params'),
  organizerController.getById
);

router.patch(
  '/:organizerId',
  requireAuth({ permissions: ['ORGANIZER_UPDATE_OWN'] }),
  validateRequest(organizerIdParamSchema, 'params'),
  validateRequest(updateOrganizerSchema),
  organizerController.update
);

router.delete(
  '/:organizerId',
  requireAuth([Role.ADMIN]),
  validateRequest(organizerIdParamSchema, 'params'),
  organizerController.remove
);

router.get(
  '/:organizerId/events',
  requireAuth({ permissions: ['ORGANIZER_READ_OWN'] }),
  validateRequest(organizerIdParamSchema, 'params'),
  organizerController.listEvents
);

router.post(
  '/:organizerId/events',
  requireAuth({ permissions: ['ORGANIZER_MANAGE_EVENTS', 'EVENT_CREATE'] }),
  validateRequest(organizerIdParamSchema, 'params'),
  validateRequest(createEventSchema),
  organizerController.createEvent
);

router.patch(
  '/:organizerId/events/:eventId',
  requireAuth({ permissions: ['ORGANIZER_MANAGE_EVENTS', 'EVENT_UPDATE'] }),
  validateRequest(organizerEventParamsSchema, 'params'),
  validateRequest(updateEventSchema),
  organizerController.updateEvent
);

router.get(
  '/:organizerId/events/:eventId/ticket-tiers',
  requireAuth({ permissions: ['ORGANIZER_MANAGE_EVENTS', 'EVENT_READ'] }),
  validateRequest(organizerEventParamsSchema, 'params'),
  organizerController.listTicketTiers
);

router.post(
  '/:organizerId/events/:eventId/ticket-tiers',
  requireAuth({ permissions: ['ORGANIZER_MANAGE_EVENTS', 'EVENT_CREATE'] }),
  validateRequest(organizerEventParamsSchema, 'params'),
  validateRequest(createTicketTierSchema),
  organizerController.createTicketTier
);

router.patch(
  '/:organizerId/events/:eventId/ticket-tiers/:ticketTierId',
  requireAuth({ permissions: ['ORGANIZER_MANAGE_EVENTS', 'EVENT_UPDATE'] }),
  validateRequest(ticketTierIdParamSchema, 'params'),
  validateRequest(updateTicketTierSchema),
  organizerController.updateTicketTier
);

router.delete(
  '/:organizerId/events/:eventId',
  requireAuth({ permissions: ['ORGANIZER_MANAGE_EVENTS', 'EVENT_DELETE'] }),
  validateRequest(organizerEventParamsSchema, 'params'),
  organizerController.removeEvent
);

router.get(
  '/:organizerId/staff',
  requireAuth({ permissions: ['ORGANIZER_MANAGE_STAFF'] }),
  validateRequest(organizerIdParamSchema, 'params'),
  organizerController.listStaff
);

router.get(
  '/:organizerId/staff-candidates',
  requireAuth({ permissions: ['ORGANIZER_MANAGE_STAFF'] }),
  validateRequest(organizerIdParamSchema, 'params'),
  validateRequest(staffCandidateQuerySchema, 'query'),
  organizerController.listStaffCandidates
);

router.post(
  '/:organizerId/staff',
  requireAuth({ permissions: ['ORGANIZER_MANAGE_STAFF'] }),
  validateRequest(organizerIdParamSchema, 'params'),
  validateRequest(assignStaffSchema),
  organizerController.assignStaff
);

router.delete(
  '/:organizerId/staff/:userId',
  requireAuth({ permissions: ['ORGANIZER_MANAGE_STAFF'] }),
  validateRequest(organizerStaffParamsSchema, 'params'),
  organizerController.removeStaff
);

export default router;
