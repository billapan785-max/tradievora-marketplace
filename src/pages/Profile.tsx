import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc, collection, query, where, onSnapshot, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { UserProfile, Review } from '../types';
import { User, Star, Calendar, ShieldCheck, BadgeCheck, ShoppingBag, Award, Upload } from 'lucide-react';
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
        const docSnap = await getDoc(doc(db, 'users', uid));
        if (docSnap.exists()) {
          setProfile({ uid: docSnap.id, ...docSnap.data() } as UserProfile);
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `users/${uid}`);
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
      setProfile(prev => prev ? { ...prev, image_url: url } : null);
      toast.success("Profile image updated");
    } catch (error) {
      console.error(error);
      toast.error("Failed to upload image");
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
      <div className="bg-zinc-900 border border-zinc-800 rounded-[40px] p-8 md:p-12 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-orange-600/10 blur-[100px] -mr-32 -mt-32 rounded-full"></div>
        
        <div className="flex flex-col md:flex-row items-center md:items-start gap-8 relative z-10">
          <div className="relative">
            {profile.image_url ? (
              <img src={profile.image_url} alt={profile.displayName} className="h-32 w-32 rounded-[32px] object-cover shadow-2xl border border-zinc-700" referrerPolicy="no-referrer" />
            ) : (
              <div className="h-32 w-32 bg-zinc-800 rounded-[32px] flex items-center justify-center text-5xl font-black text-orange-500 shadow-2xl border border-zinc-700">
                {profile.displayName?.charAt(0) || profile.email.charAt(0).toUpperCase()}
              </div>
            )}
            {isOwner && (
              <label className="absolute bottom-0 right-0 bg-orange-600 p-2 rounded-full cursor-pointer hover:bg-orange-700 transition">
                <Upload className="h-4 w-4 text-white" />
                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
              </label>
            )}
          </div>
          
          <div className="flex-1 text-center md:text-left space-y-4">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
              <h1 className="text-4xl font-black text-white uppercase tracking-tighter">
                {profile.displayName || profile.email.split('@')[0]}
              </h1>
              {profile.isVerified && (
                <BadgeCheck className="h-6 w-6 text-blue-500" />
              )}
              <span className="px-4 py-1 bg-zinc-800 text-zinc-400 text-[10px] font-black uppercase tracking-widest rounded-full border border-zinc-700">
                {profile.role}
              </span>
            </div>
            
            <div className="flex flex-wrap justify-center md:justify-start gap-6 text-zinc-500 text-sm font-medium">
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-2 text-orange-500" />
                Joined {new Date(profile.createdAt).toLocaleDateString()}
              </div>
              <div className="flex items-center">
                <ShieldCheck className="h-4 w-4 mr-2 text-green-500" />
                Trust Score: {profile.trustScore}%
              </div>
            </div>

            <div className="flex flex-wrap justify-center md:justify-start gap-4 pt-4">
              <div className="bg-zinc-800/50 px-6 py-3 rounded-2xl border border-zinc-800">
                <div className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-1">Seller Rating</div>
                <div className="flex items-center text-xl font-black text-white">
                  <Star className="h-4 w-4 text-orange-500 fill-orange-500 mr-2" />
                  {getAverageRating(sellerReviews)}
                  <span className="text-xs text-zinc-500 font-bold ml-2">({sellerReviews.length} Reviews)</span>
                </div>
              </div>
              <div className="bg-zinc-800/50 px-6 py-3 rounded-2xl border border-zinc-800">
                <div className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-1">Buyer Rating</div>
                <div className="flex items-center text-xl font-black text-white">
                  <Star className="h-4 w-4 text-blue-500 fill-blue-500 mr-2" />
                  {getAverageRating(buyerReviews)}
                  <span className="text-xs text-zinc-500 font-bold ml-2">({buyerReviews.length} Reviews)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
// ... rest of the file ...

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
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
