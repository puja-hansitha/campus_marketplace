import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

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
  // Load products from localStorage on mount
  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem('campusMarketProducts');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [userName, setUserName] = useState(initialUserName);
  const [userPhoto, setUserPhoto] = useState<string | null>(null);

  // Save products to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('campusMarketProducts', JSON.stringify(products));
  }, [products]);

  const addProduct = (product: Omit<Product, 'id' | 'createdAt'>) => {
    const newProduct: Product = {
      ...product,
      id: Date.now().toString(),
      createdAt: Date.now(),
      sellerName: userName, // Use current userName
      sellerId: userEmail, // Use email as unique seller ID
    };
    setProducts(prev => [newProduct, ...prev]);
  };

  const updateUserProfile = (name: string, photo: string | null) => {
    setUserName(name);
    setUserPhoto(photo);
    // Update seller name in all existing products
    setProducts(prev => prev.map(p => 
      p.sellerId === userEmail ? { ...p, sellerName: name } : p
    ));
  };

  return (
    <AppContext.Provider value={{ 
      products, 
      addProduct, 
      currentUser: userEmail, // Use email as unique identifier
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
