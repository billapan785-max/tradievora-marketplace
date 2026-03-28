import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, onSnapshot, doc, updateDoc, increment, getDoc, setDoc, where, addDoc, orderBy, getDocs } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../AuthContext';
import { Deposit, Withdrawal, UserProfile, PlatformSettings, Order, Listing, InfluencerProfile, VideoPromotion, Commission, SupportTicket, SupportMessage, Dispute, Evidence, Message } from '../types';
import { Shield, Users, CreditCard, Settings, Check, X, AlertCircle, TrendingUp, Video, DollarSign, Award, ExternalLink, MessageSquare, Send, User, BadgeCheck, Eye, Info, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { sendNotification } from '../lib/notificationService';

const AdminPanel: React.FC = () => {
  const { profile } = useAuth();
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [influencers, setInfluencers] = useState<InfluencerProfile[]>([]);
  const [videos, setVideos] = useState<VideoPromotion[]>([]);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [supportMessages, setSupportMessages] = useState<SupportMessage[]>([]);
  const [newSupportMessage, setNewSupportMessage] = useState('');
  const [settings, setSettings] = useState<PlatformSettings>({
    adminWalletTRC20: '',
    adminWalletERC20: '',
    adminWalletBEP20: '',
    marketplaceFeePercent: 10,
    announcement: '',
    minWithdrawal: 10,
    referralCommissionLevels: {
      1: 40,
      2: 20,
      3: 10,
      4: 5,
      5: 5
    },
    videoBonusStructure: {
      10000: 50,
      50000: 250,
      100000: 500,
      500000: 2500,
      1000000: 5000
    },
    bannerTitle: 'Tradiora',
    bannerSubtitle: 'The Ultimate Digital Asset Trading Platform',
    bannerImageUrl: 'https://images.unsplash.com/photo-1639762681485-074b7f4ec651?q=80&w=2070&auto=format&fit=crop'
  });
  const [listings, setListings] = useState<Listing[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [dispute, setDispute] = useState<Dispute | null>(null);
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [orderMessages, setOrderMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'stats' | 'deposits' | 'withdrawals' | 'users' | 'listings' | 'orders' | 'influencers' | 'videos' | 'settings' | 'support'>('stats');
  const [showDeleteListingModal, setShowDeleteListingModal] = useState<string | null>(null);
  const [showRejectVideoModal, setShowRejectVideoModal] = useState<VideoPromotion | null>(null);
  const [showApproveDepositModal, setShowApproveDepositModal] = useState<Deposit | null>(null);
  const [showRejectDepositModal, setShowRejectDepositModal] = useState<string | null>(null);
  const [showCompleteWithdrawalModal, setShowCompleteWithdrawalModal] = useState<Withdrawal | null>(null);
  const [showRejectWithdrawalModal, setShowRejectWithdrawalModal] = useState<string | null>(null);
  const [showResolveOrderModal, setShowResolveOrderModal] = useState<{ orderId: string, decision: 'refund' | 'release' } | null>(null);
  const [searchTermUsers, setSearchTermUsers] = useState('');
  const [searchTermDeposits, setSearchTermDeposits] = useState('');
  const [searchTermWithdrawals, setSearchTermWithdrawals] = useState('');
  const [searchTermOrders, setSearchTermOrders] = useState('');
  const [searchTermListings, setSearchTermListings] = useState('');
  const [modalInput, setModalInput] = useState('');

  useEffect(() => {
    if (profile?.role !== 'admin') return;

    const unsubDeposits = onSnapshot(collection(db, 'deposits'), (snapshot) => {
      setDeposits(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Deposit)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'deposits');
    });

    const unsubWithdrawals = onSnapshot(collection(db, 'withdrawals'), (snapshot) => {
      setWithdrawals(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Withdrawal)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'withdrawals');
    });

    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      setUsers(snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
    });

    const unsubInfluencers = onSnapshot(collection(db, 'influencers'), (snapshot) => {
      setInfluencers(snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as InfluencerProfile)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'influencers');
    });

    const unsubVideos = onSnapshot(collection(db, 'videos'), (snapshot) => {
      setVideos(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as VideoPromotion)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'videos');
    });

    const unsubCommissions = onSnapshot(collection(db, 'commissions'), (snapshot) => {
      setCommissions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Commission)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'commissions');
    });

    const unsubListings = onSnapshot(collection(db, 'listings'), (snapshot) => {
      setListings(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Listing))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'listings');
    });

    const unsubOrders = onSnapshot(collection(db, 'orders'), (snapshot) => {
      setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'orders');
    });

    const unsubTickets = onSnapshot(query(collection(db, 'support_tickets'), orderBy('updatedAt', 'desc')), (snapshot) => {
      setTickets(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SupportTicket)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'support_tickets');
    });

    const fetchSettings = async () => {
      const settingsSnap = await getDoc(doc(db, 'settings', 'platform'));
      if (settingsSnap.exists()) {
        setSettings(settingsSnap.data() as PlatformSettings);
      }
      setLoading(false);
    };
    fetchSettings();

    return () => {
      unsubDeposits();
      unsubWithdrawals();
      unsubUsers();
      unsubInfluencers();
      unsubVideos();
      unsubCommissions();
      unsubListings();
      unsubOrders();
      unsubTickets();
    };
  }, [profile]);

  useEffect(() => {
    if (!selectedTicket) {
      setSupportMessages([]);
      return;
    }

    const q = query(
      collection(db, 'support_messages'),
      where('ticketId', '==', selectedTicket.id),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setSupportMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SupportMessage)));
      
      // Mark as read by admin if unread
      if (selectedTicket.unreadByAdmin) {
        updateDoc(doc(db, 'support_tickets', selectedTicket.id), { unreadByAdmin: false });
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'support_messages');
    });

    return () => unsubscribe();
  }, [selectedTicket]);

  useEffect(() => {
    if (!selectedOrder) {
      setDispute(null);
      setEvidence([]);
      setOrderMessages([]);
      return;
    }

    // Fetch Dispute
    const qDispute = query(collection(db, 'disputes'), where('orderId', '==', selectedOrder.id));
    const unsubDispute = onSnapshot(qDispute, (snapshot) => {
      if (!snapshot.empty) {
        const disputeData = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Dispute;
        setDispute(disputeData);

        // Fetch Evidence for this dispute
        const qEvidence = query(collection(db, 'evidence'), where('disputeId', '==', disputeData.id));
        const unsubEvidence = onSnapshot(qEvidence, (snapshot) => {
          setEvidence(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Evidence)));
        }, (error) => {
          handleFirestoreError(error, OperationType.LIST, 'evidence');
        });
        return () => unsubEvidence();
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'disputes');
    });

    // Fetch Chat Logs
    const qMessages = query(
      collection(db, 'messages'),
      where('orderId', '==', selectedOrder.id),
      orderBy('createdAt', 'asc')
    );
    const unsubMessages = onSnapshot(qMessages, (snapshot) => {
      setOrderMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'messages');
    });

    return () => {
      unsubDispute();
      unsubMessages();
    };
  }, [selectedOrder]);

  const handleSendSupportMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !selectedTicket || !newSupportMessage.trim()) return;

    const text = newSupportMessage.trim();
    setNewSupportMessage('');

    try {
      await addDoc(collection(db, 'support_messages'), {
        ticketId: selectedTicket.id,
        senderId: profile.uid,
        text,
        createdAt: new Date().toISOString()
      });

      await updateDoc(doc(db, 'support_tickets', selectedTicket.id), {
        lastMessage: text,
        unreadByUser: true,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      toast.error('Failed to send message');
    }
  };

  const handleApproveVideo = async (video: VideoPromotion) => {
    try {
      await updateDoc(doc(db, 'videos', video.id), { 
        status: 'approved',
        approvedAt: new Date().toISOString()
      });

      // Notify influencer
      sendNotification({
        toId: video.influencerId,
        title: 'Video Approved!',
        body: `Your video "${video.title}" has been approved. Tracking is now active.`,
        data: { type: 'system' }
      });

      toast.success('Video approved!');
    } catch (error) {
      toast.error('Failed to approve video');
    }
  };

  const handleRejectVideo = async (video: VideoPromotion, reason: string) => {
    try {
      await updateDoc(doc(db, 'videos', video.id), { 
        status: 'rejected',
        rejectionReason: reason
      });

      // Notify influencer
      sendNotification({
        toId: video.influencerId,
        title: 'Video Rejected',
        body: `Your video "${video.title}" was rejected. Reason: ${reason}`,
        data: { type: 'system' }
      });

      toast.success('Video rejected');
      setShowRejectVideoModal(null);
      setModalInput('');
    } catch (error) {
      toast.error('Failed to reject video');
    }
  };

  const handleToggleSuspension = async (u: UserProfile) => {
    try {
      const newStatus = !u.isSuspended;
      await updateDoc(doc(db, 'users', u.uid), {
        isSuspended: newStatus
      });

      // Notify user
      sendNotification({
        toId: u.uid,
        title: newStatus ? 'Account Suspended' : 'Account Unsuspended',
        body: newStatus 
          ? 'Your account has been suspended by an administrator. Please contact support for details.'
          : 'Your account has been unsuspended. You can now access all features again.',
        data: { type: 'system' }
      });

      toast.success(`User ${newStatus ? 'suspended' : 'unsuspended'} successfully`);
    } catch (error) {
      toast.error('Failed to update user status');
    }
  };

  const handleApproveDeposit = async (deposit: Deposit) => {
    try {
      const depositRef = doc(db, 'deposits', deposit.id);
      const userRef = doc(db, 'users', deposit.userId);

      await updateDoc(depositRef, { status: 'approved' });
      await updateDoc(userRef, { availableBalance: increment(deposit.amount) });
      
      // Notify user about deposit approval
      sendNotification({
        toId: deposit.userId,
        title: 'Deposit Approved!',
        body: `Your deposit of ${deposit.amount} USDT has been approved and credited to your balance.`,
        data: { type: 'system' }
      });

      toast.success('Deposit approved and funds credited!');
    } catch (error) {
      toast.error('Failed to approve deposit');
    }
  };

  const handleRejectDeposit = async (id: string) => {
    try {
      await updateDoc(doc(db, 'deposits', id), { status: 'rejected' });
      
      // Get deposit data to notify user
      const depositSnap = await getDoc(doc(db, 'deposits', id));
      if (depositSnap.exists()) {
        const depositData = depositSnap.data();
        sendNotification({
          toId: depositData.userId,
          title: 'Deposit Rejected',
          body: `Your deposit of ${depositData.amount} USDT was rejected. Please contact support if you have questions.`,
          data: { type: 'system' }
        });
      }

      toast.success('Deposit rejected');
    } catch (error) {
      toast.error('Failed to reject deposit');
    }
  };

  const handleRejectWithdrawal = async (id: string) => {
    try {
      await updateDoc(doc(db, 'withdrawals', id), { status: 'rejected' });
      
      // Get withdrawal data to notify user
      const withdrawalSnap = await getDoc(doc(db, 'withdrawals', id));
      if (withdrawalSnap.exists()) {
        const withdrawalData = withdrawalSnap.data();
        // Refund user balance
        const userRef = doc(db, 'users', withdrawalData.userId);
        await updateDoc(userRef, {
          withdrawableBalance: increment(withdrawalData.amount)
        });

        sendNotification({
          toId: withdrawalData.userId,
          title: 'Withdrawal Rejected',
          body: `Your withdrawal of ${withdrawalData.amount} USDT was rejected and funds have been returned to your balance.`,
          data: { type: 'system' }
        });
      }

      toast.success('Withdrawal rejected');
    } catch (error) {
      toast.error('Failed to reject withdrawal');
    }
  };

  const handleCompleteWithdrawal = async (withdrawal: Withdrawal) => {
    try {
      await updateDoc(doc(db, 'withdrawals', withdrawal.id), { status: 'completed' });
      
      // If it's an influencer withdrawal, update their withdrawn balance
      const influencerRef = doc(db, 'influencers', withdrawal.userId);
      const influencerSnap = await getDoc(influencerRef);
      if (influencerSnap.exists()) {
        await updateDoc(influencerRef, {
          withdrawnBalance: increment(withdrawal.amount)
        });
      } else {
        // Regular user withdrawal
        await updateDoc(doc(db, 'users', withdrawal.userId), {
          withdrawableBalance: increment(-withdrawal.amount)
        });
      }
      
      // Notify user about withdrawal completion
      sendNotification({
        toId: withdrawal.userId,
        title: 'Withdrawal Completed!',
        body: `Your withdrawal of ${withdrawal.amount} USDT has been processed successfully.`,
        data: { type: 'system' }
      });

      toast.success('Withdrawal marked as completed!');
    } catch (error) {
      toast.error('Failed to update withdrawal');
    }
  };

  const handleToggleVerification = async (user: UserProfile) => {
    try {
      const newStatus = !user.isVerified;
      await updateDoc(doc(db, 'users', user.uid), { isVerified: newStatus });
      
      // Update all listings for this user
      const q = query(collection(db, 'listings'), where('sellerId', '==', user.uid));
      const snapshot = await getDocs(q);
      const updatePromises = snapshot.docs.map(listingDoc => 
        updateDoc(doc(db, 'listings', listingDoc.id), { sellerIsVerified: newStatus })
      );
      await Promise.all(updatePromises);

      // Notify user
      sendNotification({
        toId: user.uid,
        title: newStatus ? 'Verification Approved!' : 'Verification Removed',
        body: newStatus 
          ? 'Your account has been verified by an administrator. You now have a verified badge on your profile and listings.'
          : 'Your verification status has been removed by an administrator.',
        data: { type: 'system' }
      });

      toast.success(`User ${newStatus ? 'verified' : 'unverified'}`);
    } catch (error) {
      toast.error('Failed to update user verification status');
    }
  };

  const handleDeleteListing = async (id: string) => {
    try {
      const listingSnap = await getDoc(doc(db, 'listings', id));
      if (listingSnap.exists()) {
        const listingData = listingSnap.data();
        await updateDoc(doc(db, 'listings', id), { status: 'inactive' });
        
        // Notify seller
        sendNotification({
          toId: listingData.sellerId,
          title: 'Listing Deactivated',
          body: `Your listing "${listingData.title}" has been deactivated by an administrator.`,
          data: { type: 'system' }
        });
      }

      toast.success('Listing deactivated by admin');
      setShowDeleteListingModal(null);
    } catch (error) {
      toast.error('Failed to deactivate listing');
    }
  };

  const handleResolveOrder = async (orderId: string, decision: 'refund' | 'release') => {
    try {
      const orderRef = doc(db, 'orders', orderId);
      const orderSnap = await getDoc(orderRef);
      if (!orderSnap.exists()) return;
      const order = orderSnap.data() as Order;

      // Find associated dispute
      const qDispute = query(collection(db, 'disputes'), where('orderId', '==', orderId));
      const disputeSnap = await getDocs(qDispute);

      if (decision === 'refund') {
        const buyerRef = doc(db, 'users', order.buyerId);
        await updateDoc(buyerRef, { 
          availableBalance: increment(order.amount),
          escrowBalance: increment(-order.amount)
        });
        await updateDoc(orderRef, { status: 'cancelled', adminDecision: 'Refunded by Admin' });

        // Notify buyer about refund
        sendNotification({
          toId: order.buyerId,
          title: 'Order Refunded',
          body: `Admin has refunded your order for: ${order.listingTitle}`,
          data: { type: 'order', id: order.id }
        });

        // Notify seller about refund
        sendNotification({
          toId: order.sellerId,
          title: 'Order Refunded by Admin',
          body: `Admin has refunded the order for: ${order.listingTitle} to the buyer.`,
          data: { type: 'order', id: order.id }
        });
      } else {
        const sellerRef = doc(db, 'users', order.sellerId);
        const buyerRef = doc(db, 'users', order.buyerId);
        const totalFees = order.escrowFee + (order.featuredFee || 0);
        
        await updateDoc(buyerRef, {
          escrowBalance: increment(-order.amount)
        });
        await updateDoc(sellerRef, { withdrawableBalance: increment(order.amount - totalFees) });
        await updateDoc(orderRef, { status: 'completed', adminDecision: 'Released by Admin' });

        // Notify seller about released funds
        sendNotification({
          toId: order.sellerId,
          title: 'Order Released!',
          body: `Admin has released funds for your order: ${order.listingTitle}`,
          data: { type: 'order', id: order.id }
        });

        // Notify buyer about released funds
        sendNotification({
          toId: order.buyerId,
          title: 'Order Funds Released',
          body: `Admin has released the funds for order: ${order.listingTitle} to the seller.`,
          data: { type: 'order', id: order.id }
        });
        
        // Distribute Commissions
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
      }

      // Update dispute status if it exists
      if (!disputeSnap.empty) {
        await updateDoc(doc(db, 'disputes', disputeSnap.docs[0].id), {
          status: 'resolved',
          adminDecision: decision,
          updatedAt: new Date().toISOString()
        });
      }

      // Add timeline event
      await addDoc(collection(db, 'timeline'), {
        orderId: order.id,
        type: 'order_resolved',
        description: `Order resolved by Admin: ${decision === 'refund' ? 'Refunded to Buyer' : 'Released to Seller'}`,
        createdAt: new Date().toISOString()
      });

      toast.success(`Order resolved: ${decision}`);
      setSelectedOrder(null); // Close details view if open
    } catch (error) {
      toast.error('Failed to resolve order');
    }
  };

  const handleSaveSettings = async () => {
    try {
      await setDoc(doc(db, 'settings', 'platform'), settings);
      toast.success('Settings saved successfully!');
    } catch (error) {
      toast.error('Failed to save settings');
    }
  };

  if (loading || !profile) return <div className="text-center py-20 text-white">Loading Admin Control Center...</div>;
  if (profile.role !== 'admin') return <div className="text-center py-20 text-red-500 font-bold">Access Denied</div>;

  const totalVolume = orders.filter(o => o.status === 'completed').reduce((acc, o) => acc + o.amount, 0);
  const totalFees = totalVolume * (settings.marketplaceFeePercent / 100);

  return (
    <div className="space-y-8 pb-20">
      <div className="bg-orange-600/10 border border-orange-600/20 p-6 rounded-3xl mb-8">
        <div className="flex items-center space-x-4">
          <div className="h-12 w-12 bg-orange-600 rounded-2xl flex items-center justify-center">
            <Shield className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white uppercase tracking-tighter">Admin Control Center</h1>
            <p className="text-orange-500/70 text-sm font-bold uppercase tracking-widest">System Administrator Privileges Active</p>
          </div>
        </div>
      </div>
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex bg-zinc-900 p-1.5 rounded-2xl border border-zinc-800 overflow-x-auto no-scrollbar">
          {[
            { id: 'stats', icon: TrendingUp, label: 'Stats' },
            { id: 'deposits', icon: CreditCard, label: 'Deposits' },
            { id: 'withdrawals', icon: CreditCard, label: 'Withdrawals' },
            { id: 'users', icon: Users, label: 'Users' },
            { id: 'influencers', icon: Award, label: 'Influencers' },
            { id: 'videos', icon: Video, label: 'Videos' },
            { id: 'listings', icon: Shield, label: 'Listings' },
            { id: 'orders', icon: Shield, label: 'Orders' },
            { 
              id: 'support', 
              icon: MessageSquare, 
              label: 'Support',
              badge: tickets.filter(t => t.unreadByAdmin).length
            },
            { id: 'settings', icon: Settings, label: 'Settings' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center px-6 py-2.5 rounded-xl text-sm font-black transition-all whitespace-nowrap relative ${
                activeTab === tab.id ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/20' : 'text-zinc-500 hover:text-white hover:bg-zinc-800'
              }`}
            >
              <tab.icon className="h-4 w-4 mr-2" />
              {tab.label.toUpperCase()}
              {'badge' in tab && tab.badge > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-600 text-white text-[10px] flex items-center justify-center rounded-full border-2 border-zinc-900">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Tab */}
      {activeTab === 'stats' && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl">
              <div className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Total Users</div>
              <div className="text-4xl font-black text-white">{users.length}</div>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl">
              <div className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Total Listings</div>
              <div className="text-4xl font-black text-white">{listings.length}</div>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl">
              <div className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Total Volume</div>
              <div className="text-4xl font-black text-white">{totalVolume.toFixed(2)} USDT</div>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl">
              <div className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Est. Revenue</div>
              <div className="text-4xl font-black text-orange-500">{totalFees.toFixed(2)} USDT</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl">
              <h3 className="text-white font-bold mb-4 flex items-center">
                <CreditCard className="h-5 w-5 mr-2 text-orange-500" />
                Pending Deposits
              </h3>
              <div className="text-3xl font-black text-white mb-2">
                {deposits.filter(d => d.status === 'pending').length}
              </div>
              <button 
                onClick={() => setActiveTab('deposits')}
                className="text-orange-500 text-sm font-bold hover:underline"
              >
                View and Approve &rarr;
              </button>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl">
              <h3 className="text-white font-bold mb-4 flex items-center">
                <CreditCard className="h-5 w-5 mr-2 text-orange-500" />
                Pending Withdrawals
              </h3>
              <div className="text-3xl font-black text-white mb-2">
                {withdrawals.filter(w => w.status === 'pending').length}
              </div>
              <button 
                onClick={() => setActiveTab('withdrawals')}
                className="text-orange-500 text-sm font-bold hover:underline"
              >
                View and Process &rarr;
              </button>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl">
              <h3 className="text-white font-bold mb-4 flex items-center">
                <Shield className="h-5 w-5 mr-2 text-orange-500" />
                Disputed Orders
              </h3>
              <div className="text-3xl font-black text-white mb-2">
                {orders.filter(o => o.status === 'disputed').length}
              </div>
              <button 
                onClick={() => setActiveTab('orders')}
                className="text-orange-500 text-sm font-bold hover:underline"
              >
                Resolve Disputes &rarr;
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deposits Tab */}
      {activeTab === 'deposits' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden">
          <div className="p-6 border-b border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h2 className="text-xl font-bold text-white">Pending Deposits</h2>
            <div className="relative w-full md:w-64">
              <input
                type="text"
                placeholder="Search deposits..."
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl py-2 px-4 text-sm text-white focus:outline-none focus:border-orange-500"
                value={searchTermDeposits}
                onChange={(e) => setSearchTermDeposits(e.target.value)}
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-zinc-800/50 text-zinc-500 text-xs uppercase font-bold tracking-wider">
                <tr>
                  <th className="px-6 py-4">User</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4">TXID</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {deposits
                  .filter(d => d.status === 'pending')
                  .filter(d => 
                    d.userEmail.toLowerCase().includes(searchTermDeposits.toLowerCase()) ||
                    d.txid.toLowerCase().includes(searchTermDeposits.toLowerCase()) ||
                    d.userId.toLowerCase().includes(searchTermDeposits.toLowerCase())
                  )
                  .map(d => (
                  <tr key={d.id} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="text-white font-bold">{d.userEmail}</div>
                      <div className="text-[10px] text-zinc-500 font-mono">{d.userId}</div>
                    </td>
                    <td className="px-6 py-4 text-white font-mono">{d.amount} USDT</td>
                    <td className="px-6 py-4">
                      <div className="text-xs text-zinc-400 font-mono break-all max-w-xs">{d.txid}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-orange-900/20 text-orange-500 text-[10px] font-bold uppercase rounded">Pending</span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button onClick={() => setShowApproveDepositModal(d)} className="p-2 bg-green-600/20 text-green-500 hover:bg-green-600 hover:text-white rounded-lg transition-all">
                        <Check className="h-4 w-4" />
                      </button>
                      <button onClick={() => setShowRejectDepositModal(d.id)} className="p-2 bg-red-600/20 text-red-500 hover:bg-red-600 hover:text-white rounded-lg transition-all">
                        <X className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {deposits.filter(d => d.status === 'pending').length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-zinc-600">No pending deposits</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Withdrawals Tab */}
      {activeTab === 'withdrawals' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden">
          <div className="p-6 border-b border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h2 className="text-xl font-bold text-white">Pending Withdrawals</h2>
            <div className="relative w-full md:w-64">
              <input
                type="text"
                placeholder="Search withdrawals..."
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl py-2 px-4 text-sm text-white focus:outline-none focus:border-orange-500"
                value={searchTermWithdrawals}
                onChange={(e) => setSearchTermWithdrawals(e.target.value)}
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-zinc-800/50 text-zinc-500 text-xs uppercase font-bold tracking-wider">
                <tr>
                  <th className="px-6 py-4">User</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4">Address</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {withdrawals
                  .filter(w => w.status === 'pending')
                  .filter(w => 
                    w.userEmail.toLowerCase().includes(searchTermWithdrawals.toLowerCase()) ||
                    w.walletAddress.toLowerCase().includes(searchTermWithdrawals.toLowerCase()) ||
                    w.userId.toLowerCase().includes(searchTermWithdrawals.toLowerCase())
                  )
                  .map(w => (
                  <tr key={w.id} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="text-white font-bold">{w.userEmail}</div>
                      <div className="text-[10px] text-zinc-500 font-mono">{w.userId}</div>
                    </td>
                    <td className="px-6 py-4 text-white font-mono">{w.amount} USDT</td>
                    <td className="px-6 py-4">
                      <div className="text-xs text-zinc-400 font-mono break-all max-w-xs">{w.walletAddress}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-orange-900/20 text-orange-500 text-[10px] font-bold uppercase rounded">Pending</span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button onClick={() => setShowCompleteWithdrawalModal(w)} className="p-2 bg-green-600/20 text-green-500 hover:bg-green-600 hover:text-white rounded-lg transition-all">
                        <Check className="h-4 w-4" />
                      </button>
                      <button onClick={() => setShowRejectWithdrawalModal(w.id)} className="p-2 bg-red-600/20 text-red-500 hover:bg-red-600 hover:text-white rounded-lg transition-all">
                        <X className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {withdrawals.filter(w => w.status === 'pending').length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-zinc-600">No pending withdrawals</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Influencers Tab */}
      {activeTab === 'influencers' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden">
          <div className="p-6 border-b border-zinc-800">
            <h2 className="text-xl font-bold text-white">Influencer Management</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-zinc-800/50 text-zinc-500 text-xs uppercase font-bold tracking-wider">
                <tr>
                  <th className="px-6 py-4">Influencer</th>
                  <th className="px-6 py-4">Stats</th>
                  <th className="px-6 py-4">Earnings</th>
                  <th className="px-6 py-4">Rank</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {influencers.map(inf => (
                  <tr key={inf.uid} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="text-white font-bold">@{inf.username}</div>
                      <div className="text-[10px] text-zinc-500 font-mono">{inf.uid}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs text-zinc-400">Refs: {inf.totalReferrals}</div>
                      <div className="text-xs text-zinc-400">Sales: {inf.totalSales}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-white font-bold">{inf.totalEarnings.toFixed(2)} USDT</div>
                      <div className="text-[10px] text-zinc-500">Withdrawn: {inf.withdrawnBalance.toFixed(2)}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-orange-900/20 text-orange-500 text-[10px] font-bold uppercase rounded">{inf.rank}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="p-2 text-zinc-400 hover:text-white transition-colors">
                        <Shield className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Videos Tab */}
      {activeTab === 'videos' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden">
          <div className="p-6 border-b border-zinc-800">
            <h2 className="text-xl font-bold text-white">Video Approvals</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-zinc-800/50 text-zinc-500 text-xs uppercase font-bold tracking-wider">
                <tr>
                  <th className="px-6 py-4">Influencer</th>
                  <th className="px-6 py-4">Video</th>
                  <th className="px-6 py-4">Performance</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {videos.map(v => (
                  <tr key={v.id} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="text-white font-bold">{v.influencerName}</div>
                      <div className="text-[10px] text-zinc-500 font-mono">{v.influencerId}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-white font-bold line-clamp-1">{v.title}</div>
                      <a href={v.url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-orange-500 hover:underline flex items-center">
                        View Video <ExternalLink className="h-2 w-2 ml-1" />
                      </a>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs text-zinc-400">Views: {v.views.toLocaleString()}</div>
                      <div className="text-xs text-zinc-400">Bonus: {v.bonusEarned} USDT</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded ${
                        v.status === 'approved' ? 'bg-green-900/20 text-green-500' : 
                        v.status === 'pending' ? 'bg-orange-900/20 text-orange-500' : 'bg-red-900/20 text-red-500'
                      }`}>
                        {v.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      {v.status === 'pending' && (
                        <>
                          <button onClick={() => handleApproveVideo(v)} className="p-2 bg-green-600/20 text-green-500 hover:bg-green-600 hover:text-white rounded-lg transition-all">
                            <Check className="h-4 w-4" />
                          </button>
                          <button onClick={() => setShowRejectVideoModal(v)} className="p-2 bg-red-600/20 text-red-500 hover:bg-red-600 hover:text-white rounded-lg transition-all">
                            <X className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {activeTab === 'listings' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden">
          <div className="p-6 border-b border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h2 className="text-xl font-bold text-white">All Listings</h2>
            <div className="relative w-full md:w-64">
              <input
                type="text"
                placeholder="Search listings..."
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl py-2 px-4 text-sm text-white focus:outline-none focus:border-orange-500"
                value={searchTermListings}
                onChange={(e) => setSearchTermListings(e.target.value)}
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-zinc-800/50 text-zinc-500 text-xs uppercase font-bold tracking-wider">
                <tr>
                  <th className="px-6 py-4">Title</th>
                  <th className="px-6 py-4">Seller</th>
                  <th className="px-6 py-4">Price</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {listings
                  .filter(l => 
                    l.title.toLowerCase().includes(searchTermListings.toLowerCase()) ||
                    l.sellerName.toLowerCase().includes(searchTermListings.toLowerCase()) ||
                    l.category.toLowerCase().includes(searchTermListings.toLowerCase())
                  )
                  .map(l => (
                  <tr key={l.id} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        {l.image_url ? (
                          <div className="w-10 h-10 rounded-lg overflow-hidden bg-zinc-800 flex-shrink-0">
                            <img src={l.image_url} alt={l.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center flex-shrink-0">
                            <span className="text-zinc-500 text-xs">No img</span>
                          </div>
                        )}
                        <div>
                          <div className="text-white font-bold">{l.title}</div>
                          <div className="text-xs text-zinc-500">{l.category}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-zinc-400 text-sm flex items-center">
                        {l.sellerName}
                        {l.sellerIsVerified && <BadgeCheck className="h-3 w-3 ml-1 text-blue-500" />}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-white font-mono">{l.price} USDT</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded ${
                        l.status === 'active' ? 'bg-green-900/20 text-green-500' : 'bg-zinc-800 text-zinc-500'
                      }`}>
                        {l.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => setShowDeleteListingModal(l.id)} className="p-2 text-zinc-400 hover:text-red-500 transition-colors">
                        <X className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Orders Tab */}
      {activeTab === 'orders' && !selectedOrder && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden">
          <div className="p-6 border-b border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h2 className="text-xl font-bold text-white">All Orders</h2>
            <div className="relative w-full md:w-64">
              <input
                type="text"
                placeholder="Search orders..."
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl py-2 px-4 text-sm text-white focus:outline-none focus:border-orange-500"
                value={searchTermOrders}
                onChange={(e) => setSearchTermOrders(e.target.value)}
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-zinc-800/50 text-zinc-500 text-xs uppercase font-bold tracking-wider">
                <tr>
                  <th className="px-6 py-4">Order ID</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {orders
                  .filter(o => 
                    o.id.toLowerCase().includes(searchTermOrders.toLowerCase()) ||
                    o.listingTitle.toLowerCase().includes(searchTermOrders.toLowerCase()) ||
                    o.buyerId.toLowerCase().includes(searchTermOrders.toLowerCase()) ||
                    o.sellerId.toLowerCase().includes(searchTermOrders.toLowerCase())
                  )
                  .sort((a, b) => {
                    // Put disputed orders first
                    if (a.status === 'disputed' && b.status !== 'disputed') return -1;
                    if (a.status !== 'disputed' && b.status === 'disputed') return 1;
                    // Then sort by newest
                    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                  })
                  .map(o => (
                  <tr key={o.id} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="text-white font-bold">#{o.id.slice(-8)}</div>
                      <div className="text-xs text-zinc-500">{o.listingTitle}</div>
                    </td>
                    <td className="px-6 py-4 text-white font-mono">{o.amount} USDT</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded ${
                        o.status === 'completed' ? 'bg-green-900/20 text-green-500' : 
                        o.status === 'active' || o.status === 'in_progress' || o.status === 'delivered' ? 'bg-blue-900/20 text-blue-500' : 
                        o.status === 'pending_payment' || o.status === 'pending_seller_approval' ? 'bg-orange-900/20 text-orange-500' : 'bg-red-900/20 text-red-500'
                      }`}>
                        {o.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      {o.status === 'pending_payment' && (
                        <>
                          <button 
                            onClick={async () => {
                              try {
                                await updateDoc(doc(db, 'orders', o.id), { status: 'active', updatedAt: new Date().toISOString() });
                                toast.success('Payment approved and order activated!');
                              } catch (error) {
                                toast.error('Failed to approve payment');
                              }
                            }} 
                            className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-lg"
                          >
                            Approve
                          </button>
                          <button 
                            onClick={async () => {
                              try {
                                await updateDoc(doc(db, 'orders', o.id), { status: 'cancelled', updatedAt: new Date().toISOString() });
                                // Refund buyer
                                const buyerRef = doc(db, 'users', o.buyerId);
                                await updateDoc(buyerRef, {
                                  availableBalance: increment(o.amount),
                                  escrowBalance: increment(-o.amount)
                                });
                                toast.success('Payment rejected and buyer refunded');
                              } catch (error) {
                                toast.error('Failed to reject payment');
                              }
                            }} 
                            className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg"
                          >
                            Reject
                          </button>
                        </>
                      )}
                      {o.status === 'disputed' && (
                        <>
                          <button onClick={() => setShowResolveOrderModal({ orderId: o.id, decision: 'refund' })} className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg">
                            Refund
                          </button>
                          <button onClick={() => setShowResolveOrderModal({ orderId: o.id, decision: 'release' })} className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-lg">
                            Release
                          </button>
                        </>
                      )}
                      <button 
                        onClick={() => setSelectedOrder(o)}
                        className="p-2 text-zinc-400 hover:text-white transition-colors"
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Order Details View */}
      {activeTab === 'orders' && selectedOrder && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <button 
              onClick={() => setSelectedOrder(null)}
              className="flex items-center text-zinc-400 hover:text-white transition-colors"
            >
              <ArrowRight className="h-4 w-4 mr-2 rotate-180" />
              Back to Orders
            </button>
            <div className="flex items-center space-x-3">
              <span className={`px-3 py-1 text-xs font-bold uppercase rounded-full ${
                selectedOrder.status === 'completed' ? 'bg-green-900/20 text-green-500' : 
                selectedOrder.status === 'disputed' ? 'bg-red-900/20 text-red-500' : 'bg-blue-900/20 text-blue-500'
              }`}>
                {selectedOrder.status}
              </span>
              <span className="text-zinc-500 font-mono text-sm">#{selectedOrder.id}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Order Info */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl">
                <h3 className="text-lg font-bold text-white mb-4">Order Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-zinc-500 uppercase font-bold mb-1">Listing</div>
                    <div className="text-white font-bold">{selectedOrder.listingTitle}</div>
                  </div>
                  <div>
                    <div className="text-xs text-zinc-500 uppercase font-bold mb-1">Amount</div>
                    <div className="text-white font-mono">{selectedOrder.amount} USDT</div>
                  </div>
                  <div>
                    <div className="text-xs text-zinc-500 uppercase font-bold mb-1">Buyer ID</div>
                    <div className="text-zinc-400 text-xs font-mono">{selectedOrder.buyerId}</div>
                  </div>
                  <div>
                    <div className="text-xs text-zinc-500 uppercase font-bold mb-1">Seller ID</div>
                    <div className="text-zinc-400 text-xs font-mono">{selectedOrder.sellerId}</div>
                  </div>
                </div>
                {selectedOrder.deliveryDetails && (
                  <div className="mt-6 p-4 bg-zinc-800 rounded-2xl border border-zinc-700">
                    <div className="text-xs text-zinc-500 uppercase font-bold mb-2">Seller's Delivery Details</div>
                    <div className="text-sm text-white font-mono whitespace-pre-wrap">{selectedOrder.deliveryDetails}</div>
                  </div>
                )}
              </div>

              {/* Chat Logs */}
              <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center">
                  <MessageSquare className="h-5 w-5 mr-2 text-orange-500" />
                  Order Chat Logs
                </h3>
                <div className="space-y-4 max-h-[400px] overflow-y-auto p-4 bg-zinc-950 rounded-2xl border border-zinc-800">
                  {orderMessages.length > 0 ? (
                    orderMessages.map((m) => (
                      <div key={m.id} className={`flex flex-col ${m.senderId === selectedOrder.buyerId ? 'items-start' : 'items-end'}`}>
                        <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${
                          m.senderId === selectedOrder.buyerId ? 'bg-zinc-800 text-white' : 'bg-orange-600 text-white'
                        }`}>
                          {m.text}
                        </div>
                        <div className="text-[10px] text-zinc-500 mt-1">
                          {m.senderId === selectedOrder.buyerId ? 'Buyer' : 'Seller'} • {new Date(m.createdAt).toLocaleTimeString()}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-10 text-zinc-600 italic">No messages found for this order.</div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Dispute & Actions */}
            <div className="space-y-6">
              {dispute && (
                <div className="bg-red-900/10 border border-red-900/20 p-6 rounded-3xl">
                  <h3 className="text-lg font-bold text-red-500 mb-4 flex items-center">
                    <AlertCircle className="h-5 w-5 mr-2" />
                    Dispute Details
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <div className="text-xs text-zinc-500 uppercase font-bold mb-1">Reason</div>
                      <div className="text-white font-bold capitalize">{dispute.reason.replace(/_/g, ' ')}</div>
                    </div>
                    <div>
                      <div className="text-xs text-zinc-500 uppercase font-bold mb-1">Status</div>
                      <div className={`text-xs font-bold uppercase ${dispute.status === 'open' ? 'text-red-500' : 'text-green-500'}`}>
                        {dispute.status}
                      </div>
                    </div>
                    
                    {evidence.length > 0 && (
                      <div>
                        <div className="text-xs text-zinc-500 uppercase font-bold mb-2">Evidence Submitted</div>
                        <div className="grid grid-cols-2 gap-2">
                          {evidence.map((ev) => (
                            <a 
                              key={ev.id} 
                              href={ev.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="p-2 bg-zinc-800 border border-zinc-700 rounded-xl text-[10px] text-zinc-400 hover:text-white hover:border-zinc-600 transition-all flex flex-col items-center text-center"
                            >
                              <ExternalLink className="h-4 w-4 mb-1" />
                              {ev.type.replace(/_/g, ' ')}
                              <div className="mt-1 opacity-50">{ev.userId === selectedOrder.buyerId ? 'Buyer' : 'Seller'}</div>
                              {ev.description && <div className="mt-1 text-xs text-zinc-300">{ev.description}</div>}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {selectedOrder.status === 'disputed' && (
                <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl">
                  <h3 className="text-lg font-bold text-white mb-4">Final Decision</h3>
                  <p className="text-xs text-zinc-500 mb-6">As an administrator, your decision is final. Choose carefully based on the evidence and chat logs provided.</p>
                  
                  {(() => {
                    const disputeOpenedAt = dispute?.createdAt ? new Date(dispute.createdAt).getTime() : 0;
                    const now = new Date().getTime();
                    const hoursSinceDispute = (now - disputeOpenedAt) / (1000 * 60 * 60);
                    const isAppealWindowOpen = hoursSinceDispute <= 24;

                    if (isAppealWindowOpen) {
                      return (
                        <div className="p-4 bg-orange-900/20 border border-orange-800/50 rounded-2xl mb-4">
                          <p className="text-orange-500 text-sm font-bold text-center">
                            Appeal window is still open ({Math.ceil(24 - hoursSinceDispute)}h remaining). Please wait for both parties to submit their appeals before making a decision.
                          </p>
                        </div>
                      );
                    }

                    return (
                      <div className="grid grid-cols-1 gap-3">
                        <button 
                          onClick={() => setShowResolveOrderModal({ orderId: selectedOrder.id, decision: 'release' })}
                          className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-2xl font-bold transition-all flex items-center justify-center"
                        >
                          <Check className="h-5 w-5 mr-2" />
                          Release to Seller
                        </button>
                        <button 
                          onClick={() => setShowResolveOrderModal({ orderId: selectedOrder.id, decision: 'refund' })}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-2xl font-bold transition-all flex items-center justify-center"
                        >
                          <Check className="h-5 w-5 mr-2" />
                          Refund to Buyer
                        </button>
                      </div>
                    );
                  })()}
                </div>
              )}

              <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl">
                <h3 className="text-lg font-bold text-white mb-4">Quick Actions</h3>
                <div className="space-y-3">
                  <div className="w-full p-3 bg-zinc-800 text-zinc-400 rounded-2xl text-sm font-bold flex items-center">
                    <User className="h-4 w-4 mr-2" />
                    Buyer: {selectedOrder.buyerId}
                  </div>
                  <div className="w-full p-3 bg-zinc-800 text-zinc-400 rounded-2xl text-sm font-bold flex items-center">
                    <User className="h-4 w-4 mr-2" />
                    Seller: {selectedOrder.sellerId}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {activeTab === 'users' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden">
          <div className="p-6 border-b border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h2 className="text-xl font-bold text-white">Platform Users</h2>
            <div className="relative w-full md:w-64">
              <input
                type="text"
                placeholder="Search users..."
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl py-2 px-4 text-sm text-white focus:outline-none focus:border-orange-500"
                value={searchTermUsers}
                onChange={(e) => setSearchTermUsers(e.target.value)}
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-zinc-800/50 text-zinc-500 text-xs uppercase font-bold tracking-wider">
                <tr>
                  <th className="px-6 py-4">User</th>
                  <th className="px-6 py-4">Role</th>
                  <th className="px-6 py-4">Balance</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {users
                  .filter(u => 
                    u.email.toLowerCase().includes(searchTermUsers.toLowerCase()) ||
                    (u.displayName || '').toLowerCase().includes(searchTermUsers.toLowerCase()) ||
                    u.uid.toLowerCase().includes(searchTermUsers.toLowerCase())
                  )
                  .map(u => (
                  <tr key={u.uid} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="text-white font-bold flex items-center">
                        {u.displayName}
                        {u.isVerified && <BadgeCheck className="h-4 w-4 ml-1 text-blue-500" />}
                      </div>
                      <div className="text-xs text-zinc-500">{u.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-zinc-800 text-zinc-400 text-[10px] font-bold uppercase rounded">{u.role}</span>
                    </td>
                    <td className="px-6 py-4 text-white font-mono">{(u.availableBalance || 0).toFixed(2)} USDT</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded ${
                        u.isSuspended ? 'bg-red-900/20 text-red-500' : 'bg-green-900/20 text-green-500'
                      }`}>
                        {u.isSuspended ? 'Suspended' : 'Active'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right flex justify-end gap-2">
                      <button
                        onClick={() => handleToggleVerification(u)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                          u.isVerified ? 'bg-zinc-700 hover:bg-zinc-600 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'
                        }`}
                      >
                        {u.isVerified ? 'Unverify' : 'Verify'}
                      </button>
                      <button
                        onClick={() => handleToggleSuspension(u)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                          u.isSuspended ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-red-600 hover:bg-red-700 text-white'
                        }`}
                      >
                        {u.isSuspended ? 'Unsuspend' : 'Suspend'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Support Tab */}
      {activeTab === 'support' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-[700px]">
          {/* Ticket List */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden flex flex-col">
            <div className="p-6 border-b border-zinc-800">
              <h2 className="text-xl font-bold text-white">Support Tickets</h2>
            </div>
            <div className="flex-1 overflow-y-auto no-scrollbar">
              {tickets.map(t => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTicket(t)}
                  className={`w-full p-6 text-left border-b border-zinc-800 transition-all hover:bg-zinc-800/50 ${
                    selectedTicket?.id === t.id ? 'bg-orange-600/10 border-l-4 border-l-orange-600' : ''
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <p className="text-white font-bold truncate pr-4">{t.userName}</p>
                    {t.unreadByAdmin && (
                      <span className="h-2 w-2 bg-orange-600 rounded-full"></span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-500 truncate mb-2">{t.lastMessage}</p>
                  <div className="flex justify-between items-center">
                    <p className="text-[10px] text-zinc-600 font-mono">{t.userEmail}</p>
                    <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">
                      {new Date(t.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                </button>
              ))}
              {tickets.length === 0 && (
                <div className="p-12 text-center">
                  <MessageSquare className="h-12 w-12 text-zinc-800 mx-auto mb-4" />
                  <p className="text-zinc-600 font-bold">No support tickets</p>
                </div>
              )}
            </div>
          </div>

          {/* Chat Area */}
          <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden flex flex-col">
            {selectedTicket ? (
              <>
                <div className="p-4 border-b border-zinc-800 bg-zinc-900/50 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="h-10 w-10 bg-zinc-800 rounded-xl flex items-center justify-center">
                      <User className="h-5 w-5 text-zinc-400" />
                    </div>
                    <div>
                      <p className="text-white font-bold">{selectedTicket.userName}</p>
                      <p className="text-[10px] text-zinc-500 font-mono">{selectedTicket.userEmail}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
                      selectedTicket.status === 'open' ? 'bg-green-900/20 text-green-500' : 'bg-zinc-800 text-zinc-500'
                    }`}>
                      {selectedTicket.status}
                    </span>
                    <button 
                      onClick={async () => {
                        const newStatus = selectedTicket.status === 'open' ? 'closed' : 'open';
                        await updateDoc(doc(db, 'support_tickets', selectedTicket.id), { status: newStatus });
                        toast.success(`Ticket marked as ${newStatus}`);
                      }}
                      className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-all"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]">
                  {supportMessages.map(msg => (
                    <div 
                      key={msg.id} 
                      className={`flex ${msg.senderId === profile?.uid ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[80%] rounded-2xl p-4 ${
                        msg.senderId === profile?.uid 
                          ? 'bg-orange-600 text-white rounded-tr-none' 
                          : 'bg-zinc-800 text-zinc-100 rounded-tl-none border border-zinc-700'
                      }`}>
                        <p className="text-sm leading-relaxed">{msg.text}</p>
                        <p className={`text-[10px] mt-2 font-bold uppercase tracking-widest ${
                          msg.senderId === profile?.uid ? 'text-orange-200' : 'text-zinc-500'
                        }`}>
                          {new Date(msg.createdAt).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <form onSubmit={handleSendSupportMessage} className="p-4 bg-zinc-900 border-t border-zinc-800">
                  <div className="flex space-x-4">
                    <input 
                      type="text"
                      placeholder="Type your reply here..."
                      className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-orange-500 transition-all"
                      value={newSupportMessage}
                      onChange={(e) => setNewSupportMessage(e.target.value)}
                    />
                    <button 
                      type="submit"
                      disabled={!newSupportMessage.trim()}
                      className="px-6 bg-orange-600 hover:bg-orange-700 disabled:bg-zinc-800 text-white rounded-xl font-bold transition-all flex items-center"
                    >
                      <Send className="h-5 w-5" />
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
                <div className="h-20 w-20 bg-zinc-800 rounded-3xl flex items-center justify-center mb-6">
                  <MessageSquare className="h-10 w-10 text-zinc-700" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Select a Ticket</h3>
                <p className="text-zinc-500 max-w-xs">Choose a support ticket from the list to view the conversation and reply.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 max-w-2xl">
          <h2 className="text-xl font-bold text-white mb-8">Platform Settings</h2>
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Admin TRC20 Wallet Address</label>
              <input
                type="text"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-orange-500"
                value={settings.adminWalletTRC20 ?? ''}
                onChange={e => setSettings({...settings, adminWalletTRC20: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Admin ERC20 Wallet Address</label>
              <input
                type="text"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-orange-500"
                value={settings.adminWalletERC20 ?? ''}
                onChange={e => setSettings({...settings, adminWalletERC20: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Admin BEP20 Wallet Address</label>
              <input
                type="text"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-orange-500"
                value={settings.adminWalletBEP20 ?? ''}
                onChange={e => setSettings({...settings, adminWalletBEP20: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Marketplace Fee (%)</label>
              <input
                type="number"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-orange-500"
                value={settings.marketplaceFeePercent ?? ''}
                onChange={e => setSettings({...settings, marketplaceFeePercent: parseFloat(e.target.value)})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Global Announcement</label>
              <textarea
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-orange-500"
                rows={3}
                value={settings.announcement ?? ''}
                onChange={e => setSettings({...settings, announcement: e.target.value})}
              ></textarea>
            </div>

            <div className="pt-8 border-t border-zinc-800">
              <h3 className="text-lg font-bold text-white mb-6">Referral Commission Levels (%)</h3>
              <div className="grid grid-cols-5 gap-4">
                {[1, 2, 3, 4, 5].map(level => (
                  <div key={level}>
                    <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Level {level}</label>
                    <input
                      type="number"
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-orange-500"
                      value={settings.referralCommissionLevels[level] ?? ''}
                      onChange={e => setSettings({
                        ...settings, 
                        referralCommissionLevels: {
                          ...settings.referralCommissionLevels,
                          [level]: parseFloat(e.target.value)
                        }
                      })}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-8 border-t border-zinc-800">
              <h3 className="text-lg font-bold text-white mb-6">Video Bonus Structure (USDT)</h3>
              <div className="space-y-4">
                {Object.entries(settings.videoBonusStructure).sort((a, b) => parseInt(a[0]) - parseInt(b[0])).map(([views, bonus]) => (
                  <div key={views} className="flex items-center space-x-4">
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Views Threshold</label>
                      <input
                        type="number"
                        disabled
                        className="w-full bg-zinc-800/50 border border-zinc-700 rounded-xl py-3 px-4 text-zinc-500"
                        value={views}
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Bonus Amount</label>
                      <input
                        type="number"
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-orange-500"
                        value={bonus}
                        onChange={e => setSettings({
                          ...settings,
                          videoBonusStructure: {
                            ...settings.videoBonusStructure,
                            [views]: parseFloat(e.target.value)
                          }
                        })}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="pt-8 border-t border-zinc-800">
              <h3 className="text-lg font-bold text-white mb-6">Home Banner Settings</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">Banner Title</label>
                  <input
                    type="text"
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-orange-500"
                    value={settings.bannerTitle ?? ''}
                    onChange={e => setSettings({...settings, bannerTitle: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">Banner Subtitle</label>
                  <input
                    type="text"
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-orange-500"
                    value={settings.bannerSubtitle ?? ''}
                    onChange={e => setSettings({...settings, bannerSubtitle: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">Banner Image URL</label>
                  <input
                    type="text"
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-orange-500"
                    value={settings.bannerImageUrl ?? ''}
                    onChange={e => setSettings({...settings, bannerImageUrl: e.target.value})}
                  />
                  <p className="text-[10px] text-zinc-500 mt-1 uppercase font-bold tracking-wider">Recommended size: 1920x600px or 1920x800px for best fit.</p>
                </div>
              </div>
            </div>

            <button
              onClick={handleSaveSettings}
              className="w-full py-4 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold transition-all"
            >
              Save All Settings
            </button>
          </div>
        </div>
      )}
      {/* Admin Modals */}
      {showDeleteListingModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-md p-8 shadow-2xl">
            <h2 className="text-2xl font-bold text-white mb-4">Deactivate Listing</h2>
            <p className="text-zinc-400 mb-8">Are you sure you want to deactivate this listing? It will no longer be visible in the marketplace.</p>
            <div className="flex gap-4">
              <button
                onClick={() => setShowDeleteListingModal(null)}
                className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-bold transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteListing(showDeleteListingModal)}
                className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-all"
              >
                Deactivate
              </button>
            </div>
          </div>
        </div>
      )}

      {showRejectVideoModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-md p-8 shadow-2xl">
            <h2 className="text-2xl font-bold text-white mb-4">Reject Video</h2>
            <p className="text-zinc-400 mb-4">Please enter the rejection reason for this video:</p>
            <textarea
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-orange-500 mb-6"
              rows={4}
              placeholder="Explain why the video was rejected..."
              value={modalInput}
              onChange={(e) => setModalInput(e.target.value)}
            />
            <div className="flex gap-4">
              <button
                onClick={() => {
                  setShowRejectVideoModal(null);
                  setModalInput('');
                }}
                className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-bold transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => handleRejectVideo(showRejectVideoModal, modalInput || 'No reason provided')}
                className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-all"
              >
                Reject Video
              </button>
            </div>
          </div>
        </div>
      )}

      {showApproveDepositModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-md p-8 shadow-2xl">
            <h2 className="text-2xl font-bold text-white mb-4">Approve Deposit</h2>
            <p className="text-zinc-400 mb-8">Are you sure you want to approve this deposit of <span className="text-white font-bold">{showApproveDepositModal.amount} USDT</span> for <span className="text-white font-bold">{showApproveDepositModal.userEmail}</span>?</p>
            <div className="flex gap-4">
              <button
                onClick={() => setShowApproveDepositModal(null)}
                className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-bold transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  handleApproveDeposit(showApproveDepositModal);
                  setShowApproveDepositModal(null);
                }}
                className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold transition-all"
              >
                Approve
              </button>
            </div>
          </div>
        </div>
      )}

      {showRejectDepositModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-md p-8 shadow-2xl">
            <h2 className="text-2xl font-bold text-white mb-4">Reject Deposit</h2>
            <p className="text-zinc-400 mb-8">Are you sure you want to reject this deposit request?</p>
            <div className="flex gap-4">
              <button
                onClick={() => setShowRejectDepositModal(null)}
                className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-bold transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  handleRejectDeposit(showRejectDepositModal);
                  setShowRejectDepositModal(null);
                }}
                className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-all"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {showCompleteWithdrawalModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-md p-8 shadow-2xl">
            <h2 className="text-2xl font-bold text-white mb-4">Complete Withdrawal</h2>
            <p className="text-zinc-400 mb-8">Are you sure you want to mark this withdrawal of <span className="text-white font-bold">{showCompleteWithdrawalModal.amount} USDT</span> for <span className="text-white font-bold">{showCompleteWithdrawalModal.userEmail}</span> as completed?</p>
            <div className="flex gap-4">
              <button
                onClick={() => setShowCompleteWithdrawalModal(null)}
                className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-bold transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  handleCompleteWithdrawal(showCompleteWithdrawalModal);
                  setShowCompleteWithdrawalModal(null);
                }}
                className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold transition-all"
              >
                Complete
              </button>
            </div>
          </div>
        </div>
      )}

      {showRejectWithdrawalModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-md p-8 shadow-2xl">
            <h2 className="text-2xl font-bold text-white mb-4">Reject Withdrawal</h2>
            <p className="text-zinc-400 mb-8">Are you sure you want to reject this withdrawal request?</p>
            <div className="flex gap-4">
              <button
                onClick={() => setShowRejectWithdrawalModal(null)}
                className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-bold transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  handleRejectWithdrawal(showRejectWithdrawalModal);
                  setShowRejectWithdrawalModal(null);
                }}
                className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-all"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {showResolveOrderModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-md p-8 shadow-2xl">
            <h2 className="text-2xl font-bold text-white mb-4">Resolve Dispute</h2>
            <p className="text-zinc-400 mb-8">
              Are you sure you want to <span className={`font-bold ${showResolveOrderModal.decision === 'refund' ? 'text-blue-500' : 'text-green-500'}`}>{showResolveOrderModal.decision}</span> this order? This action is final and will update balances accordingly.
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => setShowResolveOrderModal(null)}
                className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-bold transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  handleResolveOrder(showResolveOrderModal.orderId, showResolveOrderModal.decision);
                  setShowResolveOrderModal(null);
                }}
                className={`flex-1 py-3 text-white rounded-xl font-bold transition-all ${
                  showResolveOrderModal.decision === 'refund' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                Confirm {showResolveOrderModal.decision === 'refund' ? 'Refund' : 'Release'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
