/**
 * What a student may see about another student.
 *
 * Every profile response passes through here.
 *
 * ---------------------------------------------------------------------------
 * Why this exists
 * ---------------------------------------------------------------------------
 *
 * Profile endpoints previously returned `User.find().select('-password')`.
 * That removes exactly one field and returns all forty-nine others, so the
 * payload included every student's `email`, their complete `accepted` and
 * `rejected` swipe history, and their `bookingStatus`, `assignedRoom` and
 * `assignedHostel`. Three of those endpoints required no authentication at
 * all, so anyone who could reach the API could enumerate every student's
 * email address and see exactly who each of them had swiped on.
 *
 * `-password` is a denylist, and a denylist is the wrong shape for this
 * problem: adding a field to the schema silently publishes it. Every field
 * added to `User.js` from now on is private until it is named here.
 *
 * The distinction that matters is between what a student volunteered *in
 * order to be matched*, and everything else the system knows about them.
 * Sleep schedule is the first kind. An email address, a swipe history and a
 * room number are the second.
 */

/**
 * Fields safe to show to another logged-in student.
 *
 * Everything the questionnaire collects for matching, plus the identity
 * fields needed to render a card. This is exactly the set that
 * ProfileItem.js and the swipe card actually read — checked against both
 * rather than guessed.
 */
const PUBLIC_PROFILE_FIELDS = [
  '_id', 'firstName', 'lastName', 'name', 'avatar', 'date',
  'linkedin', 'notes',

  // Demographic
  'gender', 'age', 'city', 'country',

  // Academic
  'univ', 'sem', 'course',

  // Lifestyle
  'sleepSchedule', 'cleanliness', 'studyPref', 'social', 'noise',
  'guests', 'exercise',

  // Habits
  'food', 'smoke', 'drink', 'cook',

  // Hostel preferences — shown so a student can see whether a candidate is
  // aiming for the same place, which is what makes a match actionable.
  'preferredHostel', 'roomType', 'floorPref', 'bathroomPref', 'proximityPref',

  // Stated roommate preferences. Visible because they explain a match, and
  // because a candidate should be able to see they are being filtered on them.
  'roomieGender', 'roomieAge', 'roomieCountry', 'roomieUniv', 'roomieSem',
  'roomieCourse', 'roomieFood', 'roomieSmoke', 'roomieDrink', 'roomieCook',
  'checkIn', 'checkOut', 'roomPreference',
];

/**
 * Deliberately excluded, and why:
 *
 *   password        — obviously
 *   email           — contact details. Released only once a booking pairs two
 *                     students, by routes/api/hostels.js, to the two people
 *                     it concerns
 *   accepted        — another student's swipe history. Reciprocity is reported
 *   rejected          as a single `likesYou` boolean instead, which answers the
 *                     only question the UI needs without exposing who else
 *                     they liked or, worse, who they passed on
 *   bookingStatus   — where a student lives. Not a matching signal, and the
 *   assignedRoom      one piece of data here with a physical-safety dimension
 *   assignedHostel
 */
const PRIVATE_PROFILE_FIELDS = [
  'password', 'email', 'accepted', 'rejected',
  'bookingStatus', 'assignedRoom', 'assignedHostel',
  // Whether someone has paid their rent is nobody else's business. Visible
  // only to the student themselves (via /profile/me) and to their hostel's
  // administrator.
  'paymentStatus', 'paymentNote', 'paymentUpdated',
  // A phone number is contact information, exactly like an email address. It
  // is released to the one student who ends up sharing a room, by the booking
  // flow, and to that hostel's administrator. It is not a matching signal and
  // has no business on a swipe card.
  'phone',
];

/** Mongoose projection string: `_id firstName lastName ...` */
const publicProjection = () => PUBLIC_PROFILE_FIELDS.join(' ');

/**
 * Reduce one profile to its public fields.
 *
 * Accepts a mongoose document or a plain object. Applied even to already
 * projected queries, so that a projection accidentally widened in one handler
 * cannot leak through: the allowlist is enforced twice, at the query and at
 * the response.
 */
const toPublicProfile = profile => {
  if (!profile) return null;
  const source = typeof profile.toObject === 'function' ? profile.toObject() : profile;
  const out = {};
  for (const field of PUBLIC_PROFILE_FIELDS) {
    if (source[field] !== undefined) out[field] = source[field];
  }
  return out;
};

const toPublicProfiles = profiles => (profiles || []).map(toPublicProfile);

module.exports = {
  PUBLIC_PROFILE_FIELDS,
  PRIVATE_PROFILE_FIELDS,
  publicProjection,
  toPublicProfile,
  toPublicProfiles,
};
