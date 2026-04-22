import { Request, Response } from 'express';

import { organizerService } from '../services/organizer.service';
import type { AuthenticatedRequest } from '../types/http';
import type {
  CreateOrganizerInput,
  UpdateOrganizerInput,
  CreateEventInput,
  UpdateEventInput,
  AssignStaffInput,
  StaffCandidateQueryInput,
} from '../schemas/organizer.schema';
import type { UpdateOrganizerStatusInput } from '../schemas/admin.schema';
import { successResponse } from '../utils/api-response';

export const organizerController = {
  create: async (req: AuthenticatedRequest, res: Response) => {
    const payload = req.body as CreateOrganizerInput;
    const organizer = await organizerService.create(payload, req.user!);
    res
      .status(201)
      .json(successResponse(organizer, { message: 'Organizer created successfully' }));
  },

  getById: async (req: AuthenticatedRequest, res: Response) => {
    const { organizerId } = req.params as { organizerId: string };
    const organizer = await organizerService.getById(organizerId, req.user!);
    res.status(200).json(successResponse(organizer));
  },

  getPublicById: async (req: Request, res: Response) => {
    const { organizerId } = req.params as { organizerId: string };
    const organizer = await organizerService.getPublicById(organizerId);
    res.status(200).json(successResponse(organizer));
  },

  update: async (req: AuthenticatedRequest, res: Response) => {
    const { organizerId } = req.params as { organizerId: string };
    const payload = req.body as UpdateOrganizerInput;
    const organizer = await organizerService.update(organizerId, payload, req.user!);
    res
      .status(200)
      .json(successResponse(organizer, { message: 'Organizer updated successfully' }));
  },

  updateStatus: async (req: AuthenticatedRequest, res: Response) => {
    const { organizerId } = req.params as { organizerId: string };
    const payload = req.body as UpdateOrganizerStatusInput;
    const organizer = await organizerService.updateStatus(organizerId, payload.status, req.user!);
    res.status(200).json(
      successResponse(organizer, {
        message:
          payload.status === 'suspended'
            ? 'Organizer suspended successfully'
            : 'Organizer reactivated successfully',
      })
    );
  },

  remove: async (req: AuthenticatedRequest, res: Response) => {
    const { organizerId } = req.params as { organizerId: string };
    await organizerService.remove(organizerId, req.user!);
    res.status(204).send();
  },

  listEvents: async (req: AuthenticatedRequest, res: Response) => {
    const { organizerId } = req.params as { organizerId: string };
    const events = await organizerService.listEvents(organizerId, req.user!);
    res.status(200).json(successResponse(events));
  },

  createEvent: async (req: AuthenticatedRequest, res: Response) => {
    const { organizerId } = req.params as { organizerId: string };
    const payload = req.body as CreateEventInput;
    const event = await organizerService.createEvent(organizerId, payload, req.user!);
    res.status(201).json(successResponse(event, { message: 'Event created successfully' }));
  },

  updateEvent: async (req: AuthenticatedRequest, res: Response) => {
    const { organizerId, eventId } = req.params as { organizerId: string; eventId: string };
    const payload = req.body as UpdateEventInput;
    const event = await organizerService.updateEvent(organizerId, eventId, payload, req.user!);
    res.status(200).json(successResponse(event, { message: 'Event updated successfully' }));
  },

  removeEvent: async (req: AuthenticatedRequest, res: Response) => {
    const { organizerId, eventId } = req.params as { organizerId: string; eventId: string };
    await organizerService.removeEvent(organizerId, eventId, req.user!);
    res.status(204).send();
  },

  listStaff: async (req: AuthenticatedRequest, res: Response) => {
    const { organizerId } = req.params as { organizerId: string };
    const staff = await organizerService.listStaff(organizerId, req.user!);
    res.status(200).json(successResponse(staff));
  },

  listStaffCandidates: async (req: AuthenticatedRequest, res: Response) => {
    const { organizerId } = req.params as { organizerId: string };
    const query = req.query as unknown as StaffCandidateQueryInput;
    const candidates = await organizerService.listStaffCandidates(
      organizerId,
      query.search,
      req.user!,
      query.limit,
    );
    res.status(200).json(successResponse(candidates));
  },

  assignStaff: async (req: AuthenticatedRequest, res: Response) => {
    const { organizerId } = req.params as { organizerId: string };
    const payload = req.body as AssignStaffInput;
    const assignment = await organizerService.assignStaff(organizerId, payload.userId, req.user!);
    res.status(201).json(successResponse(assignment, { message: 'Staff assigned successfully' }));
  },

  removeStaff: async (req: AuthenticatedRequest, res: Response) => {
    const { organizerId, userId } = req.params as { organizerId: string; userId: string };
    await organizerService.removeStaff(organizerId, Number(userId), req.user!);
    res.status(204).send();
  },
};
