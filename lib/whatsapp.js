/**
 * WhatsApp click-to-chat links.
 *
 * Pure functions. No network, no SDK, no credentials.
 *
 * ---------------------------------------------------------------------------
 * Why click-to-chat rather than the WhatsApp Business API
 * ---------------------------------------------------------------------------
 *
 * The Business API sends messages from a server without a human involved. It
 * also requires a Meta Business account, business verification that takes days
 * to weeks, an approved API provider, a dedicated number that cannot already
 * be in use on the consumer app, and Meta's prior approval of every message
 * template. Almost all of that is waiting on other people, which makes it a
 * calendar problem rather than an engineering one.
 *
 * A wa.me link opens WhatsApp with the message already typed, addressed to
 * the right student. The administrator presses send.
 *
 * That is not a workaround standing in for the "real" version. It is a closer
 * match to how hostel administrators here already operate — they hold the
 * student's number and they message them — and it keeps a human in the loop
 * for a message that confirms where somebody is going to live. An automated
 * send is not obviously an improvement on that.
 *
 * ---------------------------------------------------------------------------
 * Numbers
 * ---------------------------------------------------------------------------
 *
 * wa.me requires a full international number with no plus sign, no spaces and
 * no leading zero: 256701234567.
 *
 * Ugandan students write their numbers many ways — 0701234567, +256 701 234
 * 567, 0701-234-567, 256701234567. All of them mean the same number and all
 * of them must produce the same link. Getting this wrong sends a booking
 * confirmation to a stranger, so it is normalised in one place and tested
 * rather than being pasted into a template string at the call site.
 */

/** Uganda. Kept as a named constant so the assumption is visible. */
const DEFAULT_COUNTRY_CODE = '256';

/**
 * Ugandan mobile prefixes, after the country code.
 * 7x is mobile; 20 and 39 are fixed-line ranges that also carry data SIMs.
 */
const UG_MOBILE = /^(7\d|20|39)/;

/**
 * Normalise a phone number to wa.me form: digits only, country code included,
 * no leading zero.
 *
 * Returns null when the input cannot be trusted. Returning null rather than a
 * best guess is deliberate — a wrong number here means someone else receives
 * a message naming a student, their hostel and their room.
 */
const normalisePhone = (input, countryCode = DEFAULT_COUNTRY_CODE) => {
  if (typeof input !== 'string') return null;

  // Keep a leading + only long enough to know it was there.
  const hadPlus = input.trim().startsWith('+');
  let digits = input.replace(/\D/g, '');
  if (!digits) return null;

  // 00 is the other way of writing +
  if (!hadPlus && digits.startsWith('00')) digits = digits.slice(2);

  // Already carries the country code.
  if (digits.startsWith(countryCode)) {
    const national = digits.slice(countryCode.length);
    if (!UG_MOBILE.test(national) || national.length !== 9) return null;
    return digits;
  }

  // National form with a trunk zero: 0701234567
  if (digits.startsWith('0')) {
    const national = digits.slice(1);
    if (!UG_MOBILE.test(national) || national.length !== 9) return null;
    return countryCode + national;
  }

  // Bare national form: 701234567
  if (UG_MOBILE.test(digits) && digits.length === 9) {
    return countryCode + digits;
  }

  // An explicit + with some other country code. Accept a plausible length
  // rather than rejecting every international student.
  if (hadPlus && digits.length >= 10 && digits.length <= 15) return digits;

  return null;
};

/** Is this number usable for a WhatsApp link? */
const isMessageable = phone => normalisePhone(phone) !== null;

/**
 * Pretty-print for display: +256 701 234 567.
 * Falls back to the raw input so a number we cannot parse is still shown to
 * the administrator rather than silently disappearing.
 */
const formatPhone = phone => {
  const n = normalisePhone(phone);
  if (!n) return phone || '';
  const cc = n.slice(0, 3);
  const rest = n.slice(3);
  return `+${cc} ${rest.slice(0, 3)} ${rest.slice(3, 6)} ${rest.slice(6)}`;
};

/**
 * Build a wa.me URL.
 *
 * encodeURIComponent, not manual escaping. The message contains newlines and
 * apostrophes; hand-rolled escaping of those is how a link ends up truncated
 * at the first line break.
 */
const whatsappLink = (phone, message) => {
  const number = normalisePhone(phone);
  if (!number) return null;
  const text = typeof message === 'string' && message.trim()
    ? `?text=${encodeURIComponent(message)}`
    : '';
  return `https://wa.me/${number}${text}`;
};

/**
 * The booking confirmation an administrator sends.
 *
 * Written as a person would write it, because a person is about to press send
 * on it and will not send something that reads like a form letter. It names
 * the roommate, because that is the single fact the student most wants, and
 * it says who it is from so it does not arrive as an unexplained message from
 * an unknown number.
 */
const bookingMessage = ({ studentName, hostelName, roomNumber, roommateName, roommatePhone }) => {
  const lines = [
    `Hi ${studentName || 'there'}, your room at ${hostelName} is confirmed.`,
    '',
    `Room: ${roomNumber}`,
  ];
  if (roommateName) lines.push(`Roommate: ${roommateName}`);
  if (roommatePhone && isMessageable(roommatePhone)) {
    lines.push(`Their number: ${formatPhone(roommatePhone)}`);
  }
  lines.push('', 'Please get in touch to arrange your move-in.', `— ${hostelName} via Homies`);
  return lines.join('\n');
};

module.exports = {
  DEFAULT_COUNTRY_CODE,
  normalisePhone,
  isMessageable,
  formatPhone,
  whatsappLink,
  bookingMessage,
};
