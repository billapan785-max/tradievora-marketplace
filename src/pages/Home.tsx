import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Shield, Zap, Lock, ArrowRight, Star, CheckCircle, MessageSquare } from 'lucide-react';
import { motion } from 'motion/react';
import { collection, query, orderBy, limit, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Review, PlatformSettings } from '../types';

const Home: React.FC = () => {
  const [recentReviews, setRecentReviews] = useState<Review[]>([]);
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const categories = [
    { name: 'eBay Accounts', icon: '📦', count: '150+' },
    { name: 'Walmart Accounts', icon: '🛒', count: '80+' },
    { name: 'Amazon Accounts', icon: '🛍️', count: '120+' },
    { name: 'TikTok Accounts', icon: '📱', count: '300+' },
    { name: 'Facebook Accounts', icon: '👥', count: '200+' },
    { name: 'Payment Gateways', icon: '💳', count: '45+' },
  ];

  useEffect(() => {
    const fetchRecentReviews = async () => {
      try {
        const q = query(
          collection(db, 'reviews'),
          orderBy('createdAt', 'desc'),
          limit(3)
        );
        const snapshot = await getDocs(q);
        const fetchedReviews = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Review[];
        setRecentReviews(fetchedReviews);
      } catch (error) {
        console.error('Error fetching recent reviews:', error);
      }
    };

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

    fetchRecentReviews();
    fetchSettings();
  }, []);

  return (
    <div className="space-y-24">
      {/* Banner Section */}
      <section className="relative w-full h-64 md:h-80 rounded-[3rem] overflow-hidden mb-12 shadow-2xl flex items-center justify-center">
        <div className="absolute inset-0 bg-gradient-to-r from-orange-600 to-orange-900 z-0"></div>
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-20 mix-blend-overlay z-0"
          style={{ backgroundImage: `url(${settings?.bannerImageUrl || 'https://images.unsplash.com/photo-1639762681485-074b7f4ec651?q=80&w=2070&auto=format&fit=crop'})` }}
        ></div>
        <div className="relative z-10 text-center px-4">
          <h1 className="text-5xl md:text-7xl font-black text-white tracking-tighter uppercase drop-shadow-lg">
            {settings?.bannerTitle || 'Tradiora'}
          </h1>
          <p className="text-orange-100 text-lg md:text-xl mt-4 font-medium tracking-wide max-w-2xl mx-auto drop-shadow-md">
            {settings?.bannerSubtitle || 'The Ultimate Digital Asset Trading Platform'}
          </p>
        </div>
      </section>

      {/* Hero Section */}
      <section className="relative py-10 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-orange-600/10 blur-[120px] rounded-full -z-10"></div>
        <div className="text-center space-y-8 max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="inline-block py-1 px-3 rounded-full bg-orange-600/20 text-orange-500 text-xs font-bold tracking-wider uppercase mb-4">
              Secure Escrow Marketplace
            </span>
            <h2 className="text-5xl md:text-7xl font-extrabold text-white tracking-tight leading-tight">
              Buy & Sell on <span className="text-orange-600">Tradiora.</span>
            </h2>
            <p className="mt-6 text-xl text-zinc-400 max-w-2xl mx-auto">
              The premier platform for high-quality digital assets. Every transaction is protected by our middleman escrow system. USDT only.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link to="/marketplace" className="w-full sm:w-auto px-8 py-4 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold text-lg flex items-center justify-center transition-all">
              Browse Marketplace <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
            <Link to="/register" className="w-full sm:w-auto px-8 py-4 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-bold text-lg border border-zinc-700 transition-all">
              Start Selling
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Categories Grid */}
      <section>
        <div className="flex justify-between items-end mb-12">
          <div>
            <h2 className="text-3xl font-bold text-white">Popular Categories</h2>
            <p className="text-zinc-400 mt-2">Find the exact account or service you need</p>
          </div>
          <Link to="/marketplace" className="text-orange-500 hover:text-orange-400 font-medium flex items-center">
            View All <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {categories.map((cat) => (
            <Link
              key={cat.name}
              to={`/marketplace?cat=${cat.name}`}
              className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl hover:border-orange-500/50 hover:bg-zinc-800/50 transition-all group text-center"
            >
              <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">{cat.icon}</div>
              <h3 className="text-white font-semibold text-sm mb-1">{cat.name}</h3>
              <p className="text-zinc-500 text-xs">{cat.count} Listings</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section className="grid md:grid-cols-3 gap-8 py-12">
        <div className="bg-zinc-900/50 p-8 rounded-3xl border border-zinc-800">
          <div className="h-12 w-12 bg-orange-600/20 rounded-xl flex items-center justify-center mb-6">
            <Shield className="h-6 w-6 text-orange-500" />
          </div>
          <h3 className="text-xl font-bold text-white mb-4">Escrow Protection</h3>
          <p className="text-zinc-400 leading-relaxed">
            Funds are held securely by our platform until you confirm delivery. No more getting scammed by dishonest sellers.
          </p>
        </div>
        <div className="bg-zinc-900/50 p-8 rounded-3xl border border-zinc-800">
          <div className="h-12 w-12 bg-blue-600/20 rounded-xl flex items-center justify-center mb-6">
            <Zap className="h-6 w-6 text-blue-500" />
          </div>
          <h3 className="text-xl font-bold text-white mb-4">Instant Delivery</h3>
          <p className="text-zinc-400 leading-relaxed">
            Many listings offer automated or near-instant delivery of account credentials directly through our secure messaging system.
          </p>
        </div>
        <div className="bg-zinc-900/50 p-8 rounded-3xl border border-zinc-800">
          <div className="h-12 w-12 bg-green-600/20 rounded-xl flex items-center justify-center mb-6">
            <Lock className="h-6 w-6 text-green-500" />
          </div>
          <h3 className="text-xl font-bold text-white mb-4">USDT Payments</h3>
          <p className="text-zinc-400 leading-relaxed">
            We exclusively use USDT (TRC20/ERC20) for all transactions to ensure fast, global, and irreversible payments.
          </p>
        </div>
      </section>

      {/* Recent Reviews Section */}
      {recentReviews.length > 0 && (
        <section>
          <div className="flex justify-between items-end mb-12">
            <div>
              <h2 className="text-3xl font-bold text-white">Recent Feedback</h2>
              <p className="text-zinc-400 mt-2">See what our community is saying</p>
            </div>
            <Link to="/reviews" className="text-orange-500 hover:text-orange-400 font-medium flex items-center">
              View All Reviews <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {recentReviews.map((review) => (
              <div key={review.id} className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl">
                <div className="flex items-center mb-4">
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
                <p className="text-zinc-400 text-sm italic leading-relaxed">
                  "{review.comment.length > 120 ? review.comment.slice(0, 120) + '...' : review.comment}"
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Influencer Program Section */}
      <section className="py-12">
        <div className="bg-zinc-900 border border-zinc-800 rounded-[3rem] p-8 md:p-16 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-orange-600/10 blur-[100px] rounded-full -z-10"></div>
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <span className="inline-block py-1 px-3 rounded-full bg-orange-600/20 text-orange-500 text-xs font-bold tracking-wider uppercase mb-4">
                Earn Lifetime Commissions
              </span>
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
                Join Our <span className="text-orange-600">Influencer</span> Program
              </h2>
              <p className="text-zinc-400 text-lg mb-8 leading-relaxed">
                Refer users to our platform and earn up to 5 levels of lifetime commissions on every sale they make. 
                Whether you're a YouTuber, TikToker, or just have a large network, our system is designed to reward you.
              </p>
              <div className="space-y-4 mb-8">
                <div className="flex items-center text-zinc-300">
                  <CheckCircle className="h-5 w-5 text-orange-500 mr-3" />
                  <span>Up to 40% commission on platform fees</span>
                </div>
                <div className="flex items-center text-zinc-300">
                  <CheckCircle className="h-5 w-5 text-orange-500 mr-3" />
                  <span>5-Level deep referral network</span>
                </div>
                <div className="flex items-center text-zinc-300">
                  <CheckCircle className="h-5 w-5 text-orange-500 mr-3" />
                  <span>Instant USDT withdrawals</span>
                </div>
              </div>
              <Link to="/influencer" className="inline-flex items-center px-8 py-4 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold transition-all">
                Learn More & Join <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-zinc-800/50 p-6 rounded-2xl border border-zinc-700 text-center">
                <div className="text-3xl font-bold text-white mb-1">40%</div>
                <div className="text-zinc-500 text-xs uppercase font-bold tracking-widest">Level 1</div>
              </div>
              <div className="bg-zinc-800/50 p-6 rounded-2xl border border-zinc-700 text-center">
                <div className="text-3xl font-bold text-white mb-1">20%</div>
                <div className="text-zinc-500 text-xs uppercase font-bold tracking-widest">Level 2</div>
              </div>
              <div className="bg-zinc-800/50 p-6 rounded-2xl border border-zinc-700 text-center">
                <div className="text-3xl font-bold text-white mb-1">10%</div>
                <div className="text-zinc-500 text-xs uppercase font-bold tracking-widest">Level 3</div>
              </div>
              <div className="bg-zinc-800/50 p-6 rounded-2xl border border-zinc-700 text-center">
                <div className="text-3xl font-bold text-white mb-1">5%</div>
                <div className="text-zinc-500 text-xs uppercase font-bold tracking-widest">Level 4 & 5</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="bg-orange-600 rounded-[3rem] p-12 md:p-20 text-center text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 blur-[80px] rounded-full"></div>
        <div className="relative z-10 max-w-3xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">Ready to start trading?</h2>
          <p className="text-orange-100 text-lg mb-10">
            Join thousands of users already buying and selling on Tradiora, the most trusted digital asset marketplace.
          </p>
          <div className="flex flex-wrap justify-center gap-8 mb-12">
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 mr-2" />
              <span className="font-semibold">50k+ Orders</span>
            </div>
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 mr-2" />
              <span className="font-semibold">10k+ Sellers</span>
            </div>
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 mr-2" />
              <span className="font-semibold">24/7 Support</span>
            </div>
          </div>
          <Link to="/register" className="inline-block px-10 py-5 bg-white text-orange-600 rounded-2xl font-bold text-xl hover:bg-zinc-100 transition-all shadow-xl">
            Create Free Account
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Home;
