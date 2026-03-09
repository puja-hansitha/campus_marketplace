import { useState } from 'react';
import confetti from 'canvas-confetti';
import { useApp } from '../context/AppContext';
import { cleanupAllInterests } from '../cleanupInterests';

export default function ProfilePage() {
  const { userName: currentUserName, userPhoto: currentUserPhoto, updateUserProfile } = useApp();
  const [name, setName] = useState(currentUserName);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(currentUserPhoto);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setProfilePhoto(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerConfetti = () => {
    const duration = 3000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 5,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#667eea', '#764ba2', '#f093fb', '#f5576c']
      });
      confetti({
        particleCount: 5,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#667eea', '#764ba2', '#f093fb', '#f5576c']
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();
  };

  const handleSave = () => {
    if (!name.trim()) {
      alert('Name cannot be empty');
      return;
    }

    // Check if anything changed
    if (name.trim() === currentUserName && profilePhoto === currentUserPhoto) {
      alert('No changes made to save');
      return;
    }

    // Update profile in context
    updateUserProfile(name.trim(), profilePhoto);

    // Trigger confetti
    triggerConfetti();

    // Show success modal
    setShowSuccessModal(true);

    // Hide modal after 3 seconds
    setTimeout(() => {
      setShowSuccessModal(false);
    }, 3000);
  };

  return (
    <div>
      <h1>Profile</h1>
      
      <div className="profile-form">
        <div className="profile-photo-section">
          <div className="profile-photo">
            {profilePhoto ? (
              <img src={profilePhoto} alt="Profile" />
            ) : (
              <div className="default-avatar">👤</div>
            )}
          </div>
          <input 
            type="file" 
            id="profile-photo-input" 
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handlePhotoChange}
          />
          <label htmlFor="profile-photo-input" className="change-photo-btn">
            Change Photo
          </label>
        </div>

        <div className="form-group">
          <label>Name</label>
          <input 
            type="text" 
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <button className="save-btn" onClick={handleSave}>Save Changes</button>

        <div style={{ marginTop: '30px', padding: '20px', background: 'rgba(255,255,255,0.1)', borderRadius: '10px' }}>
          <h3 style={{ color: 'white', marginBottom: '10px' }}>Admin: Clear All Requests</h3>
          <p style={{ color: '#ccc', fontSize: '14px', marginBottom: '10px' }}>
            This will delete all buyer requests from the database. Use this to fix duplicate/wrong data.
          </p>
          <button 
            className="delete-btn" 
            onClick={cleanupAllInterests}
            style={{ width: 'auto', padding: '10px 20px' }}
          >
            Clear All Requests
          </button>
        </div>
      </div>

      {showSuccessModal && (
        <div className="success-modal-overlay">
          <div className="success-modal">
            <div className="success-icon">✓</div>
            <h2>Profile Updated Successfully!</h2>
            <p>Your changes have been saved</p>
          </div>
        </div>
      )}
    </div>
  );
}
