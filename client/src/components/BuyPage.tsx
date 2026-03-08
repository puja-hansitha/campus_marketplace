import { useState } from 'react';

export default function BuyPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

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
        <p style={{ color: 'white', gridColumn: '1 / -1', textAlign: 'center' }}>No products available</p>
      </div>
    </div>
  );
}
