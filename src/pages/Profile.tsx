import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc, collection, query, where, onSnapshot, updateDoc, setDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { UserProfile, Review } from '../types';
import { User, Star, Calendar, ShieldCheck, BadgeCheck, ShoppingBag, Award, Upload, Clock } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { uploadFile } from '../lib/upload';
import { toast } from 'sonner';

const Profile: React.FC = () => {
  const { uid } = useParams<{ uid: string }>();
  const { profile: currentUser } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [sellerReviews, setSellerReviews] = useState<Review[]>([]);
  const [buyerReviews, setBuyerReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const isOwner = currentUser?.uid === uid;

  useEffect(() => {
    if (!uid) return;

    const fetchProfile = async () => {
      try {
        // Try to fetch from profiles first for everyone
        let docSnap = await getDoc(doc(db, 'profiles', uid));
        
        // If it's the owner, we can also try to fetch from users to get private data
        // and ensure the public profile is synced
        if (isOwner) {
          const userSnap = await getDoc(doc(db, 'users', uid));
          if (userSnap.exists()) {
            const userData = userSnap.data() as UserProfile;
            setProfile({ uid: userSnap.id, ...userData });
            
            // Sync to profiles if missing or different
            if (!docSnap.exists()) {
              await setDoc(doc(db, 'profiles', uid), {
                uid: uid,
                displayName: userData.displayName,
                role: userData.role,
                isVerified: userData.isVerified,
                trustScore: userData.trustScore || 100,
                responseTime: userData.responseTime || '1h',
                image_url: userData.image_url || '',
                createdAt: userData.createdAt
              });
            }
          }
        } else if (docSnap.exists()) {
          setProfile({ uid: docSnap.id, ...docSnap.data() } as UserProfile);
        } else {
          // If profile doesn't exist and we are not owner, try users (will only work if logged in and rules allow)
          try {
            const userSnap = await getDoc(doc(db, 'users', uid));
            if (userSnap.exists()) {
              setProfile({ uid: userSnap.id, ...userSnap.data() } as UserProfile);
            }
          } catch (e) {
            console.log("Could not fetch user data (likely guest or no permission)");
          }
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();

    // Fetch reviews where this user is the seller
    const qSellerReviews = query(
      collection(db, 'reviews'), 
      where('toId', '==', uid),
      where('type', '==', 'buyer_to_seller')
    );
    const unsubSeller = onSnapshot(qSellerReviews, (snapshot) => {
      setSellerReviews(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Review)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'reviews');
    });

    // Fetch reviews where this user is the buyer
    const qBuyerReviews = query(
      collection(db, 'reviews'), 
      where('toId', '==', uid),
      where('type', '==', 'seller_to_buyer')
    );
    const unsubBuyer = onSnapshot(qBuyerReviews, (snapshot) => {
      setBuyerReviews(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Review)));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'reviews');
      setLoading(false);
    });

    return () => {
      unsubSeller();
      unsubBuyer();
    };
  }, [uid]);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !uid) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image must be less than 10MB");
      return;
    }

    setUploading(true);
    try {
      const url = await uploadFile(file, 'profiles/images', uid);
      await updateDoc(doc(db, 'users', uid), { image_url: url });
      await updateDoc(doc(db, 'profiles', uid), { image_url: url });
      setProfile(prev => prev ? { ...prev, image_url: url } : null);
      toast.success("Profile image updated");
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  const getAverageRating = (reviews: Review[]) => {
    if (reviews.length === 0) return '0.0';
    return (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-20">
        <User className="h-16 w-16 text-zinc-800 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-white">User not found</h2>
        <p className="text-zinc-500">The profile you are looking for does not exist.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-12 pb-20">
      {/* Profile Header */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-[32px] md:rounded-[40px] p-6 md:p-12 relative overflow-hidden w-full">
        <div className="absolute top-0 right-0 w-64 h-64 bg-orange-600/10 blur-[100px] -mr-32 -mt-32 rounded-full"></div>
        
        <div className="flex flex-col items-center md:flex-row md:items-start gap-6 md:gap-8 relative z-10 w-full">
          <div className="relative shrink-0">
            {profile.image_url ? (
              <img src={profile.image_url} alt={profile.displayName} className="h-24 w-24 md:h-32 md:w-32 rounded-2xl md:rounded-[32px] object-cover shadow-2xl border border-zinc-700" referrerPolicy="no-referrer" />
            ) : (
              <div className="h-24 w-24 md:h-32 md:w-32 bg-zinc-800 rounded-2xl md:rounded-[32px] flex items-center justify-center text-4xl md:text-5xl font-black text-orange-500 shadow-2xl border border-zinc-700">
                {profile.displayName?.charAt(0) || profile.email.charAt(0).toUpperCase()}
              </div>
            )}
            {isOwner && (
              <label className="absolute bottom-0 right-0 bg-orange-600 p-1.5 md:p-2 rounded-full cursor-pointer hover:bg-orange-700 transition">
                <Upload className="h-3 w-3 md:h-4 md:w-4 text-white" />
                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
              </label>
            )}
          </div>
          
          <div className="flex-1 text-center md:text-left space-y-3 w-full min-w-0">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 md:gap-3">
                {isOwner ? (
                  <input 
                    type="text"
                    className="text-2xl md:text-4xl font-black text-white uppercase tracking-tighter bg-transparent border-b border-zinc-800 focus:border-orange-500 focus:outline-none w-full md:w-auto text-center md:text-left"
                    defaultValue={profile.displayName}
                    onBlur={async (e) => {
                      if (e.target.value && e.target.value !== profile.displayName) {
                        try {
                          await updateDoc(doc(db, 'users', uid), { displayName: e.target.value });
                          await updateDoc(doc(db, 'profiles', uid), { displayName: e.target.value });
                          setProfile(prev => prev ? { ...prev, displayName: e.target.value } : null);
                          toast.success("Display name updated");
                        } catch (error) {
                          toast.error("Failed to update display name");
                        }
                      }
                    }}
                  />
                ) : (
                  <h1 className="text-2xl md:text-4xl font-black text-white uppercase tracking-tighter break-words w-full md:w-auto">
                    {profile.displayName || profile.email.split('@')[0]}
                  </h1>
                )}
                {profile.isVerified && (
                  <BadgeCheck className="h-5 w-5 md:h-6 md:w-6 text-blue-500 shrink-0" />
                )}
                <span className="px-3 py-0.5 md:px-4 md:py-1 bg-zinc-800 text-zinc-400 text-[9px] md:text-[10px] font-black uppercase tracking-widest rounded-full border border-zinc-700 shrink-0">
                  {profile.role}
                </span>
              </div>
            
            <div className="flex flex-wrap justify-center md:justify-start gap-3 md:gap-6 text-zinc-500 text-xs md:text-sm font-medium">
              <div className="flex items-center">
                <Calendar className="h-3 w-3 md:h-4 md:w-4 mr-1.5 md:mr-2 text-orange-500" />
                Joined {new Date(profile.createdAt).toLocaleDateString()}
              </div>
              <div className="flex items-center">
                <ShieldCheck className="h-3 w-3 md:h-4 md:w-4 mr-1.5 md:mr-2 text-green-500" />
                Trust Score: {profile.trustScore}%
              </div>
              <div className="flex items-center">
                <Clock className="h-3 w-3 md:h-4 md:w-4 mr-1.5 md:mr-2 text-zinc-500" />
                Response Time: {profile.responseTime || '1h'}
              </div>
            </div>

            <div className="flex flex-wrap justify-center md:justify-start gap-3 md:gap-4 pt-2 md:pt-4">
              <div className="bg-zinc-800/50 px-4 py-2 md:px-6 md:py-3 rounded-xl md:rounded-2xl border border-zinc-800">
                <div className="text-[9px] md:text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-0.5 md:mb-1">Seller Rating</div>
                <div className="flex items-center text-lg md:text-xl font-black text-white">
                  <Star className="h-3 w-3 md:h-4 md:w-4 text-orange-500 fill-orange-500 mr-1.5 md:mr-2" />
                  {getAverageRating(sellerReviews)}
                  <span className="text-[10px] md:text-xs text-zinc-500 font-bold ml-1.5 md:ml-2">({sellerReviews.length})</span>
                </div>
              </div>
              <div className="bg-zinc-800/50 px-4 py-2 md:px-6 md:py-3 rounded-xl md:rounded-2xl border border-zinc-800">
                <div className="text-[9px] md:text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-0.5 md:mb-1">Buyer Rating</div>
                <div className="flex items-center text-lg md:text-xl font-black text-white">
                  <Star className="h-3 w-3 md:h-4 md:w-4 text-blue-500 fill-blue-500 mr-1.5 md:mr-2" />
                  {getAverageRating(buyerReviews)}
                  <span className="text-[10px] md:text-xs text-zinc-500 font-bold ml-1.5 md:ml-2">({buyerReviews.length})</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Seller Reviews */}
        <div className="space-y-6">
          <div className="flex items-center space-x-4 mb-4">
            <div className="h-10 w-10 bg-orange-600/20 rounded-xl flex items-center justify-center">
              <ShoppingBag className="h-5 w-5 text-orange-500" />
            </div>
            <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Seller Feedback</h2>
          </div>
          
          <div className="bg-zinc-900 border border-zinc-800 rounded-[32px] p-8 space-y-8">
            {sellerReviews.length > 0 ? (
              sellerReviews.map(review => (
                <div key={review.id} className="border-b border-zinc-800 pb-8 last:border-0 last:pb-0">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 bg-zinc-800 rounded-xl flex items-center justify-center text-sm font-bold text-orange-500 border border-zinc-700">
                        {review.fromName?.charAt(0) || 'U'}
                      </div>
                      <div>
                        <div className="text-white font-bold">{review.fromName || 'User'}</div>
                        <div className="flex items-center text-orange-500 text-[10px] font-black">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} className={`h-2.5 w-2.5 ${i < review.rating ? 'fill-current' : 'text-zinc-700'}`} />
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="text-zinc-500 text-xs font-medium">{new Date(review.createdAt).toLocaleDateString()}</div>
                  </div>
                  <p className="text-zinc-400 text-sm leading-relaxed pl-13">{review.comment}</p>
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-zinc-600 font-medium italic">
                No seller reviews yet.
              </div>
            )}
          </div>
        </div>

        {/* Buyer Reviews */}
        <div className="space-y-6">
          <div className="flex items-center space-x-4 mb-4">
            <div className="h-10 w-10 bg-blue-600/20 rounded-xl flex items-center justify-center">
              <Award className="h-5 w-5 text-blue-500" />
            </div>
            <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Buyer Feedback</h2>
          </div>
          
          <div className="bg-zinc-900 border border-zinc-800 rounded-[32px] p-8 space-y-8">
            {buyerReviews.length > 0 ? (
              buyerReviews.map(review => (
                <div key={review.id} className="border-b border-zinc-800 pb-8 last:border-0 last:pb-0">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 bg-zinc-800 rounded-xl flex items-center justify-center text-sm font-bold text-blue-500 border border-zinc-700">
                        {review.fromName?.charAt(0) || 'U'}
                      </div>
                      <div>
                        <div className="text-white font-bold">{review.fromName || 'User'}</div>
                        <div className="flex items-center text-blue-500 text-[10px] font-black">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} className={`h-2.5 w-2.5 ${i < review.rating ? 'fill-current' : 'text-zinc-700'}`} />
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="text-zinc-500 text-xs font-medium">{new Date(review.createdAt).toLocaleDateString()}</div>
                  </div>
                  <p className="text-zinc-400 text-sm leading-relaxed pl-13">{review.comment}</p>
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-zinc-600 font-medium italic">
                No buyer reviews yet.
              </div>
            )}
            
            {isOwner && (
              <div className="pt-6 border-t border-zinc-800 mt-6">
                <h3 className="text-white font-bold mb-4">Seller Settings</h3>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <label className="block text-zinc-500 text-xs font-bold uppercase mb-2">Response Time</label>
                    <input 
                      type="text" 
                      placeholder="e.g. 1 hour, 30 mins"
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-orange-500"
                      defaultValue={profile.responseTime}
                      onBlur={async (e) => {
                        if (e.target.value !== profile.responseTime) {
                          try {
                            await updateDoc(doc(db, 'users', uid), { responseTime: e.target.value });
                            await updateDoc(doc(db, 'profiles', uid), { responseTime: e.target.value });
                            setProfile(prev => prev ? { ...prev, responseTime: e.target.value } : null);
                            toast.success("Response time updated");
                          } catch (error) {
                            toast.error("Failed to update response time");
                          }
                        }
                      }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
