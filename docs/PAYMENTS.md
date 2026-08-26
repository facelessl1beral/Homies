# Payments and Notifications

**Status: user interface only. No payment is processed, requested, or
recorded. There is no Payment model and no gateway integration.**

This is stated first, and repeated in the UI, because a payment screen that
looks functional is the single most misleading thing a prototype can contain.
`PaymentPanel.js` renders a visible prototype banner for the same reason.

## Administrator payment status

The admin dashboard lets a hostel administrator record a payment state against
each occupant: **unpaid / partial / paid / waived**.

This is a **manual record of what the hostel observed offline**, not a
transaction log. The wording in the interface says "recorded", never
"charged", and each entry is stamped *"manual entry, not a gateway record"* —
so nobody reading the dashboard in six months mistakes it for a ledger.

`POST /api/hostels/students/payment` is scoped to the administrator's own
hostel. Without that check any hostel admin could annotate any student in the
system, since the student id arrives in the request body. `paymentStatus`,
`paymentNote` and `paymentUpdated` are classified **private** in
`lib/profileVisibility.js` — whether someone has paid their rent is visible
only to that student and to their hostel's administrator.

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


---

# Notifications

Three channels, in order of how much they can be trusted.

## 1. In-app confirmation — authoritative

`BookingCard` on the student dashboard, fed by `GET /api/profile/booking`.

This is the primary channel, not a fallback. It depends on nothing outside the
system: no credentials, no provider, no delivery network, no spam filter. If
the booking exists in the database the student sees it, permanently, and can
return to it.

Everything else is a notification *about* this page rather than a replacement
for it.

It shows the room, the hostel, the payment state (labelled *recorded by
&lt;hostel&gt;*, since Homies processes nothing), and the roommate's name and
contact details. That last item is the one thing a student most wants the
moment a match becomes a booking. It is the only place in the API where one
student's phone number and email are released to another, and only to the
person they are actually sharing a room with — everywhere else
`lib/profileVisibility.js` withholds both.

## 2. WhatsApp click-to-chat — the notification that gets read

The administrator sees a **WhatsApp** button beside each occupant. It opens
`https://wa.me/<number>?text=<message>` with the confirmation already written.
The administrator presses send. The student can also message their roommate
directly from the booking card.

**Why not the WhatsApp Business API.** Sending automatically from a server
needs a Meta Business account, business verification taking days to weeks, an
approved API provider, a dedicated number not already in use on the consumer
app, and Meta's prior approval of every message template. Almost all of that
is waiting on other people — a calendar problem, not an engineering one, and
not compatible with this project's timeline.

Click-to-chat is not a stand-in for that. It is a closer match to how hostel
administrators here already work — they hold the student's number and they
message them — and it keeps a human in the loop for a message that tells
somebody where they will be living. Automating that send is not obviously an
improvement.

Numbers are normalised in `lib/whatsapp.js` (mirrored at
`client/src/utils/whatsapp.js`) and covered by 32 tests. Students write their
numbers as `0701234567`, `+256 701 234 567`, `0701-234-567` and
`256701234567`; all must produce one identical link. The normaliser returns
null rather than guessing, because a wrong number sends a message naming a
student, their hostel and their room to a stranger — and that cannot be undone
once the administrator has pressed send. A null result hides the button, since
an action that silently does nothing is worse than an absent one.

`phone` is optional. The accounts already in the database predate the field,
and requiring it would mean editing every one before the booking flow worked.

## 3. Email — optional

Sent by `sendBookingEmails` when SMTP is configured, skipped when it is not.

**Nothing depends on it.** There is no email verification anywhere in the auth
flow: registration creates the account and returns a token, and login checks a
password. Email is used in exactly one place, the booking confirmation, and it
is the least reliable of the three.

It is sent *after* the booking is durably written and cannot affect it. A
confirmed room with no email is a minor problem; an email announcing a booking
that was never saved is a serious one. The administrator is told plainly when
a booking saved but the notification did not, so nobody assumes students were
told when nothing was sent.

Gmail requires an App Password, which university-managed accounts often
disable. `npm run check:email -- you@example.com` reports which of the three
failure modes you have. If you cannot get credentials, leave it unconfigured —
channels 1 and 2 cover the requirement.
