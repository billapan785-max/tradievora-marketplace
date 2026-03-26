import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { collection, query, where, onSnapshot, doc, updateDoc, increment, getDoc, setDoc, addDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../AuthContext';
import { Order, Dispute } from '../types';
import { Package, Clock, CheckCircle, AlertCircle, MessageSquare, Shield, ArrowRight, Star } from 'lucide-react';
import { toast } from 'sonner';
import { Review } from '../types';
import { uploadFile } from '../lib/upload';

const Orders: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const [buyingOrders, setBuyingOrders] = useState<Order[]>([]);
  const [sellingOrders, setSellingOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'buying' | 'selling'>('buying');
  const [showCompleteModal, setShowCompleteModal] = useState<Order | null>(null);
  const [showDisputeModal, setShowDisputeModal] = useState<Order | null>(null);
  const [disputeFile, setDisputeFile] = useState<File | null>(null);
  const [showDeliverModal, setShowDeliverModal] = useState<string | null>(null);
  const [deliveryFile, setDeliveryFile] = useState<File | null>(null);
  const [showReviewModal, setShowReviewModal] = useState<Order | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [modalInput, setModalInput] = useState('');
  const [userReviews, setUserReviews] = useState<Record<string, boolean>>({});
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    if (!profile) return;

    const qReviews = query(collection(db, 'reviews'), where('fromId', '==', profile.uid));
    const unsubReviews = onSnapshot(qReviews, (snapshot) => {
      const reviewsMap: Record<string, boolean> = {};
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        reviewsMap[data.orderId] = true;
      });
      setUserReviews(reviewsMap);
    });

    const qBuying = query(collection(db, 'orders'), where('buyerId', '==', profile.uid));
    const unsubBuying = onSnapshot(qBuying, (snapshot) => {
      const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
      setBuyingOrders(orders);
      
      // If we're looking for a specific order and it's in buying, make sure tab is correct
      if (id && orders.some(o => o.id === id)) {
        setActiveTab('buying');
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'orders');
    });

    const qSelling = query(collection(db, 'orders'), where('sellerId', '==', profile.uid));
    const unsubSelling = onSnapshot(qSelling, (snapshot) => {
      const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
      setSellingOrders(orders);
      setLoading(false);

      // If we're looking for a specific order and it's in selling, switch tab
      if (id && orders.some(o => o.id === id)) {
        setActiveTab('selling');
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'orders');
      setLoading(false);
    });

    return () => {
      unsubBuying();
      unsubSelling();
      unsubReviews();
    };
  }, [profile, id]);

  const handleConfirmDelivery = async (order: Order) => {
    try {
      const orderRef = doc(db, 'orders', order.id);
      const sellerRef = doc(db, 'users', order.sellerId);
      const buyerRef = doc(db, 'users', order.buyerId);

      // 1. Update Order Status
      await updateDoc(orderRef, { 
        status: 'completed',
        updatedAt: new Date().toISOString()
      });

      // 2. Move funds from Buyer Escrow to Seller Available
      await updateDoc(buyerRef, {
        escrowBalance: increment(-order.amount)
      });

      const totalFees = order.escrowFee + (order.featuredFee || 0);
      await updateDoc(sellerRef, {
        withdrawableBalance: increment(order.amount - totalFees)
      });

      // 3. Distribute Commissions
      const buyerSnap = await getDoc(buyerRef);
      if (buyerSnap.exists()) {
        const buyerProfile = buyerSnap.data();
        const referralChain = buyerProfile.referralChain || [];
        const settingsSnap = await getDoc(doc(db, 'settings', 'platform'));
        const settings = settingsSnap.data();
        const commissionLevels = settings?.referralCommissionLevels || {};

        for (let i = 0; i < referralChain.length; i++) {
          const level = i + 1;
          const influencerId = referralChain[i];
          const sharePercent = commissionLevels[level] || 0;
          
          if (sharePercent > 0) {
            const commissionAmount = order.escrowFee * (sharePercent / 100);
            const commissionId = `${order.id}_L${level}`;
            
            await setDoc(doc(db, 'commissions', commissionId), {
              id: commissionId,
              orderId: order.id,
              influencerId,
              amount: commissionAmount,
              level,
              status: 'approved',
              createdAt: new Date().toISOString()
            });

            // Update influencer profile
            const influencerRef = doc(db, 'influencers', influencerId);
            const influencerSnap = await getDoc(influencerRef);
            if (influencerSnap.exists()) {
              await updateDoc(influencerRef, {
                totalEarnings: increment(commissionAmount),
                totalSales: increment(1),
                totalVolume: increment(order.amount),
                [`levelEarnings.${level}`]: increment(commissionAmount)
              });
            }
          }
        }
      }

      toast.success('Order confirmed and funds released!');
      setShowCompleteModal(null);
    } catch (error) {
      toast.error('Failed to confirm delivery');
    }
  };

  const handleOpenDispute = async (order: Order, reason: string, file: File | null) => {
    try {
      let proofUrl = '';
      if (file) {
        proofUrl = await uploadFile(file, 'disputes/proofs', profile?.uid || 'unknown');
      }

      await addDoc(collection(db, 'disputes'), {
        orderId: order.id,
        buyerId: order.buyerId,
        sellerId: order.sellerId,
        reason: reason,
        proof_url: proofUrl,
        status: 'open',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      await updateDoc(doc(db, 'orders', order.id), {
        status: 'disputed',
        updatedAt: new Date().toISOString(),
      });
      await addDoc(collection(db, 'timeline'), {
        orderId: order.id,
        type: 'dispute_opened',
        description: `Dispute opened by ${profile?.uid === order.buyerId ? 'Buyer' : 'Seller'}: ${reason}`,
        userId: profile?.uid,
        createdAt: new Date().toISOString(),
      });
      toast.success('Dispute opened successfully.');
      setShowDisputeModal(null);
      setModalInput('');
      setDisputeFile(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'disputes/timeline');
    }
  };

  const handleDeliver = async (orderId: string, details: string, file: File | null) => {
    try {
      let fileUrl = '';
      if (file) {
        fileUrl = await uploadFile(file, 'deliveries/files', profile?.uid || 'unknown');
        await addDoc(collection(db, 'deliveries'), {
          order_id: orderId,
          file_url: fileUrl,
          message: details,
          timestamp: new Date().toISOString()
        });
      }

      await updateDoc(doc(db, 'orders', orderId), {
        status: 'delivered',
        deliveryDetails: details,
        updatedAt: new Date().toISOString()
      });
      await addDoc(collection(db, 'timeline'), {
        orderId,
        type: 'delivery_submitted',
        description: 'Seller submitted account details/delivery info.',
        userId: profile?.uid,
        createdAt: new Date().toISOString()
      });
      toast.success('Delivery submitted successfully!');
      setShowDeliverModal(null);
      setModalInput('');
      setDeliveryFile(null);
    } catch (error) {
      toast.error('Failed to submit delivery');
      handleFirestoreError(error, OperationType.WRITE, 'orders/timeline');
    }
  };

  const handleLeaveReview = async (order: Order) => {
    if (!profile || submittingReview) return;
    if (!reviewComment.trim()) {
      toast.error('Please enter a comment');
      return;
    }
    setSubmittingReview(true);
    try {
      const reviewId = `${order.id}_${profile.uid}`;
      const reviewData: Omit<Review, 'id'> = {
        orderId: order.id,
        fromId: profile.uid,
        toId: activeTab === 'buying' ? order.sellerId : order.buyerId,
        fromName: profile.displayName || profile.email.split('@')[0],
        rating: reviewRating,
        comment: reviewComment.trim(),
        type: activeTab === 'buying' ? 'buyer_to_seller' : 'seller_to_buyer',
        createdAt: new Date().toISOString()
      };

      console.log('Submitting review:', reviewData);
      await setDoc(doc(db, 'reviews', reviewId), reviewData);
      toast.success('Review submitted successfully!');
      setShowReviewModal(null);
      setReviewRating(5);
      setReviewComment('');
    } catch (error) {
      console.error('Review submission error:', error);
      toast.error('Failed to submit review');
      handleFirestoreError(error, OperationType.WRITE, 'reviews');
    } finally {
      setSubmittingReview(false);
    }
  };

  const currentOrders = activeTab === 'buying' ? buyingOrders : sellingOrders;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">My Orders</h1>
          <p className="text-zinc-500">Track your purchases and sales</p>
        </div>
        
        <div className="flex bg-zinc-900 p-1 rounded-xl border border-zinc-800">
          <button
            onClick={() => setActiveTab('buying')}
            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${
              activeTab === 'buying' ? 'bg-orange-600 text-white' : 'text-zinc-500 hover:text-white'
            }`}
          >
            Buying
          </button>
          <button
            onClick={() => setActiveTab('selling')}
            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${
              activeTab === 'selling' ? 'bg-orange-600 text-white' : 'text-zinc-500 hover:text-white'
            }`}
          >
            Selling
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {currentOrders.length > 0 ? (
          currentOrders.map(order => (
            <div key={order.id} className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden hover:border-zinc-700 transition-all">
              <div className="p-6 md:p-8 flex flex-col md:flex-row gap-6">
                <div className="h-20 w-20 bg-zinc-800 rounded-2xl flex items-center justify-center flex-shrink-0">
                  <Package className="h-10 w-10 text-orange-500" />
                </div>
                
                <div className="flex-1 space-y-2">
                  {(order.status === 'active' || order.status === 'in_progress') && (
                    <div className="p-3 bg-orange-900/20 border border-orange-800/50 rounded-xl flex items-center text-orange-500 text-[10px] font-bold">
                      <Shield className="h-3 w-3 mr-2" />
                      Payment held in escrow. Released after completion.
                    </div>
                  )}
                  {order.status === 'pending_payment' && (
                    <div className="p-3 bg-orange-900/20 border border-orange-800/50 rounded-xl flex items-center text-orange-500 text-[10px] font-bold">
                      <Clock className="h-3 w-3 mr-2" />
                      Waiting for administrator to verify payment.
                    </div>
                  )}
                  {order.status === 'pending_seller_approval' && (
                    <div className="p-3 bg-orange-900/20 border border-orange-800/50 rounded-xl flex items-center text-orange-500 text-[10px] font-bold">
                      <Clock className="h-3 w-3 mr-2" />
                      Waiting for seller to accept the order.
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded ${
                      order.status === 'completed' ? 'bg-green-900/20 text-green-500' : 
                      order.status === 'active' || order.status === 'in_progress' || order.status === 'delivered' ? 'bg-blue-900/20 text-blue-500' : 
                      order.status === 'pending_payment' || order.status === 'pending_seller_approval' ? 'bg-orange-900/20 text-orange-500' : 'bg-red-900/20 text-red-500'
                    }`}>
                      {order.status}
                    </span>
                    <span className="text-zinc-600 text-xs font-mono">#{order.id.slice(-8)}</span>
                  </div>
                  <h3 className="text-xl font-bold text-white">{order.listingTitle}</h3>
                  <div className="flex items-center text-zinc-500 text-sm space-x-4">
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-1" />
                      {new Date(order.createdAt).toLocaleDateString()}
                    </div>
                    <div className="font-bold text-white">{order.amount} USDT</div>
                    <div className="text-orange-500 text-xs font-bold">
                      View {activeTab === 'buying' ? 'Seller' : 'Buyer'}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row md:flex-col gap-3 justify-center min-w-[160px]">
                  {activeTab === 'buying' && (order.status === 'delivered' || order.status === 'active' || order.status === 'in_progress') && (
                    <button
                      onClick={() => setShowCompleteModal(order)}
                      className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-xl text-sm font-bold transition-all"
                    >
                      Verify & Complete Order
                    </button>
                  )}
                  {(order.status === 'active' || order.status === 'in_progress' || order.status === 'delivered') && (
                    <button
                      onClick={() => setShowDisputeModal(order)}
                      className="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded-xl text-sm font-bold transition-all"
                    >
                      Open Dispute
                    </button>
                  )}
                  {activeTab === 'selling' && order.status === 'pending_seller_approval' && (
                    <div className="flex gap-2 w-full">
                      <button
                        onClick={async () => {
                          try {
                            await updateDoc(doc(db, 'orders', order.id), { status: 'active', updatedAt: new Date().toISOString() });
                            toast.success('Order accepted!');
                          } catch (error) {
                            toast.error('Failed to accept order');
                          }
                        }}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-xl text-sm font-bold transition-all"
                      >
                        Accept
                      </button>
                      <button
                        onClick={async () => {
                          try {
                            await updateDoc(doc(db, 'orders', order.id), { status: 'cancelled', updatedAt: new Date().toISOString() });
                            // Refund buyer
                            const buyerRef = doc(db, 'users', order.buyerId);
                            await updateDoc(buyerRef, {
                              availableBalance: increment(order.amount),
                              escrowBalance: increment(-order.amount)
                            });
                            toast.success('Order rejected and buyer refunded');
                          } catch (error) {
                            toast.error('Failed to reject order');
                          }
                        }}
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-xl text-sm font-bold transition-all"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                  {activeTab === 'selling' && (order.status === 'active' || order.status === 'in_progress') && (
                    <button
                      onClick={() => setShowDeliverModal(order.id)}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-xl text-sm font-bold transition-all"
                    >
                      Submit Order
                    </button>
                  )}
                  {order.status === 'completed' && !userReviews[order.id] && (
                    <button
                      onClick={() => setShowReviewModal(order)}
                      className="w-full bg-orange-600 hover:bg-orange-700 text-white py-2 rounded-xl text-sm font-bold transition-all"
                    >
                      Leave Feedback
                    </button>
                  )}
                  {order.status === 'completed' && userReviews[order.id] && (
                    <div className="w-full bg-zinc-800 text-zinc-500 py-2 rounded-xl text-sm font-bold text-center border border-zinc-700">
                      Feedback Left
                    </div>
                  )}
                  <Link
                    to={`/messages?order=${order.id}`}
                    className="w-full bg-zinc-800 hover:bg-zinc-700 text-white py-2 rounded-xl text-sm font-bold flex items-center justify-center transition-all"
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Message
                  </Link>
                  {(order.status === 'active' || order.status === 'in_progress' || order.status === 'delivered' || order.status === 'completed') && order.deliveryDetails && activeTab === 'buying' && (
                    <div className="p-3 bg-zinc-800 rounded-xl border border-zinc-700">
                      <div className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Delivery Details:</div>
                      <div className="text-xs text-white font-mono break-all">{order.deliveryDetails}</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-20 bg-zinc-900/50 rounded-3xl border border-dashed border-zinc-800">
            <Package className="h-12 w-12 text-zinc-700 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No orders found</h3>
            <p className="text-zinc-500">You haven't made any {activeTab} transactions yet</p>
          </div>
        )}
      </div>
      {/* Modals */}
      {showCompleteModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-md p-8 shadow-2xl">
            <h2 className="text-2xl font-bold text-white mb-4">Confirm Delivery</h2>
            <p className="text-zinc-400 mb-8">Are you sure you want to confirm delivery? This will release funds to the seller.</p>
            <div className="flex gap-4">
              <button
                onClick={() => setShowCompleteModal(null)}
                className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-bold transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => handleConfirmDelivery(showCompleteModal)}
                className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold transition-all"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {showDisputeModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-md p-8 shadow-2xl">
            <h2 className="text-2xl font-bold text-white mb-4">Open Dispute</h2>
            <p className="text-zinc-400 mb-4">Please enter the reason for the dispute:</p>
            <textarea
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-orange-500 mb-4"
              rows={4}
              placeholder="Explain the issue..."
              value={modalInput}
              onChange={(e) => setModalInput(e.target.value)}
            />
            <input
              type="file"
              onChange={(e) => setDisputeFile(e.target.files?.[0] || null)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-orange-500 mb-6"
            />
            <div className="flex gap-4">
              <button
                onClick={() => {
                  setShowDisputeModal(null);
                  setModalInput('');
                  setDisputeFile(null);
                }}
                className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-bold transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => handleOpenDispute(showDisputeModal, modalInput || 'No reason provided', disputeFile)}
                className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-all"
              >
                Submit Dispute
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeliverModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-md p-8 shadow-2xl">
            <h2 className="text-2xl font-bold text-white mb-4">Submit Order</h2>
            <p className="text-zinc-400 mb-4">Enter account details or delivery info for the buyer:</p>
            <textarea
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-orange-500 mb-4"
              rows={4}
              placeholder="Account credentials, download links, etc..."
              value={modalInput}
              onChange={(e) => setModalInput(e.target.value)}
            />
            <input
              type="file"
              onChange={(e) => setDeliveryFile(e.target.files?.[0] || null)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-orange-500 mb-6"
            />
            <div className="flex gap-4">
              <button
                onClick={() => {
                  setShowDeliverModal(null);
                  setModalInput('');
                  setDeliveryFile(null);
                }}
                className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-bold transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeliver(showDeliverModal, modalInput, deliveryFile)}
                disabled={!modalInput && !deliveryFile}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-700 disabled:text-zinc-500 text-white rounded-xl font-bold transition-all"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
      {showReviewModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-md p-8 shadow-2xl">
            <h2 className="text-2xl font-bold text-white mb-2">
              {activeTab === 'buying' ? 'Review Seller' : 'Review Buyer'}
            </h2>
            <p className="text-zinc-400 mb-6 text-sm">Rate your experience with this {activeTab === 'buying' ? 'seller' : 'buyer'}.</p>
            
            <div className="flex justify-center gap-2 mb-8">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setReviewRating(star)}
                  className="transition-transform hover:scale-110"
                >
                  <Star
                    className={`h-8 w-8 ${
                      star <= reviewRating ? 'fill-orange-500 text-orange-500' : 'text-zinc-700'
                    }`}
                  />
                </button>
              ))}
            </div>

            <textarea
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-orange-500 mb-6"
              rows={4}
              placeholder="Write your review here..."
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
            />

            <div className="flex gap-4">
              <button
                onClick={() => {
                  setShowReviewModal(null);
                  setReviewRating(5);
                  setReviewComment('');
                }}
                className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-bold transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => handleLeaveReview(showReviewModal)}
                disabled={submittingReview}
                className={`flex-1 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold transition-all ${
                  submittingReview ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {submittingReview ? 'Submitting...' : 'Submit Review'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Orders;
