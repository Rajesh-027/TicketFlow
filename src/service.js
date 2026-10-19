const HOLD_TTL_MS = 5 * 60 * 1000;

class TicketFlowService {
  constructor(options = {}) {
    this.now = options.now || (() => Date.now());
    this.holdTtlMs = options.holdTtlMs || HOLD_TTL_MS;
    this.events = new Map();
    this.holds = new Map();
    this.payments = new Map();
    this.bookings = new Map();
    this.counters = {
      event: 1,
      hold: 1,
      payment: 1,
      booking: 1,
      ticket: 1,
    };
  }

  createEvent({ name, totalSeats }) {
    if (!name || typeof name !== 'string') {
      throw this._badRequest('Event name is required');
    }
    if (!Number.isInteger(totalSeats) || totalSeats <= 0) {
      throw this._badRequest('totalSeats must be a positive integer');
    }

    const event = {
      id: String(this.counters.event++),
      name,
      totalSeats,
      availableSeats: totalSeats,
      createdAt: this.now(),
    };
    this.events.set(event.id, event);
    return event;
  }

  getEvent(eventId) {
    const event = this.events.get(String(eventId));
    if (!event) {
      throw this._notFound('Event not found');
    }
    this._expireHolds();
    return this.events.get(String(eventId));
  }

  createHold({ eventId, seatCount, userId }) {
    this._expireHolds();

    const event = this.events.get(String(eventId));
    if (!event) {
      throw this._notFound('Event not found');
    }
    if (!Number.isInteger(seatCount) || seatCount <= 0) {
      throw this._badRequest('seatCount must be a positive integer');
    }
    if (event.availableSeats < seatCount) {
      throw this._conflict('Not enough seats available');
    }

    event.availableSeats -= seatCount;
    const hold = {
      id: String(this.counters.hold++),
      eventId: event.id,
      userId: userId || null,
      seatCount,
      status: 'active',
      createdAt: this.now(),
      expiresAt: this.now() + this.holdTtlMs,
    };
    this.holds.set(hold.id, hold);
    return hold;
  }

  createPayment({ holdId, amount }) {
    this._expireHolds();

    const hold = this.holds.get(String(holdId));
    if (!hold || hold.status !== 'active') {
      throw this._conflict('Hold is not active');
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      throw this._badRequest('amount must be a positive number');
    }

    const payment = {
      id: String(this.counters.payment++),
      holdId: hold.id,
      amount,
      status: 'pending',
      createdAt: this.now(),
    };
    this.payments.set(payment.id, payment);
    return payment;
  }

  confirmPayment(paymentId) {
    this._expireHolds();

    const payment = this.payments.get(String(paymentId));
    if (!payment) {
      throw this._notFound('Payment not found');
    }
    if (payment.status !== 'pending') {
      throw this._conflict('Payment cannot be confirmed');
    }

    const hold = this.holds.get(payment.holdId);
    if (!hold || hold.status !== 'active') {
      payment.status = 'failed';
      throw this._conflict('Hold is no longer active');
    }

    hold.status = 'consumed';
    payment.status = 'succeeded';

    const booking = {
      id: String(this.counters.booking++),
      holdId: hold.id,
      paymentId: payment.id,
      eventId: hold.eventId,
      userId: hold.userId,
      seatCount: hold.seatCount,
      status: 'confirmed',
      createdAt: this.now(),
      tickets: Array.from({ length: hold.seatCount }, () => ({
        id: String(this.counters.ticket++),
        bookingId: String(this.counters.booking - 1),
        issuedAt: this.now(),
      })),
    };

    this.bookings.set(booking.id, booking);
    return booking;
  }

  getBooking(bookingId) {
    const booking = this.bookings.get(String(bookingId));
    if (!booking) {
      throw this._notFound('Booking not found');
    }
    return booking;
  }

  getAdminDashboard() {
    this._expireHolds();
    return {
      events: Array.from(this.events.values()),
      metrics: {
        activeHolds: Array.from(this.holds.values()).filter((hold) => hold.status === 'active').length,
        confirmedBookings: this.bookings.size,
        succeededPayments: Array.from(this.payments.values()).filter((p) => p.status === 'succeeded').length,
      },
    };
  }

  _expireHolds() {
    const now = this.now();
    for (const hold of this.holds.values()) {
      if (hold.status === 'active' && hold.expiresAt <= now) {
        hold.status = 'expired';
        const event = this.events.get(hold.eventId);
        if (event) {
          event.availableSeats = Math.min(event.totalSeats, event.availableSeats + hold.seatCount);
        }
      }
    }
  }

  _error(message, statusCode) {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
  }

  _badRequest(message) {
    return this._error(message, 400);
  }

  _notFound(message) {
    return this._error(message, 404);
  }

  _conflict(message) {
    return this._error(message, 409);
  }
}

module.exports = {
  TicketFlowService,
  HOLD_TTL_MS,
};
