import { useState } from 'react';

interface NotificationsDropdownProps {
  onClose: () => void;
}

export default function NotificationsDropdown({ onClose }: NotificationsDropdownProps) {
  return (
    <div className="notifications-dropdown">
      <div className="notifications-header">
        <h3>Notifications</h3>
        <button onClick={onClose} className="close-btn">✕</button>
      </div>
      
      <div className="notifications-list">
        <p className="no-notifications">No notifications</p>
      </div>
    </div>
  );
}
