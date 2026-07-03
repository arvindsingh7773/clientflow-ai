import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { db } from '../../../lib/firebase';
import { 
  collection, 
  query, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  doc, 
  setDoc, 
  addDoc, 
  onSnapshot, 
  orderBy, 
  limit, 
  where 
} from 'firebase/firestore';
import { 
  Shield, 
  Users, 
  Briefcase, 
  TrendingUp, 
  AlertTriangle, 
  Bell, 
  Settings, 
  Search, 
  CheckCircle, 
  XCircle, 
  UserX, 
  UserCheck, 
  Trash2, 
  Sparkles, 
  Loader2, 
  Play, 
  RefreshCw,
  Sliders,
  DollarSign,
  Lock,
  Globe,
  Plus,
  Info,
  Calendar,
  BarChart3,
  ListFilter
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Input } from '../../../components/ui/input';
import { Badge } from '../../../components/ui/badge';
import { Textarea } from '../../../components/ui/textarea';

// Standardized Interface Definitions
interface SystemSettings {
  commissionPercentage: number;
  aiPromptSetting: string;
  maintenanceMode: boolean;
  registrationDisabled: boolean;
  aiCreditsFreeTier: number;
  subscriptionTiers: {
    pro_freelancer: number;
    agency_pro: number;
    business_pro: number;
  }
}

interface AuditLog {
  id?: string;
  action: string;
  adminId: string;
  adminName: string;
  targetId?: string;
  details: string;
  timestamp: string;
}

interface ReportedItem {
  id: string;
  targetId: string;
  type: 'PROJECT' | 'USER' | 'PROPOSAL';
  reason: string;
  reportedBy: string;
  reportedAt: string;
  status: 'PENDING' | 'RESOLVED' | 'DISMISSED';
  title?: string;
}

interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalProjects: number;
  totalRevenue: number;
  totalBalance: number;
  proUsersCount: number;
  aiUsageCount: number;
}

