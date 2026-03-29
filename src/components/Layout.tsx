import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import Navbar from './Navbar';
import MobileBottomNav from './MobileBottomNav';
import { AlertTriangle } from 'lucide-react';
import Footer from './Footer';

const Layout: React.FC = () => {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans">
      <Navbar />
      
      {/* Platform Warning */}
      <div className="bg-orange-900/20 border-b border-orange-900/50 py-2 px-4">
        <div className="max-w-7xl mx-auto flex items-center justify-center text-xs sm:text-sm text-orange-200 text-center">
          <AlertTriangle className="h-4 w-4 mr-2 flex-shrink-0" />
          <p>
            Do not deal outside the platform. If you make direct payment to seller, we are not responsible for any loss. Always use escrow for safe transactions.
          </p>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-24 sm:pb-8">
        <Outlet />
      </main>

      <Footer className="hidden md:block" />
      <MobileBottomNav />
    </div>
  );
};

export default Layout;
