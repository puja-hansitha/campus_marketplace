import { useState } from 'react';

export default function HistoryPage() {
  const [activeTab, setActiveTab] = useState<'selling' | 'sold' | 'bought'>('selling');

  return (
    <div>
      <h1>History</h1>
      
      <div className="history-tabs">
        <button 
          className={`tab ${activeTab === 'selling' ? 'active' : ''}`}
          onClick={() => setActiveTab('selling')}
        >
          Selling (0)
        </button>
        <button 
          className={`tab ${activeTab === 'sold' ? 'active' : ''}`}
          onClick={() => setActiveTab('sold')}
        >
          Sold (0)
        </button>
        <button 
          className={`tab ${activeTab === 'bought' ? 'active' : ''}`}
          onClick={() => setActiveTab('bought')}
        >
          Bought (0)
        </button>
      </div>

      <div className="history-content">
        <div className="items-grid">
          <p style={{ color: 'white', gridColumn: '1 / -1', textAlign: 'center', marginTop: '40px' }}>
            {activeTab === 'selling' && 'No items currently selling'}
            {activeTab === 'sold' && 'No items sold yet'}
            {activeTab === 'bought' && 'No items bought yet'}
          </p>
        </div>
      </div>
    </div>
  );
}
