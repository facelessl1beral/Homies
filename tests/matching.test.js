/**
 * Matching engine tests.
 *
 * Placed in the top rigour tier (see docs/working-method.md §12) because this
 * is the code that decides who is allowed to see whom. It has a small number
 * of cases and a definite right answer, and it has been wrong once already.
 *
 * IMPORTANT — the option strings in these fixtures are copied verbatim from
 * client/src/components/dashboard/EditProfile.js. That is the whole point of
 * the suite. The original bug was not a logic error; the logic was internally
 * consistent. It was a *vocabulary* error: the server tested for a sentinel
 * string ('No preference') that the questionnaire never produces for that
 * field. Tests written against invented fixtures would have passed happily
 * while the live feed was empty.
 *
 * If you add or rename a pill option in EditProfile.js, update these fixtures
 * in the same commit.
 */

const assert = require('assert');
const {
  passesDealbreakers,
  satisfiesPreferences,
  categoryScore,
  score,
  rankCandidates,
} = require('../lib/matching');

// --- Fixtures --------------------------------------------------------------
// Verbatim option values from the questionnaire:
//   gender       : Male | Female | Non-Binary | Transgender | Intersex | Prefer not to say
//   roomieGender : Male | Female | Non-Binary | Same gender only | Don't Care
//   smoke        : Non-smoker | Social smoker | Smoker | Trying to quit
//   roomieSmoke  : Non-smoker only | Smoker ok | Don't Care

const student = (overrides = {}) => ({
  _id: overrides._id || 'id-' + Math.random().toString(36).slice(2),
  gender: '', age: '', country: '', univ: '', course: '', sem: '',
  sleepSchedule: '', cleanliness: '', studyPref: '', social: '', noise: '', guests: '', exercise: '',
  food: '', smoke: '', drink: '', cook: '',
  preferredHostel: '', roomType: '', floorPref: '', bathroomPref: '', proximityPref: '',
  roomieGender: '', roomieSmoke: '',
  accepted: [], rejected: [],
  ...overrides,
});

