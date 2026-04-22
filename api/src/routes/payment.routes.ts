import express, { Router } from 'express';

import { paymentController } from '../controllers/payment.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import { createCheckoutSessionSchema } from '../schemas/payment.schema';

export const paymentWebhookRouter = Router();
const router = Router();

paymentWebhookRouter.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  paymentController.handleWebhook
);

router.post(
  '/checkout-session',
  requireAuth(),
  validateRequest(createCheckoutSessionSchema),
  paymentController.createCheckoutSession
);

router.get('/history', requireAuth(), paymentController.listUserPayments);

export default router;
