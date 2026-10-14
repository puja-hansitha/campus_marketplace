import { useState, useEffect, useRef } from 'react';
import {
  collection, query, where, onSnapshot,
  addDoc, updateDoc, doc, getDocs,
} from 'firebase/firestore';
import { db } from '../firebase';
import { useApp } from '../context/AppContext';

interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  text: string;
  createdAt: number;
  readBy: string[];
}

interface ConvEntry {
  conversationId: string;
  otherUid: string;
  otherName: string;
  productId: string;
  productDescription: string;
  productStatus: string;
  productImage: string;
}

function convId(uid1: string, uid2: string, productId: string) {
  return [uid1, uid2, productId].sort().join('_');
}

function timeAgo(ts: number) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return 'now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return new Date(ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function fmt12(ts: number) {
  return new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

export default function MessagesPage({ navData }: { navData?: any }) {
  const { products, currentUser, interests, sendNotification } = useApp();

  const [conversations, setConversations] = useState<ConvEntry[]>([]);
  const [selectedConv, setSelectedConv]   = useState<ConvEntry | null>(null);
  const [messages, setMessages]           = useState<Message[]>([]);
  const [allMessages, setAllMessages]     = useState<Message[]>([]);
  const [text, setText]                   = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  // Build conversation list from interests
  useEffect(() => {
    const convMap = new Map<string, ConvEntry>();
    interests.forEach(i => {
      const product = products.find(p => p.id === i.productId);
      if (!product) return;

      // Determine "other" party
      const iAmSeller = i.sellerId === currentUser.uid;
      const otherUid  = iAmSeller ? i.buyerId  : i.sellerId;
      const otherName = iAmSeller ? i.buyerName : product.sellerName;

      const cid = convId(currentUser.uid, otherUid, product.id);
      if (!convMap.has(cid)) {
        convMap.set(cid, {
          conversationId:     cid,
          otherUid,
          otherName,
          productId:          product.id,
          productDescription: product.description,
          productStatus:      product.status,
          productImage:       product.imageURL,
        });
      }
    });
    setConversations(Array.from(convMap.values()));
  }, [interests, products, currentUser.uid]);

  // Load all messages for unread counts
  useEffect(() => {
    if (conversations.length === 0) { setAllMessages([]); return; }
    const ids = conversations.map(c => c.conversationId).slice(0, 30);
    const q = query(collection(db, 'messages'), where('conversationId', 'in', ids));
    return onSnapshot(q, snap => {
      setAllMessages(snap.docs.map(d => ({ id: d.id, ...d.data() } as Message)));
    });
  }, [conversations]);

  // Handle navigation from notification
  useEffect(() => {
    if (!navData?.productId) return;
    const conv = conversations.find(c => c.productId === navData.productId);
    if (conv) setSelectedConv(conv);
  }, [navData, conversations]);

  // Load messages for selected conversation + mark as read
  useEffect(() => {
    if (!selectedConv) return;
    const q = query(collection(db, 'messages'), where('conversationId', '==', selectedConv.conversationId));
    const unsub = onSnapshot(q, snap => {
      const msgs = snap.docs
        .map(d => ({ id: d.id, ...d.data() } as Message))
        .sort((a, b) => a.createdAt - b.createdAt);
      setMessages(msgs);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 80);

      // Mark incoming messages as read
      msgs.forEach(m => {
        if (m.senderId !== currentUser.uid && !m.readBy.includes(currentUser.uid)) {
          updateDoc(doc(db, 'messages', m.id), { readBy: [...m.readBy, currentUser.uid] });
        }
      });

      // Mark related notifications as read
      getDocs(query(
        collection(db, 'notifications'),
        where('recipientId', '==', currentUser.uid),
        where('productId', '==', selectedConv.productId),
        where('type', '==', 'message'),
        where('isRead', '==', false)
      )).then(s => s.forEach(d => updateDoc(doc(db, 'notifications', d.id), { isRead: true })));
    });
    return () => unsub();
  }, [selectedConv, currentUser.uid]);

  const unread = (cid: string) =>
    allMessages.filter(m => m.conversationId === cid && m.senderId !== currentUser.uid && !m.readBy.includes(currentUser.uid)).length;

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || !selectedConv) return;

    // Optimistic: add message to local state immediately
    const tempMsg: Message = {
      id:             `temp_${Date.now()}`,
      conversationId: selectedConv.conversationId,
      senderId:       currentUser.uid,
      senderName:     currentUser.name,
      text:           trimmed,
      createdAt:      Date.now(),
      readBy:         [currentUser.uid],
    };
    setMessages(prev => [...prev, tempMsg]);
    setText('');
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);

    try {
      // Fire both writes in parallel
      const [msgRef] = await Promise.all([
        addDoc(collection(db, 'messages'), {
          conversationId: selectedConv.conversationId,
          senderId:   currentUser.uid,
          senderName: currentUser.name,
          text:       trimmed,
          createdAt:  tempMsg.createdAt,
          readBy:     [currentUser.uid],
        }),
        sendNotification({
          type:        'message',
          recipientId: selectedConv.otherUid,
          message:     `${currentUser.name}: ${trimmed.substring(0, 60)}`,
          productId:   selectedConv.productId,
          senderId:    currentUser.uid,
          senderName:  currentUser.name,
        }),
      ]);
      // Replace temp id with real id
      setMessages(prev => prev.map(m => m.id === tempMsg.id ? { ...tempMsg, id: msgRef.id } : m));
    } catch {
      // Remove optimistic message on failure
      setMessages(prev => prev.filter(m => m.id !== tempMsg.id));
      setText(trimmed);
    }
  };

  const isSold = selectedConv?.productStatus === 'sold';

  return (
    <div className="max-w-5xl mx-auto h-[calc(100vh-140px)] flex gap-4">

      {/* Conversation list */}
      <div className="w-72 flex-shrink-0 card flex flex-col overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900 text-sm">Messages</h2>
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
          {conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-12 text-gray-400 px-4 text-center">
              <span className="text-3xl mb-2">💬</span>
              <p className="text-sm">No conversations yet</p>
              <p className="text-xs mt-1">Show interest in a product to start chatting.</p>
            </div>
          ) : (
            conversations.map(conv => {
              const u = unread(conv.conversationId);
              const isActive = selectedConv?.conversationId === conv.conversationId;
              const lastMsg = allMessages
                .filter(m => m.conversationId === conv.conversationId)
                .sort((a, b) => b.createdAt - a.createdAt)[0];
              return (
                <button
                  key={conv.conversationId}
                  onClick={() => setSelectedConv(conv)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors ${isActive ? 'bg-brand-50' : ''}`}
                >
                  <img src={conv.productImage} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-gray-900 truncate">{conv.otherName}</p>
                      {lastMsg && <span className="text-xs text-gray-400 flex-shrink-0">{timeAgo(lastMsg.createdAt)}</span>}
                    </div>
                    <p className="text-xs text-gray-500 truncate mt-0.5">
                      {conv.productDescription.substring(0, 30)}…
                    </p>
                    {lastMsg && (
                      <p className={`text-xs truncate mt-0.5 ${u > 0 ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>
                        {lastMsg.senderId === currentUser.uid ? 'You: ' : ''}{lastMsg.text.substring(0, 35)}
                      </p>
                    )}
                  </div>
                  {u > 0 && (
                    <span className="min-w-[20px] h-5 bg-brand-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 flex-shrink-0">
                      {u}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 card flex flex-col overflow-hidden">
        {selectedConv ? (
          <>
            {/* Chat header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
              <img src={selectedConv.productImage} alt="" className="w-9 h-9 rounded-lg object-cover" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 text-sm">{selectedConv.otherName}</p>
                <p className="text-xs text-gray-400 truncate">{selectedConv.productDescription.substring(0, 50)}</p>
              </div>
              {isSold && (
                <span className="badge bg-gray-100 text-gray-500">Sold</span>
              )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {messages.map(msg => {
                const isMine = msg.senderId === currentUser.uid;
                return (
                  <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] ${isMine ? 'items-end' : 'items-start'} flex flex-col`}>
                      {!isMine && (
                        <p className="text-xs text-gray-400 mb-1 ml-1">{msg.senderName}</p>
                      )}
                      <div className={`px-3.5 py-2.5 rounded-2xl text-sm ${
                        isMine
                          ? 'bg-brand-600 text-white rounded-br-sm'
                          : 'bg-gray-100 text-gray-900 rounded-bl-sm'
                      }`}>
                        {msg.text}
                      </div>
                      <div className={`flex items-center gap-1 mt-1 ${isMine ? 'flex-row-reverse' : ''}`}>
                        <span className="text-[10px] text-gray-400">{fmt12(msg.createdAt)}</span>
                        {isMine && (
                          <span className={`text-[10px] ${msg.readBy.length > 1 ? 'text-brand-500' : 'text-gray-400'}`}>
                            {msg.readBy.length > 1 ? '✓✓' : '✓'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            {isSold ? (
              <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 text-center text-sm text-gray-500">
                🚫 This product has been sold — chat is closed.
              </div>
            ) : (
              <div className="flex items-center gap-2 px-4 py-3 border-t border-gray-100">
                <input
                  className="input flex-1"
                  type="text"
                  placeholder="Type a message…"
                  value={text}
                  onChange={e => setText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                />
                <button
                  onClick={handleSend}
                  disabled={!text.trim()}
                  className="btn-primary px-4 py-2.5 disabled:opacity-40"
                >
                  Send
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
            <span className="text-5xl mb-3">💬</span>
            <p className="font-medium">Select a conversation</p>
          </div>
        )}
      </div>
    </div>
  );
}
