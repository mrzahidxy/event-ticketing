ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'EXPIRED';

CREATE TABLE "StripeWebhookEvent" (
    "id" SERIAL NOT NULL,
    "stripeEventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "stripeSessionId" TEXT,
    "stripePaymentIntentId" TEXT,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StripeWebhookEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StripeWebhookEvent_stripeEventId_key" ON "StripeWebhookEvent"("stripeEventId");
