import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { whatsappLink, roommateMessage, isMessageable, formatPhone } from '../../utils/whatsapp';

/**
 * The student's booking confirmation.
 *
 * This is the *primary* notification channel, not a fallback.
 *
 * Email and WhatsApp both depend on something outside the system: SMTP
 * credentials, a delivery network, a spam filter, a phone number being
 * correct. Each can fail silently, and the student has no way to tell a
 * message that was never sent from one that was never read.
 *
 * This screen depends on nothing. If the booking exists in the database, the
 * student sees it, permanently, and can come back to it. That makes it the
 * only channel worth treating as authoritative — and it is why the other two
 * are notifications *about* this page rather than replacements for it.
 *
 * It also gives the student their roommate's contact details, which is the
 * one thing they most want as soon as a match becomes a booking. Those
 * details are released by GET /api/profile/booking to exactly one other
 * person: the one they are sharing a room with. Everywhere else in the API,
 * `phone` and `email` are withheld.
 */
const BookingCard = ({ myName }) => {
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let live = true;
    axios.get('/api/profile/booking')
      .then(res => { if (live) { setBooking(res.data); setLoading(false); } })
      .catch(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, []);

  if (loading || !booking || !booking.confirmed) return null;

  const { hostel, room, roommate, hostelLocation, paymentStatus } = booking;

  const mateLink = roommate && whatsappLink(roommate.phone, roommateMessage({
    myName,
    roommateName: roommate.name,
    hostelName: hostel,
    roomNumber: room,
  }));

  const label = { fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 };
  const value = { fontSize: '1.05rem', color: 'var(--text-primary)', fontWeight: 700, margin: '2px 0 0' };

  const paymentTone =
    paymentStatus === 'paid'    ? { bg: 'rgba(16,185,129,0.12)',  fg: 'var(--success)',       text: 'Payment recorded' }
    : paymentStatus === 'partial' ? { bg: 'rgba(245,158,11,0.12)', fg: 'var(--warning)',      text: 'Part payment recorded' }
    : paymentStatus === 'waived'  ? { bg: 'rgba(124,58,237,0.12)', fg: 'var(--accent-purple)', text: 'Payment waived' }
    : { bg: 'rgba(148,163,184,0.12)', fg: 'var(--text-muted)', text: 'Payment outstanding' };

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid rgba(16,185,129,0.35)',
      borderRadius: 'var(--radius-md)',
      padding: '1.25rem',
      margin: '1.25rem 0',
      boxShadow: '0 4px 20px rgba(16,185,129,0.10)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
        <span style={{
          fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
          background: 'var(--success)', color: '#fff', padding: '3px 10px', borderRadius: 'var(--radius-full)',
        }}>Confirmed</span>
        <h3 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-primary)' }}>Your room is booked</h3>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
        <div>
          <p style={label}>Room</p>
          <p style={value}>{room}</p>
        </div>
        <div>
          <p style={label}>Hostel</p>
          <p style={value}>{hostel}</p>
          {hostelLocation && (
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '2px 0 0' }}>{hostelLocation}</p>
          )}
        </div>
      </div>

      <div style={{
        display: 'inline-block', background: paymentTone.bg, color: paymentTone.fg,
        fontSize: '0.76rem', fontWeight: 600, padding: '4px 12px',
        borderRadius: 'var(--radius-full)', marginBottom: '1rem',
      }}>
        {paymentTone.text}
        {/* Says where the figure came from. The hostel records this by hand;
            Homies processes no payments and must not look as though it does. */}
        <span style={{ fontWeight: 400, opacity: 0.75 }}> · recorded by {hostel}</span>
      </div>

      {/* Says plainly who holds the money and who does not. The status above
          is a note made by hostel staff, not a transaction record — without
          this line a student could reasonably read "Payment recorded" as
          confirmation that Homies took a payment. It did not. */}
      <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: '8px 0 0' }}>
        Recorded by hostel staff. Homies processes no payments — fees are arranged directly with {hostel}.
      </p>

      {roommate && (
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
          <p style={{ ...label, marginBottom: '8px' }}>Your roommate</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {roommate.avatar
              ? <img src={roommate.avatar} alt='' style={{ width: 42, height: 42, borderRadius: '50%', objectFit: 'cover' }} />
              : <div style={{
                  width: 42, height: 42, borderRadius: '50%', background: 'var(--accent-gradient)',
                  color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700,
                }}>{(roommate.name || '?').slice(0, 1).toUpperCase()}</div>}

            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontWeight: 600, color: 'var(--text-primary)' }}>{roommate.name}</p>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', overflowWrap: 'anywhere' }}>
                {isMessageable(roommate.phone) ? formatPhone(roommate.phone) : roommate.email}
              </p>
            </div>

            {mateLink && (
              <a href={mateLink} target='_blank' rel='noopener noreferrer'
                 className='pay-cta pay-cta--ready'
                 style={{
                   background: '#25D366', color: '#fff', textDecoration: 'none',
                   padding: '8px 16px', borderRadius: 'var(--radius-full)',
                   fontSize: '0.85rem', fontWeight: 700, whiteSpace: 'nowrap',
                 }}>
                Say hello
              </a>
            )}
          </div>

          {!mateLink && (
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '8px 0 0' }}>
              They have not added a WhatsApp number yet — you can email them instead.
            </p>
          )}

          {/* States the rule that lib/profileVisibility.js enforces, to the
              person it protects. Contact details are withheld from the
              Discover feed and every profile listing, and released only here,
              only to the two people sharing the room. A privacy guarantee the
              user never learns about does not reassure anyone. */}
          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: '10px 0 0', fontStyle: 'italic' }}>
            Contact details are released only to the person you share a room with.
          </p>
        </div>
      )}
    </div>
  );
};

export default BookingCard;
