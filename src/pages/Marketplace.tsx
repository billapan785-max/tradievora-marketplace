import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy, getDoc, doc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Listing, Review, PlatformSettings } from '../types';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Search, Filter, Tag, Clock, User, Star, BadgeCheck, ChevronDown } from 'lucide-react';
import { getOptimizedImageUrl } from '../lib/imageUtils';

const Marketplace: React.FC = () => {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState('');
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isCategoryMenuOpen, setIsCategoryMenuOpen] = useState(false);
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const navigate = useNavigate();
  
  const categoryFilter = searchParams.get('cat') || 'All';

  const defaultCategories = [
    'eBay Accounts', 'Walmart Accounts', 'Amazon Accounts', 
    'TikTok Accounts', 'Facebook Accounts', 'Payment Gateways', 
    'Services', 'Other'
  ];

  const categories = ['All', ...(settings?.categories || defaultCategories)];

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const settingsSnap = await getDoc(doc(db, 'settings', 'platform'));
        if (settingsSnap.exists()) {
          setSettings(settingsSnap.data() as PlatformSettings);
        }
      } catch (error) {
        console.error('Error fetching settings:', error);
      }
    };
    fetchSettings();

    const unsubReviews = onSnapshot(collection(db, 'reviews'), (snapshot) => {
      setReviews(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Review)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'reviews');
    });

    return () => unsubReviews();
  }, []);

  useEffect(() => {
    let q = query(collection(db, 'listings'), where('status', '==', 'active'), orderBy('createdAt', 'desc'));
    
    if (categoryFilter !== 'All') {
      q = query(collection(db, 'listings'), 
        where('status', '==', 'active'), 
        where('category', '==', categoryFilter),
        orderBy('createdAt', 'desc')
      );
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Listing));
      setListings(items);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'listings');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [categoryFilter]);

  const getSellerRating = (sellerId: string) => {
    const sellerReviews = reviews.filter(r => r.toId === sellerId && r.type === 'buyer_to_seller');
    if (sellerReviews.length === 0) return { rating: 0, count: 0 };
    const avg = sellerReviews.reduce((acc, r) => acc + r.rating, 0) / sellerReviews.length;
    return { rating: avg.toFixed(1), count: sellerReviews.length };
  };

  const filteredListings = listings
    .filter(l => 
      l.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
      l.description.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0));

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Marketplace</h1>
          <p className="text-zinc-400">Discover premium digital accounts and services</p>
        </div>
        
        <div className="relative max-w-md w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500" />
          <input
            type="text"
            placeholder="Search listings..."
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-orange-500 transition-colors"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar Filters */}
        <aside className="w-full lg:w-64 space-y-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 lg:p-6">
            <button 
              onClick={() => setIsCategoryMenuOpen(!isCategoryMenuOpen)}
              className="w-full flex items-center justify-between text-white font-bold lg:hidden"
            >
              <div className="flex items-center">
                <Filter className="h-4 w-4 mr-2 text-orange-500" />
                <span className="text-sm">{categoryFilter === 'All' ? 'All Categories' : categoryFilter}</span>
              </div>
              <ChevronDown className={`h-4 w-4 transition-transform ${isCategoryMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            <div className="hidden lg:flex items-center mb-4 text-white font-bold">
              <Filter className="h-4 w-4 mr-2" />
              Categories
            </div>

            <div className={`mt-4 lg:mt-0 space-y-2 ${isCategoryMenuOpen ? 'block' : 'hidden lg:block'}`}>
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => {
                    setSearchParams(cat === 'All' ? {} : { cat });
                    setIsCategoryMenuOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    categoryFilter === cat 
                      ? 'bg-orange-600 text-white font-semibold' 
                      : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <div className="flex items-center mb-4 text-white font-bold">
              <Tag className="h-4 w-4 mr-2" />
              Price Range
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <input type="number" placeholder="Min" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2 text-xs text-white" />
                <span className="text-zinc-600">-</span>
                <input type="number" placeholder="Max" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2 text-xs text-white" />
              </div>
              <button className="w-full bg-zinc-800 hover:bg-zinc-700 text-white py-2 rounded-lg text-sm font-medium transition-colors">
                Apply Price
              </button>
            </div>
          </div>
        </aside>

        {/* Listings Grid */}
        <div className="flex-1">
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="bg-zinc-900 h-80 rounded-2xl animate-pulse"></div>
              ))}
            </div>
          ) : filteredListings.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
              {filteredListings.map(listing => (
                <div
                  key={listing.id}
                  onClick={() => navigate(`/listing/${listing.id}`)}
                  className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden hover:border-orange-500/50 transition-all group flex flex-col cursor-pointer"
                >
                  {listing.image_url && (
                    <div className="w-full h-32 md:h-48 overflow-hidden bg-zinc-800 relative">
                      <img 
                        src={getOptimizedImageUrl(listing.image_url, 400)} 
                        alt={listing.title} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        referrerPolicy="no-referrer"
                        loading="lazy"
                      />
                      {/* Badges Overlay */}
                      <div className="absolute top-2 left-2 flex flex-wrap gap-1">
                        {listing.isFeatured && (
                          <span className="px-1.5 py-0.5 bg-orange-600 text-white text-[9px] font-bold uppercase rounded flex items-center shadow-sm">
                            <Star className="h-2 w-2 mr-0.5 fill-current" />
                            Featured
                          </span>
                        )}
                        {listing.isFlashSale && listing.flashSaleEndsAt && new Date(listing.flashSaleEndsAt) > new Date() && (
                          <span className="px-1.5 py-0.5 bg-red-600 text-white text-[9px] font-bold uppercase rounded flex items-center shadow-sm">
                            <Clock className="h-2 w-2 mr-0.5" />
                            Flash Sale
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                  <div className="p-3 md:p-6 flex-1 flex flex-col">
                    <div className="flex justify-between items-start mb-1 md:mb-2">
                       <span className="px-2 py-0.5 bg-zinc-800 text-zinc-400 text-[9px] font-bold uppercase rounded tracking-wider">
                          {listing.category}
                        </span>
                      <div className="flex items-center text-orange-500 text-[9px] md:text-xs font-bold">
                        <Star className="h-2 w-2 md:h-3 md:w-3 fill-current mr-0.5" />
                        {Number(getSellerRating(listing.sellerId).rating) > 0 ? getSellerRating(listing.sellerId).rating : 'New'}
                      </div>
                    </div>
                    <h3 className="text-white font-bold text-sm md:text-lg mb-0.5 md:mb-1 group-hover:text-orange-500 transition-colors truncate">
                      {listing.title}
                    </h3>
                    <p className="text-zinc-400 text-xs md:text-sm line-clamp-2 mb-2 md:mb-4 flex-1">
                      {listing.description}
                    </p>
                    <div className="flex items-center text-zinc-500 text-[10px] md:text-xs space-x-2 md:space-x-4 mb-2 md:mb-4">
                      <div className="flex items-center">
                        <Clock className="h-2 w-2 md:h-3 md:w-3 mr-1" />
                        {listing.deliveryTime}
                      </div>
                    <div className="flex items-center">
                      <User className="h-2 w-2 md:h-3 md:w-3 mr-1" />
                      <Link 
                        to={`/seller/${listing.sellerId}`}
                        onClick={(e) => e.stopPropagation()}
                        className="truncate max-w-[60px] md:max-w-[100px] hover:text-orange-500 transition-colors"
                      >
                        {listing.sellerName || 'Verified Seller'}
                      </Link>
                      {listing.sellerIsVerified && (
                        <BadgeCheck className="h-2 w-2 md:h-3 md:w-3 ml-1 text-blue-500 flex-shrink-0" />
                      )}
                    </div>
                    </div>
                  </div>
                  <div className="px-4 md:px-6 py-3 md:py-4 bg-zinc-800/50 border-t border-zinc-800 flex items-center justify-between">
                    <div className="flex flex-col">
                      <div className="text-lg md:text-xl font-bold text-white">
                        {listing.serviceType === 'percentage' || listing.serviceType === 'refund_percentage' ? (
                          <>
                            {listing.percentageRate}% <span className="text-xs text-zinc-500 font-normal">Fee</span>
                          </>
                        ) : listing.serviceType === 'va_service' ? (
                          <>
                            {listing.vaMonthlyPrice} <span className="text-xs text-zinc-500 font-normal">USDT/mo</span>
                          </>
                        ) : (
                          <>
                            {listing.isFlashSale && listing.flashSaleEndsAt && new Date(listing.flashSaleEndsAt) > new Date() && listing.discountedPrice ? (
                              listing.discountedPrice
                            ) : listing.discountedPrice ? (
                              listing.discountedPrice
                            ) : (
                              listing.price
                            )} <span className="text-xs text-zinc-500 font-normal">USDT</span>
                          </>
                        )}
                      </div>
                      {(listing.serviceType === 'fixed' || !listing.serviceType) && (listing.originalPrice || (listing.discountedPrice && listing.price)) && (
                        <div className="text-[10px] md:text-xs text-zinc-500 line-through">
                          {listing.originalPrice || listing.price} USDT
                        </div>
                      )}
                      {listing.serviceType === 'va_service' && listing.vaSalesPercentage && (
                        <div className="text-[10px] md:text-xs text-orange-500 font-medium">
                          + {listing.vaSalesPercentage}% Sales Comm.
                        </div>
                      )}
                    </div>
                    <span className="text-orange-500 font-bold text-xs md:text-sm group-hover:translate-x-1 transition-transform">
                      Buy Now &rarr;
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 md:py-20 bg-zinc-900/50 rounded-3xl border border-dashed border-zinc-800">
              <Search className="h-12 w-12 text-zinc-700 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">No listings found</h3>
              <p className="text-zinc-500">Try adjusting your search or filters</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Marketplace;
