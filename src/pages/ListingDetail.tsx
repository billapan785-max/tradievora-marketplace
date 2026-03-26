import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { doc, getDoc, addDoc, collection, updateDoc, increment, query, where, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Listing, UserProfile, Order, Review } from '../types';
import { useAuth } from '../AuthContext';
import { Shield, Clock, User, Star, CheckCircle, AlertCircle, ShoppingCart, BadgeCheck, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';

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

    let orderAmount = listing.price;
    let orderType: Order['orderType'] = 'fixed';

    if (listing.serviceType === 'percentage' || listing.serviceType === 'refund_percentage') {
      // For percentage based, the buyer pays the deposit
      orderAmount = (listing.price * (listing.percentageRate || 0)) / 100;
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

      // 2. Update Buyer Balances
      const buyerRef = doc(db, 'users', profile.uid);
      await updateDoc(buyerRef, {
        availableBalance: increment(-orderAmount),
        escrowBalance: increment(orderAmount)
      });

      toast.success('Order placed successfully! Payment is held in escrow and will be released after order completion.');
      navigate(`/orders/${orderRef.id}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'orders/users');
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
          
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 mb-8">
            <div className="bg-zinc-800/50 p-4 rounded-2xl border border-zinc-800">
              <div className="text-zinc-500 text-xs mb-1 uppercase font-bold tracking-tighter">Price</div>
              <div className="text-2xl font-bold text-white">{listing.price} <span className="text-sm font-normal text-zinc-500">USDT</span></div>
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

        {/* Reviews Section */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8">
          <h3 className="text-xl font-bold text-white mb-6">Recent Reviews</h3>
          <div className="space-y-6">
            {reviews.length > 0 ? (
              reviews.map(review => (
                <div key={review.id} className="border-b border-zinc-800 pb-6 last:border-0">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 bg-zinc-800 rounded-lg flex items-center justify-center text-xs font-bold text-orange-500">
                        {review.fromName?.charAt(0) || 'U'}
                      </div>
                      <div>
                        <div className="text-white text-sm font-bold">{review.fromName || 'User'}</div>
                        <div className="flex items-center text-orange-500 text-[10px] font-bold">
                          <Star className="h-2 w-2 fill-current mr-1" />
                          {review.rating.toFixed(1)}
                        </div>
                      </div>
                    </div>
                    <div className="text-zinc-500 text-xs">{new Date(review.createdAt).toLocaleDateString()}</div>
                  </div>
                  <p className="text-zinc-400 text-sm pl-11">{review.comment}</p>
                </div>
              ))
            ) : (
              <div className="text-center py-10 text-zinc-600">
                No reviews yet for this seller.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right Column: Seller & Action */}
      <div className="space-y-8">
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 sticky top-24">
          <div className="flex items-center mb-8">
            <div className="h-16 w-16 bg-zinc-800 rounded-2xl flex items-center justify-center text-2xl font-bold text-orange-500">
              {listing.sellerName?.charAt(0) || 'S'}
            </div>
            <div className="ml-4">
              <div className="flex items-center">
                <h3 className="text-white font-bold">{listing.sellerName || 'Seller'}</h3>
                {listing.sellerIsVerified && (
                  <BadgeCheck className="h-4 w-4 ml-1 text-blue-500" />
                )}
              </div>
              <p className="text-zinc-500 text-xs">Joined Recently</p>
              <div className="flex items-center mt-1 text-orange-500 text-xs font-bold">
                <Star className="h-3 w-3 fill-current mr-1" />
                {averageRating} ({reviews.length} Reviews)
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <button
              onClick={handleBuy}
              disabled={buying}
              className="w-full py-4 bg-orange-600 hover:bg-orange-700 disabled:bg-zinc-700 text-white rounded-2xl font-bold text-lg flex items-center justify-center transition-all shadow-lg shadow-orange-900/20"
            >
              <ShoppingCart className="h-5 w-5 mr-2" />
              {buying ? 'Processing...' : 'Buy Now'}
            </button>
            <button
              onClick={handleContactSeller}
              className="w-full py-4 bg-zinc-800 hover:bg-zinc-700 text-white rounded-2xl font-bold transition-all"
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
