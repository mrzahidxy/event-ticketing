import Stripe from 'stripe';

import { env } from './env';

let stripeClient: Stripe | null = null;

export const getStripeClient = (): Stripe => {
  if (!env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not configured. Payments are disabled.');
  }

  if (!stripeClient) {
    stripeClient = new Stripe(env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-05-28.basil',
    });
  }

  return stripeClient;
};
