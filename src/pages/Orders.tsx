import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { collection, query, where, onSnapshot, doc, updateDoc, increment, getDoc, setDoc, addDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../AuthContext';
import { Order, Dispute } from '../types';
import { Package, Clock, CheckCircle, AlertCircle, MessageSquare, Shield, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

const Orders: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const [buyingOrders, setBuyingOrders] = useState<Order[]>([]);
  const [sellingOrders, setSellingOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'buying' | 'selling'>('buying');

  useEffect(() => {
    if (!profile) return;

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
    };
  }, [profile, id]);

  const handleConfirmDelivery = async (order: Order) => {
    if (window.confirm('Are you sure you want to confirm delivery? This will release funds to the seller.')) {
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
          availableBalance: increment(order.amount - totalFees)
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
      } catch (error) {
        toast.error('Failed to confirm delivery');
      }
    }
  };

  const handleOpenDispute = async (order: Order, reason: Dispute['reason']) => {
    try {
      await addDoc(collection(db, 'disputes'), {
        orderId: order.id,
        buyerId: order.buyerId,
        sellerId: order.sellerId,
        reason: reason,
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
        description: `Dispute opened: ${reason}`,
        userId: profile?.uid,
        createdAt: new Date().toISOString(),
      });
      toast.success('Dispute opened successfully.');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'disputes');
    }
  };

  const handleDeliver = async (orderId: string) => {
    const details = window.prompt('Enter account details / delivery info:');
    if (details) {
      try {
        await updateDoc(doc(db, 'orders', orderId), {
          status: 'in_progress',
          deliveryDetails: details,
          updatedAt: new Date().toISOString()
        });
        toast.success('Order marked as delivered!');
      } catch (error) {
        toast.error('Failed to update order');
      }
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
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded ${
                      order.status === 'completed' ? 'bg-green-900/20 text-green-500' : 
                      order.status === 'active' || order.status === 'in_progress' ? 'bg-blue-900/20 text-blue-500' : 
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
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row md:flex-col gap-3 justify-center min-w-[160px]">
                  {activeTab === 'buying' && (order.status === 'active' || order.status === 'in_progress') && (
                    <button
                      onClick={() => handleConfirmDelivery(order)}
                      className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-xl text-sm font-bold transition-all"
                    >
                      Confirm Delivery
                    </button>
                  )}
                  {activeTab === 'buying' && (order.status === 'active' || order.status === 'in_progress') && (
                    <button
                      onClick={() => {
                        const reason = window.prompt('Enter dispute reason:');
                        if (reason) handleOpenDispute(order, 'other');
                      }}
                      className="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded-xl text-sm font-bold transition-all"
                    >
                      Open Dispute
                    </button>
                  )}
                  {activeTab === 'selling' && (order.status === 'active' || order.status === 'in_progress') && (
                    <button
                      onClick={() => handleDeliver(order.id)}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-xl text-sm font-bold transition-all"
                    >
                      Deliver Details
                    </button>
                  )}
                  <Link
                    to={`/messages?order=${order.id}`}
                    className="w-full bg-zinc-800 hover:bg-zinc-700 text-white py-2 rounded-xl text-sm font-bold flex items-center justify-center transition-all"
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Message
                  </Link>
                  {(order.status === 'active' || order.status === 'in_progress' || order.status === 'completed') && order.deliveryDetails && activeTab === 'buying' && (
                    <div className="p-3 bg-zinc-800 rounded-xl border border-zinc-700">
                      <div className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Account Details:</div>
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
    </div>
  );
};

export default Orders;
