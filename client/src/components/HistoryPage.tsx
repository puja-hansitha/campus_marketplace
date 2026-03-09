import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

export default function HistoryPage() {
  const { products, currentUser, deleteProduct, updateProduct } = useApp();
  const [activeTab, setActiveTab] = useState<'selling' | 'sold' | 'bought'>('selling');
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ description: '', price: '', category: '' });
  const [interests, setInterests] = useState<any[]>([]);

  // Filter products by current user
  const sellingItems = products.filter(p => p.sellerId === currentUser);
  const soldItems: any[] = []; // Will be populated when we add sold functionality
  const boughtItems: any[] = []; // Will be populated when we add bought functionality

  // Listen to interests for seller's products
  useEffect(() => {
    if (sellingItems.length === 0) return;

    const productIds = sellingItems.map(p => p.id);
    if (productIds.length === 0) return;

    const q = query(
      collection(db, 'interests'),
      where('productId', 'in', productIds.slice(0, 10))
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const interestsData: any[] = [];
      snapshot.forEach((doc) => {
        interestsData.push({ id: doc.id, ...doc.data() });
      });
      setInterests(interestsData);
    });

    return () => unsubscribe();
  }, [sellingItems.length]);

  const getInterestedCount = (productId: string) => {
    return interests.filter(i => i.productId === productId).length;
  };

  const formatIndianPrice = (price: string) => {
    const num = parseInt(price);
    return num.toLocaleString('en-IN');
  };

  const handleEdit = (item: any) => {
    setEditingItem(item.id);
    setEditForm({ description: item.description, price: item.price, category: item.category });
  };

  const handleSaveEdit = async (itemId: string) => {
    if (!editForm.description.trim()) {
      alert('Description cannot be empty');
      return;
    }
    if (!editForm.price || parseInt(editForm.price) <= 0) {
      alert('Please enter a valid price');
      return;
    }
    
    console.log('Saving edit for:', itemId, editForm);
    await updateProduct(itemId, editForm);
    setEditingItem(null);
  };

  const handleDelete = async (itemId: string) => {
    console.log('Attempting to delete:', itemId);
    if (window.confirm('Are you sure you want to delete this item?')) {
      await deleteProduct(itemId);
    }
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
                  {editingItem === item.id ? (
                    <>
                      <input 
                        type="text" 
                        value={editForm.description} 
                        onChange={(e) => setEditForm({...editForm, description: e.target.value})}
                        style={{ width: '100%', padding: '8px', marginBottom: '8px' }}
                      />
                      <input 
                        type="text" 
                        value={editForm.price} 
                        onChange={(e) => setEditForm({...editForm, price: e.target.value})}
                        style={{ width: '100%', padding: '8px', marginBottom: '8px' }}
                      />
                      <select 
                        value={editForm.category} 
                        onChange={(e) => setEditForm({...editForm, category: e.target.value})}
                        style={{ width: '100%', padding: '8px', marginBottom: '8px' }}
                      >
                        <option value="Stationery">Stationery</option>
                        <option value="Books">Books</option>
                        <option value="Electronics">Electronics</option>
                        <option value="Other">Other</option>
                      </select>
                      <div className="item-actions">
                        <button className="edit-btn" onClick={() => handleSaveEdit(item.id)}>Save</button>
                        <button className="delete-btn" onClick={() => setEditingItem(null)}>Cancel</button>
                      </div>
                    </>
                  ) : (
                    <>
                      <h3>{item.description.substring(0, 50)}{item.description.length > 50 ? '...' : ''}</h3>
                      <p className="item-price">₹{formatIndianPrice(item.price)}</p>
                      <p className="interested-count">{getInterestedCount(item.id)} interested buyers</p>
                      <div className="item-actions">
                        <button className="edit-btn" onClick={() => handleEdit(item)}>Edit</button>
                        <button className="delete-btn" onClick={() => handleDelete(item.id)}>Delete</button>
                      </div>
                    </>
                  )}
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

