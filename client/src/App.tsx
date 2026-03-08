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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isLogin) {
      // Login validation
      const user = users[email.toLowerCase()];
      if (!user) {
        alert('Email not registered. Please register first.');
        return;
      }
      if (user.password !== password) {
        alert('Incorrect password. Please try again.');
        return;
      }
      // Login successful
      setLoggedInUser(user.name);
      setIsLoggedIn(true);
    } else {
      // Register validation
      if (users[email.toLowerCase()]) {
        alert('Email already registered. Please login instead.');
        return;
      }
      if (!name.trim()) {
        alert('Please enter your name');
        return;
      }
      if (password.length < 6) {
        alert('Password must be at least 6 characters long');
        return;
      }
      // Register successful
      users[email.toLowerCase()] = { name: name.trim(), password };
      alert('Registration successful! Please login.');
      setIsLogin(true);
      setPassword('');
    }
  };

  if (isLoggedIn) {
    return <Dashboard userName={loggedInUser} onLogout={() => {
      setIsLoggedIn(false);
      setEmail('');
      setPassword('');
      setName('');
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
    </div>
  );
}
