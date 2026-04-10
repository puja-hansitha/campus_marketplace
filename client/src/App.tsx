import { useState, useEffect, useRef } from 'react';
import './Auth.css';
import Dashboard from './Dashboard';
import { auth, db } from './firebase';
import { onAuthStateChanged, signOut, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loggedInUser, setLoggedInUser] = useState('');
  const [loggedInEmail, setLoggedInEmail] = useState('');
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const handledByGoogle = useRef(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Already handled by handleGoogleLogin — skip double Firestore read
        if (handledByGoogle.current) {
          setLoading(false);
          return;
        }
        const isGoogleUser = user.providerData.some(p => p.providerId === 'google.com');
        if (isGoogleUser && !user.email?.endsWith('@bvrithyderabad.edu.in')) {
          await signOut(auth);
          setLoading(false);
          return;
        }
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          setLoggedInUser(userDoc.data().name);
          setLoggedInEmail(user.email || '');
          setIsLoggedIn(true);
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const showError = (message: string) => {
    setErrorMessage(message);
    setShowErrorModal(true);
    setTimeout(() => setShowErrorModal(false), 3000);
  };

  const handleGoogleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      if (!user.email?.endsWith('@bvrithyderabad.edu.in')) {
        await signOut(auth);
        showError('Access restricted to @bvrithyderabad.edu.in accounts only.');
        return;
      }

      const userRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userRef);
      if (!userDoc.exists()) {
        await setDoc(userRef, {
          name: user.displayName || user.email,
          email: user.email,
          createdAt: Date.now()
        });
      }
      handledByGoogle.current = true;
      setLoggedInUser(userDoc.exists() ? userDoc.data().name : (user.displayName || user.email || ''));
      setLoggedInEmail(user.email || '');
      setIsLoggedIn(true);
    } catch (error: any) {
      if (error.code !== 'auth/popup-closed-by-user') showError(error.message);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    handledByGoogle.current = false;
    setIsLoggedIn(false);
    setLoggedInEmail('');
  };

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      <h2 style={{ color: 'white' }}>Loading...</h2>
    </div>;
  }

  if (isLoggedIn) {
    return <Dashboard userName={loggedInUser} userEmail={loggedInEmail} onLogout={handleLogout} />;
  }

  return (
    <div className="auth-container">
      <div className="auth-box">
        <h2>Campus Marketplace</h2>
        <p style={{ textAlign: 'center', color: '#666', marginBottom: '30px', fontSize: '15px' }}>
          Sign in with your college account to continue
        </p>
        <button onClick={handleGoogleLogin} style={{
          width: '100%', padding: '14px', border: '2px solid #e0e0e0', borderRadius: '10px',
          background: 'white', fontSize: '15px', fontWeight: '600', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
          transition: 'all 0.3s', color: '#333'
        }}>
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" width="20" alt="Google" />
          Continue with Google
        </button>
        <p style={{ textAlign: 'center', color: '#999', fontSize: '12px', marginTop: '20px' }}>
          Only @bvrithyderabad.edu.in accounts are allowed
        </p>
      </div>

      {showErrorModal && (
        <div className="error-modal-overlay">
          <div className="error-modal">
            <div className="error-icon">⚠</div>
            <p>{errorMessage}</p>
          </div>
        </div>
      )}
    </div>
  );
}
