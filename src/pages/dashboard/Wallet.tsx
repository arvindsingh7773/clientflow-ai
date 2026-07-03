import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  updateDoc, 
  doc, 
  getDoc, 
  setDoc, 
  addDoc, 
  orderBy, 
  limit 
} from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Textarea } from '../../components/ui/textarea';
import { SUBSCRIPTION_PLANS, paymentProviders, createPaymentRecord, PlanConfig } from '../../lib/payments';
import { Transaction, User, Milestone } from '../../types';
import { 
  Wallet as WalletIcon, 
  CreditCard, 
  ArrowDownRight, 
  ArrowUpRight, 
  ShieldCheck, 
  DollarSign, 
  RefreshCw, 
  Send, 
  Plus, 
  Award, 
  AlertCircle, 
  Sparkles, 
  Star, 
  Download, 
  FileText, 
  Check, 
  Settings, 
  ShieldAlert,
  Printer,
  ChevronRight,
  TrendingUp,
  Users,
  Briefcase
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { motion } from 'motion/react';

export default function Wallet() {
  const { user, updateRole } = useAuth();
  const [freshUser, setFreshUser] = useState<User | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]); // For Admin Console
  const [allUsers, setAllUsers] = useState<User[]>([]); // For Admin Console
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'wallet' | 'plans' | 'escrow' | 'billing' | 'admin'>('wallet');

  // Modal / Interaction states
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState<Transaction | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<'stripe' | 'paypal' | 'razorpay'>('stripe');
  const [depositAmount, setDepositAmount] = useState('100');
  const [withdrawAmount, setWithdrawAmount] = useState('50');
  const [withdrawDestination, setWithdrawDestination] = useState('');
  const [processing, setProcessing] = useState(false);

  // Admin states
  const [isAdminMode, setIsAdminMode] = useState(false);

  // Buy Credits state
  const [creditsToBuy, setCreditsToBuy] = useState(50);

  useEffect(() => {
    fetchWalletData();
  }, [user]);

  const fetchWalletData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // 1. Fetch Fresh User Profile details (wallet balance, plan)
      const uDoc = await getDoc(doc(db, 'users', user.id));
      if (uDoc.exists()) {
        setFreshUser({ id: uDoc.id, ...uDoc.data() } as User);
      }

      // 2. Fetch User's Transactions
      const qTx = query(
        collection(db, 'transactions'),
        where('userId', '==', user.id),
        orderBy('createdAt', 'desc')
      );
      const snapTx = await getDocs(qTx);
      const txList = snapTx.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
      setTransactions(txList);

      // 3. Fetch user's milestones (active escrows)
      // We will look up milestones of projects where the user is either clientId or hiredFreelancerId
      const qProjClient = query(collection(db, 'projects'), where('clientId', '==', user.id));
      const snapProjClient = await getDocs(qProjClient);
      const clientProjectIds = snapProjClient.docs.map(d => d.id);

      const qProjFreelancer = query(collection(db, 'projects'), where('hiredFreelancerId', '==', user.id));
      const snapProjFreelancer = await getDocs(qProjFreelancer);
      const freelancerProjectIds = snapProjFreelancer.docs.map(d => d.id);

      const allMyProjectIds = [...clientProjectIds, ...freelancerProjectIds].filter(Boolean) as string[];

      if (allMyProjectIds.length > 0) {
        const qMilestones = query(collection(db, 'milestones'), where('projectId', 'in', allMyProjectIds));
        const snapMilestones = await getDocs(qMilestones);
        setMilestones(snapMilestones.docs.map(d => ({ id: d.id, ...d.data() } as Milestone)));
      }

      // 4. If Admin or Test mode is active, fetch system-wide transactions and users
      if (user.role === 'ADMIN' || isAdminMode) {
        const snapAllTx = await getDocs(query(collection(db, 'transactions'), orderBy('createdAt', 'desc')));
        setAllTransactions(snapAllTx.docs.map(d => ({ id: d.id, ...d.data() } as Transaction)));

        const snapAllUsers = await getDocs(collection(db, 'users'));
        setAllUsers(snapAllUsers.docs.map(d => ({ id: d.id, ...d.data() } as User)));
      }
    } catch (error) {
      console.error('Error fetching wallet data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Deposit Action
  const handleDeposit = async () => {
    if (!user || !freshUser) return;
    const amount = Number(depositAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Invalid deposit amount');
      return;
    }

    setProcessing(true);
    try {
      const provider = paymentProviders[selectedProvider];
      const res = await provider.initializePayment(amount, 'USD', { userId: user.id });

      if (res.success) {
        // Update user's wallet balance in Firestore
        const currentBalance = freshUser.walletBalance || 0;
        const newBalance = currentBalance + amount;

        await updateDoc(doc(db, 'users', user.id), {
          walletBalance: newBalance
        });

        // Save transaction history
        await createPaymentRecord({
          userId: user.id,
          type: 'DEPOSIT',
          amount,
          currency: 'USD',
          status: 'COMPLETED',
          description: `Deposited funds via ${provider.name}`,
          paymentMethod: provider.name
        });

        toast.success(`Successfully deposited $${amount} via ${provider.name}!`);
        setShowDepositModal(false);
        fetchWalletData();
      } else {
        toast.error('Gateway payment initialization failed');
      }
    } catch (error) {
      toast.error('Deposit failed');
      console.error(error);
    } finally {
      setProcessing(false);
    }
  };

  // Withdrawal Action
  const handleWithdrawal = async () => {
    if (!user || !freshUser) return;
    const amount = Number(withdrawAmount);
    const balance = freshUser.walletBalance || 0;

    if (isNaN(amount) || amount <= 0) {
      toast.error('Invalid withdrawal amount');
      return;
    }
    if (amount > balance) {
      toast.error('Insufficient wallet balance');
      return;
    }
    if (!withdrawDestination.trim()) {
      toast.error('Please specify destination details');
      return;
    }

    setProcessing(true);
    try {
      const provider = paymentProviders[selectedProvider];
      const res = await provider.withdrawFunds(user.id, amount, withdrawDestination);

      if (res.success) {
        const newBalance = balance - amount;

        await updateDoc(doc(db, 'users', user.id), {
          walletBalance: newBalance
        });

        await createPaymentRecord({
          userId: user.id,
          type: 'WITHDRAWAL',
          amount,
          currency: 'USD',
          status: 'COMPLETED',
          description: `Withdrew earnings to ${withdrawDestination} via ${provider.name}`,
          paymentMethod: provider.name
        });

        toast.success(`Successfully withdrew $${amount}! Processing details: ${res.payoutId}`);
        setShowWithdrawModal(false);
        setWithdrawDestination('');
        fetchWalletData();
      } else {
        toast.error('Withdrawal failed at gateway');
      }
    } catch (error) {
      toast.error('Withdrawal failed');
      console.error(error);
    } finally {
      setProcessing(false);
    }
  };

  // Buy AI Credits
  const handleBuyCredits = async () => {
    if (!user || !freshUser) return;
    const cost = creditsToBuy * 0.15; // $0.15 per credit
    const balance = freshUser.walletBalance || 0;

    if (balance < cost) {
      toast.error(`Insufficient balance. Cost is $${cost.toFixed(2)}. Please top up your wallet.`);
      return;
    }

    setProcessing(true);
    try {
      const newBalance = balance - cost;
      const currentCredits = freshUser.aiCredits || 0;
      const newCredits = currentCredits + creditsToBuy;

      await updateDoc(doc(db, 'users', user.id), {
        walletBalance: newBalance,
        aiCredits: newCredits
      });

      await createPaymentRecord({
        userId: user.id,
        type: 'SUBSCRIPTION',
        amount: cost,
        currency: 'USD',
        status: 'COMPLETED',
        description: `Purchased ${creditsToBuy} Premium AI Credits`
      });

      toast.success(`Purchased ${creditsToBuy} AI Credits successfully!`);
      fetchWalletData();
    } catch (error) {
      toast.error('Purchase failed');
      console.error(error);
    } finally {
      setProcessing(false);
    }
  };

  // Upgrade Subscription Plan
  const handleSubscribe = async (planId: PlanConfig['id']) => {
    if (!user || !freshUser) return;
    const plan = SUBSCRIPTION_PLANS[planId];
    const balance = freshUser.walletBalance || 0;

    if (plan.priceMonthly > balance) {
      toast.error(`Insufficient balance. Subscription cost is $${plan.priceMonthly}. Please top up your wallet.`);
      return;
    }

    setProcessing(true);
    try {
      const newBalance = balance - plan.priceMonthly;
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + 30); // 30 days validity

      const updatedCredits = (freshUser.aiCredits || 0) + plan.aiCredits;

      await updateDoc(doc(db, 'users', user.id), {
        walletBalance: newBalance,
        subscriptionPlan: planId,
        subscriptionExpiresAt: expiry.toISOString(),
        aiCredits: updatedCredits,
        isFeatured: planId !== 'FREE'
      });

      await createPaymentRecord({
        userId: user.id,
        type: 'SUBSCRIPTION',
        amount: plan.priceMonthly,
        currency: 'USD',
        status: 'COMPLETED',
        description: `Subscribed to ${plan.name} Monthly Membership`
      });

      toast.success(`Successfully upgraded to ${plan.name}!`);
      fetchWalletData();
    } catch (error) {
      toast.error('Subscription failed');
      console.error(error);
    } finally {
      setProcessing(false);
    }
  };

  // Admin Refund Handler
  const handleAdminRefund = async (tx: Transaction) => {
    if (!user || (user.role !== 'ADMIN' && !isAdminMode)) return;

    setProcessing(true);
    try {
      // Find the user who owns this transaction
      const targetUserRef = doc(db, 'users', tx.userId);
      const targetUserSnap = await getDoc(targetUserRef);

      if (!targetUserSnap.exists()) {
        toast.error('User associated with transaction not found');
        return;
      }

      const targetUser = targetUserSnap.data() as User;
      const currentBalance = targetUser.walletBalance || 0;

      // Adjust balance based on original transaction type
      let newBalance = currentBalance;
      if (tx.type === 'DEPOSIT') {
        newBalance = Math.max(0, currentBalance - tx.amount);
      } else if (tx.type === 'SUBSCRIPTION' || tx.type === 'ESCROW_FUND') {
        newBalance = currentBalance + tx.amount;
      } else if (tx.type === 'WITHDRAWAL') {
        newBalance = currentBalance + tx.amount;
      } else if (tx.type === 'ESCROW_RELEASE') {
        newBalance = Math.max(0, currentBalance - tx.amount);
      }

      // Update target user balance
      await updateDoc(targetUserRef, { walletBalance: newBalance });

      // Update original transaction status in Firestore
      const txRef = doc(db, 'transactions', tx.id);
      await updateDoc(txRef, { status: 'REFUNDED' });

      // Create refund record
      await createPaymentRecord({
        userId: tx.userId,
        type: 'REFUND',
        amount: tx.amount,
        currency: tx.currency,
        status: 'COMPLETED',
        description: `Refunded original transaction: ${tx.id}`,
        projectId: tx.projectId,
        milestoneId: tx.milestoneId
      });

      toast.success('Transaction refunded successfully!');
      fetchWalletData();
    } catch (error) {
      toast.error('Admin refund operation failed');
      console.error(error);
    } finally {
      setProcessing(false);
    }
  };

  // Helper calculation values
  const currentPlan = freshUser?.subscriptionPlan || 'FREE';
  const balance = freshUser?.walletBalance || 0;
  const aiCredits = freshUser?.aiCredits || 0;

  // Earnings calculation (completed milestones and deposits)
  const totalEarnings = transactions
    .filter(t => t.type === 'ESCROW_RELEASE' && t.status === 'COMPLETED')
    .reduce((sum, t) => sum + t.amount, 0);

  // Print function
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-3xl font-bold font-heading">Financial Dashboard</h1>
          <p className="text-muted-foreground mt-1">Manage wallet balance, subscriptions, milestone escrow payments, and billing details securely.</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {/* Admin Role Toggle to allow testing of required Admin Console features */}
          <Button 
            variant={isAdminMode ? 'default' : 'outline'} 
            className="flex items-center gap-2 border-dashed border-primary/40 text-xs py-1"
            onClick={() => {
              setIsAdminMode(!isAdminMode);
              toast.success(isAdminMode ? 'Admin Sandbox mode turned off' : 'Admin Sandbox mode active!');
            }}
          >
            <ShieldCheck className="w-4 h-4 text-purple-500" />
            <span>Admin Sandbox: {isAdminMode ? 'ON' : 'OFF'}</span>
          </Button>

          <Button variant="outline" size="icon" onClick={fetchWalletData} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Grid of KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Wallet Balance */}
        <Card className="relative overflow-hidden border border-primary/10">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold text-muted-foreground tracking-wider uppercase">Wallet Balance</CardDescription>
            <CardTitle className="text-3xl font-extrabold flex items-center">
              <span className="text-primary mr-1">$</span>
              {balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 flex gap-2">
            <Button size="sm" className="flex-1" onClick={() => setShowDepositModal(true)}>
              <Plus className="w-4 h-4 mr-1" /> Deposit
            </Button>
            {freshUser?.role === 'FREELANCER' && (
              <Button size="sm" variant="outline" className="flex-1" onClick={() => setShowWithdrawModal(true)}>
                <ArrowUpRight className="w-4 h-4 mr-1" /> Withdraw
              </Button>
            )}
          </CardContent>
          <div className="absolute right-3 top-3 p-2 bg-primary/5 rounded-full text-primary">
            <WalletIcon className="w-5 h-5" />
          </div>
        </Card>

        {/* AI Credits */}
        <Card className="relative overflow-hidden">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold text-muted-foreground tracking-wider uppercase">AI Credits Balance</CardDescription>
            <CardTitle className="text-3xl font-extrabold flex items-center text-purple-600">
              {aiCredits}
              <Sparkles className="w-5 h-5 ml-2 text-purple-500 fill-current" />
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-xs text-muted-foreground">
            Used for smart proposals, AI match, and translation suggestions.
          </CardContent>
          <div className="absolute right-3 top-3 p-2 bg-purple-500/5 rounded-full text-purple-500">
            <Sparkles className="w-5 h-5" />
          </div>
        </Card>

        {/* Current Plan Badge */}
        <Card className="relative overflow-hidden">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold text-muted-foreground tracking-wider uppercase">Subscription Plan</CardDescription>
            <CardTitle className="text-xl font-extrabold flex items-center">
              {SUBSCRIPTION_PLANS[currentPlan]?.name || 'Free Starter'}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-xs text-muted-foreground">
            {freshUser?.subscriptionExpiresAt ? (
              <span>Renews/Expires: {new Date(freshUser.subscriptionExpiresAt).toLocaleDateString()}</span>
            ) : (
              <span>Upgrade to unlock premium tools & priority support.</span>
            )}
          </CardContent>
          <div className="absolute right-3 top-3 p-2 bg-yellow-500/5 rounded-full text-yellow-500">
            <Award className="w-5 h-5" />
          </div>
        </Card>

        {/* Total Earnings or Projected Spending */}
        <Card className="relative overflow-hidden">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold text-muted-foreground tracking-wider uppercase">
              {freshUser?.role === 'FREELANCER' ? 'Total Earnings' : 'Escrow Value Locked'}
            </CardDescription>
            <CardTitle className="text-3xl font-extrabold flex items-center text-emerald-600">
              <span className="text-emerald-500 mr-1">$</span>
              {freshUser?.role === 'FREELANCER' 
                ? totalEarnings.toLocaleString('en-US', { minimumFractionDigits: 2 })
                : milestones.filter(m => m.status === 'ACTIVE').reduce((sum, m) => sum + m.amount, 0).toLocaleString('en-US', { minimumFractionDigits: 2 })
              }
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-xs text-muted-foreground">
            {freshUser?.role === 'FREELANCER' ? 'Total completed & paid milestones.' : 'Funds held securely in escrow protection.'}
          </CardContent>
          <div className="absolute right-3 top-3 p-2 bg-emerald-500/5 rounded-full text-emerald-500">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </Card>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-border overflow-x-auto whitespace-nowrap">
        <button 
          onClick={() => setActiveTab('wallet')} 
          className={`py-3 px-6 font-medium text-sm border-b-2 transition-colors ${activeTab === 'wallet' ? 'border-primary text-primary font-semibold' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
        >
          Wallet & Credits
        </button>
        <button 
          onClick={() => setActiveTab('plans')} 
          className={`py-3 px-6 font-medium text-sm border-b-2 transition-colors ${activeTab === 'plans' ? 'border-primary text-primary font-semibold' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
        >
          Premium Plans
        </button>
        <button 
          onClick={() => setActiveTab('escrow')} 
          className={`py-3 px-6 font-medium text-sm border-b-2 transition-colors ${activeTab === 'escrow' ? 'border-primary text-primary font-semibold' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
        >
          Escrow Contracts
        </button>
        <button 
          onClick={() => setActiveTab('billing')} 
          className={`py-3 px-6 font-medium text-sm border-b-2 transition-colors ${activeTab === 'billing' ? 'border-primary text-primary font-semibold' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
        >
          Invoices & Billing
        </button>
        {(user?.role === 'ADMIN' || isAdminMode) && (
          <button 
            onClick={() => setActiveTab('admin')} 
            className={`py-3 px-6 font-medium text-sm border-b-2 transition-colors ${activeTab === 'admin' ? 'border-purple-600 text-purple-600 font-bold' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
          >
            🛡️ Admin Console
          </button>
        )}
      </div>

      {/* Tab Panels */}
      <div className="space-y-6">
        {/* TAB 1: WALLET & CREDITS */}
        {activeTab === 'wallet' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              {/* Core Transactions list */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Recent Transactions</CardTitle>
                    <CardDescription>Review recent deposits, withdrawals, and subscription activity.</CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {transactions.length === 0 ? (
                    <div className="p-12 text-center text-sm text-muted-foreground">
                      No transactions recorded yet. Fund your wallet or subscribe to start!
                    </div>
                  ) : (
                    <div className="divide-y divide-border">
                      {transactions.slice(0, 5).map(tx => (
                        <div key={tx.id} className="p-4 flex items-center justify-between hover:bg-accent/10 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-full ${
                              tx.type === 'DEPOSIT' || tx.type === 'ESCROW_RELEASE' ? 'bg-emerald-500/10 text-emerald-600' :
                              tx.type === 'WITHDRAWAL' || tx.type === 'ESCROW_FUND' ? 'bg-amber-500/10 text-amber-600' :
                              'bg-purple-500/10 text-purple-600'
                            }`}>
                              {tx.type === 'DEPOSIT' && <ArrowDownRight className="w-4 h-4" />}
                              {tx.type === 'WITHDRAWAL' && <ArrowUpRight className="w-4 h-4" />}
                              {tx.type === 'ESCROW_FUND' && <CreditCard className="w-4 h-4" />}
                              {tx.type === 'ESCROW_RELEASE' && <ShieldCheck className="w-4 h-4" />}
                              {tx.type === 'SUBSCRIPTION' && <Award className="w-4 h-4" />}
                              {tx.type === 'REFUND' && <RefreshCw className="w-4 h-4" />}
                            </div>
                            <div>
                              <div className="font-semibold text-sm">{tx.description}</div>
                              <div className="text-xs text-muted-foreground flex gap-2">
                                <span>{new Date(tx.createdAt).toLocaleDateString()}</span>
                                <span>•</span>
                                <span className="font-mono">{tx.id}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <span className={`font-bold text-sm ${
                                tx.type === 'DEPOSIT' || tx.type === 'ESCROW_RELEASE' || tx.type === 'REFUND' ? 'text-emerald-600' : 'text-foreground'
                              }`}>
                                {tx.type === 'DEPOSIT' || tx.type === 'ESCROW_RELEASE' || tx.type === 'REFUND' ? '+' : '-'}
                                ${tx.amount.toFixed(2)}
                              </span>
                              <div className="text-[10px]">
                                <Badge variant={tx.status === 'COMPLETED' ? 'default' : 'secondary'} className="px-1.5 py-0">
                                  {tx.status}
                                </Badge>
                              </div>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => setShowInvoiceModal(tx)}>
                              <FileText className="w-4 h-4 text-muted-foreground" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Side column: Buy credits instantly */}
            <div className="space-y-6">
              <Card className="border border-purple-500/20 bg-purple-500/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-purple-500 fill-current" />
                    Buy Premium AI Credits
                  </CardTitle>
                  <CardDescription>Acquire premium credits instantly using your wallet balance. Standard pricing is $0.15 / credit.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    {[20, 50, 100, 200].map(val => (
                      <Button 
                        key={val} 
                        variant={creditsToBuy === val ? 'default' : 'outline'} 
                        className="flex-1 text-xs"
                        onClick={() => setCreditsToBuy(val)}
                      >
                        {val} Credits
                      </Button>
                    ))}
                  </div>
                  <div className="border-t border-purple-500/10 pt-3 flex justify-between items-center text-sm font-medium">
                    <span>Total Cost:</span>
                    <span className="font-bold text-lg text-purple-600">${(creditsToBuy * 0.15).toFixed(2)} USD</span>
                  </div>
                  <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white" onClick={handleBuyCredits} disabled={processing}>
                    {processing ? 'Processing...' : `Purchase ${creditsToBuy} Credits`}
                  </Button>
                </CardContent>
              </Card>

              {/* Security Shield Info */}
              <Card>
                <CardContent className="p-6 flex gap-4 items-start">
                  <div className="p-2 bg-emerald-500/10 rounded-full text-emerald-600 mt-1">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm">Escrow Secure Safeguard</h4>
                    <p className="text-xs text-muted-foreground mt-1">Our platform enforces dynamic 100% Milestone Escrow locks. Once a milestone is funded, client payments are held under double-signature security protection.</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* TAB 2: PREMIUM PLANS */}
        {activeTab === 'plans' && (
          <div className="space-y-6">
            <div className="text-center max-w-2xl mx-auto py-4">
              <h2 className="text-2xl font-bold font-heading">Choose Your ClientFlow Pro tier</h2>
              <p className="text-muted-foreground mt-1">Boost matching matching algorithms, scale AI credits, and elevate your dashboard tracking tools.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {Object.values(SUBSCRIPTION_PLANS).map((plan) => {
                const isSelected = currentPlan === plan.id;
                return (
                  <Card key={plan.id} className={`flex flex-col relative overflow-hidden ${
                    isSelected ? 'border-2 border-primary shadow-md' : 'border border-border'
                  }`}>
                    {isSelected && (
                      <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-[10px] uppercase font-extrabold px-3 py-1 rounded-bl-lg">
                        Active Now
                      </div>
                    )}
                    <CardHeader>
                      <CardTitle className="text-lg font-heading">{plan.name}</CardTitle>
                      <div className="mt-2 flex items-baseline">
                        <span className="text-3xl font-extrabold">${plan.priceMonthly}</span>
                        <span className="text-muted-foreground text-xs ml-1">/ month</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2 font-semibold">Includes {plan.aiCredits} AI Credits</p>
                    </CardHeader>
                    <CardContent className="flex-grow space-y-3">
                      <div className="border-t border-border pt-4">
                        <div className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Features included:</div>
                        <ul className="space-y-2 text-xs">
                          {plan.features.map((feat, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <Check className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                              <span className="text-muted-foreground">{feat}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </CardContent>
                    <div className="p-4 border-t border-border">
                      {plan.priceMonthly === 0 ? (
                        <Button variant="outline" className="w-full" disabled>Default Plan</Button>
                      ) : (
                        <Button 
                          variant={isSelected ? 'outline' : 'default'} 
                          className="w-full" 
                          disabled={isSelected || processing}
                          onClick={() => handleSubscribe(plan.id)}
                        >
                          {isSelected ? 'Current Active Tier' : `Subscribe for $${plan.priceMonthly}`}
                        </Button>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: ESCROW CONTRACTS */}
        {activeTab === 'escrow' && (
          <Card>
            <CardHeader>
              <CardTitle>Active Escrow Contracts & Milestone Locks</CardTitle>
              <CardDescription>Protect your capital and guarantee delivery with secure escrow milestones. Clients authorize payments and release when satisfied.</CardDescription>
            </CardHeader>
            <CardContent>
              {milestones.length === 0 ? (
                <div className="text-center py-12 text-sm text-muted-foreground">
                  No active project milestones currently bound to escrow.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-border text-muted-foreground font-semibold">
                        <th className="py-3 px-4">Milestone Title</th>
                        <th className="py-3 px-4">Amount</th>
                        <th className="py-3 px-4">Secure Status</th>
                        <th className="py-3 px-4 text-right font-medium">Safe Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {milestones.map(m => (
                        <tr key={m.id} className="hover:bg-accent/5 transition-colors">
                          <td className="py-3 px-4">
                            <span className="font-semibold block">{m.title}</span>
                            <span className="text-xs text-muted-foreground font-mono">ID: {m.id}</span>
                          </td>
                          <td className="py-3 px-4 font-bold text-primary">${m.amount.toFixed(2)}</td>
                          <td className="py-3 px-4">
                            <Badge variant={
                              m.status === 'PAID' ? 'default' :
                              m.status === 'SUBMITTED' ? 'secondary' :
                              m.status === 'ACTIVE' ? 'outline' : 'secondary'
                            }>
                              {m.status === 'ACTIVE' ? '🔒 SECURED ESCROW' : m.status}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="text-xs"
                              onClick={() => toast.success(`Navigate to Project Workspace to complete ${m.title}`)}
                            >
                              Workspace Details <ChevronRight className="w-3 h-3 ml-1" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* TAB 4: BILLING & INVOICES */}
        {activeTab === 'billing' && (
          <Card>
            <CardHeader>
              <CardTitle>Invoices & Payment Receipts</CardTitle>
              <CardDescription>Instant download receipts for all financial operations, deposits, and service fees.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {transactions.length === 0 ? (
                <div className="p-12 text-center text-sm text-muted-foreground">
                  No billing history available yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-border bg-accent/20 text-muted-foreground font-semibold">
                        <th className="py-3 px-4">Invoice No</th>
                        <th className="py-3 px-4">Transaction Date</th>
                        <th className="py-3 px-4">Description</th>
                        <th className="py-3 px-4">Amount</th>
                        <th className="py-3 px-4">Download PDF</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {transactions.map(tx => (
                        <tr key={tx.id} className="hover:bg-accent/5 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-primary text-xs">
                            {tx.invoiceNumber || `INV-${tx.id.slice(-6)}`}
                          </td>
                          <td className="py-3 px-4 text-muted-foreground text-xs">
                            {new Date(tx.createdAt).toLocaleDateString()} {new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="py-3 px-4 font-semibold text-xs">{tx.description}</td>
                          <td className="py-3 px-4 font-extrabold text-xs">
                            ${tx.amount.toFixed(2)} USD
                          </td>
                          <td className="py-3 px-4 text-xs">
                            <Button variant="ghost" size="sm" className="h-8 flex items-center gap-1.5" onClick={() => setShowInvoiceModal(tx)}>
                              <Download className="w-3.5 h-3.5 text-primary" />
                              <span>Receipt</span>
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* TAB 5: ADMIN CONSOLE */}
        {activeTab === 'admin' && (user?.role === 'ADMIN' || isAdminMode) && (
          <div className="space-y-6">
            {/* KPI top row for Admin Console */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="bg-purple-500/5 border border-purple-500/20">
                <CardHeader className="pb-2">
                  <CardDescription className="text-purple-600 text-xs font-bold uppercase tracking-wider">Total Revenue Managed</CardDescription>
                  <CardTitle className="text-3xl font-extrabold text-purple-700">
                    ${allTransactions
                      .filter(t => (t.type === 'DEPOSIT' || t.type === 'SUBSCRIPTION') && t.status === 'COMPLETED')
                      .reduce((sum, t) => sum + t.amount, 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </CardTitle>
                </CardHeader>
                <div className="px-6 pb-4 flex items-center gap-1.5 text-xs text-purple-600 font-semibold">
                  <TrendingUp className="w-4 h-4" />
                  <span>Cumulative volume across platform</span>
                </div>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription className="text-xs font-bold uppercase tracking-wider">Active Subscription Tiers</CardDescription>
                  <CardTitle className="text-3xl font-extrabold">
                    {allUsers.filter(u => u.subscriptionPlan && u.subscriptionPlan !== 'FREE').length} Users
                  </CardTitle>
                </CardHeader>
                <div className="px-6 pb-4 text-xs text-muted-foreground">
                  Pro / Agency / Business Pro members
                </div>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription className="text-xs font-bold uppercase tracking-wider">Total System Transactions</CardDescription>
                  <CardTitle className="text-3xl font-extrabold text-indigo-600">
                    {allTransactions.length} Txs
                  </CardTitle>
                </CardHeader>
                <div className="px-6 pb-4 text-xs text-muted-foreground">
                  Deposits, releases, refunds, subs
                </div>
              </Card>
            </div>

            {/* Manage subscriptions & transactions list */}
            <Card>
              <CardHeader>
                <CardTitle className="text-purple-700 flex items-center gap-2 font-heading">
                  <ShieldAlert className="w-5 h-5 text-purple-600" />
                  Manage Global Transactions & Refunds
                </CardTitle>
                <CardDescription>System-wide view for platform administrators. Easily process manual overrides or handle user refunds.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {allTransactions.length === 0 ? (
                  <div className="p-12 text-center text-sm text-muted-foreground">
                    No transactions captured in system.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-border bg-accent/20 font-semibold text-muted-foreground">
                          <th className="py-3 px-4">Tx ID</th>
                          <th className="py-3 px-4">User</th>
                          <th className="py-3 px-4">Type</th>
                          <th className="py-3 px-4">Amount</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {allTransactions.map(tx => {
                          const associatedUser = allUsers.find(u => u.id === tx.userId);
                          return (
                            <tr key={tx.id} className="hover:bg-accent/5 transition-colors">
                              <td className="py-3 px-4 font-mono font-bold">{tx.id}</td>
                              <td className="py-3 px-4">
                                <span className="font-semibold block">{associatedUser?.name || 'Unknown User'}</span>
                                <span className="text-muted-foreground text-[10px]">{associatedUser?.email || tx.userId}</span>
                              </td>
                              <td className="py-3 px-4 font-semibold text-purple-600">{tx.type}</td>
                              <td className="py-3 px-4 font-bold text-foreground">${tx.amount.toFixed(2)}</td>
                              <td className="py-3 px-4">
                                <Badge variant={tx.status === 'COMPLETED' ? 'default' : tx.status === 'REFUNDED' ? 'outline' : 'secondary'}>
                                  {tx.status}
                                </Badge>
                              </td>
                              <td className="py-3 px-4 text-right">
                                {tx.status === 'COMPLETED' && (
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="text-red-500 border-red-500/20 hover:bg-red-500/10 text-xs py-0.5 px-2 h-7"
                                    onClick={() => handleAdminRefund(tx)}
                                    disabled={processing}
                                  >
                                    Refund
                                  </Button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* MODAL 1: DEPOSIT MODAL */}
      {showDepositModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }} 
            animate={{ opacity: 1, scale: 1 }} 
            className="bg-card border border-border rounded-xl shadow-xl max-w-md w-full overflow-hidden"
          >
            <div className="p-6 border-b border-border bg-accent/30 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-lg font-heading">Secure Fund Deposit</h3>
                <p className="text-xs text-muted-foreground">Select your gateway to deposit balance.</p>
              </div>
              <button onClick={() => setShowDepositModal(false)} className="text-muted-foreground hover:text-foreground font-semibold">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground">Amount to Deposit (USD)</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input 
                    type="number" 
                    value={depositAmount} 
                    onChange={e => setDepositAmount(e.target.value)} 
                    className="pl-9 text-lg font-bold"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground">Select Payment Gateway</label>
                <div className="grid grid-cols-3 gap-3">
                  {(['stripe', 'paypal', 'razorpay'] as const).map(p => (
                    <button 
                      key={p}
                      onClick={() => setSelectedProvider(p)}
                      className={`p-3 border rounded-lg flex flex-col items-center gap-1.5 transition-all ${
                        selectedProvider === p ? 'border-primary bg-primary/5 font-semibold text-primary' : 'border-border hover:bg-accent/10'
                      }`}
                    >
                      <CreditCard className="w-4 h-4" />
                      <span className="text-[10px] capitalize">{p}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-accent/10 p-3 rounded-lg flex gap-2.5 items-start">
                <ShieldCheck className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
                <p className="text-[11px] text-muted-foreground">Secure payment processed through a tokenized simulator following strict Payment Provider standards.</p>
              </div>

              <Button className="w-full mt-4" onClick={handleDeposit} disabled={processing}>
                {processing ? 'Processing Secure Connection...' : `Deposit $${depositAmount} USD`}
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* MODAL 2: WITHDRAWAL MODAL */}
      {showWithdrawModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }} 
            animate={{ opacity: 1, scale: 1 }} 
            className="bg-card border border-border rounded-xl shadow-xl max-w-md w-full overflow-hidden"
          >
            <div className="p-6 border-b border-border bg-accent/30 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-lg font-heading">Withdraw Earnings</h3>
                <p className="text-xs text-muted-foreground">Safely transfer wallet earnings to your payout account.</p>
              </div>
              <button onClick={() => setShowWithdrawModal(false)} className="text-muted-foreground hover:text-foreground font-semibold">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground">Amount to Payout (USD)</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input 
                    type="number" 
                    value={withdrawAmount} 
                    onChange={e => setWithdrawAmount(e.target.value)} 
                    className="pl-9 text-lg font-bold"
                  />
                </div>
                <p className="text-[10px] text-muted-foreground">Available Wallet balance: ${balance.toFixed(2)}</p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground">Destination Details (Account / PayPal email)</label>
                <Input 
                  placeholder="e.g. payout@example.com or Bank Acc No" 
                  value={withdrawDestination} 
                  onChange={e => setWithdrawDestination(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground">Select Payout Method</label>
                <div className="grid grid-cols-3 gap-3">
                  {(['stripe', 'paypal', 'razorpay'] as const).map(p => (
                    <button 
                      key={p}
                      onClick={() => setSelectedProvider(p)}
                      className={`p-3 border rounded-lg flex flex-col items-center gap-1.5 transition-all ${
                        selectedProvider === p ? 'border-primary bg-primary/5 font-semibold text-primary' : 'border-border hover:bg-accent/10'
                      }`}
                    >
                      <CreditCard className="w-4 h-4" />
                      <span className="text-[10px] capitalize">{p}</span>
                    </button>
                  ))}
                </div>
              </div>

              <Button className="w-full mt-4 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleWithdrawal} disabled={processing}>
                {processing ? 'Processing Payout...' : `Withdraw $${withdrawAmount} USD`}
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* MODAL 3: INVOICE DOWNLOAD RECEIPT MODAL */}
      {showInvoiceModal && (
        <div className="fixed inset-0 bg-background/90 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            className="bg-white text-slate-900 rounded-xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-300 p-8 space-y-6"
            id="print-area"
          >
            {/* Invoice Header */}
            <div className="flex justify-between items-start border-b border-slate-200 pb-6">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-slate-900 font-heading">CLIENTFLOW AI</h2>
                <p className="text-xs text-slate-500 mt-1">Invoice Statement & Receipt</p>
                <p className="text-[10px] text-slate-400 font-mono mt-0.5">https://clientflowai.com</p>
              </div>
              <div className="text-right">
                <Badge variant="outline" className="bg-slate-100 text-slate-800 border-slate-300 font-mono font-bold text-[10px] uppercase">
                  OFFICIAL RECEIPT
                </Badge>
                <p className="text-xs text-slate-500 font-mono mt-2 font-semibold">
                  {showInvoiceModal.invoiceNumber || `INV-${showInvoiceModal.id.slice(-6)}`}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">Date: {new Date(showInvoiceModal.createdAt).toLocaleDateString()}</p>
              </div>
            </div>

            {/* Billed To */}
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="font-semibold block text-slate-400 uppercase tracking-wider text-[10px]">Billed To:</span>
                <span className="font-bold text-sm block mt-1">{user?.name}</span>
                <span className="text-slate-500">{user?.email}</span>
                <span className="text-slate-500 block mt-1">Client ID: {showInvoiceModal.userId}</span>
              </div>
              <div>
                <span className="font-semibold block text-slate-400 uppercase tracking-wider text-[10px]">Payment Details:</span>
                <span className="font-bold block mt-1">{showInvoiceModal.paymentMethod || 'Wallet Balance'}</span>
                <span className="text-slate-500 block">Status: {showInvoiceModal.status}</span>
                <span className="text-slate-500 block mt-1 font-mono text-[10px]">TX REF: {showInvoiceModal.id}</span>
              </div>
            </div>

            {/* Invoice Table / Line Items */}
            <div className="border-t border-b border-slate-200 py-6">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-slate-400 font-bold uppercase tracking-wider text-[9px] border-b border-slate-200 pb-2">
                    <th className="pb-2">Description</th>
                    <th className="pb-2 text-right">Quantity</th>
                    <th className="pb-2 text-right">Unit Price</th>
                    <th className="pb-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="py-3 font-semibold text-slate-800">{showInvoiceModal.description}</td>
                    <td className="py-3 text-right">1</td>
                    <td className="py-3 text-right">${showInvoiceModal.amount.toFixed(2)}</td>
                    <td className="py-3 text-right font-bold">${showInvoiceModal.amount.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Total */}
            <div className="flex justify-end pt-4">
              <div className="w-1/2 text-xs space-y-2">
                <div className="flex justify-between text-slate-500">
                  <span>Subtotal:</span>
                  <span>${showInvoiceModal.amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-500 border-b border-slate-200 pb-2">
                  <span>Tax (0%):</span>
                  <span>$0.00</span>
                </div>
                <div className="flex justify-between font-bold text-slate-900 text-sm pt-1">
                  <span>Total Paid:</span>
                  <span>${showInvoiceModal.amount.toFixed(2)} USD</span>
                </div>
              </div>
            </div>

            {/* Footer Signoff */}
            <div className="border-t border-slate-100 pt-6 text-center text-[10px] text-slate-400 space-y-1">
              <p>Thank you for using ClientFlow AI! For inquiries, please reach out to billing@clientflowai.com.</p>
              <p>Powered by fully certified Escrow & Payment Protection Systems.</p>
            </div>

            {/* Action Buttons (Hide during print) */}
            <div className="flex gap-3 justify-end pt-4 border-t border-slate-200 print:hidden">
              <Button variant="outline" size="sm" className="flex items-center gap-1.5" onClick={handlePrint}>
                <Printer className="w-4 h-4" />
                <span>Print Invoice</span>
              </Button>
              <Button size="sm" className="bg-slate-900 text-white hover:bg-slate-800" onClick={() => setShowInvoiceModal(null)}>
                Close
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
