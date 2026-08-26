const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { check, validationResult } = require('express-validator');
const User = require('../../models/User');
const auth = require('../../middleware/auth');
const { publicProjection, toPublicProfiles } = require('../../lib/profileVisibility');

// @route   GET /api/users
// @desc    Get all students
// @access  Private
//
// Was public and returned select('-password'), i.e. every student's email
// address, swipe history and room assignment to any unauthenticated caller.
// The comment described it as "dev only", but it was mounted in production
// exactly like every other route — a note in a comment is not a deployment
// control.
router.get('/', auth, async (req, res) => {
  try {
    const users = await User.find().select(publicProjection());
    res.json(toPublicProfiles(users));
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST /api/users
// @desc    Register user
router.post(
  '/',
  [
    check('firstName', 'First name is required').not().isEmpty(),
    check('lastName',  'Last name is required').not().isEmpty(),
    check('email',     'Please include a valid email').isEmail(),
    check('password',  'Password must be 6 or more characters').isLength({ min: 6 })
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { firstName, lastName, email, password } = req.body;

    try {
      // Check if user exists
      let user = await User.findOne({ email });
      if (user) {
        return res.status(400).json({
          errors: [{ msg: 'User already exists' }]
        });
      }

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const encryptedPassword = await bcrypt.hash(password, salt);

      // Create user
      user = new User({
        firstName,
        lastName,
        email,
        password: encryptedPassword
      });

      await user.save();

      // Return JWT
      const payload = { user: { id: user.id } };

      jwt.sign(
        payload,
        process.env.JWT_SECRET,
        { expiresIn: '100h' },
        (err, token) => {
          if (err) throw err;
          res.status(201).json({
            token,
            success: true,
            message: 'User created!',
            errors: []
          });
        }
      );
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  }
);

module.exports = router;
