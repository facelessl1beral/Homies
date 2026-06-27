import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { Link } from 'react-router-dom';
import Spinner from '../layout/Spinner';
import { getRecommendations, rejectUser, acceptUser } from '../../actions/profile';

// Compute top matching fields between current user and a profile
const getMatchInsights = (current, other) => {
  if (!current || !other) return [];
  const checks = [
    { field: 'sleepSchedule', label: 'Sleep schedule', emoji: '🌙' },
    { field: 'cleanliness',   label: 'Cleanliness',    emoji: '✨' },
    { field: 'studyPref',     label: 'Study style',    emoji: '📚' },
    { field: 'social',        label: 'Social vibe',    emoji: '🤝' },
    { field: 'noise',         label: 'Noise level',    emoji: '🔊' },
    { field: 'guests',        label: 'Guests policy',  emoji: '🚪' },
    { field: 'exercise',      label: 'Exercise habits',emoji: '💪' },
    { field: 'food',          label: 'Food preference',emoji: '🍽️' },
    { field: 'smoke',         label: 'Smoking',        emoji: '🚭' },
    { field: 'drink',         label: 'Drinking',       emoji: '🥤' },
    { field: 'cook',          label: 'Cooking',        emoji: '🍳' },
    { field: 'preferredHostel', label: 'Same hostel',  emoji: '🏠' },
    { field: 'roomType',      label: 'Room type',      emoji: '🛏️' },
  ];
  const matched = checks.filter(c => current[c.field] && other[c.field] && current[c.field] === other[c.field]);
  const mismatched = checks.filter(c => current[c.field] && other[c.field] && current[c.field] !== other[c.field]);
  return { matched: matched.slice(0, 3), mismatched: mismatched.slice(0, 2) };
};

const MatchOverlay = ({ person, onClose }) => (
  <div className="match-overlay" onClick={onClose}>
    <h1>It's a Match!</h1>
    <p>You and {person.firstName || person.name} are compatible roommates</p>
    <div className="match-avatars">
      <div className="match-avatar-placeholder">👤</div>
      <span className="match-heart">💜</span>
      {person.avatar
        ? <img src={person.avatar} alt={person.firstName} />
        : <div className="match-avatar-placeholder">👤</div>
      }
    </div>
    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
      Tap anywhere to continue
    </p>
    <Link
      to={`/profile/${person._id}`}
      className="btn btn-primary"
      onClick={e => e.stopPropagation()}
    >
      View their profile →
    </Link>
  </div>
);

