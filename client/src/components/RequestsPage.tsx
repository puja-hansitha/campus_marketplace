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
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [interests, setInterests] = useState<Interest[]>([]);

  // Get seller's products
  const sellerProducts = products.filter(p => p.sellerId === currentUser);

  // Listen to interests for seller's products
  useEffect(() => {
    if (sellerProducts.length === 0) return;

    const productIds = sellerProducts.map(p => p.id);
    if (productIds.length === 0) return;

    const q = query(
      collection(db, 'interests'),
      where('productId', 'in', productIds.slice(0, 10)) // Firestore limit
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const interestsData: Interest[] = [];
      snapshot.forEach((doc) => {
        interestsData.push({ id: doc.id, ...doc.data() } as Interest);
      });
      setInterests(interestsData);
    });

    return () => unsubscribe();
  }, [sellerProducts.length]);

  // Group interests by product
  const getInterestedBuyers = (productId: string) => {
    return interests.filter(i => i.productId === productId);
  };

  return (
    <div>
      <h1>Requests</h1>
      
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
    </div>
  );
}
