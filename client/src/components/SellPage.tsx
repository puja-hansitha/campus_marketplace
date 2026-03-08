import { useState } from 'react';
import confetti from 'canvas-confetti';
import { useApp } from '../context/AppContext';

export default function SellPage() {
  const { addProduct, currentUser } = useApp();
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [price, setPrice] = useState('');
  const [displayPrice, setDisplayPrice] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);

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

  const formatIndianNumber = (value: string) => {
    // Remove all non-digits
    const num = value.replace(/\D/g, '');
    if (!num) return '';
    
    // Convert to Indian format
    const formatted = parseInt(num).toLocaleString('en-IN');
    return formatted;
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Remove all non-digits
    const numericValue = value.replace(/\D/g, '');
    setPrice(numericValue);
    setDisplayPrice(formatIndianNumber(numericValue));
  };

  const triggerConfetti = () => {
    const duration = 3000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 5,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#667eea', '#764ba2', '#f093fb', '#f5576c']
      });
      confetti({
        particleCount: 5,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#667eea', '#764ba2', '#f093fb', '#f5576c']
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();
  };

  const handlePost = () => {
    if (!photo || !description.trim() || !category || !price) {
      alert('Please fill all fields');
      return;
    }
    
    // Add product to global state
    addProduct({
      sellerId: currentUser,
      sellerName: currentUser,
      photo: photoPreview!,
      description: description.trim(),
      category,
      price,
    });
    
    // Trigger confetti
    triggerConfetti();
    
    // Show success modal
    setShowSuccessModal(true);
    
    // Reset form after 3 seconds
    setTimeout(() => {
      setPhoto(null);
      setPhotoPreview(null);
      setDescription('');
      setCategory('');
      setPrice('');
      setDisplayPrice('');
      const fileInput = document.getElementById('photo-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      setShowSuccessModal(false);
    }, 3000);
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
            type="text" 
            placeholder="Enter price"
            value={displayPrice}
            onChange={handlePriceChange}
          />
        </div>
        
        <button className="post-btn" onClick={handlePost}>Post Product</button>
      </div>

      {showSuccessModal && (
        <div className="success-modal-overlay">
          <div className="success-modal">
            <div className="success-icon">✓</div>
            <h2>Product Listed Successfully!</h2>
            <p>Your product is now live and visible to buyers</p>
          </div>
        </div>
      )}
    </div>
  );
}
