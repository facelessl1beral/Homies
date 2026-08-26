const jwt = require('jsonwebtoken');
const Hostel = require('../models/Hostel');

/**
 * Authorise a hostel administrator.
 *
 * Every route in routes/api/hostels.js previously verified the token inline,
 * eight separate times. Five of those copies checked that the token carried
 * `role: 'admin'`; three did not.
 *
 * The three that skipped the check appeared to be safe, because a student
 * token has no `hostel` claim, so `decoded.hostel.id` threw a TypeError which
 * the catch block turned into a 500. In other words the endpoints were
 * protected by an accident of property access rather than by a check. That is
 * the worst kind of control: it looks deliberate, it is not tested, and it
 * stops working the moment someone adds an optional-chaining operator while
 * tidying up. It also returns 500 instead of 403, so a misconfigured admin
 * client cannot tell "you are not allowed" from "the server is broken".
 *
 * Consolidating into one middleware means there is exactly one place where
 * the rule lives, and adding a route can no longer mean forgetting it.
 *
 * On success this attaches:
 *   req.hostelId — the id from the token
 *   req.hostel   — the loaded Hostel document
 *
 * Note that the hostel id always comes from the *token*, never from the
 * request body or params. This is what stops one hostel's administrator
 * reading or modifying another hostel's rooms, and it must stay that way: the
 * moment a handler takes a hostel id from user input, that boundary is gone.
 */
module.exports = async function hostelAuth(req, res, next) {
  const token = req.header('x-auth-token');

  if (!token) {
    return res.status(401).json({ msg: 'No token, authorization denied' });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    // Covers an expired token, a bad signature, and malformed input alike.
    // Deliberately does not say which, so the response cannot be used to
    // probe for valid hostel names.
    return res.status(401).json({ msg: 'Token is not valid' });
  }

  if (!decoded.hostel || decoded.hostel.role !== 'admin') {
    return res.status(403).json({ msg: 'Hostel administrator access required' });
  }

  try {
    const hostel = await Hostel.findById(decoded.hostel.id);
    if (!hostel) {
      // A validly signed token for a hostel that no longer exists.
      return res.status(401).json({ msg: 'Hostel account no longer exists' });
    }

    req.hostelId = decoded.hostel.id;
    req.hostel = hostel;
    next();
  } catch (err) {
    console.error('hostelAuth error:', err.message);
    res.status(500).json({ msg: 'Server error' });
  }
};
