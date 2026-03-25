import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { doc, getDoc, addDoc, collection, updateDoc, increment } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Listing, UserProfile, Order } from '../types';
import { useAuth } from '../AuthContext';
import { Shield, Clock, User, Star, CheckCircle, AlertCircle, ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';

const ListingDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  
  const [listing, setListing] = useState<Listing | null>(null);
  const [seller, setSeller] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(false);

  useEffect(() => {
    const fetchListing = async () => {
      if (!id) return;
      const docSnap = await getDoc(doc(db, 'listings', id));
      if (docSnap.exists()) {
        const data = docSnap.data() as Listing;
        setListing({ id: docSnap.id, ...data });
        
        // We don't fetch the full seller profile here to avoid permission errors
        // and protect PII. We use denormalized data from the listing instead.
      }
      setLoading(false);
    };
    fetchListing();
  }, [id]);

  const handleBuy = async () => {
    if (!user || !profile) {
      navigate('/login');
      return;
    }

    if (!listing) return;

    if (profile.availableBalance < listing.price) {
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
        amount: listing.price,
        escrowFee: listing.price * 0.05, // 5% fee
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const orderRef = await addDoc(collection(db, 'orders'), orderData);

      // 2. Update Buyer Balances
      const buyerRef = doc(db, 'users', profile.uid);
      await updateDoc(buyerRef, {
        availableBalance: increment(-listing.price),
        escrowBalance: increment(listing.price)
      });

      toast.success('Order placed successfully! Funds held in escrow.');
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

        {/* Reviews Section Placeholder */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8">
          <h3 className="text-xl font-bold text-white mb-6">Recent Reviews</h3>
          <div className="space-y-6">
            <div className="text-center py-10 text-zinc-600">
              No reviews yet for this listing.
            </div>
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
                {/* seller?.isVerified check would require denormalization or a public profile */}
              </div>
              <p className="text-zinc-500 text-xs">Joined Recently</p>
              <div className="flex items-center mt-1 text-orange-500 text-xs font-bold">
                <Star className="h-3 w-3 fill-current mr-1" />
                4.9 (124 Orders)
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
    </div>
  );
};

export default ListingDetail;
