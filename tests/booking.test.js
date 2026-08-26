/**
 * Booking rule tests.
 *
 * Top rigour tier (working-method §12): being wrong here costs a student their
 * room assignment, and produces two students holding the same room with
 * nothing in the system flagging it.
 *
 * These were written from the requirement before the route was changed, so
 * they describe what booking *should* refuse rather than what the code
 * happened to do. The pre-existing handler did none of this checking, so every
 * assertion below would have failed against it.
 */

const assert = require('assert');
const {
  canConfirmBooking,
  canDeleteRoom,
  canSwitchOccupant,
  deriveRoomStatus,
  roomHasSpace,
} = require('../lib/booking');

const room = (o = {}) => ({
  _id: o._id || 'room1',
  roomNumber: o.roomNumber || '4B',
  capacity: o.capacity !== undefined ? o.capacity : 2,
  occupants: o.occupants || [],
  ...o,
});

const student = (o = {}) => ({
  _id: o._id || 'sA',
  firstName: o.firstName || 'Student',
  bookingStatus: o.bookingStatus || 'none',
  assignedRoom: o.assignedRoom || '',
  ...o,
});

describe('Booking rules — confirming a match into a room', () => {

  it('allows a clean booking into an empty two-person room', () => {
    const result = canConfirmBooking({
      room: room({ capacity: 2, occupants: [] }),
      studentA: student({ _id: 'a' }),
      studentB: student({ _id: 'b' }),
    });
    assert.strictEqual(result.ok, true);
  });

  it('refuses to overwrite a room that is already occupied', () => {
    // The bug this exists to prevent. The old handler did
    //   room.occupants = [studentAId, studentBId]
    // with no checks, so confirming into an occupied room silently evicted
    // the previous pair while leaving their own User records still claiming
    // that room. Two pairs, one door, no error anywhere.
    const result = canConfirmBooking({
      room: room({ capacity: 2, occupants: ['x', 'y'] }),
      studentA: student({ _id: 'a' }),
      studentB: student({ _id: 'b' }),
    });
    assert.strictEqual(result.ok, false);
    assert.ok(/cannot take two more/i.test(result.msg), result.msg);
  });

  it('refuses when the room has one free place but two students need one each', () => {
    const result = canConfirmBooking({
      room: room({ capacity: 3, occupants: ['x', 'y'] }),
      studentA: student({ _id: 'a' }),
      studentB: student({ _id: 'b' }),
    });
    assert.strictEqual(result.ok, false);
  });

  it('allows a pair into a larger room that still has room for both', () => {
    const result = canConfirmBooking({
      room: room({ capacity: 4, occupants: ['x'] }),
      studentA: student({ _id: 'a' }),
      studentB: student({ _id: 'b' }),
    });
    assert.strictEqual(result.ok, true);
  });

  it('refuses when either student already holds a confirmed room', () => {
    // No duplicate-booking guard existed, despite a commit message claiming
    // one. A student could be confirmed into two rooms; both rooms listed
    // them, and their own record remembered only the last one.
    const booked = student({ _id: 'a', bookingStatus: 'confirmed', assignedRoom: '2A' });

    const first = canConfirmBooking({ room: room(), studentA: booked, studentB: student({ _id: 'b' }) });
    assert.strictEqual(first.ok, false);
    assert.ok(/already has a confirmed room/i.test(first.msg), first.msg);

    // ...and in the other position, because an asymmetric check is the kind
    // that passes review and then fails in production.
    const second = canConfirmBooking({ room: room(), studentA: student({ _id: 'b' }), studentB: booked });
    assert.strictEqual(second.ok, false);
  });

  it('names the student and their existing room in the refusal', () => {
    const result = canConfirmBooking({
      room: room(),
      studentA: student({ _id: 'a', firstName: 'Ashley', bookingStatus: 'confirmed', assignedRoom: '2A' }),
      studentB: student({ _id: 'b' }),
    });
    assert.ok(result.msg.includes('Ashley'), result.msg);
    assert.ok(result.msg.includes('2A'), result.msg);
  });

  it('refuses a missing room, a missing student, and a student paired with themselves', () => {
    assert.strictEqual(canConfirmBooking({ room: null, studentA: student(), studentB: student({ _id: 'b' }) }).ok, false);
    assert.strictEqual(canConfirmBooking({ room: room(), studentA: null, studentB: student() }).ok, false);
    assert.strictEqual(canConfirmBooking({ room: room(), studentA: student({ _id: 'a' }), studentB: student({ _id: 'a' }) }).ok, false);
  });

  it('does not treat a stale bookingStatus with no room as an active booking', () => {
    // Removing an occupant resets bookingStatus and assignedRoom together, but
    // older rows may carry one without the other. A status with no room is not
    // a booking and must not block a genuine one.
    const result = canConfirmBooking({
      room: room(),
      studentA: student({ _id: 'a', bookingStatus: 'confirmed', assignedRoom: '' }),
      studentB: student({ _id: 'b' }),
    });
    assert.strictEqual(result.ok, true);
  });
});

