import { useState } from 'react';

export default function SellPage() {
  const [photo, setPhoto] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [price, setPrice] = useState('');

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.size <= 5 * 1024 * 1024) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setPhoto(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      alert('File size must be less than 5MB');
    }
  };

  const handlePost = () => {
    if (!photo || !description || !category || !price) {
      alert('Please fill all fields');
      return;
    }
    alert('Product posted successfully!');
    setPhoto(null);
    setDescription('');
    setCategory('');
    setPrice('');
  };

  return (
    <div>
      <h1>Sell Product</h1>
      <div className="sell-form">
        <div className="photo-upload">
          <input 
            type="file" 
            id="photo-input" 
            accept="image/jpeg,image/jpg,image/png,image/webp"
            style={{ display: 'none' }}
            onChange={handlePhotoChange}
          />
          <label htmlFor="photo-input" className="photo-upload-btn">
            📷 Upload Photo
          </label>
          {photo && (
            <img src={photo} alt="Preview" className="photo-preview" />
          )}
        </div>
        
        <div className="form-group">
          <label>Description</label>
          <textarea 
            placeholder="Describe your product..." 
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        
        <div className="form-group">
          <label>Category</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">Select category</option>
            <option value="stationery">Stationery</option>
            <option value="books">Books</option>
            <option value="electronics">Electronics</option>
            <option value="other">Other</option>
          </select>
        </div>
        
        <div className="form-group">
          <label>Price (₹)</label>
          <input 
            type="number" 
            placeholder="Enter price"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
        </div>
        
        <button className="post-btn" onClick={handlePost}>Post Product</button>
      </div>
    </div>
  );
}