const SwipeCard = ({ profile, isTop, position, onSwipe, currentUser }) => {
  const [dragStart, setDragStart] = useState(null);
  const [dragX, setDragX] = useState(0);
  const [swipeDir, setSwipeDir] = useState(null);

  const displayName = `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || profile.name;
  const score = profile.score || 0;

  const matchClass = score >= 75 ? 'high' : score >= 50 ? 'mid' : 'low';

  const handleMouseDown = (e) => {
    if (!isTop) return;
    setDragStart(e.clientX);
  };

  const handleMouseMove = (e) => {
    if (!isTop || dragStart === null) return;
    const dx = e.clientX - dragStart;
    setDragX(dx);
    if (dx > 60) setSwipeDir('right');
    else if (dx < -60) setSwipeDir('left');
    else setSwipeDir(null);
  };

  const handleMouseUp = () => {
    if (!isTop || dragStart === null) return;
    if (dragX > 80) onSwipe('right', profile._id);
    else if (dragX < -80) onSwipe('left', profile._id);
    setDragStart(null);
    setDragX(0);
    setSwipeDir(null);
  };

  const cardStyle = isTop && dragStart !== null ? {
    transform: `translateX(${dragX}px) rotate(${dragX * 0.08}deg)`,
    transition: 'none',
    cursor: 'grabbing'
  } : {};

  const posClass = position === 0 ? 'is-top' : position === 1 ? 'is-second' : 'is-third';

  return (
    <div
      className={`swipe-card ${posClass}`}
      style={cardStyle}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Like/Nope labels */}
      {isTop && (
        <>
          <div className="swipe-label swipe-label-like"
            style={{ opacity: swipeDir === 'right' ? Math.min((dragX - 40) / 60, 1) : 0 }}>
            MATCH
          </div>
          <div className="swipe-label swipe-label-nope"
            style={{ opacity: swipeDir === 'left' ? Math.min((-dragX - 40) / 60, 1) : 0 }}>
            PASS
          </div>
        </>
      )}

      {/* Photo */}
      <div className="swipe-card-photo">
        {profile.avatar
          ? <img src={profile.avatar} alt={displayName} draggable="false" />
          : <span>👤</span>
        }
      </div>

      {/* Info */}
      <div className="swipe-card-body">
        <div className="swipe-card-name">
          <span>{displayName}</span>
          <span className={`match-badge ${matchClass}`}>{Math.round(score)}%</span>
        </div>
        <p className="swipe-card-location">
          {profile.city}{profile.country && `, ${profile.country}`}
          {profile.univ && ` · ${profile.univ}`}
        </p>
        <div className="swipe-card-tags">
          {profile.gender && <span className="swipe-tag">{profile.gender}</span>}
          {profile.age && <span className="swipe-tag">{profile.age}</span>}
          {profile.sleepSchedule && <span className="swipe-tag">🌙 {profile.sleepSchedule}</span>}
          {profile.cleanliness && <span className="swipe-tag">✨ {profile.cleanliness}</span>}
          {profile.food && <span className="swipe-tag">🍽 {profile.food}</span>}
          {profile.smoke === 'Non-smoker' && <span className="swipe-tag">🚭 Non-smoker</span>}
        </div>
        {/* Match insight — why you matched */}
        {currentUser && (() => {
          const { matched, mismatched } = getMatchInsights(currentUser, profile);
          if (matched.length === 0 && mismatched.length === 0) return null;
          return (
            <div style={{
              marginTop: '0.75rem',
              padding: '0.6rem 0.75rem',
              background: 'rgba(124,58,237,0.08)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid rgba(124,58,237,0.15)',
              fontSize: '0.78rem',
            }}>
              {matched.length > 0 && (
                <div style={{ marginBottom: mismatched.length > 0 ? '0.3rem' : 0 }}>
                  <span style={{ color: '#10b981', fontWeight: 600 }}>✓ You both share: </span>
                  <span style={{ color: 'var(--text-secondary)' }}>
                    {matched.map(m => `${m.emoji} ${m.label}`).join(' · ')}
                  </span>
                </div>
              )}
              {mismatched.length > 0 && (
                <div>
                  <span style={{ color: '#f59e0b', fontWeight: 600 }}>≠ Different: </span>
                  <span style={{ color: 'var(--text-muted)' }}>
                    {mismatched.map(m => `${m.emoji} ${m.label}`).join(' · ')}
                  </span>
                </div>
              )}
            </div>
          );
        })()}
        {profile.notes && (
          <p style={{
            marginTop: '0.75rem', fontSize: '0.85rem',
            color: 'var(--text-secondary)', fontStyle: 'italic',
            overflow: 'hidden', display: '-webkit-box',
            WebkitLineClamp: 2, WebkitBoxOrient: 'vertical'
          }}>
            "{profile.notes}"
          </p>
        )}
      </div>
    </div>
  );
};

const Recommended = ({
  getRecommendations,
  rejectUser,
  acceptUser,
  profile: { recommendations, loading },
  auth: { user: currentUser },
}) => {
  const [cards, setCards] = useState([]);
  const [match, setMatch] = useState(null);
  const [swipingId, setSwipingId] = useState(null);

  useEffect(() => {
    getRecommendations();
  }, [getRecommendations]);

  useEffect(() => {
    if (recommendations) {
      setCards(recommendations.filter(p => p.status !== 'Rejected' && p.status !== 'Accepted'));
    }
  }, [recommendations]);

  const handleSwipe = (direction, id) => {
    if (swipingId) return;
    setSwipingId(id);

    setTimeout(() => {
      if (direction === 'right') {
        const person = cards.find(c => c._id === id);
        acceptUser(id);
        if (person) setMatch(person);
      } else {
        rejectUser(id);
      }
      setCards(prev => prev.filter(c => c._id !== id));
      setSwipingId(null);
    }, 350);
  };

  const topCard = cards[0];

  if (loading) return <Spinner />;

  return (
    <div className="swipe-container" style={{ marginTop: 'var(--navbar-height)' }}>
      {match && (
        <MatchOverlay person={match} onClose={() => setMatch(null)} />
      )}

      <div className="swipe-header">
        <h1>Discover</h1>
        <p>{cards.length} potential roommates nearby</p>
      </div>

      {cards.length > 0 ? (
        <>
          <div className="swipe-stack">
            {cards.slice(0, 3).map((profile, i) => (
              <SwipeCard
                key={profile._id}
                profile={profile}
                isTop={i === 0}
                position={i}
                onSwipe={handleSwipe}
                currentUser={currentUser}
              />
            ))}
          </div>

          <div className="swipe-actions">
            <button
              className="swipe-btn swipe-btn-reject"
              onClick={() => topCard && handleSwipe('left', topCard._id)}
              title="Pass"
            >
              ✕
            </button>
            <Link to={`/profile/${topCard?._id}`} className="swipe-btn swipe-btn-info" title="View profile">
              👁
            </Link>
            <button
              className="swipe-btn swipe-btn-accept"
              onClick={() => topCard && handleSwipe('right', topCard._id)}
              title="Match"
            >
              ♥
            </button>
          </div>

          <p style={{
            marginTop: '1.25rem', fontSize: '0.8rem',
            color: 'var(--text-muted)', textAlign: 'center'
          }}>
            Drag cards or use the buttons · {Math.round(cards[0]?.score || 0)}% match
          </p>
        </>
      ) : (
        <div className="swipe-empty">
          <div className="swipe-empty-icon">🏠</div>
          <h3>You've seen everyone</h3>
          <p style={{ marginBottom: '1.5rem' }}>
            Check back later or update your preferences to see more matches
          </p>
          <Link to="/edit-profile" className="btn btn-primary">
            Update preferences
          </Link>
        </div>
      )}
    </div>
  );
};

Recommended.propTypes = {
  getRecommendations: PropTypes.func.isRequired,
  rejectUser: PropTypes.func.isRequired,
  acceptUser: PropTypes.func.isRequired,
  profile: PropTypes.object.isRequired,
};

const mapStateToProps = state => ({
  profile: state.profile,
  auth: state.auth
});

export default connect(mapStateToProps, { getRecommendations, rejectUser, acceptUser })(Recommended);