describe('Matching engine — Stage 1: dealbreakers', () => {

  describe('regression: the opt-out answers must not empty the feed', () => {
    // These four cases are the bug that this module was extracted to fix.
    // Before the fix, "Don't Care" and "Same gender only" each filtered out
    // 100% of candidates, because the server only recognised 'No preference'
    // as an opt-out and that string is not in the questionnaire.

    it('"Don\'t Care" imposes no gender constraint', () => {
      const me = student({ gender: 'Male', roomieGender: "Don't Care" });
      const pool = [
        student({ gender: 'Male' }),
        student({ gender: 'Female' }),
        student({ gender: 'Non-Binary' }),
        student({ gender: 'Prefer not to say' }),
      ];
      const survivors = pool.filter(o => passesDealbreakers(me, o));
      assert.strictEqual(survivors.length, 4, 'every candidate should survive "Don\'t Care"');
    });

    it('"Same gender only" keeps same-gender candidates and drops others', () => {
      const me = student({ gender: 'Male', roomieGender: 'Same gender only' });
      assert.strictEqual(passesDealbreakers(me, student({ gender: 'Male' })), true);
      assert.strictEqual(passesDealbreakers(me, student({ gender: 'Female' })), false);
    });

    it('an unanswered roommate-gender question imposes no constraint', () => {
      const me = student({ gender: 'Male', roomieGender: '' });
      assert.strictEqual(passesDealbreakers(me, student({ gender: 'Female' })), true);
    });

    it('a specific gender preference is honoured', () => {
      const me = student({ gender: 'Male', roomieGender: 'Female' });
      assert.strictEqual(satisfiesPreferences(me, student({ gender: 'Female' })), true);
      assert.strictEqual(satisfiesPreferences(me, student({ gender: 'Male' })), false);
    });
  });

  describe('new and incomplete profiles stay discoverable', () => {
    // A brand new signup has an empty profile. If a stated preference could be
    // failed by absent data, every new user would be invisible to every
    // established user — which looks exactly like "the app has no users".

    it('does not exclude a candidate whose gender is unset', () => {
      const me = student({ gender: 'Male', roomieGender: 'Female' });
      assert.strictEqual(satisfiesPreferences(me, student({ gender: '' })), true);
    });

    it('does not exclude a candidate whose smoking answer is unset', () => {
      const me = student({ roomieSmoke: 'Non-smoker only' });
      assert.strictEqual(satisfiesPreferences(me, student({ smoke: '' })), true);
    });

    it('an empty profile matches an empty profile', () => {
      assert.strictEqual(passesDealbreakers(student(), student()), true);
    });
  });

  describe('smoking is filtered on the stated preference, not on own habit', () => {
    // The old engine compared current.smoke to other.smoke, so a non-smoker
    // who had explicitly answered "Smoker ok" still had all smokers hidden.
    // Their answer was collected and then ignored.

    it('"Non-smoker only" excludes smokers and social smokers', () => {
      const me = student({ roomieSmoke: 'Non-smoker only' });
      assert.strictEqual(satisfiesPreferences(me, student({ smoke: 'Smoker' })), false);
      assert.strictEqual(satisfiesPreferences(me, student({ smoke: 'Social smoker' })), false);
    });

    it('"Non-smoker only" admits non-smokers and those trying to quit', () => {
      const me = student({ roomieSmoke: 'Non-smoker only' });
      assert.strictEqual(satisfiesPreferences(me, student({ smoke: 'Non-smoker' })), true);
      assert.strictEqual(satisfiesPreferences(me, student({ smoke: 'Trying to quit' })), true);
    });

    it('a non-smoker who said "Smoker ok" still sees smokers', () => {
      const me = student({ smoke: 'Non-smoker', roomieSmoke: 'Smoker ok' });
      assert.strictEqual(satisfiesPreferences(me, student({ smoke: 'Smoker' })), true);
    });

    it('own smoking habit alone never excludes anyone', () => {
      const me = student({ smoke: 'Non-smoker', roomieSmoke: '' });
      assert.strictEqual(passesDealbreakers(me, student({ smoke: 'Smoker' })), true);
    });
  });

  describe('dealbreakers apply in both directions', () => {
    it('rejects the pairing when only the candidate objects', () => {
      const me    = student({ gender: 'Male',   roomieGender: "Don't Care" });
      const them  = student({ gender: 'Female', roomieGender: 'Female' });
      assert.strictEqual(satisfiesPreferences(me, them), true, 'viewer is willing');
      assert.strictEqual(passesDealbreakers(me, them), false, 'candidate is not');
    });
  });
});

describe('Matching engine — Stage 2: weighted scoring', () => {

  it('two identical fully-filled profiles score 100', () => {
    const shared = {
      sleepSchedule: 'Night owl (after 12am)', cleanliness: 'Moderate', studyPref: 'Library',
      social: 'Moderate', noise: 'Quiet please', guests: 'Occasionally', exercise: 'Often',
      food: 'Halal', smoke: 'Non-smoker', drink: 'Non-drinker', cook: 'Learning',
      univ: 'Kyambogo University', course: 'BSc IS', sem: 'Year 4',
      gender: 'Male', age: '18-24', country: 'Uganda',
      preferredHostel: 'Olympia', roomType: 'Double', floorPref: 'First floor',
      bathroomPref: 'En-suite', proximityPref: 'Library',
    };
    assert.strictEqual(score(student(shared), student(shared)), 100);
  });

  it('two fully-filled profiles that agree on nothing score 0', () => {
    const a = student({ sleepSchedule: 'Early bird (before 10pm)', food: 'Vegan',   univ: 'KYU', gender: 'Male',   roomType: 'Single' });
    const b = student({ sleepSchedule: 'Night owl (after 12am)',    food: 'Halal',  univ: 'MUK', gender: 'Female', roomType: 'Double' });
    assert.strictEqual(score(a, b), 0);
  });

  it('two empty profiles score 0 rather than 100', () => {
    // Guards against the "vacuously perfect match" reading of the formula:
    // with no answers there is no evidence of compatibility, so 0 is correct
    // and 100 would be actively misleading on a swipe card.
    assert.strictEqual(score(student(), student()), 0);
  });

  it('an unanswered field counts against the score, it is not skipped', () => {
    // One side answers both lifestyle fields, the other answers one and agrees
    // on it. 1 of 2 fields in play => 50% of the lifestyle category.
    const a = student({ sleepSchedule: 'Night owl (after 12am)', cleanliness: 'Moderate' });
    const b = student({ sleepSchedule: 'Night owl (after 12am)' });
    assert.strictEqual(categoryScore(a, b, ['sleepSchedule', 'cleanliness']), 50);
  });

  it('applies the documented category weights', () => {
    // Perfect lifestyle agreement and nothing else answered should yield
    // exactly the lifestyle weight: 100 x 0.40 = 40.
    const lifestyle = {
      sleepSchedule: 'Regular (10pm–12am)', cleanliness: 'Very organised', studyPref: 'In my room',
      social: 'Private', noise: 'Moderate', guests: 'Never', exercise: 'Sometimes',
    };
    assert.strictEqual(score(student(lifestyle), student(lifestyle)), 40);

    // Perfect habits agreement alone: 100 x 0.20 = 20.
    const habits = { food: 'Vegan', smoke: 'Non-smoker', drink: 'Non-drinker', cook: 'Never' };
    assert.strictEqual(score(student(habits), student(habits)), 20);
  });

  it('returns an integer', () => {
    const a = student({ sleepSchedule: 'Library', food: 'Vegan', univ: 'KYU' });
    const b = student({ sleepSchedule: 'Library', food: 'Halal', univ: 'KYU' });
    assert.strictEqual(Number.isInteger(score(a, b)), true);
  });
});

