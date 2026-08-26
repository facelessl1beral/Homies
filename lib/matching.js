/**
 * Homies Matching Engine V2
 * =========================
 *
 * Pure functions only. This module deliberately has no dependency on mongoose,
 * express, or any request object, so that it can be unit tested without a
 * database. `routes/api/profile.js` is the only caller.
 *
 * The engine runs in two stages, in this order:
 *
 *   Stage 1 — Dealbreakers. A hard pre-filter. A candidate that fails is
 *             removed entirely and never scored.
 *   Stage 2 — Weighted category scoring. Five categories, fixed weights,
 *             rounded to the nearest integer.
 *
 * The weights below are the documented model (README "Matching Algorithm").
 * If you change them, change the README in the same commit — a scoring model
 * that disagrees with its own documentation is the failure this project can
 * least afford to have found during review.
 */

// ---------------------------------------------------------------------------
// Shared vocabulary
// ---------------------------------------------------------------------------

/**
 * Values that mean "I have no constraint here".
 *
 * This list is the fix for the single worst bug in the pre-refactor engine.
 * The old filter tested `roomieGender !== 'No preference'`, but the
 * questionnaire in client/src/components/dashboard/EditProfile.js never offers
 * the string 'No preference' for that field — its opt-out is "Don't Care".
 * The result was that every user who answered the roommate-gender question
 * with the most natural answer had *every* candidate filtered out and saw an
 * empty Discover feed, while users who skipped the question saw a full one.
 *
 * Both spellings are accepted so that existing rows written under either
 * convention keep working, and so that adding an opt-out to another pill group
 * later does not silently reintroduce the same class of bug.
 */
const NO_CONSTRAINT = ["Don't Care", "Don't care", 'No preference', 'Any', 'None', ''];

const hasConstraint = value =>
  typeof value === 'string' && value.trim() !== '' && !NO_CONSTRAINT.includes(value.trim());

/** Candidates whose own smoking answer counts as "smokes". */
const SMOKING_ANSWERS = ['Smoker', 'Social smoker'];

// ---------------------------------------------------------------------------
// Stage 1 — Dealbreakers
// ---------------------------------------------------------------------------

/**
 * Decide whether `other` survives `viewer`'s hard filters.
 *
 * Deliberately narrow. Only two constraints are enforced as dealbreakers:
 * roommate gender and "non-smoker only". Everything else the user tells us
 * about their ideal roommate is a soft signal and belongs in scoring, not in a
 * filter.
 *
 * That restraint is the lesson of the bug this replaces: a hard filter that is
 * even slightly too eager produces an empty feed, and an empty feed is
 * indistinguishable from "there are no other users yet". It fails silently and
 * looks like a data problem rather than a logic problem.
 *
 * Missing data on the candidate's side never excludes them. If a viewer asks
 * for a female roommate and a candidate has not filled in their gender, we
 * cannot evaluate the constraint, so we let them through rather than hiding
 * every new signup from everyone who has stated a preference.
 *
 * The check is applied in both directions by `passesDealbreakers` — a pairing
 * only survives if each person is willing to live with the other.
 */
const satisfiesPreferences = (viewer, other) => {
  // --- Roommate gender ------------------------------------------------------
  if (hasConstraint(viewer.roomieGender) && hasConstraint(other.gender)) {
    if (viewer.roomieGender === 'Same gender only') {
      // Only enforceable when we know the viewer's own gender.
      if (hasConstraint(viewer.gender) && viewer.gender !== other.gender) return false;
    } else if (viewer.roomieGender !== other.gender) {
      return false;
    }
  }

  // --- Smoking --------------------------------------------------------------
  // Note this reads `roomieSmoke` (what the viewer asked for), not `smoke`
  // (the viewer's own habit). The old engine compared own-habit to own-habit,
  // which meant a non-smoker who had explicitly answered "Smoker ok" still had
  // every smoker hidden from them — their stated preference was collected and
  // then ignored.
  if (viewer.roomieSmoke === 'Non-smoker only' && SMOKING_ANSWERS.includes(other.smoke)) {
    return false;
  }

  return true;
};

/** Mutual dealbreaker check. Both people must be willing. */
const passesDealbreakers = (current, other) =>
  satisfiesPreferences(current, other) && satisfiesPreferences(other, current);

// ---------------------------------------------------------------------------
// Stage 2 — Weighted category scoring
// ---------------------------------------------------------------------------

const CATEGORIES = [
  { name: 'lifestyle',   weight: 0.40, fields: ['sleepSchedule', 'cleanliness', 'studyPref', 'social', 'noise', 'guests', 'exercise'] },
  { name: 'habits',      weight: 0.20, fields: ['food', 'smoke', 'drink', 'cook'] },
  { name: 'academic',    weight: 0.15, fields: ['univ', 'course', 'sem'] },
  { name: 'demographic', weight: 0.10, fields: ['gender', 'age', 'country'] },
  { name: 'hostel',      weight: 0.15, fields: ['preferredHostel', 'roomType', 'floorPref', 'bathroomPref', 'proximityPref'] },
];

/**
 * Percentage agreement within one category.
 *
 * A field counts toward the denominator when *either* person has answered it.
 * That is intentional: it means an unanswered field is scored as a
 * disagreement rather than being quietly skipped, so a half-filled profile
 * cannot reach 100% by answering only the questions it happens to agree on.
 */
const categoryScore = (current, other, fields) => {
  let matched = 0;
  let total = 0;
  fields.forEach(field => {
    const a = current[field];
    const b = other[field];
    if (a || b) {
      total++;
      if (a && b && a === b) matched++;
    }
  });
  return total === 0 ? 0 : (matched / total) * 100;
};

/** Per-category breakdown, useful for explaining a score during review. */
const scoreBreakdown = (current, other) => {
  const breakdown = {};
  CATEGORIES.forEach(c => {
    breakdown[c.name] = Math.round(categoryScore(current, other, c.fields));
  });
  return breakdown;
};

/** Final compatibility score, 0–100, rounded to the nearest integer. */
const score = (current, other) =>
  Math.round(
    CATEGORIES.reduce(
      (sum, c) => sum + categoryScore(current, other, c.fields) * c.weight,
      0
    )
  );

// ---------------------------------------------------------------------------
// Full pipeline
// ---------------------------------------------------------------------------

/**
 * Rank candidates for one viewer.
 *
 * `candidates` are plain objects (call `.toObject()` on mongoose docs first).
 * Returns a new array, highest score first, each entry carrying `score`,
 * `breakdown`, and the viewer's swipe `status` for that person.
 */
const rankCandidates = (currentUser, candidates) =>
  candidates
    .filter(other => passesDealbreakers(currentUser, other))
    .map(other => {
      const id = String(other._id);
      let status = '-';
      if (Array.isArray(currentUser.rejected) && currentUser.rejected.map(String).includes(id)) {
        status = 'Rejected';
      } else if (Array.isArray(currentUser.accepted) && currentUser.accepted.map(String).includes(id)) {
        status = 'Accepted';
      }
      return {
        ...other,
        score: score(currentUser, other),
        breakdown: scoreBreakdown(currentUser, other),
        status,
      };
    })
    .sort((a, b) => b.score - a.score);

module.exports = {
  NO_CONSTRAINT,
  hasConstraint,
  satisfiesPreferences,
  passesDealbreakers,
  categoryScore,
  scoreBreakdown,
  score,
  rankCandidates,
  CATEGORIES,
};
