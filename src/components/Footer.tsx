import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Logo } from './Logo';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { PlatformSettings } from '../types';

interface FooterProps {
  className?: string;
}

const Footer: React.FC<FooterProps> = ({ className }) => {
  const [settings, setSettings] = useState<PlatformSettings | null>(null);

  useEffect(() => {
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
    fetchSettings();
  }, []);

  const defaultCategories = [
    'eBay Accounts', 'Amazon Accounts', 'Social Media', 'Services'
  ];

  const displayCategories = settings?.categories?.slice(0, 4) || defaultCategories;
  return (
    <footer className={`bg-zinc-900 border-t border-zinc-800 py-12 mt-auto ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center mb-4">
              <Logo className="h-8 w-8" />
              <span className="ml-2 text-xl font-bold text-white">Tradrox</span>
            </div>
            <p className="text-zinc-400 text-sm max-w-sm">
              The most secure marketplace for digital accounts and services. 
              Using advanced escrow systems to protect both buyers and sellers.
            </p>
          </div>
          <div>
            <h3 className="text-white font-semibold mb-4">Marketplace</h3>
            <ul className="space-y-2 text-sm text-zinc-400">
              {displayCategories.map(cat => (
                <li key={cat}><Link to={`/marketplace?cat=${cat}`} className="hover:text-orange-500">{cat}</Link></li>
              ))}
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
          &copy; {new Date().getFullYear()} Tradrox. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
