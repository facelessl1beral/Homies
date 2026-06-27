import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import HostelLogin from './HostelLogin';
import AdminDashboard from './AdminDashboard';

const AdminPortal = () => {
  const [token, setToken] = useState(localStorage.getItem('hostelToken') || null);
  const [hostelName, setHostelName] = useState(localStorage.getItem('hostelName') || '');

  const handleLogin = (t, name) => {
    setToken(t);
    setHostelName(name);
    localStorage.setItem('hostelName', name);
  };

  const handleLogout = () => {
    localStorage.removeItem('hostelToken');
    localStorage.removeItem('hostelName');
    setToken(null);
    setHostelName('');
  };

  return token
    ? (
      <div>
        <div style={{ padding: '12px 0', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontWeight: 600, fontSize: '1rem' }}>{hostelName || 'Hostel'} Admin</span>
          <button onClick={handleLogout} style={{ marginLeft: 'auto', background: 'none', border: '1px solid var(--border)', borderRadius: '8px', padding: '6px 16px', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-primary)', background: 'var(--bg-secondary)' }}>Logout</button>
        </div>
        <AdminDashboard token={token} />
      </div>
    )
    : (
      <div>
        <div style={{ padding: '12px 0 8px', marginBottom: '8px', display: 'flex', alignItems: 'center' }}>
          <Link to="/" style={{ fontSize: '0.85rem', opacity: 0.6, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
            ← Back to Homies
          </Link>
        </div>
        <HostelLogin onLogin={handleLogin} />
      </div>
    );
};

export default AdminPortal;
