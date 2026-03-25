import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot, setDoc, getDoc, updateDoc, increment } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from './lib/firebase';
import { UserProfile } from './types';

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
        // Listen to profile changes
        const profileRef = doc(db, 'users', firebaseUser.uid);
        
        unsubProfile = onSnapshot(profileRef, async (docSnap) => {
          if (docSnap.exists()) {
            const currentProfile = docSnap.data() as UserProfile;
            const isAdminEmail = firebaseUser.email === 'megadigital000004@gmail.com';
            
            // Force admin role if email matches but role is not admin
            if (isAdminEmail && currentProfile.role !== 'admin') {
              try {
                await setDoc(profileRef, { ...currentProfile, role: 'admin' }, { merge: true });
              } catch (error) {
                console.error("Failed to upgrade user to admin:", error);
              }
            }
            
            setProfile(currentProfile);
            setLoading(false);
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
              referrerId: referrerId || null,
              referralChain: referralChain.length > 0 ? referralChain : [],
              createdAt: new Date().toISOString(),
            } as UserProfile;
            try {
              await setDoc(profileRef, newProfile);
              
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
