import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { db } from '../../../lib/firebase';
import { doc, getDoc, updateDoc, deleteDoc, collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { Project, ProjectStatus, Proposal } from '../../../types';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { ArrowLeft, Edit, Trash2, Globe, Clock, CheckCircle, FileText, Check, XCircle, Sparkles } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { motion } from 'motion/react';
import { ProjectWorkspace } from './ProjectWorkspace';

export function ProjectDetails() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [project, setProject] = useState<Project | null>(null);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showProposals, setShowProposals] = useState(false);

  useEffect(() => {
    const fetchProjectAndProposals = async () => {
      if (!id) return;
      try {
        const docRef = doc(db, 'projects', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = { id: docSnap.id, ...docSnap.data() } as Project;
          if (data.clientId !== user?.id) {
            toast.error("Unauthorized access");
            navigate('/dashboard/projects');
            return;
          }
          setProject(data);

          // Fetch proposals
          const q = query(collection(db, 'proposals'), where('projectId', '==', id));
          const propSnap = await getDocs(q);
          const propData = propSnap.docs.map(d => ({ id: d.id, ...d.data() } as Proposal));
          propData.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          setProposals(propData);

        } else {
          toast.error("Project not found");
          navigate('/dashboard/projects');
        }
      } catch (error) {
        console.error(error);
        toast.error("Error fetching project");
      } finally {
        setLoading(false);
      }
    };
    fetchProjectAndProposals();
  }, [id, user, navigate]);

  const handleDelete = async () => {
    if (!id || !window.confirm('Are you sure you want to delete this project? This action cannot be undone.')) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'projects', id));
      toast.success('Project deleted');
      navigate('/dashboard/projects');
    } catch (error) {
      toast.error('Failed to delete project');
      setIsDeleting(false);
    }
  };

  const handleUpdateStatus = async (status: ProjectStatus) => {
    if (!id || !project) return;
    setIsUpdating(true);
    try {
      await updateDoc(doc(db, 'projects', id), { 
        status, 
        updatedAt: new Date().toISOString() 
      });
      setProject({ ...project, status });
      toast.success(`Project marked as ${status}`);
    } catch (error) {
      toast.error('Failed to update project status');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleProposalStatus = async (proposalId: string, freelancerId: string, newStatus: 'SHORTLISTED' | 'ACCEPTED' | 'REJECTED') => {
    try {
      await updateDoc(doc(db, 'proposals', proposalId), {
        status: newStatus,
        updatedAt: new Date().toISOString()
      });
      setProposals(proposals.map(p => p.id === proposalId ? { ...p, status: newStatus } : p));
      
      if (newStatus === 'ACCEPTED' && project && id) {
        // Update project status to IN_PROGRESS
        await updateDoc(doc(db, 'projects', id), {
          status: 'IN_PROGRESS',
          hiredFreelancerId: freelancerId,
          updatedAt: new Date().toISOString()
        });
        setProject({ ...project, status: 'IN_PROGRESS', hiredFreelancerId: freelancerId });
        
        // Send Notification
        await addDoc(collection(db, 'notifications'), {
          userId: freelancerId,
          title: 'Proposal Accepted!',
          body: `Your proposal for ${project.title} has been accepted. You are hired!`,
          read: false,
          type: 'PROPOSAL_ACCEPTED',
          createdAt: new Date().toISOString(),
          link: `/dashboard/freelancer/projects/${id}`
        });

        // Create Chat Room
        if (user) {
          const qRoom = query(collection(db, 'chatRooms'), where('participantIds', 'array-contains', user.id));
          const roomSnap = await getDocs(qRoom);
          const existingRoom = roomSnap.docs.find(d => d.data().participantIds.includes(freelancerId));
          
          if (!existingRoom) {
            await addDoc(collection(db, 'chatRooms'), {
              participantIds: [user.id, freelancerId],
              participantNames: {
                [user.id]: user.name,
                [freelancerId]: 'Freelancer' // Would be better to fetch name, but simplified here
              },
              lastMessage: 'Project started!',
              lastMessageTime: new Date().toISOString(),
              unreadCount: { [freelancerId]: 1, [user.id]: 0 },
              projectId: id
            });
          }
        }
      }
      
      toast.success(`Proposal marked as ${newStatus.toLowerCase()}`);
    } catch (error) {
      console.error(error);
      toast.error('Failed to update proposal status');
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-muted-foreground animate-pulse">Loading project details...</div>;
  }

  if (!project) return null;

  return (
    <div className="max-w-5xl mx-auto pb-12">
      <div className="mb-6 flex items-center justify-between">
        <button 
          onClick={() => navigate('/dashboard/projects')}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-primary transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Projects
        </button>
        <div className="flex items-center gap-2">
          {project.status === 'DRAFT' && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => handleUpdateStatus('OPEN')}
              disabled={isUpdating}
            >
              <Globe className="w-4 h-4 mr-2" /> Publish
            </Button>
          )}
          {project.status === 'OPEN' && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => handleUpdateStatus('COMPLETED')}
              disabled={isUpdating}
            >
              <Check className="w-4 h-4 mr-2" /> Mark Completed
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={() => toast('Edit mode coming soon', { icon: 'ℹ️' })}>
            <Edit className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600 hover:bg-red-500/10" onClick={handleDelete} disabled={isDeleting}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card>
              <CardContent className="p-8">
                <div className="flex items-center gap-3 mb-4">
                  <Badge variant="glass" className="bg-primary/10 text-primary border-primary/20">{project.category}</Badge>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 bg-accent text-foreground border border-border`}>
                    {project.status.replace('_', ' ')}
                  </span>
                </div>
                
                <h1 className="text-3xl font-bold font-heading mb-6">{project.title}</h1>
                
                <div className="prose prose-invert max-w-none mb-8">
                  <div className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                    {project.description}
                  </div>
                </div>

                <div className="pt-6 border-t border-border">
                  <h3 className="font-semibold mb-4">Required Skills</h3>
                  <div className="flex flex-wrap gap-2">
                    {project.skillsRequired.map(skill => (
                      <Badge key={skill} variant="secondary">{skill}</Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        <div className="space-y-6">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card>
              <CardContent className="p-6 space-y-6">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">Budget</h3>
                  <p className="text-2xl font-bold font-heading text-primary">
                    {project.currency} {project.budgetMin} - {project.budgetMax}
                  </p>
                </div>
                <div className="pt-4 border-t border-border">
                  <div className="flex items-center justify-between text-sm mb-3">
                    <span className="text-muted-foreground flex items-center gap-2"><FileText className="w-4 h-4" /> Proposals</span>
                    <span className="font-semibold">{project.proposalsCount}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm mb-3">
                    <span className="text-muted-foreground flex items-center gap-2"><Clock className="w-4 h-4" /> Deadline</span>
                    <span className="font-semibold">{project.deadline || 'Not set'}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-2"><CheckCircle className="w-4 h-4" /> Posted</span>
                    <span className="font-semibold">{new Date(project.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
          
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="space-y-3">
            <Button 
              className="w-full h-12 text-base" 
              disabled={project.status === 'DRAFT' || proposals.length === 0}
              onClick={() => setShowProposals(!showProposals)}
            >
              {showProposals ? 'Hide Proposals' : `View Proposals (${proposals.length})`}
            </Button>
            <Button 
              variant="outline"
              className="w-full h-12 text-base border-purple-500/30 text-purple-500 hover:bg-purple-500/10" 
              onClick={() => {
                navigate(`/dashboard/search?q=${encodeURIComponent(project.title)}&type=freelancers`);
              }}
            >
              <Sparkles className="w-5 h-5 mr-2" /> Find Freelancers
            </Button>
          </motion.div>
        </div>
      </div>

      {showProposals && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-8">
          <h2 className="text-2xl font-bold font-heading mb-6">Proposals Received</h2>
          <div className="space-y-4">
            {proposals.map(proposal => (
              <Card key={proposal.id}>
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row justify-between gap-6">
                    <div className="flex-1 space-y-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold text-lg">Freelancer Proposal</h3>
                          <p className="text-sm text-muted-foreground">Submitted {new Date(proposal.createdAt).toLocaleDateString()}</p>
                        </div>
                        <Badge variant={proposal.status === 'ACCEPTED' ? 'default' : proposal.status === 'REJECTED' ? 'outline' : 'secondary'}>
                          {proposal.status}
                        </Badge>
                      </div>
                      
                      <div className="bg-accent/30 p-4 rounded-lg text-sm whitespace-pre-wrap">
                        {proposal.coverLetter}
                      </div>
                    </div>
                    
                    <div className="w-full md:w-64 space-y-6">
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Bid Amount</p>
                        <p className="text-xl font-bold font-heading text-primary">${proposal.bidAmount}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Estimated Time</p>
                        <p className="font-medium">{proposal.estimatedDays} days</p>
                      </div>
                      
                      {proposal.status === 'PENDING' && (
                        <div className="flex flex-col gap-2 pt-4">
                          <Button size="sm" onClick={() => handleProposalStatus(proposal.id!, proposal.freelancerId, 'SHORTLISTED')}>
                            Shortlist
                          </Button>
                          <Button size="sm" variant="outline" className="text-red-500 hover:text-red-500 hover:bg-red-500/10" onClick={() => handleProposalStatus(proposal.id!, proposal.freelancerId, 'REJECTED')}>
                            Reject
                          </Button>
                        </div>
                      )}
                      
                      {proposal.status === 'SHORTLISTED' && (
                        <div className="flex flex-col gap-2 pt-4">
                          <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => handleProposalStatus(proposal.id!, proposal.freelancerId, 'ACCEPTED')}>
                            Accept & Hire
                          </Button>
                          <Button size="sm" variant="outline" className="text-red-500 hover:text-red-500 hover:bg-red-500/10" onClick={() => handleProposalStatus(proposal.id!, proposal.freelancerId, 'REJECTED')}>
                            Reject
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </motion.div>
      )}

      {(project.status === 'IN_PROGRESS' || project.status === 'UNDER_REVIEW' || project.status === 'COMPLETED') && (
        <ProjectWorkspace project={project} />
      )}
    </div>
  );
}
