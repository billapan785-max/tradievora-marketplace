import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { auth } from '../lib/firebase';
import { Wallet, Package, MessageSquare, Star, Zap, Users, Settings, LogOut, Shield, ChevronRight } from 'lucide-react';
import Footer from '../components/Footer';

const MobileProfilePage: React.FC = () => {
  const { profile, user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await auth.signOut();
    navigate('/login');
  };

  if (!user) return null;

  return (
    <div className="sm:hidden pb-20 p-4">
      <div className="flex items-center space-x-4 mb-8">
        <div className="h-16 w-16 bg-zinc-800 rounded-full flex items-center justify-center text-2xl font-bold text-orange-500">
          {profile?.displayName?.charAt(0) || 'U'}
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">{profile?.displayName}</h2>
          <p className="text-zinc-400 text-sm">{profile?.role}</p>
        </div>
      </div>

      <Link to="/wallet" className="block bg-zinc-900 border border-zinc-800 rounded-2xl p-4 mb-6 hover:border-orange-500 transition-colors">
        <div className="flex items-center justify-between">
          <div className="flex items-center text-zinc-300">
            <Wallet className="h-5 w-5 mr-2 text-orange-500" />
            <span>Wallet Balance</span>
          </div>
          <span className="text-white font-bold">{((profile?.availableBalance || 0) + (profile?.withdrawableBalance || 0)).toFixed(2)} USDT</span>
        </div>
      </Link>

      <div className="space-y-2">
        <Link to={`/profile/${profile?.uid}`} className="flex items-center justify-between p-4 bg-zinc-900 border border-zinc-800 rounded-xl text-white">
          <div className="flex items-center"><Shield className="h-5 w-5 mr-3 text-zinc-500" /> My Profile</div>
          <ChevronRight className="h-5 w-5 text-zinc-600" />
        </Link>
        <Link to="/dashboard" className="flex items-center justify-between p-4 bg-zinc-900 border border-zinc-800 rounded-xl text-white">
          <div className="flex items-center"><Package className="h-5 w-5 mr-3 text-zinc-500" /> My Listings</div>
          <ChevronRight className="h-5 w-5 text-zinc-600" />
        </Link>
        <Link to="/orders" className="flex items-center justify-between p-4 bg-zinc-900 border border-zinc-800 rounded-xl text-white">
          <div className="flex items-center"><Package className="h-5 w-5 mr-3 text-zinc-500" /> Orders</div>
          <ChevronRight className="h-5 w-5 text-zinc-600" />
        </Link>
        <Link to="/messages" className="flex items-center justify-between p-4 bg-zinc-900 border border-zinc-800 rounded-xl text-white">
          <div className="flex items-center"><MessageSquare className="h-5 w-5 mr-3 text-zinc-500" /> Messages</div>
          <ChevronRight className="h-5 w-5 text-zinc-600" />
        </Link>
        <Link to="/leaderboard" className="flex items-center justify-between p-4 bg-zinc-900 border border-zinc-800 rounded-xl text-white">
          <div className="flex items-center"><Star className="h-5 w-5 mr-3 text-zinc-500" /> Leaderboard</div>
          <ChevronRight className="h-5 w-5 text-zinc-600" />
        </Link>
        <Link to="/influencer" className="flex items-center justify-between p-4 bg-zinc-900 border border-zinc-800 rounded-xl text-white">
          <div className="flex items-center"><Zap className="h-5 w-5 mr-3 text-zinc-500" /> Earn USDT</div>
          <ChevronRight className="h-5 w-5 text-zinc-600" />
        </Link>
        <Link to="/influencer" className="flex items-center justify-between p-4 bg-zinc-900 border border-zinc-800 rounded-xl text-white">
          <div className="flex items-center"><Users className="h-5 w-5 mr-3 text-zinc-500" /> Influencer Program</div>
          <ChevronRight className="h-5 w-5 text-zinc-600" />
        </Link>
        {profile?.role === 'admin' && (
          <Link to="/admin" className="flex items-center justify-between p-4 bg-zinc-900 border border-zinc-800 rounded-xl text-orange-500">
            <div className="flex items-center"><Shield className="h-5 w-5 mr-3" /> Admin Panel</div>
            <ChevronRight className="h-5 w-5 text-orange-600" />
          </Link>
        )}
        <button onClick={handleLogout} className="flex items-center justify-between w-full p-4 bg-zinc-900 border border-zinc-800 rounded-xl text-red-400">
          <div className="flex items-center"><LogOut className="h-5 w-5 mr-3" /> Logout</div>
        </button>
      </div>
      <Footer className="mt-8" />
    </div>
  );
};

export default MobileProfilePage;
