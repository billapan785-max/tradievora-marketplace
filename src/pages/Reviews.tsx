import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Review } from '../types';
import { Star, MessageSquare, Calendar, User } from 'lucide-react';
import { motion } from 'motion/react';

const Reviews: React.FC = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const q = query(
          collection(db, 'reviews'),
          orderBy('createdAt', 'desc'),
          limit(50)
        );
        const snapshot = await getDocs(q);
        const fetchedReviews = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Review[];
        setReviews(fetchedReviews);
      } catch (error) {
        console.error('Error fetching reviews:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchReviews();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-16">
        <h1 className="text-4xl md:text-6xl font-black text-white tracking-tighter uppercase mb-4">
          Community <span className="text-orange-600">Feedback</span>
        </h1>
        <p className="text-zinc-400 text-lg max-w-2xl mx-auto">
          Real reviews from real traders. Transparency is the core of Tradrox.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
        </div>
      ) : reviews.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reviews.map((review, index) => (
            <motion.div
              key={review.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.05 }}
              className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl hover:border-orange-500/30 transition-all group"
            >
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
                <div className="text-[10px] text-zinc-600 font-mono uppercase">
                  {new Date(review.createdAt).toLocaleDateString()}
                </div>
              </div>

              <div className="relative">
                <MessageSquare className="absolute -top-1 -left-1 h-4 w-4 text-zinc-800 -z-10" />
                <p className="text-zinc-300 text-sm leading-relaxed italic">
                  "{review.comment}"
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-zinc-800/50 flex items-center justify-between">
                <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">
                  {review.type === 'buyer_to_seller' ? 'Buyer Review' : 'Seller Review'}
                </div>
                <div className="text-[10px] text-zinc-500 font-mono">
                  Order: #{review.orderId.slice(-6).toUpperCase()}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-zinc-900/50 rounded-[3rem] border border-zinc-800 border-dashed">
          <MessageSquare className="h-12 w-12 text-zinc-700 mx-auto mb-4" />
          <h3 className="text-white font-bold text-xl">No reviews yet</h3>
          <p className="text-zinc-500 mt-2">Be the first to leave feedback after a successful trade!</p>
        </div>
      )}
    </div>
  );
};

export default Reviews;
