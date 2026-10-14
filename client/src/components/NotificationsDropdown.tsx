import { useState, useEffect, useRef } from 'react';
import { collection, query, where, onSnapshot, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useApp } from '../context/AppContext';
import type { AppNotification } from '../context/AppContext';

interface Props {
  onCountChange: (count: number) => void;
  onNavigate: (page: string, data?: any) => void;
  onClose: () => void;
}

const ICONS: Record<AppNotification['type'], string> = {
  interest: '🛒',
  message:  '💬',
  sold:     '🎉',
  declined: '😔',
  deleted:  '🗑️',
};

function timeAgo(ts: number) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60)  return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60)  return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function NotificationsDropdown({ onCountChange, onNavigate, onClose }: Props) {
  const { currentUser } = useApp();
  const [notifs, setNotifs] = useState<AppNotification[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  // Real-time notifications
  useEffect(() => {
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const q = query(
      collection(db, 'notifications'),
      where('recipientId', '==', currentUser.uid)
    );
    return onSnapshot(q, (snap) => {
      const items: AppNotification[] = [];
      snap.docs.forEach(d => {
        const data = d.data() as Omit<AppNotification, 'id'>;
        // Auto-delete notifications older than 7 days
        if (data.createdAt < sevenDaysAgo) {
          deleteDoc(doc(db, 'notifications', d.id));
        } else {
          items.push({ id: d.id, ...data });
        }
      });
      items.sort((a, b) => b.createdAt - a.createdAt);
      setNotifs(items);
      onCountChange(items.filter(n => !n.isRead).length);
    });
  }, [currentUser.uid, onCountChange]);

  const markRead = async (id: string) => {
    await updateDoc(doc(db, 'notifications', id), { isRead: true });
  };

  const markAllRead = async () => {
    await Promise.all(
      notifs.filter(n => !n.isRead).map(n => updateDoc(doc(db, 'notifications', n.id), { isRead: true }))
    );
  };

  const deleteNotif = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await deleteDoc(doc(db, 'notifications', id));
  };

  const handleClick = async (notif: AppNotification) => {
    if (!notif.isRead) await markRead(notif.id);
    if (notif.type === 'message') {
      onNavigate('messages', { productId: notif.productId, senderId: notif.senderId, senderName: notif.senderName });
    } else if (notif.type === 'interest') {
      onNavigate('requests', { productId: notif.productId });
    } else if (notif.type === 'sold' || notif.type === 'declined') {
      onNavigate('history');
    }
    onClose();
  };

  const unreadCount = notifs.filter(n => !n.isRead).length;

  return (
    <div
      ref={dropdownRef}
      className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-gray-900 text-sm">Notifications</h3>
          {unreadCount > 0 && (
            <span className="badge bg-brand-100 text-brand-700">{unreadCount} new</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {unreadCount > 0 && (
            <button onClick={markAllRead} className="text-xs text-brand-600 hover:text-brand-700 font-medium px-2 py-1 rounded-lg hover:bg-brand-50">
              Mark all read
            </button>
          )}
          <button onClick={onClose} className="btn-ghost p-1.5 text-gray-400">✕</button>
        </div>
      </div>

      {/* List */}
      <div className="max-h-96 overflow-y-auto divide-y divide-gray-50">
        {notifs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <span className="text-3xl mb-2">🔔</span>
            <p className="text-sm">No notifications yet</p>
          </div>
        ) : (
          notifs.map(n => (
            <div
              key={n.id}
              onClick={() => handleClick(n)}
              className={`flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors group ${!n.isRead ? 'bg-brand-50' : ''}`}
            >
              <span className="text-xl mt-0.5 flex-shrink-0">{ICONS[n.type]}</span>
              <div className="flex-1 min-w-0">
                <p className={`text-sm leading-snug ${!n.isRead ? 'text-gray-900 font-medium' : 'text-gray-600'}`}>
                  {n.message}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">{timeAgo(n.createdAt)}</p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {!n.isRead && <span className="w-2 h-2 bg-brand-500 rounded-full" />}
                <button
                  onClick={(e) => deleteNotif(e, n.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 rounded transition-all"
                  title="Delete"
                >
                  ✕
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