describe('Matching engine — ranking pipeline', () => {

  it('sorts by descending score', () => {
    const me   = student({ _id: 'me', sleepSchedule: 'Library', food: 'Vegan', univ: 'KYU' });
    const weak = student({ _id: 'weak', sleepSchedule: 'In my room', food: 'Halal', univ: 'MUK' });
    const mid  = student({ _id: 'mid',  sleepSchedule: 'Library',    food: 'Halal', univ: 'MUK' });
    const best = student({ _id: 'best', sleepSchedule: 'Library',    food: 'Vegan', univ: 'KYU' });

    const ranked = rankCandidates(me, [weak, best, mid]);
    assert.deepStrictEqual(ranked.map(r => r._id), ['best', 'mid', 'weak']);
    assert.ok(ranked[0].score >= ranked[1].score);
    assert.ok(ranked[1].score >= ranked[2].score);
  });

  it('labels swipe status from the viewer\'s accepted and rejected lists', () => {
    const me = student({ _id: 'me', accepted: ['a'], rejected: ['r'] });
    const ranked = rankCandidates(me, [student({ _id: 'a' }), student({ _id: 'r' }), student({ _id: 'n' })]);
    const status = Object.fromEntries(ranked.map(r => [r._id, r.status]));
    assert.deepStrictEqual(status, { a: 'Accepted', r: 'Rejected', n: '-' });
  });

  it('attaches a per-category breakdown for every candidate', () => {
    // The breakdown is what makes a score explainable during academic review;
    // if it silently stops being emitted the swipe card loses its rationale.
    const ranked = rankCandidates(student({ _id: 'me' }), [student({ _id: 'x' })]);
    assert.deepStrictEqual(
      Object.keys(ranked[0].breakdown).sort(),
      ['academic', 'demographic', 'habits', 'hostel', 'lifestyle']
    );
  });

  it('does not mutate the candidate objects it is given', () => {
    const candidate = student({ _id: 'x' });
    rankCandidates(student({ _id: 'me' }), [candidate]);
    assert.strictEqual(candidate.score, undefined);
    assert.strictEqual(candidate.status, undefined);
  });

  it('removes candidates that fail a dealbreaker', () => {
    const me = student({ _id: 'me', roomieSmoke: 'Non-smoker only' });
    const ranked = rankCandidates(me, [
      student({ _id: 'smoker',     smoke: 'Smoker' }),
      student({ _id: 'non-smoker', smoke: 'Non-smoker' }),
    ]);
    assert.deepStrictEqual(ranked.map(r => r._id), ['non-smoker']);
  });
});
