import { useState } from 'react';

export default function RequestsPage() {
  const [selectedProduct, setSelectedProduct] = useState<number | null>(null);

  return (
    <div>
      <h1>Requests</h1>
      
      <div className="requests-container">
        <div className="products-list">
          <h3>Your Products</h3>
          <p style={{ color: '#999', textAlign: 'center', marginTop: '40px' }}>No products with requests</p>
        </div>

        <div className="buyers-list">
          <div className="no-product-selected">
            <p>Select a product to view requests</p>
          </div>
        </div>
      </div>
    </div>
  );
}
