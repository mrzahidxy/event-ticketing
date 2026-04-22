import { Response } from 'express';

import type { AnalyticsQueryInput } from '../schemas/analytics.schema';
import { analyticsService } from '../services/analytics.service';
import type { AuthenticatedRequest } from '../types/http';
import { successResponse } from '../utils/api-response';

const ANALYTICS_CACHE_MAX_AGE_SECONDS = 60 * 5;

const getAnalyticsQuery = (req: AuthenticatedRequest) => req.query as unknown as AnalyticsQueryInput;

const applyAnalyticsCachingHeaders = (res: Response) => {
  res.set('Cache-Control', `private, max-age=${ANALYTICS_CACHE_MAX_AGE_SECONDS}`);
  res.set('Vary', 'Authorization');
  res.set('X-Analytics-Cache-TTL', String(ANALYTICS_CACHE_MAX_AGE_SECONDS));
};

export const analyticsController = {
  overview: async (req: AuthenticatedRequest, res: Response) => {
    const analytics = await analyticsService.getOverview(req.user!, getAnalyticsQuery(req));
    applyAnalyticsCachingHeaders(res);
    res.status(200).json(successResponse(analytics));
  },

  bookings: async (req: AuthenticatedRequest, res: Response) => {
    const analytics = await analyticsService.getBookingAnalytics(req.user!, getAnalyticsQuery(req));
    applyAnalyticsCachingHeaders(res);
    res.status(200).json(successResponse(analytics));
  },

  payments: async (req: AuthenticatedRequest, res: Response) => {
    const analytics = await analyticsService.getPaymentAnalytics(req.user!, getAnalyticsQuery(req));
    applyAnalyticsCachingHeaders(res);
    res.status(200).json(successResponse(analytics));
  },

  events: async (req: AuthenticatedRequest, res: Response) => {
    const analytics = await analyticsService.getEventAnalytics(req.user!, getAnalyticsQuery(req));
    applyAnalyticsCachingHeaders(res);
    res.status(200).json(successResponse(analytics));
  },

  users: async (req: AuthenticatedRequest, res: Response) => {
    const analytics = await analyticsService.getUserAnalytics(req.user!, getAnalyticsQuery(req));
    applyAnalyticsCachingHeaders(res);
    res.status(200).json(successResponse(analytics));
  },
};
