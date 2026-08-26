/**
 * Profile visibility tests.
 *
 * Tier 1 (docs/TESTING.md §3): being wrong here means one student reads
 * another student's email address, swipe history, or room number.
 *
 * The most valuable test in this file is the last one. It reads the field
 * list straight out of models/User.js and fails when a schema field is
 * neither explicitly public nor explicitly private. That turns "someone
 * remembered to think about this" into "the suite will not go green until
 * someone thinks about this", which is the only version that survives a
 * project being handed on.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {
  PUBLIC_PROFILE_FIELDS,
  PRIVATE_PROFILE_FIELDS,
  publicProjection,
  toPublicProfile,
  toPublicProfiles,
} = require('../lib/profileVisibility');

const fullUser = () => ({
  _id: 'u1',
  firstName: 'Ashley', lastName: 'K', name: 'Ashley K',
  email: 'ashley@example.com',
  password: '$2a$10$hashedhashedhashed',
  avatar: '/uploads/a.png',
  gender: 'Female', age: '18-24', city: 'Kampala', country: 'Uganda',
  univ: 'Kyambogo University', course: 'BSc IS', sem: 'Year 4',
  sleepSchedule: 'Night owl (after 12am)', cleanliness: 'Moderate',
  food: 'Halal', smoke: 'Non-smoker',
  preferredHostel: 'Bavana',
  accepted: ['u2', 'u3'],
  rejected: ['u4'],
  bookingStatus: 'confirmed',
  assignedRoom: '4B',
  assignedHostel: 'Bavana',
});

describe('Profile visibility — what one student may see about another', () => {

  describe('private fields never appear in a public payload', () => {
    const out = toPublicProfile(fullUser());

    it('never leaks the password hash', () => {
      assert.strictEqual(out.password, undefined);
    });

    it('never leaks the email address', () => {
      // Contact details are released only once a booking pairs two students,
      // by the hostel routes, to the two people it concerns.
      assert.strictEqual(out.email, undefined);
    });

    it('never leaks who a student has swiped on', () => {
      // Exposing `rejected` is worse than exposing `accepted`: it tells a
      // student exactly who passed on them.
      assert.strictEqual(out.accepted, undefined);
      assert.strictEqual(out.rejected, undefined);
    });

    it('never leaks where a student lives', () => {
      assert.strictEqual(out.bookingStatus, undefined);
      assert.strictEqual(out.assignedRoom, undefined);
      assert.strictEqual(out.assignedHostel, undefined);
    });
  });

  describe('the fields the UI renders survive', () => {
    // Checked against the destructuring in ProfileItem.js. If this fails the
    // People page has silently lost content.
    const out = toPublicProfile(fullUser());

    it('keeps everything ProfileItem.js destructures', () => {
      for (const field of [
        '_id', 'firstName', 'lastName', 'name', 'gender', 'age', 'univ',
        'city', 'country', 'avatar', 'course', 'sem', 'food', 'smoke',
        'sleepSchedule', 'cleanliness',
      ]) {
        assert.notStrictEqual(out[field], undefined, `ProfileItem needs ${field}`);
      }
    });

    it('keeps the fields the matching engine scores on', () => {
      for (const field of ['sleepSchedule', 'cleanliness', 'food', 'smoke', 'preferredHostel']) {
        assert.notStrictEqual(out[field], undefined, `scoring needs ${field}`);
      }
    });
  });

  describe('behaviour', () => {
    it('returns null for a missing profile rather than throwing', () => {
      assert.strictEqual(toPublicProfile(null), null);
      assert.strictEqual(toPublicProfile(undefined), null);
    });

    it('omits absent fields instead of emitting undefined keys', () => {
      const out = toPublicProfile({ _id: 'u1', firstName: 'Solo' });
      assert.strictEqual('gender' in out, false);
    });

    it('handles a mongoose document via toObject', () => {
      const doc = { toObject: () => fullUser() };
      assert.strictEqual(toPublicProfile(doc).firstName, 'Ashley');
      assert.strictEqual(toPublicProfile(doc).email, undefined);
    });

    it('maps a list and tolerates an empty or missing one', () => {
      assert.strictEqual(toPublicProfiles([fullUser(), fullUser()]).length, 2);
      assert.deepStrictEqual(toPublicProfiles([]), []);
      assert.deepStrictEqual(toPublicProfiles(null), []);
    });

    it('does not mutate its input', () => {
      const user = fullUser();
      toPublicProfile(user);
      assert.strictEqual(user.email, 'ashley@example.com');
    });

    it('builds a projection string naming no private field', () => {
      const projection = publicProjection().split(' ');
      for (const field of PRIVATE_PROFILE_FIELDS) {
        assert.strictEqual(projection.includes(field), false, `projection must not name ${field}`);
      }
    });

    it('has no field in both lists', () => {
      const overlap = PUBLIC_PROFILE_FIELDS.filter(f => PRIVATE_PROFILE_FIELDS.includes(f));
      assert.deepStrictEqual(overlap, [], `contradictory classification: ${overlap.join(', ')}`);
    });
  });

  describe('schema coverage', () => {
    it('classifies every field in models/User.js as public or private', () => {
      // The guard that makes this policy durable. A denylist ('-password')
      // publishes new schema fields by default; this fails the build instead,
      // so adding a field to User.js forces a decision about who may see it.
      const schema = fs.readFileSync(path.join(__dirname, '..', 'models', 'User.js'), 'utf8');
      const body = schema.slice(schema.indexOf('UserSchema'));
      const fields = [...body.matchAll(/^\s{2}(\w+):\s*\{/gm)].map(m => m[1]);

      assert.ok(fields.length > 30, `expected to parse the schema, found ${fields.length} fields`);

      const unclassified = fields.filter(
        f => !PUBLIC_PROFILE_FIELDS.includes(f) && !PRIVATE_PROFILE_FIELDS.includes(f)
      );

      assert.deepStrictEqual(
        unclassified, [],
        `Unclassified User schema field(s): ${unclassified.join(', ')}.\n` +
        `      Add each to PUBLIC_PROFILE_FIELDS or PRIVATE_PROFILE_FIELDS in lib/profileVisibility.js.\n` +
        `      A field that is neither is currently invisible to the API, which is the safe default,\n` +
        `      but the decision should be deliberate rather than implied by omission.`
      );
    });
  });
});
