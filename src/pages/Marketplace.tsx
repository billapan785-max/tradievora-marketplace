import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Listing } from '../types';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, Filter, Tag, Clock, User, Star } from 'lucide-react';

const Marketplace: React.FC = () => {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState('');
  
  const categoryFilter = searchParams.get('cat') || 'All';

  const categories = [
    'All', 'eBay Accounts', 'Walmart Accounts', 'Amazon Accounts', 
    'TikTok Accounts', 'Facebook Accounts', 'Payment Gateways', 
    'Dropshipping Stores', 'Order Processing Services', 'Account Creation Services', 'Other'
  ];

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

  const filteredListings = listings.filter(l => 
    l.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    l.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <div className="flex items-center mb-4 text-white font-bold">
              <Filter className="h-4 w-4 mr-2" />
              Categories
            </div>
            <div className="space-y-2">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSearchParams(cat === 'All' ? {} : { cat })}
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
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="bg-zinc-900 h-80 rounded-2xl animate-pulse"></div>
              ))}
            </div>
          ) : filteredListings.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredListings.map(listing => (
                <Link
                  key={listing.id}
                  to={`/listing/${listing.id}`}
                  className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden hover:border-orange-500/50 transition-all group flex flex-col"
                >
                  <div className="p-6 flex-1 flex flex-col">
                    <div className="flex justify-between items-start mb-4">
                      <span className="px-2 py-1 bg-zinc-800 text-zinc-400 text-[10px] font-bold uppercase rounded tracking-wider">
                        {listing.category}
                      </span>
                      <div className="flex items-center text-orange-500 text-xs font-bold">
                        <Star className="h-3 w-3 fill-current mr-1" />
                        4.9
                      </div>
                    </div>
                    <h3 className="text-white font-bold text-lg mb-2 group-hover:text-orange-500 transition-colors">
                      {listing.title}
                    </h3>
                    <p className="text-zinc-400 text-sm line-clamp-2 mb-4 flex-1">
                      {listing.description}
                    </p>
                    <div className="flex items-center text-zinc-500 text-xs space-x-4 mb-4">
                      <div className="flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        {listing.deliveryTime}
                      </div>
                      <div className="flex items-center">
                        <User className="h-3 w-3 mr-1" />
                        {listing.sellerName || 'Verified Seller'}
                      </div>
                    </div>
                  </div>
                  <div className="px-6 py-4 bg-zinc-800/50 border-t border-zinc-800 flex items-center justify-between">
                    <div className="text-xl font-bold text-white">
                      {listing.price} <span className="text-xs text-zinc-500 font-normal">USDT</span>
                    </div>
                    <span className="text-orange-500 font-bold text-sm group-hover:translate-x-1 transition-transform">
                      Buy Now &rarr;
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-zinc-900/50 rounded-3xl border border-dashed border-zinc-800">
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
