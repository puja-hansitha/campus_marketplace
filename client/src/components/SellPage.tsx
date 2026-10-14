import { useState, useRef } from 'react';
import confetti from 'canvas-confetti';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';
import { useApp } from '../context/AppContext';
import type { Product } from '../context/AppContext';

type Category = Product['category'];

const CATEGORIES: { value: Category; label: string; emoji: string }[] = [
  { value: 'stationery', label: 'Stationery', emoji: '✏️' },
  { value: 'books',      label: 'Books',      emoji: '📚' },
  { value: 'electronics',label: 'Electronics',emoji: '💻' },
  { value: 'other',      label: 'Other',      emoji: '📦' },
];

/** Resize an image file to max 1200px width, returns a Blob */
async function resizeImage(file: File, maxWidth = 1200): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = img.width > maxWidth ? maxWidth / img.width : 1;
      const canvas = document.createElement('canvas');
      canvas.width  = Math.round(img.width  * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Canvas toBlob failed')), 'image/webp', 0.85);
    };
    img.onerror = reject;
    img.src = url;
  });
}

export default function SellPage() {
  const { addProduct, currentUser } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile]         = useState<File | null>(null);
  const [preview, setPreview]   = useState<string | null>(null);
  const [description, setDesc]  = useState('');
  const [category, setCat]      = useState<Category | ''>('');
  const [price, setPrice]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [success, setSuccess]   = useState(false);
  const [error, setError]       = useState('');

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(f.type)) {
      setError('Only JPG, PNG, or WebP images are allowed.');
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      setError('Image must be under 5 MB.');
      return;
    }
    setFile(f);
    setError('');
    const reader = new FileReader();
    reader.onload = ev => setPreview(ev.target?.result as string);
    reader.readAsDataURL(f);
  };

  const clearFile = () => {
    setFile(null);
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handlePost = async () => {
    if (!file || !description.trim() || !category || !price) {
      setError('Please fill in all fields and upload a photo.');
      setTimeout(() => setError(''), 3000);
      return;
    }
    setLoading(true);
    setError('');
    try {
      // 1. Resize image
      const resized = await resizeImage(file);

      // 2. Upload to Firebase Storage
      const path = `products/${currentUser.uid}/${Date.now()}.webp`;
      const storageRef = ref(storage, path);
      await uploadBytes(storageRef, resized, { contentType: 'image/webp' });
      const imageURL = await getDownloadURL(storageRef);

      // 3. Save to Firestore
      await addProduct({
        sellerId:    currentUser.uid,
        sellerName:  currentUser.name,
        sellerPhoto: currentUser.photoURL,
        imageURL,
        description: description.trim(),
        category:    category as Category,
        price:       parseInt(price.replace(/,/g, ''), 10),
      });

      // 4. Celebrate
      const end = Date.now() + 2500;
      const burst = () => {
        confetti({ particleCount: 6, angle: 60,  spread: 55, origin: { x: 0 }, colors: ['#22c55e','#86efac','#4ade80'] });
        confetti({ particleCount: 6, angle: 120, spread: 55, origin: { x: 1 }, colors: ['#22c55e','#86efac','#4ade80'] });
        if (Date.now() < end) requestAnimationFrame(burst);
      };
      burst();

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        clearFile();
        setDesc(''); setCat(''); setPrice('');
      }, 2500);
    } catch (err: any) {
      setError('Failed to post product: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const fmt = (v: string) => {
    const n = v.replace(/\D/g, '');
    return n ? parseInt(n).toLocaleString('en-IN') : '';
  };

  return (
    <div className="max-w-xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">List a Product</h1>
        <p className="text-sm text-gray-500 mt-1">Fill in the details to post your item.</p>
      </div>

      <div className="card p-6 space-y-5">

        {/* Photo upload */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-2">Product Photo *</label>
          {preview ? (
            <div className="relative">
              <img src={preview} alt="preview" className="w-full max-h-64 object-cover rounded-xl" />
              <button
                onClick={clearFile}
                className="absolute top-2 right-2 w-7 h-7 bg-black/60 text-white rounded-full flex items-center justify-center text-xs hover:bg-black/80 transition-colors"
              >
                ✕
              </button>
            </div>
          ) : (
            <label
              htmlFor="photo-input"
              className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-brand-400 hover:bg-brand-50 transition-all"
            >
              <span className="text-3xl mb-2">📷</span>
              <p className="text-sm font-medium text-gray-600">Click to upload</p>
              <p className="text-xs text-gray-400 mt-1">JPG, PNG, WebP · max 5 MB</p>
            </label>
          )}
          <input
            id="photo-input"
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            className="hidden"
            onChange={handleFile}
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-2">Description *</label>
          <textarea
            className="input resize-none"
            rows={3}
            placeholder="Describe your product — condition, brand, notes…"
            value={description}
            onChange={e => setDesc(e.target.value)}
            maxLength={300}
          />
          <p className="text-xs text-gray-400 mt-1 text-right">{description.length}/300</p>
        </div>

        {/* Category */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-2">Category *</label>
          <div className="grid grid-cols-2 gap-2">
            {CATEGORIES.map(c => (
              <button
                key={c.value}
                type="button"
                onClick={() => setCat(c.value)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                  category === c.value
                    ? 'border-brand-500 bg-brand-50 text-brand-700'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <span>{c.emoji}</span>{c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Price */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-2">Price (₹) *</label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 font-medium text-sm">₹</span>
            <input
              className="input pl-8"
              type="text"
              placeholder="0"
              value={fmt(price)}
              onChange={e => setPrice(e.target.value.replace(/\D/g, ''))}
            />
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
            ⚠️ {error}
          </div>
        )}

        {/* Success */}
        {success && (
          <div className="flex items-center gap-2 p-3 bg-brand-50 border border-brand-200 rounded-xl text-brand-700 text-sm font-medium">
            ✅ Product listed successfully!
          </div>
        )}

        {/* Submit */}
        <button
          onClick={handlePost}
          disabled={loading || success}
          className="btn-primary w-full py-3"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Uploading…
            </span>
          ) : 'Post Product'}
        </button>
      </div>
    </div>
  );
}
