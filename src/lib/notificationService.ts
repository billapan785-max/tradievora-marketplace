import { getToken, onMessage } from 'firebase/messaging';
import { doc, updateDoc, collection, getDocs, query, where, getDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, messaging, auth } from './firebase';
import { toast } from 'sonner';

// VAPID key is required for getToken. 
// You can get this from Firebase Console -> Project Settings -> Cloud Messaging -> Web Push certificates
const VAPID_KEY = process.env.VITE_FIREBASE_VAPID_KEY || '';

export const requestNotificationPermission = async () => {
  if (!messaging) return;
  
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const token = await getToken(messaging, { vapidKey: VAPID_KEY });
      if (token && auth.currentUser) {
        await updateDoc(doc(db, 'users', auth.currentUser.uid), {
          fcmToken: token
        });
        console.log('FCM Token generated and saved:', token);
        return token;
      }
    }
  } catch (error) {
    console.error('Error getting notification permission:', error);
  }
};

export const setupForegroundListener = () => {
  if (!messaging) return;
  
  onMessage(messaging, (payload) => {
    console.log('Foreground message received:', payload);
    toast.info(payload.notification?.title || 'New Notification', {
      description: payload.notification?.body,
    });
  });
};

export type NotificationType = 'message' | 'order' | 'listing' | 'system';

interface SendNotificationParams {
  toId: string;
  title: string;
  body: string;
  data: {
    type: NotificationType;
    id?: string;
  };
}

// Cloudflare Worker URL for sending notifications
const NOTIFICATION_WORKER_URL = process.env.VITE_NOTIFICATION_WORKER_URL || '';

export const sendNotification = async ({ toId, title, body, data }: SendNotificationParams) => {
  try {
    // 1. Save to Firestore for the bell icon list
    await addDoc(collection(db, 'notifications'), {
      userId: toId,
      title,
      body,
      type: data.type,
      relatedId: data.id || null,
      read: false,
      createdAt: new Date().toISOString()
    });

    // 2. Get the recipient's FCM token from Firestore
    const userDoc = await getDoc(doc(db, 'users', toId));
    if (!userDoc.exists()) return;
    
    const fcmToken = userDoc.data()?.fcmToken;
    if (!fcmToken) return;

    // 3. Send the notification via Cloudflare Worker backend
    if (!NOTIFICATION_WORKER_URL) {
      console.warn('VITE_NOTIFICATION_WORKER_URL not found. Notification not sent.');
      return;
    }

    const response = await fetch(`${NOTIFICATION_WORKER_URL}/send-notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fcmToken,
        title,
        body,
        data
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Worker notification send error:', errorData);
    }
  } catch (error) {
    console.error('Error sending notification via worker:', error);
  }
};

export const notifyAllBuyers = async (title: string, body: string, data: { type: NotificationType; id: string }) => {
  try {
    const buyersQuery = query(collection(db, 'users'), where('role', '==', 'buyer'));
    const buyersSnapshot = await getDocs(buyersQuery);
    
    const notifications = buyersSnapshot.docs.map(doc => {
      const fcmToken = doc.data().fcmToken;
      if (fcmToken) {
        return sendNotification({ toId: doc.id, title, body, data });
      }
      return null;
    });

    await Promise.all(notifications);
  } catch (error) {
    console.error('Error notifying all buyers:', error);
  }
};
