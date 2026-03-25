import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import { AlertTriangle } from 'lucide-react';
import { Logo } from './Logo';

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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>

      <footer className="bg-zinc-900 border-t border-zinc-800 py-12 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center mb-4">
                <Logo className="h-8 w-8" />
                <span className="ml-2 text-xl font-bold text-white">Tradiora</span>
              </div>
              <p className="text-zinc-400 text-sm max-w-sm">
                The most secure marketplace for digital accounts and services. 
                Using advanced escrow systems to protect both buyers and sellers.
              </p>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-4">Marketplace</h3>
              <ul className="space-y-2 text-sm text-zinc-400">
                <li><Link to="/marketplace?cat=eBay" className="hover:text-orange-500">eBay Accounts</Link></li>
                <li><Link to="/marketplace?cat=Amazon" className="hover:text-orange-500">Amazon Accounts</Link></li>
                <li><Link to="/marketplace?cat=Social" className="hover:text-orange-500">Social Media</Link></li>
                <li><Link to="/marketplace?cat=Services" className="hover:text-orange-500">Services</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-4">Support</h3>
              <ul className="space-y-2 text-sm text-zinc-400">
                <li><Link to="/help" className="hover:text-orange-500">Help Center</Link></li>
                <li><Link to="/terms" className="hover:text-orange-500">Terms of Service</Link></li>
                <li><Link to="/privacy" className="hover:text-orange-500">Privacy Policy</Link></li>
                <li><Link to="/disputes" className="hover:text-orange-500">Dispute Policy</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-zinc-800 mt-12 pt-8 text-center text-zinc-500 text-sm">
            &copy; {new Date().getFullYear()} Tradiora. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

import { Link } from 'react-router-dom';
export default Layout;
