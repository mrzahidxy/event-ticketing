CREATE TABLE "EventAnalytics" (
    "id" SERIAL NOT NULL,
    "organizerId" UUID NOT NULL,
    "eventId" UUID NOT NULL,
    "totalBookings" INTEGER NOT NULL DEFAULT 0,
    "ticketsSold" INTEGER NOT NULL DEFAULT 0,
    "estimatedRevenue" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "currency" TEXT,
    "checkIns" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "EventAnalytics_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EventAnalytics_organizerId_eventId_key"
    ON "EventAnalytics"("organizerId", "eventId");

CREATE TABLE "ProcessedDomainEvent" (
    "domainEventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProcessedDomainEvent_pkey" PRIMARY KEY ("domainEventId")
);
