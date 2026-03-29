import React, { useState, useEffect, useRef } from 'react';
import { collection, query, where, onSnapshot, addDoc, orderBy, doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../AuthContext';
import { Message, Order, Listing, UserProfile } from '../types';
import { Send, User, Shield, AlertCircle, Paperclip, FileText, Image as ImageIcon, Video, X, MessageSquare, Mic, Square } from 'lucide-react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { getOptimizedImageUrl } from '../lib/imageUtils';
import { toast } from 'sonner';
import { uploadFile } from '../lib/upload';
import { sendNotification } from '../lib/notificationService';

const Messages: React.FC = () => {
  const { profile } = useAuth();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('order');
  const sellerId = searchParams.get('seller');
  const listingId = searchParams.get('listing');
  
  const [otherUser, setOtherUser] = useState<UserProfile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [order, setOrder] = useState<Order | null>(null);
  const [listing, setListing] = useState<Listing | null>(null);
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isOtherUserTyping, setIsOtherUserTyping] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const [conversations, setConversations] = useState<any[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(false);

  const updateTypingStatus = async (isTyping: boolean) => {
    if (!profile || (!orderId && !listingId)) return;
    const typingRef = doc(db, 'typing_status', `${orderId || listingId}_${profile.uid}`);
    if (isTyping) {
      await setDoc(typingRef, {
        orderId: orderId || null,
        listingId: listingId || null,
        userId: profile.uid,
        updatedAt: new Date().toISOString()
      });
    } else {
      await deleteDoc(typingRef);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await uploadVoiceMessage(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
      toast.error('Could not access microphone');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const uploadVoiceMessage = async (blob: Blob) => {
    if (orderId && !order) {
      toast.error('Order data still loading. Please wait.');
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', blob, 'voice-message.webm');
      formData.append('folder', 'voice-messages');
      formData.append('userId', profile?.uid || 'unknown');

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "Upload failed");
        throw new Error(`Upload failed: ${errorText}`);
      }

      const contentType = response.headers.get("content-type");
      let audioUrl = '';
      if (contentType && contentType.includes("application/json")) {
        const data = await response.json();
        audioUrl = data.url;
      } else {
        const text = await response.text();
        throw new Error(`Server returned non-JSON response: ${text.substring(0, 100)}`);
      }

      const messageData: any = {
        senderId: profile?.uid,
        type: 'voice',
        audio: audioUrl,
        createdAt: new Date().toISOString(),
        participants: [profile?.uid]
      };

      if (orderId) {
        messageData.orderId = orderId;
        const otherId = order?.buyerId === profile?.uid ? order?.sellerId : order?.buyerId;
        if (otherId && !messageData.participants.includes(otherId)) {
          messageData.participants.push(otherId);
        }
      } else if (listingId && sellerId) {
        messageData.listingId = listingId;
        if (!messageData.participants.includes(sellerId)) {
          messageData.participants.push(sellerId);
        }
      }

      await addDoc(collection(db, 'messages'), messageData);
      
      // Send notification
      const otherId = orderId 
        ? (order?.buyerId === profile?.uid ? order?.sellerId : order?.buyerId)
        : sellerId;
      
      if (otherId) {
        sendNotification({
          toId: otherId,
          title: `New Voice Message from ${profile?.displayName}`,
          body: 'Sent a voice message',
          data: { type: 'message', id: orderId ? `?order=${orderId}` : `?listing=${listingId}&seller=${sellerId}` }
        });
      }

      toast.success('Voice message sent');
    } catch (error) {
      console.error(error);
      toast.error('Failed to upload voice message');
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    if (!profile?.uid || orderId || listingId) return;

    setLoadingConversations(true);
    const q = query(
      collection(db, 'messages'),
      where('participants', 'array-contains', profile.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const allMessages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
      
      // Group by orderId or listingId
      const grouped: { [key: string]: Message } = {};
      allMessages.forEach(msg => {
        const key = msg.orderId || msg.listingId || 'direct';
        if (!grouped[key]) {
          grouped[key] = msg;
        }
      });

      const convos = await Promise.all(Object.values(grouped).map(async (lastMsg) => {
        const otherId = lastMsg.participants.find(id => id !== profile.uid);
        let otherUser: UserProfile | null = null;
        if (otherId) {
          const userSnap = await getDoc(doc(db, 'profiles', otherId));
          if (userSnap.exists()) {
            otherUser = { uid: userSnap.id, ...userSnap.data() } as UserProfile;
          }
        }

        let title = 'Conversation';
        if (lastMsg.orderId) {
          const orderSnap = await getDoc(doc(db, 'orders', lastMsg.orderId));
          if (orderSnap.exists()) {
            title = `Order #${orderSnap.id.slice(-6)}`;
          }
        } else if (lastMsg.listingId) {
          const listingSnap = await getDoc(doc(db, 'listings', lastMsg.listingId));
          if (listingSnap.exists()) {
            title = listingSnap.data().title;
          }
        }

        return {
          id: lastMsg.id,
          lastMessage: lastMsg,
          otherUser,
          title,
          orderId: lastMsg.orderId,
          listingId: lastMsg.listingId
        };
      }));

      setConversations(convos);
      setLoadingConversations(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'messages');
      setLoadingConversations(false);
    });

    return () => unsubscribe();
  }, [profile?.uid, orderId, listingId]);

  useEffect(() => {
    if (!profile?.uid || (!orderId && !listingId)) return;
    setLoading(true);

    if (orderId) {
      const fetchOrder = async () => {
        const orderSnap = await getDoc(doc(db, 'orders', orderId));
        if (orderSnap.exists()) {
          const orderData = { id: orderSnap.id, ...orderSnap.data() } as Order;
          setOrder(orderData);
          
          // Fetch other user profile
          const otherId = orderData.buyerId === profile?.uid ? orderData.sellerId : orderData.buyerId;
          const userSnap = await getDoc(doc(db, 'profiles', otherId));
          if (userSnap.exists()) {
            setOtherUser({ uid: userSnap.id, ...userSnap.data() } as UserProfile);
          }
        }
      };
      fetchOrder();
    }

    if (listingId) {
      const fetchListing = async () => {
        const listingSnap = await getDoc(doc(db, 'listings', listingId));
        if (listingSnap.exists()) {
          setListing({ id: listingSnap.id, ...listingSnap.data() } as Listing);
          
          // Fetch seller profile
          if (sellerId) {
            const userSnap = await getDoc(doc(db, 'profiles', sellerId));
            if (userSnap.exists()) {
              setOtherUser({ uid: userSnap.id, ...userSnap.data() } as UserProfile);
            }
          }
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

    // Listen for other user's typing status
    const otherId = orderId 
      ? (order?.buyerId === profile?.uid ? order?.sellerId : order?.buyerId)
      : sellerId;
    
    let unsubTyping = () => {};
    if (otherId) {
      const typingQ = query(
        collection(db, 'typing_status'),
        where('userId', '==', otherId),
        where(orderId ? 'orderId' : 'listingId', '==', orderId || listingId)
      );
      unsubTyping = onSnapshot(typingQ, (snapshot) => {
        setIsOtherUserTyping(!snapshot.empty);
      });
    }

    return () => {
      unsubscribe();
      unsubTyping();
    };
  }, [orderId, listingId, profile?.uid, order, sellerId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleFileUpload = async (file: File | undefined) => {
    if (!file || !profile || (!orderId && !listingId)) return;
    if (orderId && !order) {
      toast.error('Order data still loading. Please wait.');
      return;
    }

    setUploading(true);
    try {
      let folder = 'chat/files';
      let type = 'file';
      if (file.type.startsWith('image/')) {
        folder = 'chat/images';
        type = 'image';
      } else if (file.type.startsWith('video/')) {
        folder = 'chat/videos';
        type = 'video';
      }

      const url = await uploadFile(file, folder, profile.uid);
      
      const messageData: any = {
        senderId: profile.uid,
        type,
        url,
        createdAt: new Date().toISOString(),
        participants: [profile.uid]
      };

      if (orderId) {
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
      
      // Send notification to the other user
      const otherId = orderId 
        ? (order?.buyerId === profile?.uid ? order?.sellerId : order?.buyerId)
        : sellerId;
      
      if (otherId) {
        sendNotification({
          toId: otherId,
          title: `New File from ${profile.displayName}`,
          body: `Sent a ${type}: ${file.name}`,
          data: { type: 'message', id: orderId ? `?order=${orderId}` : `?listing=${listingId}&seller=${sellerId}` }
        });
      }

      toast.success('File uploaded');
    } catch (error) {
      toast.error('Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

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
        type: 'text',
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
      
      // Send notification to the other user
      const otherId = orderId 
        ? (order.buyerId === profile.uid ? order.sellerId : order.buyerId)
        : sellerId;
      
      if (otherId) {
        sendNotification({
          toId: otherId,
          title: `New Message from ${profile.displayName}`,
          body: inputText.length > 50 ? inputText.substring(0, 50) + '...' : inputText,
          data: { type: 'message', id: orderId ? `?order=${orderId}` : `?listing=${listingId}&seller=${sellerId}` }
        });
      }

      setInputText('');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'messages');
      toast.error('Failed to send message');
    }
  };

  if (!orderId && !listingId) {
    return (
      <div className="w-full h-[calc(100dvh-232px)] md:h-[calc(100vh-180px)] md:max-w-4xl md:mx-auto md:rounded-3xl flex flex-col bg-zinc-900 border border-zinc-800 overflow-hidden shadow-2xl relative">
        <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <MessageSquare className="h-6 w-6 text-orange-500" />
            Messages
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {loadingConversations ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
            </div>
          ) : conversations.length > 0 ? (
            conversations.map((convo) => (
              <div
                key={convo.id}
                onClick={() => {
                  if (convo.orderId) navigate(`/messages?order=${convo.orderId}`);
                  else if (convo.listingId) navigate(`/messages?listing=${convo.listingId}${convo.otherUser ? `&seller=${convo.otherUser.uid}` : ''}`);
                }}
                className="bg-zinc-800/50 border border-zinc-700 p-4 rounded-2xl hover:border-orange-500/50 transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-zinc-700 flex items-center justify-center overflow-hidden">
                    {convo.otherUser?.image_url ? (
                      <img src={getOptimizedImageUrl(convo.otherUser.image_url, 100)} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <User className="h-6 w-6 text-zinc-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-white font-medium truncate group-hover:text-orange-500 transition-colors">
                        {convo.title}
                      </h3>
                      <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">
                        {new Date(convo.lastMessage.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-zinc-400 text-sm truncate">
                      {convo.otherUser?.displayName || 'User'}: {convo.lastMessage.type === 'text' ? convo.lastMessage.text : `Sent a ${convo.lastMessage.type}`}
                    </p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-20">
              <div className="bg-zinc-800/50 h-20 w-20 rounded-full flex items-center justify-center mx-auto mb-4 border border-zinc-700">
                <MessageSquare className="h-10 w-10 text-zinc-600" />
              </div>
              <h3 className="text-white font-medium mb-2">No conversations yet</h3>
              <p className="text-zinc-500 text-sm max-w-xs mx-auto">
                When you start chatting with sellers or buyers, your conversations will appear here.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-[calc(100dvh-232px)] md:h-[calc(100vh-180px)] md:max-w-4xl md:mx-auto md:rounded-3xl flex flex-col bg-zinc-900 border border-zinc-800 overflow-hidden shadow-2xl relative">
      {/* Header */}
      <div className="p-4 md:p-6 border-b border-zinc-800 bg-zinc-900/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center">
          <button 
            onClick={() => navigate(-1)}
            className="md:hidden mr-3 p-2 bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="h-10 w-10 bg-orange-600/20 rounded-xl flex items-center justify-center mr-4 flex-shrink-0">
            <Shield className="h-6 w-6 text-orange-500" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-white font-bold truncate">{order?.listingTitle || listing?.title || 'Chat'}</h2>
            <div className="flex items-center gap-2">
              <p className="text-zinc-500 text-xs truncate">
                {orderId ? `Order #${orderId.slice(-8)}` : `Listing Inquiry`}
              </p>
              {otherUser && (
                <>
                  <span className="text-zinc-700">•</span>
                  <Link 
                    to={otherUser.role === 'seller' ? `/seller/${otherUser.uid}` : `/profile/${otherUser.uid}`}
                    className="text-orange-500 text-xs font-bold hover:underline truncate"
                  >
                    {otherUser.displayName || 'User'}
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between md:justify-end gap-4">
          <div className="flex items-center text-xs text-zinc-500 bg-zinc-800 px-3 py-1 rounded-full">
            <AlertCircle className="h-3 w-3 mr-1 text-orange-500" />
            Secure Escrow Chat
          </div>
          <button 
            onClick={() => navigate(-1)}
            className="hidden md:flex p-2 bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 md:p-6 flex flex-col space-y-3 md:space-y-4 scroll-smooth relative">
        {messages.length === 0 && !loading && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-zinc-600 text-sm italic">No messages yet. Start the conversation!</p>
          </div>
        )}
        {messages.map((msg, index) => (
          <div
            key={msg.id}
            className={`flex ${msg.senderId === profile?.uid ? 'justify-end' : 'justify-start'} ${index === 0 ? 'mt-auto' : ''}`}
          >
            <div
              className={`max-w-[85%] md:max-w-[75%] px-3 py-2 md:px-4 md:py-3 rounded-2xl text-[13px] md:text-sm inline-block ${
                msg.senderId === profile?.uid
                  ? 'bg-orange-600 text-white rounded-tr-none'
                  : 'bg-zinc-800 text-zinc-100 rounded-tl-none'
              }`}
            >
              <div className="leading-relaxed break-words">
                {msg.type === 'voice' && <audio controls src={msg.audio} className="max-w-full h-8 md:h-10" />}
                {msg.type === 'text' && msg.text}
                {msg.type === 'image' && <img src={getOptimizedImageUrl(msg.url, 400)} alt="Message" className="max-w-full rounded-lg" loading="lazy" />}
                {msg.type === 'video' && <video src={msg.url} controls className="max-w-full rounded-lg" />}
                {msg.type === 'file' && (
                  <a href={msg.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-white underline">
                    <FileText className="h-4 w-4" />
                    Download File
                  </a>
                )}
              </div>
              <div className={`text-[10px] mt-1 opacity-50 ${msg.senderId === profile?.uid ? 'text-right' : 'text-left'}`}>
                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}
        {isOtherUserTyping && (
          <div className={`flex justify-start ${messages.length === 0 ? 'mt-auto' : ''}`}>
            <div className="bg-zinc-800/50 text-zinc-400 px-3 py-2 md:px-4 md:py-3 rounded-2xl rounded-tl-none text-xs italic inline-flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
              <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
              <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-2 md:p-4 border-t border-zinc-800 bg-zinc-900/50">
        <form onSubmit={handleSendMessage} className="flex gap-1.5 md:gap-3 items-end">
          <input
            type="file"
            accept="image/*,application/pdf,application/zip,application/vnd.openxmlformats-officedocument.wordprocessingml.document,video/mp4"
            onChange={(e) => handleFileUpload(e.target.files?.[0])}
            className="hidden"
            id="file-upload"
            disabled={uploading}
          />
          <label htmlFor="file-upload" className={`cursor-pointer flex-shrink-0 bg-zinc-800 hover:bg-zinc-700 text-white p-2 md:p-3 rounded-xl transition-all flex items-center justify-center h-10 w-10 min-w-[40px] md:h-12 md:w-12 md:min-w-[48px] ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
            <Paperclip className="h-4 w-4 md:h-5 md:w-5" />
          </label>
          <button
            type="button"
            onClick={isRecording ? stopRecording : startRecording}
            className={`flex-shrink-0 rounded-xl transition-all flex items-center justify-center h-10 w-10 min-w-[40px] md:h-12 md:w-12 md:min-w-[48px] ${isRecording ? 'bg-red-600 animate-pulse' : 'bg-zinc-800 hover:bg-zinc-700 text-white'}`}
            title={isRecording ? "Stop Recording" : "Start Recording"}
          >
            {isRecording ? <Square className="h-4 w-4 md:h-5 md:w-5 fill-current" /> : <Mic className="h-4 w-4 md:h-5 md:w-5" />}
          </button>
          <div className="flex-1 min-w-0 relative">
            <textarea
              rows={1}
              placeholder={isRecording ? "Recording..." : "Type a message..."}
              disabled={isRecording}
              className={`w-full bg-zinc-800 border border-zinc-700 rounded-xl py-2.5 px-3 md:py-3 md:px-4 text-sm md:text-base text-white focus:outline-none focus:border-orange-500 transition-colors resize-none overflow-hidden min-h-[40px] md:min-h-[48px] max-h-[120px] ${isRecording ? 'opacity-50 cursor-not-allowed' : ''}`}
              value={inputText}
              onChange={(e) => {
                setInputText(e.target.value);
                updateTypingStatus(e.target.value.length > 0);
                e.target.style.height = 'auto';
                e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage(e);
                }
              }}
            />
          </div>
          <button
            type="submit"
            disabled={(!inputText.trim() && !uploading) || isRecording}
            className="bg-orange-600 flex-shrink-0 hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl transition-all flex items-center justify-center h-10 w-10 min-w-[40px] md:h-12 md:w-12 md:min-w-[48px]"
          >
            <Send className="h-4 w-4 md:h-5 md:w-5" />
          </button>
        </form>
        <p className="text-[9px] md:text-[10px] text-zinc-600 mt-2 text-center uppercase font-bold tracking-widest px-2">
          Messages are monitored for security. Sharing contact info will lead to suspension.
        </p>
      </div>
    </div>
  );
};

export default Messages;
