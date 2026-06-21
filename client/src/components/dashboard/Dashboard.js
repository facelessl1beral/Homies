import React, { useEffect, Fragment } from "react";
import { Link } from "react-router-dom";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import { getCurrentProfile } from "../../actions/profile";
import Spinner from "../layout/Spinner";

const Dashboard = ({
  getCurrentProfile,
  auth: { user },
  profile: { profile, loading },
}) => {
  useEffect(() => {
    getCurrentProfile();
  }, [getCurrentProfile]);

  if (loading && profile === null) return <Spinner />;

  const displayName = profile
    ? (profile.name || `${profile.firstName || ''} ${profile.lastName || ''}`.trim())
    : (user ? user.firstName : '');

  return (
    <div className="container">
      <div className="dashboard-header">
        <h1 className="large">Dashboard</h1>
        <p className="lead">
          Welcome back, <span style={{ color: 'var(--accent-purple)', fontWeight: 600 }}>
            {user && user.firstName}
          </span>
        </p>
      </div>

      {profile !== null ? (
        <Fragment>
          <div className="dashboard-grid">
            {/* Profile card */}
            <div className="profile-card">
              {profile.avatar ? (
                <img className="round-img" src={profile.avatar} alt={displayName}
                  style={{ width: 72, height: 72 }} />
              ) : (
                <div style={{
                  width: 72, height: 72, borderRadius: '50%',
                  background: 'var(--bg-tertiary)', border: '2px dashed var(--border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.8rem', flexShrink: 0, color: 'var(--text-muted)'
                }}>​<span role='img' aria-label='person'>👤</span></div>
              )}
              <div className="profile-card-info">
                <h2>{displayName || 'Your Name'}</h2>
                <p>{profile.city}{profile.country && `, ${profile.country}`}</p>
                {profile.univ && <p style={{ fontSize: '0.85rem' }}>{profile.univ}</p>}
                <div style={{ marginTop: '0.5rem' }}>
                  {profile.gender && <span className="tag">{profile.gender}</span>}
                  {profile.age && <span className="tag">{profile.age}</span>}
                  {profile.course && <span className="tag">{profile.course}</span>}
                  {profile.food && <span className="tag">{profile.food}</span>}
                  {profile.smoke && <span className="tag">{profile.smoke}</span>}
                </div>
                <div className="dashboard-actions">
                  <Link to="/edit-profile" className="btn btn-primary" style={{ fontSize: '0.85rem', padding: '0.5rem 1.1rem' }}>
                    Edit profile
                  </Link>
                  <Link to="/recommendations" className="btn btn-secondary" style={{ fontSize: '0.85rem', padding: '0.5rem 1.1rem' }}>
                    Discover →
                  </Link>
                </div>
              </div>
            </div>

            {/* Roommate preferences card */}
            <div className="prefs-card">
              <h3>Roommate preferences</h3>
              {[
                ['Gender',   profile.roomieGender],
                ['Age',      profile.roomieAge],
                ['Country',  profile.roomieCountry],
                ['Food',     profile.roomieFood],
                ['Smoking',  profile.roomieSmoke],
                ['Drinking', profile.roomieDrink],
              ].map(([label, value]) => value && (
                <div className="pref-row" key={label}>
                  <span>{label}</span>
                  <span>{value}</span>
                </div>
              ))}
              {profile.sleepSchedule && (
                <div className="pref-row">
                  <span>Sleep</span>
                  <span>{profile.sleepSchedule}</span>
                </div>
              )}
              {profile.cleanliness && (
                <div className="pref-row">
                  <span>Cleanliness</span>
                  <span>{profile.cleanliness}</span>
                </div>
              )}
              <div style={{ marginTop: '1rem' }}>
                <Link to="/edit-profile" className="btn btn-secondary" style={{ fontSize: '0.85rem', padding: '0.5rem 1.1rem' }}>
                  Edit preferences
                </Link>
              </div>
            </div>
          </div>

          {/* Cold start nudge — show when lifestyle profile is incomplete */}
          {(() => {
            const lifestyleFields = ['sleepSchedule', 'cleanliness', 'studyPref', 'social', 'noise', 'guests', 'exercise'];
            const filled = lifestyleFields.filter(f => profile[f]).length;
            if (filled < 3) return (
              <div style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)', borderRadius: 'var(--radius-lg)', padding: '1rem 1.5rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '1.5rem' }}>✨</span>
                <div>
                  <p style={{ margin: 0, fontWeight: 600, color: 'var(--text-primary)' }}>Your profile is {Math.round((filled/7)*100)}% complete</p>
                  <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-secondary)' }}>Add at least {3 - filled} more lifestyle preference{3 - filled > 1 ? 's' : ''} to get accurate match scores</p>
                </div>
                <Link to="/edit-profile" className="btn btn-primary" style={{ marginLeft: 'auto', fontSize: '0.85rem', padding: '0.5rem 1.1rem' }}>Complete profile →</Link>
              </div>
            );
            return null;
          })()}
          {/* Cold start nudge — show when lifestyle profile is incomplete */}
          {(() => {
            const lifestyleFields = ['sleepSchedule', 'cleanliness', 'studyPref', 'social', 'noise', 'guests', 'exercise'];
            const filled = lifestyleFields.filter(f => profile[f]).length;
            if (filled < 3) return (
              <div style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)', borderRadius: 'var(--radius-lg)', padding: '1rem 1.5rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '1.5rem' }}>✨</span>
                <div>
                  <p style={{ margin: 0, fontWeight: 600, color: 'var(--text-primary)' }}>Your profile is {Math.round((filled/7)*100)}% complete</p>
                  <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-secondary)' }}>Add at least {3 - filled} more lifestyle preference{3 - filled > 1 ? 's' : ''} to get accurate match scores</p>
                </div>
                <Link to="/edit-profile" className="btn btn-primary" style={{ marginLeft: 'auto', fontSize: '0.85rem', padding: '0.5rem 1.1rem' }}>Complete profile →</Link>
              </div>
            );
            return null;
          })()}
          {/* Booking status strip */}
          <div className="booking-strip">
            <h3>Hostel Booking</h3>
            {profile.bookingStatus === 'confirmed' ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '2rem' }}>🏠</span>
                <div>
                  <p className="booking-label" style={{ color: 'var(--accent-purple)' }}>Booking Confirmed</p>
                  <p className="booking-sub">Room <strong>{profile.assignedRoom}</strong> at <strong>{profile.assignedHostel}</strong></p>
                </div>
                <span className="booking-badge confirmed">Confirmed</span>
              </div>
            ) : profile.bookingStatus === 'pending' ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span style={{ fontSize: '2rem' }}>⏳</span>
                <div>
                  <p className="booking-label">Awaiting Confirmation</p>
                  <p className="booking-sub">Your match is waiting for hostel approval at <strong>{profile.preferredHostel || 'your selected hostel'}</strong></p>
                </div>
                <span className="booking-badge pending">Pending</span>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '2rem' }}>🏡</span>
                <div>
                  <p className="booking-label">No booking yet</p>
                  <p className="booking-sub">{profile.preferredHostel ? `You've selected ${profile.preferredHostel} — start matching to get a room` : 'Set your hostel preference and start matching'}</p>
                </div>
                <Link to="/recommendations" className="btn btn-primary" style={{ marginLeft: 'auto', fontSize: '0.85rem', padding: '0.5rem 1.1rem' }}>Start Matching →</Link>
              </div>
            )}
          </div>

          {/* Lifestyle summary strip */}
          {(profile.sleepSchedule || profile.studyPref || profile.social || profile.noise) && (
            <div className="lifestyle-strip">
              <h3>Lifestyle snapshot</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {profile.sleepSchedule && (
                  <span className="tag">🌙 {profile.sleepSchedule}</span>
                )}
                {profile.studyPref && (
                  <span className="tag">📚 {profile.studyPref}</span>
                )}
                {profile.cleanliness && (
                  <span className="tag">✨ {profile.cleanliness}</span>
                )}
                {profile.social && (
                  <span className="tag">👥 {profile.social}</span>
                )}
                {profile.noise && (
                  <span className="tag">🔊 {profile.noise}</span>
                )}
                {profile.exercise && (
                  <span className="tag">🏃 {profile.exercise}</span>
                )}
              </div>
            </div>
          )}
        </Fragment>
      ) : (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>​<span role='img' aria-label='wave'>👋</span></div>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', marginBottom: '0.5rem' }}>
            Let's set up your profile
          </h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
            Complete your profile so we can find your perfect roommate match.
          </p>
          <Link to="/edit-profile" className="btn btn-primary">
            Create profile →
          </Link>
        </div>
      )}
    </div>
  );
};

Dashboard.propTypes = {
  getCurrentProfile: PropTypes.func.isRequired,
  auth: PropTypes.object.isRequired,
  profile: PropTypes.object.isRequired,
};

const mapStateToProps = (state) => ({
  auth: state.auth,
  profile: state.profile,
});

export default connect(mapStateToProps, { getCurrentProfile })(Dashboard);
