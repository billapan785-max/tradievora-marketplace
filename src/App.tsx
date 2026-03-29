import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import Layout from './components/Layout';
import Home from './pages/Home';
import Marketplace from './pages/Marketplace';
import ListingDetail from './pages/ListingDetail';
import Dashboard from './pages/Dashboard';
import Wallet from './pages/Wallet';
import Orders from './pages/Orders';
import Messages from './pages/Messages';
import AdminPanel from './pages/AdminPanel';
import InfluencerDashboard from './pages/InfluencerDashboard';
import Leaderboard from './pages/Leaderboard';
import HelpCenter from './pages/HelpCenter';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';
import Disputes from './pages/Disputes';
import Profile from './pages/Profile';
import MobileProfilePage from './pages/MobileProfilePage';
import SellerProfile from './pages/SellerProfile';
import Login from './pages/Login';
import Register from './pages/Register';
import { Toaster } from 'sonner';
import SplashScreen from './components/SplashScreen';
import ErrorBoundary from '@/src/components/ErrorBoundary';

const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
};

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading, isAuthReady } = useAuth();
  
  if (!isAuthReady || loading) {
    return <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-white">Loading...</div>;
  }
  
  if (!user) {
    return <Navigate to="/login" />;
  }
  
  return <>{children}</>;
};

const AppContent = () => {
  const [showSplash, setShowSplash] = useState(true);
  const { user, isAuthReady, loading } = useAuth();

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  if (showSplash) {
    return <SplashScreen />;
  }

  if (!isAuthReady || loading) {
    return <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-white">Loading...</div>;
  }

  return (
    <BrowserRouter>
      <ScrollToTop />
      <Toaster position="top-right" theme="dark" richColors />
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
        <Route path="/register" element={user ? <Navigate to="/" replace /> : <Register />} />
        
        {/* All other routes are protected */}
        <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route path="/" element={<Home />} />
          <Route path="/marketplace" element={<Marketplace />} />
          <Route path="/listing/:id" element={<ListingDetail />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/help" element={<HelpCenter />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/disputes" element={<Disputes />} />
          <Route path="/profile/:uid" element={<Profile />} />
          <Route path="/mobile-profile" element={<MobileProfilePage />} />
          <Route path="/seller/:id" element={<SellerProfile />} />
          
          {/* Dashboard & Admin Routes */}
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/influencer" element={<InfluencerDashboard />} />
          <Route path="/wallet" element={<Wallet />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/orders/:id" element={<Orders />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/admin" element={<AdminPanel />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ErrorBoundary>
  );
}
