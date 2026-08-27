const jwt = require('jsonwebtoken');

/**
 * Authenticate a student.
 *
 * The token must be validly signed AND carry a `user` claim. Both halves
 * matter, because student tokens and hostel admin tokens are signed with the
 * same secret. A signature check alone would let a hostel admin's token
 * satisfy a student route: it verifies perfectly, and the only thing marking
 * it as the wrong kind of token is the shape of its payload.
 *
 * Previously `req.user = decoded.user` assigned undefined for a hostel token
 * and called next(), so the request reached the handler with no user id and
 * failed further in — usually as a 500, occasionally as a query for
 * `undefined` that returned nothing and looked like missing data. The claim
 * check turns that into an explicit 401 at the boundary.
 *
 * Covered by tests/api.auth.test.js, which asserts the status codes rather
 * than only the happy path.
 */
module.exports = function (req, res, next) {
  const token = req.header('x-auth-token');

  if (!token) {
    return res.status(401).json({ msg: 'No token, authorization denied' });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    // Expired, bad signature, malformed — all client errors, all 401.
    // Returning 500 for a malformed header would make a bad request
    // indistinguishable from an outage.
    return res.status(401).json({ msg: 'Token is not valid' });
  }

  if (!decoded.user || !decoded.user.id) {
    return res.status(401).json({ msg: 'Token is not valid for this resource' });
  }

  req.user = decoded.user;
  next();
};
