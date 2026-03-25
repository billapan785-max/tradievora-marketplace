import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, addDoc, updateDoc, getDoc, setDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../AuthContext';
import { InfluencerProfile, Referral, Commission, VideoPromotion, Withdrawal, PlatformSettings } from '../types';
import { 
  Users, 
  TrendingUp, 
  DollarSign, 
  Video, 
  Link as LinkIcon, 
  BarChart2, 
  ChevronRight, 
  Plus, 
  ExternalLink,
  Award,
  CheckCircle2,
  Lock,
  Unlock,
  Clock,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

const InfluencerDashboard: React.FC = () => {
  const { profile, user } = useAuth();
  const [influencer, setInfluencer] = useState<InfluencerProfile | null>(null);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [videos, setVideos] = useState<VideoPromotion[]>([]);
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'referrals' | 'videos' | 'wallet'>('overview');
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [newVideo, setNewVideo] = useState({
    url: '',
    title: '',
    platform: 'YouTube' as any,
    description: ''
  });

  useEffect(() => {
    if (!user || profile?.role !== 'influencer') return;

    // Fetch influencer profile
    const unsubInfluencer = onSnapshot(doc(db, 'influencers', user.uid), (docSnap) => {
      if (docSnap.exists()) {
        setInfluencer(docSnap.data() as InfluencerProfile);
      } else {
        // Create influencer profile if it doesn't exist
        const initialProfile: InfluencerProfile = {
          uid: user.uid,
          username: profile.displayName.toLowerCase().replace(/\s+/g, ''),
          totalReferrals: 0,
          totalSales: 0,
          totalVolume: 0,
          totalEarnings: 0,
          pendingEarnings: 0,
          withdrawnBalance: 0,
          clicks: 0,
          rank: 'Bronze',
          levelEarnings: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 }
        };
        setDoc(doc(db, 'influencers', user.uid), initialProfile);
      }
    });

    // Fetch referrals
    const unsubReferrals = onSnapshot(
      query(collection(db, 'referrals'), where('influencerId', '==', user.uid)),
      (snapshot) => {
        setReferrals(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Referral)));
      }
    );

    // Fetch commissions
    const unsubCommissions = onSnapshot(
      query(collection(db, 'commissions'), where('influencerId', '==', user.uid)),
      (snapshot) => {
        setCommissions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Commission)));
      }
    );

    // Fetch videos
    const unsubVideos = onSnapshot(
      query(collection(db, 'videos'), where('influencerId', '==', user.uid)),
      (snapshot) => {
        setVideos(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as VideoPromotion)));
      }
    );

    // Fetch settings
    const fetchSettings = async () => {
      const settingsSnap = await getDoc(doc(db, 'settings', 'platform'));
      if (settingsSnap.exists()) {
        setSettings(settingsSnap.data() as PlatformSettings);
      }
    };
    fetchSettings();

    return () => {
      unsubInfluencer();
      unsubReferrals();
      unsubCommissions();
      unsubVideos();
    };
  }, [user, profile]);

  const handleCreateVideo = async () => {
    if (!user || !influencer) return;
    if (!newVideo.url || !newVideo.title) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      await addDoc(collection(db, 'videos'), {
        influencerId: user.uid,
        influencerName: profile?.displayName || 'Influencer',
        ...newVideo,
        views: 0,
        bonusEarned: 0,
        referralSales: 0,
        status: 'pending',
        bonusStatus: 'locked',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      toast.success('Video submitted for approval!');
      setShowVideoModal(false);
      setNewVideo({ url: '', title: '', platform: 'YouTube', description: '' });
    } catch (error) {
      toast.error('Failed to submit video');
    }
  };

  const handleWithdraw = async () => {
    if (!user || !influencer) return;
    const available = influencer.totalEarnings - influencer.withdrawnBalance;
    if (available < (settings?.minWithdrawal || 10)) {
      toast.error(`Minimum withdrawal is ${settings?.minWithdrawal || 10} USDT`);
      return;
    }

    const walletAddress = window.prompt('Enter your USDT (TRC20) Wallet Address:');
    if (!walletAddress) return;

    try {
      await addDoc(collection(db, 'withdrawals'), {
        userId: user.uid,
        userEmail: profile?.email,
        amount: available,
        walletAddress,
        type: 'influencer',
        status: 'pending',
        createdAt: new Date().toISOString()
      });
      toast.success('Withdrawal request submitted!');
    } catch (error) {
      toast.error('Failed to submit withdrawal request');
    }
  };

  if (profile?.isSuspended) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-8">
        <AlertCircle className="h-16 w-16 text-red-500 mb-4" />
        <h1 className="text-3xl font-bold text-white mb-2">Account Suspended</h1>
        <p className="text-zinc-400 max-w-md">
          Your account has been suspended for violating our terms of service. Please contact support if you believe this is an error.
        </p>
      </div>
    );
  }

  if (profile?.role !== 'influencer') {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-8">
        <Award className="h-16 w-16 text-orange-500 mb-4" />
        <h1 className="text-3xl font-bold text-white mb-2">Influencer Program</h1>
        <p className="text-zinc-400 max-w-md mb-8">
          Join our influencer program and earn up to 5 levels of lifetime commissions on every sale you refer.
        </p>
        <button 
          onClick={async () => {
            if (!user) return;
            await updateDoc(doc(db, 'users', user.uid), { role: 'influencer' });
            toast.success('You are now an Influencer!');
          }}
          className="bg-orange-600 hover:bg-orange-700 text-white px-8 py-3 rounded-xl font-bold transition-all"
        >
          Become an Influencer
        </button>
      </div>
    );
  }

  const referralLink = `${window.location.origin}/?ref=${user?.uid}`;

  return (
    <div className="space-y-8 pb-20">
      {/* Header */}
      <div className="bg-orange-600/10 border border-orange-600/20 p-8 rounded-3xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center space-x-4">
            <div className="h-16 w-16 bg-orange-600 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-600/20">
              <Award className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-white uppercase tracking-tighter">Influencer Dashboard</h1>
              <div className="flex items-center mt-1">
                <span className="px-2 py-0.5 bg-orange-600 text-[10px] font-black text-white rounded uppercase tracking-tighter mr-2">
                  {influencer?.rank || 'Bronze'}
                </span>
                <p className="text-zinc-500 text-sm font-medium">Welcome back, {profile?.displayName}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-2xl flex items-center space-x-4">
            <div className="flex-1">
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Your Referral Link</p>
              <code className="text-xs text-orange-500 font-mono">{referralLink}</code>
            </div>
            <button 
              onClick={() => {
                navigator.clipboard.writeText(referralLink);
                toast.success('Referral link copied!');
              }}
              className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-lg transition-all"
            >
              <LinkIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-600/10 rounded-2xl">
              <Users className="h-6 w-6 text-blue-500" />
            </div>
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Total Referrals</span>
          </div>
          <div className="text-4xl font-black text-white">{influencer?.totalReferrals || 0}</div>
        </div>
        
        <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-600/10 rounded-2xl">
              <TrendingUp className="h-6 w-6 text-green-500" />
            </div>
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Total Sales</span>
          </div>
          <div className="text-4xl font-black text-white">{influencer?.totalSales || 0}</div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-orange-600/10 rounded-2xl">
              <DollarSign className="h-6 w-6 text-orange-500" />
            </div>
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Total Earnings</span>
          </div>
          <div className="text-4xl font-black text-white">{(influencer?.totalEarnings || 0).toFixed(2)} <span className="text-sm font-bold text-zinc-500">USDT</span></div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-purple-600/10 rounded-2xl">
              <BarChart2 className="h-6 w-6 text-purple-500" />
            </div>
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Conversion Rate</span>
          </div>
          <div className="text-4xl font-black text-white">
            {influencer?.clicks ? (((influencer.totalSales || 0) / influencer.clicks) * 100).toFixed(1) : 0}%
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-zinc-900 p-1.5 rounded-2xl border border-zinc-800 overflow-x-auto no-scrollbar">
        {[
          { id: 'overview', icon: BarChart2, label: 'Overview' },
          { id: 'referrals', icon: Users, label: 'Referrals' },
          { id: 'videos', icon: Video, label: 'Video Bonus' },
          { id: 'wallet', icon: DollarSign, label: 'Wallet' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center px-6 py-2.5 rounded-xl text-sm font-black transition-all whitespace-nowrap ${
              activeTab === tab.id ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/20' : 'text-zinc-500 hover:text-white hover:bg-zinc-800'
            }`}
          >
            <tab.icon className="h-4 w-4 mr-2" />
            {tab.label.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8">
              <h3 className="text-xl font-bold text-white mb-6">Level-wise Earnings</h3>
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map(level => (
                  <div key={level} className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-2xl">
                    <div className="flex items-center">
                      <div className="h-10 w-10 bg-zinc-800 rounded-xl flex items-center justify-center text-orange-500 font-black mr-4">
                        L{level}
                      </div>
                      <div>
                        <p className="text-white font-bold">Level {level} Referrals</p>
                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
                          {settings?.referralCommissionLevels[level] || 0}% Share
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-white font-black">{(influencer?.levelEarnings?.[level] || 0).toFixed(2)} USDT</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-8">
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8">
              <h3 className="text-xl font-bold text-white mb-6">Recent Activity</h3>
              <div className="space-y-6">
                {referrals.slice(0, 5).map(ref => (
                  <div key={ref.id} className="flex items-center space-x-4">
                    <div className="h-10 w-10 bg-blue-600/10 rounded-xl flex items-center justify-center">
                      <Users className="h-5 w-5 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-sm text-white font-bold">New Referral</p>
                      <p className="text-[10px] text-zinc-500 font-mono">{ref.referredUserEmail}</p>
                    </div>
                  </div>
                ))}
                {referrals.length === 0 && (
                  <p className="text-center text-zinc-600 py-8">No recent activity</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'referrals' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden">
          <div className="p-8 border-b border-zinc-800 flex items-center justify-between">
            <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Your Referral Network</h2>
            <div className="px-4 py-2 bg-zinc-800 rounded-xl text-xs font-bold text-zinc-400">
              Total: {referrals.length}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-zinc-800/50 text-zinc-500 text-[10px] uppercase font-black tracking-widest">
                <tr>
                  <th className="px-8 py-4">User</th>
                  <th className="px-8 py-4">Level</th>
                  <th className="px-8 py-4">Status</th>
                  <th className="px-8 py-4">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {referrals.map(ref => (
                  <tr key={ref.id} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="px-8 py-6">
                      <div className="text-white font-bold">{ref.referredUserEmail}</div>
                      <div className="text-[10px] text-zinc-500 font-mono">{ref.referredUserId}</div>
                    </td>
                    <td className="px-8 py-6">
                      <span className="px-2 py-1 bg-zinc-800 text-orange-500 text-[10px] font-black rounded uppercase">Level {ref.level}</span>
                    </td>
                    <td className="px-8 py-6">
                      <span className="px-2 py-1 bg-green-900/20 text-green-500 text-[10px] font-black rounded uppercase">Active</span>
                    </td>
                    <td className="px-8 py-6 text-zinc-500 text-sm font-mono">
                      {new Date(ref.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
                {referrals.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-8 py-20 text-center text-zinc-600">
                      No referrals yet. Share your link to start earning!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'videos' && (
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Video Promotion Bonus</h2>
            <button 
              onClick={() => setShowVideoModal(true)}
              className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-xl font-bold flex items-center transition-all"
            >
              <Plus className="h-5 w-5 mr-2" />
              Submit Video
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {videos.map(video => (
              <div key={video.id} className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden flex flex-col">
                <div className="p-6 border-b border-zinc-800">
                  <div className="flex items-center justify-between mb-4">
                    <span className="px-2 py-1 bg-zinc-800 text-zinc-400 text-[10px] font-black rounded uppercase">{video.platform}</span>
                    <span className={`px-2 py-1 text-[10px] font-black rounded uppercase ${
                      video.status === 'approved' ? 'bg-green-900/20 text-green-500' : 
                      video.status === 'pending' ? 'bg-orange-900/20 text-orange-500' : 'bg-red-900/20 text-red-500'
                    }`}>
                      {video.status}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2 line-clamp-1">{video.title}</h3>
                  <div className="flex items-center text-zinc-500 text-xs">
                    <Clock className="h-3 w-3 mr-1" />
                    Last updated: {new Date(video.updatedAt).toLocaleDateString()}
                  </div>
                </div>
                
                <div className="p-6 space-y-4 flex-1">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-zinc-800/50 p-3 rounded-2xl">
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Views</p>
                      <p className="text-xl font-black text-white">{video.views.toLocaleString()}</p>
                    </div>
                    <div className="bg-zinc-800/50 p-3 rounded-2xl">
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Bonus</p>
                      <p className="text-xl font-black text-orange-500">{video.bonusEarned} USDT</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-zinc-500 uppercase tracking-widest">Unlock Progress</span>
                      <span className="text-white">{video.referralSales}/1 Sale</span>
                    </div>
                    <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-orange-600 transition-all duration-500" 
                        style={{ width: `${Math.min((video.referralSales / 1) * 100, 100)}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-2xl">
                    <div className="flex items-center">
                      {video.bonusStatus === 'unlocked' ? (
                        <Unlock className="h-4 w-4 text-green-500 mr-2" />
                      ) : (
                        <Lock className="h-4 w-4 text-zinc-500 mr-2" />
                      )}
                      <span className="text-xs font-bold text-white uppercase tracking-widest">
                        {video.bonusStatus === 'unlocked' ? 'Unlocked' : 'Locked'}
                      </span>
                    </div>
                    <a 
                      href={video.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-orange-500 hover:text-orange-400"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                </div>
              </div>
            ))}
            {videos.length === 0 && (
              <div className="col-span-full bg-zinc-900 border border-zinc-800 rounded-3xl p-20 text-center">
                <Video className="h-12 w-12 text-zinc-700 mx-auto mb-4" />
                <p className="text-zinc-500 font-bold">No videos submitted yet. Promote us and earn bonuses!</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'wallet' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-8">
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8">
              <h3 className="text-xl font-bold text-white mb-8">Influencer Wallet</h3>
              <div className="grid grid-cols-2 gap-6 mb-8">
                <div className="bg-zinc-800/50 p-6 rounded-3xl">
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Available Balance</p>
                  <p className="text-3xl font-black text-white">
                    {(influencer ? influencer.totalEarnings - influencer.withdrawnBalance : 0).toFixed(2)}
                  </p>
                  <p className="text-xs text-zinc-500 font-bold mt-1">USDT</p>
                </div>
                <div className="bg-zinc-800/50 p-6 rounded-3xl">
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Total Withdrawn</p>
                  <p className="text-3xl font-black text-zinc-400">
                    {(influencer?.withdrawnBalance || 0).toFixed(2)}
                  </p>
                  <p className="text-xs text-zinc-500 font-bold mt-1">USDT</p>
                </div>
              </div>
              <button 
                onClick={handleWithdraw}
                className="w-full py-4 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl font-black uppercase tracking-widest transition-all"
              >
                Withdraw Earnings
              </button>
              <p className="text-center text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-4">
                Minimum Withdrawal: {settings?.minWithdrawal || 10} USDT
              </p>
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8">
            <h3 className="text-xl font-bold text-white mb-6">Recent Commissions</h3>
            <div className="space-y-4">
              {commissions.slice(0, 10).map(comm => (
                <div key={comm.id} className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-2xl">
                  <div className="flex items-center">
                    <div className="h-10 w-10 bg-green-600/10 rounded-xl flex items-center justify-center text-green-500 mr-4">
                      <DollarSign className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm text-white font-bold">Level {comm.level} Sale</p>
                      <p className="text-[10px] text-zinc-500 font-mono">Order #{comm.orderId.slice(-8)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-green-500 font-black">+{comm.amount.toFixed(2)} USDT</p>
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{comm.status}</p>
                  </div>
                </div>
              ))}
              {commissions.length === 0 && (
                <p className="text-center text-zinc-600 py-12">No commissions earned yet</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Video Modal */}
      {showVideoModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl">
            <div className="p-8 border-b border-zinc-800">
              <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Submit Promotion Video</h2>
              <p className="text-zinc-500 text-sm">Earn bonuses based on your video's performance</p>
            </div>
            <div className="p-8 space-y-6">
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Video URL</label>
                <input 
                  type="text"
                  placeholder="https://youtube.com/watch?v=..."
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-orange-500 transition-all"
                  value={newVideo.url}
                  onChange={e => setNewVideo({...newVideo, url: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Platform</label>
                  <select 
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-orange-500 transition-all"
                    value={newVideo.platform}
                    onChange={e => setNewVideo({...newVideo, platform: e.target.value as any})}
                  >
                    <option value="YouTube">YouTube</option>
                    <option value="TikTok">TikTok</option>
                    <option value="Instagram">Instagram</option>
                    <option value="Twitter">Twitter/X</option>
                    <option value="Facebook">Facebook</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Title</label>
                  <input 
                    type="text"
                    placeholder="Video Title"
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-orange-500 transition-all"
                    value={newVideo.title}
                    onChange={e => setNewVideo({...newVideo, title: e.target.value})}
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Description</label>
                <textarea 
                  placeholder="Tell us about your promotion..."
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-orange-500 transition-all"
                  rows={3}
                  value={newVideo.description}
                  onChange={e => setNewVideo({...newVideo, description: e.target.value})}
                />
              </div>
            </div>
            <div className="p-8 bg-zinc-800/50 flex space-x-4">
              <button 
                onClick={() => setShowVideoModal(false)}
                className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-bold transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={handleCreateVideo}
                className="flex-1 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold transition-all"
              >
                Submit Video
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InfluencerDashboard;
