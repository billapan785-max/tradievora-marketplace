import React, { useState, useEffect, useRef } from 'react';
import { collection, query, where, onSnapshot, addDoc, orderBy, doc, updateDoc, serverTimestamp, setDoc, getDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { useAuth } from '../AuthContext';
import { SupportTicket, SupportMessage } from '../types';
import { Send, MessageSquare, Shield, Clock, User } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const HelpCenter: React.FC = () => {
  const { user, profile } = useAuth();
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    // Get or create ticket for this user
    const ticketId = user.uid;
    const unsubTicket = onSnapshot(doc(db, 'support_tickets', ticketId), (snapshot) => {
      if (snapshot.exists()) {
        setTicket({ id: snapshot.id, ...snapshot.data() } as SupportTicket);
      } else {
        // Create initial ticket if it doesn't exist
        const initialTicket: Partial<SupportTicket> = {
          userId: user.uid,
          userEmail: user.email || '',
          userName: profile?.displayName || 'User',
          lastMessage: 'Welcome to support!',
          status: 'open',
          unreadByAdmin: false,
          unreadByUser: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        setDoc(doc(db, 'support_tickets', ticketId), initialTicket);
      }
    });

    // Fetch messages
    const q = query(
      collection(db, 'support_messages'),
      where('ticketId', '==', ticketId),
      orderBy('createdAt', 'asc')
    );

    const unsubMessages = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SupportMessage)));
      setLoading(false);
      
      // Mark as read by user
      if (ticket?.unreadByUser) {
        updateDoc(doc(db, 'support_tickets', ticketId), { unreadByUser: false });
      }
    });

    return () => {
      unsubTicket();
      unsubMessages();
    };
  }, [user, profile, ticket?.unreadByUser]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newMessage.trim()) return;

    const text = newMessage.trim();
    setNewMessage('');

    try {
      await addDoc(collection(db, 'support_messages'), {
        ticketId: user.uid,
        senderId: user.uid,
        text,
        createdAt: new Date().toISOString()
      });

      await updateDoc(doc(db, 'support_tickets', user.uid), {
        lastMessage: text,
        unreadByAdmin: true,
        updatedAt: new Date().toISOString(),
        status: 'open'
      });
    } catch (error) {
      toast.error('Failed to send message');
    }
  };

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto py-20 text-center">
        <div className="h-20 w-20 bg-orange-600/10 rounded-3xl flex items-center justify-center mx-auto mb-6">
          <MessageSquare className="h-10 w-10 text-orange-500" />
        </div>
        <h1 className="text-4xl font-black text-white uppercase tracking-tighter mb-4">Help Center</h1>
        <p className="text-zinc-400 mb-8 max-w-md mx-auto">
          Please login to your account to chat with our support team. We are here to help you 24/7.
        </p>
        <a href="/login" className="inline-block px-8 py-4 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl font-black uppercase tracking-widest transition-all">
          Login to Chat
        </a>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="bg-orange-600/10 border border-orange-600/20 p-8 rounded-3xl">
        <div className="flex items-center space-x-4">
          <div className="h-12 w-12 bg-orange-600 rounded-2xl flex items-center justify-center">
            <Shield className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white uppercase tracking-tighter">Support Chat</h1>
            <p className="text-orange-500/70 text-sm font-bold uppercase tracking-widest">Direct line to platform administrators</p>
          </div>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden flex flex-col h-[600px]">
        {/* Chat Header */}
        <div className="p-4 border-b border-zinc-800 bg-zinc-900/50 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 bg-zinc-800 rounded-xl flex items-center justify-center">
              <User className="h-5 w-5 text-zinc-400" />
            </div>
            <div>
              <p className="text-white font-bold">Support Agent</p>
              <div className="flex items-center">
                <div className="h-2 w-2 bg-green-500 rounded-full mr-2"></div>
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Online</p>
              </div>
            </div>
          </div>
          <div className="px-3 py-1 bg-zinc-800 rounded-lg">
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Ticket #{user.uid.slice(-6)}</p>
          </div>
        </div>

        {/* Messages */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"
        >
          {messages.length === 0 && (
            <div className="text-center py-20">
              <MessageSquare className="h-12 w-12 text-zinc-800 mx-auto mb-4" />
              <p className="text-zinc-600 font-bold">Start a conversation with our team</p>
            </div>
          )}
          {messages.map((msg) => (
            <div 
              key={msg.id} 
              className={`flex ${msg.senderId === user.uid ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[80%] rounded-2xl p-4 ${
                msg.senderId === user.uid 
                  ? 'bg-orange-600 text-white rounded-tr-none' 
                  : 'bg-zinc-800 text-zinc-100 rounded-tl-none border border-zinc-700'
              }`}>
                <p className="text-sm leading-relaxed">{msg.text}</p>
                <p className={`text-[10px] mt-2 font-bold uppercase tracking-widest ${
                  msg.senderId === user.uid ? 'text-orange-200' : 'text-zinc-500'
                }`}>
                  {format(new Date(msg.createdAt), 'HH:mm')}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Input */}
        <form onSubmit={handleSendMessage} className="p-4 bg-zinc-900 border-t border-zinc-800">
          <div className="flex space-x-4">
            <input 
              type="text"
              placeholder="Type your message here..."
              className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-orange-500 transition-all"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
            />
            <button 
              type="submit"
              disabled={!newMessage.trim()}
              className="px-6 bg-orange-600 hover:bg-orange-700 disabled:bg-zinc-800 text-white rounded-xl font-bold transition-all flex items-center"
            >
              <Send className="h-5 w-5" />
            </button>
          </div>
        </form>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl">
          <Clock className="h-6 w-6 text-blue-500 mb-4" />
          <h3 className="text-white font-bold mb-2">Response Time</h3>
          <p className="text-sm text-zinc-500">Our average response time is under 30 minutes during business hours.</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl">
          <Shield className="h-6 w-6 text-green-500 mb-4" />
          <h3 className="text-white font-bold mb-2">Secure Support</h3>
          <p className="text-sm text-zinc-500">All conversations are encrypted and only accessible by authorized staff.</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl">
          <MessageSquare className="h-6 w-6 text-purple-500 mb-4" />
          <h3 className="text-white font-bold mb-2">24/7 Availability</h3>
          <p className="text-sm text-zinc-500">We have support agents across different timezones to assist you anytime.</p>
        </div>
      </div>
    </div>
  );
};

export default HelpCenter;
