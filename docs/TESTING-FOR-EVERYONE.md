# How We Test Homies — A Plain-English Guide

For anyone on the team, technical or not. No code required. If you are asked
"how do you know it works?", this is the answer.

---

## The short version

Homies has **187 automated checks** that run in about eight seconds. They
check the parts of the system where being wrong would actually hurt someone —
who can see whose personal details, who gets which room, who is shown as a
match.

They are not a guarantee that nothing is broken. They are a guarantee that a
specific list of things stays fixed. That list, and what is *not* on it, is
below.

---

## What a test actually is

A test is a small piece of code that describes something the system must do,
then checks whether it does it.

In plain terms, each one says: *"if this happens, that must be the result."*

> "If a student says they don't mind their roommate's gender,
>  they must still see other students."

If the system does that, the test passes. If it does not, the test fails
loudly and names what went wrong.

Run them all with one command. Eight seconds later you know whether 187
things still work.

---

## Why we bothered

Three real problems, all found and fixed because of this work.

**1. Most students were seeing an empty app.**

The roommate questionnaire asks about preferred roommate gender, and one of
the answers is *"Don't Care"*. The matching code was looking for a different
phrase — *"No preference"* — that the form never actually produces.

So the system read *"Don't Care"* as a strict requirement it could not
satisfy, and hid **every single candidate**. Students who answered the
question saw nothing. Students who skipped it saw everyone. Exactly backwards.

Nobody noticed, because an empty screen looks the same as *"there aren't many
users yet"*.

**2. The app said "It's a Match!" when it wasn't.**

Swiping right showed a celebration screen every time — even when the other
person had never seen your profile. Mutual matching is the main idea of the
whole project, and the app was claiming matches that did not exist.

**3. Two pairs of students could be given the same room.**

An administrator could confirm a booking into a room that was already taken.
The system quietly replaced the previous occupants, while still telling those
students the room was theirs. Two pairs, one door, and nothing anywhere
showing a problem.

All three now have tests. If anyone reintroduces them, the tests go red
immediately.

---

## The four kinds of checks

Think of it as testing a car.

### Unit tests — 105 of them

**Testing one part on the workbench.** Does this specific calculation give the
right answer?

*"Two students with identical lifestyles should score 100% compatible."*

Fast, precise, and they never need the rest of the system running.

### Component tests — 35

**Testing one control on the dashboard.** Does this button do what it should
when a person clicks it?

*"Clicking the eye icon should reveal the password — and must not accidentally
submit the form."*

These pretend to be a user: they click, type, and check what appears.

### Integration tests — 47

**Testing that the parts are wired together.** When the app asks the server
for something, does the right thing come back?

*"A student must not be able to open the hostel administrator's pages — and
should be told 'not allowed', not 'server error'."*

That distinction matters. A confusing error makes a security rule look like a
bug, so nobody investigates.

### End-to-end — a written checklist

**Driving the car.** A person opens the real app and goes through the whole
journey — sign up, fill in the questionnaire, swipe, match, get a room.

This one is a printed list a human works through, not an automated check. We
say why below.

---

## What we deliberately do NOT check automatically

This is the honest part, and the part worth being able to answer on.

**We have no automated browser tests.** Nobody has written a robot that clicks
through the real website. Instead there is a written checklist a person
follows before each release. Robot browser tests are slow, break often, and
pay off when you release repeatedly — this project releases once.

**We do not test how it looks.** Colours, spacing, and whether the layout
works on a small phone are all checked by eye. No automated test can tell you
a screen looks wrong.

**We do not test that emails arrive.** There is a separate tool that sends a
real test message, but no automatic check that it lands in an inbox.

**We do not measure speed under load.** Nobody has tested what happens with a
thousand students at once.

Saying this plainly matters. A report showing only successes invites people to
assume everything else was covered too.

---

## How we know the tests actually work

A test that always passes is worthless — it might be checking nothing at all.

So we proved one could fail. We deliberately put an old bug back into the
navigation bar and ran the tests: **5 of them immediately went red.** We
removed the bug again and all passed.

This matters because the project's *original* tests could never fail. They
were written so that any error was quietly swallowed and reported as success.
They had been "passing" for months while checking nothing. Those were deleted.

---

## The daily health check

Alongside the tests there is a command that reports on the live system:

```
npm run doctor
```

It answers questions in three seconds that would otherwise take ten minutes of
clicking:

- Is the database connected, and what is in it?
- **For each student, how many people will they see when they open the app?**
- Which pairs have matched?
- Is anything misconfigured?

That middle one is the important one. An empty screen caused by a broken
filter and an empty screen caused by an empty database look identical to a
user — and need completely different fixes. This tells you which one you have.

It is also genuinely useful before a demonstration: it tells you which
accounts are worth demonstrating with. Some accounts have barely-filled
profiles and match nobody, which makes a working system look broken.

---

## Running them yourself

You do not need to understand the code.

```
npm test                    # 152 backend checks, about 3 seconds
npm test --prefix client    # 35 interface checks, about 4 seconds
npm run doctor              # live system report
```

Green ticks mean passing. A red X names exactly what broke and where.

If you see *"Database tests were SKIPPED"*, that is expected when the database
is not running — those 29 checks simply did not run, and the system says so
rather than pretending they passed.

---

## Honest summary

**What we are confident about:** compatibility scoring, room booking rules,
who can see whose personal information, login security, and the app's core
controls. These are covered from several angles and have been proven to catch
real bugs.

**What relies on a person checking:** how the app looks, how it feels on a
phone, whether emails arrive, and the complete end-to-end journey.

**What is untested:** performance under load, and anything involving real
money — payment screens are a demonstration only and take no payment.

The tests do not prove Homies is perfect. They prove a specific list of
important things are right, and they will say so immediately if that stops
being true.
