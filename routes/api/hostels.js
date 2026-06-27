const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { check, validationResult } = require('express-validator');
const Hostel = require('../../models/Hostel');
const User = require('../../models/User');
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
});

// Register hostel
// Public — get all hostels (no auth required)
router.get('/public', async (req, res) => {
  try {
    const hostels = await Hostel.find({}, { name: 1, location: 1, description: 1, rooms: 1 });
    const result = hostels.map(h => ({ _id: h._id, name: h.name, location: h.location, description: h.description, totalRooms: h.rooms.length, availableRooms: h.rooms.filter(r => r.status === 'available').length }));
    res.json(result);
  } catch (err) { res.status(500).send('Server error'); }
});

router.post('/register', [
  check('name', 'Hostel name required').not().isEmpty(),
  check('contactEmail', 'Valid email required').isEmail(),
  check('password', 'Password must be 6+ chars').isLength({ min: 6 })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { name, contactEmail, password, location, description } = req.body;
  try {
    let hostel = await Hostel.findOne({ name });
    if (hostel) return res.status(400).json({ errors: [{ msg: 'Hostel already registered' }] });

    hostel = new Hostel({ name, contactEmail, password, location, description });
    const salt = await bcrypt.genSalt(10);
    hostel.password = await bcrypt.hash(password, salt);
    await hostel.save();

    const payload = { hostel: { id: hostel.id, role: 'admin' } };
    jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' }, (err, token) => {
      if (err) throw err;
      res.json({ token });
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Login hostel
router.post('/login', [
  check('name', 'Hostel name required').not().isEmpty(),
  check('password', 'Password required').exists()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { name, password } = req.body;
  try {
    const hostel = await Hostel.findOne({ name });
    if (!hostel) return res.status(400).json({ errors: [{ msg: 'Invalid credentials' }] });

    const isMatch = await bcrypt.compare(password, hostel.password);
    if (!isMatch) return res.status(400).json({ errors: [{ msg: 'Invalid credentials' }] });

    const payload = { hostel: { id: hostel.id, role: 'admin' } };
    jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' }, (err, token) => {
      if (err) throw err;
      res.json({ token });
    });
  } catch (err) {
    res.status(500).send('Server error');
  }
});

// Get all hostels — for student dropdown
router.get('/', async (req, res) => {
  try {
    const hostels = await Hostel.find().select('name location description');
    res.json(hostels);
  } catch (err) {
    res.status(500).send('Server error');
  }
});

// Get mutual matches for this hostel — admin dashboard
router.get('/matches', async (req, res) => {
  const token = req.header('x-auth-token');
  if (!token) return res.status(401).json({ msg: 'No token' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded.hostel || decoded.hostel.role !== 'admin') return res.status(403).json({ msg: 'Forbidden' });

    const hostel = await Hostel.findById(decoded.hostel.id);
    const students = await User.find({ preferredHostel: hostel.name });

    const matches = [];
    for (const student of students) {
      for (const acceptedId of student.accepted) {
        const other = await User.findById(acceptedId);
        if (
          other &&
          other.preferredHostel === hostel.name &&
          other.accepted.includes(student._id.toString())
        ) {
          const alreadyAdded = matches.some(m =>
            m.studentA._id.toString() === other._id.toString() &&
            m.studentB._id.toString() === student._id.toString()
          );
          if (!alreadyAdded) matches.push({ studentA: student, studentB: other });
        }
      }
    }
    res.json(matches);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});


// Add a room to this hostel
router.post('/rooms', async (req, res) => {
  const token = req.header('x-auth-token');
  if (!token) return res.status(401).json({ msg: 'No token' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded.hostel || decoded.hostel.role !== 'admin') return res.status(403).json({ msg: 'Forbidden' });
    const hostel = await Hostel.findById(decoded.hostel.id);
    const { roomNumber, type, floor, bathroom, proximity, capacity } = req.body;
    hostel.rooms.push({ roomNumber, type, floor, bathroom, proximity, capacity });
    await hostel.save();
    res.json(hostel.rooms);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Get all rooms for this hostel
router.get('/rooms', async (req, res) => {
  const token = req.header('x-auth-token');
  if (!token) return res.status(401).json({ msg: 'No token' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const hostel = await Hostel.findById(decoded.hostel.id);
    res.json(hostel.rooms);
  } catch (err) {
    res.status(500).send('Server error');
  }
});

// Confirm a match — assign students to a room
router.post('/matches/confirm', async (req, res) => {
  const token = req.header('x-auth-token');
  if (!token) return res.status(401).json({ msg: 'No token' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded.hostel || decoded.hostel.role !== 'admin') return res.status(403).json({ msg: 'Forbidden' });

    const { studentAId, studentBId, roomId } = req.body;
    const hostel = await Hostel.findById(decoded.hostel.id);

    // Update room status and occupants
    const room = hostel.rooms.id(roomId);
    if (!room) return res.status(404).json({ msg: 'Room not found' });
    room.status = 'pending';
    room.occupants = [studentAId, studentBId];
    await hostel.save();

    // Update both students
    await User.findByIdAndUpdate(studentAId, {
      bookingStatus: 'confirmed',
      assignedRoom: room.roomNumber,
      assignedHostel: hostel.name
    });
    await User.findByIdAndUpdate(studentBId, {
      bookingStatus: 'confirmed',
      assignedRoom: room.roomNumber,
      assignedHostel: hostel.name
    });

    // Fetch both students for email
    const studentA = await User.findById(studentAId);
    const studentB = await User.findById(studentBId);


    // Email to students — wrapped so SMTP failure doesn't block booking
    try {
      await transporter.sendMail({
        from: `"Homies" <${process.env.SMTP_USER}>`,
      to: studentA.email,
      subject: `Your room is confirmed — ${hostel.name}`,
      html: `
        <h2>Your Homies booking is confirmed! 🎉</h2>
        <p>Hi ${studentA.name || studentA.firstName},</p>
        <p>Your room has been confirmed at <strong>${hostel.name}</strong>.</p>
        <table style="border-collapse:collapse;margin:16px 0">
          <tr><td style="padding:6px 16px 6px 0;color:#888">Room</td><td><strong>${room.roomNumber}</strong></td></tr>
          <tr><td style="padding:6px 16px 6px 0;color:#888">Hostel</td><td><strong>${hostel.name}</strong></td></tr>
          <tr><td style="padding:6px 16px 6px 0;color:#888">Roommate</td><td><strong>${studentB.name || studentB.firstName}</strong></td></tr>
          <tr><td style="padding:6px 16px 6px 0;color:#888">Roommate email</td><td>${studentB.email}</td></tr>
        </table>
        <p>Please contact your hostel to arrange move-in details.</p>
        <p style="color:#888;font-size:0.85rem">— The Homies Team</p>
      `
    });

    // Email to Student B
      await transporter.sendMail({
      from: `"Homies" <${process.env.SMTP_USER}>`,
      to: studentB.email,
      subject: `Your room is confirmed — ${hostel.name}`,
      html: `
        <h2>Your Homies booking is confirmed! 🎉</h2>
        <p>Hi ${studentB.name || studentB.firstName},</p>
        <p>Your room has been confirmed at <strong>${hostel.name}</strong>.</p>
        <table style="border-collapse:collapse;margin:16px 0">
          <tr><td style="padding:6px 16px 6px 0;color:#888">Room</td><td><strong>${room.roomNumber}</strong></td></tr>
          <tr><td style="padding:6px 16px 6px 0;color:#888">Hostel</td><td><strong>${hostel.name}</strong></td></tr>
          <tr><td style="padding:6px 16px 6px 0;color:#888">Roommate</td><td><strong>${studentA.name || studentA.firstName}</strong></td></tr>
          <tr><td style="padding:6px 16px 6px 0;color:#888">Roommate email</td><td>${studentA.email}</td></tr>
        </table>
        <p>Please contact your hostel to arrange move-in details.</p>
        <p style="color:#888;font-size:0.85rem">— The Homies Team</p>
      `
    });

      // Email sent successfully
    } catch (emailErr) {
      console.warn('⚠️  Email failed (check SMTP credentials):', emailErr.message);
    }
    res.json({ msg: 'Booking confirmed', room: room.roomNumber, hostel: hostel.name });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Get occupant details for a room
router.get('/rooms/:roomId/occupants', async (req, res) => {
  const token = req.header('x-auth-token');
  if (!token) return res.status(401).json({ msg: 'No token' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const hostel = await Hostel.findById(decoded.hostel.id);
    const room = hostel.rooms.id(req.params.roomId);
    if (!room) return res.status(404).json({ msg: 'Room not found' });
    const occupants = await User.find(
      { _id: { $in: room.occupants } },
      { name: 1, firstName: 1, lastName: 1, email: 1, course: 1, sem: 1 }
    );
    res.json(occupants);
  } catch (err) {
    res.status(500).send('Server error');
  }
});

// Remove a student from a room
router.post('/rooms/remove-occupant', async (req, res) => {
  const token = req.header('x-auth-token');
  if (!token) return res.status(401).json({ msg: 'No token' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded.hostel || decoded.hostel.role !== 'admin') return res.status(403).json({ msg: 'Forbidden' });
    const { roomId, studentId } = req.body;
    const hostel = await Hostel.findById(decoded.hostel.id);
    const room = hostel.rooms.id(roomId);
    if (!room) return res.status(404).json({ msg: 'Room not found' });
    room.occupants = room.occupants.filter(id => id.toString() !== studentId.toString());
    if (room.occupants.length === 0) room.status = 'available';
    await hostel.save();
    await User.findByIdAndUpdate(studentId, {
      bookingStatus: 'none',
      assignedRoom: '',
      assignedHostel: ''
    });
    res.json({ msg: 'Student removed from room', room });
  } catch (err) {
    res.status(500).send('Server error');
  }
});

// Switch a student to a different room
router.post('/rooms/switch-occupant', async (req, res) => {
  const token = req.header('x-auth-token');
  if (!token) return res.status(401).json({ msg: 'No token' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded.hostel || decoded.hostel.role !== 'admin') return res.status(403).json({ msg: 'Forbidden' });
    const { studentId, fromRoomId, toRoomId } = req.body;
    const hostel = await Hostel.findById(decoded.hostel.id);
    const fromRoom = hostel.rooms.id(fromRoomId);
    const toRoom = hostel.rooms.id(toRoomId);
    if (!fromRoom || !toRoom) return res.status(404).json({ msg: 'Room not found' });
    if (toRoom.status !== 'available') return res.status(400).json({ msg: `Room ${toRoom.roomNumber} is not available` });
    // Remove from old room
    fromRoom.occupants = fromRoom.occupants.filter(id => id.toString() !== studentId.toString());
    if (fromRoom.occupants.length === 0) fromRoom.status = 'available';
    // Add to new room
    toRoom.occupants.push(studentId);
    if (toRoom.occupants.length >= toRoom.capacity) toRoom.status = 'pending';
    await hostel.save();
    // Update student
    await User.findByIdAndUpdate(studentId, {
      assignedRoom: toRoom.roomNumber,
      assignedHostel: hostel.name
    });
    res.json({ msg: `Student moved to Room ${toRoom.roomNumber}`, toRoom });
  } catch (err) {
    res.status(500).send('Server error');
  }
});

// Delete a room
router.delete('/rooms/:roomId', async (req, res) => {
  const token = req.header('x-auth-token');
  if (!token) return res.status(401).json({ msg: 'No token' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const hostel = await Hostel.findById(decoded.hostel.id);
    hostel.rooms = hostel.rooms.filter(r => r._id.toString() !== req.params.roomId);
    await hostel.save();
    res.json(hostel.rooms);
  } catch (err) {
    res.status(500).send('Server error');
  }
});

module.exports = router;