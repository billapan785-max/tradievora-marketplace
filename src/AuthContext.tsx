import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot, setDoc, getDoc, updateDoc, increment } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from './lib/firebase';
import { UserProfile } from './types';
import { requestNotificationPermission, setupForegroundListener } from './lib/notificationService';

// ... (rest of the file)

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isAuthReady: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  isAuthReady: false,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    let unsubProfile: (() => void) | null = null;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      // Clean up previous profile listener if it exists
      if (unsubProfile) {
        unsubProfile();
        unsubProfile = null;
      }

      setUser(firebaseUser);
      setIsAuthReady(true);

      if (firebaseUser) {
        // Request notification permission and setup foreground listener
        requestNotificationPermission();
        setupForegroundListener();

        // Listen to profile changes
        const profileRef = doc(db, 'users', firebaseUser.uid);
        
        // Update lastSeen safely
        getDoc(profileRef).then(snap => {
          if (snap.exists()) {
            updateDoc(profileRef, { 
              lastSeen: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }).catch(err => console.error("Error updating lastSeen:", err));
          }
        });
        
        unsubProfile = onSnapshot(profileRef, async (docSnap) => {
          if (docSnap.exists()) {
            const currentProfile = docSnap.data() as UserProfile;
            const isAdminEmail = firebaseUser.email === 'megadigital000004@gmail.com';
            
            // Force admin role if email matches but role is not admin
            if (isAdminEmail && currentProfile.role !== 'admin') {
              try {
                await setDoc(profileRef, { ...currentProfile, role: 'admin', updatedAt: new Date().toISOString() }, { merge: true });
              } catch (error) {
                console.error("Failed to upgrade user to admin:", error);
              }
            }
            
            setProfile(currentProfile);
            setLoading(false);

            // Ensure public profile exists and is synced
            const publicProfileRef = doc(db, 'profiles', firebaseUser.uid);
            const publicProfileSnap = await getDoc(publicProfileRef);
            if (!publicProfileSnap.exists()) {
              await setDoc(publicProfileRef, {
                uid: firebaseUser.uid,
                displayName: currentProfile.displayName,
                role: currentProfile.role,
                isVerified: currentProfile.isVerified,
                trustScore: currentProfile.trustScore || 100,
                responseTime: currentProfile.responseTime || '1h',
                image_url: currentProfile.image_url || '',
                fcmToken: currentProfile.fcmToken || null,
                createdAt: currentProfile.createdAt,
                updatedAt: new Date().toISOString(),
                lastSeen: new Date().toISOString()
              });
            } else {
              // Sync lastSeen to public profile if it's been a while
              const publicData = publicProfileSnap.data();
              const lastSeen = publicData.lastSeen;
              const now = new Date();
              if (!lastSeen || (now.getTime() - new Date(lastSeen).getTime() > 300000)) { // 5 mins
                updateDoc(publicProfileRef, { 
                  lastSeen: now.toISOString(),
                  updatedAt: now.toISOString()
                }).catch(() => {});
              }
            }
          } else {
            // Profile doesn't exist, create it
            const isAdminEmail = firebaseUser.email === 'megadigital000004@gmail.com';
            
            // Check for referral in localStorage
            const referrerId = localStorage.getItem('referrerId');
            let referralChain: string[] = [];
            
            if (referrerId) {
              try {
                const referrerSnap = await getDoc(doc(db, 'users', referrerId));
                if (referrerSnap.exists()) {
                  const referrerData = referrerSnap.data() as UserProfile;
                  referralChain = [referrerId, ...(referrerData.referralChain || [])].slice(0, 5);
                }
              } catch (err) {
                console.error("Error fetching referrer:", err);
              }
            }

            const now = new Date().toISOString();
            const newProfile: UserProfile = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
              role: isAdminEmail ? 'admin' : 'buyer',
              availableBalance: 0,
              escrowBalance: 0,
              withdrawableBalance: 0,
              isSuspended: false,
              isVerified: false,
              trustScore: 100,
              responseTime: '1h',
              image_url: firebaseUser.photoURL || '',
              fcmToken: null,
              referrerId: referrerId || null,
              referralChain: referralChain.length > 0 ? referralChain : [],
              createdAt: now,
              updatedAt: now,
              lastSeen: now
            } as UserProfile;

            try {
              await setDoc(profileRef, newProfile);
              
              // Also create public profile
              await setDoc(doc(db, 'profiles', firebaseUser.uid), {
                uid: firebaseUser.uid,
                displayName: newProfile.displayName,
                role: newProfile.role,
                isVerified: false,
                trustScore: 100,
                responseTime: '1h',
                image_url: newProfile.image_url,
                fcmToken: null,
                createdAt: now,
                updatedAt: now,
                lastSeen: now
              });
              
              // If referred, create a referral record
              if (referrerId) {
                const referralId = `${referrerId}_${firebaseUser.uid}`;
                await setDoc(doc(db, 'referrals', referralId), {
                  id: referralId,
                  influencerId: referrerId,
                  referredUserId: firebaseUser.uid,
                  referredUserEmail: firebaseUser.email || '',
                  level: 1,
                  createdAt: new Date().toISOString()
                });

                // Update influencer stats
                const influencerRef = doc(db, 'influencers', referrerId);
                const influencerSnap = await getDoc(influencerRef);
                if (influencerSnap.exists()) {
                  await updateDoc(influencerRef, {
                    totalReferrals: increment(1)
                  });
                }
              }
              
              // Clear referral from storage after use
              localStorage.removeItem('referrerId');
            } catch (error) {
              handleFirestoreError(error, OperationType.WRITE, `users/${firebaseUser.uid}`);
            }
          }
        }, (error) => {
          handleFirestoreError(error, OperationType.GET, `users/${firebaseUser.uid}`);
        });
      } else {
        setProfile(null);
        setLoading(false);
        
        // Check URL for referral
        const urlParams = new URLSearchParams(window.location.search);
        const ref = urlParams.get('ref');
        if (ref) {
          localStorage.setItem('referrerId', ref);
        }
      }
    });

    return () => {
      unsubscribe();
      if (unsubProfile) unsubProfile();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading, isAuthReady }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
