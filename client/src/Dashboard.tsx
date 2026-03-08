import { useState } from 'react';
import './Dashboard.css';
import SellPage from './components/SellPage';
import BuyPage from './components/BuyPage';
import MessagesPage from './components/MessagesPage';
import HistoryPage from './components/HistoryPage';
import ProfilePage from './components/ProfilePage';
import RequestsPage from './components/RequestsPage';
import NotificationsDropdown from './components/NotificationsDropdown';
import { AppProvider } from './context/AppContext';

interface DashboardProps {
  userName: string;
  userEmail: string;
  onLogout: () => void;
}

export default function Dashboard({ userName, userEmail, onLogout }: DashboardProps) {
  const [currentPage, setCurrentPage] = useState('home');
  const [showNotifications, setShowNotifications] = useState(false);

  const renderContent = () => {
    switch (currentPage) {
      case 'profile':
        return <ProfilePage />;
      case 'sell':
        return <SellPage />;
      case 'buy':
        return <BuyPage />;
      case 'messages':
        return <MessagesPage />;
      case 'history':
        return <HistoryPage />;
      case 'requests':
        return <RequestsPage />;
      default:
        return (
          <>
            <h1>Welcome to Campus Marketplace</h1>
            <p>Logged in as: {userName}</p>
            
            <div className="hero-section">
              <div className="hero-card sell-card">
                <div className="hero-icon">📦</div>
                <h2>Sell Your Items</h2>
                <p>List your products and reach buyers instantly</p>
                <button className="hero-btn sell-btn" onClick={() => setCurrentPage('sell')}>
                  Start Selling
                </button>
              </div>
              
              <div className="hero-card buy-card">
                <div className="hero-icon">🛒</div>
                <h2>Buy Products</h2>
                <p>Discover amazing deals from your campus</p>
                <button className="hero-btn buy-btn" onClick={() => setCurrentPage('buy')}>
                  Start Shopping
                </button>
              </div>
            </div>
          </>
        );
    }
  };

  return (
    <AppProvider userName={userName} userEmail={userEmail}>
      <div className="dashboard">
        {/* Top bar with notifications and logout */}
        <div className="top-bar">
          <div className="top-bar-right">
            <button 
              className="notification-btn"
              onClick={() => setShowNotifications(!showNotifications)}
            >
              🔔
            </button>
            {showNotifications && (
              <NotificationsDropdown onClose={() => setShowNotifications(false)} />
            )}
            <button onClick={onLogout} className="logout-btn">
              Logout
            </button>
          </div>
        </div>

        {/* Left menu */}
        <div className="left-menu">
          <button 
            className={`menu-item ${currentPage === 'home' ? 'active' : ''}`}
            onClick={() => setCurrentPage('home')}
          >
            Home
          </button>
          <button 
            className={`menu-item ${currentPage === 'profile' ? 'active' : ''}`}
            onClick={() => setCurrentPage('profile')}
          >
            Profile
          </button>
          <button 
            className={`menu-item ${currentPage === 'sell' ? 'active' : ''}`}
            onClick={() => setCurrentPage('sell')}
          >
            Sell
          </button>
          <button 
            className={`menu-item ${currentPage === 'buy' ? 'active' : ''}`}
            onClick={() => setCurrentPage('buy')}
          >
            Buy
          </button>
          <button 
            className={`menu-item ${currentPage === 'requests' ? 'active' : ''}`}
            onClick={() => setCurrentPage('requests')}
          >
            Requests
          </button>
          <button 
            className={`menu-item ${currentPage === 'messages' ? 'active' : ''}`}
            onClick={() => setCurrentPage('messages')}
          >
            Messages
          </button>
          <button 
            className={`menu-item ${currentPage === 'history' ? 'active' : ''}`}
            onClick={() => setCurrentPage('history')}
          >
            History
          </button>
        </div>

        {/* Main content */}
        <div className="main-content">
          {renderContent()}
        </div>
      </div>
    </AppProvider>
  );
}
