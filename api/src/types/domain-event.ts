type DomainEventEnvelope<TType extends string, TData> = {
  domainEventId: string;
  eventType: TType;
  occurredAt: string;
  tenantId: string;
  data: TData;
};

export type DomainEvent =
  | DomainEventEnvelope<'booking.created', {
      bookingId: number;
      eventId: string;
      quantity: number;
      totalAmount: string;
      currency: string;
    }>
  | DomainEventEnvelope<'checkin.created', {
      checkInId: number;
      ticketId: string;
      eventId: string;
    }>;
