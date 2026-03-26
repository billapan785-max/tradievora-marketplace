import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { auth } from '../lib/firebase';
import { ShoppingCart, Wallet, User, LogOut, Shield, MessageSquare, Package, BadgeCheck, Menu, X } from 'lucide-react';
import { Logo } from './Logo';

const Navbar: React.FC = () => {
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await auth.signOut();
    navigate('/login');
    setIsMobileMenuOpen(false);
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
                <Link to="/wallet" className="hidden sm:flex items-center text-zinc-300 hover:text-white px-3 py-2 text-sm font-medium bg-zinc-800 rounded-lg">
                  <Wallet className="h-4 w-4 mr-2 text-orange-500" />
                  <span>{profile?.availableBalance.toFixed(2)} USDT</span>
                </Link>
                <div className="hidden sm:flex relative group">
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
              <div className="hidden sm:flex space-x-4">
                <Link to="/login" className="text-zinc-300 hover:text-white px-3 py-2 text-sm font-medium">Login</Link>
                <Link to="/register" className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">Register</Link>
              </div>
            )}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="sm:hidden text-zinc-300 hover:text-white"
            >
              {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>
      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="sm:hidden bg-zinc-900 border-t border-zinc-800">
          <div className="px-2 pt-2 pb-3 space-y-1">
            <Link to="/marketplace" className="block text-zinc-300 hover:text-white px-3 py-2 text-base font-medium" onClick={() => setIsMobileMenuOpen(false)}>Marketplace</Link>
            <Link to="/leaderboard" className="block text-zinc-300 hover:text-white px-3 py-2 text-base font-medium" onClick={() => setIsMobileMenuOpen(false)}>Leaderboard</Link>
            <Link to="/influencer" className="block text-zinc-300 hover:text-white px-3 py-2 text-base font-medium" onClick={() => setIsMobileMenuOpen(false)}>Earn USDT</Link>
            {user && (
              <>
                <Link to="/orders" className="block text-zinc-300 hover:text-white px-3 py-2 text-base font-medium" onClick={() => setIsMobileMenuOpen(false)}>Orders</Link>
                <Link to="/messages" className="block text-zinc-300 hover:text-white px-3 py-2 text-base font-medium" onClick={() => setIsMobileMenuOpen(false)}>Messages</Link>
                <Link to="/wallet" className="block text-zinc-300 hover:text-white px-3 py-2 text-base font-medium" onClick={() => setIsMobileMenuOpen(false)}>Wallet ({profile?.availableBalance.toFixed(2)} USDT)</Link>
                <Link to="/dashboard" className="block text-zinc-300 hover:text-white px-3 py-2 text-base font-medium" onClick={() => setIsMobileMenuOpen(false)}>Dashboard</Link>
                <button onClick={handleLogout} className="block w-full text-left text-red-400 hover:text-white px-3 py-2 text-base font-medium">Logout</button>
              </>
            )}
            {!user && (
              <>
                <Link to="/login" className="block text-zinc-300 hover:text-white px-3 py-2 text-base font-medium" onClick={() => setIsMobileMenuOpen(false)}>Login</Link>
                <Link to="/register" className="block text-orange-500 hover:text-orange-400 px-3 py-2 text-base font-medium" onClick={() => setIsMobileMenuOpen(false)}>Register</Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
