import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, getDoc, collection, query, where, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Listing, UserProfile, Review } from '../types';
import { Star, BadgeCheck, Clock, Shield, MessageSquare, Search, ArrowLeft } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { setDoc } from 'firebase/firestore';

const SellerProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { profile: currentUserProfile } = useAuth();
  const [seller, setSeller] = useState<UserProfile | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSellerData = async () => {
      if (!id) return;

      try {
        // Fetch Seller Profile from public profiles collection
        let sellerSnap = await getDoc(doc(db, 'profiles', id));
        
        if (sellerSnap.exists()) {
          setSeller({ uid: sellerSnap.id, ...sellerSnap.data() } as UserProfile);
        } else {
          // Fallback to users collection if profile doesn't exist yet
          try {
            const userSnap = await getDoc(doc(db, 'users', id));
            if (userSnap.exists()) {
              const userData = userSnap.data() as UserProfile;
              setSeller({ uid: userSnap.id, ...userData } as UserProfile);
              
              // If viewer is admin, migrate this old profile to the public profiles collection
              if (currentUserProfile?.role === 'admin') {
                try {
                  await setDoc(doc(db, 'profiles', id!), {
                    uid: id,
                    displayName: userData.displayName || 'User',
                    role: userData.role || 'seller',
                    isVerified: userData.isVerified || false,
                    trustScore: userData.trustScore || 100,
                    responseTime: userData.responseTime || '1h',
                    image_url: userData.image_url || '',
                    createdAt: userData.createdAt || new Date().toISOString()
                  });
                } catch (migrateErr) {
                  console.error("Failed to migrate profile:", migrateErr);
                }
              }
            }
          } catch (err) {
            console.log("Could not fetch from users collection (likely permission denied for guest)");
          }
        }

        // Fetch Seller's Listings
        const qListings = query(
          collection(db, 'listings'),
          where('sellerId', '==', id),
          where('status', '==', 'active')
        );
        const unsubListings = onSnapshot(qListings, (snapshot) => {
          setListings(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Listing)));
        }, (error) => {
          handleFirestoreError(error, OperationType.LIST, 'listings');
        });

        // Fetch Seller's Reviews
        const qReviews = query(
          collection(db, 'reviews'),
          where('toId', '==', id),
          where('type', '==', 'buyer_to_seller')
        );
        const unsubReviews = onSnapshot(qReviews, (snapshot) => {
          setReviews(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Review)));
        }, (error) => {
          handleFirestoreError(error, OperationType.LIST, 'reviews');
        });

        setLoading(false);

        return () => {
          unsubListings();
          unsubReviews();
        };
      } catch (error) {
        console.error("Error fetching seller data:", error);
        setLoading(false);
      }
    };

    fetchSellerData();
  }, [id]);

  const averageRating = reviews.length > 0
    ? (reviews.reduce((acc, review) => acc + review.rating, 0) / reviews.length).toFixed(1)
    : '0.0';

  if (loading) return <div className="animate-pulse space-y-8"><div className="h-96 bg-zinc-900 rounded-3xl"></div></div>;
  if (!seller) return <div className="text-center py-20 text-zinc-500">Seller not found</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Link to="/marketplace" className="inline-flex items-center text-zinc-500 hover:text-white mb-8 transition-colors">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Marketplace
      </Link>

      {/* Seller Header */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-[3rem] p-8 md:p-12 mb-12 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-orange-600/5 blur-[100px] -mr-32 -mt-32 rounded-full"></div>
        
        <div className="flex flex-col md:flex-row items-center md:items-start gap-8 relative z-10">
          <div className="relative">
            {seller.image_url ? (
              <img 
                src={seller.image_url} 
                alt={seller.displayName} 
                className="h-32 w-32 rounded-[2.5rem] object-cover shadow-xl border border-zinc-700"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="h-32 w-32 bg-zinc-800 rounded-[2.5rem] flex items-center justify-center text-5xl font-bold text-orange-500 shadow-xl border border-zinc-700">
                {seller.displayName?.charAt(0) || 'S'}
              </div>
            )}
          </div>
          
          <div className="flex-1 text-center md:text-left">
            <div className="flex flex-col md:flex-row md:items-center gap-4 mb-4">
              <h1 className="text-4xl font-extrabold text-white">{seller.displayName}</h1>
              {seller.isVerified && (
                <div className="flex items-center px-3 py-1 bg-blue-600/20 text-blue-500 rounded-full text-xs font-bold uppercase tracking-wider self-center md:self-auto">
                  <BadgeCheck className="h-4 w-4 mr-1" />
                  Verified Seller
                </div>
              )}
            </div>
            
            <p className="text-zinc-500 mb-6">Member since {seller.createdAt ? new Date(seller.createdAt).toLocaleDateString() : 'Recent'}</p>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-zinc-800/50 p-4 rounded-3xl border border-zinc-800">
                <div className="text-zinc-500 text-[10px] uppercase font-bold tracking-widest mb-1">Trust Score</div>
                <div className="text-2xl font-black text-white">{seller.trustScore ?? 100}%</div>
              </div>
              <div className="bg-zinc-800/50 p-4 rounded-3xl border border-zinc-800">
                <div className="text-zinc-500 text-[10px] uppercase font-bold tracking-widest mb-1">Rating</div>
                <div className="text-2xl font-black text-orange-500 flex items-center justify-center md:justify-start">
                  <Star className="h-5 w-5 fill-current mr-1" />
                  {averageRating}
                </div>
              </div>
              <div className="bg-zinc-800/50 p-4 rounded-3xl border border-zinc-800">
                <div className="text-zinc-500 text-[10px] uppercase font-bold tracking-widest mb-1">Response</div>
                <div className="text-2xl font-black text-white flex items-center justify-center md:justify-start">
                  <Clock className="h-5 w-5 mr-1 text-zinc-500" />
                  {seller.responseTime || '1h'}
                </div>
              </div>
              <div className="bg-zinc-800/50 p-4 rounded-3xl border border-zinc-800">
                <div className="text-zinc-500 text-[10px] uppercase font-bold tracking-widest mb-1">Listings</div>
                <div className="text-2xl font-black text-white">{listings.length}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Listings Section */}
        <div className="lg:col-span-2 space-y-8">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-2xl font-bold text-white">Seller Listings</h2>
            <span className="text-zinc-500 text-sm font-bold">{listings.length} Active</span>
          </div>
          
          {listings.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {listings.map((listing) => (
                <Link 
                  key={listing.id} 
                  to={`/listing/${listing.id}`}
                  className="group bg-zinc-900 border border-zinc-800 rounded-[2.5rem] overflow-hidden hover:border-orange-500/50 transition-all hover:shadow-2xl hover:shadow-orange-900/10"
                >
                  <div className="aspect-[4/3] relative overflow-hidden bg-zinc-800">
                    {listing.image_url ? (
                      <img 
                        src={listing.image_url} 
                        alt={listing.title} 
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Shield className="h-12 w-12 text-zinc-700" />
                      </div>
                    )}
                    <div className="absolute top-4 left-4">
                      <span className="px-3 py-1 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold uppercase rounded-full tracking-wider border border-white/10">
                        {listing.category}
                      </span>
                    </div>
                  </div>
                  <div className="p-6">
                    <h3 className="text-white font-bold mb-2 line-clamp-1 group-hover:text-orange-500 transition-colors">{listing.title}</h3>
                    <div className="flex items-center justify-between">
                      <div className="text-xl font-black text-white">
                        {listing.price} <span className="text-[10px] font-bold text-zinc-500 uppercase">USDT</span>
                      </div>
                      <div className="text-[10px] font-bold text-zinc-500 uppercase flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        {listing.deliveryTime}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-zinc-900/50 rounded-[3rem] border border-dashed border-zinc-800">
              <Search className="h-12 w-12 text-zinc-700 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">No active listings</h3>
              <p className="text-zinc-500">This seller currently has no active listings.</p>
            </div>
          )}
        </div>

        {/* Reviews Section */}
        <div className="space-y-8">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-2xl font-bold text-white">Reviews</h2>
            <div className="flex items-center text-orange-500 font-bold text-sm">
              <Star className="h-4 w-4 fill-current mr-1" />
              {averageRating}
            </div>
          </div>

          <div className="space-y-4">
            {reviews.length > 0 ? (
              reviews.map((review) => (
                <div key={review.id} className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center">
                      <div className="h-8 w-8 bg-zinc-800 rounded-xl flex items-center justify-center text-orange-500 font-bold text-xs">
                        {review.fromName?.charAt(0) || 'U'}
                      </div>
                      <div className="ml-3">
                        <div className="text-white font-bold text-xs">{review.fromName || 'Anonymous'}</div>
                        <div className="flex items-center mt-0.5">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`h-2.5 w-2.5 ${
                                i < review.rating ? 'text-orange-500 fill-current' : 'text-zinc-700'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="text-[9px] text-zinc-600 font-mono">
                      {new Date(review.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <p className="text-zinc-400 text-xs italic leading-relaxed">
                    "{review.comment}"
                  </p>
                </div>
              ))
            ) : (
              <div className="text-center py-12 bg-zinc-900/50 rounded-3xl border border-zinc-800 border-dashed">
                <MessageSquare className="h-8 w-8 text-zinc-700 mx-auto mb-4" />
                <h3 className="text-white font-bold text-sm">No reviews yet</h3>
                <p className="text-zinc-500 text-xs mt-1">No feedback received yet.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SellerProfile;
