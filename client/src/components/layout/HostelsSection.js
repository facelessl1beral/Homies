import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const HostelsSection = () => {
  const [hostels, setHostels] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get('/api/hostels/public')
      .then(res => { setHostels(res.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading || hostels.length === 0) return null;

  return (
    <section className='hostels-section'>
      <div className='hostels-inner'>
        <div className='hostels-header'>
          <span className='hostels-eyebrow'>Partnered Hostels</span>
          <h2 className='hostels-heading'>Find your hostel on Homies</h2>
          <p className='hostels-sub'>These hostels are actively using Homies to match compatible roommates. Register and find your match today.</p>
        </div>
        <div className='hostels-grid'>
          {hostels.map(h => (
            <div key={h._id} className='hostel-card'>
              <div className='hostel-card-icon'>🏠</div>
              <h3 className='hostel-card-name'>{h.name}</h3>
              {h.location && <p className='hostel-card-location'>📍 {h.location}</p>}
              {h.description && <p className='hostel-card-desc'>{h.description}</p>}
              <div className='hostel-card-stats'>
                <span className='hostel-stat'>
                  <strong>{h.totalRooms}</strong> rooms
                </span>
                <span className='hostel-stat hostel-stat--available'>
                  <strong>{h.availableRooms}</strong> available
                </span>
              </div>
              <Link to='/register' className='btn btn-primary' style={{ width: '100%', textAlign: 'center', marginTop: '0.75rem', fontSize: '0.88rem' }}>
                Find a match here →
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HostelsSection;
