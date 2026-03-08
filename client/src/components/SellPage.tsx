import { useState } from 'react';

export default function SellPage() {
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [price, setPrice] = useState('');

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB');
        return;
      }
      setPhoto(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        setPhotoPreview(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePost = () => {
    if (!photo || !description.trim() || !category || !price) {
      alert('Please fill all fields');
      return;
    }
    alert('Product posted successfully!');
    // Reset form
    setPhoto(null);
    setPhotoPreview(null);
    setDescription('');
    setCategory('');
    setPrice('');
    // Reset file input
    const fileInput = document.getElementById('photo-input') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
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
          {photoPreview && (
            <img src={photoPreview} alt="Preview" className="photo-preview" />
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
