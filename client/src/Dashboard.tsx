import { useState, useCallback } from 'react';
import { AppProvider } from './context/AppContext';
import type { UserProfile } from './App';
import SellPage from './components/SellPage';
import BuyPage from './components/BuyPage';
import RequestsPage from './components/RequestsPage';
import MessagesPage from './components/MessagesPage';
import HistoryPage from './components/HistoryPage';
import ProfilePage from './components/ProfilePage';
import NotificationsDropdown from './components/NotificationsDropdown';

type Page = 'home' | 'sell' | 'buy' | 'requests' | 'messages' | 'history' | 'profile';

interface NavItem {
  id: Page;
  label: string;
  icon: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'home',     label: 'Home',     icon: '🏠' },
  { id: 'sell',     label: 'Sell',     icon: '📦' },
  { id: 'buy',      label: 'Buy',      icon: '🛒' },
  { id: 'requests', label: 'Requests', icon: '📋' },
  { id: 'messages', label: 'Messages', icon: '💬' },
  { id: 'history',  label: 'History',  icon: '📊' },
  { id: 'profile',  label: 'Profile',  icon: '👤' },
];

interface Props {
  user: UserProfile;
  onLogout: () => void;
  onProfileUpdate: (updates: Partial<UserProfile>) => void;
}

export default function Dashboard({ user, onLogout, onProfileUpdate }: Props) {
  const [page, setPage]                     = useState<Page>('home');
  const [navData, setNavData]               = useState<any>(null);
  const [showNotifs, setShowNotifs]         = useState(false);
  const [unreadCount, setUnreadCount]       = useState(0);
  const [sidebarOpen, setSidebarOpen]       = useState(false);

  const navigate = useCallback((target: string, data?: any) => {
    setPage(target as Page);
    setNavData(data ?? null);
    setSidebarOpen(false);
  }, []);

  const handleCountChange = useCallback((c: number) => setUnreadCount(c), []);

  const renderPage = () => {
    switch (page) {
      case 'sell':     return <SellPage />;
      case 'buy':      return <BuyPage onNavigateToMessages={() => navigate('messages')} />;
      case 'requests': return <RequestsPage navData={navData} onNavigateToMessages={() => navigate('messages')} />;
      case 'messages': return <MessagesPage navData={navData} />;
      case 'history':  return <HistoryPage />;
      case 'profile':  return <ProfilePage onProfileUpdate={onProfileUpdate} />;
      default:         return <HomePage user={user} onNavigate={navigate} />;
    }
  };

  return (
    <AppProvider currentUser={user}>
      <div className="flex h-screen bg-gray-50 overflow-hidden">

        {/* ── Mobile overlay ── */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/40 z-30 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* ── Sidebar ── */}
        <aside className={`
          fixed lg:static inset-y-0 left-0 z-40
          w-60 bg-white border-r border-gray-100 flex flex-col
          transform transition-transform duration-200
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}>
          {/* Brand */}
          <div className="flex items-center gap-3 px-5 py-5 border-b border-gray-100">
            <div className="w-9 h-9 bg-brand-600 rounded-xl flex items-center justify-center text-lg">🎓</div>
            <div>
              <p className="text-sm font-bold text-gray-900 leading-none">Campus</p>
              <p className="text-xs text-brand-600 font-semibold">Marketplace</p>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
            {NAV_ITEMS.map(item => (
              <button
                key={item.id}
                onClick={() => { navigate(item.id); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                  page === item.id
                    ? 'bg-brand-50 text-brand-700 font-semibold'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <span className="text-base">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </nav>

          {/* User footer */}
          <div className="px-3 pb-4 border-t border-gray-100 pt-3">
            <button
              onClick={() => navigate('profile')}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors"
            >
              {user.photoURL ? (
                <img src={user.photoURL} alt="avatar" className="w-8 h-8 rounded-full object-cover" />
              ) : (
                <div className="w-8 h-8 bg-brand-100 text-brand-700 rounded-full flex items-center justify-center text-sm font-bold">
                  {user.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="text-left min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{user.name}</p>
                <p className="text-xs text-gray-400 truncate">{user.email}</p>
              </div>
            </button>
          </div>
        </aside>

        {/* ── Main ── */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

          {/* Topbar */}
          <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between flex-shrink-0">
            {/* Mobile hamburger */}
            <button
              className="lg:hidden btn-ghost p-2 -ml-1"
              onClick={() => setSidebarOpen(true)}
            >
              <span className="text-xl">☰</span>
            </button>

            {/* Page title */}
            <h2 className="text-sm font-semibold text-gray-700 hidden lg:block">
              {NAV_ITEMS.find(n => n.id === page)?.label ?? 'Home'}
            </h2>

            {/* Right side */}
            <div className="flex items-center gap-2 ml-auto relative">
              {/* Notifications bell */}
              <div className="relative">
                <button
                  onClick={() => setShowNotifs(v => !v)}
                  className="btn-ghost p-2 relative"
                >
                  <span className="text-lg">🔔</span>
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </button>
                {showNotifs && (
                  <NotificationsDropdown
                    onCountChange={handleCountChange}
                    onNavigate={navigate}
                    onClose={() => setShowNotifs(false)}
                  />
                )}
              </div>

              {/* Logout */}
              <button onClick={onLogout} className="btn-secondary text-xs px-3 py-2">
                Sign out
              </button>
            </div>
          </header>

          {/* Page content */}
          <main className="flex-1 overflow-y-auto p-4 lg:p-6">
            {renderPage()}
          </main>
        </div>
      </div>
    </AppProvider>
  );
}

/* ── Home Page ───────────────────────────────────────────────────────────────── */

function HomePage({ user, onNavigate }: { user: UserProfile; onNavigate: (page: string) => void }) {
  return (
    <div className="max-w-3xl mx-auto">
      {/* Greeting */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Hey, {user.name.split(' ')[0]} 👋
        </h1>
        <p className="text-gray-500 text-sm mt-1">What do you want to do today?</p>
      </div>

      {/* Action cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <button
          onClick={() => onNavigate('sell')}
          className="card p-6 text-left hover:shadow-md hover:border-brand-200 transition-all duration-200 group"
        >
          <div className="w-12 h-12 bg-brand-100 rounded-2xl flex items-center justify-center text-2xl mb-4 group-hover:bg-brand-200 transition-colors">
            📦
          </div>
          <h3 className="font-bold text-gray-900 mb-1">Sell an Item</h3>
          <p className="text-sm text-gray-500">List your product and reach campus buyers instantly.</p>
        </button>

        <button
          onClick={() => onNavigate('buy')}
          className="card p-6 text-left hover:shadow-md hover:border-brand-200 transition-all duration-200 group"
        >
          <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center text-2xl mb-4 group-hover:bg-blue-200 transition-colors">
            🛒
          </div>
          <h3 className="font-bold text-gray-900 mb-1">Browse Products</h3>
          <p className="text-sm text-gray-500">Find great deals from fellow students on campus.</p>
        </button>
      </div>

      {/* Quick links */}
      <div className="card p-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Quick Access</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { page: 'requests', icon: '📋', label: 'Requests' },
            { page: 'messages', icon: '💬', label: 'Messages' },
            { page: 'history',  icon: '📊', label: 'History'  },
            { page: 'profile',  icon: '👤', label: 'Profile'  },
          ].map(({ page, icon, label }) => (
            <button
              key={page}
              onClick={() => onNavigate(page)}
              className="flex flex-col items-center gap-1.5 p-3 rounded-xl hover:bg-gray-50 transition-colors"
            >
              <span className="text-2xl">{icon}</span>
              <span className="text-xs font-medium text-gray-600">{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
