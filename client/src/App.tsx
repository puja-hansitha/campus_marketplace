import { useState, useEffect } from 'react';
import './Auth.css';
import Dashboard from './Dashboard';
import { auth, db } from './firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut, setPersistence, browserLocalPersistence, browserSessionPersistence, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loggedInUser, setLoggedInUser] = useState('');
  const [loggedInEmail, setLoggedInEmail] = useState('');
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [rememberMe, setRememberMe] = useState(false);

  // Check if user is already logged in
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // If signed in via Google, enforce college email restriction
        const isGoogleUser = user.providerData.some(p => p.providerId === 'google.com');
        if (isGoogleUser && !user.email?.endsWith('@bvrithyderabad.edu.in')) {
          await signOut(auth);
          setLoading(false);
          return;
        }
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setLoggedInUser(userData.name);
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
    setTimeout(() => {
      setShowErrorModal(false);
    }, 3000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isLogin) {
      try {
        await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setLoggedInUser(userData.name);
          setLoggedInEmail(email);
          setIsLoggedIn(true);
        }
      } catch (error: any) {
        showError(error.code === 'auth/invalid-credential' ? 'Invalid email or password' : error.message);
      }
    } else {
      // Register with Firebase
      if (!name.trim()) {
        showError('Please enter your name');
        return;
      }
      if (password.length < 6) {
        showError('Password must be at least 6 characters long');
        return;
      }
      
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        // Save user profile to Firestore
        await setDoc(doc(db, 'users', userCredential.user.uid), {
          name: name.trim(),
          email: email,
          createdAt: Date.now()
        });
        
        setSuccessMessage('Registration successful! Please login.');
        setShowSuccessModal(true);
        setTimeout(() => {
          setShowSuccessModal(false);
        }, 3000);
        setIsLogin(true);
        setPassword('');
      } catch (error: any) {
        showError(error.code === 'auth/email-already-in-use' ? 'Email already registered' : error.message);
      }
    }
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
      setLoggedInUser(userDoc.exists() ? userDoc.data().name : (user.displayName || user.email || ''));
      setLoggedInEmail(user.email || '');
      setIsLoggedIn(true);
    } catch (error: any) {
      if (error.code !== 'auth/popup-closed-by-user') showError(error.message);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setIsLoggedIn(false);
    setEmail('');
    setPassword('');
    setName('');
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
