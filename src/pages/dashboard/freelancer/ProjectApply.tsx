import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { db } from '../../../lib/firebase';
import { doc, getDoc, collection, addDoc, updateDoc, increment, query, where, getDocs } from 'firebase/firestore';
import { Project } from '../../../types';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Textarea } from '../../../components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { ArrowLeft, Loader2, DollarSign, Clock, Sparkles } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { motion } from 'motion/react';
import { ProjectWorkspace } from '../client/ProjectWorkspace';

export function ProjectApply() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [generatingAi, setGeneratingAi] = useState(false);

  const [formData, setFormData] = useState({
    coverLetter: '',
    bidAmount: '',
    estimatedDays: '',
  });

  const handleGenerateAiProposal = async () => {
    if (!user || !project) return;
    setGeneratingAi(true);
    try {
      // Fetch freelancer profile for better context
      let profileData = null;
      try {
        const q = query(collection(db, 'freelancer_profiles'), where('userId', '==', user.id));
        const docSnap = await getDocs(q);
        if (!docSnap.empty) {
          profileData = docSnap.docs[0].data();
        }
      } catch (e) {
        console.error("Could not fetch profile for AI", e);
      }

      const response = await fetch('/api/ai/generate-proposal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project,
          freelancerProfile: profileData || { name: user.name, role: user.role }
        })
      });

      if (!response.ok) throw new Error('Failed to generate proposal');
      
      const data = await response.json();
      if (data.proposal) {
        setFormData(prev => ({ ...prev, coverLetter: data.proposal }));
        toast.success("AI generated a proposal draft!");
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to generate AI proposal");
    } finally {
      setGeneratingAi(false);
    }
  };

  useEffect(() => {
    const fetchProject = async () => {
      if (!id) return;
      try {
        const docRef = doc(db, 'projects', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setProject({ id: docSnap.id, ...docSnap.data() } as Project);
        } else {
          toast.error("Project not found");
          navigate('/dashboard/freelancer/browse');
        }
      } catch (error) {
        console.error(error);
        toast.error("Error fetching project");
      } finally {
        setLoading(false);
      }
    };
    fetchProject();
  }, [id, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !project || !id) return;
    
    setSubmitting(true);
    try {
      // 1. Create Proposal
      const proposalData = {
        projectId: id,
        freelancerId: user.id,
        coverLetter: formData.coverLetter,
        bidAmount: Number(formData.bidAmount),
        estimatedDays: Number(formData.estimatedDays),
        status: 'PENDING',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await addDoc(collection(db, 'proposals'), proposalData);

      // 2. Increment proposalsCount on Project
      const projectRef = doc(db, 'projects', id);
      await updateDoc(projectRef, {
        proposalsCount: increment(1)
      });

      toast.success('Proposal submitted successfully!');
      navigate('/dashboard/freelancer/proposals');
    } catch (error) {
      console.error(error);
      toast.error('Failed to submit proposal');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-muted-foreground animate-pulse">Loading project details...</div>;
  }

  if (!project) return null;

  const isHired = project.hiredFreelancerId === user?.id;

  return (
    <div className="max-w-5xl mx-auto pb-12">
      <div className="mb-6">
        <button 
          onClick={() => navigate(isHired ? '/dashboard/freelancer/proposals' : '/dashboard/freelancer/browse')}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-primary transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card>
              <CardContent className="p-8">
                <div className="flex items-center gap-3 mb-4">
                  <Badge variant="glass" className="bg-primary/10 text-primary border-primary/20">{project.category}</Badge>
                  {isHired && (
                    <Badge variant="default" className="bg-green-600 text-white border-green-600">
                      You are Hired for this project!
                    </Badge>
                  )}
                  {!isHired && (
                    <span className="text-sm text-muted-foreground font-medium">Posted {new Date(project.createdAt).toLocaleDateString()}</span>
                  )}
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

          {!isHired && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card>
                <CardHeader>
                  <CardTitle>Submit Proposal</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Bid Amount ({project.currency})</label>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input 
                            type="number"
                            placeholder="e.g. 1500" 
                            className="pl-9"
                            value={formData.bidAmount}
                            onChange={e => setFormData({...formData, bidAmount: e.target.value})}
                            required
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Estimated Time (Days)</label>
                        <div className="relative">
                          <Clock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input 
                            type="number"
                            placeholder="e.g. 14" 
                            className="pl-9"
                            value={formData.estimatedDays}
                            onChange={e => setFormData({...formData, estimatedDays: e.target.value})}
                            required
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium">Cover Letter</label>
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm" 
                          className="text-purple-500 border-purple-500/30 hover:bg-purple-500/10"
                          onClick={handleGenerateAiProposal}
                          disabled={generatingAi}
                        >
                          {generatingAi ? <Loader2 className="w-3 h-3 mr-2 animate-spin" /> : <Sparkles className="w-3 h-3 mr-2" />}
                          Generate with AI
                        </Button>
                      </div>
                      <Textarea 
                        placeholder="Introduce yourself and explain why you're a great fit for this project..." 
                        className="min-h-[200px]"
                        value={formData.coverLetter}
                        onChange={e => setFormData({...formData, coverLetter: e.target.value})}
                        required
                      />
                    </div>

                    <Button type="submit" size="lg" className="w-full" disabled={submitting}>
                      {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Submit Proposal
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {isHired && (
            <ProjectWorkspace project={project} />
          )}
        </div>

        <div className="space-y-6">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card>
              <CardContent className="p-6 space-y-6">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">Client Budget</h3>
                  <p className="text-2xl font-bold font-heading text-primary">
                    {project.currency} {project.budgetMin} - {project.budgetMax}
                  </p>
                </div>
                <div className="pt-4 border-t border-border">
                  <div className="flex items-center justify-between text-sm mb-3">
                    <span className="text-muted-foreground">Proposals Submitted</span>
                    <span className="font-semibold">{project.proposalsCount}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Deadline</span>
                    <span className="font-semibold">{project.deadline || 'Not set'}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
