import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { doc, getDoc, addDoc, collection, updateDoc, increment, query, where, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Listing, UserProfile, Order, Review } from '../types';
import { useAuth } from '../AuthContext';
import { Shield, Clock, User, Star, CheckCircle, AlertCircle, ShoppingCart, BadgeCheck, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { sendNotification } from '../lib/notificationService';

const ListingDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  
  const [listing, setListing] = useState<Listing | null>(null);
  const [seller, setSeller] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);

  useEffect(() => {
    const fetchListing = async () => {
      if (!id) return;
      const docSnap = await getDoc(doc(db, 'listings', id));
      if (docSnap.exists()) {
        const data = docSnap.data() as Listing;
        setListing({ id: docSnap.id, ...data });
        
        // Fetch seller profile
        try {
          const sellerDoc = await getDoc(doc(db, 'profiles', data.sellerId));
          if (sellerDoc.exists()) {
            setSeller({ uid: sellerDoc.id, ...sellerDoc.data() } as UserProfile);
          } else {
            // Fallback to users (only works if authenticated)
            try {
              const userDoc = await getDoc(doc(db, 'users', data.sellerId));
              if (userDoc.exists()) {
                const userData = userDoc.data() as UserProfile;
                setSeller({ uid: userDoc.id, ...userData } as UserProfile);

                // If viewer is admin, migrate this old profile to the public profiles collection
                if (profile?.role === 'admin') {
                  try {
                    const { setDoc } = await import('firebase/firestore');
                    await setDoc(doc(db, 'profiles', data.sellerId), {
                      uid: data.sellerId,
                      displayName: userData.displayName || 'User',
                      role: userData.role || 'seller',
                      isVerified: userData.isVerified || false,
                      trustScore: userData.trustScore || 100,
                      responseTime: userData.responseTime || '1h',
                      image_url: userData.image_url || '',
                      createdAt: userData.createdAt || new Date().toISOString()
                    });
                  } catch (migrateErr) {
                    console.error("Failed to migrate profile from ListingDetail:", migrateErr);
                  }
                }
              }
            } catch (err) {
              console.log("Could not fetch seller from users (guest or no permission)");
            }
          }
        } catch (err) {
          console.error("Error fetching seller profile:", err);
        }

        // Fetch reviews for the seller
        const qReviews = query(
          collection(db, 'reviews'), 
          where('toId', '==', data.sellerId),
          where('type', '==', 'buyer_to_seller')
        );
        onSnapshot(qReviews, (snapshot) => {
          setReviews(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Review)));
        }, (error) => {
          handleFirestoreError(error, OperationType.LIST, 'reviews');
        });
      }
      setLoading(false);
    };
    fetchListing();
  }, [id]);

  const averageRating = reviews.length > 0
    ? (reviews.reduce((acc, review) => acc + review.rating, 0) / reviews.length).toFixed(1)
    : '0.0';

  const handleBuy = async () => {
    if (!user || !profile) {
      navigate('/login');
      return;
    }

    if (!listing) return;

    let currentPrice = listing.price;
    if (listing.isFlashSale && listing.flashSaleEndsAt && new Date(listing.flashSaleEndsAt) > new Date() && listing.discountedPrice) {
      currentPrice = listing.discountedPrice;
    } else if (listing.discountedPrice) {
      currentPrice = listing.discountedPrice;
    }

    let orderAmount = currentPrice;
    let orderType: Order['orderType'] = 'fixed';

    if (listing.serviceType === 'percentage' || listing.serviceType === 'refund_percentage') {
      // For percentage based, the buyer pays the deposit
      orderAmount = (currentPrice * (listing.percentageRate || 0)) / 100;
      orderType = listing.serviceType === 'refund_percentage' ? 'percentage_refund' : 'percentage_work';
    } else if (listing.serviceType === 'security_deposit') {
      orderAmount = listing.securityDepositAmount || 0;
      orderType = 'security_deposit';
    } else if (listing.serviceType === 'va_service') {
      orderAmount = listing.vaMonthlyPrice || 0;
      orderType = 'va_service';
    }

    if (profile.availableBalance < orderAmount) {
      toast.error('Insufficient balance. Please deposit USDT.');
      navigate('/wallet');
      return;
    }

    if (profile.uid === listing.sellerId) {
      toast.error('You cannot buy your own listing.');
      return;
    }

    setBuying(true);
    try {
      // 1. Create Order
      const orderData: Omit<Order, 'id'> = {
        buyerId: profile.uid,
        sellerId: listing.sellerId,
        listingId: listing.id,
        listingTitle: listing.title,
        amount: orderAmount,
        escrowFee: orderAmount * 0.05, // 5% fee
        featuredFee: listing.isFeatured ? orderAmount * 0.10 : 0, // 10% extra fee if featured
        status: listing.requireSellerApproval ? 'pending_seller_approval' : 'active',
        orderType: orderType,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const orderRef = await addDoc(collection(db, 'orders'), orderData);

      // Notify seller about new order
      sendNotification({
        toId: listing.sellerId,
        title: 'New Order Placed!',
        body: `You have a new order for: ${listing.title}`,
        data: { type: 'order', id: orderRef.id }
      });

      // 2. Update Buyer Balances
      const buyerRef = doc(db, 'users', profile.uid);
      await updateDoc(buyerRef, {
        availableBalance: increment(-orderAmount),
        escrowBalance: increment(orderAmount)
      });

      toast.success('Order placed successfully! Payment is held in escrow and will be released after order completion.');
      navigate(`/orders/${orderRef.id}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'users');
      toast.error('Failed to place order.');
    } finally {
      setBuying(false);
    }
  };

  const handleContactSeller = () => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (profile?.uid === listing?.sellerId) {
      toast.error('You cannot message yourself.');
      return;
    }
    navigate(`/messages?seller=${listing?.sellerId}&listing=${listing?.id}`);
  };

  if (loading) return <div className="animate-pulse space-y-8"><div className="h-96 bg-zinc-900 rounded-3xl"></div></div>;
  if (!listing) return <div className="text-center py-20 text-zinc-500">Listing not found</div>;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
      {/* Left Column: Details */}
      <div className="lg:col-span-2 space-y-8">
        {listing.image_url && (
          <div className="w-full h-[400px] rounded-3xl overflow-hidden bg-zinc-900 border border-zinc-800">
            <img 
              src={listing.image_url} 
              alt={listing.title} 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
        )}
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8">
          <div className="flex items-center space-x-2 mb-6">
            <span className="px-3 py-1 bg-orange-600/20 text-orange-500 text-xs font-bold uppercase rounded-full tracking-wider">
              {listing.category}
            </span>
            <span className="px-3 py-1 bg-green-600/20 text-green-500 text-xs font-bold uppercase rounded-full tracking-wider">
              {listing.status}
            </span>
          </div>
          
          <h1 className="text-4xl font-extrabold text-white mb-6">{listing.title}</h1>
          
          {listing.isFlashSale && listing.flashSaleEndsAt && new Date(listing.flashSaleEndsAt) > new Date() && (
            <div className="mb-8 p-6 bg-red-900/10 border border-red-500/20 rounded-3xl flex items-center justify-between">
              <div className="flex items-center text-red-500 font-bold">
                <Clock className="h-6 w-6 mr-3" />
                <div>
                  <div className="text-lg uppercase tracking-wider">Flash Sale Active!</div>
                  <div className="text-sm opacity-80">Ends at {new Date(listing.flashSaleEndsAt).toLocaleString()}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-black text-red-500">
                  {Math.round(((listing.originalPrice || listing.price) - (listing.discountedPrice || 0)) / (listing.originalPrice || listing.price) * 100)}% OFF
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 mb-8">
            <div className="bg-zinc-800/50 p-4 rounded-2xl border border-zinc-800">
              <div className="text-zinc-500 text-xs mb-1 uppercase font-bold tracking-tighter">Price</div>
              <div className="text-2xl font-bold text-white">
                {listing.isFlashSale && listing.flashSaleEndsAt && new Date(listing.flashSaleEndsAt) > new Date() && listing.discountedPrice ? (
                  listing.discountedPrice
                ) : listing.discountedPrice ? (
                  listing.discountedPrice
                ) : (
                  listing.price
                )} <span className="text-sm font-normal text-zinc-500">USDT</span>
              </div>
              {(listing.originalPrice || (listing.discountedPrice && listing.price)) && (
                <div className="text-xs text-zinc-500 line-through">
                  {listing.originalPrice || listing.price} USDT
                </div>
              )}
            </div>
            {listing.serviceType === 'percentage' && (
              <div className="bg-zinc-800/50 p-4 rounded-2xl border border-zinc-800">
                <div className="text-zinc-500 text-xs mb-1 uppercase font-bold tracking-tighter">Percentage</div>
                <div className="text-2xl font-bold text-white">{listing.percentageRate}%</div>
              </div>
            )}
            {listing.serviceType === 'refund_percentage' && (
              <div className="bg-zinc-800/50 p-4 rounded-2xl border border-zinc-800">
                <div className="text-zinc-500 text-xs mb-1 uppercase font-bold tracking-tighter">Refund Range</div>
                <div className="text-lg font-bold text-white">{listing.minRefundAmount} - {listing.maxRefundAmount} USDT</div>
              </div>
            )}
            {listing.serviceType === 'security_deposit' && (
              <div className="bg-zinc-800/50 p-4 rounded-2xl border border-zinc-800">
                <div className="text-zinc-500 text-xs mb-1 uppercase font-bold tracking-tighter">Deposit</div>
                <div className="text-2xl font-bold text-white">{listing.securityDepositAmount} USDT</div>
              </div>
            )}
            {listing.serviceType === 'va_service' && (
              <div className="bg-zinc-800/50 p-4 rounded-2xl border border-zinc-800">
                <div className="text-zinc-500 text-xs mb-1 uppercase font-bold tracking-tighter">Monthly</div>
                <div className="text-2xl font-bold text-white">{listing.vaMonthlyPrice} USDT</div>
              </div>
            )}
            <div className="bg-zinc-800/50 p-4 rounded-2xl border border-zinc-800">
              <div className="text-zinc-500 text-xs mb-1 uppercase font-bold tracking-tighter">Delivery</div>
              <div className="text-lg font-bold text-white flex items-center">
                <Clock className="h-4 w-4 mr-2 text-orange-500" />
                {listing.deliveryTime}
              </div>
            </div>

            <div className="bg-zinc-800/50 p-4 rounded-2xl border border-zinc-800">
              <div className="text-zinc-500 text-xs mb-1 uppercase font-bold tracking-tighter">Method</div>
              <div className="text-lg font-bold text-white">{listing.deliveryMethod}</div>
            </div>
          </div>

          <div className="prose prose-invert max-w-none">
            <h3 className="text-white font-bold mb-4">Description</h3>
            <p className="text-zinc-400 whitespace-pre-wrap leading-relaxed">
              {listing.description}
            </p>
          </div>
        </div>
      </div>

      {/* Right Column: Seller & Action */}
      <div className="space-y-8">
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 sticky top-24">
          <Link to={`/seller/${listing.sellerId}`} className="flex items-center mb-8 hover:opacity-80 transition-opacity group">
            {seller?.image_url ? (
              <img 
                src={seller.image_url} 
                alt={seller.displayName} 
                className="h-16 w-16 rounded-2xl object-cover group-hover:border-orange-500/50 border border-transparent transition-all"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="h-16 w-16 bg-zinc-800 rounded-2xl flex items-center justify-center text-2xl font-bold text-orange-500 group-hover:border-orange-500/50 border border-transparent transition-all">
                {(seller?.displayName || listing.sellerName)?.charAt(0) || 'S'}
              </div>
            )}
            <div className="ml-4">
              <div className="flex items-center">
                <h3 className="text-white font-bold group-hover:text-orange-500 transition-colors">{seller?.displayName || listing.sellerName || 'Seller'}</h3>
                {(seller?.isVerified || listing.sellerIsVerified) && (
                  <BadgeCheck className="h-4 w-4 ml-1 text-blue-500" />
                )}
              </div>
              <p className="text-zinc-500 text-xs">Trust Score: {seller?.trustScore || 100}%</p>
              <div className="flex items-center mt-1 text-orange-500 text-xs font-bold">
                <Star className="h-3 w-3 fill-current mr-1" />
                {averageRating} ({reviews.length} Reviews)
              </div>
            </div>
          </Link>

          <div className="space-y-4">
            <button
              onClick={handleBuy}
              disabled={buying}
              className="w-full py-3 md:py-4 bg-orange-600 hover:bg-orange-700 disabled:bg-zinc-700 text-white rounded-2xl font-bold text-base md:text-lg flex items-center justify-center transition-all shadow-lg shadow-orange-900/20"
            >
              <ShoppingCart className="h-5 w-5 mr-2" />
              {buying ? 'Processing...' : 'Buy Now'}
            </button>
            <button
              onClick={handleContactSeller}
              className="w-full py-3 md:py-4 bg-zinc-800 hover:bg-zinc-700 text-white rounded-2xl font-bold text-base md:text-lg transition-all"
            >
              Contact Seller
            </button>
          </div>

          <div className="mt-8 pt-8 border-t border-zinc-800 space-y-4">
            <div className="flex items-start">
              <Shield className="h-5 w-5 mr-3 text-green-500 mt-0.5" />
              <div>
                <h4 className="text-white text-sm font-bold">Escrow Protected</h4>
                <p className="text-zinc-500 text-xs mt-1">Your money is safe. We hold the funds until you confirm the delivery.</p>
              </div>
            </div>
            <div className="flex items-start">
              <AlertCircle className="h-5 w-5 mr-3 text-blue-500 mt-0.5" />
              <div>
                <h4 className="text-white text-sm font-bold">24/7 Support</h4>
                <p className="text-zinc-500 text-xs mt-1">Need help? Our admins are available to resolve any disputes.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Reviews Section */}
      <div className="mt-16">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-bold text-white">Seller Reviews</h2>
          <div className="flex items-center text-orange-500 font-bold">
            <Star className="h-5 w-5 fill-current mr-2" />
            {averageRating} ({reviews.length} Reviews)
          </div>
        </div>

        {reviews.length > 0 ? (
          <div className="grid md:grid-cols-2 gap-6">
            {reviews.map((review) => (
              <div key={review.id} className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center">
                    <div className="h-10 w-10 bg-zinc-800 rounded-xl flex items-center justify-center text-orange-500 font-bold">
                      {review.fromName?.charAt(0) || 'U'}
                    </div>
                    <div className="ml-3">
                      <div className="text-white font-bold text-sm">{review.fromName || 'Anonymous'}</div>
                      <div className="flex items-center mt-0.5">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-3 w-3 ${
                              i < review.rating ? 'text-orange-500 fill-current' : 'text-zinc-700'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="text-[10px] text-zinc-600 font-mono">
                    {new Date(review.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <p className="text-zinc-400 text-sm italic leading-relaxed">
                  "{review.comment}"
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-zinc-900/50 rounded-[3rem] border border-zinc-800 border-dashed">
            <MessageSquare className="h-10 w-10 text-zinc-700 mx-auto mb-4" />
            <h3 className="text-white font-bold">No reviews yet</h3>
            <p className="text-zinc-500 text-sm mt-1">This seller hasn't received any feedback yet.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ListingDetail;
