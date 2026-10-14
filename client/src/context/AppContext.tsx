import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import {
  collection, addDoc, onSnapshot, query, orderBy,
  doc, updateDoc, where, getDocs, writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase';
import type { UserProfile } from '../App';

// ─── Shared Types ────────────────────────────────────────────────────────────

export interface Product {
  id: string;
  sellerId: string;       // Firebase UID
  sellerName: string;
  sellerPhoto: string | null;
  imageURL: string;       // Firebase Storage URL
  description: string;
  category: 'stationery' | 'books' | 'electronics' | 'other';
  price: number;          // stored as number, not string
  status: 'active' | 'sold';
  createdAt: number;
}

export interface Interest {
  id: string;
  productId: string;
  buyerId: string;        // Firebase UID
  buyerName: string;
  sellerId: string;       // Firebase UID
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
  // Data
  products: Product[];
  interests: Interest[];
  transactions: Transaction[];
  // Current user (from Firebase Auth)
  currentUser: UserProfile;
  // Product actions
  addProduct: (p: Omit<Product, 'id' | 'createdAt' | 'status'>) => Promise<void>;
  updateProduct: (id: string, updates: Partial<Pick<Product, 'description' | 'price' | 'category'>>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  markAsSold: (productId: string, buyerId: string, buyerName: string) => Promise<void>;
  // Interest helpers
  getInterestsForProduct: (productId: string) => Interest[];
  hasInterest: (productId: string) => boolean;
  interestId: (productId: string) => string | undefined;
  // Notification helpers
  sendNotification: (n: Omit<AppNotification, 'id' | 'createdAt' | 'isRead'>) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AppProvider({ children, currentUser }: { children: ReactNode; currentUser: UserProfile }) {
  const [products, setProducts]         = useState<Product[]>([]);
  const [interests, setInterests]       = useState<Interest[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  // Real-time products
  useEffect(() => {
    const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => {
      setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() } as Product)));
    });
  }, []);

  // Real-time interests (only ones relevant to current user — as seller or buyer)
  useEffect(() => {
    if (!currentUser.uid) return;

    // We need two queries: as seller and as buyer
    const qSeller = query(collection(db, 'interests'), where('sellerId', '==', currentUser.uid));
    const qBuyer  = query(collection(db, 'interests'), where('buyerId',  '==', currentUser.uid));

    const mergedMap = new Map<string, Interest>();

    const unsubSeller = onSnapshot(qSeller, (snap) => {
      snap.docs.forEach(d => mergedMap.set(d.id, { id: d.id, ...d.data() } as Interest));
      // Remove deleted
      const currentIds = new Set(snap.docs.map(d => d.id));
      for (const [id, interest] of mergedMap) {
        if (interest.sellerId === currentUser.uid && !currentIds.has(id)) mergedMap.delete(id);
      }
      setInterests(Array.from(mergedMap.values()));
    });

    const unsubBuyer = onSnapshot(qBuyer, (snap) => {
      snap.docs.forEach(d => mergedMap.set(d.id, { id: d.id, ...d.data() } as Interest));
      const currentIds = new Set(snap.docs.map(d => d.id));
      for (const [id, interest] of mergedMap) {
        if (interest.buyerId === currentUser.uid && !currentIds.has(id)) mergedMap.delete(id);
      }
      setInterests(Array.from(mergedMap.values()));
    });

    return () => { unsubSeller(); unsubBuyer(); };
  }, [currentUser.uid]);

  // Real-time transactions
  useEffect(() => {
    if (!currentUser.uid) return;
    // Listen to transactions where user is seller or buyer
    const qSeller = query(collection(db, 'transactions'), where('sellerId', '==', currentUser.uid), orderBy('soldAt', 'desc'));
    const qBuyer  = query(collection(db, 'transactions'), where('buyerId',  '==', currentUser.uid), orderBy('soldAt', 'desc'));

    const txMap = new Map<string, Transaction>();

    const unsubSeller = onSnapshot(qSeller, (snap) => {
      snap.docs.forEach(d => txMap.set(d.id, { id: d.id, ...d.data() } as Transaction));
      setTransactions(Array.from(txMap.values()).sort((a, b) => b.soldAt - a.soldAt));
    });
    const unsubBuyer = onSnapshot(qBuyer, (snap) => {
      snap.docs.forEach(d => txMap.set(d.id, { id: d.id, ...d.data() } as Transaction));
      setTransactions(Array.from(txMap.values()).sort((a, b) => b.soldAt - a.soldAt));
    });

    return () => { unsubSeller(); unsubBuyer(); };
  }, [currentUser.uid]);

  // ─── Actions ────────────────────────────────────────────────────────────────

  const sendNotification = useCallback(async (n: Omit<AppNotification, 'id' | 'createdAt' | 'isRead'>) => {
    await addDoc(collection(db, 'notifications'), { ...n, isRead: false, createdAt: Date.now() });
  }, []);

  const addProduct = useCallback(async (product: Omit<Product, 'id' | 'createdAt' | 'status'>) => {
    await addDoc(collection(db, 'products'), {
      ...product,
      status: 'active',
      createdAt: Date.now(),
    });
  }, []);

  const updateProduct = useCallback(async (
    id: string,
    updates: Partial<Pick<Product, 'description' | 'price' | 'category'>>
  ) => {
    await updateDoc(doc(db, 'products', id), updates as any);
  }, []);

  const deleteProduct = useCallback(async (id: string) => {
    const batch = writeBatch(db);

    // Notify all pending buyers
    const interestsSnap = await getDocs(
      query(collection(db, 'interests'), where('productId', '==', id), where('status', '==', 'pending'))
    );
    const product = products.find(p => p.id === id);

    interestsSnap.docs.forEach(d => {
      batch.delete(doc(db, 'interests', d.id));
      // Add notification for each buyer
      const notifRef = doc(collection(db, 'notifications'));
      batch.set(notifRef, {
        type: 'deleted',
        recipientId: d.data().buyerId,
        message: `"${product?.description.substring(0, 40) || 'A product'}" was removed by the seller.`,
        productId: id,
        senderId: currentUser.uid,
        senderName: currentUser.name,
        isRead: false,
        createdAt: Date.now(),
      });
    });

    batch.delete(doc(db, 'products', id));
    await batch.commit();
  }, [products, currentUser]);

  const markAsSold = useCallback(async (productId: string, buyerId: string, buyerName: string) => {
    const product = products.find(p => p.id === productId);
    if (!product) throw new Error('Product not found');

    const batch = writeBatch(db);

    // Create transaction record
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
      soldAt:      Date.now(),
    });

    // Mark product sold
    batch.update(doc(db, 'products', productId), { status: 'sold' });

    // Update all interests: winner = accepted, others = declined
    const interestsSnap = await getDocs(
      query(collection(db, 'interests'), where('productId', '==', productId))
    );

    interestsSnap.docs.forEach(d => {
      const isWinner = d.data().buyerId === buyerId;
      batch.update(doc(db, 'interests', d.id), {
        status: isWinner ? 'accepted' : 'declined',
      });

      // Notify declined buyers
      if (!isWinner) {
        const notifRef = doc(collection(db, 'notifications'));
        batch.set(notifRef, {
          type: 'declined',
          recipientId: d.data().buyerId,
          message: `Sorry, "${product.description.substring(0, 40)}" was sold to someone else.`,
          productId,
          isRead: false,
          createdAt: Date.now(),
        });
      }
    });

    // Notify the winning buyer
    const winNotifRef = doc(collection(db, 'notifications'));
    batch.set(winNotifRef, {
      type: 'sold',
      recipientId: buyerId,
      message: `🎉 "${product.description.substring(0, 40)}" — ${currentUser.name} confirmed the sale to you!`,
      productId,
      isRead: false,
      createdAt: Date.now(),
    });

    await batch.commit();
  }, [products, currentUser]);

  // ─── Helpers ────────────────────────────────────────────────────────────────

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
