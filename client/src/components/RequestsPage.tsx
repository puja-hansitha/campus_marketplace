import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { collection, query, where, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';

interface Interest {
  id: string;
  productId: string;
  buyerId: string;
  buyerName: string;
  createdAt: number;
}

export default function RequestsPage({ navigationData, onNavigateToMessages }: { navigationData?: any, onNavigateToMessages?: () => void }) {
  const { products, currentUser, markAsSold } = useApp();
  const [activeTab, setActiveTab] = useState<'received' | 'sent'>('received');
  const [sellingInterests, setSellingInterests] = useState<Interest[]>([]);
  const [buyingInterests, setBuyingInterests] = useState<Interest[]>([]);

  // Handle navigation from notification
  useEffect(() => {
    if (navigationData?.productId) {
      setActiveTab('received');
    }
  }, [navigationData]);

  // Get seller's products (only active ones)
  const sellerProducts = products.filter(p => p.sellerId === currentUser && p.status !== 'sold');

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
        const data = doc.data();
        // Only show interests that are not yet processed (no status or status is pending)
        if (!data.status || data.status === 'pending') {
          interestsData.push({ id: doc.id, ...data } as Interest);
        }
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
        const data = doc.data();
        // Only show pending interests (not declined/accepted)
        if (!data.status || data.status === 'pending') {
          interestsData.push({ id: doc.id, ...data } as Interest);
        }
      });
      setBuyingInterests(interestsData);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Group interests by product
  const getInterestedBuyers = (productId: string) => {
    return sellingInterests.filter(i => i.productId === productId);
  };

  const handleMarkAsSold = async (productId: string, buyerId: string, buyerName: string) => {
    if (window.confirm(`Mark this product as sold to ${buyerName}?`)) {
      await markAsSold(productId, buyerId, buyerName);
    }
  };

  const handleRemoveInterest = async (interestId: string) => {
    if (window.confirm('Remove your interest in this product?')) {
      await deleteDoc(doc(db, 'interests', interestId));
    }
  };

  // Group selling interests by product with product details - only show products with pending interests
  const groupedSellingRequests = sellerProducts.map(product => ({
    product,
    interests: getInterestedBuyers(product.id).sort((a, b) => b.createdAt - a.createdAt)
  })).filter(({ interests }) => interests.length > 0).sort((a, b) => b.product.createdAt - a.product.createdAt);

  // Sort buying interests by creation date
  const sortedBuyingInterests = [...buyingInterests].sort((a, b) => b.createdAt - a.createdAt);

  return (
    <div>
      <h1>Requests</h1>
      
      <div className="history-tabs">
        <button 
          className={`tab ${activeTab === 'received' ? 'active' : ''}`}
          onClick={() => setActiveTab('received')}
        >
          Requests on Your Products ({sellingInterests.length})
        </button>
        <button 
          className={`tab ${activeTab === 'sent' ? 'active' : ''}`}
          onClick={() => setActiveTab('sent')}
        >
          Your Requests on Other Products ({buyingInterests.length})
        </button>
      </div>

      {activeTab === 'received' ? (
        <div className="requests-received-container">
          {groupedSellingRequests.length === 0 ? (
            <p style={{ color: '#999', textAlign: 'center', marginTop: '40px' }}>No products listed yet</p>
          ) : (
            groupedSellingRequests.map(({ product, interests }) => (
              <div key={product.id} className="product-request-group">
                <div className="product-header">
                  <img src={product.photo} alt={product.description} className="product-thumb" />
                  <div className="product-info">
                    <h3>{product.description}</h3>
                    <p className="product-price">₹{parseInt(product.price).toLocaleString('en-IN')}</p>
                    <p style={{ fontSize: '12px', color: '#999' }}>
                      Posted on {new Date(product.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="request-badge">{interests.length} {interests.length === 1 ? 'request' : 'requests'}</span>
                </div>
                
                {interests.length > 0 && (
                  <div className="buyers-list-inline">
                    {interests.map(interest => (
                      <div key={interest.id} className="buyer-card-inline">
                        <div className="buyer-info">
                          <strong>{interest.buyerName}</strong>
                          <p style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
                            Interested on {new Date(interest.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <button 
                          className="mark-sold-btn"
                          onClick={() => handleMarkAsSold(product.id, interest.buyerId, interest.buyerName)}
                        >
                          Mark as Sold
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="requests-sent-container">
          {sortedBuyingInterests.length === 0 ? (
            <p style={{ color: '#999', textAlign: 'center', marginTop: '40px' }}>No requests sent yet</p>
          ) : (
            <div className="items-grid">
              {sortedBuyingInterests.map(interest => {
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
                    <div className="item-actions" style={{ marginTop: '12px' }}>
                      <button className="message-seller-btn" onClick={onNavigateToMessages}>
                        💬 Chat
                      </button>
                      <button className="remove-interest-btn" onClick={() => handleRemoveInterest(interest.id)}>
                        Remove
                      </button>
                    </div>
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
