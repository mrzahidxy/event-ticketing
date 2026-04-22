import { z } from 'zod';

const ANALYTICS_MAX_RANGE_DAYS = 366;

export const analyticsGranularitySchema = z.enum(['day', 'week', 'month']);

export const analyticsQuerySchema = z
  .object({
    organizerId: z.string().uuid().optional(),
    dateFrom: z.coerce.date().optional(),
    dateTo: z.coerce.date().optional(),
    granularity: analyticsGranularitySchema.optional().default('day'),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
    topLimit: z.coerce.number().int().positive().max(20).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.dateFrom && data.dateTo && data.dateFrom.getTime() > data.dateTo.getTime()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['dateTo'],
        message: 'dateTo must be greater than or equal to dateFrom',
      });
    }

    if (data.dateFrom && data.dateTo) {
      const durationMs = data.dateTo.getTime() - data.dateFrom.getTime();
      const durationDays = durationMs / (1000 * 60 * 60 * 24);

      if (durationDays > ANALYTICS_MAX_RANGE_DAYS) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['dateTo'],
          message: `Analytics range cannot exceed ${ANALYTICS_MAX_RANGE_DAYS} days`,
        });
      }
    }
  });

export type AnalyticsQueryInput = z.infer<typeof analyticsQuerySchema>;
