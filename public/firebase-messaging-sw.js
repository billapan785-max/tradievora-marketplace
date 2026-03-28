// Import and configure the Firebase SDK
// These scripts are made available when the app is served or deployed on Firebase Hosting
// If not on Firebase Hosting, you need to import them from a CDN
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker by passing in
// your app's Firebase config object.
// We'll use a placeholder here and tell the user to update it.
// In a real app, this should match the config in firebase-applet-config.json.
firebase.initializeApp({
  projectId: "gen-lang-client-0279788162",
  appId: "1:255203367354:web:ea510e2746175028472583",
  apiKey: "AIzaSyBisquYoMqvBu6BrmI8IbOghNk77b5iR5Q",
  authDomain: "gen-lang-client-0279788162.firebaseapp.com",
  storageBucket: "gen-lang-client-0279788162.firebasestorage.app",
  messagingSenderId: "255203367354"
});

// Retrieve an instance of Firebase Messaging so that it can handle background messages.
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  // Customize notification here
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/firebase-logo.png', // Optional
    data: payload.data
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
