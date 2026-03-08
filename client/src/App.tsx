import { useState, useEffect } from 'react';
import './Auth.css';
import Dashboard from './Dashboard';

// Load users from localStorage
const loadUsers = () => {
  const saved = localStorage.getItem('campusMarketUsers');
  return saved ? JSON.parse(saved) : {};
};

// Save users to localStorage
const saveUsers = (users: { [email: string]: { name: string; password: string } }) => {
  localStorage.setItem('campusMarketUsers', JSON.stringify(users));
};

export default function App() {
  const [users, setUsers] = useState<{ [email: string]: { name: string; password: string } }>(loadUsers);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loggedInUser, setLoggedInUser] = useState('');
  const [loggedInEmail, setLoggedInEmail] = useState('');
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Check if user is already logged in (remember me)
  useEffect(() => {
    const savedUser = localStorage.getItem('rememberedUser');
    if (savedUser) {
      const { name, email } = JSON.parse(savedUser);
      setLoggedInUser(name);
      setLoggedInEmail(email);
      setIsLoggedIn(true);
    }
  }, []);

  // Save users whenever they change
  useEffect(() => {
    saveUsers(users);
  }, [users]);

  const showError = (message: string) => {
    setErrorMessage(message);
    setShowErrorModal(true);
    setTimeout(() => {
      setShowErrorModal(false);
    }, 3000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isLogin) {
      // Login validation
      const user = users[email.toLowerCase()];
      if (!user) {
        showError('Email or password is incorrect. Please try again.');
        return;
      }
      if (user.password !== password) {
        showError('Email or password is incorrect. Please try again.');
        return;
      }
      // Login successful
      setLoggedInUser(user.name);
      setLoggedInEmail(email.toLowerCase());
      
      // Save to localStorage if remember me is checked
      if (rememberMe) {
        localStorage.setItem('rememberedUser', JSON.stringify({
          name: user.name,
          email: email.toLowerCase()
        }));
      }
      
      setIsLoggedIn(true);
    } else {
      // Register validation
      if (users[email.toLowerCase()]) {
        showError('Email already registered. Please login instead.');
        return;
      }
      if (!name.trim()) {
        showError('Please enter your name');
        return;
      }
      if (password.length < 6) {
        showError('Password must be at least 6 characters long');
        return;
      }
      // Register successful
      const newUsers = { ...users, [email.toLowerCase()]: { name: name.trim(), password } };
      setUsers(newUsers);
      setSuccessMessage('Registration successful! Please login.');
      setShowSuccessModal(true);
      setTimeout(() => {
        setShowSuccessModal(false);
      }, 3000);
      setIsLogin(true);
      setPassword('');
    }
  };

  if (isLoggedIn) {
    return <Dashboard userName={loggedInUser} userEmail={loggedInEmail} onLogout={() => {
      setIsLoggedIn(false);
      setEmail('');
      setPassword('');
      setName('');
      setLoggedInEmail('');
      // Clear remember me
      localStorage.removeItem('rememberedUser');
    }} />;
  }

  return (
    <div className="auth-container">
      <div className="auth-box">
        <h2>{isLogin ? 'Login' : 'Register'}</h2>
        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <div className="form-group">
              <label>Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
          )}
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
          
          {isLogin && (
            <div className="remember-me">
              <input
                type="checkbox"
                id="remember-me"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <label htmlFor="remember-me">Remember me</label>
            </div>
          )}
          
          <button type="submit" className="btn">
            {isLogin ? 'Login' : 'Register'}
          </button>
        </form>
        <div className="toggle-auth">
          <span>{isLogin ? "Don't have an account? " : 'Already have an account? '}</span>
          <button onClick={() => {
            setIsLogin(!isLogin);
            setPassword('');
          }}>
            {isLogin ? 'Register' : 'Login'}
          </button>
        </div>
      </div>

      {showErrorModal && (
        <div className="error-modal-overlay">
          <div className="error-modal">
            <div className="error-icon">⚠</div>
            <p>{errorMessage}</p>
          </div>
        </div>
      )}

      {showSuccessModal && (
        <div className="success-modal-overlay">
          <div className="success-modal-auth">
            <div className="success-icon-auth">✓</div>
            <p>{successMessage}</p>
          </div>
        </div>
      )}
    </div>
  );
}
