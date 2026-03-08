import { useState } from 'react';
import { useApp } from '../context/AppContext';

export default function HistoryPage() {
  const { products, currentUser } = useApp();
  const [activeTab, setActiveTab] = useState<'selling' | 'sold' | 'bought'>('selling');

  // Filter products by current user
  const sellingItems = products.filter(p => p.sellerId === currentUser);
  const soldItems: any[] = []; // Will be populated when we add sold functionality
  const boughtItems: any[] = []; // Will be populated when we add bought functionality

  const formatIndianPrice = (price: string) => {
    const num = parseInt(price);
    return num.toLocaleString('en-IN');
  };

  return (
    <div>
      <h1>History</h1>
      
      <div className="history-tabs">
        <button 
          className={`tab ${activeTab === 'selling' ? 'active' : ''}`}
          onClick={() => setActiveTab('selling')}
        >
          Selling ({sellingItems.length})
        </button>
        <button 
          className={`tab ${activeTab === 'sold' ? 'active' : ''}`}
          onClick={() => setActiveTab('sold')}
        >
          Sold ({soldItems.length})
        </button>
        <button 
          className={`tab ${activeTab === 'bought' ? 'active' : ''}`}
          onClick={() => setActiveTab('bought')}
        >
          Bought ({boughtItems.length})
        </button>
      </div>

      <div className="history-content">
        {activeTab === 'selling' && (
          <div className="items-grid">
            {sellingItems.length === 0 ? (
              <p style={{ color: 'white', gridColumn: '1 / -1', textAlign: 'center', marginTop: '40px' }}>
                No items currently selling
              </p>
            ) : (
              sellingItems.map(item => (
                <div key={item.id} className="history-card">
                  <img src={item.photo} alt={item.description} className="item-image-img" />
                  <h3>{item.description.substring(0, 50)}{item.description.length > 50 ? '...' : ''}</h3>
                  <p className="item-price">₹{formatIndianPrice(item.price)}</p>
                  <p className="interested-count">0 interested buyers</p>
                  <div className="item-actions">
                    <button className="edit-btn">Edit</button>
                    <button className="delete-btn">Delete</button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'sold' && (
          <div className="items-grid">
            <p style={{ color: 'white', gridColumn: '1 / -1', textAlign: 'center', marginTop: '40px' }}>
              No items sold yet
            </p>
          </div>
        )}

        {activeTab === 'bought' && (
          <div className="items-grid">
            <p style={{ color: 'white', gridColumn: '1 / -1', textAlign: 'center', marginTop: '40px' }}>
              No items bought yet
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

