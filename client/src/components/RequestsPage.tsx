import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

interface Interest {
  id: string;
  productId: string;
  buyerId: string;
  buyerName: string;
  createdAt: number;
}

export default function RequestsPage() {
  const { products, currentUser } = useApp();
  const [activeTab, setActiveTab] = useState<'selling' | 'buying'>('selling');
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [sellingInterests, setSellingInterests] = useState<Interest[]>([]);
  const [buyingInterests, setBuyingInterests] = useState<Interest[]>([]);

  // Get seller's products
  const sellerProducts = products.filter(p => p.sellerId === currentUser);

  // Listen to interests for products I'm selling
  useEffect(() => {
    if (sellerProducts.length === 0) {
      setSellingInterests([]);
      return;
    }

    const productIds = sellerProducts.map(p => p.id);
    if (productIds.length === 0) return;

    const q = query(
      collection(db, 'interests'),
      where('productId', 'in', productIds.slice(0, 10))
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const interestsData: Interest[] = [];
      snapshot.forEach((doc) => {
        interestsData.push({ id: doc.id, ...doc.data() } as Interest);
      });
      setSellingInterests(interestsData);
    });

    return () => unsubscribe();
  }, [sellerProducts.length]);

  // Listen to interests for products I want to buy
  useEffect(() => {
    const q = query(
      collection(db, 'interests'),
      where('buyerId', '==', currentUser)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const interestsData: Interest[] = [];
      snapshot.forEach((doc) => {
        interestsData.push({ id: doc.id, ...doc.data() } as Interest);
      });
      setBuyingInterests(interestsData);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Group interests by product
  const getInterestedBuyers = (productId: string) => {
    return sellingInterests.filter(i => i.productId === productId);
  };

  return (
    <div>
      <h1>Requests</h1>
      
      <div className="history-tabs">
        <button 
          className={`tab ${activeTab === 'selling' ? 'active' : ''}`}
          onClick={() => { setActiveTab('selling'); setSelectedProduct(null); }}
        >
          Selling Requests ({sellingInterests.length})
        </button>
        <button 
          className={`tab ${activeTab === 'buying' ? 'active' : ''}`}
          onClick={() => { setActiveTab('buying'); setSelectedProduct(null); }}
        >
          Buying Requests ({buyingInterests.length})
        </button>
      </div>

      {activeTab === 'selling' ? (
        <div className="requests-container">
          <div className="products-list">
            <h3>Your Products</h3>
            {sellerProducts.length === 0 ? (
              <p style={{ color: '#999', textAlign: 'center', marginTop: '40px' }}>No products listed</p>
            ) : (
              sellerProducts.map(product => {
                const interestedCount = getInterestedBuyers(product.id).length;
                return (
                  <div 
                    key={product.id} 
                    className={`request-product-item ${selectedProduct === product.id ? 'active' : ''}`}
                    onClick={() => setSelectedProduct(product.id)}
                  >
                    <strong>{product.description.substring(0, 30)}</strong>
                    {interestedCount > 0 && (
                      <span className="request-count">{interestedCount} requests</span>
                    )}
                  </div>
                );
              })
            )}
          </div>

          <div className="buyers-list">
            {selectedProduct ? (
              <>
                <h3>Interested Buyers</h3>
                {getInterestedBuyers(selectedProduct).length === 0 ? (
                  <p style={{ color: '#999', textAlign: 'center', marginTop: '40px' }}>No requests yet</p>
                ) : (
                  getInterestedBuyers(selectedProduct).map(interest => (
                    <div key={interest.id} className="buyer-card">
                      <div className="buyer-info">
                        <strong>{interest.buyerName}</strong>
                      </div>
                      <div className="buyer-actions">
                        <button className="select-btn">
                          Sell to you
                        </button>
                        <button className="bought-btn">
                          Bought by
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </>
            ) : (
              <div className="no-product-selected">
                <p>Select a product to view requests</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="buying-requests-list">
          <h3>Products You're Interested In</h3>
          {buyingInterests.length === 0 ? (
            <p style={{ color: '#999', textAlign: 'center', marginTop: '40px' }}>No buying requests yet</p>
          ) : (
            <div className="items-grid">
              {buyingInterests.map(interest => {
                const product = products.find(p => p.id === interest.productId);
                if (!product) return null;
                return (
                  <div key={interest.id} className="history-card">
                    <img src={product.photo} alt={product.description} className="item-image-img" />
                    <h3>{product.description.substring(0, 50)}{product.description.length > 50 ? '...' : ''}</h3>
                    <p className="item-price">₹{parseInt(product.price).toLocaleString('en-IN')}</p>
                    <p className="seller-name">Seller: {product.sellerName}</p>
                    <p style={{ fontSize: '12px', color: '#999', marginTop: '8px' }}>
                      Requested on {new Date(interest.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
