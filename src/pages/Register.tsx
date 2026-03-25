import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createUserWithEmailAndPassword, updateProfile, signInWithPopup } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType, googleProvider } from '../lib/firebase';
import { Shield, Mail, Lock, User, ArrowRight, ShoppingCart, Briefcase, Chrome } from 'lucide-react';
import { toast } from 'sonner';
import { UserProfile, UserRole } from '../types';

const Register: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState<UserRole>('buyer');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { user } = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(user, { displayName });

      // Create user profile explicitly with chosen role
      const profileRef = doc(db, 'users', user.uid);
      const newProfile: UserProfile = {
        uid: user.uid,
        email: user.email || '',
        displayName: displayName || user.email?.split('@')[0] || 'User',
        role: role,
        availableBalance: 0,
        escrowBalance: 0,
        withdrawableBalance: 0,
        isSuspended: false,
        isVerified: false,
        createdAt: new Date().toISOString(),
      };
      
      try {
        await setDoc(profileRef, newProfile);
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
      }

      toast.success('Account created successfully!');
      navigate('/dashboard');
    } catch (error: any) {
      toast.error(error.message || 'Failed to register');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
      toast.success('Welcome!');
      navigate('/dashboard');
    } catch (error: any) {
      toast.error(error.message || 'Failed to login with Google');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-12">
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-2xl">
        <div className="text-center mb-10">
          <div className="h-16 w-16 bg-orange-600/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Shield className="h-8 w-8 text-orange-500" />
          </div>
          <h1 className="text-3xl font-bold text-white">Create Account</h1>
          <p className="text-zinc-500 mt-2">Join the marketplace today</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-6">
          <div className="grid grid-cols-2 gap-4 mb-6">
            <button
              type="button"
              onClick={() => setRole('buyer')}
              className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all ${
                role === 'buyer'
                  ? 'border-orange-600 bg-orange-600/10 text-white'
                  : 'border-zinc-800 bg-zinc-800/50 text-zinc-500 hover:border-zinc-700'
              }`}
            >
              <ShoppingCart className={`h-6 w-6 mb-2 ${role === 'buyer' ? 'text-orange-500' : ''}`} />
              <span className="text-sm font-bold">Buyer</span>
            </button>
            <button
              type="button"
              onClick={() => setRole('seller')}
              className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all ${
                role === 'seller'
                  ? 'border-orange-600 bg-orange-600/10 text-white'
                  : 'border-zinc-800 bg-zinc-800/50 text-zinc-500 hover:border-zinc-700'
              }`}
            >
              <Briefcase className={`h-6 w-6 mb-2 ${role === 'seller' ? 'text-orange-500' : ''}`} />
              <span className="text-sm font-bold">Seller</span>
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Display Name</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-600" />
              <input
                type="text"
                required
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl py-3 px-4 pl-10 text-white focus:outline-none focus:border-orange-500 transition-colors"
                placeholder="John Doe"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-600" />
              <input
                type="email"
                required
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl py-3 px-4 pl-10 text-white focus:outline-none focus:border-orange-500 transition-colors"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-600" />
              <input
                type="password"
                required
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl py-3 px-4 pl-10 text-white focus:outline-none focus:border-orange-500 transition-colors"
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
            {loading ? 'Creating account...' : 'Create Account'}
            {!loading && <ArrowRight className="ml-2 h-5 w-5" />}
          </button>
        </form>

        <div className="mt-6 flex items-center justify-center space-x-4">
          <div className="flex-1 h-px bg-zinc-800"></div>
          <span className="text-zinc-500 text-xs font-bold uppercase tracking-wider">Or continue with</span>
          <div className="flex-1 h-px bg-zinc-800"></div>
        </div>

        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="mt-6 w-full py-4 bg-zinc-800 hover:bg-zinc-700 disabled:bg-zinc-700 text-white rounded-xl font-bold transition-all flex items-center justify-center border border-zinc-700"
        >
          <Chrome className="mr-2 h-5 w-5 text-orange-500" />
          Google Account
        </button>

        <div className="mt-8 text-center text-sm text-zinc-500">
          Already have an account?{' '}
          <Link to="/login" className="text-orange-500 hover:text-orange-400 font-bold">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Register;
