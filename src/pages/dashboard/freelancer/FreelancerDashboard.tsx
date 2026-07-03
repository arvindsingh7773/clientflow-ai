import React, { useEffect, useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { db } from '../../../lib/firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { Project, Proposal } from '../../../types';
import { Link } from 'react-router-dom';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../components/ui/card';
import { motion } from 'motion/react';
import { Briefcase, DollarSign, Clock, CheckCircle, Search, Bot, Sparkles } from 'lucide-react';
import { Badge } from '../../../components/ui/badge';

export function FreelancerDashboard() {
  const { user } = useAuth();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) return;
      try {
        // Fetch proposals
        const q = query(
          collection(db, 'proposals'),
          where('freelancerId', '==', user.id)
        );
        const snapshot = await getDocs(q);
        const propData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Proposal));
        propData.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setProposals(propData);

        // Fetch user wallet balance
        const userRef = doc(db, 'users', user.id);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const userData = userSnap.data();
          setWalletBalance(userData.walletBalance || 0);
        }
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, [user]);

  const stats = [
    { label: 'Active Proposals', value: proposals.filter(p => p.status === 'PENDING').length, icon: <Clock className="w-5 h-5 text-blue-500" /> },
    { label: 'Shortlisted', value: proposals.filter(p => p.status === 'SHORTLISTED').length, icon: <Sparkles className="w-5 h-5 text-purple-500" /> },
    { label: 'Jobs Won', value: proposals.filter(p => p.status === 'ACCEPTED').length, icon: <CheckCircle className="w-5 h-5 text-green-500" /> },
    { label: 'Total Earnings', value: `$${walletBalance.toFixed(2)}`, icon: <DollarSign className="w-5 h-5 text-yellow-500" /> },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold font-heading">Welcome back, {user?.name?.split(' ')[0]}</h1>
          <p className="text-muted-foreground mt-1">Here is an overview of your freelance business.</p>
        </div>
        <Link to="/dashboard/freelancer/browse">
          <Button size="lg" className="h-12 px-6">
            <Search className="w-4 h-4 mr-2" />
            Find Work
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card>
              <CardContent className="p-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center">
                  {stat.icon}
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold font-heading">{stat.value}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold font-heading">Recent Proposals</h2>
            <Link to="/dashboard/freelancer/proposals" className="text-sm font-medium text-primary hover:underline">
              View All
            </Link>
          </div>
          
          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-8 text-center text-muted-foreground animate-pulse">Loading proposals...</div>
              ) : proposals.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="w-16 h-16 rounded-full bg-accent flex items-center justify-center mx-auto mb-4">
                    <Briefcase className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">No proposals yet</h3>
                  <p className="text-muted-foreground mb-6">Start bidding on projects to grow your business.</p>
                  <Link to="/dashboard/freelancer/browse">
                    <Button variant="outline">Browse Projects</Button>
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {proposals.slice(0, 5).map(proposal => (
                    <div key={proposal.id} className="p-6 hover:bg-accent/30 transition-colors flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                      <div className="space-y-1">
                        <Link to={`/dashboard/freelancer/projects/${proposal.projectId}`} className="font-semibold font-heading text-lg hover:text-primary transition-colors">
                          Proposal for Project ID: {proposal.projectId.substring(0, 8)}...
                        </Link>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <span>${proposal.bidAmount} in {proposal.estimatedDays} days</span>
                          <span>•</span>
                          <span>Submitted {new Date(proposal.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div>
                        <Badge 
                          variant={proposal.status === 'ACCEPTED' ? 'default' : proposal.status === 'REJECTED' ? 'outline' : 'secondary'}
                          className={proposal.status === 'REJECTED' ? 'text-red-500 border-red-500/50' : ''}
                        >
                          {proposal.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-bold font-heading">AI Job Matches</h2>
          <Card className="border-primary/20 bg-primary/5 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Bot className="w-32 h-32" />
            </div>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                Smart Recommendations
              </CardTitle>
              <CardDescription>
                We use AI to analyze your skills and past success to find the perfect projects for you.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link to="/dashboard/freelancer/browse?ai=true">
                <Button className="w-full">
                  View AI Matches
                </Button>
              </Link>
            </CardContent>
          </Card>

          <h2 className="text-xl font-bold font-heading mt-8">Profile Completion</h2>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Profile Strength</span>
                <span className="text-sm font-bold text-primary">60%</span>
              </div>
              <div className="w-full h-2 bg-accent rounded-full mb-6 overflow-hidden">
                <div className="h-full bg-primary w-[60%] rounded-full"></div>
              </div>
              
              <ul className="space-y-3 text-sm">
                <li className="flex items-center gap-2 text-green-500"><CheckCircle className="w-4 h-4" /> Basic Details</li>
                <li className="flex items-center gap-2 text-green-500"><CheckCircle className="w-4 h-4" /> Add Skills</li>
                <li className="flex items-center gap-2 text-muted-foreground"><div className="w-4 h-4 border-2 border-muted-foreground rounded-full" /> Add Portfolio Items</li>
                <li className="flex items-center gap-2 text-muted-foreground"><div className="w-4 h-4 border-2 border-muted-foreground rounded-full" /> Add Experience</li>
              </ul>
              
              <Link to="/dashboard/freelancer/profile" className="block mt-6">
                <Button variant="outline" className="w-full">Update Profile</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
