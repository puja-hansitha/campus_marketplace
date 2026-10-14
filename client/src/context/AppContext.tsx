import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import {
  collection, addDoc, onSnapshot, query, orderBy,
  doc, updateDoc, where, writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase';
import type { UserProfile } from '../App';

// ─── Shared Types ────────────────────────────────────────────────────────────

export interface Product {
  id: string;
  sellerId: string;
  sellerName: string;
  sellerPhoto: string | null;
  imageURL: string;
  description: string;
  category: 'stationery' | 'books' | 'electronics' | 'other';
  price: number;
  status: 'active' | 'sold';
  createdAt: number;
}

export interface Interest {
  id: string;
  productId: string;
  buyerId: string;
  buyerName: string;
  sellerId: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: number;
}

export interface Transaction {
  id: string;
  productId: string;
  sellerId: string;
  sellerName: string;
  buyerId: string;
  buyerName: string;
  imageURL: string;
  description: string;
  price: number;
  soldAt: number;
}

export interface AppNotification {
  id: string;
  type: 'interest' | 'message' | 'sold' | 'declined' | 'deleted';
  recipientId: string;
  message: string;
  productId?: string;
  senderId?: string;
  senderName?: string;
  isRead: boolean;
  createdAt: number;
}

// ─── Context Type ─────────────────────────────────────────────────────────────

interface AppContextType {
  products: Product[];
  interests: Interest[];
  transactions: Transaction[];
  currentUser: UserProfile;
  addProduct: (p: Omit<Product, 'id' | 'createdAt' | 'status'>) => Promise<void>;
  updateProduct: (id: string, updates: Partial<Pick<Product, 'description' | 'price' | 'category'>>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  markAsSold: (productId: string, buyerId: string, buyerName: string) => Promise<void>;
  getInterestsForProduct: (productId: string) => Interest[];
  hasInterest: (productId: string) => boolean;
  interestId: (productId: string) => string | undefined;
  sendNotification: (n: Omit<AppNotification, 'id' | 'createdAt' | 'isRead'>) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AppProvider({ children, currentUser }: { children: ReactNode; currentUser: UserProfile }) {
  const [products, setProducts]         = useState<Product[]>([]);
  const [interests, setInterests]       = useState<Interest[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  // ── Products listener ─────────────────────────────────────────────────────
  // Only load ACTIVE products. Sold ones are only needed in History (transactions).
  // Limit to 200 most-recent to keep payload small.
  useEffect(() => {
    const q = query(
      collection(db, 'products'),
      where('status', '==', 'active'),
      orderBy('createdAt', 'desc'),
    );
    return onSnapshot(q, (snap) => {
      setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() } as Product)));
    });
  }, []);

  // ── Interests listener ────────────────────────────────────────────────────
  // Two scoped queries (as seller, as buyer) — only fetches what the user needs.
  useEffect(() => {
    if (!currentUser.uid) return;
    const mergedMap = new Map<string, Interest>();

    const merge = (snap: any, roleKey: 'sellerId' | 'buyerId') => {
      const incoming = new Set<string>();
      snap.docs.forEach((d: any) => {
        mergedMap.set(d.id, { id: d.id, ...d.data() } as Interest);
        incoming.add(d.id);
      });
      // Prune removed docs for this role
      for (const [id, i] of mergedMap) {
        if (i[roleKey] === currentUser.uid && !incoming.has(id)) mergedMap.delete(id);
      }
      setInterests(Array.from(mergedMap.values()));
    };

    const unsubSeller = onSnapshot(
      query(collection(db, 'interests'), where('sellerId', '==', currentUser.uid)),
      snap => merge(snap, 'sellerId')
    );
    const unsubBuyer = onSnapshot(
      query(collection(db, 'interests'), where('buyerId', '==', currentUser.uid)),
      snap => merge(snap, 'buyerId')
    );

    return () => { unsubSeller(); unsubBuyer(); };
  }, [currentUser.uid]);

  // ── Transactions listener ─────────────────────────────────────────────────
  useEffect(() => {
    if (!currentUser.uid) return;
    const txMap = new Map<string, Transaction>();

    const merge = (snap: any) => {
      snap.docs.forEach((d: any) => txMap.set(d.id, { id: d.id, ...d.data() } as Transaction));
      setTransactions(Array.from(txMap.values()).sort((a, b) => b.soldAt - a.soldAt));
    };

    const unsubS = onSnapshot(query(collection(db, 'transactions'), where('sellerId', '==', currentUser.uid), orderBy('soldAt', 'desc')), merge);
    const unsubB = onSnapshot(query(collection(db, 'transactions'), where('buyerId',  '==', currentUser.uid), orderBy('soldAt', 'desc')), merge);

    return () => { unsubS(); unsubB(); };
  }, [currentUser.uid]);

  // ─── Actions ─────────────────────────────────────────────────────────────
  // All write actions use OPTIMISTIC UPDATES:
  // 1. Update local state immediately → UI responds instantly
  // 2. Write to Firestore in background
  // 3. onSnapshot corrects anything if the write fails

  const sendNotification = useCallback(async (n: Omit<AppNotification, 'id' | 'createdAt' | 'isRead'>) => {
    // Fire-and-forget — notifications are not critical path
    addDoc(collection(db, 'notifications'), { ...n, isRead: false, createdAt: Date.now() });
  }, []);

  const addProduct = useCallback(async (product: Omit<Product, 'id' | 'createdAt' | 'status'>) => {
    const tempId    = `temp_${Date.now()}`;
    const tempDoc: Product = { ...product, id: tempId, status: 'active', createdAt: Date.now() };

    // Optimistic: show immediately
    setProducts(prev => [tempDoc, ...prev]);

    try {
      const ref = await addDoc(collection(db, 'products'), {
        ...product,
        status: 'active',
        createdAt: Date.now(),
      });
      // Replace temp with real ID (onSnapshot will also do this, but this is faster)
      setProducts(prev => prev.map(p => p.id === tempId ? { ...tempDoc, id: ref.id } : p));
    } catch (err) {
      // Rollback
      setProducts(prev => prev.filter(p => p.id !== tempId));
      throw err;
    }
  }, []);

  const updateProduct = useCallback(async (
    id: string,
    updates: Partial<Pick<Product, 'description' | 'price' | 'category'>>
  ) => {
    // Optimistic
    setProducts(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
    try {
      await updateDoc(doc(db, 'products', id), updates as any);
    } catch (err) {
      // onSnapshot will revert automatically
      throw err;
    }
  }, []);

  const deleteProduct = useCallback(async (id: string) => {
    const product     = products.find(p => p.id === id);
    const pendingBuyers = interests.filter(i => i.productId === id && i.status === 'pending');

    // Optimistic: remove immediately
    setProducts(prev => prev.filter(p => p.id !== id));
    setInterests(prev => prev.filter(i => i.productId !== id));

    try {
      const batch = writeBatch(db);
      batch.delete(doc(db, 'products', id));

      pendingBuyers.forEach(i => {
        batch.delete(doc(db, 'interests', i.id));
        const notifRef = doc(collection(db, 'notifications'));
        batch.set(notifRef, {
          type: 'deleted',
          recipientId: i.buyerId,
          message: `"${product?.description.substring(0, 40) || 'A product'}" was removed by the seller.`,
          productId: id,
          senderId:  currentUser.uid,
          senderName: currentUser.name,
          isRead: false,
          createdAt: Date.now(),
        });
      });

      await batch.commit();
    } catch (err) {
      // onSnapshot will restore on failure
      throw err;
    }
  }, [products, interests, currentUser]);

  const markAsSold = useCallback(async (productId: string, buyerId: string, buyerName: string) => {
    const product       = products.find(p => p.id === productId);
    if (!product) throw new Error('Product not found');
    const productInterests = interests.filter(i => i.productId === productId);

    // Optimistic: mark sold + update interests immediately
    setProducts(prev => prev.map(p => p.id === productId ? { ...p, status: 'sold' } : p));
    setInterests(prev => prev.map(i => {
      if (i.productId !== productId) return i;
      return { ...i, status: i.buyerId === buyerId ? 'accepted' : 'declined' };
    }));

    const soldAt = Date.now();

    // Optimistic: add transaction to local state
    const tempTx: Transaction = {
      id: `temp_${soldAt}`,
      productId,
      sellerId:   product.sellerId,
      sellerName: product.sellerName,
      buyerId,
      buyerName,
      imageURL:    product.imageURL,
      description: product.description,
      price:       product.price,
      soldAt,
    };
    setTransactions(prev => [tempTx, ...prev]);

    try {
      const batch = writeBatch(db);

      // Transaction record
      const txRef = doc(collection(db, 'transactions'));
      batch.set(txRef, {
        productId,
        sellerId:   product.sellerId,
        sellerName: product.sellerName,
        buyerId,
        buyerName,
        imageURL:    product.imageURL,
        description: product.description,
        price:       product.price,
        soldAt,
      });

      // Mark product sold
      batch.update(doc(db, 'products', productId), { status: 'sold' });

      // Update interests using already-loaded data (no extra getDocs needed)
      productInterests.forEach(i => {
        batch.update(doc(db, 'interests', i.id), {
          status: i.buyerId === buyerId ? 'accepted' : 'declined',
        });
        if (i.buyerId !== buyerId) {
          const notifRef = doc(collection(db, 'notifications'));
          batch.set(notifRef, {
            type: 'declined',
            recipientId: i.buyerId,
            message: `Sorry, "${product.description.substring(0, 40)}" was sold to someone else.`,
            productId,
            isRead: false,
            createdAt: soldAt,
          });
        }
      });

      // Notify winning buyer
      const winRef = doc(collection(db, 'notifications'));
      batch.set(winRef, {
        type: 'sold',
        recipientId: buyerId,
        message: `🎉 "${product.description.substring(0, 40)}" — ${currentUser.name} confirmed the sale to you!`,
        productId,
        isRead: false,
        createdAt: soldAt,
      });

      await batch.commit();

      // Replace temp transaction ID with real one
      setTransactions(prev => prev.map(t => t.id === tempTx.id ? { ...tempTx, id: txRef.id } : t));
    } catch (err) {
      // onSnapshot will revert on failure
      throw err;
    }
  }, [products, interests, currentUser]);

  // ─── Helpers ──────────────────────────────────────────────────────────────

  const getInterestsForProduct = useCallback((productId: string) =>
    interests.filter(i => i.productId === productId),
  [interests]);

  const hasInterest = useCallback((productId: string) =>
    interests.some(i => i.productId === productId && i.buyerId === currentUser.uid),
  [interests, currentUser.uid]);

  const interestId = useCallback((productId: string) =>
    interests.find(i => i.productId === productId && i.buyerId === currentUser.uid)?.id,
  [interests, currentUser.uid]);

  return (
    <AppContext.Provider value={{
      products, interests, transactions,
      currentUser,
      addProduct, updateProduct, deleteProduct, markAsSold,
      getInterestsForProduct, hasInterest, interestId,
      sendNotification,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
