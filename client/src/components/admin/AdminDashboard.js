import React, { useEffect, useState, useCallback, useMemo } from 'react';
import axios from 'axios';
import { whatsappLink, bookingMessage, isMessageable, formatPhone } from '../../utils/whatsapp';

const AdminDashboard = ({ token, hostelName }) => {
  const [tab, setTab] = useState('matches');
  const [matches, setMatches] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [roomForm, setRoomForm] = useState({ roomNumber: '', type: '', floor: '', bathroom: '', proximity: '', capacity: 2 });
  const [formError, setFormError] = useState('');
  const [notice, setNotice] = useState('');
  const [payingId, setPayingId] = useState(null);

  const PAYMENT_STATES = ['unpaid', 'partial', 'paid', 'waived'];
  const paymentColor = p =>
    p === 'paid'    ? 'var(--success)'
    : p === 'partial' ? 'var(--warning)'
    : p === 'waived'  ? 'var(--accent-purple)'
    : 'var(--text-muted)';

  // Records what the hostel observed offline. Homies moves no money — the
  // wording in this panel says "recorded", never "charged", so nobody reading
  // the dashboard later mistakes it for a transaction log.
  const handlePayment = async (studentId, paymentStatus, roomId) => {
    setPayingId(studentId);
    try {
      await axios.post('/api/hostels/students/payment',
        { studentId, paymentStatus }, { headers });
      const res = await axios.get(`/api/hostels/rooms/${roomId}/occupants`, { headers });
      setOccupantDetails(d => ({ ...d, [roomId]: res.data }));
      setNotice(`Payment recorded as ${paymentStatus}`);
      setError('');
    } catch (err) {
      setError(err.response?.data?.msg || 'Could not record payment');
    } finally {
      setPayingId(null);
    }
  };
  const [batchCount, setBatchCount] = useState(1);
  const [confirming, setConfirming] = useState(null);
  const [expandedRoom, setExpandedRoom] = useState(null);
  const [occupantDetails, setOccupantDetails] = useState({});
  const [selectedRoom, setSelectedRoom] = useState('');

  // Memoised so it is referentially stable across renders. As a plain object
  // literal it was a new value every render, which is what made the
  // exhaustive-deps warning on fetchAll correct rather than pedantic.
  const headers = useMemo(() => ({ 'x-auth-token': token }), [token]);

  const inp = { background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)', borderRadius: 'var(--radius-sm)', padding: '8px 12px', width: '100%' };
  const label = { fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' };
  const card = { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', marginBottom: '1.5rem' };

  const fetchAll = useCallback(async () => {
    try {
      const [mRes, rRes] = await Promise.all([
        axios.get('/api/hostels/matches', { headers }),
        axios.get('/api/hostels/rooms', { headers })
      ]);
      setMatches(mRes.data);
      setRooms(rRes.data);
    } catch (err) {
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [headers]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleRoomSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!roomForm.roomNumber || !roomForm.type || !roomForm.floor || !roomForm.bathroom) {
      setFormError('Please fill in all required fields'); return;
    }
    try {
      const count = parseInt(batchCount) || 1;
      let res;
      for (let i = 0; i < count; i++) {
        const roomData = count === 1 ? roomForm : { ...roomForm, roomNumber: `${roomForm.roomNumber}${String.fromCharCode(65 + i)}` };
        res = await axios.post('/api/hostels/rooms', roomData, { headers });
      }
      setRooms(res.data);
      setRoomForm({ roomNumber: '', type: '', floor: '', bathroom: '', proximity: '', capacity: 2 });
      setBatchCount(1);
      setFormError('');
    } catch (err) { setFormError(err.response?.data?.msg || 'Failed to add room'); }
  };

  const handleRemoveOccupant = async (roomId, studentId, studentName) => {
    if (!window.confirm(`Remove ${studentName} from this room?`)) return;
    try {
      await axios.post('/api/hostels/rooms/remove-occupant', { roomId, studentId }, { headers });
      setRooms(prev => prev.map(r => {
        if (r._id === roomId) {
          const newOccupants = r.occupants.filter(id => id !== studentId);
          return { ...r, occupants: newOccupants, status: newOccupants.length === 0 ? 'available' : r.status };
        }
        return r;
      }));
      setOccupantDetails(prev => ({
        ...prev,
        [roomId]: (prev[roomId] || []).filter(o => o._id !== studentId)
      }));
    } catch (err) {
      setError(err.response?.data?.msg || 'Failed to remove occupant');
    }
  };

  const handleSwitchOccupant = async (studentId, studentName, fromRoomId) => {
    const availableRooms = rooms.filter(r => r._id !== fromRoomId && (r.occupants || []).length < r.capacity);
    if (availableRooms.length === 0) { setError('No available rooms to switch to'); return; }
    const options = availableRooms.map((r, i) => `${i + 1}. Room ${r.roomNumber} (${r.type})`).join('\n');
    const choice = window.prompt(`Switch ${studentName} to which room?\n\n${options}\n\nEnter room number:`);
    if (!choice) return;
    const targetRoom = availableRooms.find(r => r.roomNumber === choice.trim());
    if (!targetRoom) { setError('Room not found — enter the exact room number'); return; }
    try {
      const res = await axios.post('/api/hostels/rooms/switch-occupant', { studentId, fromRoomId, toRoomId: targetRoom._id }, { headers });
      setRooms(res.data.rooms);
      setNotice(`${studentName} moved to Room ${targetRoom.roomNumber}`);
      setError('');
    } catch (err) {
      setError(err.response?.data?.msg || 'Failed to switch room');
    }
  };

  const handleDelete = async (roomId, room) => {
    // The server refuses to delete an occupied room, but asking first means an
    // administrator does not have to discover that by triggering an error.
    const occupied = room && room.occupants && room.occupants.length > 0;
    const question = occupied
      ? `Room ${room.roomNumber} has ${room.occupants.length} occupant(s). Remove them before deleting.`
      : `Delete Room ${room ? room.roomNumber : ''}? This cannot be undone.`;
    if (occupied) { setError(question); return; }
    if (!window.confirm(question)) return;
    try {
      const res = await axios.delete(`/api/hostels/rooms/${roomId}`, { headers });
      setRooms(res.data);
      setError('');
    } catch (err) {
      setError(err.response?.data?.msg || 'Failed to delete room');
    }
  };

  const handleConfirm = async (studentAId, studentBId) => {
    if (!selectedRoom) return alert('Please select a room first');
    try {
      const res = await axios.post('/api/hostels/matches/confirm', { studentAId, studentBId, roomId: selectedRoom }, { headers });
      setConfirming(null); setSelectedRoom('');
      setError('');
      // Say plainly when the booking saved but the notification did not. The
      // one thing this must never do is let an admin believe both students
      // have been told when no email left the building.
      if (res.data && res.data.emailed === false) {
        setNotice(`Booking confirmed for Room ${res.data.room}, but the confirmation email could not be sent. Tell the students directly.`);
      } else {
        setNotice(`Booking confirmed for Room ${res.data.room}. Both students have been emailed.`);
      }
      fetchAll();
    } catch (err) { setError(err.response?.data?.msg || 'Failed to confirm booking'); }
  };

  const availableRooms = rooms.filter(r => (r.occupants || []).length + 2 <= r.capacity);

  // Occupancy summary, derived from `rooms` — no extra request.
  //
  // Counted in BEDS rather than rooms. A hostel manager's question is "how
  // many students can I still place", and a list of rooms does not answer it:
  // a half-full double and an empty single both read as "one room" while
  // representing different amounts of space.
  //
  // There is deliberately no "unpaid" figure here. Payment status lives in
  // `occupantDetails`, which is only fetched when a room is expanded, so any
  // total would be wrong until every room had been opened. A number that is
  // usually wrong is worse than no number, because the reader cannot tell
  // which case they are looking at.
  const totalBeds = rooms.reduce((n, r) => n + (r.capacity || 0), 0);
  const bedsFilled = rooms.reduce((n, r) => n + (r.occupants || []).length, 0);
  const bedsFree = totalBeds - bedsFilled;

  const stat = (value, label, tone) => (
    <div style={{ flex: '1 1 0', minWidth: '110px', padding: '14px 16px', borderRight: '1px solid var(--border)' }}>
      <div style={{ fontSize: '1.9rem', fontWeight: 800, lineHeight: 1.1, color: tone || 'var(--text-primary)' }}>{value}</div>
      <div style={{ fontSize: '0.68rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginTop: '2px' }}>{label}</div>
    </div>
  );

  const legendKey = (color, label) => (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', marginRight: '14px', fontSize: '0.7rem', letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
      <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: color, display: 'inline-block' }} />
      {label}
    </span>
  );
  // Room status is now derived from occupancy on the server
  // (available | partial | full). 'pending' is retained so rooms written by
  // the previous version still render with a sensible colour rather than
  // falling through to the red "unknown" branch.
  const statusColor = s => {
    if (s === 'available') return 'var(--success)';
    if (s === 'partial' || s === 'pending') return 'var(--warning)';
    if (s === 'full') return 'var(--danger)';
    return 'var(--text-muted)';
  };

  const pill = (val, field, display) => (
    <button key={val} onClick={() => setRoomForm(f => ({ ...f, [field]: val }))}
      style={{ padding: '6px 14px', borderRadius: 'var(--radius-full)', border: '1px solid var(--border)', marginRight: '8px', marginBottom: '8px', cursor: 'pointer',
        background: roomForm[field] === val ? 'var(--accent-gradient)' : 'var(--bg-secondary)',
        color: roomForm[field] === val ? '#fff' : 'var(--text-primary)', fontSize: '0.85rem' }}>
      {display || val}
    </button>
  );

  if (loading) return <div style={{ textAlign: 'center', marginTop: '3rem', color: 'var(--text-secondary)' }}>Loading...</div>;

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '1rem' }}>
      <h2 style={{ color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Hostel Dashboard</h2>

      {/* At-a-glance figures. Additive: nothing below depends on this block,
          so it cannot affect the rest of the dashboard if it renders oddly. */}
      {rooms.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', background: 'var(--bg-card)', marginTop: '14px', overflow: 'hidden' }}>
          {stat(matches.length, 'Pending pairs', matches.length > 0 ? 'var(--accent-purple)' : undefined)}
          {stat(bedsFilled, 'Beds filled')}
          {stat(bedsFree, 'Beds free', bedsFree === 0 ? 'var(--danger)' : 'var(--success)')}
          {stat(rooms.length, 'Rooms')}
        </div>
      )}
      {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: 'var(--danger)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', margin: '1rem 0' }}>{error}</div>}
      {notice && <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', color: 'var(--text-primary)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', margin: '1rem 0' }}>{notice}</div>}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '12px', margin: '20px 0', borderBottom: '2px solid var(--border)' }}>
        {['matches', 'rooms'].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: '10px 24px', border: 'none', background: 'none', cursor: 'pointer',
            fontWeight: tab === t ? '700' : '400', color: tab === t ? 'var(--accent-purple)' : 'var(--text-secondary)',
            borderBottom: tab === t ? '3px solid var(--accent-purple)' : '3px solid transparent',
            fontSize: '1rem', textTransform: 'capitalize', marginBottom: '-2px' }}>
            {t === 'matches' ? `Matches (${matches.length})` : `Rooms (${rooms.length})`}
          </button>
        ))}
      </div>

      {/* MATCHES TAB */}
      {tab === 'matches' && (
        matches.length === 0
          ? <div style={{ textAlign: 'center', marginTop: '3rem', color: 'var(--text-muted)' }}>
              <h4>No matches yet</h4>
              <p>When two students mutually match and select your hostel, they appear here.</p>
            </div>
          : matches.map((match, i) => (
            <div key={i} style={card}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 40px 1fr', gap: '1rem', alignItems: 'start' }}>
                <div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>Student A</p>
                  <p style={{ fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 4px' }}>{match.studentA.name || match.studentA.firstName}</p>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0 0 4px' }}>{match.studentA.email}</p>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0 0 8px' }}>{match.studentA.course} — {match.studentA.sem}</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {[match.studentA.roomType, match.studentA.floorPref, match.studentA.bathroomPref, match.studentA.proximityPref].filter(Boolean).map((v, j) => (
                      <span key={j} style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', borderRadius: 'var(--radius-full)', padding: '2px 10px', fontSize: '0.78rem', border: '1px solid var(--border)' }}>{v}</span>
                    ))}
                  </div>
                </div>
                <div style={{ textAlign: 'center', paddingTop: '1rem', fontSize: '1.5rem' }}>🤝</div>
                <div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>Student B</p>
                  <p style={{ fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 4px' }}>{match.studentB.name || match.studentB.firstName}</p>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0 0 4px' }}>{match.studentB.email}</p>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0 0 8px' }}>{match.studentB.course} — {match.studentB.sem}</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {[match.studentB.roomType, match.studentB.floorPref, match.studentB.bathroomPref, match.studentB.proximityPref].filter(Boolean).map((v, j) => (
                      <span key={j} style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', borderRadius: 'var(--radius-full)', padding: '2px 10px', fontSize: '0.78rem', border: '1px solid var(--border)' }}>{v}</span>
                    ))}
                  </div>
                </div>
              </div>
              <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '8px' }}>Both selected: <strong style={{ color: 'var(--text-primary)' }}>{match.studentA.preferredHostel}</strong></p>
                {confirming === i ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    <select value={selectedRoom} onChange={e => { const v = e.target.value; setSelectedRoom(v); }}
                      style={{ ...inp, maxWidth: '260px' }}>
                      <option value="">Select a room...</option>
                      {availableRooms.map(r => (
                        <option key={r._id} value={r._id}>Room {r.roomNumber} — {r.type}, {r.floor}, {r.bathroom}</option>
                      ))}
                    </select>
                    <button onClick={() => handleConfirm(match.studentA._id, match.studentB._id)}
                      style={{ padding: '8px 20px', background: 'var(--accent-gradient)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}>
                      Confirm Booking
                    </button>
                    <button onClick={() => setConfirming(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>Cancel</button>
                  </div>
                ) : (
                  <button onClick={() => setConfirming(i)}
                    style={{ padding: '8px 20px', background: 'var(--accent-gradient)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}>
                    Assign Room & Confirm
                  </button>
                )}
              </div>
            </div>
          ))
      )}

      {/* ROOMS TAB */}
      {tab === 'rooms' && (
        <div>
          <div style={card}>
            <h5 style={{ color: 'var(--text-primary)', marginBottom: '1rem' }}>Add a Room</h5>
            {formError && <div style={{ color: 'var(--danger)', marginBottom: '1rem', fontSize: '0.9rem' }}>{formError}</div>}
            <div style={{ marginBottom: '1rem' }}>
              <label style={label}>Room Number *</label>
              <input value={roomForm.roomNumber} onChange={e => { const v = e.target.value; setRoomForm(f => ({ ...f, roomNumber: v })); }}
                placeholder="e.g. 4B, 101" style={{ ...inp, maxWidth: '200px' }} />
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={label}>Room Type *</label>
              <div>{['Single', 'Double', 'Dorm'].map(v => pill(v, 'type', v))}</div>
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={label}>Floor *</label>
              <div>{['Ground floor', 'First floor', 'Second floor'].map(v => pill(v, 'floor', v))}</div>
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={label}>Bathroom *</label>
              <div>{['En-suite', 'Shared'].map(v => pill(v, 'bathroom', v))}</div>
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={label}>Proximity</label>
              <div>{['Dining hall', 'Main gate', 'Library', 'None'].map(v => pill(v, 'proximity', v))}</div>
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={label}>Capacity</label>
              <input type="number" min="1" max="10" value={roomForm.capacity}
                onChange={e => { const v = e.target.value; setRoomForm(f => ({ ...f, capacity: v })); }}
                style={{ ...inp, maxWidth: '100px' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '1rem' }}>
              <label style={{ ...label, margin: 0 }}>Batch add:</label>
              <input type="number" min="1" max="20" value={batchCount}
                onChange={e => { const v = e.target.value; setBatchCount(v); }}
                style={{ ...inp, maxWidth: '70px' }} />
              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>rooms with sequential suffixes (e.g. 4A, 4B...)</span>
            </div>
            <button onClick={handleRoomSubmit}
              style={{ padding: '10px 28px', background: 'var(--accent-gradient)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontWeight: 600 }}>
              Add Room
            </button>
          </div>

          {/* Legend and bed count. The colours were already being used on the
              room cards; nothing said what they meant, so an administrator had
              to infer it. Naming them costs one line and removes the guess. */}
          {rooms.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '10px', margin: '0 0 14px' }}>
              <div>
                {legendKey('var(--success)', 'Empty')}
                {legendKey('var(--warning)', 'Part filled')}
                {legendKey('var(--danger)', 'Full')}
              </div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                {bedsFilled} of {totalBeds} beds filled
              </span>
            </div>
          )}

          {rooms.length === 0
            ? <p style={{ color: 'var(--text-muted)' }}>No rooms added yet.</p>
            : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px,1fr))', gap: '16px' }}>
                {rooms.map(room => (
                  <div key={room._id}
                    onClick={async () => {
                      const newId = expandedRoom === room._id ? null : room._id;
                      setExpandedRoom(newId);
                      if (newId && room.occupants?.length > 0) {
                        try {
                          const res = await axios.get(`/api/hostels/rooms/${newId}/occupants`, { headers });
                          setOccupantDetails(prev => ({ ...prev, [newId]: res.data }));
                        } catch(e) {}
                      }
                    }}
                    style={{
                      background: 'var(--bg-card)',
                      // Longhand on all four sides rather than `border` plus a
                      // `borderLeft` override. React warns about mixing the two
                      // because it diffs style properties individually: on a
                      // re-render it may apply the shorthand after the longhand,
                      // silently wiping the status colour stripe. The bug only
                      // shows on re-render, so it is easy to miss in testing.
                      borderTop: `1px solid ${expandedRoom === room._id ? 'var(--accent-purple)' : 'var(--border)'}`,
                      borderRight: `1px solid ${expandedRoom === room._id ? 'var(--accent-purple)' : 'var(--border)'}`,
                      borderBottom: `1px solid ${expandedRoom === room._id ? 'var(--accent-purple)' : 'var(--border)'}`,
                      borderLeft: `4px solid ${statusColor(room.status)}`,
                      borderRadius: 'var(--radius-md)',
                      padding: '1rem',
                      cursor: 'pointer',
                      transition: 'border-color 0.2s'
                    }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <h5 style={{ margin: 0, color: 'var(--text-primary)' }}>Room {room.roomNumber}</h5>
                      <button onClick={e => { e.stopPropagation(); handleDelete(room._id, room); }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1rem' }}>✕</button>
                    </div>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: '8px 0 4px' }}>{room.type} · {room.floor}</p>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: '0 0 8px' }}>{room.bathroom} · Cap: {room.capacity}</p>
                    <span style={{ fontSize: '0.78rem', padding: '2px 10px', borderRadius: 'var(--radius-full)', background: statusColor(room.status), color: '#fff' }}>{room.status}</span>
                    {expandedRoom === room._id && (
                      <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border)' }}>
                        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Occupants ({room.occupants?.length || 0}/{room.capacity})</p>
                        {room.occupants && room.occupants.length > 0
                          ? (occupantDetails[room._id] || []).map((occ, i) => (
                              <div key={i} style={{ marginBottom: '8px', padding: '6px 8px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                  <div>
                                    <p style={{ fontSize: '0.85rem', color: 'var(--text-primary)', margin: 0, fontWeight: 600 }}>👤 {occ.name || occ.firstName}</p>
                                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>{occ.email} · {occ.course} {occ.sem}</p>
                                    <p style={{ fontSize: '0.75rem', color: isMessageable(occ.phone) ? 'var(--text-secondary)' : 'var(--text-muted)', margin: '2px 0 0' }}>
                                      {isMessageable(occ.phone)
                                        ? formatPhone(occ.phone)
                                        : 'No WhatsApp number on file — ask them to add one in Edit Profile'}
                                    </p>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
                                      <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Payment</span>
                                      {PAYMENT_STATES.map(state => {
                                        const active = (occ.paymentStatus || 'unpaid') === state;
                                        return (
                                          <button
                                            key={state}
                                            disabled={payingId === occ._id}
                                            onClick={e => { e.stopPropagation(); handlePayment(occ._id, state, room._id); }}
                                            title={`Record as ${state}`}
                                            style={{
                                              fontSize: '0.68rem', padding: '2px 9px', borderRadius: 'var(--radius-full)',
                                              border: `1px solid ${active ? paymentColor(state) : 'var(--border)'}`,
                                              background: active ? paymentColor(state) : 'transparent',
                                              color: active ? '#fff' : 'var(--text-muted)',
                                              fontWeight: active ? 600 : 400,
                                              cursor: payingId === occ._id ? 'wait' : 'pointer',
                                              textTransform: 'capitalize',
                                              transition: 'background 0.15s, color 0.15s, border-color 0.15s',
                                            }}
                                          >{state}</button>
                                        );
                                      })}
                                    </div>
                                    {occ.paymentUpdated && (
                                      <p style={{ fontSize: '0.66rem', color: 'var(--text-muted)', margin: '4px 0 0', fontStyle: 'italic' }}>
                                        Recorded {new Date(occ.paymentUpdated).toLocaleDateString()} · manual entry, not a gateway record
                                      </p>
                                    )}
                                  </div>
                                  <div style={{ display: 'flex', gap: '4px', flexShrink: 0, marginLeft: '8px' }}>
                                    {(() => {
                                      // The other occupant, so the message can name the roommate —
                                      // the single fact a student most wants from this notification.
                                      const others = (occupantDetails[room._id] || []).filter(o => o._id !== occ._id);
                                      const mate = others[0];
                                      const link = whatsappLink(occ.phone, bookingMessage({
                                        studentName: occ.name || occ.firstName,
                                        hostelName: hostelName || 'your hostel',
                                        roomNumber: room.roomNumber,
                                        roommateName: mate ? (mate.name || mate.firstName) : '',
                                        roommatePhone: mate ? mate.phone : '',
                                      }));
                                      // No usable number means no button. An action that silently
                                      // does nothing is worse than an absent one.
                                      if (!link) return null;
                                      return (
                                        <a href={link} target='_blank' rel='noopener noreferrer'
                                          onClick={e => e.stopPropagation()}
                                          title={`Message ${formatPhone(occ.phone)} on WhatsApp`}
                                          style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: 'var(--radius-full)', border: '1px solid #25D366', background: 'transparent', color: '#25D366', cursor: 'pointer', textDecoration: 'none', whiteSpace: 'nowrap' }}
                                        >WhatsApp</a>
                                      );
                                    })()}
                                    <button onClick={e => { e.stopPropagation(); handleSwitchOccupant(occ._id, occ.name || occ.firstName, room._id); }} style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: 'var(--radius-full)', border: '1px solid var(--accent-purple)', background: 'transparent', color: 'var(--accent-purple)', cursor: 'pointer' }}>⇄ Switch</button>
                                    <button onClick={e => { e.stopPropagation(); handleRemoveOccupant(room._id, occ._id, occ.name || occ.firstName); }} style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: 'var(--radius-full)', border: '1px solid #dc2626', background: 'transparent', color: '#dc2626', cursor: 'pointer' }}>✕ Remove</button>
                                  </div>
                                </div>
                              </div>
                            ))
                          : <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>No occupants yet</p>
                        }
                        {room.proximity && room.proximity !== 'None' && (
                          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '4px' }}>📍 Near {room.proximity}</p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
          }
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
