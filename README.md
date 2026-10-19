# TicketFlow

Minimal ticket-booking backend API with:

- Event inventory
- Seat holds with expiration
- Payment creation and confirmation
- Booking and ticket issuance
- Admin dashboard metrics

## Run

```bash
npm start
```

## Test

```bash
npm test
```

## API Endpoints

- `POST /events` `{ "name": "Concert", "totalSeats": 100 }`
- `GET /events/:eventId`
- `POST /holds` `{ "eventId": "1", "seatCount": 2, "userId": "user-1" }`
- `POST /payments` `{ "holdId": "1", "amount": 100 }`
- `POST /payments/:paymentId/confirm`
- `GET /bookings/:bookingId`
- `GET /admin/dashboard`
