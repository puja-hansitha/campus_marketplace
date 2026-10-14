import { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import Auth from './Auth';
import Dashboard from './Dashboard';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  photoURL: string | null;
}

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Load extra profile data from Firestore (name may differ from Google displayName)
        try {
          const snap = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (snap.exists()) {
            const data = snap.data();
            setUser({
              uid:      firebaseUser.uid,
              name:     data.name || firebaseUser.displayName || 'User',
              email:    firebaseUser.email || '',
              photoURL: data.photoURL || firebaseUser.photoURL || null,
            });
          } else {
            // Edge case: auth exists but no Firestore doc yet (race condition on first Google login)
            setUser({
              uid:      firebaseUser.uid,
              name:     firebaseUser.displayName || 'User',
              email:    firebaseUser.email || '',
              photoURL: firebaseUser.photoURL || null,
            });
          }
        } catch {
          setUser({
            uid:      firebaseUser.uid,
            name:     firebaseUser.displayName || 'User',
            email:    firebaseUser.email || '',
            photoURL: null,
          });
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    setUser(null);
  };

  const handleProfileUpdate = (updates: Partial<UserProfile>) => {
    setUser(prev => prev ? { ...prev, ...updates } : prev);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-50 to-green-100">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-brand-700 font-semibold">Loading…</p>
        </div>
      </div>
    );
  }

  if (!user) return <Auth />;

  return (
    <Dashboard
      user={user}
      onLogout={handleLogout}
      onProfileUpdate={handleProfileUpdate}
    />
  );
}
