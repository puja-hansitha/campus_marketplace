import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { collection, addDoc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';

interface Product {
  id: string;
  sellerId: string;
  sellerName: string;
  photo: string;
  description: string;
  category: string;
  price: string;
  createdAt: number;
}

interface AppContextType {
  products: Product[];
  addProduct: (product: Omit<Product, 'id' | 'createdAt'>) => void;
  currentUser: string;
  userName: string;
  userPhoto: string | null;
  updateUserProfile: (name: string, photo: string | null) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children, userName: initialUserName, userEmail }: { children: ReactNode; userName: string; userEmail: string }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [userName, setUserName] = useState(initialUserName);
  const [userPhoto, setUserPhoto] = useState<string | null>(null);

  // Listen to Firestore products in real-time
  useEffect(() => {
    console.log('Setting up Firestore listener...');
    const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        console.log('Received products:', snapshot.size);
        const productsData: Product[] = [];
        snapshot.forEach((doc) => {
          productsData.push({ id: doc.id, ...doc.data() } as Product);
        });
        setProducts(productsData);
      },
      (error) => {
        console.error('Firestore error:', error);
        alert('Error loading products: ' + error.message);
      }
    );

    return () => unsubscribe();
  }, []);

  const addProduct = async (product: Omit<Product, 'id' | 'createdAt'>) => {
    try {
      console.log('Adding product to Firestore...');
      const docRef = await addDoc(collection(db, 'products'), {
        ...product,
        sellerName: userName,
        sellerId: userEmail,
        createdAt: Date.now(),
      });
      console.log('Product added with ID:', docRef.id);
    } catch (error: any) {
      console.error('Error adding product:', error);
      alert('Failed to add product: ' + error.message);
    }
  };

  const updateUserProfile = (name: string, photo: string | null) => {
    setUserName(name);
    setUserPhoto(photo);
  };

  return (
    <AppContext.Provider value={{ 
      products, 
      addProduct, 
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
