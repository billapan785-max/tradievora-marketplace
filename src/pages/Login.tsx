import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signInWithEmailAndPassword, sendPasswordResetEmail, signInWithPopup } from 'firebase/auth';
import { auth, db, googleProvider } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Shield, Mail, Lock, ArrowRight, Chrome, ShoppingCart, Briefcase, User } from 'lucide-react';
import { toast } from 'sonner';
import { UserProfile, UserRole } from '../types';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole>('buyer');
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (error: any) {
      toast.error(error.message || 'Failed to login');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      // Check if profile exists
      const profileRef = doc(db, 'users', user.uid);
      const profileSnap = await getDoc(profileRef);

      if (!profileSnap.exists()) {
        const displayName = user.displayName || user.email?.split('@')[0] || 'User';
        const newProfile: UserProfile = {
          uid: user.uid,
          email: user.email || '',
          displayName,
          role: selectedRole,
          availableBalance: 0,
          escrowBalance: 0,
          withdrawableBalance: 0,
          isSuspended: false,
          isVerified: false,
          trustScore: 100,
          responseTime: '1h',
          image_url: user.photoURL || '',
          createdAt: new Date().toISOString(),
        };
        
        const publicProfile = {
          uid: user.uid,
          displayName,
          role: selectedRole,
          isVerified: false,
          trustScore: 100,
          responseTime: '1h',
          image_url: user.photoURL || '',
          createdAt: new Date().toISOString(),
        };

        await setDoc(profileRef, newProfile);
        await setDoc(doc(db, 'profiles', user.uid), publicProfile);
      }

      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (error: any) {
      toast.error(error.message || 'Failed to login with Google');
    } finally {
      setLoading(false);
      setShowRoleModal(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      toast.error('Please enter your email address first.');
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      toast.success('Password reset email sent! Check your inbox.');
    } catch (error: any) {
      toast.error(error.message || 'Failed to send reset email');
    }
  };

  return (
    <div className="max-w-md mx-auto py-12">
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-2xl">
        <div className="text-center mb-10">
          <div className="h-16 w-16 bg-orange-600/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Shield className="h-8 w-8 text-orange-500" />
          </div>
          <h1 className="text-3xl font-bold text-white">Welcome Back</h1>
          <p className="text-zinc-500 mt-2">Sign in to your account</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-600" />
              <input
                type="email"
                required
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-orange-500 transition-colors"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-zinc-400">Password</label>
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-xs text-orange-500 hover:text-orange-400 font-bold"
              >
                Forgot Password?
              </button>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-600" />
              <input
                type="password"
                required
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-orange-500 transition-colors"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-orange-600 hover:bg-orange-700 disabled:bg-zinc-700 text-white rounded-xl font-bold transition-all flex items-center justify-center"
          >
            {loading ? 'Signing in...' : 'Sign In'}
            {!loading && <ArrowRight className="ml-2 h-5 w-5" />}
          </button>
        </form>

        <div className="mt-6 flex items-center justify-center space-x-4">
          <div className="flex-1 h-px bg-zinc-800"></div>
          <span className="text-zinc-500 text-xs font-bold uppercase tracking-wider">Or continue with</span>
          <div className="flex-1 h-px bg-zinc-800"></div>
        </div>

        <button
          onClick={() => setShowRoleModal(true)}
          disabled={loading}
          className="mt-6 w-full py-4 bg-zinc-800 hover:bg-zinc-700 disabled:bg-zinc-700 text-white rounded-xl font-bold transition-all flex items-center justify-center border border-zinc-700"
        >
          <Chrome className="mr-2 h-5 w-5 text-orange-500" />
          Google Account
        </button>

        {showRoleModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-md p-8 shadow-2xl">
              <h2 className="text-2xl font-bold text-white mb-4 text-center">Choose Account Type</h2>
              <p className="text-zinc-500 text-center mb-8">Select how you want to use the platform</p>
              
              <div className="grid grid-cols-1 gap-4 mb-8">
                <button
                  onClick={() => setSelectedRole('buyer')}
                  className={`flex items-center p-4 rounded-2xl border-2 transition-all ${
                    selectedRole === 'buyer'
                      ? 'border-orange-600 bg-orange-600/10 text-white'
                      : 'border-zinc-800 bg-zinc-800/50 text-zinc-500 hover:border-zinc-700'
                  }`}
                >
                  <div className={`h-12 w-12 rounded-xl flex items-center justify-center mr-4 ${
                    selectedRole === 'buyer' ? 'bg-orange-600/20' : 'bg-zinc-800'
                  }`}>
                    <ShoppingCart className={`h-6 w-6 ${selectedRole === 'buyer' ? 'text-orange-500' : 'text-zinc-600'}`} />
                  </div>
                  <div className="text-left">
                    <div className="font-bold">Buyer</div>
                    <div className="text-xs text-zinc-500">I want to buy accounts and services</div>
                  </div>
                </button>

                <button
                  onClick={() => setSelectedRole('seller')}
                  className={`flex items-center p-4 rounded-2xl border-2 transition-all ${
                    selectedRole === 'seller'
                      ? 'border-orange-600 bg-orange-600/10 text-white'
                      : 'border-zinc-800 bg-zinc-800/50 text-zinc-500 hover:border-zinc-700'
                  }`}
                >
                  <div className={`h-12 w-12 rounded-xl flex items-center justify-center mr-4 ${
                    selectedRole === 'seller' ? 'bg-orange-600/20' : 'bg-zinc-800'
                  }`}>
                    <Briefcase className={`h-6 w-6 ${selectedRole === 'seller' ? 'text-orange-500' : 'text-zinc-600'}`} />
                  </div>
                  <div className="text-left">
                    <div className="font-bold">Seller</div>
                    <div className="text-xs text-zinc-500">I want to sell accounts and services</div>
                  </div>
                </button>

                <button
                  onClick={() => setSelectedRole('influencer')}
                  className={`flex items-center p-4 rounded-2xl border-2 transition-all ${
                    selectedRole === 'influencer'
                      ? 'border-orange-600 bg-orange-600/10 text-white'
                      : 'border-zinc-800 bg-zinc-800/50 text-zinc-500 hover:border-zinc-700'
                  }`}
                >
                  <div className={`h-12 w-12 rounded-xl flex items-center justify-center mr-4 ${
                    selectedRole === 'influencer' ? 'bg-orange-600/20' : 'bg-zinc-800'
                  }`}>
                    <User className={`h-6 w-6 ${selectedRole === 'influencer' ? 'text-orange-500' : 'text-zinc-600'}`} />
                  </div>
                  <div className="text-left">
                    <div className="font-bold">Influencer</div>
                    <div className="text-xs text-zinc-500">I want to promote and earn commissions</div>
                  </div>
                </button>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setShowRoleModal(false)}
                  className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-bold transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleGoogleLogin}
                  className="flex-1 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold transition-all"
                >
                  Continue
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="mt-8 text-center text-sm text-zinc-500">
          Don't have an account?{' '}
          <Link to="/register" className="text-orange-500 hover:text-orange-400 font-bold">
            Create one now
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
