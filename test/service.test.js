const test = require('node:test');
const assert = require('node:assert/strict');
const { TicketFlowService } = require('../src/service');

test('creates event and reduces availability when hold is created', () => {
  let now = 0;
  const service = new TicketFlowService({ now: () => now, holdTtlMs: 1000 });

  const event = service.createEvent({ name: 'Concert', totalSeats: 10 });
  const hold = service.createHold({ eventId: event.id, seatCount: 3, userId: 'u1' });

  assert.equal(hold.status, 'active');
  assert.equal(service.getEvent(event.id).availableSeats, 7);
});

test('expires hold and restores seats', () => {
  let now = 0;
  const service = new TicketFlowService({ now: () => now, holdTtlMs: 1000 });
  const event = service.createEvent({ name: 'Play', totalSeats: 5 });

  service.createHold({ eventId: event.id, seatCount: 2, userId: 'u2' });
  now = 1001;

  const refreshed = service.getEvent(event.id);
  assert.equal(refreshed.availableSeats, 5);
});

test('confirming payment creates confirmed booking with tickets', () => {
  let now = 0;
  const service = new TicketFlowService({ now: () => now, holdTtlMs: 1000 });
  const event = service.createEvent({ name: 'Festival', totalSeats: 8 });
  const hold = service.createHold({ eventId: event.id, seatCount: 2, userId: 'u3' });
  const payment = service.createPayment({ holdId: hold.id, amount: 150 });

  const booking = service.confirmPayment(payment.id);

  assert.equal(booking.status, 'confirmed');
  assert.equal(booking.tickets.length, 2);
  assert.equal(service.getAdminDashboard().metrics.confirmedBookings, 1);
});

test('fails payment confirmation when hold has expired', () => {
  let now = 0;
  const service = new TicketFlowService({ now: () => now, holdTtlMs: 1000 });
  const event = service.createEvent({ name: 'Expo', totalSeats: 4 });
  const hold = service.createHold({ eventId: event.id, seatCount: 1, userId: 'u4' });
  const payment = service.createPayment({ holdId: hold.id, amount: 40 });
  now = 1200;

  assert.throws(() => service.confirmPayment(payment.id), /Hold is no longer active/);
  assert.equal(service.getEvent(event.id).availableSeats, 4);
});
