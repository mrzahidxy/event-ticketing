import { Response } from 'express';

import type { AuthenticatedRequest } from '../types/http';
import { adminService } from '../services/admin.service';
import { successResponse } from '../utils/api-response';

export const adminController = {
  listOrganizers: async (_req: AuthenticatedRequest, res: Response) => {
    const organizers = await adminService.listOrganizers();
    res.status(200).json(successResponse(organizers));
  },

  listAuditLogs: async (_req: AuthenticatedRequest, res: Response) => {
    const logs = await adminService.listAuditLogs();
    res.status(200).json(successResponse(logs));
  },

  getOrganizerActivity: async (req: AuthenticatedRequest, res: Response) => {
    const { organizerId } = req.params as { organizerId: string };
    const activity = await adminService.getOrganizerActivity(organizerId);
    res.status(200).json(successResponse(activity));
  },

  getSystemOverview: async (_req: AuthenticatedRequest, res: Response) => {
    const overview = await adminService.getSystemOverview();
    res.status(200).json(successResponse(overview));
  },
};
