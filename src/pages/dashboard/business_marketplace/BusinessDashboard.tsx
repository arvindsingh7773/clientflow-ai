import React, { useState, useEffect } from 'react';
import { db } from '../../../lib/firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc, 
  updateDoc, 
  arrayUnion, 
  arrayRemove,
  addDoc 
} from 'firebase/firestore';
import { useAuth } from '../../../contexts/AuthContext';
import { BusinessProfile, BusinessProject, BusinessProposal, User } from '../../../types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Input } from '../../../components/ui/input';
import { Textarea } from '../../../components/ui/textarea';
import { toast } from 'react-hot-toast';
import { createPaymentRecord } from '../../../lib/payments';
import { 
  Briefcase, 
  Compass, 
  MessageSquare, 
  Wallet as WalletIcon, 
  Star, 
  Bookmark, 
  Users, 
  TrendingUp, 
  Bell, 
  CheckCircle2, 
  X, 
  Loader2, 
  ChevronRight, 
  Plus, 
  Sparkles,
  ArrowRight,
  DollarSign
} from 'lucide-react';
import { motion } from 'motion/react';

interface Props {
  onViewProject: (projectId: string) => void;
  onViewClientProfile?: (clientId: string) => void;
}

export default function BusinessDashboard({ onViewProject }: Props) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  
  // Stats
  const [proposals, setProposals] = useState<BusinessProposal[]>([]);
  const [allProjects, setAllProjects] = useState<BusinessProject[]>([]);
  const [leads, setLeads] = useState<BusinessProject[]>([]);
  
  // Wallet deposit simulation
  const [depositAmount, setDepositAmount] = useState('');
  const [depositing, setDepositing] = useState(false);

  // Proposal modal
  const [selectedLead, setSelectedLead] = useState<BusinessProject | null>(null);
  const [bidAmount, setBidAmount] = useState('');
  const [bidTimeline, setBidTimeline] = useState('');
  const [bidCoverLetter, setBidCoverLetter] = useState('');
  const [submittingBid, setSubmittingBid] = useState(false);

  // AI Pitch recommendation
  const [aiPitching, setAiPitching] = useState(false);

  useEffect(() => {
    if (!user) return;

    const fetchAllData = async () => {
      try {
        // Fetch profile
        const profileSnap = await getDoc(doc(db, 'business_profiles', user.id));
        let profileData: BusinessProfile | null = null;
        if (profileSnap.exists()) {
          profileData = profileSnap.data() as BusinessProfile;
          setProfile(profileData);
        }

        // Fetch user wallet balance
        const userSnap = await getDoc(doc(db, 'users', user.id));
        if (userSnap.exists()) {
          const uData = userSnap.data() as User;
          setBalance(uData.walletBalance || 0);
        }

        // Fetch proposals
        const proposalsSnap = await getDocs(query(
          collection(db, 'business_proposals'),
          where('businessProfileId', '==', user.id)
        ));
        const proposalsList = proposalsSnap.docs.map(d => ({ id: d.id, ...d.data() } as BusinessProposal));
        setProposals(proposalsList);

        // Fetch projects to list potential leads
        const projectsSnap = await getDocs(query(
          collection(db, 'business_projects'),
          where('status', '==', 'OPEN')
        ));
        const openProjects = projectsSnap.docs.map(d => ({ id: d.id, ...d.data() } as BusinessProject));
        setAllProjects(openProjects);

        // Filter leads (projects not yet applied to and matching industry)
        const industry = profileData?.industry || '';
        const unapplied = openProjects.filter(p => !proposalsList.some(pr => pr.businessProjectId === p.id));
        setLeads(unapplied);

      } catch (error) {
        console.error("Error loading dashboard data:", error);
        toast.error("Failed to load dashboard metrics");
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, [user]);

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(depositAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid deposit amount");
      return;
    }
    if (!user) return;

    setDepositing(true);
    try {
      const userRef = doc(db, 'users', user.id);
      const newBalance = balance + amount;
      await updateDoc(userRef, { walletBalance: newBalance });

      // Create transaction record
      await createPaymentRecord({
        userId: user.id,
        type: 'DEPOSIT',
        amount,
        currency: 'USD',
        status: 'COMPLETED',
        description: `Simulated secure deposit to Business wallet via marketplace gateway`,
      });

      setBalance(newBalance);
      setDepositAmount('');
      toast.success(`Successfully deposited $${amount.toFixed(2)} to your wallet!`);
    } catch (error) {
      console.error(error);
      toast.error("Deposit failed");
    } finally {
      setDepositing(false);
    }
  };

  const handleAiPitchGenerator = async () => {
    if (!selectedLead || !profile) return;
    setAiPitching(true);
    try {
      const response = await fetch('/api/ai/generate-proposal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project: selectedLead,
          freelancerProfile: {
            headline: profile.companyName,
            bio: `${profile.industry} company offering: ${profile.services.join(', ')}. Experience: ${profile.experience}`,
            skills: profile.services
          }
        })
      });
      if (!response.ok) throw new Error("Pitch generation failed");
      const data = await response.json();
      if (data.proposal) {
        setBidCoverLetter(data.proposal);
        toast.success("AI cover letter pitch optimized!");
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to optimize pitch. Try writing custom.");
    } finally {
      setAiPitching(false);
    }
  };

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead || !user || !profile) return;
    const bidValue = parseFloat(bidAmount);
    if (isNaN(bidValue) || bidValue <= 0) {
      toast.error("Please specify a positive proposal bid amount");
      return;
    }
    if (!bidTimeline.trim()) {
      toast.error("Timeline estimate is required");
      return;
    }
    if (!bidCoverLetter.trim()) {
      toast.error("Proposal cover letter is required");
      return;
    }

    setSubmittingBid(true);
    try {
      const proposalData: Omit<BusinessProposal, 'id'> = {
        businessProjectId: selectedLead.id,
        businessProfileId: user.id,
        companyName: profile.companyName,
        logo: profile.logo,
        coverLetter: bidCoverLetter.trim(),
        bidAmount: bidValue,
        timeline: bidTimeline.trim(),
        status: 'PENDING',
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'business_proposals'), proposalData);

      // Increment proposal count on project
      const projectRef = doc(db, 'business_projects', selectedLead.id);
      await updateDoc(projectRef, {
        proposalsCount: (selectedLead.proposalsCount || 0) + 1
      });

      // Send notification to Client
      await addDoc(collection(db, 'notifications'), {
        userId: selectedLead.clientId,
        title: 'New Proposal Received!',
        body: `Your project "${selectedLead.title}" received a new proposal of $${bidValue} from ${profile.companyName}.`,
        read: false,
        type: 'PROPOSAL_RECEIVED',
        link: `/dashboard/marketplace?tab=client-dashboard`,
        createdAt: new Date().toISOString()
      });

      toast.success("Proposal bid submitted successfully!");
      
      // Update local lists
      setProposals([...proposals, { id: 'temp', ...proposalData } as BusinessProposal]);
      setLeads(leads.filter(l => l.id !== selectedLead.id));
      setSelectedLead(null);
      setBidAmount('');
      setBidTimeline('');
      setBidCoverLetter('');
    } catch (error) {
      console.error(error);
      toast.error("Failed to submit proposal");
    } finally {
      setSubmittingBid(false);
    }
  };

  const handleSaveProjectToggle = async (projId: string) => {
    if (!user || !profile) return;
    const isSaved = profile.savedProjects?.includes(projId);
    try {
      const profileRef = doc(db, 'business_profiles', user.id);
      if (isSaved) {
        await updateDoc(profileRef, { savedProjects: arrayRemove(projId) });
        setProfile({ ...profile, savedProjects: profile.savedProjects?.filter(id => id !== projId) || [] });
        toast.success("Removed project from bookmarks");
      } else {
        await updateDoc(profileRef, { savedProjects: arrayUnion(projId) });
        setProfile({ ...profile, savedProjects: [...(profile.savedProjects || []), projId] });
        toast.success("Project bookmarked!");
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to update bookmarks");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  // Calculate statistics
  const analytics = {
    leadsMatched: leads.length,
    activeBids: proposals.length,
    conversionRate: proposals.length > 0 ? ((proposals.filter(p => p.status === 'HIRED').length / proposals.length) * 100).toFixed(0) : '0',
    totalRevenue: proposals.filter(p => p.status === 'HIRED').reduce((sum, p) => sum + p.bidAmount, 0),
    avgRating: profile?.ratings || 5.0
  };

  return (
    <div className="space-y-8 pb-12">
      
      {/* Top Banner Analytics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border border-border">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Business Balance</p>
              <p className="text-3xl font-extrabold font-heading text-primary">${balance.toFixed(2)}</p>
            </div>
            <div className="p-3 bg-primary/10 rounded-xl text-primary">
              <WalletIcon className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Live Sourcing Leads</p>
              <p className="text-3xl font-extrabold font-heading text-foreground">{analytics.leadsMatched}</p>
            </div>
            <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-500">
              <Compass className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Submitted Bids</p>
              <p className="text-3xl font-extrabold font-heading text-foreground">{analytics.activeBids}</p>
            </div>
            <div className="p-3 bg-amber-500/10 rounded-xl text-amber-500">
              <Briefcase className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Review Rating</p>
              <p className="text-3xl font-extrabold font-heading text-foreground flex items-center gap-1">
                {analytics.avgRating.toFixed(1)} <Star className="w-5 h-5 fill-amber-500 text-amber-500 shrink-0" />
              </p>
            </div>
            <div className="p-3 bg-pink-500/10 rounded-xl text-pink-500">
              <Star className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left 2 Cols: Leads list and Proposal submissions */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Active Proposals Tracker */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold font-heading flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-primary" /> Submitted Bids & Proposals
            </h2>
            
            <Card className="border border-border">
              <CardContent className="p-0">
                {proposals.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground text-sm">
                    You have not submitted any project requirements bids yet. Review matching leads on the right to start!
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {proposals.map((prop, idx) => (
                      <div key={idx} className="p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-card/10 hover:bg-accent/5 transition-colors">
                        <div className="space-y-1 flex-1">
                          <h4 className="font-semibold text-sm">Bid for Business Sourcing</h4>
                          <p className="text-xs text-muted-foreground line-clamp-2">{prop.coverLetter}</p>
                          <div className="flex items-center gap-4 pt-1 text-xs text-muted-foreground">
                            <span className="font-semibold text-foreground">${prop.bidAmount}</span>
                            <span>•</span>
                            <span>Timeline: {prop.timeline}</span>
                            <span>•</span>
                            <span>Submitted: {new Date(prop.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <Badge className={
                          prop.status === 'HIRED' ? "bg-green-500/10 text-green-500 border-green-500/20" :
                          prop.status === 'REJECTED' ? "bg-red-500/10 text-red-500 border-red-500/20" :
                          prop.status === 'SHORTLISTED' ? "bg-purple-500/10 text-purple-500 border-purple-500/20" :
                          "bg-amber-500/10 text-amber-500 border-amber-500/20"
                        }>
                          {prop.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sourcing Leads list / Matched Requirements */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold font-heading flex items-center gap-2">
              <Compass className="w-5 h-5 text-primary" /> Open Sourcing Opportunities (Leads)
            </h2>
            
            <div className="space-y-4">
              {leads.length === 0 ? (
                <Card className="p-8 text-center text-muted-foreground text-sm border border-dashed">
                  No matches or new sourcing leads found for your selected industry yet.
                </Card>
              ) : (
                leads.map((lead, idx) => {
                  const isSaved = profile?.savedProjects?.includes(lead.id);
                  return (
                    <motion.div key={lead.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}>
                      <Card className="hover:border-primary/40 transition-colors">
                        <CardContent className="p-5 space-y-4">
                          <div className="flex justify-between items-start gap-4">
                            <div className="space-y-1">
                              <Badge variant="outline" className="text-xs border-primary/20 text-primary">{lead.category}</Badge>
                              <h3 className="text-lg font-bold font-heading">{lead.title}</h3>
                            </div>
                            <div className="flex gap-2">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => handleSaveProjectToggle(lead.id)}
                                className={isSaved ? "text-primary" : "text-muted-foreground"}
                              >
                                <Bookmark className={`w-5 h-5 ${isSaved ? "fill-primary" : ""}`} />
                              </Button>
                            </div>
                          </div>

                          <p className="text-sm text-muted-foreground line-clamp-3">{lead.description}</p>
                          
                          <div className="flex flex-wrap gap-1.5">
                            {lead.skillsRequired.map(skill => (
                              <Badge key={skill} variant="secondary" className="text-xs">{skill}</Badge>
                            ))}
                          </div>

                          <div className="pt-4 border-t border-border flex flex-wrap justify-between items-center gap-4">
                            <div className="flex items-center gap-6 text-xs text-muted-foreground">
                              <span>Estimated Budget: <span className="font-semibold text-foreground">${lead.budget}</span></span>
                              <span>Target Region: <span className="font-semibold text-foreground">{lead.country}</span></span>
                              <span>Timeline: <span className="font-semibold text-foreground">{lead.timeline}</span></span>
                            </div>
                            
                            <Button size="sm" onClick={() => setSelectedLead(lead)}>
                              Submit Proposal
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })
              )}
            </div>
          </div>

        </div>

        {/* Right Col: Wallet Gateway and Bookmarked Items */}
        <div className="space-y-8">
          
          {/* Wallet Gateway */}
          <Card className="border border-border">
            <CardHeader>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <WalletIcon className="w-5 h-5 text-primary" /> Wallet Funding Gateway
              </CardTitle>
              <CardDescription>Simulate incoming wire transfers or deposits safely.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleDeposit} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Deposit Amount (USD)</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input 
                      type="number"
                      value={depositAmount}
                      onChange={e => setDepositAmount(e.target.value)}
                      placeholder="e.g. 500"
                      className="pl-9"
                      required
                    />
                  </div>
                </div>
                <Button type="submit" disabled={depositing} className="w-full">
                  {depositing ? "Processing wire..." : "Simulate Wire Deposit"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Bookmarked Requirements */}
          <Card className="border border-border">
            <CardHeader>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Bookmark className="w-4 h-4 text-primary" /> Bookmarked Leads
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {!profile?.savedProjects || profile.savedProjects.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground">No bookmarked projects.</div>
              ) : (
                <div className="divide-y divide-border">
                  {allProjects.filter(p => profile.savedProjects?.includes(p.id)).map(p => (
                    <div key={p.id} className="p-3 flex justify-between items-center hover:bg-accent/5">
                      <div className="space-y-0.5 max-w-[80%]">
                        <p className="text-xs font-semibold truncate text-foreground">{p.title}</p>
                        <p className="text-[10px] text-muted-foreground">{p.category} • ${p.budget}</p>
                      </div>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-primary" onClick={() => onViewProject(p.id)}>
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Client reviews about them */}
          <Card className="border border-border">
            <CardHeader>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Star className="w-4 h-4 text-primary" /> Customer Feedbacks
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {!profile?.reviews || profile.reviews.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center">No reviews submitted yet.</p>
              ) : (
                profile.reviews.slice(0, 3).map((r, idx) => (
                  <div key={idx} className="border-b border-border last:border-b-0 pb-2 last:pb-0 space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-semibold text-foreground">{r.authorName}</span>
                      <span className="text-[10px] text-amber-500 font-medium">★ {r.rating.toFixed(1)}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground line-clamp-2">{r.comment}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

        </div>

      </div>

      {/* Proposal Submission Modal Overlay */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <Card className="w-full max-w-2xl border border-border bg-card shadow-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader className="flex flex-row justify-between items-start border-b border-border pb-3">
              <div>
                <CardTitle className="text-lg font-bold">Configure Proposal Proposal</CardTitle>
                <CardDescription className="line-clamp-1">Project: {selectedLead.title}</CardDescription>
              </div>
              <Button size="icon" variant="ghost" onClick={() => setSelectedLead(null)}>
                <X className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <form onSubmit={handleApply} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground">Your Bid (USD) *</label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input 
                        type="number"
                        value={bidAmount}
                        onChange={e => setBidAmount(e.target.value)}
                        placeholder="e.g. 4500"
                        className="pl-9"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground">Estimated Delivery Timeline *</label>
                    <Input 
                      value={bidTimeline}
                      onChange={e => setBidTimeline(e.target.value)}
                      placeholder="e.g. 6 Weeks, 30 Days"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-semibold text-muted-foreground">Detailed Cover Pitch *</label>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      onClick={handleAiPitchGenerator}
                      disabled={aiPitching}
                      className="border-purple-500/20 text-purple-600 dark:text-purple-400 hover:bg-purple-500/5 h-7 text-[11px]"
                    >
                      {aiPitching ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Sparkles className="w-3 h-3 mr-1" />}
                      Optimize Pitch with Gemini AI
                    </Button>
                  </div>
                  <Textarea 
                    value={bidCoverLetter}
                    onChange={e => setBidCoverLetter(e.target.value)}
                    placeholder="Describe how your business qualifications, machinery capacity, or agency team fits their exact needs..."
                    rows={6}
                    required
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t border-border">
                  <Button type="button" variant="outline" onClick={() => setSelectedLead(null)}>Cancel</Button>
                  <Button type="submit" disabled={submittingBid}>
                    {submittingBid ? "Submitting..." : "Send Proposal"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

    </div>
  );
}
