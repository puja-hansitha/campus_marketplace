import { useState } from 'react';
import confetti from 'canvas-confetti';
import { useApp } from '../context/AppContext';

export default function SellPage() {
  const { addProduct, currentUser, userName } = useApp();
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [price, setPrice] = useState('');
  const [displayPrice, setDisplayPrice] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [isPosting, setIsPosting] = useState(false);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { alert('File size must be less than 5MB'); return; }
      setPhoto(file);
      const reader = new FileReader();
      reader.onload = (event) => setPhotoPreview(event.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const numericValue = e.target.value.replace(/\D/g, '');
    setPrice(numericValue);
    setDisplayPrice(numericValue ? parseInt(numericValue).toLocaleString('en-IN') : '');
  };

  const triggerConfetti = () => {
    const end = Date.now() + 3000;
    const frame = () => {
      confetti({ particleCount: 5, angle: 60, spread: 55, origin: { x: 0 }, colors: ['#667eea', '#764ba2', '#f093fb', '#f5576c'] });
      confetti({ particleCount: 5, angle: 120, spread: 55, origin: { x: 1 }, colors: ['#667eea', '#764ba2', '#f093fb', '#f5576c'] });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
  };

  const handlePost = async () => {
    if (isPosting) return;
    if (!photo || !description.trim() || !category || !price) {
      setShowErrorModal(true);
      setTimeout(() => setShowErrorModal(false), 3000);
      return;
    }
    setIsPosting(true);
    try {
      await addProduct({ sellerId: currentUser, sellerName: userName, photo: photoPreview!, description: description.trim(), category, price });
      triggerConfetti();
      setShowSuccessModal(true);
      setTimeout(() => {
        setPhoto(null); setPhotoPreview(null); setDescription(''); setCategory(''); setPrice(''); setDisplayPrice('');
        const fileInput = document.getElementById('photo-input') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
        setShowSuccessModal(false); setIsPosting(false);
      }, 3000);
    } catch (error: any) {
      alert('Failed to post product: ' + error.message);
      setIsPosting(false);
    }
  };

  return (
    <div>
      <h1>Sell Product</h1>
      <div className="sell-form">
        <div className="photo-upload">
          <input type="file" id="photo-input" accept="image/jpeg,image/jpg,image/png,image/webp" style={{ display: 'none' }} onChange={handlePhotoChange} />
          <label htmlFor="photo-input" className="photo-upload-btn">📷 Upload Photo</label>
          {photoPreview && <img src={photoPreview} alt="Preview" className="photo-preview" />}
        </div>
        <div className="form-group">
          <label>Description</label>
          <textarea placeholder="Describe your product..." rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />
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
          <input type="text" placeholder="Enter price" value={displayPrice} onChange={handlePriceChange} />
        </div>
        <button className="post-btn" onClick={handlePost} disabled={isPosting}>
          {isPosting ? 'Posting...' : 'Post Product'}
        </button>
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
      {showErrorModal && (
        <div className="error-modal-overlay">
          <div className="error-modal">
            <div className="error-icon">⚠</div>
            <h2>Missing Information</h2>
            <p>Please fill all fields to post your product</p>
          </div>
        </div>
      )}
    </div>
  );
}
