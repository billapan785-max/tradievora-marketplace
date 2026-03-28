import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Package, MessageSquare, Wallet, User } from 'lucide-react';
import { useAuth } from '../AuthContext';

const MobileBottomNav: React.FC = () => {
  const location = useLocation();
  const { user } = useAuth();

  const navItems = [
    { name: 'Marketplace', path: '/', icon: Home },
    { name: 'Orders', path: '/orders', icon: Package },
    { name: 'Messages', path: '/messages', icon: MessageSquare },
    { name: 'Wallet', path: '/wallet', icon: Wallet },
    { name: 'Profile', path: '/mobile-profile', icon: User },
  ];

  if (!user) return null;

  return (
    <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-zinc-900 border-t border-zinc-800 z-50">
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.name}
              to={item.path}
              className={`flex flex-col items-center justify-center w-full h-full ${
                isActive ? 'text-orange-500' : 'text-zinc-400'
              }`}
            >
              <Icon className="h-6 w-6" />
              <span className="text-[10px] mt-1">{item.name}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default MobileBottomNav;
