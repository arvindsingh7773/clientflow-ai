import React, { useState, useEffect } from 'react';
import { db } from '../../../lib/firebase';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, getDoc } from 'firebase/firestore';
import { Project, Milestone, Review, User } from '../../../types';
import { useAuth } from '../../../contexts/AuthContext';
import { createPaymentRecord } from '../../../lib/payments';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Textarea } from '../../../components/ui/textarea';
import { Badge } from '../../../components/ui/badge';
import { CheckCircle2, Clock, PlayCircle, FileCheck, DollarSign, Plus, Star } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface ProjectWorkspaceProps {
  project: Project;
}

export function ProjectWorkspace({ project }: ProjectWorkspaceProps) {
  const { user } = useAuth();
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Milestone state
  const [newTitle, setNewTitle] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [adding, setAdding] = useState(false);
  
  // Review state
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    fetchData();
  }, [project.id]);

  const fetchData = async () => {
    if (!project.id) return;
    setLoading(true);
    try {
      const qMilestones = query(collection(db, 'milestones'), where('projectId', '==', project.id));
      const snapMilestones = await getDocs(qMilestones);
      setMilestones(snapMilestones.docs.map(d => ({ id: d.id, ...d.data() } as Milestone)));
      
      if (project.status === 'COMPLETED') {
        const qReviews = query(collection(db, 'reviews'), where('projectId', '==', project.id));
        const snapReviews = await getDocs(qReviews);
        setReviews(snapReviews.docs.map(d => ({ id: d.id, ...d.data() } as Review)));
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newAmount || !project.id) return;
    
    setAdding(true);
    try {
      const milestoneData: Milestone = {
        projectId: project.id,
        title: newTitle,
        amount: Number(newAmount),
        status: 'PENDING'
      };
      const docRef = await addDoc(collection(db, 'milestones'), milestoneData);
      setMilestones([...milestones, { ...milestoneData, id: docRef.id }]);
      setNewTitle('');
      setNewAmount('');
      toast.success("Milestone added");
    } catch (error) {
      toast.error("Failed to add milestone");
    } finally {
      setAdding(false);
    }
  };

  const updateMilestoneStatus = async (id: string, status: Milestone['status']) => {
    try {
      const milestone = milestones.find(m => m.id === id);
      if (!milestone) return;

      if (status === 'ACTIVE') {
        // Client is funding this milestone!
        if (!user) return;
        const clientRef = doc(db, 'users', user.id);
        const clientSnap = await getDoc(clientRef);
        if (clientSnap.exists()) {
          const clientData = clientSnap.data() as User;
          const currentBalance = clientData.walletBalance || 0;
          if (currentBalance < milestone.amount) {
            toast.error(`Insufficient balance ($${currentBalance.toFixed(2)}) to fund this milestone ($${milestone.amount.toFixed(2)}). Please go to the Wallet tab to deposit funds.`);
            return;
          }

          // Deduct from balance
          const newBalance = currentBalance - milestone.amount;
          await updateDoc(clientRef, { walletBalance: newBalance });

          // Register transaction
          await createPaymentRecord({
            userId: user.id,
            type: 'ESCROW_FUND',
            amount: milestone.amount,
            currency: 'USD',
            status: 'COMPLETED',
            description: `Locked escrow funds for milestone: "${milestone.title}"`,
            projectId: project.id,
            milestoneId: id
          });
        }
      } else if (status === 'PAID') {
        // Client is releasing the payment to the hired freelancer!
        if (!project.hiredFreelancerId) {
          toast.error("No hired freelancer found for this project.");
          return;
        }

        // Fetch latest freelancer user info to credit their balance
        const freelancerRef = doc(db, 'users', project.hiredFreelancerId);
        const freelancerSnap = await getDoc(freelancerRef);
        if (freelancerSnap.exists()) {
          const freelancerData = freelancerSnap.data() as User;
          const currentBalance = freelancerData.walletBalance || 0;
          const newBalance = currentBalance + milestone.amount;

          await updateDoc(freelancerRef, { walletBalance: newBalance });

          // Register transaction for freelancer
          await createPaymentRecord({
            userId: project.hiredFreelancerId,
            type: 'ESCROW_RELEASE',
            amount: milestone.amount,
            currency: 'USD',
            status: 'COMPLETED',
            description: `Received payment release for milestone: "${milestone.title}"`,
            projectId: project.id,
            milestoneId: id
          });

          // Send notification to freelancer
          await addDoc(collection(db, 'notifications'), {
            userId: project.hiredFreelancerId,
            title: 'Payment Released!',
            body: `The client has released the payment of $${milestone.amount.toFixed(2)} for milestone: "${milestone.title}"`,
            read: false,
            type: 'PROJECT_UPDATE',
            link: `/dashboard/wallet`,
            createdAt: new Date().toISOString()
          });
        }
      }

      await updateDoc(doc(db, 'milestones', id), { status });
      setMilestones(milestones.map(m => m.id === id ? { ...m, status } : m));
      toast.success(`Milestone status updated to ${status}`);
    } catch (error) {
      console.error(error);
      toast.error("Failed to update status");
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !project.id || !project.hiredFreelancerId) return;
    setSubmittingReview(true);
    
    const isClient = user.id === project.clientId;
    const revieweeId = isClient ? project.hiredFreelancerId : project.clientId;
    
    try {
      const reviewData = {
        projectId: project.id,
        reviewerId: user.id,
        revieweeId,
        rating,
        comment,
        createdAt: new Date().toISOString()
      };
      const docRef = await addDoc(collection(db, 'reviews'), reviewData);
      setReviews([...reviews, { ...reviewData, id: docRef.id }]);
      toast.success("Review submitted");
    } catch (error) {
      toast.error("Failed to submit review");
    } finally {
      setSubmittingReview(false);
    }
  };

  const isClient = user?.id === project.clientId;
  const isFreelancer = user?.id === project.hiredFreelancerId;
  const hasReviewed = reviews.some(r => r.reviewerId === user?.id);

  if (loading) return <div className="p-8 text-center animate-pulse">Loading workspace...</div>;

  return (
    <div className="space-y-6 mt-8">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold font-heading">Project Workspace</h2>
        <Badge variant={project.status === 'COMPLETED' ? 'default' : 'secondary'}>
          {project.status.replace('_', ' ')}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Milestones</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {milestones.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground border border-dashed border-border rounded-lg">
              No milestones created yet.
            </div>
          ) : (
            <div className="space-y-4">
              {milestones.map((m, i) => (
                <div key={m.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 border border-border rounded-lg gap-4 bg-card hover:bg-accent/10 transition-colors">
                  <div className="flex items-start gap-4">
                    <div className={`mt-1 rounded-full p-1 
                      ${m.status === 'PENDING' ? 'bg-muted text-muted-foreground' : 
                        m.status === 'ACTIVE' ? 'bg-blue-500/10 text-blue-500' :
                        m.status === 'SUBMITTED' ? 'bg-yellow-500/10 text-yellow-500' :
                        'bg-green-500/10 text-green-500'}`}>
                      {m.status === 'PENDING' && <Clock className="w-4 h-4" />}
                      {m.status === 'ACTIVE' && <PlayCircle className="w-4 h-4" />}
                      {m.status === 'SUBMITTED' && <FileCheck className="w-4 h-4" />}
                      {(m.status === 'APPROVED' || m.status === 'PAID') && <CheckCircle2 className="w-4 h-4" />}
                    </div>
                    <div>
                      <h4 className="font-semibold">{m.title}</h4>
                      <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                        <DollarSign className="w-3 h-3" /> {m.amount}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{m.status}</Badge>
                    
                    {/* Action buttons based on role and status */}
                    {isClient && m.status === 'PENDING' && (
                      <Button size="sm" onClick={() => updateMilestoneStatus(m.id!, 'ACTIVE')}>Fund & Start</Button>
                    )}
                    {isFreelancer && m.status === 'ACTIVE' && (
                      <Button size="sm" onClick={() => updateMilestoneStatus(m.id!, 'SUBMITTED')}>Submit Work</Button>
                    )}
                    {isClient && m.status === 'SUBMITTED' && (
                      <div className="flex gap-2">
                        <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => updateMilestoneStatus(m.id!, 'APPROVED')}>Approve</Button>
                        <Button size="sm" variant="outline" onClick={() => updateMilestoneStatus(m.id!, 'ACTIVE')}>Reject</Button>
                      </div>
                    )}
                    {isClient && m.status === 'APPROVED' && (
                      <Button size="sm" onClick={() => updateMilestoneStatus(m.id!, 'PAID')}>Release Payment</Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {isClient && project.status !== 'COMPLETED' && (
            <form onSubmit={handleAddMilestone} className="flex gap-4 pt-4 border-t border-border mt-4">
              <Input 
                placeholder="Milestone Description" 
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                className="flex-1"
                required
              />
              <Input 
                type="number" 
                placeholder="Amount ($)" 
                value={newAmount}
                onChange={e => setNewAmount(e.target.value)}
                className="w-32"
                required
                min="1"
              />
              <Button type="submit" disabled={adding}>
                <Plus className="w-4 h-4 mr-2" /> Add
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      {project.status === 'COMPLETED' && (
        <Card>
          <CardHeader>
            <CardTitle>Reviews</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {reviews.map(r => (
              <div key={r.id} className="p-4 rounded-lg bg-accent/30 border border-border">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold">{r.reviewerId === user?.id ? 'Your Review' : 'Their Review'}</span>
                  <div className="flex items-center text-yellow-500">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className={`w-4 h-4 ${i < r.rating ? 'fill-current' : 'text-muted'}`} />
                    ))}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">{r.comment}</p>
              </div>
            ))}
            
            {!hasReviewed && (
              <form onSubmit={handleSubmitReview} className="space-y-4 pt-4 border-t border-border mt-4">
                <h4 className="font-medium">Leave a Review</h4>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className="focus:outline-none"
                    >
                      <Star className={`w-6 h-6 ${star <= rating ? 'text-yellow-500 fill-current' : 'text-muted'}`} />
                    </button>
                  ))}
                </div>
                <Textarea 
                  placeholder="Share your experience working on this project..." 
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  required
                />
                <Button type="submit" disabled={submittingReview}>Submit Review</Button>
              </form>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
