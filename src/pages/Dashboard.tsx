import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../AuthContext';
import { Listing, Order } from '../types';
import { Plus, Package, ShoppingBag, TrendingUp, Edit, Trash2, ExternalLink, Shield, BadgeCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { uploadFile } from '../lib/upload';
import { notifyAllBuyers } from '../lib/notificationService';

const Dashboard: React.FC = () => {
  const { profile } = useAuth();
  const [myListings, setMyListings] = useState<Listing[]>([]);
  const [mySales, setMySales] = useState<Order[]>([]);
  const [myOrders, setMyOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingListing, setEditingListing] = useState<Listing | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);

  // Form state for new listing
  const [newListing, setNewListing] = useState({
    title: '',
    description: '',
    price: '',
    originalPrice: '',
    discountedPrice: '',
    isFlashSale: false,
    flashSaleEndsAt: '',
    category: 'eBay Accounts',
    deliveryMethod: 'Instant',
    deliveryTime: '1 Hour',
    isFeatured: false,
    serviceType: 'fixed',
    percentageRate: '',
    minRefundAmount: '',
    maxRefundAmount: '',
    securityDepositAmount: '',
    requireSellerApproval: false,
    vaMonthlyPrice: '',
    vaSalesPercentage: ''
  });
  const [listingImage, setListingImage] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!profile) return;

    let unsubListings = () => {};
    let unsubSales = () => {};
    let unsubOrders = () => {};

    if (profile.role === 'seller' || profile.role === 'admin') {
      const qListings = query(collection(db, 'listings'), where('sellerId', '==', profile.uid));
      unsubListings = onSnapshot(qListings, (snapshot) => {
        setMyListings(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Listing))
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'listings');
      });

      const qSales = query(collection(db, 'orders'), where('sellerId', '==', profile.uid));
      unsubSales = onSnapshot(qSales, (snapshot) => {
        setMySales(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order))
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
        setLoading(false);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'orders');
        setLoading(false);
      });
    }

    if (profile.role === 'buyer' || profile.role === 'admin') {
      const qOrders = query(collection(db, 'orders'), where('buyerId', '==', profile.uid));
      unsubOrders = onSnapshot(qOrders, (snapshot) => {
        setMyOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order))
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
        setLoading(false);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'orders');
        setLoading(false);
      });
    }

    return () => {
      unsubListings();
      unsubSales();
      unsubOrders();
    };
  }, [profile]);

  const handleAddListing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || profile.role !== 'seller') {
      toast.error('Only sellers can create listings');
      return;
    }

    if (!listingImage) {
      toast.error('Please upload a listing image');
      return;
    }

    setUploading(true);
    try {
      let imageUrl = '';
      if (listingImage) {
        imageUrl = await uploadFile(listingImage, 'listings/images', profile.uid);
      }

      const listingData: any = {
        ...newListing,
        price: parseFloat(newListing.price) || 0,
        originalPrice: parseFloat(newListing.originalPrice) || 0,
        discountedPrice: parseFloat(newListing.discountedPrice) || 0,
        isFlashSale: newListing.isFlashSale,
        flashSaleEndsAt: newListing.flashSaleEndsAt || null,
        sellerId: profile.uid,
        sellerName: profile.displayName,
        sellerIsVerified: profile.isVerified || false,
        status: 'active',
        isFeatured: newListing.isFeatured,
        createdAt: new Date().toISOString(),
        image_url: imageUrl
      };
      
      if (newListing.serviceType === 'percentage' || newListing.serviceType === 'refund_percentage') {
        listingData.percentageRate = parseFloat(newListing.percentageRate) || 0;
      }
      if (newListing.serviceType === 'refund_percentage') {
        listingData.minRefundAmount = parseFloat(newListing.minRefundAmount) || 0;
        listingData.maxRefundAmount = parseFloat(newListing.maxRefundAmount) || 0;
      }
      if (newListing.serviceType === 'va_service') {
        listingData.vaMonthlyPrice = parseFloat(newListing.vaMonthlyPrice) || 0;
        listingData.vaSalesPercentage = parseFloat(newListing.vaSalesPercentage) || 0;
      }
      if (newListing.serviceType !== 'fixed') {
        listingData.securityDepositAmount = parseFloat(newListing.securityDepositAmount) || 0;
        listingData.requireSellerApproval = newListing.requireSellerApproval;
      }

      const docRef = await addDoc(collection(db, 'listings'), listingData);
      
      // Notify all buyers about the new listing
      notifyAllBuyers(
        'New Listing Available!',
        `${profile.displayName} just posted: ${newListing.title}`,
        { type: 'listing', id: docRef.id }
      );

      toast.success('Listing created successfully!');
      setShowAddModal(false);
      setNewListing({
        title: '',
        description: '',
        price: '',
        originalPrice: '',
        discountedPrice: '',
        isFlashSale: false,
        flashSaleEndsAt: '',
        category: 'eBay Accounts',
        deliveryMethod: 'Instant',
        deliveryTime: '1 Hour',
        isFeatured: false,
        serviceType: 'fixed',
        percentageRate: '',
        minRefundAmount: '',
        maxRefundAmount: '',
        securityDepositAmount: '',
        requireSellerApproval: false,
        vaMonthlyPrice: '',
        vaSalesPercentage: ''
      });
      setListingImage(null);
    } catch (error) {
      toast.error('Failed to create listing');
    } finally {
      setUploading(false);
    }
  };

  const handleEditListing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !editingListing) return;

    setUploading(true);
    try {
      let imageUrl = editingListing.image_url;
      if (listingImage) {
        imageUrl = await uploadFile(listingImage, 'listings/images', profile.uid);
      }

      const listingData: any = {
        ...newListing,
        price: parseFloat(newListing.price) || 0,
        originalPrice: parseFloat(newListing.originalPrice) || 0,
        discountedPrice: parseFloat(newListing.discountedPrice) || 0,
        isFlashSale: newListing.isFlashSale,
        flashSaleEndsAt: newListing.flashSaleEndsAt || null,
        image_url: imageUrl,
        updatedAt: new Date().toISOString()
      };

      if (newListing.serviceType === 'percentage' || newListing.serviceType === 'refund_percentage') {
        listingData.percentageRate = parseFloat(newListing.percentageRate) || 0;
      }
      if (newListing.serviceType === 'refund_percentage') {
        listingData.minRefundAmount = parseFloat(newListing.minRefundAmount) || 0;
        listingData.maxRefundAmount = parseFloat(newListing.maxRefundAmount) || 0;
      }
      if (newListing.serviceType === 'va_service') {
        listingData.vaMonthlyPrice = parseFloat(newListing.vaMonthlyPrice) || 0;
        listingData.vaSalesPercentage = parseFloat(newListing.vaSalesPercentage) || 0;
      }
      if (newListing.serviceType !== 'fixed') {
        listingData.securityDepositAmount = parseFloat(newListing.securityDepositAmount) || 0;
        listingData.requireSellerApproval = newListing.requireSellerApproval;
      }

      await updateDoc(doc(db, 'listings', editingListing.id), listingData);
      toast.success('Listing updated successfully!');
      setShowEditModal(false);
      setEditingListing(null);
      setNewListing({
        title: '',
        description: '',
        price: '',
        originalPrice: '',
        discountedPrice: '',
        isFlashSale: false,
        flashSaleEndsAt: '',
        category: 'eBay Accounts',
        deliveryMethod: 'Instant',
        deliveryTime: '1 Hour',
        isFeatured: false,
        serviceType: 'fixed',
        percentageRate: '',
        minRefundAmount: '',
        maxRefundAmount: '',
        securityDepositAmount: '',
        requireSellerApproval: false,
        vaMonthlyPrice: '',
        vaSalesPercentage: ''
      });
      setListingImage(null);
    } catch (error) {
      toast.error('Failed to update listing');
    } finally {
      setUploading(false);
    }
  };

  const openEditModal = (listing: Listing) => {
    setEditingListing(listing);
    setNewListing({
      title: listing.title,
      description: listing.description,
      price: listing.price.toString(),
      originalPrice: listing.originalPrice?.toString() || '',
      discountedPrice: listing.discountedPrice?.toString() || '',
      isFlashSale: listing.isFlashSale || false,
      flashSaleEndsAt: listing.flashSaleEndsAt || '',
      category: listing.category,
      deliveryMethod: listing.deliveryMethod,
      deliveryTime: listing.deliveryTime,
      isFeatured: listing.isFeatured,
      serviceType: listing.serviceType,
      percentageRate: listing.percentageRate?.toString() || '',
      minRefundAmount: listing.minRefundAmount?.toString() || '',
      maxRefundAmount: listing.maxRefundAmount?.toString() || '',
      securityDepositAmount: listing.securityDepositAmount?.toString() || '',
      requireSellerApproval: listing.requireSellerApproval || false,
      vaMonthlyPrice: listing.vaMonthlyPrice?.toString() || '',
      vaSalesPercentage: listing.vaSalesPercentage?.toString() || ''
    });
    setShowEditModal(true);
  };

  const handleDeleteListing = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'listings', id));
      toast.success('Listing deleted');
      setShowDeleteModal(null);
    } catch (error) {
      toast.error('Failed to delete listing');
    }
  };

  const handleToggleFeatured = async (listing: Listing) => {
    try {
      await updateDoc(doc(db, 'listings', listing.id), { isFeatured: !listing.isFeatured });
      toast.success(`Listing ${listing.isFeatured ? 'unfeatured' : 'featured'} successfully!`);
    } catch (error) {
      toast.error('Failed to update listing feature status');
    }
  };

  const isSeller = profile?.role === 'seller';
  const isAdmin = profile?.role === 'admin';

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 w-full overflow-hidden">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center">
            {isAdmin ? 'Admin Dashboard' : isSeller ? 'Seller Dashboard' : 'Buyer Dashboard'}
            {profile?.isVerified && (
              <BadgeCheck className="h-6 w-6 ml-2 text-blue-500" />
            )}
          </h1>
          <p className="text-zinc-500">
            {isAdmin ? 'Overview of platform activity' : isSeller ? 'Manage your listings and sales' : 'Track your purchases and balance'}
          </p>
        </div>
        <div className="flex gap-2 md:gap-3">
          {(profile?.role === 'buyer' || isAdmin) && (
            <Link
              to="/marketplace"
              className="bg-zinc-800 hover:bg-zinc-700 text-white px-3 py-2 md:px-6 md:py-3 rounded-xl font-bold flex items-center transition-all text-xs md:text-base"
            >
              <ShoppingBag className="h-4 w-4 md:h-5 md:w-5 mr-1 md:mr-2" />
              <span className="hidden md:inline">Browse Market</span>
              <span className="md:hidden">Market</span>
            </Link>
          )}
          <Link
            to="/wallet"
            className="bg-zinc-800 hover:bg-zinc-700 text-white px-3 py-2 md:px-6 md:py-3 rounded-xl font-bold flex items-center transition-all text-xs md:text-base"
          >
            <TrendingUp className="h-4 w-4 md:h-5 md:w-5 mr-1 md:mr-2" />
            <span className="hidden md:inline">Deposit</span>
            <span className="md:hidden">Wallet</span>
          </Link>
          {(isSeller || isAdmin) && (
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-orange-600 hover:bg-orange-700 text-white px-3 py-2 md:px-6 md:py-3 rounded-xl font-bold flex items-center transition-all text-xs md:text-base"
            >
              <Plus className="h-4 w-4 md:h-5 md:w-5 mr-1 md:mr-2" />
              <span className="hidden md:inline">Create Listing</span>
              <span className="md:hidden">List</span>
            </button>
          )}
          {isAdmin && (
            <Link
              to="/admin"
              className="bg-orange-600 hover:bg-orange-700 text-white px-3 py-2 md:px-6 md:py-3 rounded-xl font-bold flex items-center transition-all text-xs md:text-base"
            >
              <Shield className="h-4 w-4 md:h-5 md:w-5 mr-1 md:mr-2" />
              <span className="hidden md:inline">Admin Panel</span>
              <span className="md:hidden">Admin</span>
            </Link>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        {(isSeller || isAdmin) ? (
          <>
            <div className="bg-zinc-900 border border-zinc-800 p-4 md:p-8 rounded-3xl min-w-0">
              <div className="flex items-center justify-between mb-4">
                <Package className="h-8 w-8 text-orange-500" />
                <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Active</span>
              </div>
              <div className="text-4xl font-black text-white truncate">{myListings.length}</div>
              <div className="text-zinc-500 text-sm mt-1 truncate">Total Listings</div>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 p-4 md:p-8 rounded-3xl min-w-0">
              <div className="flex items-center justify-between mb-4">
                <ShoppingBag className="h-8 w-8 text-blue-500" />
                <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Orders</span>
              </div>
              <div className="text-4xl font-black text-white truncate">{mySales.length}</div>
              <div className="text-zinc-500 text-sm mt-1 truncate">Total Sales</div>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 p-4 md:p-8 rounded-3xl min-w-0">
              <div className="flex items-center justify-between mb-4">
                <TrendingUp className="h-8 w-8 text-green-500" />
                <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Withdrawable</span>
              </div>
              <div className="text-4xl font-black text-white truncate">
                {(profile?.withdrawableBalance || 0).toFixed(2)}
              </div>
              <div className="text-zinc-500 text-sm mt-1 truncate">USDT Available to Withdraw</div>
            </div>
          </>
        ) : (
          <>
            <div className="bg-zinc-900 border border-zinc-800 p-4 md:p-8 rounded-3xl min-w-0">
              <div className="flex items-center justify-between mb-4">
                <TrendingUp className="h-8 w-8 text-orange-500" />
                <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Balance</span>
              </div>
              <div className="text-4xl font-black text-white truncate">{(profile?.availableBalance || 0).toFixed(2)}</div>
              <div className="text-zinc-500 text-sm mt-1 truncate">Available USDT</div>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 p-4 md:p-8 rounded-3xl min-w-0">
              <div className="flex items-center justify-between mb-4">
                <ShoppingBag className="h-8 w-8 text-blue-500" />
                <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Purchases</span>
              </div>
              <div className="text-4xl font-black text-white truncate">{myOrders.length}</div>
              <div className="text-zinc-500 text-sm mt-1 truncate">Total Orders</div>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 p-4 md:p-8 rounded-3xl min-w-0">
              <div className="flex items-center justify-between mb-4">
                <Package className="h-8 w-8 text-green-500" />
                <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Escrow</span>
              </div>
              <div className="text-4xl font-black text-white truncate">{(profile?.escrowBalance || 0).toFixed(2)}</div>
              <div className="text-zinc-500 text-sm mt-1 truncate">Active Escrow</div>
            </div>
          </>
        )}
      </div>

      {/* Main Content Area */}
      {(isSeller || isAdmin) ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden">
          <div className="p-6 border-b border-zinc-800 flex justify-between items-center">
            <h2 className="text-xl font-bold text-white">My Listings</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-zinc-800/50 text-zinc-500 text-xs uppercase font-bold tracking-wider">
                <tr>
                  <th className="px-6 py-4">Listing</th>
                  <th className="px-6 py-4">Price</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {myListings.map(listing => (
                  <tr key={listing.id} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        {listing.image_url ? (
                          <div className="w-10 h-10 rounded-lg overflow-hidden bg-zinc-800 flex-shrink-0">
                            <img src={listing.image_url} alt={listing.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center flex-shrink-0">
                            <span className="text-zinc-500 text-xs">No img</span>
                          </div>
                        )}
                        <div>
                          <div className="font-bold text-white">{listing.title}</div>
                          <div className="text-xs text-zinc-500">Added {new Date(listing.createdAt).toLocaleDateString()}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-white font-mono">{listing.price} USDT</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-zinc-800 text-zinc-400 text-[10px] font-bold uppercase rounded">
                        {listing.category}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded ${
                        listing.status === 'active' ? 'bg-green-900/20 text-green-500' : 'bg-zinc-800 text-zinc-500'
                      }`}>
                        {listing.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => handleToggleFeatured(listing)}
                        className={`inline-block p-2 transition-colors ${
                          listing.isFeatured ? 'text-orange-500 hover:text-orange-400' : 'text-zinc-400 hover:text-orange-500'
                        }`}
                      >
                        <BadgeCheck className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => openEditModal(listing)}
                        className="p-2 text-zinc-400 hover:text-blue-500 transition-colors"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <Link to={`/listing/${listing.id}`} className="inline-block p-2 text-zinc-400 hover:text-white transition-colors">
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                      <button onClick={() => setShowDeleteModal(listing.id)} className="p-2 text-zinc-400 hover:text-red-500 transition-colors">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {myListings.length === 0 && !loading && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-zinc-600">
                      No listings yet. Create your first one to start selling!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden">
          <div className="p-6 border-b border-zinc-800 flex justify-between items-center">
            <h2 className="text-xl font-bold text-white">Recent Orders</h2>
            <Link to="/orders" className="text-orange-500 hover:text-orange-400 text-sm font-bold">View All</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-zinc-800/50 text-zinc-500 text-xs uppercase font-bold tracking-wider">
                <tr>
                  <th className="px-6 py-4">Order</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {myOrders.slice(0, 5).map(order => (
                  <tr key={order.id} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-white">{order.listingTitle}</div>
                      <div className="text-xs text-zinc-500 font-mono">#{order.id.slice(-8)}</div>
                    </td>
                    <td className="px-6 py-4 text-white font-mono">{order.amount} USDT</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded ${
                        order.status === 'completed' ? 'bg-green-900/20 text-green-500' : 
                        order.status === 'active' || order.status === 'in_progress' ? 'bg-blue-900/20 text-blue-500' : 
                        order.status === 'pending_payment' || order.status === 'pending_seller_approval' ? 'bg-orange-900/20 text-orange-500' : 'bg-red-900/20 text-red-500'
                      }`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-zinc-500 text-xs">{new Date(order.createdAt).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-right">
                      <Link to="/orders" className="inline-block p-2 text-zinc-400 hover:text-white transition-colors">
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    </td>
                  </tr>
                ))}
                {myOrders.length === 0 && !loading && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-zinc-600">
                      No orders yet. Visit the marketplace to start shopping!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Listing Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-8 shadow-2xl">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-bold text-white">Create New Listing</h2>
              <button onClick={() => setShowAddModal(false)} className="text-zinc-500 hover:text-white">&times;</button>
            </div>
            <form onSubmit={handleAddListing} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-zinc-400 mb-2">Listing Image</label>
                  <input
                    type="file"
                    accept="image/*"
                    required
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-orange-500"
                    onChange={e => setListingImage(e.target.files?.[0] || null)}
                  />
                  <p className="text-[10px] text-zinc-500 mt-1 uppercase font-bold tracking-wider">Recommended size: 800x600px (4:3 aspect ratio).</p>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-zinc-400 mb-2">Title</label>
                  <input
                    type="text"
                    required
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-orange-500"
                    placeholder="e.g. Aged eBay Account 2015 - 500+ Feedback"
                    value={newListing.title}
                    onChange={e => setNewListing({...newListing, title: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">Price (USDT)</label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-orange-500"
                    placeholder="99.99"
                    value={newListing.price}
                    onChange={e => setNewListing({...newListing, price: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">Original Price (USDT) - Optional</label>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-orange-500"
                    placeholder="129.99"
                    value={newListing.originalPrice}
                    onChange={e => setNewListing({...newListing, originalPrice: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">Discounted Price (USDT) - Optional</label>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-orange-500"
                    placeholder="79.99"
                    value={newListing.discountedPrice}
                    onChange={e => setNewListing({...newListing, discountedPrice: e.target.value})}
                  />
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isFlashSale"
                    className="w-5 h-5 rounded border-zinc-700 text-orange-600 focus:ring-orange-500 bg-zinc-800"
                    checked={newListing.isFlashSale}
                    onChange={e => setNewListing({...newListing, isFlashSale: e.target.checked})}
                  />
                  <label htmlFor="isFlashSale" className="ml-3 text-white font-bold cursor-pointer">
                    Flash Sale
                  </label>
                </div>
                {newListing.isFlashSale && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-zinc-400 mb-2">Flash Sale Ends At</label>
                    <input
                      type="datetime-local"
                      required
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-orange-500"
                      value={newListing.flashSaleEndsAt}
                      onChange={e => setNewListing({...newListing, flashSaleEndsAt: e.target.value})}
                    />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">Category</label>
                  <select
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-orange-500"
                    value={newListing.category}
                    onChange={e => setNewListing({...newListing, category: e.target.value})}
                  >
                    <option>eBay Accounts</option>
                    <option>Walmart Accounts</option>
                    <option>Amazon Accounts</option>
                    <option>TikTok Accounts</option>
                    <option>Facebook Accounts</option>
                    <option>Payment Gateways</option>
                    <option>Services</option>
                    <option>Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">Service Type</label>
                  <select
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-orange-500"
                    value={newListing.serviceType}
                    onChange={e => setNewListing({...newListing, serviceType: e.target.value})}
                  >
                    <option value="fixed">Fixed Price</option>
                    <option value="percentage">Percentage Based</option>
                    <option value="refund_percentage">Refund Percentage</option>
                    <option value="va_service">Virtual Assistant Service</option>
                  </select>
                </div>
                {newListing.serviceType !== 'fixed' && (
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">Security Deposit (USDT)</label>
                    <input
                      type="number"
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-orange-500"
                      placeholder="0.00"
                      value={newListing.securityDepositAmount}
                      onChange={e => setNewListing({...newListing, securityDepositAmount: e.target.value})}
                    />
                  </div>
                )}
                {(newListing.serviceType === 'percentage' || newListing.serviceType === 'refund_percentage') && (
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">Percentage Rate (%)</label>
                    <input
                      type="number"
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-orange-500"
                      placeholder="50"
                      value={newListing.percentageRate}
                      onChange={e => setNewListing({...newListing, percentageRate: e.target.value})}
                    />
                  </div>
                )}
                {newListing.serviceType === 'refund_percentage' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-zinc-400 mb-2">Min Refund Amount</label>
                      <input
                        type="number"
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-orange-500"
                        placeholder="0"
                        value={newListing.minRefundAmount}
                        onChange={e => setNewListing({...newListing, minRefundAmount: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-400 mb-2">Max Refund Amount</label>
                      <input
                        type="number"
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-orange-500"
                        placeholder="1000"
                        value={newListing.maxRefundAmount}
                        onChange={e => setNewListing({...newListing, maxRefundAmount: e.target.value})}
                      />
                    </div>
                  </>
                )}
                {newListing.serviceType === 'va_service' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-zinc-400 mb-2">Monthly Price (USDT)</label>
                      <input
                        type="number"
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-orange-500"
                        placeholder="200"
                        value={newListing.vaMonthlyPrice}
                        onChange={e => setNewListing({...newListing, vaMonthlyPrice: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-400 mb-2">Sales Percentage (%)</label>
                      <input
                        type="number"
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-orange-500"
                        placeholder="10"
                        value={newListing.vaSalesPercentage}
                        onChange={e => setNewListing({...newListing, vaSalesPercentage: e.target.value})}
                      />
                    </div>
                  </>
                )}
                <div className="md:col-span-2 flex items-center">
                  <input
                    type="checkbox"
                    id="requireSellerApproval"
                    className="w-5 h-5 rounded border-zinc-700 text-orange-600 focus:ring-orange-500 bg-zinc-800"
                    checked={newListing.requireSellerApproval}
                    onChange={e => setNewListing({...newListing, requireSellerApproval: e.target.checked})}
                  />
                  <label htmlFor="requireSellerApproval" className="ml-3 text-white font-bold cursor-pointer">
                    Require Seller Approval
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">Delivery Method</label>
                  <input
                    type="text"
                    required
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-orange-500"
                    placeholder="e.g. Instant / Manual"
                    value={newListing.deliveryMethod}
                    onChange={e => setNewListing({...newListing, deliveryMethod: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">Delivery Time</label>
                  <input
                    type="text"
                    required
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-orange-500"
                    placeholder="e.g. 1 Hour / 24 Hours"
                    value={newListing.deliveryTime}
                    onChange={e => setNewListing({...newListing, deliveryTime: e.target.value})}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-zinc-400 mb-2">Description</label>
                  <textarea
                    required
                    rows={4}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-orange-500"
                    placeholder="Describe your account or service in detail..."
                    value={newListing.description}
                    onChange={e => setNewListing({...newListing, description: e.target.value})}
                  ></textarea>
                </div>
                <div className="md:col-span-2 flex items-center bg-orange-900/10 border border-orange-500/20 p-4 rounded-xl">
                  <input
                    type="checkbox"
                    id="isFeatured"
                    className="w-5 h-5 rounded border-zinc-700 text-orange-600 focus:ring-orange-500 bg-zinc-800"
                    checked={newListing.isFeatured}
                    onChange={e => setNewListing({...newListing, isFeatured: e.target.checked})}
                  />
                  <label htmlFor="isFeatured" className="ml-3 flex flex-col cursor-pointer">
                    <span className="text-white font-bold flex items-center">
                      Feature this listing
                      <BadgeCheck className="h-4 w-4 ml-1 text-orange-500" />
                    </span>
                    <span className="text-xs text-orange-500/80 mt-1">
                      Your listing will appear at the top of the marketplace. An extra 10% fee will be deducted when this listing is sold.
                    </span>
                  </label>
                </div>
              </div>
              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-4 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-bold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-4 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold transition-all"
                >
                  Create Listing
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Edit Listing Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-8 shadow-2xl">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-bold text-white">Edit Listing</h2>
              <button onClick={() => setShowEditModal(false)} className="text-zinc-500 hover:text-white">&times;</button>
            </div>
            <form onSubmit={handleEditListing} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-zinc-400 mb-2">Listing Image (Leave empty to keep current)</label>
                  <input
                    type="file"
                    accept="image/*"
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-orange-500"
                    onChange={e => setListingImage(e.target.files?.[0] || null)}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-zinc-400 mb-2">Title</label>
                  <input
                    type="text"
                    required
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-orange-500"
                    placeholder="e.g. Aged eBay Account 2015 - 500+ Feedback"
                    value={newListing.title}
                    onChange={e => setNewListing({...newListing, title: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">Price (USDT)</label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-orange-500"
                    placeholder="99.99"
                    value={newListing.price}
                    onChange={e => setNewListing({...newListing, price: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">Original Price (USDT) - Optional</label>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-orange-500"
                    placeholder="129.99"
                    value={newListing.originalPrice}
                    onChange={e => setNewListing({...newListing, originalPrice: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">Discounted Price (USDT) - Optional</label>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-orange-500"
                    placeholder="79.99"
                    value={newListing.discountedPrice}
                    onChange={e => setNewListing({...newListing, discountedPrice: e.target.value})}
                  />
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="editIsFlashSale"
                    className="w-5 h-5 rounded border-zinc-700 text-orange-600 focus:ring-orange-500 bg-zinc-800"
                    checked={newListing.isFlashSale}
                    onChange={e => setNewListing({...newListing, isFlashSale: e.target.checked})}
                  />
                  <label htmlFor="editIsFlashSale" className="ml-3 text-white font-bold cursor-pointer">
                    Flash Sale
                  </label>
                </div>
                {newListing.isFlashSale && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-zinc-400 mb-2">Flash Sale Ends At</label>
                    <input
                      type="datetime-local"
                      required
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-orange-500"
                      value={newListing.flashSaleEndsAt}
                      onChange={e => setNewListing({...newListing, flashSaleEndsAt: e.target.value})}
                    />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">Category</label>
                  <select
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-orange-500"
                    value={newListing.category}
                    onChange={e => setNewListing({...newListing, category: e.target.value})}
                  >
                    <option>eBay Accounts</option>
                    <option>Walmart Accounts</option>
                    <option>Amazon Accounts</option>
                    <option>TikTok Accounts</option>
                    <option>Facebook Accounts</option>
                    <option>Payment Gateways</option>
                    <option>Services</option>
                    <option>Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">Service Type</label>
                  <select
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-orange-500"
                    value={newListing.serviceType}
                    onChange={e => setNewListing({...newListing, serviceType: e.target.value})}
                  >
                    <option value="fixed">Fixed Price</option>
                    <option value="percentage">Percentage Based</option>
                    <option value="refund_percentage">Refund Percentage</option>
                    <option value="va_service">Virtual Assistant Service</option>
                  </select>
                </div>
                {newListing.serviceType !== 'fixed' && (
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">Security Deposit (USDT)</label>
                    <input
                      type="number"
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-orange-500"
                      placeholder="0.00"
                      value={newListing.securityDepositAmount}
                      onChange={e => setNewListing({...newListing, securityDepositAmount: e.target.value})}
                    />
                  </div>
                )}
                {(newListing.serviceType === 'percentage' || newListing.serviceType === 'refund_percentage') && (
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">Percentage Rate (%)</label>
                    <input
                      type="number"
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-orange-500"
                      placeholder="50"
                      value={newListing.percentageRate}
                      onChange={e => setNewListing({...newListing, percentageRate: e.target.value})}
                    />
                  </div>
                )}
                {newListing.serviceType === 'refund_percentage' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-zinc-400 mb-2">Min Refund Amount</label>
                      <input
                        type="number"
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-orange-500"
                        placeholder="0"
                        value={newListing.minRefundAmount}
                        onChange={e => setNewListing({...newListing, minRefundAmount: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-400 mb-2">Max Refund Amount</label>
                      <input
                        type="number"
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-orange-500"
                        placeholder="1000"
                        value={newListing.maxRefundAmount}
                        onChange={e => setNewListing({...newListing, maxRefundAmount: e.target.value})}
                      />
                    </div>
                  </>
                )}
                {newListing.serviceType === 'va_service' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-zinc-400 mb-2">Monthly Price (USDT)</label>
                      <input
                        type="number"
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-orange-500"
                        placeholder="200"
                        value={newListing.vaMonthlyPrice}
                        onChange={e => setNewListing({...newListing, vaMonthlyPrice: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-400 mb-2">Sales Percentage (%)</label>
                      <input
                        type="number"
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-orange-500"
                        placeholder="10"
                        value={newListing.vaSalesPercentage}
                        onChange={e => setNewListing({...newListing, vaSalesPercentage: e.target.value})}
                      />
                    </div>
                  </>
                )}
                <div className="md:col-span-2 flex items-center">
                  <input
                    type="checkbox"
                    id="editRequireSellerApproval"
                    className="w-5 h-5 rounded border-zinc-700 text-orange-600 focus:ring-orange-500 bg-zinc-800"
                    checked={newListing.requireSellerApproval}
                    onChange={e => setNewListing({...newListing, requireSellerApproval: e.target.checked})}
                  />
                  <label htmlFor="editRequireSellerApproval" className="ml-3 text-white font-bold cursor-pointer">
                    Require Seller Approval
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">Delivery Method</label>
                  <input
                    type="text"
                    required
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-orange-500"
                    placeholder="e.g. Instant / Manual"
                    value={newListing.deliveryMethod}
                    onChange={e => setNewListing({...newListing, deliveryMethod: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">Delivery Time</label>
                  <input
                    type="text"
                    required
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-orange-500"
                    placeholder="e.g. 1 Hour / 24 Hours"
                    value={newListing.deliveryTime}
                    onChange={e => setNewListing({...newListing, deliveryTime: e.target.value})}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-zinc-400 mb-2">Description</label>
                  <textarea
                    required
                    rows={4}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-orange-500"
                    placeholder="Describe your account or service in detail..."
                    value={newListing.description}
                    onChange={e => setNewListing({...newListing, description: e.target.value})}
                  ></textarea>
                </div>
                <div className="md:col-span-2 flex items-center bg-orange-900/10 border border-orange-500/20 p-4 rounded-xl">
                  <input
                    type="checkbox"
                    id="editIsFeatured"
                    className="w-5 h-5 rounded border-zinc-700 text-orange-600 focus:ring-orange-500 bg-zinc-800"
                    checked={newListing.isFeatured}
                    onChange={e => setNewListing({...newListing, isFeatured: e.target.checked})}
                  />
                  <label htmlFor="editIsFeatured" className="ml-3 flex flex-col cursor-pointer">
                    <span className="text-white font-bold flex items-center">
                      Feature this listing
                      <BadgeCheck className="h-4 w-4 ml-1 text-orange-500" />
                    </span>
                    <span className="text-xs text-orange-500/80 mt-1">
                      Your listing will appear at the top of the marketplace. An extra 10% fee will be deducted when this listing is sold.
                    </span>
                  </label>
                </div>
              </div>
              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 py-4 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-bold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="flex-1 py-4 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-orange-600/20 disabled:opacity-50"
                >
                  {uploading ? 'Updating...' : 'Update Listing'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-md p-8 shadow-2xl">
            <h2 className="text-2xl font-bold text-white mb-4">Delete Listing</h2>
            <p className="text-zinc-400 mb-8">Are you sure you want to delete this listing? This action cannot be undone.</p>
            <div className="flex gap-4">
              <button
                onClick={() => setShowDeleteModal(null)}
                className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-bold transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteListing(showDeleteModal)}
                className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-all"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
