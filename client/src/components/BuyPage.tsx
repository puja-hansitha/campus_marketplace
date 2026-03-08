import { useState } from 'react';
import { useApp } from '../context/AppContext';

export default function BuyPage() {
  const { products, currentUser } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [interestedProducts, setInterestedProducts] = useState<Set<string>>(new Set());

  const formatIndianPrice = (price: string) => {
    const num = parseInt(price);
    return num.toLocaleString('en-IN');
  };

  const handleInterested = (productId: string) => {
    setInterestedProducts(prev => new Set(prev).add(productId));
    setShowSuccessMessage(true);
    setTimeout(() => {
      setShowSuccessMessage(false);
    }, 3000);
  };

  // Filter out seller's own products
  const filteredProducts = products.filter(product => {
    const notOwnProduct = product.sellerId !== currentUser;
    const matchesSearch = product.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || product.category === selectedCategory;
    return notOwnProduct && matchesSearch && matchesCategory;
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
          <p style={{ color: 'white', gridColumn: '1 / -1', textAlign: 'center' }}>
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
                <button 
                  className={`interested-btn ${isInterested ? 'disabled' : ''}`}
                  onClick={() => !isInterested && handleInterested(product.id)}
                  disabled={isInterested}
                >
                  {isInterested ? '✓ Request Sent' : 'Interested to Buy'}
                </button>
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

