import React, { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../lib/firebase';
import { collection, query, where, onSnapshot, updateDoc, doc, orderBy, limit } from 'firebase/firestore';
import { Button } from '../ui/button';
import { 
  LayoutDashboard, 
  Briefcase, 
  MessageSquare, 
  Bell, 
  Settings, 
  LogOut, 
  Sparkles,
  Menu,
  X,
  Wallet,
  Search,
  User,
  CheckCircle,
  Globe,
  ShieldCheck
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Notification as AppNotification, ChatRoom } from '../../types';

export function DashboardLayout() {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const notifRef = useRef<HTMLDivElement>(null);

  const [pushPermission, setPushPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'denied'
  );

  const requestPushPermission = () => {
    if (typeof Notification !== 'undefined') {
      Notification.requestPermission().then((permission) => {
        setPushPermission(permission);
        if (permission === 'granted') {
          new Notification("ClientFlow AI Enabled!", {
            body: "You will now receive desktop notifications for active B2B projects and contract matches.",
            icon: "https://img.icons8.com/fluency/192/000000/artificial-intelligence.png"
          });
        }
      });
    }
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!user) return;

    // Notifications
    const qNotifs = query(
      collection(db, 'notifications'), 
      where('userId', '==', user.id),
      orderBy('createdAt', 'desc'),
      limit(10)
    );
    const unsubNotifs = onSnapshot(qNotifs, (snap) => {
      const notifsData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as AppNotification));
      setNotifications(notifsData);
      setUnreadNotifications(notifsData.filter(n => !n.read).length);
    });

    // Messages
    const qRooms = query(collection(db, 'chatRooms'), where('participantIds', 'array-contains', user.id));
    const unsubRooms = onSnapshot(qRooms, (snap) => {
      let count = 0;
      snap.forEach(doc => {
        const room = doc.data() as ChatRoom;
        count += (room.unreadCount?.[user.id] || 0);
      });
      setUnreadMessages(count);
    });

    return () => {
      unsubNotifs();
      unsubRooms();
    };
  }, [user]);

  const handleMarkAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, 'notifications', id), { read: true });
    } catch (e) {
      console.error(e);
    }
  };

  const handleNotificationClick = (n: AppNotification) => {
    if (!n.read) {
      handleMarkAsRead(n.id!);
    }
    setNotificationsOpen(false);
    if (n.link) {
      navigate(n.link);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const clientNavItems = [
    { name: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
    { name: 'Projects', href: '/dashboard/projects', icon: <Briefcase className="w-5 h-5" /> },
    { name: 'Business Marketplace', href: '/dashboard/marketplace', icon: <Globe className="w-5 h-5" /> },
    { name: 'Messages', href: '/dashboard/messages', icon: <MessageSquare className="w-5 h-5" />, badge: unreadMessages },
    { name: 'Wallet', href: '/dashboard/wallet', icon: <Wallet className="w-5 h-5" /> },
    { name: 'Settings', href: '/dashboard/settings', icon: <Settings className="w-5 h-5" /> },
  ];

  const freelancerNavItems = [
    { name: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
    { name: 'Find Work', href: '/dashboard/freelancer/browse', icon: <Search className="w-5 h-5" /> },
    { name: 'Business Marketplace', href: '/dashboard/marketplace', icon: <Globe className="w-5 h-5" /> },
    { name: 'Proposals', href: '/dashboard/freelancer/proposals', icon: <Briefcase className="w-5 h-5" /> },
    { name: 'Profile', href: '/dashboard/freelancer/profile', icon: <User className="w-5 h-5" /> },
    { name: 'Messages', href: '/dashboard/messages', icon: <MessageSquare className="w-5 h-5" />, badge: unreadMessages },
    { name: 'Wallet', href: '/dashboard/wallet', icon: <Wallet className="w-5 h-5" /> },
    { name: 'Settings', href: '/dashboard/settings', icon: <Settings className="w-5 h-5" /> },
  ];

  const baseNavItems = (user?.role === 'FREELANCER' || user?.role === 'AGENCY') ? freelancerNavItems : clientNavItems;
  const navItems = [...baseNavItems];
  if (user?.role === 'ADMIN' || user?.email === 'arvind7773singh14@gmail.com') {
    if (!navItems.some(item => item.name === 'Admin Panel')) {
      navItems.push({ name: 'Admin Panel', href: '/dashboard/admin', icon: <ShieldCheck className="w-5 h-5" /> });
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 border-b border-border bg-card sticky top-0 z-50">
        <Link to="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-heading font-bold text-lg">ClientFlow AI</span>
        </Link>
          <div className="flex items-center gap-4">
            <div className="relative" ref={notifRef}>
              <Button variant="ghost" size="icon" className="relative" onClick={() => setNotificationsOpen(!notificationsOpen)}>
                <Bell className="w-5 h-5" />
                {unreadNotifications > 0 && <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full"></span>}
              </Button>
              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-[calc(100vw-2rem)] max-w-80 bg-card border border-border rounded-xl shadow-lg overflow-hidden z-50 flex flex-col max-h-[400px]">
                  <div className="p-3 border-b border-border font-semibold flex justify-between items-center bg-accent/30">
                    Notifications
                    {unreadNotifications > 0 && (
                      <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                        {unreadNotifications} new
                      </span>
                    )}
                  </div>
                  <div className="overflow-y-auto flex-1">
                    {pushPermission === 'default' && (
                      <div className="p-3 bg-indigo-500/10 border-b border-indigo-500/20 text-xs text-slate-200 flex flex-col gap-2">
                        <p className="font-medium text-indigo-300 flex items-center gap-1.5">
                          <span>🔔</span> Enable Push Notifications
                        </p>
                        <p className="text-slate-300">Get notified instantly about contract escrow changes and project matches.</p>
                        <button 
                          onClick={requestPushPermission}
                          className="px-2 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded font-semibold text-[10px] w-fit self-end transition-colors cursor-pointer"
                        >
                          Enable Notifications
                        </button>
                      </div>
                    )}
                    {notifications.length === 0 ? (
                      <div className="p-4 text-center text-sm text-muted-foreground">No notifications</div>
                    ) : (
                      notifications.map(n => (
                        <div 
                          key={n.id} 
                          className={cn(
                            "p-3 border-b border-border last:border-0 hover:bg-accent cursor-pointer transition-colors text-sm flex gap-3",
                            !n.read ? "bg-accent/10" : ""
                          )}
                          onClick={() => handleNotificationClick(n)}
                        >
                          <div className={cn(
                            "w-2 h-2 rounded-full mt-1.5 shrink-0",
                            !n.read ? "bg-primary" : "bg-transparent"
                          )} />
                          <div>
                            <div className="font-semibold mb-0.5">{n.title}</div>
                            <div className="text-muted-foreground line-clamp-2">{n.body}</div>
                            <div className="text-xs text-muted-foreground mt-1 opacity-70">
                              {new Date(n.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
      </div>

      {/* Sidebar */}
      <aside className={cn(
        "fixed md:sticky top-0 left-0 h-screen w-64 bg-card border-r border-border flex flex-col z-40 transition-transform duration-300",
        mobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}>
        <div className="p-6 hidden md:flex items-center gap-2 mb-6">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-heading font-bold text-xl tracking-tight">ClientFlow AI</span>
        </div>

        <div className="flex-1 px-4 py-6 md:py-0 overflow-y-auto">
          <nav className="flex flex-col gap-2">
            {navItems.map((item) => {
              const isActive = location.pathname === item.href || (item.href !== '/dashboard' && location.pathname.startsWith(item.href));
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl transition-colors font-medium text-sm",
                    isActive 
                      ? "bg-primary text-primary-foreground" 
                      : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  )}
                >
                  <div className="flex items-center gap-3">
                    {item.icon}
                    {item.name}
                  </div>
                  {item.badge ? (
                    <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center shrink-0">
                      {item.badge}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3 px-4 py-3 mb-4 rounded-xl bg-accent/50 border border-border">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-semibold truncate">{user?.name}</p>
              <p className="text-xs text-muted-foreground capitalize">{user?.role.toLowerCase()}</p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            className="w-full justify-start text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
            onClick={handleSignOut}
          >
            <LogOut className="w-5 h-5 mr-3" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-x-hidden min-h-screen">
        {/* Desktop Header */}
        <header className="hidden md:flex h-20 items-center justify-between px-8 border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-30 gap-6">
          <h2 className="text-xl font-heading font-bold capitalize whitespace-nowrap hidden lg:block">
            {location.pathname.split('/')[2] || 'Dashboard'}
          </h2>
          
          <div className="flex-1 max-w-2xl relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Global Search: projects, freelancers..." 
              className="w-full h-10 pl-10 pr-4 rounded-full bg-accent/50 border border-border focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary text-sm transition-all"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const target = e.target as HTMLInputElement;
                  navigate(`/dashboard/search?q=${encodeURIComponent(target.value)}`);
                }
              }}
            />
          </div>

          <div className="flex items-center gap-4">
            {user?.role === 'CLIENT' || user?.role === 'COMPANY' ? (
              <Button variant="outline" size="sm" className="hidden xl:flex" onClick={() => navigate('/dashboard/projects/new')}>
                <Sparkles className="w-4 h-4 mr-2 text-primary" />
                Post Project
              </Button>
            ) : null}
            <div className="relative" ref={notifRef}>
              <Button variant="ghost" size="icon" className="relative" onClick={() => setNotificationsOpen(!notificationsOpen)}>
                <Bell className="w-5 h-5" />
                {unreadNotifications > 0 && <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full"></span>}
              </Button>
              
              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-card border border-border rounded-xl shadow-lg overflow-hidden z-50 flex flex-col max-h-[400px]">
                  <div className="p-3 border-b border-border font-semibold flex justify-between items-center bg-accent/30">
                    Notifications
                    {unreadNotifications > 0 && (
                      <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                        {unreadNotifications} new
                      </span>
                    )}
                  </div>
                  <div className="overflow-y-auto flex-1">
                    {pushPermission === 'default' && (
                      <div className="p-3 bg-indigo-500/10 border-b border-indigo-500/20 text-xs text-slate-200 flex flex-col gap-2">
                        <p className="font-medium text-indigo-300 flex items-center gap-1.5">
                          <span>🔔</span> Enable Push Notifications
                        </p>
                        <p className="text-slate-300">Get notified instantly about contract escrow changes and project matches.</p>
                        <button 
                          onClick={requestPushPermission}
                          className="px-2 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded font-semibold text-[10px] w-fit self-end transition-colors cursor-pointer"
                        >
                          Enable Notifications
                        </button>
                      </div>
                    )}
                    {notifications.length === 0 ? (
                      <div className="p-4 text-center text-sm text-muted-foreground">No notifications</div>
                    ) : (
                      notifications.map(n => (
                        <div 
                          key={n.id} 
                          className={cn(
                            "p-3 border-b border-border last:border-0 hover:bg-accent cursor-pointer transition-colors text-sm flex gap-3",
                            !n.read ? "bg-accent/10" : ""
                          )}
                          onClick={() => handleNotificationClick(n)}
                        >
                          <div className={cn(
                            "w-2 h-2 rounded-full mt-1.5 shrink-0",
                            !n.read ? "bg-primary" : "bg-transparent"
                          )} />
                          <div>
                            <div className="font-semibold mb-0.5">{n.title}</div>
                            <div className="text-muted-foreground line-clamp-2">{n.body}</div>
                            <div className="text-xs text-muted-foreground mt-1 opacity-70">
                              {new Date(n.createdAt).toLocaleDateString()} {new Date(n.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="p-4 md:p-8">
          <Outlet />
        </div>
      </main>

      {/* Overlay for mobile sidebar */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-30 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
    </div>
  );
}
