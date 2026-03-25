import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { auth } from '../lib/firebase';
import { ShoppingCart, Wallet, User, LogOut, Shield, MessageSquare, Package, BadgeCheck } from 'lucide-react';
import { Logo } from './Logo';

const Navbar: React.FC = () => {
  const { profile, user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await auth.signOut();
    navigate('/login');
  };

  return (
    <nav className="bg-zinc-900 border-b border-zinc-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex-shrink-0 flex items-center">
              <Logo className="h-8 w-8" />
              <span className="ml-2 text-xl font-bold text-white">Tradiora</span>
            </Link>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              <Link to="/marketplace" className="text-zinc-300 hover:text-white px-3 py-2 text-sm font-medium">Marketplace</Link>
              <Link to="/leaderboard" className="text-zinc-300 hover:text-white px-3 py-2 text-sm font-medium">Leaderboard</Link>
              <Link to="/influencer" className="text-zinc-300 hover:text-white px-3 py-2 text-sm font-medium">Earn USDT</Link>
              {user && (
                <>
                  <Link to="/orders" className="text-zinc-300 hover:text-white px-3 py-2 text-sm font-medium">Orders</Link>
                  <Link to="/messages" className="text-zinc-300 hover:text-white px-3 py-2 text-sm font-medium">Messages</Link>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <Link to="/wallet" className="flex items-center text-zinc-300 hover:text-white px-3 py-2 text-sm font-medium bg-zinc-800 rounded-lg">
                  <Wallet className="h-4 w-4 mr-2 text-orange-500" />
                  <span>{profile?.availableBalance.toFixed(2)} USDT</span>
                </Link>
                <div className="relative group">
                  <button className="flex items-center text-zinc-300 hover:text-white px-3 py-2 text-sm font-medium">
                    <User className="h-5 w-5 mr-1" />
                    <span>{profile?.displayName}</span>
                    {profile?.isVerified && (
                      <BadgeCheck className="h-4 w-4 ml-1 text-blue-500" />
                    )}
                    {profile?.role === 'admin' && (
                      <span className="ml-2 px-1.5 py-0.5 bg-orange-600 text-[10px] font-black text-white rounded uppercase tracking-tighter">Admin</span>
                    )}
                  </button>
                  <div className="absolute right-0 w-48 mt-2 py-2 bg-zinc-800 border border-zinc-700 rounded-md shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                    <Link to="/dashboard" className="block px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-700 hover:text-white">Dashboard</Link>
                    <Link to="/influencer" className="block px-4 py-2 text-sm text-orange-400 hover:bg-zinc-700 hover:text-white">Influencer Program</Link>
                    {profile?.role === 'admin' && (
                      <Link to="/admin" className="block px-4 py-2 text-sm text-orange-400 hover:bg-zinc-700 hover:text-white">Admin Panel</Link>
                    )}
                    <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-zinc-700 hover:text-white">Logout</button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex space-x-4">
                <Link to="/login" className="text-zinc-300 hover:text-white px-3 py-2 text-sm font-medium">Login</Link>
                <Link to="/register" className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">Register</Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
