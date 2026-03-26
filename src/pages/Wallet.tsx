import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, doc, getDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../AuthContext';
import { Deposit, Withdrawal, PlatformSettings } from '../types';
import { Wallet as WalletIcon, ArrowDownCircle, ArrowUpCircle, Copy, Check, Info, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const Wallet: React.FC = () => {
  const { profile } = useAuth();
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [copied, setCopied] = useState(false);

  // Form states
  const [depositForm, setDepositForm] = useState({ amount: '', txid: '', network: 'TRC20' as 'TRC20' | 'ERC20' | 'BEP20' });
  const [withdrawForm, setWithdrawForm] = useState({ amount: '', walletAddress: '', network: 'TRC20' as 'TRC20' | 'ERC20' | 'BEP20' });

  useEffect(() => {
    if (!profile) return;

    const qDeposits = query(collection(db, 'deposits'), where('userId', '==', profile.uid));
    const unsubDeposits = onSnapshot(qDeposits, (snapshot) => {
      setDeposits(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Deposit)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'deposits');
    });

    const qWithdrawals = query(collection(db, 'withdrawals'), where('userId', '==', profile.uid));
    const unsubWithdrawals = onSnapshot(qWithdrawals, (snapshot) => {
      setWithdrawals(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Withdrawal)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'withdrawals');
    });

    const fetchSettings = async () => {
      const settingsSnap = await getDoc(doc(db, 'settings', 'platform'));
      if (settingsSnap.exists()) {
        setSettings(settingsSnap.data() as PlatformSettings);
      }
      setLoading(false);
    };
    fetchSettings();

    return () => {
      unsubDeposits();
      unsubWithdrawals();
    };
  }, [profile]);

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    try {
      await addDoc(collection(db, 'deposits'), {
        userId: profile.uid,
        userEmail: profile.email,
        amount: parseFloat(depositForm.amount),
        txid: depositForm.txid,
        network: depositForm.network,
        status: 'pending',
        createdAt: new Date().toISOString()
      });
      toast.success('Deposit request submitted! Admin will verify soon.');
      setShowDepositModal(false);
      setDepositForm({ amount: '', txid: '', network: 'TRC20' });
    } catch (error) {
      toast.error('Failed to submit deposit');
    }
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    const amount = parseFloat(withdrawForm.amount);
    if (amount > profile.availableBalance) {
      toast.error('Insufficient balance');
      return;
    }

    try {
      await addDoc(collection(db, 'withdrawals'), {
        userId: profile.uid,
        userEmail: profile.email,
        amount,
        walletAddress: withdrawForm.walletAddress,
        network: withdrawForm.network,
        status: 'pending',
        createdAt: new Date().toISOString()
      });
      toast.success('Withdrawal request submitted!');
      setShowWithdrawModal(false);
      setWithdrawForm({ amount: '', walletAddress: '', network: 'TRC20' });
    } catch (error) {
      toast.error('Failed to submit withdrawal');
    }
  };

  const copyAddress = (address: string) => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Address copied to clipboard');
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">My Wallet</h1>
          <p className="text-zinc-500">Manage your USDT balance and transactions</p>
        </div>
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-[32px] relative overflow-hidden group transition-all hover:border-orange-600/50">
          <div className="absolute top-0 right-0 w-48 h-48 bg-orange-600/10 blur-[80px] rounded-full -mr-12 -mt-12 group-hover:bg-orange-600/20 transition-all"></div>
          <div className="flex items-center justify-between mb-6">
            <div className="h-12 w-12 bg-orange-600/10 rounded-2xl flex items-center justify-center">
              <WalletIcon className="h-6 w-6 text-orange-500" />
            </div>
            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Available Balance</span>
          </div>
          <div className="text-5xl font-black text-white tracking-tighter mb-2">
            {profile?.availableBalance.toFixed(2)} <span className="text-lg font-normal text-zinc-500 tracking-normal">USDT</span>
          </div>
          <div className="flex gap-3 mt-8">
            <button onClick={() => setShowDepositModal(true)} className="flex-1 bg-orange-600 hover:bg-orange-700 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-lg shadow-orange-600/20">Deposit</button>
            <button onClick={() => setShowWithdrawModal(true)} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all">Withdraw</button>
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-[32px] relative overflow-hidden group transition-all hover:border-blue-600/50">
          <div className="absolute top-0 right-0 w-48 h-48 bg-blue-600/5 blur-[80px] rounded-full -mr-12 -mt-12 group-hover:bg-blue-600/15 transition-all"></div>
          <div className="flex items-center justify-between mb-6">
            <div className="h-12 w-12 bg-blue-600/10 rounded-2xl flex items-center justify-center">
              <ArrowDownCircle className="h-6 w-6 text-blue-500" />
            </div>
            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Escrow Balance</span>
          </div>
          <div className="text-5xl font-black text-white tracking-tighter mb-2">
            {profile?.escrowBalance.toFixed(2)} <span className="text-lg font-normal text-zinc-500 tracking-normal">USDT</span>
          </div>
          <p className="text-zinc-500 text-xs mt-4 font-medium">Funds currently held in active orders</p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-[32px] relative overflow-hidden group transition-all hover:border-green-600/50">
          <div className="absolute top-0 right-0 w-48 h-48 bg-green-600/5 blur-[80px] rounded-full -mr-12 -mt-12 group-hover:bg-green-600/15 transition-all"></div>
          <div className="flex items-center justify-between mb-6">
            <div className="h-12 w-12 bg-green-600/10 rounded-2xl flex items-center justify-center">
              <ArrowUpCircle className="h-6 w-6 text-green-500" />
            </div>
            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Withdrawable</span>
          </div>
          <div className="text-5xl font-black text-white tracking-tighter mb-2">
            {profile?.withdrawableBalance.toFixed(2)} <span className="text-lg font-normal text-zinc-500 tracking-normal">USDT</span>
          </div>
          <p className="text-zinc-500 text-xs mt-4 font-medium">Earnings ready for manual withdrawal</p>
        </div>
      </div>

      {/* Transaction History */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden">
        <div className="p-6 border-b border-zinc-800">
          <h2 className="text-xl font-bold text-white">Transaction History</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-zinc-800/50 text-zinc-500 text-xs uppercase font-bold tracking-wider">
              <tr>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">Details</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {deposits.map(d => (
                <tr key={d.id} className="hover:bg-zinc-800/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center text-blue-400 font-bold">
                      <ArrowDownCircle className="h-4 w-4 mr-2" />
                      Deposit
                    </div>
                  </td>
                  <td className="px-6 py-4 text-white font-mono">+{d.amount} USDT</td>
                  <td className="px-6 py-4 text-zinc-500 text-xs font-mono truncate max-w-[150px]">{d.txid}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded ${
                      d.status === 'approved' ? 'bg-green-900/20 text-green-500' : 
                      d.status === 'pending' ? 'bg-orange-900/20 text-orange-500' : 'bg-red-900/20 text-red-500'
                    }`}>
                      {d.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-zinc-500 text-xs">{new Date(d.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
              {withdrawals.map(w => (
                <tr key={w.id} className="hover:bg-zinc-800/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center text-green-400 font-bold">
                      <ArrowUpCircle className="h-4 w-4 mr-2" />
                      Withdrawal
                    </div>
                  </td>
                  <td className="px-6 py-4 text-white font-mono">-{w.amount} USDT</td>
                  <td className="px-6 py-4 text-zinc-500 text-xs font-mono truncate max-w-[150px]">{w.walletAddress}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded ${
                      w.status === 'completed' ? 'bg-green-900/20 text-green-500' : 
                      w.status === 'pending' ? 'bg-orange-900/20 text-orange-500' : 'bg-red-900/20 text-red-500'
                    }`}>
                      {w.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-zinc-500 text-xs">{new Date(w.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
              {deposits.length === 0 && withdrawals.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-zinc-600">No transactions found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Deposit Modal */}
      {showDepositModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-lg p-6 md:p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">Deposit USDT</h2>
              <button onClick={() => setShowDepositModal(false)} className="text-zinc-500 hover:text-white">&times;</button>
            </div>
            
            <div className="bg-orange-600/10 border border-orange-600/20 rounded-2xl p-6 mb-8">
              <div className="flex items-center mb-4 text-orange-500 font-bold text-sm">
                <Info className="h-4 w-4 mr-2" />
                Admin Wallet Addresses
              </div>
              <div className="space-y-4">
                <div>
                  <div className="text-xs text-zinc-500 mb-1 uppercase font-bold tracking-tighter">TRC20 Address</div>
                  <div className="flex items-center bg-zinc-950 p-3 rounded-xl border border-zinc-800">
                    <code className="flex-1 text-xs text-white truncate mr-2">{settings?.adminWalletTRC20 || 'Address not set'}</code>
                    <button onClick={() => copyAddress(settings?.adminWalletTRC20 || '')} className="p-2 hover:bg-zinc-800 rounded-lg transition-colors">
                      {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4 text-zinc-500" />}
                    </button>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-zinc-500 mb-1 uppercase font-bold tracking-tighter">ERC20 Address</div>
                  <div className="flex items-center bg-zinc-950 p-3 rounded-xl border border-zinc-800">
                    <code className="flex-1 text-xs text-white truncate mr-2">{settings?.adminWalletERC20 || 'Address not set'}</code>
                    <button onClick={() => copyAddress(settings?.adminWalletERC20 || '')} className="p-2 hover:bg-zinc-800 rounded-lg transition-colors">
                      {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4 text-zinc-500" />}
                    </button>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-zinc-500 mb-1 uppercase font-bold tracking-tighter">BEP20 Address</div>
                  <div className="flex items-center bg-zinc-950 p-3 rounded-xl border border-zinc-800">
                    <code className="flex-1 text-xs text-white truncate mr-2">{settings?.adminWalletBEP20 || 'Address not set'}</code>
                    <button onClick={() => copyAddress(settings?.adminWalletBEP20 || '')} className="p-2 hover:bg-zinc-800 rounded-lg transition-colors">
                      {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4 text-zinc-500" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <form onSubmit={handleDeposit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Select Network</label>
                <div className="grid grid-cols-3 gap-3">
                  {['TRC20', 'ERC20', 'BEP20'].map((net) => (
                    <button
                      key={net}
                      type="button"
                      onClick={() => setDepositForm({ ...depositForm, network: net as any })}
                      className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                        depositForm.network === net
                          ? 'bg-orange-600 border-orange-600 text-white'
                          : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600'
                      }`}
                    >
                      {net}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Amount (USDT)</label>
                <input
                  type="number"
                  required
                  step="0.01"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-orange-500"
                  placeholder="100.00"
                  value={depositForm.amount}
                  onChange={e => setDepositForm({...depositForm, amount: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Transaction ID (TXID)</label>
                <input
                  type="text"
                  required
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-orange-500"
                  placeholder="Enter your transaction hash"
                  value={depositForm.txid}
                  onChange={e => setDepositForm({...depositForm, txid: e.target.value})}
                />
              </div>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setShowDepositModal(false)}
                  className="flex-1 py-4 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-bold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-4 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold transition-all"
                >
                  Submit Deposit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Withdraw Modal */}
      {showWithdrawModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-lg p-6 md:p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">Withdraw USDT</h2>
              <button onClick={() => setShowWithdrawModal(false)} className="text-zinc-500 hover:text-white">&times;</button>
            </div>

            <div className="bg-zinc-800/50 rounded-2xl p-4 mb-8 flex items-center">
              <AlertCircle className="h-5 w-5 text-blue-500 mr-3" />
              <p className="text-xs text-zinc-400">Withdrawals are processed manually by admin within 24 hours.</p>
            </div>

            <form onSubmit={handleWithdraw} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Select Network</label>
                <div className="grid grid-cols-3 gap-3">
                  {['TRC20', 'ERC20', 'BEP20'].map((net) => (
                    <button
                      key={net}
                      type="button"
                      onClick={() => setWithdrawForm({ ...withdrawForm, network: net as any })}
                      className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                        withdrawForm.network === net
                          ? 'bg-orange-600 border-orange-600 text-white'
                          : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600'
                      }`}
                    >
                      {net}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Amount (USDT)</label>
                <input
                  type="number"
                  required
                  step="0.01"
                  max={profile?.availableBalance}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-orange-500"
                  placeholder="0.00"
                  value={withdrawForm.amount}
                  onChange={e => setWithdrawForm({...withdrawForm, amount: e.target.value})}
                />
                <div className="text-right mt-1">
                  <span className="text-[10px] text-zinc-500">Max: {profile?.availableBalance.toFixed(2)} USDT</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Your USDT Address ({withdrawForm.network})</label>
                <input
                  type="text"
                  required
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-orange-500"
                  placeholder={`${withdrawForm.network} address...`}
                  value={withdrawForm.walletAddress}
                  onChange={e => setWithdrawForm({...withdrawForm, walletAddress: e.target.value})}
                />
              </div>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setShowWithdrawModal(false)}
                  className="flex-1 py-4 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-bold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-4 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold transition-all"
                >
                  Request Withdrawal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Wallet;
