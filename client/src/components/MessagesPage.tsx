import { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { collection, query, where, onSnapshot, addDoc, orderBy, or, updateDoc, doc, getDoc, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

interface Conversation {
  userId: string;
  userName: string;
  productId: string;
  productDescription: string;
  interestId: string;
  buyerAgreed: boolean;
  sellerAgreed: boolean;
  sold: boolean;
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
              productDescription: product.description,
              interestId: doc.id,
              buyerAgreed: data.buyerAgreed || false,
              sellerAgreed: data.sellerAgreed || false,
              sold: data.sold || false
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
              productDescription: product.description,
              interestId: doc.id,
              buyerAgreed: data.buyerAgreed || false,
              sellerAgreed: data.sellerAgreed || false,
              sold: data.sold || false
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

  const handleAgree = async () => {
    if (!selectedConversation) return;

    const product = products.find(p => p.id === selectedConversation.productId);
    if (!product) return;

    const isBuyer = product.sellerId !== currentUser;
    const updateData = isBuyer ? { buyerAgreed: true } : { sellerAgreed: true };

    try {
      await updateDoc(doc(db, 'interests', selectedConversation.interestId), updateData);

      // Check if both agreed
      const interestDoc = await getDoc(doc(db, 'interests', selectedConversation.interestId));
      const interestData = interestDoc.data();
      
      if (interestData && ((isBuyer && interestData.sellerAgreed) || (!isBuyer && interestData.buyerAgreed))) {
        // Both agreed - mark as sold
        await updateDoc(doc(db, 'interests', selectedConversation.interestId), { sold: true });
        await updateDoc(doc(db, 'products', selectedConversation.productId), { sold: true });
        
        // Delete other interests for this product
        const q = query(
          collection(db, 'interests'),
          where('productId', '==', selectedConversation.productId)
        );
        const otherInterests = await getDocs(q);
        otherInterests.forEach(async (docSnap) => {
          if (docSnap.id !== selectedConversation.interestId) {
            await updateDoc(doc(db, 'interests', docSnap.id), { sold: true });
          }
        });
      }
    } catch (error) {
      console.error('Error agreeing:', error);
    }
  };

  const product = products.find(p => p.id === selectedConversation?.productId);
  const isBuyer = product && product.sellerId !== currentUser;
  const hasAgreed = isBuyer ? selectedConversation?.buyerAgreed : selectedConversation?.sellerAgreed;
  const otherAgreed = isBuyer ? selectedConversation?.sellerAgreed : selectedConversation?.buyerAgreed;

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
                <div className="conversation-header">
                  <strong>{conv.userName}</strong>
                  {conv.sold && <span className="sold-badge">SOLD</span>}
                </div>
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
                <div>
                  <strong>{selectedConversation.userName}</strong>
                  <p style={{ fontSize: '12px', color: '#999' }}>
                    Product: {selectedConversation.productDescription.substring(0, 40)}...
                  </p>
                </div>
                {selectedConversation.sold && <span className="sold-badge">SOLD</span>}
              </div>
              
              <div className="chat-messages">
                {messages.map((msg) => (
                  <div 
                    key={msg.id} 
                    className={`message ${msg.senderId === currentUser ? 'sent' : 'received'}`}
                  >
                    <div className="message-bubble">
                      <div className="message-text">{msg.text}</div>
                      <div className="message-time">
                        {new Date(msg.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {!selectedConversation.sold && (
                <div className="chat-footer">
                  <div className="agree-section">
                    <button
                      className={`agree-btn ${hasAgreed ? 'agreed' : ''}`}
                      onClick={handleAgree}
                      disabled={hasAgreed}
                    >
                      {hasAgreed ? '✓ You Agreed' : 'Agree to Sell/Buy'}
                    </button>
                    {otherAgreed && <span className="other-agreed">✓ Other party agreed</span>}
                  </div>
                  <div className="message-input-area">
                    <input 
                      type="text" 
                      placeholder="Type a message..."
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    />
                    <button onClick={handleSendMessage}>Send</button>
                  </div>
                </div>
              )}
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