describe('Booking rules — deleting a room', () => {

  it('allows deleting an empty room', () => {
    assert.strictEqual(canDeleteRoom(room({ occupants: [] })).ok, true);
  });

  it('refuses to delete a room that still has occupants', () => {
    // The admin dashboard offered this as an unguarded ✕ with no confirmation.
    // Deleting an occupied room left those students with bookingStatus
    // 'confirmed' pointing at a room that no longer existed, and invisible to
    // every admin screen thereafter.
    const result = canDeleteRoom(room({ occupants: ['x'] }));
    assert.strictEqual(result.ok, false);
    assert.ok(/still has 1 occupant/i.test(result.msg), result.msg);
  });

  it('refuses a missing room', () => {
    assert.strictEqual(canDeleteRoom(null).ok, false);
  });
});

describe('Booking rules — switching a student between rooms', () => {

  it('allows a move into a room with space', () => {
    const result = canSwitchOccupant({
      fromRoom: room({ _id: 'r1', occupants: ['s1'] }),
      toRoom:   room({ _id: 'r2', occupants: [], capacity: 2 }),
      studentId: 's1',
    });
    assert.strictEqual(result.ok, true);
  });

  it('refuses a move into a full room', () => {
    const result = canSwitchOccupant({
      fromRoom: room({ _id: 'r1', occupants: ['s1'] }),
      toRoom:   room({ _id: 'r2', occupants: ['x', 'y'], capacity: 2, roomNumber: '9C' }),
      studentId: 's1',
    });
    assert.strictEqual(result.ok, false);
    assert.ok(/full/i.test(result.msg), result.msg);
  });

  it('refuses when the student is not actually in the source room', () => {
    const result = canSwitchOccupant({
      fromRoom: room({ _id: 'r1', occupants: ['someone-else'] }),
      toRoom:   room({ _id: 'r2', occupants: [] }),
      studentId: 's1',
    });
    assert.strictEqual(result.ok, false);
  });

  it('refuses a move to the same room', () => {
    const same = room({ _id: 'r1', occupants: ['s1'] });
    assert.strictEqual(canSwitchOccupant({ fromRoom: same, toRoom: same, studentId: 's1' }).ok, false);
  });
});

describe('Booking rules — derived room status', () => {
  // Status used to be assigned by hand at each call site, which is how a room
  // could end up marked 'pending' with nobody in it. Deriving it from
  // occupancy means the two can never disagree.

  it('is available when empty', () => {
    assert.strictEqual(deriveRoomStatus(room({ occupants: [], capacity: 2 })), 'available');
  });

  it('is partial when some places are taken', () => {
    assert.strictEqual(deriveRoomStatus(room({ occupants: ['a'], capacity: 3 })), 'partial');
  });

  it('is full at capacity', () => {
    assert.strictEqual(deriveRoomStatus(room({ occupants: ['a', 'b'], capacity: 2 })), 'full');
  });

  it('reports space correctly', () => {
    assert.strictEqual(roomHasSpace(room({ occupants: ['a'], capacity: 2 })), true);
    assert.strictEqual(roomHasSpace(room({ occupants: ['a', 'b'], capacity: 2 })), false);
  });
});
