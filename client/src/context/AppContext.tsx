import { createContext, useContext, useState } from 'react';
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
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children, userName }: { children: ReactNode; userName: string }) {
  const [products, setProducts] = useState<Product[]>([]);

  const addProduct = (product: Omit<Product, 'id' | 'createdAt'>) => {
    const newProduct: Product = {
      ...product,
      id: Date.now().toString(),
      createdAt: Date.now(),
    };
    setProducts(prev => [newProduct, ...prev]);
  };

  return (
    <AppContext.Provider value={{ products, addProduct, currentUser: userName }}>
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
