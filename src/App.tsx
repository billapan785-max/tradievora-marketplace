import React, { useEffect } from 'react';
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
import Reviews from './pages/Reviews';
import SellerProfile from './pages/SellerProfile';
import Login from './pages/Login';
import Register from './pages/Register';
import { Toaster } from 'sonner';

const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
};

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-white">Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  return <>{children}</>;
};

import ErrorBoundary from './components/ErrorBoundary';

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <ScrollToTop />
          <Toaster position="top-right" theme="dark" richColors />
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<Home />} />
              <Route path="/marketplace" element={<Marketplace />} />
              <Route path="/listing/:id" element={<ListingDetail />} />
              <Route path="/leaderboard" element={<Leaderboard />} />
              <Route path="/help" element={<HelpCenter />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/disputes" element={<Disputes />} />
              <Route path="/profile/:uid" element={<Profile />} />
              <Route path="/mobile-profile" element={<ProtectedRoute><MobileProfilePage /></ProtectedRoute>} />
              <Route path="/seller/:id" element={<SellerProfile />} />
              <Route path="/reviews" element={<Reviews />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              
              {/* Protected Routes */}
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/influencer" element={<ProtectedRoute><InfluencerDashboard /></ProtectedRoute>} />
              <Route path="/wallet" element={<ProtectedRoute><Wallet /></ProtectedRoute>} />
              <Route path="/orders" element={<ProtectedRoute><Orders /></ProtectedRoute>} />
              <Route path="/orders/:id" element={<ProtectedRoute><Orders /></ProtectedRoute>} />
              <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
              <Route path="/admin" element={<ProtectedRoute><AdminPanel /></ProtectedRoute>} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}
