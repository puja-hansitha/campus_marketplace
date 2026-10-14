import { useState, useRef } from 'react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { updateProfile } from 'firebase/auth';
import { doc, updateDoc, collection, query, where, getDocs, writeBatch } from 'firebase/firestore';
import { storage, db, auth } from '../firebase';
import { useApp } from '../context/AppContext';
import type { UserProfile } from '../App';

export default function ProfilePage({ onProfileUpdate }: { onProfileUpdate: (u: Partial<UserProfile>) => void }) {
  const { currentUser } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName]         = useState(currentUser.name);
  const [preview, setPreview]   = useState<string | null>(currentUser.photoURL);
  const [file, setFile]         = useState<File | null>(null);
  const [saving, setSaving]     = useState(false);
  const [toast, setToast]       = useState('');
  const [error, setError]       = useState('');

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) { setError('Photo must be under 5 MB.'); return; }
    setFile(f);
    setError('');
    const reader = new FileReader();
    reader.onload = ev => setPreview(ev.target?.result as string);
    reader.readAsDataURL(f);
  };

  const handleSave = async () => {
    if (!name.trim() || name.trim().length < 2) {
      setError('Name must be at least 2 characters.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      let photoURL = currentUser.photoURL;

      // Upload new photo if selected
      if (file) {
        const storageRef = ref(storage, `avatars/${currentUser.uid}`);
        await uploadBytes(storageRef, file, { contentType: file.type });
        photoURL = await getDownloadURL(storageRef);
      }

      const trimmedName = name.trim();

      // Update Firebase Auth profile
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, {
          displayName: trimmedName,
          photoURL: photoURL ?? undefined,
        });
      }

      // Update Firestore user doc
      await updateDoc(doc(db, 'users', currentUser.uid), {
        name:     trimmedName,
        photoURL: photoURL,
      });

      // Propagate name change across products, interests, messages (batch)
      const batch = writeBatch(db);
      let opCount = 0;

      const flush = async () => {
        if (opCount > 0) { await batch.commit(); opCount = 0; }
      };

      // Products (sellerName)
      const productSnap = await getDocs(query(collection(db, 'products'), where('sellerId', '==', currentUser.uid)));
      productSnap.docs.forEach(d => { batch.update(d.ref, { sellerName: trimmedName, sellerPhoto: photoURL }); opCount++; });

      // Interests (buyerName)
      const interestSnap = await getDocs(query(collection(db, 'interests'), where('buyerId', '==', currentUser.uid)));
      interestSnap.docs.forEach(d => { batch.update(d.ref, { buyerName: trimmedName }); opCount++; });

      // Messages (senderName)
      const msgSnap = await getDocs(query(collection(db, 'messages'), where('senderId', '==', currentUser.uid)));
      msgSnap.docs.forEach(d => { batch.update(d.ref, { senderName: trimmedName }); opCount++; });

      await flush();

      // Update parent state (App.tsx)
      onProfileUpdate({ name: trimmedName, photoURL });

      setFile(null);
      showToast('Profile updated successfully!');
    } catch (err: any) {
      setError('Failed to save: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const initials = currentUser.name.charAt(0).toUpperCase();

  return (
    <div className="max-w-lg mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Profile</h1>
        <p className="text-sm text-gray-500 mt-1">Update your name and photo.</p>
      </div>

      <div className="card p-6 space-y-6">
        {/* Avatar */}
        <div className="flex flex-col items-center gap-3">
          <div
            className="relative w-24 h-24 cursor-pointer group"
            onClick={() => fileInputRef.current?.click()}
          >
            {preview ? (
              <img src={preview} alt="avatar" className="w-24 h-24 rounded-full object-cover ring-4 ring-brand-100" />
            ) : (
              <div className="w-24 h-24 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-3xl font-bold ring-4 ring-brand-50">
                {initials}
              </div>
            )}
            <div className="absolute inset-0 rounded-full bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="text-white text-2xl">📷</span>
            </div>
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="text-sm text-brand-600 font-medium hover:text-brand-700"
          >
            Change photo
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            className="hidden"
            onChange={handleFile}
          />
        </div>

        {/* Name */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-2">Full Name</label>
          <input
            className="input"
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Your full name"
          />
        </div>

        {/* Email (read-only) */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-2">Email</label>
          <input
            className="input bg-gray-50 cursor-not-allowed opacity-70"
            type="email"
            value={currentUser.email}
            disabled
          />
          <p className="text-xs text-gray-400 mt-1">Email cannot be changed.</p>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
            ⚠️ {error}
          </div>
        )}

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary w-full py-3"
        >
          {saving ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Saving…
            </span>
          ) : 'Save Changes'}
        </button>
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-sm font-medium px-5 py-3 rounded-2xl shadow-xl z-50">
          {toast}
        </div>
      )}
    </div>
  );
}
