import React, { useState, useEffect, useRef } from 'react';
import { Bell, MessageSquare, ShoppingBag, Tag, Info, Check, Trash2 } from 'lucide-react';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../AuthContext';
import { Notification } from '../types';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';

const NotificationBell: React.FC = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Notification[];
      setNotifications(notifs);
    }, (error) => {
      // Use handleFirestoreError if available, otherwise log it
      console.error("Notifications listener error:", error);
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read) {
      await updateDoc(doc(db, 'notifications', notification.id), { read: true });
    }

    setIsOpen(false);

    switch (notification.type) {
      case 'message':
        navigate(`/chat/${notification.relatedId}`);
        break;
      case 'order':
        navigate('/dashboard?tab=orders');
        break;
      case 'listing':
        navigate(`/listing/${notification.relatedId}`);
        break;
      default:
        break;
    }
  };

  const markAllAsRead = async () => {
    const batch = writeBatch(db);
    notifications.filter(n => !n.read).forEach(n => {
      batch.update(doc(db, 'notifications', n.id), { read: true });
    });
    await batch.commit();
  };

  const clearAll = async () => {
    const batch = writeBatch(db);
    notifications.forEach(n => {
      batch.delete(doc(db, 'notifications', n.id));
    });
    await batch.commit();
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'message': return <MessageSquare className="h-4 w-4 text-blue-500" />;
      case 'order': return <ShoppingBag className="h-4 w-4 text-green-500" />;
      case 'listing': return <Tag className="h-4 w-4 text-purple-500" />;
      default: return <Info className="h-4 w-4 text-zinc-500" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-zinc-400 hover:text-white transition-colors rounded-full hover:bg-zinc-800"
        id="notification-bell"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-zinc-950">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute right-0 mt-2 w-80 md:w-96 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl z-50 overflow-hidden"
          >
            <div className="p-4 border-bottom border-zinc-800 flex items-center justify-between bg-zinc-900/50 backdrop-blur-xl">
              <h3 className="text-sm font-bold text-white">Notifications</h3>
              <div className="flex gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-[10px] text-zinc-400 hover:text-white flex items-center gap-1 transition-colors"
                  >
                    <Check className="h-3 w-3" /> Mark all read
                  </button>
                )}
                {notifications.length > 0 && (
                  <button
                    onClick={clearAll}
                    className="text-[10px] text-zinc-400 hover:text-red-500 flex items-center gap-1 transition-colors"
                  >
                    <Trash2 className="h-3 w-3" /> Clear all
                  </button>
                )}
              </div>
            </div>

            <div className="max-height-[400px] overflow-y-auto custom-scrollbar">
              {notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-zinc-800 mb-3">
                    <Bell className="h-6 w-6 text-zinc-600" />
                  </div>
                  <p className="text-sm text-zinc-500">No notifications yet</p>
                </div>
              ) : (
                <div className="divide-y divide-zinc-800">
                  {notifications.map((notification) => (
                    <button
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      className={`w-full p-4 text-left hover:bg-zinc-800/50 transition-colors flex gap-3 items-start ${!notification.read ? 'bg-zinc-800/20' : ''}`}
                    >
                      <div className={`mt-1 p-2 rounded-lg ${!notification.read ? 'bg-zinc-800' : 'bg-transparent'}`}>
                        {getIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className={`text-sm font-semibold truncate ${!notification.read ? 'text-white' : 'text-zinc-400'}`}>
                            {notification.title}
                          </p>
                          <span className="text-[10px] text-zinc-500 whitespace-nowrap ml-2">
                            {new Date(notification.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-500 line-clamp-2 leading-relaxed">
                          {notification.body}
                        </p>
                      </div>
                      {!notification.read && (
                        <div className="mt-2 w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {notifications.length > 0 && (
              <div className="p-3 bg-zinc-900/50 border-top border-zinc-800 text-center">
                <button
                  onClick={() => {
                    setIsOpen(false);
                    navigate('/dashboard?tab=notifications');
                  }}
                  className="text-xs text-zinc-400 hover:text-white transition-colors"
                >
                  View all in dashboard
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationBell;
