const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  // Auth fields
  firstName:  { type: String, required: true },
  lastName:   { type: String, required: true },
  email:      { type: String, required: true, unique: true },
  password:   { type: String, required: true },
  date:       { type: Date, default: Date.now },

  // Profile display
  name:       { type: String, default: '' },
  avatar:     { type: String, default: '' },
  linkedin:   { type: String, default: '' },
  notes:      { type: String, default: '' },

  // Identity
  gender:     { type: String, default: '' },
  age:        { type: String, default: '' },
  city:       { type: String, default: '' },
  // Optional. Powers the administrator's WhatsApp click-to-chat link. Never
  // required: the accounts already in the database predate this field, and
  // making it mandatory would mean editing every one of them before the
  // booking flow worked. The button is simply absent without a number.
  phone:      { type: String, default: '' },
  country:    { type: String, default: '' },
  univ:       { type: String, default: '' },
  sem:        { type: String, default: '' },
  course:     { type: String, default: '' },

  // Lifestyle (NexConnect fields - weighted scoring)
  sleepSchedule: { type: String, default: '' },  // 20% weight
  cleanliness:   { type: String, default: '' },  // 20% weight
  studyPref:     { type: String, default: '' },  // 15% weight
  social:        { type: String, default: '' },  // 12% weight
  noise:         { type: String, default: '' },  // 10% weight
  guests:        { type: String, default: '' },  //  8% weight
  exercise:      { type: String, default: '' },  //  5% weight

  // Personal habits
  food:       { type: String, default: '' },
  smoke:      { type: String, default: '' },
  drink:      { type: String, default: '' },
  cook:       { type: String, default: '' },

  // Hostel booking fields
  checkIn:        { type: Date },
  checkOut:       { type: Date },
  roomPreference: { type: String, default: '' },

  // Roommate preferences
  roomieGender:  { type: String, default: '' },
  roomieAge:     { type: String, default: '' },
  roomieCountry: { type: String, default: '' },
  roomieUniv:    { type: String, default: '' },
  roomieSem:     { type: String, default: '' },
  roomieCourse:  { type: String, default: '' },
  roomieFood:    { type: String, default: '' },
  roomieSmoke:   { type: String, default: '' },
  roomieDrink:   { type: String, default: '' },
  roomieCook:    { type: String, default: '' },

  // Hostel preferences
  preferredHostel: { type: String, default: '' },
  roomType:        { type: String, default: '' },
  floorPref:       { type: String, default: '' },
  bathroomPref:    { type: String, default: '' },
  proximityPref:   { type: String, default: '' },
  // Booking status
  bookingStatus:  { type: String, default: 'none' },
  // Recorded by a hostel administrator, not by a payment gateway. Homies takes
  // no money: this is a manual note of what the hostel has observed offline,
  // so that the admin dashboard reflects reality rather than pretending to be
  // a ledger. See docs/PAYMENTS.md.
  paymentStatus:  { type: String, default: 'unpaid' },
  paymentNote:    { type: String, default: '' },
  paymentUpdated: { type: Date },
  assignedRoom:   { type: String, default: '' },
  assignedHostel: { type: String, default: '' },
  // Matching system
  accepted: { type: [String], default: [] },
  rejected: { type: [String], default: [] },
});

module.exports = mongoose.model('User', UserSchema);
