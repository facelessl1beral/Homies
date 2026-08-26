const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const { check, validationResult } = require('express-validator');
const User = require('../../models/User');
const Hostel = require('../../models/Hostel');
const { rankCandidates } = require('../../lib/matching');

// @route   GET /api/profile
// @desc    Get all profiles (dev only)
router.get('/', async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (err) {
    res.status(500).send('Server error');
  }
});

// @route   GET /api/profile/me
// @desc    Get current user's profile
// @access  Private
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(400).json({ msg: 'There is no profile for this user' });
    }
    res.status(200).json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET /api/profile/recommended
// @desc    Get recommended roommates, dealbreaker-filtered and score-ranked
// @access  Private
router.get('/recommended', auth, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.id).select('-password');
    if (!currentUser) {
      return res.status(400).json({ msg: 'There is no profile for this user' });
    }

    const otherUsers = await User.find({ _id: { $ne: req.user.id } }).select('-password');

    // The engine itself lives in lib/matching.js so that it can be unit tested
    // without a database. See tests/matching.test.js.
    const ranked = rankCandidates(currentUser, otherUsers.map(u => u.toObject()));

    // Strip fields a swipe card has no business carrying to the browser.
    // `accepted`/`rejected` are other people's swipe history and `email` is
    // contact information that should only be revealed once a booking is
    // confirmed. `likesYou` is computed here instead so the client can tell a
    // real mutual match from a one-sided like without being handed the raw
    // lists to work it out from.
    const myId = String(currentUser._id);
    const payload = ranked.map(candidate => {
      const { accepted, rejected, email, ...safe } = candidate;
      return {
        ...safe,
        likesYou: Array.isArray(accepted) && accepted.map(String).includes(myId),
      };
    });

    res.status(200).json(payload);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST /api/profile
// @desc    Create or update user profile
// @access  Private
router.post('/', auth, async (req, res) => {
  try {
    const fields = [
      'name','gender','age','city','country','univ','sem','course',
      'sleepSchedule','cleanliness','studyPref','social','noise','guests','exercise',
      'food','smoke','drink','cook','notes','linkedin',
      'roomieGender','roomieAge','roomieCountry','roomieUniv',
      'roomieSem','roomieCourse','roomieFood','roomieSmoke',
      'roomieDrink','roomieCook',
      'preferredHostel','roomType','floorPref','bathroomPref','proximityPref'
    ];

    const updateData = {};
    fields.forEach(field => {
      if (req.body[field] !== undefined) updateData[field] = req.body[field];
    });

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updateData },
      { new: true }
    ).select('-password');

    res.status(201).json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST /api/profile/reject
// @desc    Reject a user
// @access  Private
router.post('/reject', auth, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user.id,
      {
        $addToSet: { rejected: req.body.id },
        $pull:     { accepted: req.body.id }
      },
      { new: true }
    ).select('-password');

    res.status(200).json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST /api/profile/accept
// @desc    Accept a user, and report whether that created a mutual match
// @access  Private
router.post('/accept', auth, async (req, res) => {
  try {
    const targetId = req.body.id;
    if (!targetId) return res.status(400).json({ msg: 'No user id supplied' });

    const user = await User.findByIdAndUpdate(
      req.user.id,
      {
        $addToSet: { accepted: targetId },
        $pull:     { rejected: targetId }
      },
      { new: true }
    ).select('-password');

    // Reciprocity is decided here, on the server, and returned as a plain
    // boolean. Previously the client showed its "It's a Match!" overlay on
    // every right-swipe with no check at all, so a one-sided like was
    // presented to the user as a confirmed mutual match. Deciding it here
    // rather than shipping the other person's `accepted` array to the browser
    // keeps other users' swipe history private.
    const target = await User.findById(targetId).select('firstName lastName name avatar accepted');
    const mutual = !!target
      && Array.isArray(target.accepted)
      && target.accepted.map(String).includes(String(req.user.id));

    res.status(200).json({
      profile: user,
      mutual,
      matchedWith: mutual
        ? { _id: target._id, firstName: target.firstName, lastName: target.lastName, name: target.name, avatar: target.avatar }
        : null
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET /api/profile/user/:user_id
// @desc    Get profile by user ID
// @access  Public
router.get('/user/:user_id', async (req, res) => {
  try {
    const user = await User.findById(req.params.user_id).select('-password');
    if (!user) return res.status(400).json({ msg: 'Profile not found' });
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;
