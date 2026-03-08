import { useState } from 'react';

export default function ProfilePage({ userName }: { userName: string }) {
  const [name, setName] = useState(userName);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);

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

  const handleSave = () => {
    alert('Profile updated successfully!');
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
      </div>
    </div>
  );
}
