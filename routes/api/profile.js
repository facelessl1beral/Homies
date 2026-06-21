const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const { check, validationResult } = require('express-validator');
const User = require('../../models/User');
const Hostel = require('../../models/Hostel');
const nodemailer = require('nodemailer');

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
// @desc    Get recommended roommates sorted by match score
// @access  Private
router.get('/recommended', auth, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.id).select('-password');
    if (!currentUser) {
      return res.status(400).json({ msg: 'There is no profile for this user' });
    }

    let otherUsers = await User.find({ 
      _id: { $ne: req.user.id } 
    }).select('-password');

    // Matching Engine V2 — weighted category scoring
    // Categories: Lifestyle 40%, Habits 20%, Academic 15%, Demographic 10%, Hostel 15%
    const categoryScore = (current, other, fields) => {
      if (fields.length === 0) return 0;
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

    const score = (current, other) => {
      const lifestyleFields   = ['sleepSchedule', 'cleanliness', 'studyPref', 'social', 'noise', 'guests', 'exercise'];
      const habitsFields      = ['food', 'smoke', 'drink', 'cook'];
      const academicFields    = ['univ', 'course', 'sem'];
      const demographicFields = ['gender', 'age', 'country'];
      const hostelFields      = ['preferredHostel', 'roomType', 'floorPref', 'bathroomPref', 'proximityPref'];

      const lifestyleScore   = categoryScore(current, other, lifestyleFields);
      const habitsScore      = categoryScore(current, other, habitsFields);
      const academicScore    = categoryScore(current, other, academicFields);
      const demographicScore = categoryScore(current, other, demographicFields);
      const hostelScore      = categoryScore(current, other, hostelFields);

      const finalScore =
        (lifestyleScore   * 0.40) +
        (habitsScore      * 0.20) +
        (academicScore    * 0.15) +
        (demographicScore * 0.10) +
        (hostelScore       * 0.15);

      return Math.round(finalScore);
    };

    // Dealbreaker pre-filter — hard incompatibilities excluded before scoring
    const passesDealbreakers = (current, other) => {
      // Smoking dealbreaker — non-smoker who cares vs smoker
      if (current.smoke === 'Non-smoker' && other.smoke === 'Smoker') return false;
      if (other.smoke === 'Non-smoker' && current.smoke === 'Smoker') return false;
      // Gender preference dealbreaker
      if (current.roomieGender && current.roomieGender !== 'No preference' && current.roomieGender !== other.gender) return false;
      if (other.roomieGender && other.roomieGender !== 'No preference' && other.roomieGender !== current.gender) return false;
      return true;
    };

    const filteredUsers = otherUsers.filter(other => passesDealbreakers(currentUser, other));

    const result = filteredUsers.map(other => {
      const obj = other.toObject();
      obj.score = score(currentUser, other);
      if (currentUser.rejected?.includes(other._id.toString())) {
        obj.status = 'Rejected';
      } else if (currentUser.accepted?.includes(other._id.toString())) {
        obj.status = 'Accepted';
      } else {
        obj.status = '-';
      }
      return obj;
    });

    result.sort((a, b) => b.score - a.score);
    res.status(200).json(result);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST /api/profile
// @desc    Create or update user profile
// @access  Private
router.post('/', auth, async (req, res) => {
  console.log('PROFILE POST BODY:', JSON.stringify(req.body, null, 2));
  try {
    const fields = [
      'avatar','name','gender','age','city','country','univ','sem','course',
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
// @desc    Accept a user
// @access  Private
router.post('/accept', auth, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user.id,
      {
        $addToSet: { accepted: req.body.id },
        $pull:     { rejected: req.body.id }
      },
      { new: true }
    ).select('-password');

    res.status(200).json(user);
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
