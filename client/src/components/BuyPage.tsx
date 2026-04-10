import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { collection, addDoc, query, where, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';

export default function BuyPage({ onNavigateToMessages }: { onNavigateToMessages: () => void }) {
  const { products, currentUser, userName } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [interestedProducts, setInterestedProducts] = useState<Map<string, string>>(new Map());

  // Load existing interests for current user
  useEffect(() => {
    const q = query(
      collection(db, 'interests'),
      where('buyerId', '==', currentUser)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const interestsMap = new Map<string, string>();
      snapshot.forEach((doc) => {
        const data = doc.data();
        interestsMap.set(data.productId, doc.id);
      });
      setInterestedProducts(interestsMap);
    });

    return () => unsubscribe();
  }, [currentUser]);

  const formatIndianPrice = (price: string) => {
    const num = parseInt(price);
    return num.toLocaleString('en-IN');
  };

  const handleInterested = async (productId: string) => {
    try {
      const product = products.find(p => p.id === productId);
      await addDoc(collection(db, 'interests'), {
        productId,
        buyerId: currentUser,
        buyerName: userName,
        sellerId: product?.sellerId,
        createdAt: Date.now(),
      });

      // Notify the seller
      await addDoc(collection(db, 'notifications'), {
        type: 'interest',
        recipientId: product?.sellerId,
        message: `${userName} is interested in buying your item: ${product?.description.substring(0, 40)}`,
        productId,
        userId: currentUser,
        userName,
        isRead: false,
        createdAt: Date.now(),
      });

      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 3000);
    } catch (error) {
      console.error('Error sending interest:', error);
      alert('Failed to send request. Please try again.');
    }
  };

  const handleRemoveInterest = async (productId: string) => {
    try {
      const interestId = interestedProducts.get(productId);
      if (interestId) {
        await deleteDoc(doc(db, 'interests', interestId));
      }
    } catch (error) {
      console.error('Error removing interest:', error);
      alert('Failed to remove interest. Please try again.');
    }
  };

  const handleMessageSeller = () => {
    onNavigateToMessages();
  };

  // Filter out seller's own products
  const filteredProducts = products.filter(product => {
    const notOwnProduct = product.sellerId !== currentUser;
    const isActive = product.status !== 'sold';
    const matchesSearch = product.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || product.category === selectedCategory;
    return notOwnProduct && isActive && matchesSearch && matchesCategory;
  });

  return (
    <div>
      <h1>Buy Products</h1>
      
      <div className="buy-filters">
        <input 
          type="text" 
          placeholder="🔍 Search products..."
          className="search-input"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        
        <select 
          className="category-filter"
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
        >
          <option value="">All Categories</option>
          <option value="stationery">Stationery</option>
          <option value="books">Books</option>
          <option value="electronics">Electronics</option>
          <option value="other">Other</option>
        </select>
      </div>

      <div className="products-grid">
        {filteredProducts.length === 0 ? (
          <p style={{ color: '#fff', gridColumn: '1 / -1', textAlign: 'center' }}>
            No products available
          </p>
        ) : (
          filteredProducts.map(product => {
            const isInterested = interestedProducts.has(product.id);
            return (
              <div key={product.id} className="product-card">
                <img src={product.photo} alt={product.description} className="product-image-img" />
                <h3>{product.description.substring(0, 50)}{product.description.length > 50 ? '...' : ''}</h3>
                <p className="product-description">{product.description}</p>
                <p className="product-price">₹{formatIndianPrice(product.price)}</p>
                <p className="seller-name">Seller: {product.sellerName}</p>
                {isInterested ? (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      className="remove-interest-btn"
                      onClick={() => handleRemoveInterest(product.id)}
                    >
                      Remove Interest
                    </button>
                    <button 
                      className="message-seller-btn"
                      onClick={handleMessageSeller}
                    >
                      Message Seller
                    </button>
                  </div>
                ) : (
                  <button 
                    className="interested-btn"
                    onClick={() => handleInterested(product.id)}
                  >
                    Interested to Buy
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>

      {showSuccessMessage && (
        <div className="success-toast">
          ✓ Request sent successfully to seller!
        </div>
      )}
    </div>
  );
}