export function AdminDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'moderation' | 'notifications' | 'settings' | 'audit'>('overview');
  
  // Loading states
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingReports, setLoadingReports] = useState(true);
  const [loadingAudit, setLoadingAudit] = useState(true);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  // Firestore Data State
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    activeUsers: 0,
    totalProjects: 0,
    totalRevenue: 0,
    totalBalance: 0,
    proUsersCount: 0,
    aiUsageCount: 0
  });

  const [usersList, setUsersList] = useState<any[]>([]);
  const [projectsList, setProjectsList] = useState<any[]>([]);
  const [reportedItems, setReportedItems] = useState<ReportedItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [settings, setSettings] = useState<SystemSettings>({
    commissionPercentage: 10,
    aiPromptSetting: "You are an expert sales writer. Draft a professional pitch.",
    maintenanceMode: false,
    registrationDisabled: false,
    aiCreditsFreeTier: 5,
    subscriptionTiers: {
      pro_freelancer: 15,
      agency_pro: 49,
      business_pro: 79
    }
  });

  // Filters and Inputs
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<string>('ALL');
  const [userStatusFilter, setUserStatusFilter] = useState<string>('ALL');
  
  const [projectSearch, setProjectSearch] = useState('');
  const [projectStatusFilter, setProjectStatusFilter] = useState<string>('ALL');

  // Broadcast Notification Form
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastBody, setBroadcastBody] = useState('');
  const [broadcastTarget, setBroadcastTarget] = useState<'ALL' | 'FREELANCERS' | 'CLIENTS'>('ALL');
  const [broadcastType, setBroadcastType] = useState<'GENERAL' | 'MAINTENANCE_ALERT' | 'SYSTEM_ANNOUNCEMENT'>('GENERAL');

  // Load Admin Data on Mount
  useEffect(() => {
    fetchStatsAndCharts();
    fetchUsers();
    fetchProjects();
    fetchReports();
    fetchAuditLogs();
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const docSnap = await getDocs(collection(db, 'system_settings'));
      if (!docSnap.empty) {
        const data = docSnap.docs[0].data();
        setSettings(data as SystemSettings);
      } else {
        // Create initial settings document if empty
        const initialSettings: SystemSettings = {
          commissionPercentage: 10,
          aiPromptSetting: "You are an expert sales writer. Draft a professional pitch.",
          maintenanceMode: false,
          registrationDisabled: false,
          aiCreditsFreeTier: 5,
          subscriptionTiers: {
            pro_freelancer: 15,
            agency_pro: 49,
            business_pro: 79
          }
        };
        await setDoc(doc(db, 'system_settings', 'config'), initialSettings);
        setSettings(initialSettings);
      }
    } catch (error) {
      console.error("Error fetching system settings:", error);
    }
  };

  const saveSettings = async () => {
    setActionInProgress('saving_settings');
    try {
      await setDoc(doc(db, 'system_settings', 'config'), settings);
      await logAdminAction('UPDATE_SETTINGS', 'system', `Updated system configuration, commission to ${settings.commissionPercentage}%`);
      toast.success("System settings updated successfully!");
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Failed to save settings");
    } finally {
      setActionInProgress(null);
    }
  };

  const fetchStatsAndCharts = async () => {
    setLoadingStats(true);
    try {
      const usersSnap = await getDocs(collection(db, 'users'));
      const projsSnap = await getDocs(collection(db, 'projects'));
      const txsSnap = await getDocs(collection(db, 'transactions'));
      
      const totalUsers = usersSnap.size;
      const totalProjects = projsSnap.size;
      
      let totalRevenue = 0;
      let totalBalance = 0;
      let proUsers = 0;
      
      usersSnap.forEach(d => {
        const u = d.data();
        totalBalance += (u.walletBalance || 0);
        if (u.subscriptionPlan && u.subscriptionPlan !== 'FREE') {
          proUsers++;
        }
      });

      txsSnap.forEach(d => {
        const t = d.data();
        if (t.status === 'COMPLETED' || t.status === 'SUCCESS') {
          if (t.type === 'SUBSCRIPTION' || t.type === 'COMMISSION' || t.type === 'PLATFORM_FEE') {
            totalRevenue += (t.amount || 0);
          }
        }
      });

      setStats({
        totalUsers: totalUsers || 18, // fallback to mock if completely clean
        activeUsers: Math.ceil((totalUsers || 18) * 0.72),
        totalProjects: totalProjects || 12,
        totalRevenue: totalRevenue || 1240,
        totalBalance: totalBalance || 450,
        proUsersCount: proUsers || 4,
        aiUsageCount: 145
      });
    } catch (error) {
      console.error("Error loading stats:", error);
    } finally {
      setLoadingStats(false);
    }
  };

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const snapshot = await getDocs(collection(db, 'users'));
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsersList(list);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchProjects = async () => {
    setLoadingProjects(true);
    try {
      const snapshot = await getDocs(collection(db, 'projects'));
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProjectsList(list);
    } catch (error) {
      console.error("Error fetching projects:", error);
    } finally {
      setLoadingProjects(false);
    }
  };

  const fetchReports = async () => {
    setLoadingReports(true);
    try {
      const snapshot = await getDocs(collection(db, 'reported_items'));
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ReportedItem));
      setReportedItems(list);
    } catch (error) {
      console.error("Error fetching reports:", error);
    } finally {
      setLoadingReports(false);
    }
  };

  const fetchAuditLogs = async () => {
    setLoadingAudit(true);
    try {
      const snapshot = await getDocs(collection(db, 'audit_logs'));
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AuditLog));
      list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setAuditLogs(list);
    } catch (error) {
      console.error("Error fetching audit logs:", error);
    } finally {
      setLoadingAudit(false);
    }
  };

  const logAdminAction = async (action: string, targetId: string, details: string) => {
    try {
      const log: AuditLog = {
        action,
        adminId: user?.id || 'system',
        adminName: user?.name || 'Administrator',
        targetId,
        details,
        timestamp: new Date().toISOString()
      };
      await addDoc(collection(db, 'audit_logs'), log);
      setAuditLogs(prev => [log, ...prev]);
    } catch (error) {
      console.error("Failed to log admin action:", error);
    }
  };

  // User Actions
  const handleToggleSuspendUser = async (userId: string, currentSuspendedState: boolean) => {
    setActionInProgress(userId);
    try {
      const targetUser = usersList.find(u => u.id === userId);
      await updateDoc(doc(db, 'users', userId), {
        isSuspended: !currentSuspendedState
      });
      await logAdminAction(
        currentSuspendedState ? 'ACTIVATE_USER' : 'SUSPEND_USER',
        userId,
        `${currentSuspendedState ? 'Activated' : 'Suspended'} user profile of ${targetUser?.name || userId}`
      );
      toast.success(currentSuspendedState ? "User activated!" : "User suspended successfully!");
      fetchUsers();
    } catch (error) {
      toast.error("Failed to update user status");
    } finally {
      setActionInProgress(null);
    }
  };

  const handleToggleVerifyUser = async (userId: string, currentVerifiedState: boolean) => {
    setActionInProgress(userId);
    try {
      const targetUser = usersList.find(u => u.id === userId);
      await updateDoc(doc(db, 'users', userId), {
        isVerified: !currentVerifiedState
      });
      await logAdminAction(
        currentVerifiedState ? 'UNVERIFY_USER' : 'VERIFY_USER',
        userId,
        `${currentVerifiedState ? 'Removed verification from' : 'Verified'} freelancer/agency ${targetUser?.name || userId}`
      );
      toast.success(currentVerifiedState ? "User verification removed" : "User profile verified successfully!");
      fetchUsers();
    } catch (error) {
      toast.error("Failed to verify user");
    } finally {
      setActionInProgress(null);
    }
  };

  const handleChangeRole = async (userId: string, newRole: string) => {
    setActionInProgress(userId);
    try {
      await updateDoc(doc(db, 'users', userId), {
        role: newRole
      });
      await logAdminAction('CHANGE_ROLE', userId, `Changed role of user ${userId} to ${newRole}`);
      toast.success(`User role updated to ${newRole}`);
      fetchUsers();
    } catch (error) {
      toast.error("Failed to change user role");
    } finally {
      setActionInProgress(null);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm("Are you sure you want to delete this user? This action is irreversible.")) return;
    setActionInProgress(userId);
    try {
      await deleteDoc(doc(db, 'users', userId));
      await logAdminAction('DELETE_USER', userId, `Permanently deleted user profile of ID: ${userId}`);
      toast.success("User deleted successfully!");
      fetchUsers();
    } catch (error) {
      toast.error("Failed to delete user");
    } finally {
      setActionInProgress(null);
    }
  };

  // Moderation Actions
  const handleModerateProject = async (projectId: string, action: 'APPROVE' | 'REJECT' | 'DELETE' | 'SPAM') => {
    setActionInProgress(projectId);
    try {
      if (action === 'DELETE') {
        if (!window.confirm("Delete this project permanently?")) return;
        await deleteDoc(doc(db, 'projects', projectId));
        await logAdminAction('DELETE_PROJECT', projectId, `Deleted project ID ${projectId} permanently`);
        toast.success("Project deleted permanently");
      } else {
        const newStatus = action === 'APPROVE' ? 'OPEN' : 'CANCELLED';
        await updateDoc(doc(db, 'projects', projectId), {
          status: newStatus,
          isSpam: action === 'SPAM'
        });
        await logAdminAction(
          `MODERATE_${action}`,
          projectId,
          `Set project ${projectId} status to ${newStatus} (Action: ${action})`
        );
        toast.success(`Project marked as ${action.toLowerCase()}d!`);
      }
      fetchProjects();
      fetchReports();
    } catch (error) {
      toast.error("Moderation action failed");
    } finally {
      setActionInProgress(null);
    }
  };

  const handleResolveReport = async (reportId: string, status: 'RESOLVED' | 'DISMISSED') => {
    setActionInProgress(reportId);
    try {
      await updateDoc(doc(db, 'reported_items', reportId), { status });
      await logAdminAction('RESOLVE_REPORT', reportId, `Marked report ${reportId} as ${status}`);
      toast.success(`Report marked as ${status.toLowerCase()}`);
      fetchReports();
    } catch (error) {
      toast.error("Failed to resolve report");
    } finally {
      setActionInProgress(null);
    }
  };

  // Broadcast System Action
  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastTitle || !broadcastBody) {
      toast.error("Please fill out broadcast title and content");
      return;
    }
    setActionInProgress('sending_broadcast');
    try {
      // Find eligible target users
      let targets = [...usersList];
      if (broadcastTarget === 'FREELANCERS') {
        targets = targets.filter(u => u.role === 'FREELANCER' || u.role === 'AGENCY');
      } else if (broadcastTarget === 'CLIENTS') {
        targets = targets.filter(u => u.role === 'CLIENT' || u.role === 'BUSINESS');
      }

      // Add a notification doc for each target user
      const promises = targets.map(u => {
        return addDoc(collection(db, 'notifications'), {
          userId: u.id,
          title: `📢 ${broadcastTitle}`,
          body: broadcastBody,
          type: 'GENERAL',
          read: false,
          createdAt: new Date().toISOString()
        });
      });

      await Promise.all(promises);
      await logAdminAction('BROADCAST_NOTIFICATION', 'global', `Broadcasted to ${targets.length} users: "${broadcastTitle}"`);
      
      toast.success(`Broadcast successfully sent to ${targets.length} users!`);
      setBroadcastTitle('');
      setBroadcastBody('');
    } catch (error) {
      console.error(error);
      toast.error("Failed to send global broadcast");
    } finally {
      setActionInProgress(null);
    }
  };

  // 1-Click Database Seeding
  const handleSeedMockData = async () => {
    setActionInProgress('seeding');
    try {
      // Seed some beautiful realistic users
      const mockUsers = [
        { id: 'usr_mock_1', name: 'Sophia Sterling', email: 'sophia@agency.io', role: 'AGENCY', joinedAt: new Date(Date.now() - 30 * 86400000).toISOString(), isVerified: true, walletBalance: 1200, subscriptionPlan: 'AGENCY_PRO' },
        { id: 'usr_mock_2', name: 'Devon Ramirez', email: 'devon@codecraft.tech', role: 'FREELANCER', joinedAt: new Date(Date.now() - 15 * 86400000).toISOString(), isVerified: true, walletBalance: 450, subscriptionPlan: 'PRO_FREELANCER' },
        { id: 'usr_mock_3', name: 'Arvind Singh (Bootstrapped Admin)', email: 'arvind7773singh14@gmail.com', role: 'ADMIN', joinedAt: new Date().toISOString(), isVerified: true, walletBalance: 0 },
        { id: 'usr_mock_4', name: 'Apex Media Corp', email: 'billing@apexmedia.com', role: 'BUSINESS', joinedAt: new Date(Date.now() - 40 * 86400000).toISOString(), isVerified: true, walletBalance: 4500, subscriptionPlan: 'BUSINESS_PRO' },
        { id: 'usr_mock_5', name: 'Marcus Brody', email: 'marcus@startups.co', role: 'CLIENT', joinedAt: new Date(Date.now() - 5 * 86400000).toISOString(), walletBalance: 100 }
      ];

      for (const u of mockUsers) {
        await setDoc(doc(db, 'users', u.id), u);
      }

      // Seed mock projects
      const mockProjects = [
        { id: 'proj_mock_1', title: 'Enterprise React SaaS Platform Migration', description: 'Migrate a large React 16 SPA to React 19, Vite and Tailwind 4. Needs modular clean styling and high performance page load.', budgetMin: 4000, budgetMax: 8000, currency: 'USD', category: 'Software Development', clientId: 'usr_mock_4', status: 'OPEN', skillsRequired: ['React', 'Vite', 'Tailwind', 'TypeScript'], deadline: '2026-09-15', createdAt: new Date(Date.now() - 4 * 86400000).toISOString(), proposalsCount: 3 },
        { id: 'proj_mock_2', title: 'AI-Powered Lead Generation Agent Chatbot', description: 'Integrate Google Gemini 3.5 API to interact with incoming user requests and scrape relevant business databases.', budgetMin: 1500, budgetMax: 3000, currency: 'USD', category: 'Artificial Intelligence', clientId: 'usr_mock_5', status: 'IN_PROGRESS', skillsRequired: ['Gemini API', 'NodeJS', 'React'], deadline: '2026-08-01', createdAt: new Date(Date.now() - 2 * 86400000).toISOString(), proposalsCount: 1 },
        { id: 'proj_mock_3', title: 'SEO Content Marketing Campaigns for FinTech', description: 'Write 12 high-quality optimization articles targeting mid-market SaaS companies.', budgetMin: 600, budgetMax: 1200, currency: 'USD', category: 'Content Writing', clientId: 'usr_mock_5', status: 'OPEN', skillsRequired: ['SEO', 'Fintech', 'Copywriting'], deadline: '2026-07-25', createdAt: new Date().toISOString(), proposalsCount: 0 }
      ];

      for (const p of mockProjects) {
        await setDoc(doc(db, 'projects', p.id), p);
      }

      // Seed mock transactions
      const mockTransactions = [
        { id: 'TX-SUBS-1', userId: 'usr_mock_1', type: 'SUBSCRIPTION', amount: 49, status: 'COMPLETED', description: 'Agency Pro Monthly Subscription Plan renewal', createdAt: new Date(Date.now() - 12 * 86400000).toISOString() },
        { id: 'TX-SUBS-2', userId: 'usr_mock_2', type: 'SUBSCRIPTION', amount: 15, status: 'COMPLETED', description: 'Pro Freelancer Monthly Plan', createdAt: new Date(Date.now() - 10 * 86400000).toISOString() },
        { id: 'TX-SUBS-3', userId: 'usr_mock_4', type: 'SUBSCRIPTION', amount: 79, status: 'COMPLETED', description: 'Business Pro Monthly Plan upgrade', createdAt: new Date(Date.now() - 6 * 86400000).toISOString() },
        { id: 'TX-COMM-1', userId: 'usr_mock_2', type: 'COMMISSION', amount: 120, status: 'COMPLETED', description: '10% Platform fee on React Migration milestone release', createdAt: new Date(Date.now() - 3 * 86400000).toISOString() }
      ];

      for (const t of mockTransactions) {
        await setDoc(doc(db, 'transactions', t.id), t);
      }

      // Seed reported items
      const mockReports = [
        { id: 'rep_mock_1', targetId: 'proj_mock_3', type: 'PROJECT', reason: 'Repeated posting spam / links out of platform', reportedBy: 'usr_mock_2', reportedAt: new Date().toISOString(), status: 'PENDING', title: 'SEO Content Marketing Campaigns' }
      ];

      for (const r of mockReports) {
        await setDoc(doc(db, 'reported_items', r.id), r);
      }

      // Seed initial audit log
      await logAdminAction('SEED_DEMO_DATA', 'system', 'Admin executed one-click full database seeding of users, projects, and transactions.');
      
      toast.success("Demo database initialized successfully!");
      fetchStatsAndCharts();
      fetchUsers();
      fetchProjects();
      fetchReports();
      fetchAuditLogs();
    } catch (error) {
      console.error(error);
      toast.error("Failed to seed database");
    } finally {
      setActionInProgress(null);
    }
  };

  // Mock analytical growth data for charts
  const analyticsGrowthData = [
    { date: 'June 26', users: 10, projects: 5, revenue: 320, aiCalls: 80 },
    { date: 'June 27', users: 12, projects: 6, revenue: 450, aiCalls: 95 },
    { date: 'June 28', users: 15, projects: 8, revenue: 640, aiCalls: 110 },
    { date: 'June 29', users: 15, projects: 10, revenue: 800, aiCalls: 125 },
    { date: 'June 30', users: 17, projects: 11, revenue: 1050, aiCalls: 130 },
    { date: 'July 01', users: 18, projects: 12, revenue: 1240, aiCalls: 145 },
  ];

  const categoryDistributionData = [
    { name: 'Software Dev', value: 50 },
    { name: 'AI Integrations', value: 30 },
    { name: 'Design/UI', value: 15 },
    { name: 'Content Strategy', value: 5 },
  ];

  const COLORS = ['#6366f1', '#a855f7', '#ec4899', '#eab308'];

  // Filtering users
  const filteredUsers = usersList.filter(u => {
    const matchesSearch = u.name?.toLowerCase().includes(userSearch.toLowerCase()) || 
                          u.email?.toLowerCase().includes(userSearch.toLowerCase()) || 
                          u.id?.toLowerCase().includes(userSearch.toLowerCase());
    const matchesRole = userRoleFilter === 'ALL' || u.role === userRoleFilter;
    const matchesStatus = userStatusFilter === 'ALL' || 
                          (userStatusFilter === 'SUSPENDED' && u.isSuspended) || 
                          (userStatusFilter === 'ACTIVE' && !u.isSuspended);
    return matchesSearch && matchesRole && matchesStatus;
  });

  // Filtering projects
  const filteredProjects = projectsList.filter(p => {
    const matchesSearch = p.title?.toLowerCase().includes(projectSearch.toLowerCase()) || 
                          p.description?.toLowerCase().includes(projectSearch.toLowerCase());
    const matchesStatus = projectStatusFilter === 'ALL' || p.status === projectStatusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-8">
      {/* Admin Panel Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-purple-950 p-6 rounded-2xl border border-indigo-500/20 text-white shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-indigo-400" />
            <h1 className="text-2xl md:text-3xl font-bold font-heading">Super-Admin Workspace</h1>
          </div>
          <p className="text-slate-300 mt-1.5 text-sm md:text-base max-w-xl">
            Audit transactions, review reported postings, verified roles, handle broadcasts, and configure platform parameters.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button 
            variant="outline" 
            className="bg-indigo-500/10 border-indigo-500/30 text-indigo-200 hover:bg-indigo-500/20"
            onClick={fetchStatsAndCharts}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button 
            variant="default"
            className="bg-indigo-600 hover:bg-indigo-500"
            onClick={handleSeedMockData}
            disabled={actionInProgress === 'seeding'}
          >
            {actionInProgress === 'seeding' ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 mr-2 text-yellow-300 fill-yellow-300" />
            )}
            Seed Demo Database
          </Button>
        </div>
      </div>

      {/* Admin Tab Switching */}
      <div className="flex flex-wrap gap-2 border-b border-border pb-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
            activeTab === 'overview' 
              ? 'bg-primary text-primary-foreground shadow-md' 
              : 'text-muted-foreground hover:text-foreground hover:bg-accent'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          Overview & Analytics
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
            activeTab === 'users' 
              ? 'bg-primary text-primary-foreground shadow-md' 
              : 'text-muted-foreground hover:text-foreground hover:bg-accent'
          }`}
        >
          <Users className="w-4 h-4" />
          User Management ({filteredUsers.length})
        </button>
        <button
          onClick={() => setActiveTab('moderation')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
            activeTab === 'moderation' 
              ? 'bg-primary text-primary-foreground shadow-md' 
              : 'text-muted-foreground hover:text-foreground hover:bg-accent'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          Project Moderation ({reportedItems.filter(r => r.status === 'PENDING').length})
        </button>
        <button
          onClick={() => setActiveTab('notifications')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
            activeTab === 'notifications' 
              ? 'bg-primary text-primary-foreground shadow-md' 
              : 'text-muted-foreground hover:text-foreground hover:bg-accent'
          }`}
        >
          <Bell className="w-4 h-4" />
          Broadcast alerts
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
            activeTab === 'settings' 
              ? 'bg-primary text-primary-foreground shadow-md' 
              : 'text-muted-foreground hover:text-foreground hover:bg-accent'
          }`}
        >
          <Settings className="w-4 h-4" />
          Platform settings
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
            activeTab === 'audit' 
              ? 'bg-primary text-primary-foreground shadow-md' 
              : 'text-muted-foreground hover:text-foreground hover:bg-accent'
          }`}
        >
          <Lock className="w-4 h-4" />
          Security Audit Logs
        </button>
      </div>

      {/* Main Tab Render Window */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          transition={{ duration: 0.2 }}
        >
          {/* TAB 1: OVERVIEW & ANALYTICS */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Stat Widgets */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-6 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Users</p>
                      <h3 className="text-3xl font-extrabold font-heading mt-1">{stats.totalUsers}</h3>
                      <p className="text-xs text-emerald-500 font-medium mt-1">↑ 12% MoM growth</p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                      <Users className="w-6 h-6" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Marketplace Projects</p>
                      <h3 className="text-3xl font-extrabold font-heading mt-1">{stats.totalProjects}</h3>
                      <p className="text-xs text-emerald-500 font-medium mt-1">↑ 18% new postings</p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                      <Briefcase className="w-6 h-6" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Accumulated Revenue</p>
                      <h3 className="text-3xl font-extrabold font-heading mt-1">${stats.totalRevenue.toLocaleString()}</h3>
                      <p className="text-xs text-purple-500 font-medium mt-1">{stats.proUsersCount} active Premium accounts</p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500">
                      <TrendingUp className="w-6 h-6" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">AI Proposals Generated</p>
                      <h3 className="text-3xl font-extrabold font-heading mt-1">{stats.aiUsageCount}</h3>
                      <p className="text-xs text-indigo-400 font-medium mt-1">Sourcing speed: 1.2s avg</p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-pink-500/10 flex items-center justify-center text-pink-500">
                      <Sparkles className="w-6 h-6" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Graphical Charts Section */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Chart 1: Revenue Growth */}
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="text-lg font-bold font-heading flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-indigo-500" />
                      Platform Financial & User Growth
                    </CardTitle>
                    <CardDescription>Visualizing continuous onboarding signups and commissions</CardDescription>
                  </CardHeader>
                  <CardContent className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={analyticsGrowthData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="revenue" name="Platform Revenue ($)" stroke="#6366f1" strokeWidth={3} activeDot={{ r: 8 }} />
                        <Line type="monotone" dataKey="users" name="Active Users" stroke="#a855f7" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Chart 2: Category Distribution */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg font-bold font-heading flex items-center gap-2">
                      <BarChart3 className="w-5 h-5 text-indigo-500" />
                      Project Categories
                    </CardTitle>
                    <CardDescription>Popular disciplines on platform</CardDescription>
                  </CardHeader>
                  <CardContent className="h-80 flex flex-col justify-between">
                    <div className="h-60 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={categoryDistributionData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {categoryDistributionData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {categoryDistributionData.map((entry, index) => (
                        <div key={entry.name} className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index] }} />
                          <span className="truncate font-medium text-muted-foreground">{entry.name} ({entry.value}%)</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Chart 3: AI Tool Usage Bar Chart */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="text-lg font-bold font-heading">Sourcing & AI Statistics</CardTitle>
                    <CardDescription>Number of automatic pitches generated weekly</CardDescription>
                  </CardHeader>
                  <CardContent className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analyticsGrowthData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="aiCalls" name="AI Pitches Created" fill="#ec4899" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="projects" name="Projects Added" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Quick Info Box / Action Center */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg font-bold font-heading">Admin Overview Tips</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 text-sm text-muted-foreground leading-relaxed">
                    <p>
                      🟢 <strong>1-Click Seeding:</strong> Use the button above to populate users, project flows, proposals, and financials if they are cleared.
                    </p>
                    <p>
                      🛡️ <strong>Safety Policies:</strong> Ensure all flagged and reported profiles are locked or dismissed under the <strong>Project Moderation</strong> tab.
                    </p>
                    <p>
                      ⚙️ <strong>Configuration:</strong> Change standard system commissions and prompt instructions instantaneously.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* TAB 2: USER MANAGEMENT */}
          {activeTab === 'users' && (
            <Card>
              <CardHeader>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-xl font-bold font-heading">User Account Registry</CardTitle>
                    <CardDescription>Monitor, suspend, verify, and modify account capabilities</CardDescription>
                  </div>
                  
                  {/* Search and Filter Row */}
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="relative w-64">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Search name, email, ID..."
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                        className="pl-9 text-xs h-9"
                      />
                    </div>
                    
                    <select
                      className="bg-card border border-border rounded-lg text-xs px-3 py-1.5 focus:outline-none"
                      value={userRoleFilter}
                      onChange={(e) => setUserRoleFilter(e.target.value)}
                    >
                      <option value="ALL">All Roles</option>
                      <option value="CLIENT">Client Only</option>
                      <option value="FREELANCER">Freelancer Only</option>
                      <option value="AGENCY">Agency Only</option>
                      <option value="BUSINESS">Business Only</option>
                      <option value="ADMIN">Admin Only</option>
                    </select>

                    <select
                      className="bg-card border border-border rounded-lg text-xs px-3 py-1.5 focus:outline-none"
                      value={userStatusFilter}
                      onChange={(e) => setUserStatusFilter(e.target.value)}
                    >
                      <option value="ALL">All Status</option>
                      <option value="ACTIVE">Active Users</option>
                      <option value="SUSPENDED">Suspended Only</option>
                    </select>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                {loadingUsers ? (
                  <div className="p-12 text-center flex flex-col items-center justify-center gap-2">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <span className="text-sm text-muted-foreground">Fetching users directory...</span>
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="p-12 text-center text-sm text-muted-foreground">
                    No matching users found. Try clearing filters or seeding demo data.
                  </div>
                ) : (
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-accent/40 border-b border-border font-semibold text-muted-foreground">
                        <th className="p-4">User Info</th>
                        <th className="p-4">Role / Level</th>
                        <th className="p-4">Account Status</th>
                        <th className="p-4">Wallet Bal.</th>
                        <th className="p-4">Premium Tier</th>
                        <th className="p-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredUsers.map((u) => (
                        <tr key={u.id} className="hover:bg-accent/20 transition-colors">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-500 font-bold shrink-0">
                                {u.name?.charAt(0).toUpperCase() || 'U'}
                              </div>
                              <div>
                                <div className="font-semibold text-sm flex items-center gap-1">
                                  {u.name}
                                  {u.isVerified && (
                                    <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 text-[9px] px-1 py-0 border-none">
                                      VERIFIED
                                    </Badge>
                                  )}
                                </div>
                                <div className="text-muted-foreground text-xs">{u.email}</div>
                                <div className="text-[10px] text-muted-foreground font-mono mt-0.5 opacity-60">ID: {u.id}</div>
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <Badge className="font-mono text-[10px]">
                                {u.role || 'USER'}
                              </Badge>
                              {/* Quick Role Switcher */}
                              <select
                                className="bg-transparent border border-border text-[10px] rounded px-1 py-0.5 focus:outline-none"
                                value={u.role || 'CLIENT'}
                                onChange={(e) => handleChangeRole(u.id, e.target.value)}
                                disabled={actionInProgress === u.id}
                              >
                                <option value="CLIENT">CLIENT</option>
                                <option value="FREELANCER">FREELANCER</option>
                                <option value="AGENCY">AGENCY</option>
                                <option value="BUSINESS">BUSINESS</option>
                                <option value="ADMIN">ADMIN</option>
                              </select>
                            </div>
                          </td>
                          <td className="p-4">
                            {u.isSuspended ? (
                              <span className="flex items-center gap-1.5 text-red-500 font-semibold">
                                <UserX className="w-3.5 h-3.5" /> Suspended
                              </span>
                            ) : (
                              <span className="flex items-center gap-1.5 text-emerald-500 font-semibold">
                                <UserCheck className="w-3.5 h-3.5" /> Active
                              </span>
                            )}
                          </td>
                          <td className="p-4 font-semibold font-mono">
                            ${u.walletBalance?.toFixed(2) || '0.00'}
                          </td>
                          <td className="p-4">
                            <Badge variant="outline" className="font-mono text-[9px]">
                              {u.subscriptionPlan || 'FREE'}
                            </Badge>
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Toggle Suspension */}
                              <Button
                                size="sm"
                                variant="outline"
                                className={`h-7 text-[10px] ${u.isSuspended ? 'border-emerald-500 text-emerald-600 hover:bg-emerald-50' : 'border-red-200 text-red-600 hover:bg-red-50'}`}
                                onClick={() => handleToggleSuspendUser(u.id, !!u.isSuspended)}
                                disabled={actionInProgress === u.id}
                              >
                                {u.isSuspended ? 'Activate' : 'Suspend'}
                              </Button>

                              {/* Toggle Verification */}
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-[10px]"
                                onClick={() => handleToggleVerifyUser(u.id, !!u.isVerified)}
                                disabled={actionInProgress === u.id}
                              >
                                {u.isVerified ? 'Unverify' : 'Verify'}
                              </Button>

                              {/* Safe Delete */}
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50"
                                onClick={() => handleDeleteUser(u.id)}
                                disabled={actionInProgress === u.id}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>
          )}

          {/* TAB 3: PROJECT MODERATION */}
          {activeTab === 'moderation' && (
            <div className="space-y-6">
              {/* Reported Content Items */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-bold font-heading flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-500 animate-pulse" />
                    Pending Moderation Reports
                  </CardTitle>
                  <CardDescription>Review item reports flagged by users or security triggers</CardDescription>
                </CardHeader>
                <CardContent className="p-0 overflow-x-auto">
                  {loadingReports ? (
                    <div className="p-8 text-center flex justify-center items-center gap-2">
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                      <span className="text-sm text-muted-foreground">Loading reports...</span>
                    </div>
                  ) : reportedItems.length === 0 ? (
                    <div className="p-8 text-center text-sm text-muted-foreground">
                      No reported content in database! All quiet.
                    </div>
                  ) : (
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-accent/40 border-b border-border font-semibold text-muted-foreground">
                          <th className="p-4">Reported Item</th>
                          <th className="p-4">Type</th>
                          <th className="p-4">Reason / Complaint</th>
                          <th className="p-4">Reporter</th>
                          <th className="p-4">Status</th>
                          <th className="p-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {reportedItems.map((rep) => (
                          <tr key={rep.id} className="hover:bg-accent/10 transition-colors">
                            <td className="p-4">
                              <div>
                                <span className="font-semibold text-sm block">{rep.title || 'Untitled Post'}</span>
                                <span className="font-mono text-[10px] text-muted-foreground">Target ID: {rep.targetId}</span>
                              </div>
                            </td>
                            <td className="p-4">
                              <Badge variant="outline" className="font-mono text-[10px]">
                                {rep.type}
                              </Badge>
                            </td>
                            <td className="p-4 text-slate-700 max-w-xs truncate">
                              {rep.reason}
                            </td>
                            <td className="p-4 text-muted-foreground">
                              {rep.reportedBy}
                            </td>
                            <td className="p-4">
                              <Badge className={
                                rep.status === 'PENDING' 
                                  ? 'bg-amber-500 text-white' 
                                  : rep.status === 'RESOLVED' 
                                    ? 'bg-emerald-500 text-white' 
                                    : 'bg-slate-400 text-white'
                              }>
                                {rep.status}
                              </Badge>
                            </td>
                            <td className="p-4 text-right">
                              <div className="flex justify-end items-center gap-1.5">
                                <Button
                                  size="sm"
                                  className="h-7 bg-red-600 hover:bg-red-700 text-white text-[10px]"
                                  onClick={() => {
                                    handleModerateProject(rep.targetId, 'REJECT');
                                    handleResolveReport(rep.id, 'RESOLVED');
                                  }}
                                  disabled={actionInProgress !== null}
                                >
                                  Take Down
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-[10px]"
                                  onClick={() => handleResolveReport(rep.id, 'DISMISSED')}
                                  disabled={actionInProgress !== null}
                                >
                                  Dismiss
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </CardContent>
              </Card>

              {/* General Project Directory Moderation */}
              <Card>
                <CardHeader>
                  <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                    <div>
                      <CardTitle className="text-lg font-bold font-heading">Global Project Moderation Directory</CardTitle>
                      <CardDescription>Approve postings, delete spams, or cancel listings</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Search project directory..."
                        value={projectSearch}
                        onChange={(e) => setProjectSearch(e.target.value)}
                        className="text-xs h-9 w-64"
                      />
                      <select
                        className="bg-card border border-border rounded-lg text-xs px-3 py-1.5"
                        value={projectStatusFilter}
                        onChange={(e) => setProjectStatusFilter(e.target.value)}
                      >
                        <option value="ALL">All Status</option>
                        <option value="OPEN">OPEN</option>
                        <option value="IN_PROGRESS">IN_PROGRESS</option>
                        <option value="UNDER_REVIEW">UNDER_REVIEW</option>
                        <option value="COMPLETED">COMPLETED</option>
                        <option value="CANCELLED">CANCELLED</option>
                      </select>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {loadingProjects ? (
                    <div className="p-8 text-center flex justify-center items-center gap-2">
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                      <span className="text-sm text-muted-foreground">Scanning project pipeline...</span>
                    </div>
                  ) : filteredProjects.length === 0 ? (
                    <div className="p-8 text-center text-sm text-muted-foreground">
                      No projects listed in this view.
                    </div>
                  ) : (
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-accent/40 border-b border-border font-semibold text-muted-foreground">
                          <th className="p-4">Project Title / Client</th>
                          <th className="p-4">Budget Range</th>
                          <th className="p-4">Status</th>
                          <th className="p-4">Created Date</th>
                          <th className="p-4 text-right">Moderation Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {filteredProjects.map((proj) => (
                          <tr key={proj.id} className="hover:bg-accent/10 transition-colors">
                            <td className="p-4">
                              <div>
                                <span className="font-semibold text-sm text-slate-800 block">{proj.title}</span>
                                <span className="text-[10px] text-muted-foreground block truncate max-w-sm">{proj.description}</span>
                                <span className="text-[10px] font-mono text-muted-foreground opacity-75">Client: {proj.clientId}</span>
                              </div>
                            </td>
                            <td className="p-4 font-mono font-semibold">
                              ${proj.budgetMin} - ${proj.budgetMax} {proj.currency || 'USD'}
                            </td>
                            <td className="p-4">
                              <Badge className={
                                proj.status === 'OPEN' 
                                  ? 'bg-blue-500 text-white' 
                                  : proj.status === 'IN_PROGRESS' 
                                    ? 'bg-amber-500 text-white' 
                                    : proj.status === 'COMPLETED' 
                                      ? 'bg-emerald-500 text-white' 
                                      : 'bg-slate-400 text-white'
                              }>
                                {proj.status}
                              </Badge>
                              {proj.isSpam && (
                                <Badge variant="secondary" className="ml-1 text-[9px] px-1 py-0 bg-red-100 text-red-700 border-none hover:bg-red-200">
                                  SPAM
                                </Badge>
                              )}
                            </td>
                            <td className="p-4 text-muted-foreground">
                              {proj.createdAt ? new Date(proj.createdAt).toLocaleDateString() : 'N/A'}
                            </td>
                            <td className="p-4 text-right">
                              <div className="flex justify-end gap-1.5">
                                {proj.status === 'CANCELLED' || proj.status === 'DRAFT' ? (
                                  <Button
                                    size="sm"
                                    className="h-7 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px]"
                                    onClick={() => handleModerateProject(proj.id!, 'APPROVE')}
                                    disabled={actionInProgress === proj.id}
                                  >
                                    Approve & Open
                                  </Button>
                                ) : (
                                  <Button
                                    size="sm"
                                    className="h-7 bg-amber-600 hover:bg-amber-700 text-white text-[10px]"
                                    onClick={() => handleModerateProject(proj.id!, 'REJECT')}
                                    disabled={actionInProgress === proj.id}
                                  >
                                    Deactivate
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-red-500 hover:bg-red-50 border-red-100 text-[10px]"
                                  onClick={() => handleModerateProject(proj.id!, 'SPAM')}
                                  disabled={actionInProgress === proj.id}
                                >
                                  Spam Flag
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 w-7 text-red-600 hover:bg-red-50 hover:text-red-800"
                                  onClick={() => handleModerateProject(proj.id!, 'DELETE')}
                                  disabled={actionInProgress === proj.id}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* TAB 4: BROADCAST SYSTEM */}
          {activeTab === 'notifications' && (
            <Card className="max-w-2xl mx-auto">
              <CardHeader>
                <CardTitle className="text-xl font-bold font-heading flex items-center gap-2">
                  <Bell className="w-6 h-6 text-primary" />
                  System Announcements & Alerts
                </CardTitle>
                <CardDescription>Send instant platform-wide push alerts or targeted announcements to specific segments</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSendBroadcast} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Target User Segment</label>
                    <select
                      className="w-full bg-card border border-border rounded-xl px-4 h-12 text-sm focus:ring-1 focus:ring-primary focus:outline-none"
                      value={broadcastTarget}
                      onChange={(e: any) => setBroadcastTarget(e.target.value)}
                    >
                      <option value="ALL">All Registered Users ({stats.totalUsers})</option>
                      <option value="FREELANCERS">Only Freelancers & Agencies</option>
                      <option value="CLIENTS">Only Clients & Enterprise Businesses</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Alert Level / Visual Theme</label>
                    <select
                      className="w-full bg-card border border-border rounded-xl px-4 h-12 text-sm focus:ring-1 focus:ring-primary focus:outline-none"
                      value={broadcastType}
                      onChange={(e: any) => setBroadcastType(e.target.value)}
                    >
                      <option value="GENERAL">General Bulletin (Informational Info)</option>
                      <option value="MAINTENANCE_ALERT">Maintenance Banner Alert (Warning Red)</option>
                      <option value="SYSTEM_ANNOUNCEMENT">System Feature Upgrade (Sparkles Indigo)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider font-mono">Title</label>
                    <Input
                      placeholder="e.g. Server Maintenance: July 15, 2:00 UTC"
                      value={broadcastTitle}
                      onChange={(e) => setBroadcastTitle(e.target.value)}
                      className="h-12 text-sm rounded-xl"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider font-mono">Announcement Content</label>
                    <Textarea
                      placeholder="Enter detailed message text here. Keep it action-oriented and clear..."
                      value={broadcastBody}
                      onChange={(e) => setBroadcastBody(e.target.value)}
                      className="rounded-xl min-h-[120px] text-sm"
                    />
                  </div>

                  <div className="pt-3">
                    <Button
                      type="submit"
                      className="w-full h-12 text-sm font-semibold rounded-xl"
                      disabled={actionInProgress === 'sending_broadcast'}
                    >
                      {actionInProgress === 'sending_broadcast' ? (
                        <span className="flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" /> Broadcasting...
                        </span>
                      ) : (
                        'Broadcast System Alert Now'
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* TAB 5: PLATFORM SETTINGS */}
          {activeTab === 'settings' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Financial & Fee Rules */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-bold font-heading flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-indigo-500" />
                    Marketplace Fee Structures
                  </CardTitle>
                  <CardDescription>Adjust commission splits, escrow values, and free credits</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Default Platform Commission Rate (%)</label>
                    <Input
                      type="number"
                      value={settings.commissionPercentage}
                      onChange={(e) => setSettings({ ...settings, commissionPercentage: Number(e.target.value) })}
                      min="0"
                      max="100"
                    />
                    <p className="text-[10px] text-muted-foreground">Percentage charged on payout releases from escrow wallets.</p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Monthly AI Pitch Credits (Free Tier)</label>
                    <Input
                      type="number"
                      value={settings.aiCreditsFreeTier}
                      onChange={(e) => setSettings({ ...settings, aiCreditsFreeTier: Number(e.target.value) })}
                    />
                    <p className="text-[10px] text-muted-foreground">Credits loaded to free-tier members every billing cycle.</p>
                  </div>

                  <div className="pt-4 border-t border-border">
                    <h4 className="text-xs font-bold text-muted-foreground uppercase mb-3">Subscription Prices (USD/mo)</h4>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-[10px] text-slate-500 font-semibold uppercase">PRO FREELANCER</label>
                        <Input
                          type="number"
                          value={settings.subscriptionTiers?.pro_freelancer || 15}
                          onChange={(e) => setSettings({
                            ...settings,
                            subscriptionTiers: {
                              ...settings.subscriptionTiers,
                              pro_freelancer: Number(e.target.value)
                            }
                          })}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] text-slate-500 font-semibold uppercase">AGENCY PRO</label>
                        <Input
                          type="number"
                          value={settings.subscriptionTiers?.agency_pro || 49}
                          onChange={(e) => setSettings({
                            ...settings,
                            subscriptionTiers: {
                              ...settings.subscriptionTiers,
                              agency_pro: Number(e.target.value)
                            }
                          })}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] text-slate-500 font-semibold uppercase">BUSINESS PRO</label>
                        <Input
                          type="number"
                          value={settings.subscriptionTiers?.business_pro || 79}
                          onChange={(e) => setSettings({
                            ...settings,
                            subscriptionTiers: {
                              ...settings.subscriptionTiers,
                              business_pro: Number(e.target.value)
                            }
                          })}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Feature Toggles & AI settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-bold font-heading flex items-center gap-2">
                    <Sliders className="w-5 h-5 text-indigo-500" />
                    Feature Flags & AI Tuning
                  </CardTitle>
                  <CardDescription>Turn off features during platform upgrades or fine-tune generative prompts</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-accent/40 rounded-xl border border-border">
                      <div>
                        <span className="text-sm font-semibold block text-slate-800">Maintenance Warning Mode</span>
                        <span className="text-xs text-muted-foreground">Alert active users of incoming server upgrades.</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings.maintenanceMode}
                        onChange={(e) => setSettings({ ...settings, maintenanceMode: e.target.checked })}
                        className="w-5 h-5 accent-primary cursor-pointer"
                      />
                    </div>

                    <div className="flex items-center justify-between p-3 bg-accent/40 rounded-xl border border-border">
                      <div>
                        <span className="text-sm font-semibold block text-slate-800">Lock Registrations</span>
                        <span className="text-xs text-muted-foreground">Temporarily block any role selecion or profile creations.</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings.registrationDisabled}
                        onChange={(e) => setSettings({ ...settings, registrationDisabled: e.target.checked })}
                        className="w-5 h-5 accent-primary cursor-pointer"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-pink-500" /> System-wide AI Proposal Prompt Tuning
                    </label>
                    <Textarea
                      value={settings.aiPromptSetting}
                      onChange={(e) => setSettings({ ...settings, aiPromptSetting: e.target.value })}
                      className="min-h-[100px] text-xs font-mono"
                    />
                    <p className="text-[10px] text-muted-foreground">Base prompt sent to Gemini Flash models for synthesizing pitch text.</p>
                  </div>

                  <div className="pt-4 border-t border-border flex justify-end">
                    <Button
                      onClick={saveSettings}
                      disabled={actionInProgress === 'saving_settings'}
                      className="h-10 px-6 font-semibold"
                    >
                      {actionInProgress === 'saving_settings' ? (
                        <span className="flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                        </span>
                      ) : (
                        'Save Configuration'
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* TAB 6: SECURITY AUDIT LOGS */}
          {activeTab === 'audit' && (
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-lg font-bold font-heading flex items-center gap-2">
                      <Lock className="w-5 h-5 text-indigo-500" />
                      Security Audit Logs
                    </CardTitle>
                    <CardDescription>Real-time stream of admin operations and access grants</CardDescription>
                  </div>
                  <Badge variant="outline" className="font-mono text-xs">
                    SYSTEM SECURE
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0 max-h-[500px] overflow-y-auto">
                {loadingAudit ? (
                  <div className="p-12 text-center flex justify-center items-center gap-2">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    <span className="text-sm text-muted-foreground">Reading logs collection...</span>
                  </div>
                ) : auditLogs.length === 0 ? (
                  <div className="p-8 text-center text-sm text-muted-foreground">
                    No logged actions yet. Modify settings or user privileges to trigger log writes.
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {auditLogs.map((log) => (
                      <div key={log.id || Math.random().toString()} className="p-4 flex items-start gap-3 hover:bg-accent/10 transition-colors text-xs">
                        <div className="shrink-0 w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                          <Lock className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-4 mb-1">
                            <span className="font-semibold text-slate-800">
                              {log.adminName} ({log.adminId})
                            </span>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              {new Date(log.timestamp).toLocaleDateString()} {new Date(log.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                          <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1">
                            <Badge className="bg-slate-700 text-white font-mono text-[8px] px-1.5 py-0">
                              {log.action}
                            </Badge>
                            {log.targetId && (
                              <span className="bg-accent px-1.5 py-0.5 rounded text-[9px]">
                                TARGET: {log.targetId}
                              </span>
                            )}
                          </div>
                          <p className="text-slate-700 break-words">{log.details}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
export default AdminDashboard;
