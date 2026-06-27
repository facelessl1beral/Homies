import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { getCurrentProfile, createProfile } from '../../actions/profile';
import Spinner from '../layout/Spinner';

const STEPS = [
  {
    id: 'basics',
    title: 'The basics',
    subtitle: "Let's start with who you are",
    fields: [
      { name: 'displayName', label: 'Full name', type: 'text', placeholder: 'Your full name' },
      { name: 'city', label: 'City', type: 'text', placeholder: 'Where are you based?' },
      { name: 'country', label: 'Country', type: 'text', placeholder: 'Your country' },
      { name: 'linkedin', label: 'LinkedIn (optional)', type: 'text', placeholder: 'https://linkedin.com/in/...' },
      { name: 'notes', label: 'Bio (optional)', type: 'textarea', placeholder: 'Tell potential roommates something about yourself...' },
    ]
  },
  {
    id: 'identity',
    title: 'Your identity',
    subtitle: 'Help us understand you better',
    fields: [
      {
        name: 'gender', label: 'Gender', type: 'pills',
        options: ['Male', 'Female', 'Non-Binary', 'Transgender', 'Intersex', 'Prefer not to say']
      },
      {
        name: 'age', label: 'Age group', type: 'pills',
        options: ['18-24', '25-29', '30-34', '35-39', '40-44', '45-49', '50+']
      },
      { name: 'univ', label: 'University / Institution', type: 'text', placeholder: 'e.g. Makerere University' },
      { name: 'course', label: 'Course / Programme', type: 'text', placeholder: 'e.g. BSc Computer Science' },
      {
        name: 'sem', label: 'Year of study', type: 'pills',
        options: ['Year 1', 'Year 2', 'Year 3', 'Year 4', 'Postgraduate', 'Alumni']
      },
    ]
  },
  {
    id: 'lifestyle',
    title: 'Your lifestyle',
    subtitle: 'How do you live day to day?',
    fields: [
      {
        name: 'sleepSchedule', label: 'Sleep schedule', type: 'pills',
        options: ['Early bird (before 10pm)', 'Regular (10pm–12am)', 'Night owl (after 12am)']
      },
      {
        name: 'studyPref', label: 'Study preference', type: 'pills',
        options: ['In my room', 'Library', 'Group study', 'Flexible']
      },
      {
        name: 'cleanliness', label: 'Cleanliness level', type: 'pills',
        options: ['Very organised', 'Moderate', 'Relaxed']
      },
      {
        name: 'social', label: 'Social habits', type: 'pills',
        options: ['Very social', 'Moderate', 'Private']
      },
      {
        name: 'noise', label: 'Noise tolerance', type: 'pills',
        options: ['Quiet please', 'Moderate', 'Lively is fine']
      },
      {
        name: 'guests', label: 'Guest policy', type: 'pills',
        options: ['Frequently', 'Occasionally', 'Never']
      },
    ]
  },
  {
    id: 'habits',
    title: 'Your habits',
    subtitle: 'Honest answers make better matches',
    fields: [
      {
        name: 'food', label: 'Food preference', type: 'pills',
        options: ['Vegetarian', 'Vegetarian + Egg', 'Non-Vegetarian', 'Vegan', 'Halal', 'No preference']
      },
      {
        name: 'smoke', label: 'Smoking', type: 'pills',
        options: ['Non-smoker', 'Social smoker', 'Smoker', 'Trying to quit']
      },
      {
        name: 'drink', label: 'Drinking', type: 'pills',
        options: ['Non-drinker', 'Occasionally', 'Socially', 'Regularly']
      },
      {
        name: 'cook', label: 'Cooking', type: 'pills',
        options: ['Yes, I cook often', 'Learning', 'Rarely', 'Never']
      },
      {
        name: 'exercise', label: 'Exercise', type: 'pills',
        options: ['Every day', 'Often', 'Sometimes', 'Never']
      },
    ]
  },
  {
    id: 'roomie',
    title: 'Your ideal roommate',
    subtitle: "Now tell us what you're looking for",
    fields: [
      {
        name: 'roomieGender', label: 'Roommate gender', type: 'pills',
        options: ['Male', 'Female', 'Non-Binary', 'Same gender only', "Don't Care"]
      },
      {
        name: 'roomieAge', label: 'Roommate age group', type: 'pills',
        options: ['18-24', '25-29', '30-34', '35-39', '40+', "Don't Care"]
      },
      { name: 'roomieCountry', label: 'Roommate country (optional)', type: 'text', placeholder: "Any country or leave blank" },
      { name: 'roomieUniv', label: 'Roommate university (optional)', type: 'text', placeholder: "Any university or leave blank" },
      {
        name: 'roomieSem', label: 'Roommate year of study', type: 'pills',
        options: ['Year 1', 'Year 2', 'Year 3', 'Year 4', 'Postgraduate', "Don't Care"]
      },
      {
        name: 'roomieCourse', label: 'Roommate course', type: 'pills',
        options: ['Same course', 'Same faculty', 'Any course', "Don't Care"]
      },
    ]
  },
  {
    id: 'roomie_habits',
    title: 'Roommate habits',
    subtitle: 'What matters to you in a roommate?',
    fields: [
      {
        name: 'roomieFood', label: 'Food preference', type: 'pills',
        options: ['Vegetarian', 'Non-Vegetarian', 'Vegan', 'Halal', "Don't Care"]
      },
      {
        name: 'roomieSmoke', label: 'Smoking', type: 'pills',
        options: ['Non-smoker only', 'Smoker ok', "Don't Care"]
      },
      {
        name: 'roomieDrink', label: 'Drinking', type: 'pills',
        options: ['Non-drinker only', 'Drinker ok', "Don't Care"]
      },
      {
        name: 'roomieCook', label: 'Cooking', type: 'pills',
        options: ['Cooks regularly', 'Occasionally', "Don't Care"]
      },
    ]
  },
  {
    id: 'photo',
    title: 'Your profile photo',
    subtitle: 'A face to the name goes a long way',
    fields: [

    ]
  },
  {
    id: 'hostel',
    title: 'Your hostel preferences',
    subtitle: 'Help us match you with the right place',
    fields: [
      { name: 'preferredHostel', label: 'Preferred hostel', type: 'text', placeholder: 'e.g. Pearl Hostel, KYU Block A' },
      {
        name: 'roomType', label: 'Room type', type: 'pills',
        options: ['Single', 'Double', 'Shared dorm']
      },
      {
        name: 'floorPref', label: 'Floor preference', type: 'pills',
        options: ['Ground floor', 'First floor', 'Second floor', 'No preference']
      },
      {
        name: 'bathroomPref', label: 'Bathroom', type: 'pills',
        options: ['En-suite', 'Shared']
      },
      {
        name: 'proximityPref', label: 'Proximity to', type: 'pills',
        options: ['Dining hall', 'Main gate', 'Library', 'No preference']
      },
    ]
  },
];

