import { Response } from 'express';

import { bookingService } from '../services/booking.service';
import type { AuthenticatedRequest } from '../types/http';
import type {
  CreatePublicBookingInput,
  ListBookingsQuery,
  UserBookingHistoryQuery,
} from '../schemas/booking.schema';
import { successResponse } from '../utils/api-response';

const formatDate = (value: Date | string | null | undefined) =>
  value ? new Date(value).toISOString().split('T')[0] : null;

export const bookingController = {
  createPublicSubmission: async (req: AuthenticatedRequest, res: Response) => {
    const { organizerId } = req.params as { organizerId?: string };
    const booking = await bookingService.createPublicSubmission(
      req.body as CreatePublicBookingInput,
      req.user,
      organizerId
    );
    res.status(201).json(
      successResponse(
        {
          id: booking.id,
          fullName: booking.fullName,
          email: booking.email,
          phone: booking.phone,
          eventId: booking.eventId,
          eventName: booking.eventName,
          ticketTierId: booking.ticketTierId,
          tierName: booking.tierName,
          userId: booking.userId,
          bookingDate: formatDate(booking.bookingDate),
          bookingTime: booking.bookingTime,
          quantity: booking.quantity,
          guestCount: booking.guestCount,
          notes: booking.notes,
          totalAmount: booking.totalAmount,
          totalPrice: booking.totalPrice,
          currency: booking.currency,
          status: booking.status,
          createdAt: booking.createdAt,
          updatedAt: booking.updatedAt,
        },
        { message: 'Booking submitted successfully' }
      )
    );
  },

  list: async (req: AuthenticatedRequest, res: Response) => {
    const query = req.query as ListBookingsQuery;
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    const bookings = await bookingService.list(req.user!, page, limit, {
      status: query.status,
      search: query.search,
      eventName: query.eventName,
      checkInFrom: query.checkInFrom,
      checkInTo: query.checkInTo,
      checkOutFrom: query.checkOutFrom,
      checkOutTo: query.checkOutTo,
    });
    res
      .status(200)
      .json(successResponse(bookings.data, { meta: bookings.meta }));
  },

  history: async (req: AuthenticatedRequest, res: Response) => {
    const query = req.query as UserBookingHistoryQuery;
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    const history = await bookingService.listUserHistory(req.user!, page, limit);

    res.status(200).json(
      successResponse(
        history.data.map((booking) => ({
          id: booking.id,
          eventId: booking.eventId,
          eventName: booking.eventName,
          bookingDate: formatDate(booking.bookingDate),
          bookingTime: booking.bookingTime,
          checkIn: formatDate(booking.checkIn),
          checkOut: formatDate(booking.checkOut),
          totalPrice: booking.totalPrice,
          status: booking.status,
          createdAt: booking.createdAt,
        })),
        { meta: history.meta }
      )
    );
  },

  getById: async (req: AuthenticatedRequest, res: Response) => {
    const bookingId = Number(req.params.id);
    const booking = await bookingService.getById(bookingId, req.user!);
    res.status(200).json(successResponse(booking));
  },

  create: async (req: AuthenticatedRequest, res: Response) => {
    const booking = await bookingService.create(req.body, req.user!);
    res.status(201).json(
      successResponse(
        {
          id: booking.id,
          eventId: booking.eventId,
          subtotalAmount: booking.subtotalAmount,
          totalAmount: booking.totalAmount,
          currency: booking.currency,
          status: booking.status,
        },
        { message: 'Booking created successfully' }
      )
    );
  },

  update: async (req: AuthenticatedRequest, res: Response) => {
    const bookingId = Number(req.params.id);
    const booking = await bookingService.update(bookingId, req.body, req.user!);
    res.status(200).json(
      successResponse(
        {
          id: booking.id,
          eventId: booking.eventId,
          subtotalAmount: booking.subtotalAmount,
          totalAmount: booking.totalAmount,
          currency: booking.currency,
          status: booking.status,
        },
        { message: 'Booking updated successfully' }
      )
    );
  },

  remove: async (req: AuthenticatedRequest, res: Response) => {
    const bookingId = Number(req.params.id);
    await bookingService.remove(bookingId);
    res.status(204).send();
  },
};
