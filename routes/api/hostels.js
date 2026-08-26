const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { check, validationResult } = require('express-validator');
const Hostel = require('../../models/Hostel');
const User = require('../../models/User');
const nodemailer = require('nodemailer');
const hostelAuth = require('../../middleware/hostelAuth');
const { requireIds } = require('../../lib/validate');
const {
  canConfirmBooking, canDeleteRoom, canSwitchOccupant, deriveRoomStatus,
} = require('../../lib/booking');

// SMTP is optional. When it is not configured we log what would have been
// sent instead of constructing a transport with undefined credentials, which
// fails at send time with an error that reads like a code fault rather than a
// missing setting.
const SMTP_CONFIGURED = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

const transporter = SMTP_CONFIGURED
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    })
  : null;

const confirmationEmail = ({ hostel, room, recipient, roommate }) => `
  <h2>Your Homies booking is confirmed</h2>
  <p>Hi ${recipient.name || recipient.firstName},</p>
  <p>Your room has been confirmed at <strong>${hostel.name}</strong>.</p>
  <table style="border-collapse:collapse;margin:16px 0">
    <tr><td style="padding:6px 16px 6px 0;color:#888">Room</td><td><strong>${room.roomNumber}</strong></td></tr>
    <tr><td style="padding:6px 16px 6px 0;color:#888">Hostel</td><td><strong>${hostel.name}</strong></td></tr>
    <tr><td style="padding:6px 16px 6px 0;color:#888">Roommate</td><td><strong>${roommate.name || roommate.firstName}</strong></td></tr>
    <tr><td style="padding:6px 16px 6px 0;color:#888">Roommate email</td><td>${roommate.email}</td></tr>
  </table>
  <p>Please contact your hostel to arrange move-in details.</p>
  <p style="color:#888;font-size:0.85rem">— The Homies Team</p>
`;

/**
 * Notify both students. Never throws: a failed send must not roll back or
 * obscure a booking that has already been written.
 *
 * Returns true only if both messages were actually accepted by the server, so
 * the administrator can be told plainly when a booking succeeded but the
 * notification did not — rather than assuming the students have been told.
 */
async function sendBookingEmails({ hostel, room, studentA, studentB }) {
  if (!transporter) {
    console.warn(`ℹ SMTP not configured — booking confirmed for ${studentA.email} and ${studentB.email}, no email sent`);
    return false;
  }
  try {
    await Promise.all([
      transporter.sendMail({
        from: `"Homies" <${process.env.SMTP_USER}>`,
        to: studentA.email,
        subject: `Your room is confirmed — ${hostel.name}`,
        html: confirmationEmail({ hostel, room, recipient: studentA, roommate: studentB }),
      }),
      transporter.sendMail({
        from: `"Homies" <${process.env.SMTP_USER}>`,
        to: studentB.email,
        subject: `Your room is confirmed — ${hostel.name}`,
        html: confirmationEmail({ hostel, room, recipient: studentB, roommate: studentA }),
      }),
    ]);
    return true;
  } catch (err) {
    console.warn('⚠ Booking email failed (check SMTP credentials):', err.message);
    return false;
  }
}

