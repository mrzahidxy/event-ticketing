import { Response } from 'express';

import { rbacDefinitions } from '../config/rbac';
import type { AuthenticatedRequest } from '../types/http';
import { successResponse } from '../utils/api-response';

export const rbacController = {
  definitions: async (_req: AuthenticatedRequest, res: Response) => {
    res.status(200).json(successResponse(rbacDefinitions()));
  },
};
