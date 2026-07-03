import React, { useState, useEffect } from 'react';
import { db } from '../../../lib/firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  updateDoc, 
  addDoc, 
  getDoc 
} from 'firebase/firestore';
import { useAuth } from '../../../contexts/AuthContext';
import { BusinessProject, BusinessProposal, BusinessProfile, User } from '../../../types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { toast } from 'react-hot-toast';
import { createPaymentRecord } from '../../../lib/payments';
import { 
  Briefcase, 
  Users, 
  DollarSign, 
  Clock, 
  Star, 
  CheckCircle2, 
  X, 
  Loader2, 
  Sparkles,
  Award,
  ArrowRight
} from 'lucide-react';
import { motion } from 'motion/react';

interface Props {
  onViewBusinessProfile: (businessId: string) => void;
}

export default function ClientMarketplaceDashboard({ onViewBusinessProfile }: Props) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<BusinessProject[]>([]);
  const [selectedProject, setSelectedProject] = useState<BusinessProject | null>(null);
  const [proposals, setProposals] = useState<(BusinessProposal & { businessProfile?: BusinessProfile, score?: number, matchReason?: string })[]>([]);
  
  const [loadingProposals, setLoadingProposals] = useState(false);
  const [rankingWithAI, setRankingWithAI] = useState(false);

  // Load client's posted business requirements
  useEffect(() => {
    if (!user) return;
    const fetchProjects = async () => {
      try {
        const q = query(
          collection(db, 'business_projects'),
          where('clientId', '==', user.id)
        );
        const snap = await getDocs(q);
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as BusinessProject));
        setProjects(list);
        if (list.length > 0) {
          setSelectedProject(list[0]);
        }
      } catch (error) {
        console.error("Error fetching projects:", error);
        toast.error("Failed to load your posted requirements");
      } finally {
        setLoading(false);
      }
    };
    fetchProjects();
  }, [user]);

  // Load proposals whenever selected project changes
  useEffect(() => {
    if (!selectedProject) {
      setProposals([]);
      return;
    }

    const fetchProposals = async () => {
      setLoadingProposals(true);
      try {
        const q = query(
          collection(db, 'business_proposals'),
          where('businessProjectId', '==', selectedProject.id)
        );
        const snap = await getDocs(q);
        const proposalsList = snap.docs.map(d => ({ id: d.id, ...d.data() } as BusinessProposal));
        
        // Fetch matching business profile data for rich rendering
        const enriched = await Promise.all(proposalsList.map(async prop => {
          const profSnap = await getDoc(doc(db, 'business_profiles', prop.businessProfileId));
          return {
            ...prop,
            businessProfile: profSnap.exists() ? (profSnap.data() as BusinessProfile) : undefined
          };
        }));

        setProposals(enriched);
      } catch (error) {
        console.error("Error loading proposals:", error);
        toast.error("Failed to load proposals for this project");
      } finally {
        setLoadingProposals(false);
      }
    };

    fetchProposals();
  }, [selectedProject]);

  const handleAiCompare = async () => {
    if (!selectedProject || proposals.length === 0) {
      toast.error("No proposals available to compare.");
      return;
    }
    setRankingWithAI(true);
    try {
      const simplifiedProfiles = proposals.map(p => ({
        businessProfileId: p.businessProfileId,
        companyName: p.companyName || 'Sourcing Agent',
        industry: p.businessProfile?.industry || '',
        services: p.businessProfile?.services || [],
        experience: p.businessProfile?.experience || '',
        ratings: p.businessProfile?.ratings || 5.0,
        teamSize: p.businessProfile?.teamSize || 1,
        bidAmount: p.bidAmount,
        timeline: p.timeline,
        coverLetter: p.coverLetter
      }));

      const response = await fetch('/api/ai/match-businesses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project: {
            title: selectedProject.title,
            description: selectedProject.description,
            budget: selectedProject.budget,
            category: selectedProject.category,
            country: selectedProject.country,
            timeline: selectedProject.timeline
          },
          businessProfiles: simplifiedProfiles
        })
      });

      if (!response.ok) throw new Error("AI ranking failed");
      const data = await response.json();
      
      if (data.matches && Array.isArray(data.matches)) {
        const rankedProposals = proposals.map(p => {
          const match = data.matches.find((m: any) => m.businessProfileId === p.businessProfileId);
          return match ? { ...p, score: match.score, matchReason: match.reason } : p;
        });

        // Sort by match score descending
        rankedProposals.sort((a, b) => (b.score || 0) - (a.score || 0));
        setProposals(rankedProposals);
        toast.success("Proposals compared and ranked using Gemini Match scores!");
      }
    } catch (error) {
      console.error(error);
      toast.error("AI matchmaking comparison failed. Try manual evaluation.");
    } finally {
      setRankingWithAI(false);
    }
  };

  const handleUpdateStatus = async (proposalId: string, status: BusinessProposal['status']) => {
    if (!selectedProject) return;
    try {
      const propRef = doc(db, 'business_proposals', proposalId);
      await updateDoc(propRef, { status });

      // If Hired, update the business project to status HIRED and lock hired id
      if (status === 'HIRED') {
        const projectRef = doc(db, 'business_projects', selectedProject.id);
        await updateDoc(projectRef, { status: 'HIRED' });
        setSelectedProject({ ...selectedProject, status: 'HIRED' });

        const proposal = proposals.find(p => p.id === proposalId);
        if (proposal) {
          // Fund with Escrow from wallet
          const clientRef = doc(db, 'users', user?.id || '');
          const clientSnap = await getDoc(clientRef);
          if (clientSnap.exists()) {
            const clientData = clientSnap.data() as User;
            const walletBalance = clientData.walletBalance || 0;
            if (walletBalance < proposal.bidAmount) {
              toast.error(`Insufficient balance ($${walletBalance.toFixed(2)}) to escrow fund this bid of $${proposal.bidAmount.toFixed(2)}. Please deposit funds in your Wallet first.`);
              return;
            }

            // Deduct funds
            const newBal = walletBalance - proposal.bidAmount;
            await updateDoc(clientRef, { walletBalance: newBal });

            // Create Escrow Transaction record
            await createPaymentRecord({
              userId: user?.id || '',
              type: 'ESCROW_FUND',
              amount: proposal.bidAmount,
              currency: 'USD',
              status: 'COMPLETED',
              description: `Locked Escrow funding for global service provider: "${proposal.companyName}"`,
              projectId: selectedProject.id
            });

            // Notify Business
            await addDoc(collection(db, 'notifications'), {
              userId: proposal.businessProfileId,
              title: 'Proposal Accepted! (Hired)',
              body: `Your proposal of $${proposal.bidAmount} for "${selectedProject.title}" has been ACCEPTED. Escrow funds are locked securely!`,
              read: false,
              type: 'PROJECT_UPDATE',
              link: `/dashboard/marketplace?tab=dashboard`,
              createdAt: new Date().toISOString()
            });

            toast.success(`Hired! Escrow payment of $${proposal.bidAmount.toFixed(2)} has been locked securely.`);
          }
        }
      }

      setProposals(proposals.map(p => p.id === proposalId ? { ...p, status } : p));
      toast.success(`Proposal marked as ${status.toLowerCase()}`);
    } catch (error) {
      console.error(error);
      toast.error("Failed to update status");
    }
  };

  const handleReleaseEscrow = async (proposalId: string) => {
    if (!selectedProject) return;
    const proposal = proposals.find(p => p.id === proposalId);
    if (!proposal) return;

    try {
      // Release Escrow to business provider wallet
      const providerRef = doc(db, 'users', proposal.businessProfileId);
      const providerSnap = await getDoc(providerRef);
      if (providerSnap.exists()) {
        const provData = providerSnap.data() as User;
        const currentBal = provData.walletBalance || 0;
        const newBal = currentBal + proposal.bidAmount;
        await updateDoc(providerRef, { walletBalance: newBal });

        // Update Project and Proposal to completed status
        await updateDoc(doc(db, 'business_proposals', proposalId), { status: 'HIRED' });
        await updateDoc(doc(db, 'business_projects', selectedProject.id), { status: 'COMPLETED' });
        setSelectedProject({ ...selectedProject, status: 'COMPLETED' });

        // Register transaction for Business Provider
        await createPaymentRecord({
          userId: proposal.businessProfileId,
          type: 'ESCROW_RELEASE',
          amount: proposal.bidAmount,
          currency: 'USD',
          status: 'COMPLETED',
          description: `Released Escrow payment received for project: "${selectedProject.title}"`,
          projectId: selectedProject.id
        });

        // Send Notification to provider
        await addDoc(collection(db, 'notifications'), {
          userId: proposal.businessProfileId,
          title: 'Escrow Funds Released!',
          body: `Client released $${proposal.bidAmount.toFixed(2)} for: "${selectedProject.title}". Funds are available in your wallet.`,
          read: false,
          type: 'PROJECT_UPDATE',
          link: `/dashboard/marketplace?tab=dashboard`,
          createdAt: new Date().toISOString()
        });

        toast.success(`Escrow released successfully! $${proposal.bidAmount.toFixed(2)} credited to provider.`);
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to release Escrow");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      
      {/* Top Project Selector */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold font-heading">Manage Posted Business Requirements</h2>
          <p className="text-sm text-muted-foreground">Select a requirement to review and compare proposal bids.</p>
        </div>
        {projects.length > 0 && (
          <select
            value={selectedProject?.id || ''}
            onChange={e => {
              const proj = projects.find(p => p.id === e.target.value);
              if (proj) setSelectedProject(proj);
            }}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2"
          >
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.title} (${p.budget})</option>
            ))}
          </select>
        )}
      </div>

      {projects.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground border border-dashed">
          You have not posted any business marketplace requirements yet. Go to the "Post a Requirement" tab to start!
        </Card>
      ) : selectedProject ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Details on current requirements card */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="border border-border">
              <CardHeader className="border-b border-border">
                <div className="flex justify-between items-start gap-2">
                  <Badge variant="outline" className="border-primary/20 text-primary">{selectedProject.category}</Badge>
                  <Badge className={
                    selectedProject.status === 'OPEN' ? "bg-green-500/10 text-green-500 border-green-500/20" :
                    selectedProject.status === 'HIRED' ? "bg-blue-500/10 text-blue-500 border-blue-500/20" :
                    "bg-stone-500/10 text-stone-500 border-stone-500/20"
                  }>
                    {selectedProject.status}
                  </Badge>
                </div>
                <CardTitle className="text-xl font-bold font-heading pt-2">{selectedProject.title}</CardTitle>
                <CardDescription>Posted on {new Date(selectedProject.createdAt).toLocaleDateString()}</CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-4 text-sm">
                <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">{selectedProject.description}</p>
                
                <div className="pt-4 border-t border-border space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Estimated Budget</span>
                    <span className="font-semibold text-foreground">${selectedProject.budget}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Region Target</span>
                    <span className="font-medium text-foreground">{selectedProject.country}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Language</span>
                    <span className="font-medium text-foreground">{selectedProject.language}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Timeline</span>
                    <span className="font-medium text-foreground">{selectedProject.timeline}</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-2">
                  {selectedProject.skillsRequired.map(s => (
                    <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Proposals List, comparing, hiring */}
          <div className="lg:col-span-2 space-y-6">
            
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-lg font-heading flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" /> Received Proposal Bids ({proposals.length})
              </h3>
              {proposals.length > 0 && selectedProject.status === 'OPEN' && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleAiCompare}
                  disabled={rankingWithAI}
                  className="border-purple-500/30 text-purple-600 dark:text-purple-400 hover:bg-purple-500/10"
                >
                  {rankingWithAI ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Matching...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" /> Gemini AI Match Comparison
                    </>
                  )}
                </Button>
              )}
            </div>

            {loadingProposals ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : proposals.length === 0 ? (
              <Card className="p-12 text-center text-muted-foreground border border-dashed">
                No active bids or proposals submitted for this requirement yet.
              </Card>
            ) : (
              <div className="space-y-4">
                {proposals.map((prop, idx) => {
                  const isHired = prop.status === 'HIRED';
                  return (
                    <motion.div key={prop.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}>
                      <Card className={`border hover:border-primary/30 transition-all ${isHired ? "border-primary/40 bg-primary/5" : "border-border"}`}>
                        <CardContent className="p-5 space-y-4">
                          
                          {/* Header of Proposal */}
                          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div className="flex items-center gap-3">
                              <img 
                                src={prop.logo || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=80&auto=format&fit=crop&q=80'} 
                                alt={prop.companyName} 
                                className="w-12 h-12 rounded-lg object-cover border border-border"
                              />
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <h4 className="font-bold text-base hover:underline cursor-pointer" onClick={() => onViewBusinessProfile(prop.businessProfileId)}>
                                    {prop.companyName}
                                  </h4>
                                  {prop.businessProfile?.isVerified && (
                                    <CheckCircle2 className="w-4 h-4 text-primary fill-primary/10 shrink-0" />
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground">{prop.businessProfile?.country} • {prop.businessProfile?.experience} exp</p>
                              </div>
                            </div>
                            
                            <div className="flex flex-col items-end gap-1.5 shrink-0">
                              <span className="font-extrabold text-lg text-primary">${prop.bidAmount}</span>
                              <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Timeline: {prop.timeline}</span>
                            </div>
                          </div>

                          {/* AI Match rating banner if loaded */}
                          {prop.score !== undefined && (
                            <div className="bg-purple-500/5 border border-purple-500/20 rounded-xl p-3 flex items-start gap-3">
                              <Sparkles className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-purple-600 dark:text-purple-400">Gemini Match Score:</span>
                                  <Badge className="bg-purple-500/10 text-purple-600 dark:text-purple-400 text-[10px] h-4 font-extrabold">{prop.score}%</Badge>
                                </div>
                                <p className="text-xs text-purple-600/95 dark:text-purple-400/95 leading-relaxed">{prop.matchReason}</p>
                              </div>
                            </div>
                          )}

                          {/* Cover letter text */}
                          <div className="space-y-1.5 text-sm">
                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Proposal Cover Pitch</span>
                            <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap bg-accent/20 border border-border p-3.5 rounded-xl">{prop.coverLetter}</p>
                          </div>

                          {/* Proposal actions */}
                          <div className="pt-4 border-t border-border flex justify-between items-center flex-wrap gap-4">
                            <Button variant="ghost" size="sm" onClick={() => onViewBusinessProfile(prop.businessProfileId)}>
                              View Full Credentials <ArrowRight className="w-4 h-4 ml-1" />
                            </Button>

                            <div className="flex gap-2">
                              {prop.status === 'PENDING' && selectedProject.status === 'OPEN' && (
                                <>
                                  <Button variant="outline" size="sm" onClick={() => handleUpdateStatus(prop.id, 'REJECTED')} className="text-red-500 hover:text-red-600 hover:bg-red-500/5">
                                    <X className="w-4 h-4 mr-1" /> Reject
                                  </Button>
                                  <Button size="sm" onClick={() => handleUpdateStatus(prop.id, 'HIRED')}>
                                    <CheckCircle2 className="w-4 h-4 mr-1" /> Accept & Escrow Lock
                                  </Button>
                                </>
                              )}

                              {isHired && selectedProject.status === 'HIRED' && (
                                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => handleReleaseEscrow(prop.id)}>
                                  <CheckCircle2 className="w-4 h-4 mr-1" /> Release Escrow Funds
                                </Button>
                              )}

                              {prop.status === 'REJECTED' && (
                                <Badge variant="outline" className="border-red-500/20 text-red-500">Rejected</Badge>
                              )}

                              {selectedProject.status === 'COMPLETED' && isHired && (
                                <Badge variant="outline" className="border-emerald-500/20 text-emerald-500 flex items-center gap-1">
                                  <CheckCircle2 className="w-3.5 h-3.5" /> Project Successfully Completed & Paid
                                </Badge>
                              )}
                            </div>
                          </div>

                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            )}

          </div>

        </div>
      ) : null}

    </div>
  );
}
