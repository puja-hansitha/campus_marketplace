import { useState } from 'react';
import './Auth.css';
import Dashboard from './Dashboard';

// Simple in-memory user storage (will be replaced with Firebase later)
const users: { [email: string]: { name: string; password: string } } = {};

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
      users[email.toLowerCase()] = { name: name.trim(), password };
      showError('Registration successful! Please login.');
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
    </div>
  );
}