const EditProfile = ({
  getCurrentProfile,
  createProfile,
  auth: { user },
  profile: { profile, loading },
  history
}) => {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState('forward');
  const [animating, setAnimating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [formData, setFormData] = useState({
    displayName: '', gender: '', age: '', city: '', country: '',
    univ: '', sem: '', course: '', food: '', smoke: '', drink: '',
    cook: '', notes: '', linkedin: '', avatar: '',
    sleepSchedule: '', studyPref: '', cleanliness: '', social: '',
    noise: '', guests: '', exercise: '',
    roomieGender: '', roomieAge: '', roomieCountry: '', roomieUniv: '',
    roomieSem: '', roomieCourse: '', roomieFood: '', roomieSmoke: '',
    roomieDrink: '', roomieCook: '',
    preferredHostel: '', roomType: '', floorPref: '', bathroomPref: '', proximityPref: ''
  });

  useEffect(() => {
    getCurrentProfile();
    if (!loading && profile) {
      setFormData({
        displayName: profile.name || `${profile.firstName || ''} ${profile.lastName || ''}`.trim(),
        gender: profile.gender || '',
        age: profile.age || '',
        city: profile.city || '',
        country: profile.country || '',
        univ: profile.univ || '',
        sem: profile.sem || '',
        course: profile.course || '',
        food: profile.food || '',
        smoke: profile.smoke || '',
        drink: profile.drink || '',
        cook: profile.cook || '',
        notes: profile.notes || '',
        linkedin: profile.linkedin || '',
        avatar: profile.avatar || '',
        sleepSchedule: profile.sleepSchedule || '',
        studyPref: profile.studyPref || '',
        cleanliness: profile.cleanliness || '',
        social: profile.social || '',
        noise: profile.noise || '',
        guests: profile.guests || '',
        exercise: profile.exercise || '',
        preferredHostel: profile.preferredHostel || '',
        roomType: profile.roomType || '',
        floorPref: profile.floorPref || '',
        bathroomPref: profile.bathroomPref || '',
        proximityPref: profile.proximityPref || '',
        roomieGender: profile.roomieGender || '',
        roomieAge: profile.roomieAge || '',
        roomieCountry: profile.roomieCountry || '',
        roomieUniv: profile.roomieUniv || '',
        roomieSem: profile.roomieSem || '',
        roomieCourse: profile.roomieCourse || '',
        roomieFood: profile.roomieFood || '',
        roomieSmoke: profile.roomieSmoke || '',
        roomieDrink: profile.roomieDrink || '',
        roomieCook: profile.roomieCook || '',
      });
    }
  }, [loading, getCurrentProfile]);

  const goToStep = (newStep) => {
    if (animating) return;
    setDirection(newStep > step ? 'forward' : 'back');
    setAnimating(true);
    setTimeout(() => {
      setStep(newStep);
      setAnimating(false);
    }, 280);
  };

  const handlePill = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleChange = (e) => {
    e.persist();
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = () => {
    const submitData = {
      ...formData,
      name: formData.displayName,
    };
    createProfile(submitData, history, true);
  };

  const progress = ((step + 1) / STEPS.length) * 100;
  const currentStep = STEPS[step];

  if (loading) return <Spinner />;

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    setUploadError("");
    try {
      const formDataUpload = new FormData();
      formDataUpload.append("avatar", file);
      const token = localStorage.getItem("token");
      const res = await fetch("/api/upload", { method: "POST", headers: { "x-auth-token": token }, body: formDataUpload });
      const data = await res.json();
      if (data.url) { setFormData(f => ({ ...f, avatar: data.url })); }
      else { setUploadError("Upload failed. Please try again."); }
    } catch (err) { setUploadError("Upload failed. Please try again."); }
    finally { setUploading(false); }
  };

  return (
    <>
      <style>{`

        .qz-wrap {
          min-height: 100vh;
          background: var(--bg-primary);
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 0 0 80px 0;
          font-family: 'Satoshi', sans-serif;
          color: var(--text-primary);
        }

        .qz-top {
          width: 100%;
          max-width: 680px;
          padding: 28px 24px 0;
        }

        .qz-progress-track {
          width: 100%;
          height: 3px;
          background: var(--bg-secondary);
          border-radius: 99px;
          margin-bottom: 10px;
          overflow: hidden;
        }

        .qz-progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #7c3aed, #ec4899);
          border-radius: 99px;
          transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .qz-step-label {
          font-size: 11px;
          color: var(--text-secondary);
          letter-spacing: 0.08em;
          text-transform: uppercase;
          font-weight: 500;
        }

        .qz-card {
          width: 100%;
          max-width: 680px;
          padding: 0 24px;
          margin-top: 32px;
          transition: opacity 0.28s ease, transform 0.28s ease;
        }

        .qz-card.slide-out-forward {
          opacity: 0;
          transform: translateX(-40px);
        }

        .qz-card.slide-out-back {
          opacity: 0;
          transform: translateX(40px);
        }

        .qz-title {
          font-family: 'Clash Display', sans-serif;
          font-size: clamp(28px, 5vw, 42px);
          font-weight: 700;
          line-height: 1.1;
          color: var(--text-primary);
          margin: 0 0 8px 0;
        }

        .qz-subtitle {
          font-size: 15px;
          color: var(--text-secondary);
          margin: 0 0 36px 0;
          font-weight: 400;
        }

        .qz-field {
          margin-bottom: 28px;
        }

        .qz-label {
          display: block;
          font-size: 13px;
          font-weight: 500;
          color: var(--text-muted);
          margin-bottom: 10px;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }

        .qz-input {
          width: 100%;
          background: var(--bg-secondary);
          border: 1.5px solid var(--border);
          border-radius: 12px;
          padding: 14px 16px;
          font-size: 15px;
          color: var(--text-primary);
          font-family: 'Satoshi', sans-serif;
          outline: none;
          transition: border-color 0.2s;
          box-sizing: border-box;
        }

        .qz-input:focus {
          border-color: #7c3aed;
        }

        .qz-input::placeholder {
          color: var(--text-muted);
        }

        .qz-textarea {
          resize: vertical;
          min-height: 90px;
        }

        .qz-pills {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }

        .qz-pill {
          padding: 10px 18px;
          border-radius: 99px;
          border: 1.5px solid var(--border);
          background: var(--bg-secondary);
          color: var(--text-secondary);
          font-size: 14px;
          font-family: 'Satoshi', sans-serif;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.18s ease;
          user-select: none;
        }

        .qz-pill:hover {
          border-color: #7c3aed;
          color: var(--accent-purple);
        }

        .qz-pill.active {
          background: linear-gradient(135deg, #7c3aed22, #ec489922);
          border-color: #7c3aed;
          color: var(--accent-purple);
        }

        .qz-avatar-preview {
          width: 88px;
          height: 88px;
          border-radius: 50%;
          object-fit: cover;
          border: 2px solid #7c3aed;
          margin-bottom: 16px;
          display: block;
        }

        .qz-avatar-placeholder {
          width: 88px;
          height: 88px;
          border-radius: 50%;
          background: var(--bg-secondary);
          border: 2px dashed var(--border);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 28px;
          margin-bottom: 16px;
          color: var(--text-muted);
        }

        .qz-nav {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          background: var(--bg-primary);
          border-top: 1px solid var(--border);
          padding: 16px 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          max-width: 680px;
          margin: 0 auto;
          left: 50%;
          transform: translateX(-50%);
          width: 100%;
          box-sizing: border-box;
          z-index: 100;
        }

        .qz-btn-back {
          background: transparent;
          border: 1.5px solid var(--border);
          color: var(--text-secondary);
          padding: 12px 24px;
          border-radius: 99px;
          font-size: 14px;
          font-family: 'Satoshi', sans-serif;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .qz-btn-back:hover {
          border-color: var(--text-muted);
          color: var(--text-muted);
        }

        .qz-btn-next {
          background: linear-gradient(135deg, #7c3aed, #ec4899);
          border: none;
          color: #fff;
          padding: 13px 36px;
          border-radius: 99px;
          font-size: 15px;
          font-family: 'Satoshi', sans-serif;
          font-weight: 600;
          cursor: pointer;
          transition: opacity 0.2s, transform 0.15s;
          letter-spacing: 0.02em;
        }

        .qz-btn-next:hover {
          opacity: 0.92;
          transform: scale(1.02);
        }

        .qz-btn-next:active {
          transform: scale(0.98);
        }

        .qz-dots {
          display: flex;
          gap: 6px;
          align-items: center;
        }

        .qz-dot {
          width: 6px;
          height: 6px;
          border-radius: 99px;
          background: var(--bg-tertiary);
          transition: all 0.25s;
        }

        .qz-dot.active {
          background: #7c3aed;
          width: 18px;
        }

        .qz-welcome {
          font-size: 13px;
          color: var(--text-secondary);
          margin-bottom: 32px;
        }

        .qz-welcome span {
          color: #7c3aed;
          font-weight: 600;
        }
      `}</style>

      <div className="qz-wrap">
        <div className="qz-top">
          <div className="qz-progress-track">
            <div className="qz-progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <div className="qz-step-label">Step {step + 1} of {STEPS.length}</div>
        </div>

        <div
          className={`qz-card ${animating ? (direction === 'forward' ? 'slide-out-forward' : 'slide-out-back') : ''}`}
        >
          {user && (
            <p className="qz-welcome">
              Hey <span>{user.firstName}</span>, let's build your profile
            </p>
          )}

          <h1 className="qz-title">{currentStep.title}</h1>
          <p className="qz-subtitle">{currentStep.subtitle}</p>

          {currentStep.id === 'photo' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
              {formData.avatar ? (
                <img src={formData.avatar} alt="preview" className="qz-avatar-preview" />
              ) : (
                <div className="qz-avatar-placeholder">?</div>
              )}
              <label style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.6rem 1.4rem', borderRadius: 'var(--radius-full)',
                background: 'var(--accent-gradient)', color: '#fff',
                fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer',
                border: 'none', transition: 'opacity 0.2s'
              }}>
                {uploading ? 'Uploading...' : formData.avatar ? '📷 Change photo' : '📷 Choose photo'}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handlePhotoUpload}
                  style={{ display: 'none' }}
                  disabled={uploading}
                />
              </label>
              {uploadError && <p style={{ color: 'var(--danger)', fontSize: '0.85rem' }}>{uploadError}</p>}
              {uploading && <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Uploading your photo...</p>}
              {formData.avatar && <p style={{ color: 'var(--success)', fontSize: '0.85rem' }}>✓ Photo uploaded successfully</p>}
            </div>
          )}

          {currentStep.fields.map(field => (
            <div className="qz-field" key={field.name}>
              <label className="qz-label">{field.label}</label>

              {field.type === 'pills' && (
                <div className="qz-pills">
                  {field.options.map(opt => (
                    <div
                      key={opt}
                      className={`qz-pill ${formData[field.name] === opt ? 'active' : ''}`}
                      onClick={() => handlePill(field.name, opt)}
                    >
                      {opt}
                    </div>
                  ))}
                </div>
              )}

              {field.type === 'text' && (
                <input
                  className="qz-input"
                  type="text"
                  name={field.name}
                  value={formData[field.name]}
                  onChange={handleChange}
                  placeholder={field.placeholder}
                />
              )}

              {field.type === 'textarea' && (
                <textarea
                  className="qz-input qz-textarea"
                  name={field.name}
                  value={formData[field.name]}
                  onChange={handleChange}
                  placeholder={field.placeholder}
                />
              )}
            </div>
          ))}
        </div>

        <nav className="qz-nav">
          {step > 0 ? (
            <button className="qz-btn-back" onClick={() => goToStep(step - 1)}>
              ← Back
            </button>
          ) : (
            <div />
          )}

          <div className="qz-dots">
            {STEPS.map((_, i) => (
              <div key={i} className={`qz-dot ${i === step ? 'active' : ''}`} />
            ))}
          </div>

          {step < STEPS.length - 1 ? (
            <button className="qz-btn-next" onClick={() => goToStep(step + 1)}>
              Next →
            </button>
          ) : (
            <button className="qz-btn-next" onClick={handleSubmit}>
              Save profile ✓
            </button>
          )}
        </nav>
      </div>
    </>
  );
};

EditProfile.propTypes = {
  getCurrentProfile: PropTypes.func.isRequired,
  createProfile: PropTypes.func.isRequired,
  auth: PropTypes.object.isRequired,
  profile: PropTypes.object.isRequired
};

const mapStateToProps = state => ({
  auth: state.auth,
  profile: state.profile
});

export default connect(mapStateToProps, { getCurrentProfile, createProfile })(EditProfile);
