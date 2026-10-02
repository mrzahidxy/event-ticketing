import { Response } from 'express';

import type { AuthenticatedRequest } from '../types/http';
import { prisma } from '../utils/prisma';
import { cache } from '../utils/cache';
import { successResponse } from '../utils/api-response';
import type { TicketCheckInInput } from '../schemas/ticket-checkin.schema';
import { createTicketCheckInService } from '../services/ticket-checkin.service';

const ticketCheckInService = createTicketCheckInService({ prisma, cache });

export const ticketCheckInController = {
  checkIn: async (req: AuthenticatedRequest, res: Response) => {
    const { qrPayload } = req.body as TicketCheckInInput;
    const result = await ticketCheckInService.checkIn(qrPayload, req.user!);

    res.status(200).json(
      successResponse(result, { message: 'Ticket checked in successfully' })
    );
  },
};
