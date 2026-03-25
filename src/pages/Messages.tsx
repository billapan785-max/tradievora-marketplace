import React, { useState, useEffect, useRef } from 'react';
import { collection, query, where, onSnapshot, addDoc, orderBy, doc, getDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../AuthContext';
import { Message, Order, Listing } from '../types';
import { Send, User, Shield, AlertCircle } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

const Messages: React.FC = () => {
  const { profile } = useAuth();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('order');
  const sellerId = searchParams.get('seller');
  const listingId = searchParams.get('listing');
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [order, setOrder] = useState<Order | null>(null);
  const [listing, setListing] = useState<Listing | null>(null);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!orderId && !listingId) return;

    if (orderId) {
      const fetchOrder = async () => {
        const orderSnap = await getDoc(doc(db, 'orders', orderId));
        if (orderSnap.exists()) {
          setOrder({ id: orderSnap.id, ...orderSnap.data() } as Order);
        }
      };
      fetchOrder();
    }

    if (listingId) {
      const fetchListing = async () => {
        const listingSnap = await getDoc(doc(db, 'listings', listingId));
        if (listingSnap.exists()) {
          setListing({ id: listingSnap.id, ...listingSnap.data() } as Listing);
        }
      };
      fetchListing();
    }

    const q = orderId 
      ? query(
          collection(db, 'messages'),
          where('orderId', '==', orderId),
          where('participants', 'array-contains', profile?.uid),
          orderBy('createdAt', 'asc')
        )
      : query(
          collection(db, 'messages'),
          where('listingId', '==', listingId),
          where('participants', 'array-contains', profile?.uid),
          orderBy('createdAt', 'asc')
        );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message)));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'messages');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [orderId, listingId, profile?.uid]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !profile || (!orderId && !listingId)) return;

    // Basic security check for contact info
    const contactPattern = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})|(\+?\d{1,3}[- ]?)?\d{10}/;
    if (contactPattern.test(inputText)) {
      toast.error('Sharing contact info is strictly prohibited for your safety.');
      return;
    }

    try {
      const messageData: any = {
        senderId: profile.uid,
        text: inputText,
        createdAt: new Date().toISOString(),
        participants: [profile.uid]
      };

      if (orderId) {
        if (!order) {
          toast.error('Order data still loading. Please wait.');
          return;
        }
        messageData.orderId = orderId;
        const otherId = order.buyerId === profile.uid ? order.sellerId : order.buyerId;
        if (!messageData.participants.includes(otherId)) {
          messageData.participants.push(otherId);
        }
      } else if (listingId && sellerId) {
        messageData.listingId = listingId;
        if (!messageData.participants.includes(sellerId)) {
          messageData.participants.push(sellerId);
        }
      }

      await addDoc(collection(db, 'messages'), messageData);
      setInputText('');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'messages');
      toast.error('Failed to send message');
    }
  };

  if (!orderId && !listingId) return <div className="text-center py-20 text-zinc-500">Select an order or listing to start messaging</div>;

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-200px)] flex flex-col bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="p-6 border-b border-zinc-800 bg-zinc-900/50 flex items-center justify-between">
        <div className="flex items-center">
          <div className="h-10 w-10 bg-orange-600/20 rounded-xl flex items-center justify-center mr-4">
            <Shield className="h-6 w-6 text-orange-500" />
          </div>
          <div>
            <h2 className="text-white font-bold">{order?.listingTitle || listing?.title || 'Chat'}</h2>
            <p className="text-zinc-500 text-xs">
              {orderId ? `Order #${orderId.slice(-8)}` : `Listing Inquiry`}
            </p>
          </div>
        </div>
        <div className="flex items-center text-xs text-zinc-500 bg-zinc-800 px-3 py-1 rounded-full">
          <AlertCircle className="h-3 w-3 mr-1 text-orange-500" />
          Secure Escrow Chat
        </div>
      </div>

      {/* Messages Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 scroll-smooth">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.senderId === profile?.uid ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] p-4 rounded-2xl text-sm ${
                msg.senderId === profile?.uid
                  ? 'bg-orange-600 text-white rounded-tr-none'
                  : 'bg-zinc-800 text-zinc-100 rounded-tl-none'
              }`}
            >
              <p className="leading-relaxed">{msg.text}</p>
              <div className={`text-[10px] mt-2 opacity-50 ${msg.senderId === profile?.uid ? 'text-right' : 'text-left'}`}>
                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}
        {messages.length === 0 && !loading && (
          <div className="text-center py-10">
            <p className="text-zinc-600 text-sm italic">No messages yet. Start the conversation!</p>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-6 border-t border-zinc-800 bg-zinc-900/50">
        <form onSubmit={handleSendMessage} className="flex gap-4">
          <input
            type="text"
            placeholder="Type your message securely..."
            className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-orange-500 transition-colors"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
          />
          <button
            type="submit"
            className="bg-orange-600 hover:bg-orange-700 text-white p-3 rounded-xl transition-all"
          >
            <Send className="h-6 w-6" />
          </button>
        </form>
        <p className="text-[10px] text-zinc-600 mt-3 text-center uppercase font-bold tracking-widest">
          Messages are monitored for security. Sharing contact info will lead to suspension.
        </p>
      </div>
    </div>
  );
};

export default Messages;
