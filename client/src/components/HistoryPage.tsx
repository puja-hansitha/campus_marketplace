import { useState } from 'react';
import { useApp } from '../context/AppContext';
import type { Product } from '../context/AppContext';

type Tab = 'selling' | 'sold' | 'bought';

const CATEGORY_LABELS: Record<Product['category'], string> = {
  stationery:  'Stationery',
  books:       'Books',
  electronics: 'Electronics',
  other:       'Other',
};

export default function HistoryPage() {
  const { products, transactions, interests, currentUser, updateProduct, deleteProduct } = useApp();

  const [tab, setTab]           = useState<Tab>('selling');
  const [editId, setEditId]     = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ description: '', price: '', category: '' as Product['category'] });
  const [saving, setSaving]     = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [toast, setToast]       = useState('');

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const sellingItems = products.filter(p => p.sellerId === currentUser.uid && p.status === 'active');
  const soldItems    = transactions.filter(t => t.sellerId === currentUser.uid);
  const boughtItems  = transactions.filter(t => t.buyerId  === currentUser.uid);

  const interestCount = (productId: string) =>
    interests.filter(i => i.productId === productId && i.status === 'pending').length;

  const startEdit = (item: Product) => {
    setEditId(item.id);
    setEditForm({ description: item.description, price: String(item.price), category: item.category });
  };

  const saveEdit = async (itemId: string, hasBuyers: boolean) => {
    if (!editForm.description.trim()) { showToast('Description cannot be empty.'); return; }
    const newPrice = parseInt(editForm.price.replace(/\D/g, ''), 10);
    if (!newPrice || newPrice <= 0) { showToast('Enter a valid price.'); return; }

    setSaving(true);
    try {
      const updates: Partial<Pick<Product, 'description' | 'price' | 'category'>> = {
        description: editForm.description.trim(),
      };
      // Only allow price/category edits if no buyers are interested
      if (!hasBuyers) {
        updates.price    = newPrice;
        updates.category = editForm.category;
      }
      await updateProduct(itemId, updates);
      setEditId(null);
      showToast('Changes saved!');
    } catch (err: any) {
      showToast('Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: Product) => {
    const count = interestCount(item.id);
    const msg = count > 0
      ? `${count} buyer${count > 1 ? 's' : ''} ${count > 1 ? 'are' : 'is'} interested. They will be notified. Delete anyway?`
      : 'Are you sure you want to delete this listing?';
    if (!window.confirm(msg)) return;

    setDeleting(item.id);
    try {
      await deleteProduct(item.id);
      showToast('Listing deleted.');
    } catch (err: any) {
      showToast('Error: ' + err.message);
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">History</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6 w-fit">
        {([
          { id: 'selling', label: `Selling (${sellingItems.length})` },
          { id: 'sold',    label: `Sold (${soldItems.length})` },
          { id: 'bought',  label: `Bought (${boughtItems.length})` },
        ] as const).map(t => (
          <button
            key={t.id}
            onClick={() => { setTab(t.id); setEditId(null); }}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              tab === t.id ? 'bg-white text-brand-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Selling ── */}
      {tab === 'selling' && (
        <div>
          {sellingItems.length === 0 ? (
            <Empty icon="📦" text="No active listings." sub="Head to Sell to list your first product." />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {sellingItems.map(item => {
                const buyers   = interestCount(item.id);
                const hasBuyers = buyers > 0;
                const isEditing = editId === item.id;
                return (
                  <div key={item.id} className="card overflow-hidden">
                    {!isEditing && (
                      <div className="relative h-40 bg-gray-100">
                        <img src={item.imageURL} alt="" className="w-full h-full object-cover" />
                        {hasBuyers && (
                          <span className="absolute top-2 left-2 badge bg-orange-100 text-orange-700">
                            {buyers} interested
                          </span>
                        )}
                      </div>
                    )}
                    <div className="p-4 space-y-3">
                      {isEditing ? (
                        <>
                          <div>
                            <label className="text-xs font-semibold text-gray-500 mb-1 block">Description</label>
                            <textarea
                              className="input resize-none text-sm"
                              rows={3}
                              value={editForm.description}
                              onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                            />
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-gray-500 mb-1 block">
                              Price (₹)
                              {hasBuyers && <span className="ml-1 text-orange-600">🔒 locked</span>}
                            </label>
                            <input
                              className={`input text-sm ${hasBuyers ? 'bg-gray-50 cursor-not-allowed opacity-60' : ''}`}
                              type="text"
                              value={editForm.price}
                              onChange={e => setEditForm(f => ({ ...f, price: e.target.value.replace(/\D/g, '') }))}
                              disabled={hasBuyers}
                            />
                            {hasBuyers && <p className="text-xs text-orange-600 mt-1">Price is locked while buyers are interested.</p>}
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-gray-500 mb-1 block">
                              Category
                              {hasBuyers && <span className="ml-1 text-orange-600">🔒 locked</span>}
                            </label>
                            <select
                              className={`input text-sm ${hasBuyers ? 'bg-gray-50 cursor-not-allowed opacity-60' : ''}`}
                              value={editForm.category}
                              onChange={e => setEditForm(f => ({ ...f, category: e.target.value as Product['category'] }))}
                              disabled={hasBuyers}
                            >
                              {(Object.keys(CATEGORY_LABELS) as Product['category'][]).map(c => (
                                <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
                              ))}
                            </select>
                          </div>
                          <div className="flex gap-2 pt-1">
                            <button onClick={() => saveEdit(item.id, hasBuyers)} disabled={saving} className="btn-primary flex-1 text-sm py-2">
                              {saving ? 'Saving…' : 'Save'}
                            </button>
                            <button onClick={() => setEditId(null)} className="btn-secondary flex-1 text-sm py-2">
                              Cancel
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <p className="text-sm font-medium text-gray-900 line-clamp-2">{item.description}</p>
                          <div className="flex items-center justify-between">
                            <p className="text-lg font-bold text-brand-700">₹{item.price.toLocaleString('en-IN')}</p>
                            <span className="badge bg-gray-100 text-gray-500 text-xs">{CATEGORY_LABELS[item.category]}</span>
                          </div>
                          <p className="text-xs text-gray-400">
                            Listed {new Date(item.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                          </p>
                          <div className="flex gap-2 pt-1">
                            <button onClick={() => startEdit(item)} className="btn-secondary flex-1 text-sm py-2">
                              ✏️ Edit
                            </button>
                            <button
                              onClick={() => handleDelete(item)}
                              disabled={deleting === item.id}
                              className="btn-danger flex-1 text-sm py-2"
                            >
                              {deleting === item.id ? '…' : '🗑️ Delete'}
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Sold ── */}
      {tab === 'sold' && (
        <div>
          {soldItems.length === 0 ? (
            <Empty icon="🏷️" text="Nothing sold yet." sub="Completed sales will appear here." />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {soldItems.map(item => (
                <div key={item.id} className="card overflow-hidden">
                  <div className="h-40 bg-gray-100 relative">
                    <img src={item.imageURL} alt="" className="w-full h-full object-cover" />
                    <span className="absolute top-2 left-2 badge bg-green-100 text-green-700">Sold</span>
                  </div>
                  <div className="p-4 space-y-1">
                    <p className="text-sm font-medium text-gray-900 line-clamp-2">{item.description}</p>
                    <p className="text-lg font-bold text-brand-700">₹{item.price.toLocaleString('en-IN')}</p>
                    <p className="text-xs text-gray-500">Sold to: <span className="font-semibold">{item.buyerName}</span></p>
                    <p className="text-xs text-gray-400">
                      {new Date(item.soldAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Bought ── */}
      {tab === 'bought' && (
        <div>
          {boughtItems.length === 0 ? (
            <Empty icon="🛍️" text="Nothing bought yet." sub="Items you purchase will appear here." />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {boughtItems.map(item => (
                <div key={item.id} className="card overflow-hidden">
                  <div className="h-40 bg-gray-100 relative">
                    <img src={item.imageURL} alt="" className="w-full h-full object-cover" />
                    <span className="absolute top-2 left-2 badge bg-blue-100 text-blue-700">Bought</span>
                  </div>
                  <div className="p-4 space-y-1">
                    <p className="text-sm font-medium text-gray-900 line-clamp-2">{item.description}</p>
                    <p className="text-lg font-bold text-brand-700">₹{item.price.toLocaleString('en-IN')}</p>
                    <p className="text-xs text-gray-500">From: <span className="font-semibold">{item.sellerName}</span></p>
                    <p className="text-xs text-gray-400">
                      {new Date(item.soldAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

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
      <p className="text-sm mt-1">{sub}</p>
    </div>
  );
}
