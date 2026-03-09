import { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { collection, query, where, onSnapshot, addDoc } from 'firebase/firestore';
import { db } from '../firebase';

interface Conversation {
  userId: string;
  userName: string;
  productId: string;
  productDescription: string;
}

interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  text: string;
  createdAt: number;
}

export default function MessagesPage({ navigationData }: { navigationData?: any }) {
  const { currentUser, userName, products } = useApp();
  const [activeTab, setActiveTab] = useState<'seller' | 'buyer'>('seller');
  const [sellerConversations, setSellerConversations] = useState<Conversation[]>([]);
  const [buyerConversations, setBuyerConversations] = useState<Conversation[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Handle navigation from notification
  useEffect(() => {
    if (navigationData?.productId && navigationData?.userId) {
      const product = products.find(p => p.id === navigationData.productId);
      if (product) {
        // Determine if seller or buyer
        const isSeller = product.sellerId === currentUser;
        setActiveTab(isSeller ? 'seller' : 'buyer');
        setSelectedProduct(navigationData.productId);
        
        // Set the conversation
        setTimeout(() => {
          setSelectedConversation({
            userId: navigationData.userId,
            userName: navigationData.userName,
            productId: navigationData.productId,
            productDescription: product.description
          });
        }, 100);
      }
    }
  }, [navigationData, products, currentUser]);

  // Load seller conversations
  useEffect(() => {
    const qSeller = query(collection(db, 'interests'), where('sellerId', '==', currentUser));

    const unsubSeller = onSnapshot(qSeller, (snapshot) => {
      const sellerConvos: Conversation[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        const product = products.find(p => p.id === data.productId);
        if (product) {
          sellerConvos.push({
            userId: data.buyerId,
            userName: data.buyerName,
            productId: data.productId,
            productDescription: product.description
          });
        }
      });
      setSellerConversations(sellerConvos);
    });

    return () => unsubSeller();
  }, [currentUser, products]);

  // Load buyer conversations
  useEffect(() => {
    const qBuyer = query(collection(db, 'interests'), where('buyerId', '==', currentUser));

    const unsubBuyer = onSnapshot(qBuyer, (snapshot) => {
      const buyerConvos: Conversation[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        const product = products.find(p => p.id === data.productId);
        if (product) {
          buyerConvos.push({
            userId: product.sellerId,
            userName: product.sellerName,
            productId: data.productId,
            productDescription: product.description
          });
        }
      });
      setBuyerConversations(buyerConvos);
    });

    return () => unsubBuyer();
  }, [currentUser, products]);

  // Load messages
  useEffect(() => {
    if (!selectedConversation) return;

    const conversationId = [currentUser, selectedConversation.userId, selectedConversation.productId].sort().join('_');
    const q = query(collection(db, 'messages'), where('conversationId', '==', conversationId));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs: Message[] = [];
      snapshot.forEach((doc) => {
        msgs.push({ id: doc.id, ...doc.data() } as Message);
      });
      msgs.sort((a, b) => a.createdAt - b.createdAt);
      setMessages(msgs);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    });

    return () => unsubscribe();
  }, [selectedConversation, currentUser]);

  const handleSendMessage = async () => {
    if (!messageText.trim() || !selectedConversation) return;

    const conversationId = [currentUser, selectedConversation.userId, selectedConversation.productId].sort().join('_');

    try {
      await addDoc(collection(db, 'messages'), {
        conversationId,
        senderId: currentUser,
        senderName: userName,
        text: messageText.trim(),
        createdAt: Date.now()
      });
      setMessageText('');
    } catch (error: any) {
      console.error('Error sending message:', error);
      alert('Failed to send message: ' + error.message);
    }
  };

  // Group by product
  const conversations = activeTab === 'seller' ? sellerConversations : buyerConversations;
  const isSeller = activeTab === 'seller';
  
  const conversationsByProduct = conversations.reduce((acc, conv) => {
    if (!acc[conv.productId]) acc[conv.productId] = [];
    acc[conv.productId].push(conv);
    return acc;
  }, {} as Record<string, Conversation[]>);

  return (
    <div>
      <h1>Messages</h1>
      
      {/* Tabs */}
      <div className="history-tabs">
        <button 
          className={`tab ${activeTab === 'seller' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('seller');
            setSelectedProduct(null);
            setSelectedConversation(null);
          }}
        >
          As Seller ({sellerConversations.length})
        </button>
        <button 
          className={`tab ${activeTab === 'buyer' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('buyer');
            setSelectedProduct(null);
            setSelectedConversation(null);
          }}
        >
          As Buyer ({buyerConversations.length})
        </button>
      </div>
      
      <div className={`messages-container-new ${isSeller ? 'three-column' : 'two-column'}`}>
        {/* Products List */}
        <div className="products-list-messages">
          <h3>{isSeller ? 'Your Products' : 'Products'}</h3>
          {Object.keys(conversationsByProduct).length === 0 ? (
            <p style={{ color: '#999', textAlign: 'center', marginTop: '40px' }}>No conversations</p>
          ) : (
            Object.keys(conversationsByProduct).map(productId => {
              const product = products.find(p => p.id === productId);
              const convos = conversationsByProduct[productId];
              return (
                <div 
                  key={productId}
                  className={`product-message-item ${selectedProduct === productId ? 'active' : ''}`}
                  onClick={() => {
                    setSelectedProduct(productId);
                    if (!isSeller && convos.length > 0) {
                      setSelectedConversation(convos[0]);
                    } else {
                      setSelectedConversation(null);
                    }
                  }}
                >
                  <strong>{product?.description.substring(0, 30)}...</strong>
                  <p style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
                    {isSeller ? `${convos.length} buyer(s)` : `Seller: ${convos[0]?.userName}`}
                  </p>
                  {/* Show unread badge - placeholder for now */}
                  {convos.length > 0 && (
                    <span className="unread-badge" style={{ display: 'none' }}>New</span>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Buyers List (Sellers only) */}
        {isSeller && selectedProduct && (
          <div className="buyers-list-messages">
            <h3>Buyers</h3>
            {conversationsByProduct[selectedProduct]?.map((conv) => (
              <div 
                key={`${conv.userId}-${conv.productId}`}
                className={`buyer-message-item ${selectedConversation?.userId === conv.userId ? 'active' : ''}`}
                onClick={() => setSelectedConversation(conv)}
              >
                <strong>{conv.userName}</strong>
              </div>
            ))}
          </div>
        )}

        {/* Chat Area */}
        <div className="chat-area">
          {selectedConversation ? (
            <>
              <div className="chat-header">
                <strong>{selectedConversation.userName}</strong>
                <p style={{ fontSize: '12px', color: '#999' }}>
                  {selectedConversation.productDescription.substring(0, 40)}...
                </p>
              </div>
              
              <div className="chat-messages">
                {messages.map((msg) => (
                  <div 
                    key={msg.id} 
                    className={`message ${msg.senderId === currentUser ? 'sent' : 'received'}`}
                  >
                    <div className="message-content">
                      <strong>{msg.senderName}</strong>
                      <p>{msg.text}</p>
                      <div className="message-time">
                        {new Date(msg.createdAt).toLocaleTimeString('en-US', { 
                          hour: 'numeric', 
                          minute: '2-digit',
                          hour12: true 
                        })}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              <div className="chat-input">
                <input 
                  type="text" 
                  placeholder="Type a message..."
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                />
                <button onClick={handleSendMessage}>Send</button>
              </div>
            </>
          ) : (
            <div className="no-chat-selected">
              <p>{isSeller ? 'Select a product and buyer' : 'Select a product'}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
