import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { InfluencerProfile } from '../types';
import { Award, TrendingUp, Users, Eye, Trophy, Medal } from 'lucide-react';

const Leaderboard: React.FC = () => {
  const [topEarners, setTopEarners] = useState<InfluencerProfile[]>([]);
  const [topReferrers, setTopReferrers] = useState<InfluencerProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const earnersQuery = query(collection(db, 'influencers'), orderBy('totalEarnings', 'desc'), limit(10));
    const referrersQuery = query(collection(db, 'influencers'), orderBy('totalReferrals', 'desc'), limit(10));

    const unsubEarners = onSnapshot(earnersQuery, (snapshot) => {
      setTopEarners(snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as InfluencerProfile)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'influencers');
    });

    const unsubReferrers = onSnapshot(referrersQuery, (snapshot) => {
      setTopReferrers(snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as InfluencerProfile)));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'influencers');
      setLoading(false);
    });

    return () => {
      unsubEarners();
      unsubReferrers();
    };
  }, []);

  if (loading) return <div className="text-center py-20 text-white">Loading Leaderboards...</div>;

  return (
    <div className="space-y-12 pb-20">
      <div className="text-center space-y-4">
        <h1 className="text-5xl font-black text-white uppercase tracking-tighter">Influencer Leaderboards</h1>
        <p className="text-zinc-500 max-w-2xl mx-auto font-medium">
          Recognizing our top performing partners who are driving growth and earning massive rewards.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Top Earners */}
        <div className="space-y-6">
          <div className="flex items-center space-x-4 mb-8">
            <div className="h-12 w-12 bg-orange-600 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-600/20">
              <Trophy className="h-6 w-6 text-white" />
            </div>
            <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Top Earners</h2>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden">
            {topEarners.map((inf, index) => (
              <div key={inf.uid} className={`flex items-center justify-between p-6 border-b border-zinc-800 last:border-0 transition-all hover:bg-zinc-800/30 ${index < 3 ? 'bg-orange-600/5' : ''}`}>
                  <div className="flex items-center space-x-6">
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center font-black ${
                      index === 0 ? 'bg-yellow-500 text-black' : 
                      index === 1 ? 'bg-zinc-300 text-black' : 
                      index === 2 ? 'bg-orange-500 text-black' : 'bg-zinc-800 text-zinc-500'
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      <div className="text-white font-bold flex items-center">
                        @{inf.username}
                        {index < 3 && <Medal className={`h-4 w-4 ml-2 ${
                          index === 0 ? 'text-yellow-500' : 
                          index === 1 ? 'text-zinc-300' : 'text-orange-500'
                        }`} />}
                      </div>
                      <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{inf.rank} RANK</div>
                    </div>
                  </div>
                <div className="text-right">
                  <div className="text-xl font-black text-white">{inf.totalEarnings.toFixed(2)}</div>
                  <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">USDT EARNED</div>
                </div>
              </div>
            ))}
            {topEarners.length === 0 && (
              <div className="p-12 text-center text-zinc-600">No data available</div>
            )}
          </div>
        </div>

        {/* Top Referrers */}
        <div className="space-y-6">
          <div className="flex items-center space-x-4 mb-8">
            <div className="h-12 w-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-600/20">
              <Users className="h-6 w-6 text-white" />
            </div>
            <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Top Referrers</h2>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden">
            {topReferrers.map((inf, index) => (
              <div key={inf.uid} className={`flex items-center justify-between p-6 border-b border-zinc-800 last:border-0 transition-all hover:bg-zinc-800/30 ${index < 3 ? 'bg-blue-600/5' : ''}`}>
                  <div className="flex items-center space-x-6">
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center font-black ${
                      index === 0 ? 'bg-yellow-500 text-black' : 
                      index === 1 ? 'bg-zinc-300 text-black' : 
                      index === 2 ? 'bg-orange-500 text-black' : 'bg-zinc-800 text-zinc-500'
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      <div className="text-white font-bold">@{inf.username}</div>
                      <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{inf.totalReferrals} REFERRALS</div>
                    </div>
                  </div>
                <div className="text-right">
                  <div className="text-xl font-black text-white">{inf.totalSales}</div>
                  <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">SALES GENERATED</div>
                </div>
              </div>
            ))}
            {topReferrers.length === 0 && (
              <div className="p-12 text-center text-zinc-600">No data available</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;
