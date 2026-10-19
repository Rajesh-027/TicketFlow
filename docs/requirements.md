# TicketFlow: Requirements

**Status:** Draft v1
**Last updated:** 2026-10-19

## 1. Purpose

TicketFlow is a real-time ticket booking backend. Organizers create events with seat layouts. Buyers see live seat availability, hold seats for a few minutes, pay, and receive tickets. The core challenge is that thousands of buyers may compete for the same few hundred seats at the same moment, and the system must stay correct under that load and under failures.

## 2. Actors

| Actor | Description |
|---|---|
| Buyer | Browses events, holds seats, pays, receives tickets |
| Organizer | Creates events and seat layouts, views sales |
| Admin | Manages users and events, handles disputes |

## 3. MVP user stories

1. As a buyer, I can register and log in.
2. As an organizer, I can create an event with a venue and a seat map (sections, rows, seats, prices).
3. As a buyer, I can view an event and see which seats are available, held, or sold.
4. As a buyer, I can hold up to 6 seats for 5 minutes, and nobody else can take them during that time.
5. As a buyer, I can pay for my held seats and receive a confirmed booking.
6. As a buyer, if I don't pay in time, my seats are released automatically.
7. As a buyer, I see seat status change live without refreshing.
8. As a buyer, I receive a confirmation email with my ticket.

## 4. Scope

### In the MVP

- The 8 user stories above
- Reserved seating (individual seats)
- Stripe test-mode payments
- One currency

### Out of scope (for now)

- Virtual waiting room (planned for a later phase)
- Refund UI
- Organizer analytics
- General admission (counter-based) tickets
- Multiple currencies
- Seat transfers and resale

## 5. Non-functional requirements

| Area | Target |
|---|---|
| Peak scenario | 5,000 concurrent users competing for 500 seats |
| Seat hold API latency | p95 < 200 ms, p99 < 500 ms |
| Seat map read latency | p95 < 100 ms (cached) |
| Real-time propagation | Seat change visible to clients in < 1 second |
| Hold duration | 5 minutes; expiry processed within 5 seconds of the deadline |
| Availability goal | 99.9% for the booking flow (learning target, not an SLA) |
| Crash recovery | After killing any single component, the system returns to a consistent state without manual repair |
| Data loss | Zero lost confirmed bookings |

## 6. Invariants

These rules must never be broken. Every critical test maps to one of them.

| ID | Invariant |
|---|---|
| INV-1 | A seat is never sold to two buyers for the same event. |
| INV-2 | A seat is never held by two buyers at the same time. |
| INV-3 | A buyer is never charged twice for the same checkout, however many times a request or webhook is repeated. |
| INV-4 | A confirmed booking always has a successful payment, and a successful payment always ends in a confirmed booking or a refund. |
| INV-5 | Every money movement is recorded in the ledger, and the ledger is append-only. |
| INV-6 | An expired hold always releases its seats. |
| INV-7 | No state change is lost if a server crashes midway. After recovery, state is either fully before or fully after the operation. |

## 7. Business rules

- A buyer may hold at most **6 seats** per event.
- A buyer may have **one active hold per event**, but may hold seats for different events at the same time.
- A hold lasts **5 minutes**.
- While a payment is in flight for a hold, the hold is **extended** so it cannot expire mid-payment.

## 8. Open questions

| Question | Proposed answer | Decision |
|---|---|---|
| Payment succeeds after the hold expired and the seat went to someone else | Extend holds while payment is in flight. If the seat is still lost, refund automatically. | Proposed |
| Maximum seats per buyer per event | 6 | Proposed |
| Can a buyer hold seats for two events at once | Yes, one active hold per event | Proposed |

## 9. Related documents

- `docs/adr/001-choose-express.md` (planned)
- `docs/adr/002-postgres-redis-split.md` (planned)
- `docs/seat-state-machine.md` (planned)