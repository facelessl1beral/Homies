/**
 * Booking rules.
 *
 * Pure predicates, no mongoose, so the rules that protect booking data can be
 * tested without a database. `routes/api/hostels.js` is the only caller.
 *
 * Every function returns `{ ok, msg }` rather than a bare boolean, so the
 * reason a booking was refused reaches the administrator's screen instead of
 * being flattened into a generic failure. "Room 4B already has 2 of 2
 * occupants" is actionable; "Failed to confirm booking" is not.
 *
 * Why these live here rather than inline in the route
 * ---------------------------------------------------
 * The booking flow is the part of this system where being wrong costs real
 * data: a student's room assignment. Before this module the confirm handler
 * did no checking whatsoever. It assigned `room.occupants = [studentAId,
 * studentBId]` unconditionally, which meant confirming a pair into a room that
 * was already occupied silently evicted whoever was in it — and left those
 * evicted students' own records still reading `bookingStatus: 'confirmed'` for
 * a room they no longer had. Two students would turn up at the same door with
 * equal confidence and nothing in the system would show anything was wrong.
 *
 * That is the failure this module exists to make impossible.
 */

const ACTIVE_BOOKING = 'confirmed';

/**
 * May this pair be confirmed into this room?
 *
 * Checks, in the order an administrator would care about them.
 */
const canConfirmBooking = ({ room, studentA, studentB }) => {
  if (!room) {
    return { ok: false, msg: 'Room not found' };
  }
  if (!studentA || !studentB) {
    return { ok: false, msg: 'One or both students could not be found' };
  }
  if (String(studentA._id) === String(studentB._id)) {
    return { ok: false, msg: 'Cannot book a student into a room with themselves' };
  }

  // Already-booked students. Without this an administrator could confirm the
  // same student into a second room; the room would list them, but their own
  // record only remembers the most recent assignment, so the two views of
  // reality would disagree permanently.
  const alreadyBooked = [studentA, studentB].filter(
    s => s.bookingStatus === ACTIVE_BOOKING && s.assignedRoom
  );
  if (alreadyBooked.length) {
    const names = alreadyBooked
      .map(s => `${s.name || s.firstName || 'A student'} (Room ${s.assignedRoom})`)
      .join(' and ');
    return {
      ok: false,
      msg: `${names} already has a confirmed room. Remove them from it first.`,
    };
  }

  // Capacity. The old handler replaced the occupants array outright, so
  // capacity was never consulted at all.
  const current = Array.isArray(room.occupants) ? room.occupants.length : 0;
  const capacity = room.capacity || 0;
  if (current + 2 > capacity) {
    return {
      ok: false,
      msg: `Room ${room.roomNumber} has ${current} of ${capacity} places filled and cannot take two more students.`,
    };
  }

  return { ok: true, msg: 'OK' };
};

/**
 * May this room be deleted?
 *
 * Deleting an occupied room orphans its occupants: their User records keep
 * `bookingStatus: 'confirmed'` and an `assignedRoom` naming a room that no
 * longer exists, and nothing in the admin UI will ever show them again. The
 * admin dashboard offered this as an unguarded ✕ with no confirmation dialog.
 */
const canDeleteRoom = room => {
  if (!room) return { ok: false, msg: 'Room not found' };
  const occupants = Array.isArray(room.occupants) ? room.occupants.length : 0;
  if (occupants > 0) {
    return {
      ok: false,
      msg: `Room ${room.roomNumber} still has ${occupants} occupant(s). Remove them before deleting the room.`,
    };
  }
  return { ok: true, msg: 'OK' };
};

/** May this student be moved from one room to another? */
const canSwitchOccupant = ({ fromRoom, toRoom, studentId }) => {
  if (!fromRoom || !toRoom) return { ok: false, msg: 'Room not found' };
  if (String(fromRoom._id) === String(toRoom._id)) {
    return { ok: false, msg: 'That student is already in this room' };
  }

  const inFrom = (fromRoom.occupants || []).map(String).includes(String(studentId));
  if (!inFrom) {
    return { ok: false, msg: `That student is not in Room ${fromRoom.roomNumber}` };
  }

  const current = (toRoom.occupants || []).length;
  const capacity = toRoom.capacity || 0;
  if (current + 1 > capacity) {
    return {
      ok: false,
      msg: `Room ${toRoom.roomNumber} is full (${current} of ${capacity}).`,
    };
  }

  return { ok: true, msg: 'OK' };
};

/**
 * Room status derived from occupancy, so status can never drift from reality.
 *
 * Previously status was set by hand at each call site, which is how a room
 * could end up marked 'pending' with nobody in it. Deriving it means there is
 * one rule and it is applied everywhere.
 */
const deriveRoomStatus = room => {
  const occupants = Array.isArray(room.occupants) ? room.occupants.length : 0;
  const capacity = room.capacity || 0;
  if (occupants === 0) return 'available';
  if (occupants >= capacity) return 'full';
  return 'partial';
};

/** Is a room open to new occupants? */
const roomHasSpace = room => {
  const occupants = Array.isArray(room.occupants) ? room.occupants.length : 0;
  return occupants < (room.capacity || 0);
};

module.exports = {
  ACTIVE_BOOKING,
  canConfirmBooking,
  canDeleteRoom,
  canSwitchOccupant,
  deriveRoomStatus,
  roomHasSpace,
};
