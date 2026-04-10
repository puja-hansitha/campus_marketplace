import { useState, useCallback } from 'react';
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
  const [unreadCount, setUnreadCount] = useState(0);
  const [navigationData, setNavigationData] = useState<any>(null);

  const handleNotificationClick = () => {
    setShowNotifications(!showNotifications);
  };

  const handleNavigateFromNotification = useCallback((page: string, data?: any) => {
    setCurrentPage(page);
    setNavigationData(data);
    setShowNotifications(false);
  }, []);

  const handleCountChange = useCallback((count: number) => {
    setUnreadCount(count);
  }, []);

  const renderContent = () => {
    switch (currentPage) {
      case 'profile':
        return <ProfilePage />;
      case 'sell':
        return <SellPage />;
      case 'buy':
        return <BuyPage onNavigateToMessages={() => setCurrentPage('messages')} />;
      case 'messages':
        return <MessagesPage navigationData={navigationData} />;
      case 'history':
        return <HistoryPage />;
      case 'requests':
        return <RequestsPage navigationData={navigationData} />;
      default:
        return (
          <>
            <h1>Welcome, {userName}!</h1>
            <p>Logged in as: {userName}</p>
            <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '14px', marginTop: '-40px', marginBottom: '50px' }}>{userEmail}</p>
            
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
          <div className="top-bar-brand">🎓 Campus Marketplace</div>
          <div className="top-bar-right">
            <button 
              className="notification-btn"
              onClick={handleNotificationClick}
            >
              🔔
              {unreadCount > 0 && (
                <span className="notification-badge">{unreadCount}</span>
              )}
            </button>
            {/* Always mount NotificationsDropdown to track count, but hide when closed */}
            <div style={{ display: showNotifications ? 'block' : 'none' }}>
              <NotificationsDropdown 
                onClose={() => setShowNotifications(false)}
                onCountChange={handleCountChange}
                onNavigate={handleNavigateFromNotification}
              />
            </div>
            <button onClick={onLogout} className="logout-btn">
              Logout
            </button>
          </div>
        </div>

        {/* Left menu */}
        <div className="left-menu">
          <button className={`menu-item ${currentPage === 'home' ? 'active' : ''}`} onClick={() => setCurrentPage('home')}>🏠 Home</button>
          <button className={`menu-item ${currentPage === 'profile' ? 'active' : ''}`} onClick={() => setCurrentPage('profile')}>👤 Profile</button>
          <button className={`menu-item ${currentPage === 'sell' ? 'active' : ''}`} onClick={() => setCurrentPage('sell')}>📦 Sell</button>
          <button className={`menu-item ${currentPage === 'buy' ? 'active' : ''}`} onClick={() => setCurrentPage('buy')}>🛒 Buy</button>
          <button className={`menu-item ${currentPage === 'requests' ? 'active' : ''}`} onClick={() => setCurrentPage('requests')}>📋 Requests</button>
          <button className={`menu-item ${currentPage === 'messages' ? 'active' : ''}`} onClick={() => setCurrentPage('messages')}>💬 Messages</button>
          <button className={`menu-item ${currentPage === 'history' ? 'active' : ''}`} onClick={() => setCurrentPage('history')}>📊 History</button>
        </div>

        {/* Main content */}
        <div className="main-content">
          {renderContent()}
        </div>
      </div>
    </AppProvider>
  );
}
