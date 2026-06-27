import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';

const AdminDashboard = ({ token }) => {
  const [tab, setTab] = useState('matches');
  const [matches, setMatches] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [roomForm, setRoomForm] = useState({ roomNumber: '', type: '', floor: '', bathroom: '', proximity: '', capacity: 2 });
  const [formError, setFormError] = useState('');
  const [batchCount, setBatchCount] = useState(1);
  const [confirming, setConfirming] = useState(null);
  const [expandedRoom, setExpandedRoom] = useState(null);
  const [occupantNames, setOccupantNames] = useState({});
  const [occupantDetails, setOccupantDetails] = useState({});
  const [selectedRoom, setSelectedRoom] = useState('');

  const headers = { 'x-auth-token': token };

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
  }, [token]);

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
    } catch (err) { setFormError('Failed to add room'); }
  };

  const handleDelete = async (roomId) => {
    try {
      const res = await axios.delete(`/api/hostels/rooms/${roomId}`, { headers });
      setRooms(res.data);
    } catch (err) { setError('Failed to delete room'); }
  };

  const handleConfirm = async (studentAId, studentBId) => {
    if (!selectedRoom) return alert('Please select a room first');
    try {
      await axios.post('/api/hostels/matches/confirm', { studentAId, studentBId, roomId: selectedRoom }, { headers });
      setConfirming(null); setSelectedRoom('');
      fetchAll();
    } catch (err) { setError(err.response?.data?.msg || 'Failed to confirm booking'); }
  };

  const availableRooms = rooms.filter(r => r.status === 'available');
  const statusColor = s => s === 'available' ? 'var(--success)' : s === 'pending' ? 'var(--warning)' : 'var(--danger)';

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
      {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: 'var(--danger)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', margin: '1rem 0' }}>{error}</div>}

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

          {rooms.length === 0
            ? <p style={{ color: 'var(--text-muted)' }}>No rooms added yet.</p>
            : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px,1fr))', gap: '16px' }}>
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
                    style={{ background: 'var(--bg-card)', border: `1px solid ${expandedRoom === room._id ? 'var(--accent-purple)' : 'var(--border)'}`, borderLeft: `4px solid ${statusColor(room.status)}`, borderRadius: 'var(--radius-md)', padding: '1rem', cursor: 'pointer', transition: 'border-color 0.2s' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <h5 style={{ margin: 0, color: 'var(--text-primary)' }}>Room {room.roomNumber}</h5>
                      <button onClick={e => { e.stopPropagation(); handleDelete(room._id); }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1rem' }}>✕</button>
                    </div>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: '8px 0 4px' }}>{room.type} · {room.floor}</p>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: '0 0 8px' }}>{room.bathroom} · Cap: {room.capacity}</p>
                    <span style={{ fontSize: '0.78rem', padding: '2px 10px', borderRadius: 'var(--radius-full)', background: statusColor(room.status), color: '#fff' }}>{room.status}</span>
                    {expandedRoom === room._id && (
                      <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border)' }}>
                        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Occupants ({room.occupants?.length || 0}/{room.capacity})</p>
                        {room.occupants && room.occupants.length > 0
                          ? (occupantDetails[room._id] || []).map((occ, i) => (
                              <div key={i} style={{ marginBottom: '6px' }}>
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-primary)', margin: 0, fontWeight: 600 }}>👤 {occ.name || occ.firstName}</p>
                                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>{occ.email} · {occ.course} {occ.sem}</p>
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
