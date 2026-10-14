import { useState } from 'react';
import { addDoc, collection, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { useApp } from '../context/AppContext';
import type { Product } from '../context/AppContext';

const CATEGORY_LABELS: Record<Product['category'], string> = {
  stationery:  'Stationery',
  books:       'Books',
  electronics: 'Electronics',
  other:       'Other',
};

const CATEGORY_COLORS: Record<Product['category'], string> = {
  stationery:  'bg-yellow-100 text-yellow-700',
  books:       'bg-blue-100 text-blue-700',
  electronics: 'bg-purple-100 text-purple-700',
  other:       'bg-gray-100 text-gray-600',
};

export default function BuyPage({ onNavigateToMessages }: { onNavigateToMessages: () => void }) {
  const { products, currentUser, hasInterest, interestId, sendNotification } = useApp();
  const [search, setSearch]     = useState('');
  const [category, setCategory] = useState<Product['category'] | ''>('');
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [toast, setToast]       = useState('');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const visibleProducts = products.filter(p => {
    if (p.sellerId === currentUser.uid)  return false;  // own listings
    if (p.status === 'sold')              return false;  // sold items
    if (category && p.category !== category) return false;
    if (search && !p.description.toLowerCase().includes(search.toLowerCase()) &&
        !p.sellerName.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleInterest = async (product: Product) => {
    setLoadingId(product.id);
    const conversationId = [currentUser.uid, product.sellerId, product.id].sort().join('_');
    const now = Date.now();

    // Fire all three writes in parallel — none depends on the others
    try {
      await Promise.all([
        addDoc(collection(db, 'interests'), {
          productId: product.id,
          buyerId:   currentUser.uid,
          buyerName: currentUser.name,
          sellerId:  product.sellerId,
          status:    'pending',
          createdAt: now,
        }),
        addDoc(collection(db, 'messages'), {
          conversationId,
          senderId:   currentUser.uid,
          senderName: currentUser.name,
          text:       `Hi! I'm interested in buying "${product.description.substring(0, 50)}". Is it still available?`,
          createdAt:  now,
          readBy:     [currentUser.uid],
        }),
        sendNotification({
          type:        'interest',
          recipientId: product.sellerId,
          message:     `${currentUser.name} is interested in your item: "${product.description.substring(0, 40)}"`,
          productId:   product.id,
          senderId:    currentUser.uid,
          senderName:  currentUser.name,
        }),
      ]);
      showToast('Interest sent! A message was opened with the seller.');
    } catch (err: any) {
      showToast('Error: ' + err.message);
    } finally {
      setLoadingId(null);
    }
  };

  const handleRemoveInterest = async (product: Product) => {
    const iid = interestId(product.id);
    if (!iid) return;
    setLoadingId(product.id);
    try {
      await deleteDoc(doc(db, 'interests', iid));
      showToast('Interest removed.');
    } catch (err: any) {
      showToast('Error: ' + err.message);
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Browse Products</h1>
        <p className="text-sm text-gray-500 mt-1">{visibleProducts.length} item{visibleProducts.length !== 1 ? 's' : ''} available</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
          <input
            className="input pl-10"
            type="text"
            placeholder="Search products or sellers…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setCategory('')}
            className={`px-3 py-2 rounded-xl text-sm font-medium border transition-all ${
              category === '' ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
            }`}
          >
            All
          </button>
          {(Object.keys(CATEGORY_LABELS) as Product['category'][]).map(c => (
            <button
              key={c}
              onClick={() => setCategory(category === c ? '' : c)}
              className={`px-3 py-2 rounded-xl text-sm font-medium border transition-all ${
                category === c ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
              }`}
            >
              {CATEGORY_LABELS[c]}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {visibleProducts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <span className="text-5xl mb-3">🛒</span>
          <p className="font-medium">No products found</p>
          <p className="text-sm mt-1">{search || category ? 'Try clearing your filters.' : 'Check back soon!'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {visibleProducts.map(product => {
            const interested = hasInterest(product.id);
            const isLoading  = loadingId === product.id;
            return (
              <div key={product.id} className="card overflow-hidden hover:shadow-md transition-shadow">
                {/* Image */}
                <div className="relative h-44 bg-gray-100">
                  <img
                    src={product.imageURL}
                    alt={product.description}
                    className="w-full h-full object-cover"
                  />
                  <span className={`absolute top-2 left-2 badge ${CATEGORY_COLORS[product.category]}`}>
                    {CATEGORY_LABELS[product.category]}
                  </span>
                </div>

                {/* Details */}
                <div className="p-4">
                  <p className="text-sm text-gray-800 font-medium line-clamp-2 mb-1">
                    {product.description}
                  </p>
                  <p className="text-lg font-bold text-brand-700 mb-1">
                    ₹{product.price.toLocaleString('en-IN')}
                  </p>
                  <p className="text-xs text-gray-400 mb-3">
                    by {product.sellerName}
                  </p>

                  {interested ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleRemoveInterest(product)}
                        disabled={isLoading}
                        className="flex-1 btn-secondary text-xs py-2"
                      >
                        {isLoading ? '…' : 'Remove Interest'}
                      </button>
                      <button
                        onClick={onNavigateToMessages}
                        className="flex-1 btn-primary text-xs py-2"
                      >
                        💬 Message
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleInterest(product)}
                      disabled={isLoading}
                      className="btn-primary w-full text-sm py-2"
                    >
                      {isLoading ? (
                        <span className="flex items-center gap-2 justify-center">
                          <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Sending…
                        </span>
                      ) : '🤝 Interested to Buy'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-sm font-medium px-5 py-3 rounded-2xl shadow-xl z-50 animate-fade-in">
          {toast}
        </div>
      )}
    </div>
  );
}
