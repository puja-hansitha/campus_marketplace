import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc, updateDoc, where, getDocs, getDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';

interface Product {
  id: string;
  sellerId: string;
  sellerName: string;
  photo: string;
  description: string;
  category: string;
  price: string;
  createdAt: number;
  status?: 'active' | 'sold';
}

interface Transaction {
  id: string;
  productId: string;
  sellerId: string;
  sellerName: string;
  buyerId: string;
  buyerName: string;
  photo: string;
  description: string;
  price: string;
  soldAt: number;
}

interface AppContextType {
  products: Product[];
  transactions: Transaction[];
  addProduct: (product: Omit<Product, 'id' | 'createdAt'>) => void;
  deleteProduct: (productId: string) => void;
  updateProduct: (productId: string, updates: Partial<Omit<Product, 'id' | 'createdAt' | 'sellerId'>>) => void;
  markAsSold: (productId: string, buyerId: string, buyerName: string) => Promise<void>;
  currentUser: string;
  userName: string;
  userPhoto: string | null;
  updateUserProfile: (name: string, photo: string | null) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children, userName: initialUserName, userEmail }: { children: ReactNode; userName: string; userEmail: string }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [userName, setUserName] = useState(initialUserName);
  const [userPhoto, setUserPhoto] = useState<string | null>(null);

  // Load user profile from Firestore
  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', auth.currentUser?.uid || ''));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setUserName(userData.name);
          setUserPhoto(userData.photo || null);
        }
      } catch (error) {
        console.error('Error loading user profile:', error);
      }
    };
    loadUserProfile();
  }, [userEmail]);

  useEffect(() => {
    const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q,
      (snapshot) => {
        const productsData: Product[] = [];
        snapshot.forEach((doc) => {
          productsData.push({ id: doc.id, ...doc.data() } as Product);
        });
        setProducts(productsData);
      },
      (error) => alert('Error loading products: ' + error.message)
    );
    return () => unsubscribe();
  }, []);

  // Listen to transactions in real-time
  useEffect(() => {
    const q = query(collection(db, 'transactions'), orderBy('soldAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const transactionsData: Transaction[] = [];
      snapshot.forEach((doc) => {
        transactionsData.push({ id: doc.id, ...doc.data() } as Transaction);
      });
      setTransactions(transactionsData);
    });

    return () => unsubscribe();
  }, []);

  const addProduct = async (product: Omit<Product, 'id' | 'createdAt'>) => {
    try {
      await addDoc(collection(db, 'products'), {
        ...product,
        sellerName: userName,
        sellerId: userEmail,
        status: 'active',
        createdAt: Date.now(),
      });
    } catch (error: any) {
      alert('Failed to add product: ' + error.message);
    }
  };

  const deleteProduct = async (productId: string) => {
    try {
      await deleteDoc(doc(db, 'products', productId));
    } catch (error: any) {
      alert('Failed to delete product: ' + error.message);
    }
  };

  const updateProduct = async (productId: string, updates: Partial<Omit<Product, 'id' | 'createdAt' | 'sellerId'>>) => {
    try {
      await updateDoc(doc(db, 'products', productId), updates as any);
    } catch (error: any) {
      alert('Failed to update product: ' + error.message);
    }
  };

  const markAsSold = async (productId: string, buyerId: string, buyerName: string) => {
    try {
      const product = products.find(p => p.id === productId);
      if (!product) throw new Error('Product not found');

      await addDoc(collection(db, 'transactions'), {
        productId,
        sellerId: product.sellerId,
        sellerName: product.sellerName,
        buyerId,
        buyerName,
        photo: product.photo,
        description: product.description,
        price: product.price,
        soldAt: Date.now(),
      });

      await updateDoc(doc(db, 'products', productId), { status: 'sold' });

      // Notify the buyer
      await addDoc(collection(db, 'notifications'), {
        type: 'sold',
        recipientId: buyerId,
        message: `🎉 Your purchase of "${product.description.substring(0, 40)}" has been confirmed by the seller!`,
        productId,
        userId: product.sellerId,
        userName: product.sellerName,
        isRead: false,
        createdAt: Date.now(),
      });

      const interestsQuery = query(collection(db, 'interests'), where('productId', '==', productId));
      const interestsSnapshot = await getDocs(interestsQuery);
      const updatePromises = interestsSnapshot.docs.map(docSnap => {
        const isWinner = docSnap.data().buyerId === buyerId;
        const promises: Promise<any>[] = [
          updateDoc(doc(db, 'interests', docSnap.id), {
            status: isWinner ? 'accepted' : 'declined'
          })
        ];
        // Notify declined buyers
        if (!isWinner) {
          promises.push(
            addDoc(collection(db, 'notifications'), {
              type: 'sold',
              recipientId: docSnap.data().buyerId,
              message: `Sorry, "${product.description.substring(0, 40)}" was sold to someone else.`,
              productId,
              isRead: false,
              createdAt: Date.now(),
            })
          );
        }
        return Promise.all(promises);
      });
      await Promise.all(updatePromises);
    } catch (error: any) {
      console.error('Error marking as sold:', error);
      alert('Failed to mark as sold: ' + error.message);
    }
  };

  const updateUserProfile = async (name: string, photo: string | null) => {
    setUserName(name);
    setUserPhoto(photo);

    try {
      // Update user profile in Firestore users collection
      if (auth.currentUser) {
        await updateDoc(doc(db, 'users', auth.currentUser.uid), {
          name,
          photo
        });
      }

      // Update Firestore: products with seller name
      const productsQuery = query(collection(db, 'products'), where('sellerId', '==', userEmail));
      const productsSnapshot = await getDocs(productsQuery);
      const productUpdates = productsSnapshot.docs.map(docSnap => 
        updateDoc(doc(db, 'products', docSnap.id), { sellerName: name })
      );
      await Promise.all(productUpdates);

      // Update Firestore: interests with buyer name
      const buyerInterestsQuery = query(collection(db, 'interests'), where('buyerId', '==', userEmail));
      const buyerInterestsSnapshot = await getDocs(buyerInterestsQuery);
      const buyerUpdates = buyerInterestsSnapshot.docs.map(docSnap => 
        updateDoc(doc(db, 'interests', docSnap.id), { buyerName: name })
      );
      await Promise.all(buyerUpdates);

      // Update Firestore: messages with sender name
      const messagesQuery = query(collection(db, 'messages'), where('senderId', '==', userEmail));
      const messagesSnapshot = await getDocs(messagesQuery);
      const messageUpdates = messagesSnapshot.docs.map(docSnap => 
        updateDoc(doc(db, 'messages', docSnap.id), { senderName: name })
      );
      await Promise.all(messageUpdates);

      console.log('Profile updated successfully across all collections');
    } catch (error: any) {
      console.error('Error updating profile in Firestore:', error);
      alert('Profile updated locally, but some data may not sync: ' + error.message);
    }
  };

  return (
    <AppContext.Provider value={{ 
      products, 
      transactions,
      addProduct,
      deleteProduct,
      updateProduct,
      markAsSold,
      currentUser: userEmail,
      userName,
      userPhoto,
      updateUserProfile
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}
