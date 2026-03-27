// Days before departure at which each booking task type becomes urgent
export const BOOKING_DEADLINES = {
  FLIGHTS: 90,
  HOTEL: 60,
  CAR: 30,
  INSURANCE: 14,
} as const;
