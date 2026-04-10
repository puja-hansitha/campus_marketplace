import { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { collection, query, where, onSnapshot, addDoc, updateDoc, doc, getDocs } from 'firebase/firestore';
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
  readBy?: string[];
}

export default function MessagesPage({ navigationData }: { navigationData?: any }) {
  const { currentUser, userName, products } = useApp();
  const [activeTab, setActiveTab] = useState<'seller' | 'buyer'>('seller');
  const [sellerConversations, setSellerConversations] = useState<Conversation[]>([]);
  const [buyerConversations, setBuyerConversations] = useState<Conversation[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [allMessages, setAllMessages] = useState<Message[]>([]); // for unread counts
  const [messageText, setMessageText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Handle navigation from notification
  useEffect(() => {
    if (navigationData?.productId && navigationData?.userId) {
      const product = products.find(p => p.id === navigationData.productId);
      if (product) {
        const isSeller = product.sellerId === currentUser;
        setActiveTab(isSeller ? 'seller' : 'buyer');
        setSelectedProduct(navigationData.productId);
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
    const q = query(collection(db, 'interests'), where('sellerId', '==', currentUser));
    const unsub = onSnapshot(q, (snapshot) => {
      const convos: Conversation[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        const product = products.find(p => p.id === data.productId);
        if (product) convos.push({ userId: data.buyerId, userName: data.buyerName, productId: data.productId, productDescription: product.description });
      });
      setSellerConversations(convos);
    });
    return () => unsub();
  }, [currentUser, products]);

  // Load buyer conversations
  useEffect(() => {
    const q = query(collection(db, 'interests'), where('buyerId', '==', currentUser));
    const unsub = onSnapshot(q, (snapshot) => {
      const convos: Conversation[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        const product = products.find(p => p.id === data.productId);
        if (product) convos.push({ userId: product.sellerId, userName: product.sellerName, productId: data.productId, productDescription: product.description });
      });
      setBuyerConversations(convos);
    });
    return () => unsub();
  }, [currentUser, products]);

  // Load ALL messages for unread counts (lightweight — only conversationId + readBy + senderId)
  useEffect(() => {
    const conversations = activeTab === 'seller' ? sellerConversations : buyerConversations;
    if (conversations.length === 0) return;

    const convIds = conversations.map(c =>
      [currentUser, c.userId, c.productId].sort().join('_')
    );
    if (convIds.length === 0) return;

    // Firestore 'in' supports max 30
    const q = query(collection(db, 'messages'), where('conversationId', 'in', convIds.slice(0, 30)));
    const unsub = onSnapshot(q, (snapshot) => {
      const msgs: Message[] = [];
      snapshot.forEach(d => msgs.push({ id: d.id, ...d.data() } as Message));
      setAllMessages(msgs);
    });
    return () => unsub();
  }, [sellerConversations, buyerConversations, activeTab, currentUser]);

  // Load messages for selected conversation
  useEffect(() => {
    if (!selectedConversation) return;
    const conversationId = [currentUser, selectedConversation.userId, selectedConversation.productId].sort().join('_');
    const q = query(collection(db, 'messages'), where('conversationId', '==', conversationId));
    const unsub = onSnapshot(q, (snapshot) => {
      const msgs: Message[] = [];
      snapshot.forEach((d) => msgs.push({ id: d.id, ...d.data() } as Message));
      msgs.sort((a, b) => a.createdAt - b.createdAt);
      setMessages(msgs);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      // Mark unread messages as read
      msgs.forEach(msg => {
        if (msg.senderId !== currentUser && !msg.readBy?.includes(currentUser)) {
          updateDoc(doc(db, 'messages', msg.id), { readBy: [...(msg.readBy || []), currentUser] });
        }
      });
      // Mark related notifications as read
      getDocs(query(collection(db, 'notifications'),
        where('recipientId', '==', currentUser),
        where('productId', '==', selectedConversation.productId),
        where('type', '==', 'message'),
        where('isRead', '==', false)
      )).then(snap => snap.forEach(d => updateDoc(doc(db, 'notifications', d.id), { isRead: true })));
    });
    return () => unsub();
  }, [selectedConversation, currentUser]);

  const getUnreadCount = (conv: Conversation) => {
    const convId = [currentUser, conv.userId, conv.productId].sort().join('_');
    return allMessages.filter(m => m.conversationId === convId && m.senderId !== currentUser && !m.readBy?.includes(currentUser)).length;
  };

  const getConversationUnreadCount = (productId: string, convos: Conversation[]) => {
    return convos.reduce((sum, c) => sum + getUnreadCount(c), 0);
  };

  const handleSendMessage = async () => {
    if (!messageText.trim() || !selectedConversation) return;
    const conversationId = [currentUser, selectedConversation.userId, selectedConversation.productId].sort().join('_');
    const text = messageText.trim();
    setMessageText('');
    try {
      await addDoc(collection(db, 'messages'), {
        conversationId, senderId: currentUser, senderName: userName, text,
        createdAt: Date.now(), readBy: [currentUser]
      });
      await addDoc(collection(db, 'notifications'), {
        type: 'message', recipientId: selectedConversation.userId,
        message: `${userName}: ${text.substring(0, 60)}`,
        productId: selectedConversation.productId,
        userId: currentUser, userName, isRead: false, createdAt: Date.now(),
      });
    } catch (error: any) {
      setMessageText(text);
    }
  };

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
      <div className="history-tabs">
        <button className={`tab ${activeTab === 'seller' ? 'active' : ''}`} onClick={() => { setActiveTab('seller'); setSelectedProduct(null); setSelectedConversation(null); }}>
          As Seller ({sellerConversations.length})
        </button>
        <button className={`tab ${activeTab === 'buyer' ? 'active' : ''}`} onClick={() => { setActiveTab('buyer'); setSelectedProduct(null); setSelectedConversation(null); }}>
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
              const unread = getConversationUnreadCount(productId, convos);
              return (
                <div key={productId} className={`product-message-item ${selectedProduct === productId ? 'active' : ''}`}
                  onClick={() => {
                    setSelectedProduct(productId);
                    if (!isSeller && convos.length > 0) setSelectedConversation(convos[0]);
                    else setSelectedConversation(null);
                  }}>
                  <div className="msg-info">
                    <strong>{product?.description.substring(0, 30)}...</strong>
                    <span className="msg-sub">{isSeller ? `${convos.length} buyer(s)` : `Seller: ${convos[0]?.userName}`}</span>
                  </div>
                  {unread > 0 && <span className="unread-badge">{unread}</span>}
                </div>
              );
            })
          )}
        </div>

        {/* Buyers List (Sellers only) */}
        {isSeller && selectedProduct && (
          <div className="buyers-list-messages">
            <h3>Buyers</h3>
            {conversationsByProduct[selectedProduct]?.map((conv) => {
              const unread = getUnreadCount(conv);
              return (
                <div key={`${conv.userId}-${conv.productId}`}
                  className={`buyer-message-item ${selectedConversation?.userId === conv.userId ? 'active' : ''}`}
                  onClick={() => setSelectedConversation(conv)}>
                  <div className="msg-info">
                    <strong>{conv.userName}</strong>
                  </div>
                  {unread > 0 && <span className="unread-badge">{unread}</span>}
                </div>
              );
            })}
          </div>
        )}

        {/* Chat Area */}
        <div className="chat-area">
          {selectedConversation ? (
            <>
              <div className="chat-header">
                <strong>{selectedConversation.userName}</strong>
                <p style={{ fontSize: '12px', color: '#999' }}>{selectedConversation.productDescription.substring(0, 40)}...</p>
              </div>
              <div className="chat-messages">
                {messages.map((msg) => (
                  <div key={msg.id} className={`message ${msg.senderId === currentUser ? 'sent' : 'received'}`}>
                    <div className="message-content">
                      <strong>{msg.senderName}</strong>
                      <p>{msg.text}</p>
                      <div className="message-time">
                        {new Date(msg.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                        {msg.senderId === currentUser && (
                          <span style={{ marginLeft: '4px', color: msg.readBy && msg.readBy.length > 1 ? '#4facfe' : '#999' }}>
                            {msg.readBy && msg.readBy.length > 1 ? ' ✓✓' : ' ✓'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
              <div className="chat-input">
                {(() => {
                  const product = products.find(p => p.id === selectedConversation.productId);
                  return product?.status === 'sold' ? (
                    <div style={{ flex: 1, textAlign: 'center', padding: '12px', color: '#f5576c', fontWeight: 600, fontSize: '14px' }}>
                      🚫 This product has already been sold. No further messages can be sent.
                    </div>
                  ) : (
                    <>
                      <input type="text" placeholder="Type a message..." value={messageText}
                        onChange={(e) => setMessageText(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSendMessage(); } }} />
                      <button onClick={handleSendMessage}>Send</button>
                    </>
                  );
                })()}
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
