/**
 * WhatsApp link tests.
 *
 * Tier 1 (docs/TESTING.md §3). Being wrong here does not break a screen — it
 * sends a message naming a student, their hostel and their room number to
 * whoever happens to own the number the bug produced. That is a disclosure to
 * a stranger, and it is irreversible once the administrator presses send.
 *
 * The input fixtures are the ways people actually write Ugandan numbers,
 * because that is the only set that matters. A normaliser that handles
 * textbook input and mangles '+256 701 234 567' is worse than none, since it
 * produces a confident wrong answer rather than an obvious failure.
 */

const assert = require('assert');
const {
  normalisePhone,
  isMessageable,
  formatPhone,
  whatsappLink,
  bookingMessage,
} = require('../lib/whatsapp');

describe('WhatsApp — phone normalisation', () => {

  describe('the ways students actually write their number', () => {
    // Every one of these is the same number and must produce the same result.
    const same = [
      '0701234567',
      '0701 234 567',
      '0701-234-567',
      ' 0701234567 ',
      '+256701234567',
      '+256 701 234 567',
      '256701234567',
      '00256701234567',
      '701234567',
    ];

    same.forEach(input => {
      it(`normalises "${input}"`, () => {
        assert.strictEqual(normalisePhone(input), '256701234567');
      });
    });

    it('produces one identical result for every spelling', () => {
      const results = new Set(same.map(n => normalisePhone(n)));
      assert.strictEqual(results.size, 1, `expected one result, got ${[...results].join(', ')}`);
    });
  });

  describe('accepts the real Ugandan prefixes', () => {
    it('handles MTN, Airtel and the 20/39 ranges', () => {
      assert.strictEqual(normalisePhone('0771234567'), '256771234567'); // MTN
      assert.strictEqual(normalisePhone('0751234567'), '256751234567'); // Airtel
      assert.strictEqual(normalisePhone('0701234567'), '256701234567');
      assert.strictEqual(normalisePhone('0200123456'), '256200123456');
      assert.strictEqual(normalisePhone('0392123456'), '256392123456');
    });
  });

  describe('refuses rather than guessing', () => {
    // A wrong number is worse than no button. Every one of these must return
    // null so the UI hides the control instead of offering a broken one.
    it('rejects a number that is too short', () => {
      assert.strictEqual(normalisePhone('070123'), null);
      assert.strictEqual(normalisePhone('0701234'), null);
    });

    it('rejects a number that is too long', () => {
      assert.strictEqual(normalisePhone('07012345678'), null);
    });

    it('rejects a prefix that is not a Ugandan mobile range', () => {
      assert.strictEqual(normalisePhone('0501234567'), null);
      assert.strictEqual(normalisePhone('0123456789'), null);
    });

    it('rejects empty, missing and non-string input', () => {
      [null, undefined, '', '   ', 123456789, {}, []].forEach(bad => {
        assert.strictEqual(normalisePhone(bad), null, `should reject ${JSON.stringify(bad)}`);
      });
    });

    it('rejects text with no digits', () => {
      assert.strictEqual(normalisePhone('call me'), null);
    });
  });

  describe('international students', () => {
    it('accepts an explicit + with another country code', () => {
      assert.strictEqual(normalisePhone('+254712345678'), '254712345678'); // Kenya
      assert.strictEqual(normalisePhone('+44 7700 900123'), '447700900123'); // UK
    });

    it('does not accept a bare foreign number with no +', () => {
      // Without a +, a nine-to-fifteen digit string is more likely a mistyped
      // local number than an international one, and guessing wrong sends the
      // message to a stranger.
      assert.strictEqual(normalisePhone('254712345678'), null);
    });
  });

  it('isMessageable agrees with normalisePhone', () => {
    assert.strictEqual(isMessageable('0701234567'), true);
    assert.strictEqual(isMessageable('070'), false);
    assert.strictEqual(isMessageable(''), false);
  });
});

describe('WhatsApp — display formatting', () => {
  it('formats a valid number readably', () => {
    assert.strictEqual(formatPhone('0701234567'), '+256 701 234 567');
    assert.strictEqual(formatPhone('256701234567'), '+256 701 234 567');
  });

  it('shows an unparseable number rather than hiding it', () => {
    // The administrator should see what the student typed, so they can spot
    // the typo, rather than being shown a blank where a number used to be.
    assert.strictEqual(formatPhone('not a number'), 'not a number');
    assert.strictEqual(formatPhone(''), '');
  });
});

describe('WhatsApp — link building', () => {
  it('builds a wa.me link with no plus and no spaces', () => {
    const url = whatsappLink('0701234567', 'Hello');
    assert.ok(url.startsWith('https://wa.me/256701234567'), url);
    assert.strictEqual(url.includes('+'), false, 'wa.me rejects a plus in the path');
    assert.strictEqual(url.includes(' '), false);
  });

  it('returns null for an unusable number so the UI can hide the button', () => {
    assert.strictEqual(whatsappLink('070', 'Hi'), null);
    assert.strictEqual(whatsappLink('', 'Hi'), null);
    assert.strictEqual(whatsappLink(null, 'Hi'), null);
  });

  it('percent-encodes newlines, spaces and punctuation', () => {
    // Hand-rolled escaping is how a link ends up truncated at the first line
    // break, silently sending half a message.
    const url = whatsappLink('0701234567', 'Room 4B\nSee you soon & thanks!');
    assert.ok(url.includes('%0A'), 'newline must be encoded');
    assert.ok(url.includes('%20'), 'space must be encoded');
    assert.ok(url.includes('%26'), 'ampersand must be encoded');
    assert.strictEqual(url.includes('\n'), false);
  });

  it('omits the text parameter when there is no message', () => {
    assert.strictEqual(whatsappLink('0701234567'), 'https://wa.me/256701234567');
    assert.strictEqual(whatsappLink('0701234567', '   '), 'https://wa.me/256701234567');
  });

  it('survives a round trip through decodeURIComponent', () => {
    const message = 'Room 4B — your roommate is Naruto Uzumaki (100% match)';
    const url = whatsappLink('0701234567', message);
    const sent = decodeURIComponent(url.split('?text=')[1]);
    assert.strictEqual(sent, message);
  });
});

describe('WhatsApp — the booking message', () => {
  const base = {
    studentName: 'Ashley',
    hostelName: 'Bavana',
    roomNumber: '4B',
    roommateName: 'Naruto Uzumaki',
    roommatePhone: '0771234567',
  };

  it('names the student, hostel, room and roommate', () => {
    const msg = bookingMessage(base);
    ['Ashley', 'Bavana', '4B', 'Naruto Uzumaki'].forEach(part => {
      assert.ok(msg.includes(part), `message should mention ${part}`);
    });
  });

  it('includes the roommate number in readable form', () => {
    assert.ok(bookingMessage(base).includes('+256 771 234 567'));
  });

  it('omits the roommate number when it is unusable, rather than printing junk', () => {
    const msg = bookingMessage({ ...base, roommatePhone: '070' });
    assert.strictEqual(msg.includes('Their number'), false);
  });

  it('still reads properly when the roommate is unknown', () => {
    const msg = bookingMessage({ ...base, roommateName: '', roommatePhone: '' });
    assert.ok(msg.includes('Bavana'));
    assert.strictEqual(msg.includes('Roommate:'), false);
  });

  it('falls back to a greeting when the student has no name', () => {
    assert.ok(bookingMessage({ ...base, studentName: '' }).startsWith('Hi there,'));
  });

  it('says who it is from, so it is not an unexplained message from an unknown number', () => {
    assert.ok(bookingMessage(base).includes('Homies'));
  });
});
