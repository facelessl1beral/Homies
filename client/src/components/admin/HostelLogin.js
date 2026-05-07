import React, { useState } from 'react';
import axios from 'axios';

const HostelLogin = ({ onLogin }) => {
  const [tab, setTab] = useState('login');
  const [loginData, setLoginData] = useState({ name: '', password: '' });
  const [registerData, setRegisterData] = useState({ name: '', contactEmail: '', password: '', password2: '', location: '', description: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const onLoginSubmit = async e => {
    e.preventDefault();
    setError('');
    try {
      const res = await axios.post('/api/hostels/login', loginData);
      localStorage.setItem('hostelToken', res.data.token);
      onLogin(res.data.token, loginData.name);
    } catch (err) {
      setError(err.response?.data?.errors?.[0]?.msg || 'Login failed');
    }
  };

  const onRegisterSubmit = async e => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (registerData.password !== registerData.password2) {
      setError('Passwords do not match');
      return;
    }
    try {
      await axios.post('/api/hostels/register', {
        name: registerData.name,
        contactEmail: registerData.contactEmail,
        password: registerData.password,
        location: registerData.location,
        description: registerData.description
      });
      setSuccess(`${registerData.name} registered successfully. You can now log in.`);
      setTab('login');
      setLoginData({ name: registerData.name, password: '' });
      setRegisterData({ name: '', contactEmail: '', password: '', password2: '', location: '', description: '' });
    } catch (err) {
      setError(err.response?.data?.errors?.[0]?.msg || 'Registration failed');
    }
  };

  const inputStyle = {
    width: '100%', padding: '10px 14px', borderRadius: '8px',
    border: '1px solid var(--border)', background: 'var(--bg-secondary)',
    color: 'var(--text-primary)', fontSize: '0.95rem', outline: 'none',
    marginTop: '4px'
  };

  const labelStyle = {
    fontSize: '0.85rem', color: 'var(--text-secondary)',
    display: 'block', marginBottom: '2px'
  };

  return (
    <div style={{ maxWidth: '420px', margin: '3rem auto' }}>
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)', padding: '2rem'
      }}>
        <h2 style={{ color: 'var(--text-primary)', marginBottom: '1.5rem', fontFamily: 'var(--font-display)' }}>
          Hostel Admin Portal
        </h2>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '1.5rem', borderBottom: '2px solid var(--border)' }}>
          {['login', 'register'].map(t => (
            <button key={t} onClick={() => { setTab(t); setError(''); setSuccess(''); }}
              style={{
                padding: '8px 20px', border: 'none', background: 'none', cursor: 'pointer',
                fontWeight: tab === t ? '700' : '400',
                color: tab === t ? 'var(--accent-purple)' : 'var(--text-secondary)',
                borderBottom: tab === t ? '3px solid var(--accent-purple)' : '3px solid transparent',
                fontSize: '0.95rem', textTransform: 'capitalize', marginBottom: '-2px'
              }}>{t === 'login' ? 'Login' : 'Register Hostel'}</button>
          ))}
        </div>

        {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: 'var(--danger)', borderRadius: '8px', padding: '10px 14px', marginBottom: '1rem', fontSize: '0.9rem' }}>{error}</div>}
        {success && <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', color: 'var(--success)', borderRadius: '8px', padding: '10px 14px', marginBottom: '1rem', fontSize: '0.9rem' }}>{success}</div>}

        {/* LOGIN TAB */}
        {tab === 'login' && (
          <form onSubmit={onLoginSubmit}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={labelStyle}>Hostel Name</label>
              <input style={inputStyle} type="text" value={loginData.name}
                onChange={e => { const v = e.target.value; setLoginData(d => ({ ...d, name: v })); }}
                placeholder="e.g. Bavana" required />
            </div>
            <div style={{ marginBottom: '1.5rem', position: 'relative' }}>
              <label style={labelStyle}>Password</label>
              <input style={inputStyle} type={showPassword ? 'text' : 'password'}
                value={loginData.password}
                onChange={e => { const v = e.target.value; setLoginData(d => ({ ...d, password: v })); }}
                required />
              <span onClick={() => setShowPassword(!showPassword)}
                style={{ position: 'absolute', right: '12px', bottom: '10px', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                {showPassword ? 'Hide' : 'Show'}
              </span>
            </div>
            <button type="submit" style={{
              width: '100%', padding: '12px', border: 'none', borderRadius: '8px',
              background: 'var(--accent-gradient)', color: '#ffffff', fontWeight: 700,
              fontSize: '1rem', cursor: 'pointer', letterSpacing: '0.02em'
            }}>Login</button>
          </form>
        )}

        {/* REGISTER TAB */}
        {tab === 'register' && (
          <form onSubmit={onRegisterSubmit}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={labelStyle}>Hostel Name *</label>
              <input style={inputStyle} type="text" value={registerData.name}
                onChange={e => { const v = e.target.value; setRegisterData(d => ({ ...d, name: v })); }}
                placeholder="e.g. Bavana Hostel" required />
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={labelStyle}>Contact Email * <span style={{ opacity: 0.6, fontSize: '0.78rem' }}>(booking notifications sent here)</span></label>
              <input style={inputStyle} type="email" value={registerData.contactEmail}
                onChange={e => { const v = e.target.value; setRegisterData(d => ({ ...d, contactEmail: v })); }}
                placeholder="admin@bavana.com" required />
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={labelStyle}>Location</label>
              <input style={inputStyle} type="text" value={registerData.location}
                onChange={e => { const v = e.target.value; setRegisterData(d => ({ ...d, location: v })); }}
                placeholder="e.g. Near KYU Main Gate" />
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={labelStyle}>Description</label>
              <input style={inputStyle} type="text" value={registerData.description}
                onChange={e => { const v = e.target.value; setRegisterData(d => ({ ...d, description: v })); }}
                placeholder="Short description for students" />
            </div>
            <div style={{ marginBottom: '1rem', position: 'relative' }}>
              <label style={labelStyle}>Password *</label>
              <input style={inputStyle} type={showPassword ? 'text' : 'password'}
                value={registerData.password}
                onChange={e => { const v = e.target.value; setRegisterData(d => ({ ...d, password: v })); }}
                required />
              <span onClick={() => setShowPassword(!showPassword)}
                style={{ position: 'absolute', right: '12px', bottom: '10px', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                {showPassword ? 'Hide' : 'Show'}
              </span>
            </div>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={labelStyle}>Confirm Password *</label>
              <input style={inputStyle} type={showPassword ? 'text' : 'password'}
                value={registerData.password2}
                onChange={e => { const v = e.target.value; setRegisterData(d => ({ ...d, password2: v })); }}
                required />
            </div>
            <button type="submit" style={{
              width: '100%', padding: '12px', border: 'none', borderRadius: '8px',
              background: 'var(--accent-gradient)', color: '#ffffff', fontWeight: 700,
              fontSize: '1rem', cursor: 'pointer', letterSpacing: '0.02em'
            }}>Register Hostel</button>
          </form>
        )}

        <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
          Student? <a href="/login" style={{ color: 'var(--accent-purple)' }}>Login here</a>
        </p>
      </div>
    </div>
  );
};

export default HostelLogin;
