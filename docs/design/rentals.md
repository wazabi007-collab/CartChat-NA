# Rentals on OshiCart — how they differ, and how to build them

Written 9 August 2026, before any code. The question was "how do we accommodate
car rental and other rental businesses". The short answer is that a rental is a
**third kind of thing** — not a product, not an appointment — and the platform
needs one new idea to support it: **a date range, not a date**.

---

## 1. Why a rental is not a product or a service

| | Product | Service (appointment) | **Rental** |
|---|---|---|---|
| Customer ends up with | keeps it | an hour of your time | the item — **then gives it back** |
| Time | none | one point (17 Aug, 09:00) | **a range** (15 → 18 Aug) |
| Price | per item | per booking | **rate × how long** |
| Availability | stock falls, permanently | that slot is taken | item is **out**, then **returns** |
| Two customers at once | fine, if stock allows | never, same slot | fine, **up to how many units you own** |
| Money | payment | payment | payment **+ refundable deposit** |

The row that breaks the current system is **time**. `orders.delivery_date` and
`orders.delivery_time` hold a single point. Everything downstream — the booking
conflict check in `place_order`, the Bookings calendar, `booking_blocks` — is
built on `(merchant, date, time)`. None of it can express "this Corolla is gone
from Friday to Monday".

## 2. What already fits, and it's more than expected

Three things carry over with no change, which is why this is worth building
rather than bolting on:

**Deposits are already solved.** A refundable deposit is money in that later
goes back out. `order_payments` records money in; `order_refunds` records money
back and writes a credit note with the VAT reversed. That pair was built for
refunds and happens to be exactly right for deposits — take N$3,000, return it
when the car comes back clean, and the books balance on their own.

**Quantity already means the right thing.** `products.stock_quantity` currently
means "how many I have to sell". For a rental it means "how many can be out at
once" — three Corollas, forty chairs. Same column, and the overlap check simply
compares concurrent rentals against it.

**Blocking time off already exists.** `booking_blocks` blocks a day or a slot.
Servicing a vehicle, or closing over Christmas, is the same idea over a range.

**Concurrency safety already exists.** `place_order` takes a transaction-scoped
advisory lock before checking booking conflicts, so two customers submitting in
the same second cannot both win. A rental overlap check goes in the same place,
under the same lock.

## 3. The rental businesses this has to serve

Namibia's rental market is not one shape. These are the real categories, and
what each one needs:

| Category | Examples | Time unit | Deposit | Notes |
|---|---|---|---|---|
| **Vehicle hire** | Cars, 4x4 campers, bakkies, trailers, minibuses | day | large | Tourism-driven; needs driver's licence, often multi-week |
| **Event & party hire** | Tents, marquees, chairs, tables, jumping castles, décor | day or **weekend** | medium | Fri–Sun priced as one; delivered and collected |
| **Sound & AV** | PA systems, DJ gear, projectors, lighting | day | medium | Often with an operator — a rental *and* a service |
| **Tool & equipment** | Generators, cement mixers, drills, scaffolding | day or hour | medium | Collected by the customer |
| **Camping & outdoor** | Rooftop tents, camping kits, coolboxes, GPS | day | medium | Tourists; long ranges; bundles with vehicles |
| **Formal wear** | Wedding dresses, suits, matric outfits, traditional attire | day or weekend | medium | Fitting appointment *before* the rental |
| **Space hire** | Halls, conference rooms, studios | **hour** or day | small | Hourly matters here |
| **Accommodation** | Guest rooms, self-catering units | **night** | varies | Nights, not days: check-in/check-out, ranges touch |

**What that table tells us:** the unit of time is the real variable — hour, day,
night, weekend. Everything else (deposit, delivery, documents) is a field, not a
structural difference. So the model must make the *unit* configurable and treat
the rest as ordinary settings.

**One trap worth naming:** "day" and "night" are not the same. A car rented
15–18 August is out for **4 days**. A room booked 15–18 August is **3 nights** —
the guest leaves on the 18th and someone else can arrive that afternoon. Get
this wrong and either the merchant loses a night's income or the system
double-books a room. Accommodation is the only category where ranges are allowed
to touch at the boundary.

## 4. Proposed model

### Products gain rental fields

```
item_type          'product' | 'service' | 'rental'      -- third value
rental_unit        'hour' | 'day' | 'night' | 'weekend'
price_nad          the rate PER UNIT (reuse — no new price column)
rental_min_units   smallest hire (e.g. 2 days minimum)
rental_max_units   longest hire (e.g. 30 days)
deposit_nad        refundable, per rental, 0 = none
buffer_hours       turnaround before the item can go out again
stock_quantity     how many units exist (reuse — already means this)
```

### Order lines gain the range

The range belongs on `order_items`, not `orders`: a customer can hire a marquee
Thursday–Monday and chairs Friday–Sunday in the same order. The checkout UI can
still ask once and apply it to every rental line — model correctly, simplify
the interface.

```
order_items.rental_start   timestamptz
order_items.rental_end     timestamptz
order_items.rental_units   integer   -- computed server-side, stored for the invoice
```

### Availability

Postgres already has the right tool. `tstzrange` with the `&&` overlap operator
answers "is this item free?" in one comparison, and a GiST index makes it fast:

```sql
-- Inside place_order, under the SAME advisory lock as the booking check:
SELECT count(*) FROM order_items oi
JOIN orders o ON o.id = oi.order_id
WHERE oi.product_id = <rental item>
  AND o.status <> 'cancelled'
  AND tstzrange(oi.rental_start, oi.rental_end, '[)')
      && tstzrange(<requested start>, <requested end>, '[)')
```

If that count is already `>= stock_quantity`, the item is fully out and the
order is refused with "All 3 are booked for those dates."

The `'[)'` bound is deliberate: end-exclusive, so a rental ending Monday 09:00
and another starting Monday 09:00 do **not** overlap. That is what makes
accommodation nights work correctly, and `buffer_hours` extends the stored end
so a car gets its cleaning gap.

### Price

Computed **server-side in `place_order`**, like every other amount — units ×
rate, plus deposit. Client values are ignored, exactly as they are today. The
deposit is recorded as a separate line on the invoice so it is visibly
refundable, not revenue.

## 5. Suggested build order

**Phase 1 — a rental you can actually take money for**
`item_type='rental'`, unit + rate + min/max, range on order items, overlap check
under the existing lock, server-side pricing, checkout date-range picker,
rentals visible on the Bookings calendar as bars rather than dots.
*This is the whole feature for tool hire, event hire and formal wear.*

**Phase 2 — vehicles and accommodation properly**
Deposits as a first-class line (using the existing payment/refund pair),
`buffer_hours` turnaround, and the night-vs-day distinction with check-in and
check-out times.

**Phase 3 — operations**
Which specific unit went out (registration number, asset tag), condition notes
on return, late-return fees, and required documents such as a driver's licence.

**Deliberately not in scope:** insurance, damage claims, and mileage billing.
Those are a rental-management product, not a storefront, and no Namibian
merchant will refuse OshiCart for lacking them.

## 6. Open questions for the product decision

1. **Which category leads?** Tool and event hire are the simplest to ship
   (day-based, collected, modest deposits). Vehicle hire is the biggest
   opportunity because of tourism, but needs deposits and documents — Phase 2.
2. **Is accommodation in scope at all?** It is the one category needing nights
   and touching ranges. It may deserve to wait, or to be excluded on purpose.
3. **Should a rental also be bookable as an appointment?** A dress hire wants a
   fitting *appointment* before the *rental* range. Two time concepts on one
   item — worth deciding before, not during, the build.
