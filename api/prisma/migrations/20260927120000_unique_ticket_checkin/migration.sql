CREATE UNIQUE INDEX IF NOT EXISTS "TicketCheckin_ticketId_key" ON "TicketCheckin"("ticketId");

DROP INDEX IF EXISTS "TicketCheckin_ticketId_idx";
