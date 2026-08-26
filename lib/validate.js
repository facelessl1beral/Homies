/**
 * Request input guards.
 *
 * Mongoose builds queries from whatever it is handed. If a request body sends
 * a JSON object where the code expects a string, that object goes into the
 * filter as a query operator rather than a value — the classic NoSQL injection
 * shape, where `{"email": {"$ne": null}}` matches the first user in the
 * collection instead of nobody.
 *
 * This project was not exploitable through that path, but only by accident:
 * the login route happens to be shielded by express-validator's isEmail(),
 * which rejects non-strings, and the profile update happens to build its $set
 * from a hardcoded whitelist. Neither was a deliberate defence, and the
 * accept/reject endpoints took `req.body.id` straight into a query with no
 * type checking at all.
 *
 * Relying on an accident is the thing worth fixing here, not any specific
 * exploit. This makes the check explicit and independent of which mongoose
 * version is installed — which matters, because mongoose 5.x is end-of-life
 * and carries unpatched advisories that cannot be resolved without a four
 * major-version upgrade this project has no time to absorb safely.
 */

/** A 24-character hex string, the shape of a MongoDB ObjectId. */
const OBJECT_ID = /^[0-9a-fA-F]{24}$/;

/**
 * Returns the value only if it is a plain string that looks like an ObjectId.
 * Anything else — an object, an array, a number, null — returns null, so a
 * caller cannot accidentally pass a query operator through.
 */
const asObjectId = value =>
  typeof value === 'string' && OBJECT_ID.test(value) ? value : null;

/** Returns the value only if it is a plain string. Trims it. */
const asString = value => (typeof value === 'string' ? value.trim() : null);

/**
 * Express middleware factory: require the named body fields to be valid
 * ObjectId strings.
 *
 *   router.post('/accept', auth, requireIds('id'), handler)
 */
const requireIds = (...fields) => (req, res, next) => {
  for (const field of fields) {
    if (!asObjectId(req.body[field])) {
      return res.status(400).json({ msg: `'${field}' must be a valid id` });
    }
  }
  next();
};

module.exports = { OBJECT_ID, asObjectId, asString, requireIds };
