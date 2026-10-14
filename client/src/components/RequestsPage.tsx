import { useState } from 'react';
import { deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { useApp } from '../context/AppContext';

export default function RequestsPage({
  onNavigateToMessages,
}: {
  navData?: any;
  onNavigateToMessages?: () => void;
}) {
  const { products, interests, currentUser, markAsSold } = useApp();
  const [tab, setTab]       = useState<'received' | 'sent'>('received');
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [toast, setToast]   = useState('');

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  // ── Received: interests on products I'm selling ──────────────────────────
  const myActiveProducts = products.filter(
    p => p.sellerId === currentUser.uid && p.status === 'active'
  );
  const receivedInterests = interests.filter(
    i => i.sellerId === currentUser.uid && i.status === 'pending'
  );

  const grouped = myActiveProducts
    .map(p => ({
      product: p,
      buyers: receivedInterests
        .filter(i => i.productId === p.id)
        .sort((a, b) => a.createdAt - b.createdAt),
    }))
    .filter(g => g.buyers.length > 0)
    .sort((a, b) => b.product.createdAt - a.product.createdAt);

  // ── Sent: interests I've shown ────────────────────────────────────────────
  const sentInterests = interests.filter(
    i => i.buyerId === currentUser.uid && i.status === 'pending'
  );

  const handleMarkSold = async (productId: string, buyerId: string, buyerName: string) => {
    if (!window.confirm(`Mark as sold to ${buyerName}?`)) return;
    setLoadingId(`${productId}-${buyerId}`);
    try {
      await markAsSold(productId, buyerId, buyerName);
      showToast('Product marked as sold! 🎉');
    } catch (err: any) {
      showToast('Error: ' + err.message);
    } finally {
      setLoadingId(null);
    }
  };

  const handleWithdraw = async (interestId: string) => {
    if (!window.confirm('Withdraw your interest in this product?')) return;
    setLoadingId(interestId);
    try {
      await deleteDoc(doc(db, 'interests', interestId));
      showToast('Interest withdrawn.');
    } catch (err: any) {
      showToast('Error: ' + err.message);
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Requests</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6 w-fit">
        {([
          { id: 'received', label: `Received (${receivedInterests.length})` },
          { id: 'sent',     label: `Sent (${sentInterests.length})` },
        ] as const).map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              tab === t.id ? 'bg-white text-brand-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Received ── */}
      {tab === 'received' && (
        <div className="space-y-4">
          {grouped.length === 0 ? (
            <Empty icon="📋" text="No buyer requests yet." sub="When someone shows interest in your listings, they'll appear here." />
          ) : (
            grouped.map(({ product, buyers }) => (
              <div key={product.id} className="card overflow-hidden">
                {/* Product row */}
                <div className="flex items-center gap-4 p-4 border-b border-gray-100">
                  <img src={product.imageURL} alt="" className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{product.description}</p>
                    <p className="text-brand-700 font-bold text-sm mt-0.5">₹{product.price.toLocaleString('en-IN')}</p>
                  </div>
                  <span className="badge bg-orange-100 text-orange-700 flex-shrink-0">
                    {buyers.length} {buyers.length === 1 ? 'buyer' : 'buyers'}
                  </span>
                </div>

                {/* Buyers */}
                <div className="divide-y divide-gray-50">
                  {buyers.map(interest => {
                    const lid = `${product.id}-${interest.buyerId}`;
                    return (
                      <div key={interest.id} className="flex items-center justify-between px-4 py-3 gap-3">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{interest.buyerName}</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {new Date(interest.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={onNavigateToMessages}
                            className="btn-secondary text-xs px-3 py-1.5"
                          >
                            💬 Chat
                          </button>
                          <button
                            onClick={() => handleMarkSold(product.id, interest.buyerId, interest.buyerName)}
                            disabled={loadingId === lid}
                            className="btn-primary text-xs px-3 py-1.5"
                          >
                            {loadingId === lid ? '…' : 'Mark Sold'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── Sent ── */}
      {tab === 'sent' && (
        <div className="space-y-3">
          {sentInterests.length === 0 ? (
            <Empty icon="🛒" text="No pending requests." sub="When you show interest in a product, it appears here." />
          ) : (
            sentInterests.map(interest => {
              const product = products.find(p => p.id === interest.productId);
              if (!product) return null;
              return (
                <div key={interest.id} className="card p-4 flex items-center gap-4">
                  <img src={product.imageURL} alt="" className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{product.description}</p>
                    <p className="text-brand-700 font-bold text-sm mt-0.5">₹{product.price.toLocaleString('en-IN')}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Seller: {product.sellerName}</p>
                  </div>
                  <div className="flex flex-col gap-2 flex-shrink-0">
                    <button onClick={onNavigateToMessages} className="btn-secondary text-xs px-3 py-1.5">
                      💬 Chat
                    </button>
                    <button
                      onClick={() => handleWithdraw(interest.id)}
                      disabled={loadingId === interest.id}
                      className="btn-danger text-xs px-3 py-1.5"
                    >
                      {loadingId === interest.id ? '…' : 'Withdraw'}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-sm font-medium px-5 py-3 rounded-2xl shadow-xl z-50">
          {toast}
        </div>
      )}
    </div>
  );
}

function Empty({ icon, text, sub }: { icon: string; text: string; sub: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-gray-400">
      <span className="text-5xl mb-3">{icon}</span>
      <p className="font-medium text-gray-600">{text}</p>
      <p className="text-sm mt-1 text-center max-w-xs">{sub}</p>
    </div>
  );
}
