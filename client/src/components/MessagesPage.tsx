import { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { collection, query, where, onSnapshot, addDoc, orderBy, or } from 'firebase/firestore';
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

export default function MessagesPage() {
  const { currentUser, userName, products } = useApp();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load conversations based on interests
  useEffect(() => {
    const q = query(
      collection(db, 'interests'),
      or(
        where('buyerId', '==', currentUser),
        where('sellerId', '==', currentUser)
      )
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const convos: Conversation[] = [];
      const seen = new Set<string>();

      snapshot.forEach((doc) => {
        const data = doc.data();
        const product = products.find(p => p.id === data.productId);
        
        if (!product) return;

        // For buyer: show seller
        if (data.buyerId === currentUser) {
          const key = `${product.sellerId}-${data.productId}`;
          if (!seen.has(key)) {
            seen.add(key);
            convos.push({
              userId: product.sellerId,
              userName: product.sellerName,
              productId: data.productId,
              productDescription: product.description
            });
          }
        }
        // For seller: show buyer
        else if (product.sellerId === currentUser) {
          const key = `${data.buyerId}-${data.productId}`;
          if (!seen.has(key)) {
            seen.add(key);
            convos.push({
              userId: data.buyerId,
              userName: data.buyerName,
              productId: data.productId,
              productDescription: product.description
            });
          }
        }
      });

      setConversations(convos);
    });

    return () => unsubscribe();
  }, [currentUser, products]);

  // Load messages for selected conversation
  useEffect(() => {
    if (!selectedConversation) return;

    const conversationId = [currentUser, selectedConversation.userId, selectedConversation.productId].sort().join('_');
    
    const q = query(
      collection(db, 'messages'),
      where('conversationId', '==', conversationId),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs: Message[] = [];
      snapshot.forEach((doc) => {
        msgs.push({ id: doc.id, ...doc.data() } as Message);
      });
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
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message');
    }
  };

  return (
    <div>
      <h1>Messages</h1>
      
      <div className="messages-container">
        <div className="messages-list">
          <h3>Conversations</h3>
          {conversations.length === 0 ? (
            <p style={{ color: '#999', textAlign: 'center', marginTop: '40px' }}>No conversations yet</p>
          ) : (
            conversations.map((conv, idx) => (
              <div 
                key={`${conv.userId}-${conv.productId}-${idx}`}
                className={`conversation-item ${selectedConversation?.userId === conv.userId && selectedConversation?.productId === conv.productId ? 'active' : ''}`}
                onClick={() => setSelectedConversation(conv)}
              >
                <strong>{conv.userName}</strong>
                <p style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
                  {conv.productDescription.substring(0, 30)}...
                </p>
              </div>
            ))
          )}
        </div>

        <div className="chat-area">
          {selectedConversation ? (
            <>
              <div className="chat-header">
                <strong>{selectedConversation.userName}</strong>
                <p style={{ fontSize: '12px', color: '#999' }}>
                  Product: {selectedConversation.productDescription.substring(0, 40)}...
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
              <p>Select a conversation to start messaging</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
