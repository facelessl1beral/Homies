# Payments — Prototype

**Status: user interface only. No payment is processed, requested, or
recorded. There is no Payment model and no gateway integration.**

This is stated first, and repeated in the UI, because a payment screen that
looks functional is the single most misleading thing a prototype can contain.
`PaymentPanel.js` renders a visible prototype banner for the same reason.

---

## Why UI-first

Mobile money dominates in Uganda: MTN Mobile Money and Airtel Money are how
students actually pay. Modelling that in the interface — provider choice, phone
number entry, the two-step PIN prompt users expect — demonstrates that the
payment flow was designed for its real context rather than assuming cards.

Building the integration was rejected for this phase. It requires a merchant
account, KYC, live credentials, webhook endpoints reachable from the internet,
and reconciliation against a Payment collection that does not exist. None of
that is achievable safely inside the project timeline, and a half-built
payment path that *might* move money is far worse than none.

---

## What integration would require

1. **A `Payment` model** — student, hostel, room, amount, currency, provider,
   gateway reference, status, timestamps.
2. **Hostel pricing** — no price field is currently modelled anywhere.
3. **Flutterwave initiation** — server-side `POST /payments/initiate`, which
   returns a transaction reference. The secret key must never reach the
   browser.
4. **A webhook** — `POST /api/payments/webhook`, signature-verified, treated as
   the *only* authority on payment status. Client-side confirmation cannot be
   trusted; the user controls it.
5. **Idempotency** — mobile money retries. The same reference must not be
   applied twice.
6. **Reconciliation** — a payment that succeeds at the gateway but fails to
   record locally is the failure mode that costs real money, and needs a
   scheduled check rather than trust.

---

## Sandbox cost

Flutterwave test mode is free and requires no KYC. A student demonstration
could run entirely in sandbox at no cost. Live mode requires a registered
business, which is outside an academic project's scope.