// Register hostel
// Public — get all hostels (no auth required)
router.get('/public', async (req, res) => {
  try {
    const hostels = await Hostel.find({}, { name: 1, location: 1, description: 1, rooms: 1 });
    const result = hostels.map(h => ({ _id: h._id, name: h.name, location: h.location, description: h.description, totalRooms: h.rooms.length, availableRooms: h.rooms.filter(r => (r.occupants || []).length < (r.capacity || 0)).length }));
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
router.get('/matches', hostelAuth, async (req, res) => {
  try {
    const hostel = req.hostel;
    const students = await User.find({ preferredHostel: hostel.name });
    const byId = new Map(students.map(s => [String(s._id), s]));

    // Previously this ran a findById inside a nested loop, so a hostel with
    // N students issued N x (accepted count) database round trips on every
    // dashboard load. Both halves of a mutual match must already be in
    // `students` — the query selects everyone who chose this hostel, and a
    // pair is only shown when both did — so the map is sufficient and no
    // further queries are needed.
    const seen = new Set();
    const matches = [];
    for (const student of students) {
      for (const acceptedId of (student.accepted || []).map(String)) {
        const other = byId.get(acceptedId);
        if (!other) continue;
        if (!(other.accepted || []).map(String).includes(String(student._id))) continue;

        const key = [String(student._id), acceptedId].sort().join('|');
        if (seen.has(key)) continue;
        seen.add(key);
        matches.push({ studentA: student, studentB: other });
      }
    }
    res.json(matches);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});


// Add a room to this hostel
router.post('/rooms', hostelAuth, async (req, res) => {
  try {
    const hostel = req.hostel;
    const { roomNumber, type, floor, bathroom, proximity } = req.body;

    if (!roomNumber || !String(roomNumber).trim()) {
      return res.status(400).json({ msg: 'Room number is required' });
    }

    // Capacity was taken straight from the request body, where the admin form
    // sends it as a string from a number input. A string capacity makes every
    // later `occupants.length >= capacity` comparison behave unpredictably,
    // so it is coerced and bounded here rather than trusted.
    const capacity = Math.max(1, Math.min(20, parseInt(req.body.capacity, 10) || 2));

    const number = String(roomNumber).trim();
    if (hostel.rooms.some(r => r.roomNumber.toLowerCase() === number.toLowerCase())) {
      // Duplicate room numbers were previously allowed. Two rooms called "4B"
      // are indistinguishable in the admin dropdown, so an administrator
      // confirming a booking cannot tell which one they picked.
      return res.status(400).json({ msg: `Room ${number} already exists in this hostel` });
    }

    hostel.rooms.push({ roomNumber: number, type, floor, bathroom, proximity, capacity, status: 'available' });
    await hostel.save();
    res.json(hostel.rooms);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Get all rooms for this hostel
router.get('/rooms', hostelAuth, async (req, res) => {
  res.json(req.hostel.rooms);
});

// Confirm a match — assign both students to a room
router.post('/matches/confirm', hostelAuth, requireIds('studentAId', 'studentBId', 'roomId'), async (req, res) => {
  try {
    const { studentAId, studentBId, roomId } = req.body;
    const hostel = req.hostel;
    const room = hostel.rooms.id(roomId);

    const [studentA, studentB] = await Promise.all([
      User.findById(studentAId),
      User.findById(studentBId),
    ]);

    // All refusal conditions are decided by lib/booking.js and covered by
    // tests/booking.test.js. Before this, the handler performed no checks at
    // all: it assigned `room.occupants = [studentAId, studentBId]`
    // unconditionally, so confirming into an occupied room silently evicted
    // the pair already in it while leaving their own records still naming
    // that room. Two pairs would hold the same room and nothing would show it.
    const check = canConfirmBooking({ room, studentA, studentB });
    if (!check.ok) {
      return res.status(400).json({ msg: check.msg });
    }

    room.occupants.push(String(studentA._id), String(studentB._id));
    room.status = deriveRoomStatus(room);
    await hostel.save();

    await Promise.all([
      User.findByIdAndUpdate(studentAId, {
        bookingStatus: 'confirmed', assignedRoom: room.roomNumber, assignedHostel: hostel.name,
      }),
      User.findByIdAndUpdate(studentBId, {
        bookingStatus: 'confirmed', assignedRoom: room.roomNumber, assignedHostel: hostel.name,
      }),
    ]);

    // Email is best-effort and deliberately after the booking is durable.
    // A confirmed room that failed to send an email is a minor problem; an
    // email announcing a booking that was never saved is a serious one.
    const emailed = await sendBookingEmails({ hostel, room, studentA, studentB });

    res.json({
      msg: 'Booking confirmed',
      room: room.roomNumber,
      hostel: hostel.name,
      emailed,
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Get occupant details for a room
router.get('/rooms/:roomId/occupants', hostelAuth, async (req, res) => {
  try {
    const room = req.hostel.rooms.id(req.params.roomId);
    if (!room) return res.status(404).json({ msg: 'Room not found' });
    const occupants = await User.find(
      { _id: { $in: room.occupants } },
      { name: 1, firstName: 1, lastName: 1, email: 1, phone: 1, course: 1, sem: 1, paymentStatus: 1, paymentNote: 1, paymentUpdated: 1 }
    );
    res.json(occupants);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Remove a student from a room
router.post('/rooms/remove-occupant', hostelAuth, requireIds('roomId', 'studentId'), async (req, res) => {
  try {
    const { roomId, studentId } = req.body;
    const hostel = req.hostel;
    const room = hostel.rooms.id(roomId);
    if (!room) return res.status(404).json({ msg: 'Room not found' });

    room.occupants = room.occupants.filter(id => String(id) !== String(studentId));
    room.status = deriveRoomStatus(room);
    await hostel.save();

    // The student's own record is reset in the same operation. If these two
    // ever diverge, the student believes they hold a room the hostel has
    // already given away.
    await User.findByIdAndUpdate(studentId, {
      bookingStatus: 'none', assignedRoom: '', assignedHostel: ''
    });

    res.json({ msg: 'Student removed from room', room });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Switch a student to a different room
router.post('/rooms/switch-occupant', hostelAuth, requireIds('studentId', 'fromRoomId', 'toRoomId'), async (req, res) => {
  try {
    const { studentId, fromRoomId, toRoomId } = req.body;
    const hostel = req.hostel;
    const fromRoom = hostel.rooms.id(fromRoomId);
    const toRoom = hostel.rooms.id(toRoomId);

    // The old check was `toRoom.status !== 'available'`, which refused any
    // partly-filled room even when it had space, and relied on a status field
    // that was maintained by hand. Capacity is now the authority.
    const check = canSwitchOccupant({ fromRoom, toRoom, studentId });
    if (!check.ok) return res.status(400).json({ msg: check.msg });

    fromRoom.occupants = fromRoom.occupants.filter(id => String(id) !== String(studentId));
    fromRoom.status = deriveRoomStatus(fromRoom);

    toRoom.occupants.push(String(studentId));
    toRoom.status = deriveRoomStatus(toRoom);
    await hostel.save();

    await User.findByIdAndUpdate(studentId, {
      assignedRoom: toRoom.roomNumber, assignedHostel: hostel.name
    });

    res.json({ msg: `Student moved to Room ${toRoom.roomNumber}`, rooms: hostel.rooms });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Delete a room
router.delete('/rooms/:roomId', hostelAuth, async (req, res) => {
  try {
    const hostel = req.hostel;
    const room = hostel.rooms.id(req.params.roomId);

    // Deleting an occupied room orphaned its occupants: their records kept
    // bookingStatus 'confirmed' and an assignedRoom naming a room that no
    // longer existed, and no admin screen would ever show them again.
    const check = canDeleteRoom(room);
    if (!check.ok) return res.status(400).json({ msg: check.msg });

    hostel.rooms = hostel.rooms.filter(r => String(r._id) !== String(req.params.roomId));
    await hostel.save();
    res.json(hostel.rooms);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Record a payment status against a student
//
// Deliberately a manual record, not a transaction. Homies processes no
// payments; this stores what the hostel administrator has observed offline so
// the dashboard reflects reality. Naming it "recorded by" rather than "paid"
// in the UI keeps that distinction visible to whoever reads it later.
router.post('/students/payment', hostelAuth, async (req, res) => {
  try {
    const { studentId, paymentStatus, paymentNote } = req.body;
    const ALLOWED = ['unpaid', 'partial', 'paid', 'waived'];

    if (!ALLOWED.includes(paymentStatus)) {
      return res.status(400).json({ msg: `Status must be one of: ${ALLOWED.join(', ')}` });
    }

    const student = await User.findById(studentId);
    if (!student) return res.status(404).json({ msg: 'Student not found' });

    // Scoped to this hostel's own students. Without this check any hostel
    // admin could annotate any student in the system, since the id comes
    // from the request body.
    if (student.assignedHostel !== req.hostel.name) {
      return res.status(403).json({ msg: 'That student is not booked into your hostel' });
    }

    student.paymentStatus = paymentStatus;
    student.paymentNote = (paymentNote || '').slice(0, 200);
    student.paymentUpdated = new Date();
    await student.save();

    res.json({
      msg: `Payment recorded as ${paymentStatus}`,
      studentId: student._id,
      paymentStatus: student.paymentStatus,
      paymentNote: student.paymentNote,
      paymentUpdated: student.paymentUpdated,
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;
