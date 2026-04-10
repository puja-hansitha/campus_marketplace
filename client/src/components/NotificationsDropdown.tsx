import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { collection, query, where, onSnapshot, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';

interface NotificationsDropdownProps {
  onClose: () => void;
  onCountChange: (count: number) => void;
  onNavigate: (page: string, data?: any) => void;
}

interface Notification {
  id: string;
  type: 'interest' | 'sold' | 'message';
  message: string;
  createdAt: number;
  productId?: string;
  userId?: string;
  userName?: string;
  isRead?: boolean;
  recipientId: string;
}

export default function NotificationsDropdown({ onClose, onCountChange, onNavigate }: NotificationsDropdownProps) {
  const { currentUser } = useApp();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Count only unread notifications
  useEffect(() => {
    const unreadCount = notifications.filter(n => !n.isRead).length;
    onCountChange(unreadCount);
  }, [notifications]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load notifications from Firestore
  useEffect(() => {
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    
    const q = query(
      collection(db, 'notifications'),
      where('recipientId', '==', currentUser)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs: Notification[] = [];
      const deletePromises: Promise<void>[] = [];

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        
        // Delete if older than 7 days
        if (data.createdAt < sevenDaysAgo) {
          deletePromises.push(deleteDoc(doc(db, 'notifications', docSnap.id)));
        } else {
          notifs.push({ id: docSnap.id, ...data } as Notification);
        }
      });

      // Execute deletions
      if (deletePromises.length > 0) {
        Promise.all(deletePromises).catch(err => console.error('Error deleting old notifications:', err));
      }

      notifs.sort((a, b) => b.createdAt - a.createdAt);
      setNotifications(notifs);
    });

    return () => unsubscribe();
  }, [currentUser]);

  const handleNotificationClick = async (notif: Notification) => {
    // Mark as read
    await updateDoc(doc(db, 'notifications', notif.id), { isRead: true });
    
    if (notif.type === 'message') {
      onNavigate('messages', {
        productId: notif.productId,
        userId: notif.userId,
        userName: notif.userName
      });
    } else if (notif.type === 'interest') {
      onNavigate('requests', {
        productId: notif.productId
      });
    }
    onClose();
  };

  const handleMarkAsRead = async (notifId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await updateDoc(doc(db, 'notifications', notifId), { isRead: true });
  };

  const handleMarkAllAsRead = async () => {
    const unreadNotifs = notifications.filter(n => !n.isRead);
    const updatePromises = unreadNotifs.map(n => 
      updateDoc(doc(db, 'notifications', n.id), { isRead: true })
    );
    await Promise.all(updatePromises);
  };

  return (
    <div className="notifications-dropdown">
      <div className="notifications-header">
        <h3>Notifications</h3>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {notifications.some(n => !n.isRead) && (
            <button onClick={handleMarkAllAsRead} className="mark-all-read-btn">
              Mark all as read
            </button>
          )}
          <button onClick={onClose} className="close-btn">✕</button>
        </div>
      </div>
      
      <div className="notifications-list">
        {notifications.length === 0 ? (
          <p className="no-notifications">No notifications</p>
        ) : (
          notifications.map(notif => (
            <div 
              key={notif.id} 
              className={`notification-item ${notif.isRead ? 'read' : 'unread'}`}
              onClick={() => handleNotificationClick(notif)}
            >
              <span className={`notif-icon ${notif.type}`}>
                {notif.type === 'interest' ? '🛒' : notif.type === 'message' ? '💬' : '✅'}
              </span>
              <div className="notif-content">
                <p>{notif.message}</p>
                <span className="notif-time">{getTimeAgo(notif.createdAt)}</span>
              </div>
              {!notif.isRead && (
                <button 
                  className="mark-read-btn"
                  onClick={(e) => handleMarkAsRead(notif.id, e)}
                  title="Mark as read"
                >
                  ✓
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function getTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
