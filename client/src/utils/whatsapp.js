/**
 * WhatsApp click-to-chat helpers for the browser.
 *
 * A deliberate mirror of lib/whatsapp.js on the server. The duplication is
 * accepted because this project has no shared build step between the Express
 * app and the Create React App client — importing across that boundary would
 * mean either a monorepo tool or a published package, neither of which is
 * worth introducing for eighty lines.
 *
 * The two copies must agree. tests/whatsapp.test.js covers the server module;
 * if you change the normalisation rules, change both files in the same commit.
 * The rules themselves are documented there.
 */

const DEFAULT_COUNTRY_CODE = '256';
const UG_MOBILE = /^(7\d|20|39)/;

/**
 * Normalise to wa.me form: digits only, country code, no leading zero.
 * Returns null rather than guessing — a wrong number sends a message naming
 * a student, their hostel and their room to a stranger.
 */
export const normalisePhone = (input, countryCode = DEFAULT_COUNTRY_CODE) => {
  if (typeof input !== 'string') return null;

  const hadPlus = input.trim().startsWith('+');
  let digits = input.replace(/\D/g, '');
  if (!digits) return null;

  if (!hadPlus && digits.startsWith('00')) digits = digits.slice(2);

  if (digits.startsWith(countryCode)) {
    const national = digits.slice(countryCode.length);
    if (!UG_MOBILE.test(national) || national.length !== 9) return null;
    return digits;
  }

  if (digits.startsWith('0')) {
    const national = digits.slice(1);
    if (!UG_MOBILE.test(national) || national.length !== 9) return null;
    return countryCode + national;
  }

  if (UG_MOBILE.test(digits) && digits.length === 9) return countryCode + digits;

  if (hadPlus && digits.length >= 10 && digits.length <= 15) return digits;

  return null;
};

export const isMessageable = phone => normalisePhone(phone) !== null;

/** Display form. Falls back to the raw input so a typo stays visible. */
export const formatPhone = phone => {
  const n = normalisePhone(phone);
  if (!n) return phone || '';
  return `+${n.slice(0, 3)} ${n.slice(3, 6)} ${n.slice(6, 9)} ${n.slice(9)}`;
};

export const whatsappLink = (phone, message) => {
  const number = normalisePhone(phone);
  if (!number) return null;
  const text = typeof message === 'string' && message.trim()
    ? `?text=${encodeURIComponent(message)}`
    : '';
  return `https://wa.me/${number}${text}`;
};

/** The confirmation an administrator sends to a student. */
export const bookingMessage = ({ studentName, hostelName, roomNumber, roommateName, roommatePhone }) => {
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

/** A student messaging their own roommate. Different tone, same mechanism. */
export const roommateMessage = ({ myName, roommateName, hostelName, roomNumber }) =>
  [
    `Hi ${roommateName || 'there'}, this is ${myName || 'your roommate'} from Homies.`,
    '',
    `Looks like we're sharing Room ${roomNumber} at ${hostelName}.`,
    'Thought I would say hello before move-in.',
  ].join('\n');
