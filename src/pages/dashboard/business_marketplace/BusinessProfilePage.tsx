import React, { useState, useEffect } from 'react';
import { db } from '../../../lib/firebase';
import { doc, getDoc, updateDoc, arrayUnion, collection, addDoc, getDocs, query, where } from 'firebase/firestore';
import { useAuth } from '../../../contexts/AuthContext';
import { BusinessProfile, BusinessProject } from '../../../types';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Input } from '../../../components/ui/input';
import { Textarea } from '../../../components/ui/textarea';
import { toast } from 'react-hot-toast';
import { 
  Building2, 
  MapPin, 
  Globe, 
  Award, 
  Users, 
  Star, 
  CheckCircle2, 
  Send, 
  Bookmark, 
  Briefcase, 
  MessageSquare, 
  ArrowLeft,
  Loader2,
  ExternalLink,
  Linkedin,
  Twitter,
  Github
} from 'lucide-react';
import { motion } from 'motion/react';

interface Props {
  businessId: string;
  onBack: () => void;
}

export default function BusinessProfilePage({ businessId, onBack }: Props) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [inviting, setInviting] = useState(false);
  const [shortlisted, setShortlisted] = useState(false);
  const [projects, setProjects] = useState<BusinessProject[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [inviteMessage, setInviteMessage] = useState('');
  const [inviteOpen, setInviteOpen] = useState(false);
  
  // Review adding state
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    const fetchProfileAndProjects = async () => {
      try {
        // Fetch Profile
        const docSnap = await getDoc(doc(db, 'business_profiles', businessId));
        if (docSnap.exists()) {
          const profileData = docSnap.data() as BusinessProfile;
          setProfile(profileData);
          
          // Check if already shortlisted (stored on user doc or locally in simulating user data)
          if (user) {
            const userSnap = await getDoc(doc(db, 'users', user.id));
            if (userSnap.exists()) {
              const userData = userSnap.data();
              if (userData.shortlistedBusinesses?.includes(businessId)) {
                setShortlisted(true);
              }
            }
          }
        } else {
          toast.error("Business profile not found");
        }

        // Fetch client's business projects to invite
        if (user) {
          const q = query(
            collection(db, 'business_projects'),
            where('clientId', '==', user.id),
            where('status', '==', 'OPEN')
          );
          const snap = await getDocs(q);
          setProjects(snap.docs.map(d => ({ id: d.id, ...d.data() } as BusinessProject)));
        }
      } catch (error) {
        console.error(error);
        toast.error("Error loading business profile");
      } finally {
        setLoading(false);
      }
    };

    fetchProfileAndProjects();
  }, [businessId, user]);

  const handleShortlist = async () => {
    if (!user) {
      toast.error("Please login to shortlist businesses");
      return;
    }
    try {
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, {
        shortlistedBusinesses: arrayUnion(businessId)
      });
      setShortlisted(true);
      toast.success(`${profile?.companyName} added to shortlists!`);
    } catch (error) {
      console.error(error);
      toast.error("Failed to shortlist");
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId) {
      toast.error("Please select a project requirement to invite them to");
      return;
    }
    setInviting(true);
    try {
      const selectedProject = projects.find(p => p.id === selectedProjectId);
      
      // Save notification/invite
      await addDoc(collection(db, 'notifications'), {
        userId: businessId,
        title: 'Project Invitation!',
        body: `${user?.displayName || 'A client'} has invited your organization to propose on: "${selectedProject?.title}". Message: "${inviteMessage}"`,
        read: false,
        type: 'BUSINESS_INVITE',
        link: `/dashboard/marketplace?tab=dashboard`,
        createdAt: new Date().toISOString()
      });

      // Track invite in invitations collection
      await addDoc(collection(db, 'business_invitations'), {
        clientId: user?.id,
        businessProfileId: businessId,
        projectId: selectedProjectId,
        message: inviteMessage,
        createdAt: new Date().toISOString()
      });

      toast.success("Invitation sent successfully!");
      setInviteOpen(false);
      setInviteMessage('');
    } catch (error) {
      console.error(error);
      toast.error("Failed to send invitation");
    } finally {
      setInviting(false);
    }
  };

  const handleAddReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("Please log in to submit a review");
      return;
    }
    if (!newComment.trim()) {
      toast.error("Please enter a review message");
      return;
    }
    setSubmittingReview(true);
    try {
      const newReview = {
        authorName: user.displayName || 'Verified Client',
        rating: newRating,
        comment: newComment.trim(),
        date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
      };

      const updatedReviews = [...(profile?.reviews || []), newReview];
      const avgRating = updatedReviews.reduce((sum, r) => sum + r.rating, 0) / updatedReviews.length;

      await updateDoc(doc(db, 'business_profiles', businessId), {
        reviews: updatedReviews,
        ratings: avgRating
      });

      setProfile(prev => prev ? { ...prev, reviews: updatedReviews, ratings: avgRating } : null);
      setNewComment('');
      toast.success("Review posted successfully!");
    } catch (error) {
      console.error(error);
      toast.error("Failed to post review");
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-20 space-y-4">
        <p className="text-muted-foreground">Business profile not found.</p>
        <Button onClick={onBack} variant="outline"><ArrowLeft className="w-4 h-4 mr-2" /> Back to Marketplace</Button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-16">
      
      {/* Back Button */}
      <Button onClick={onBack} variant="ghost" className="hover:bg-accent/50">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Marketplace
      </Button>

      {/* Banner & Logo Header Card */}
      <Card className="overflow-hidden border border-border">
        <div className="h-48 md:h-64 relative bg-accent">
          <img 
            src={profile.banner || 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=1200&auto=format&fit=crop&q=80'} 
            alt="Company Banner" 
            className="w-full h-full object-cover"
          />
          {profile.isOnline && (
            <Badge className="absolute top-4 right-4 bg-emerald-500/95 hover:bg-emerald-500 text-white flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span> Online Now
            </Badge>
          )}
        </div>
        
        <CardContent className="relative pt-16 pb-6 px-6">
          {/* Logo container overlapping banner */}
          <div className="absolute -top-16 left-6 w-24 h-24 md:w-28 md:h-28 rounded-2xl border-4 border-card bg-background overflow-hidden shadow-lg">
            <img 
              src={profile.logo || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&auto=format&fit=crop&q=80'} 
              alt={profile.companyName} 
              className="w-full h-full object-cover"
            />
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-bold font-heading">{profile.companyName}</h1>
                {profile.isVerified && (
                  <CheckCircle2 className="w-6 h-6 text-primary fill-primary/10 shrink-0" title="Verified Business" />
                )}
              </div>
              
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4 text-muted-foreground" /> {profile.country}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Briefcase className="w-4 h-4 text-muted-foreground" /> {profile.industry}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Users className="w-4 h-4 text-muted-foreground" /> Team Size: {profile.teamSize}
                </span>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap gap-2 shrink-0">
              {profile.website && (
                <a href={profile.website} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm">
                    <Globe className="w-4 h-4 mr-1.5" /> Website <ExternalLink className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </a>
              )}
              
              <Button 
                variant={shortlisted ? "secondary" : "outline"} 
                size="sm" 
                onClick={handleShortlist} 
                disabled={shortlisted}
                className={shortlisted ? "text-primary border-primary/20 bg-primary/5" : ""}
              >
                <Bookmark className={`w-4 h-4 mr-1.5 ${shortlisted ? "fill-primary" : ""}`} /> 
                {shortlisted ? "Shortlisted" : "Shortlist"}
              </Button>

              <Button size="sm" onClick={() => setInviteOpen(true)}>
                <Send className="w-4 h-4 mr-1.5" /> Invite to Project
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Invite Modal / Section */}
      {inviteOpen && (
        <Card className="border-primary/20 bg-accent/5">
          <CardHeader>
            <CardTitle className="text-lg font-bold">Invite {profile.companyName} to Submit a Proposal</CardTitle>
          </CardHeader>
          <CardContent>
            {projects.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                You do not have any open active requirements. Create a Business Requirement project first in the "Post a Requirement" tab.
              </p>
            ) : (
              <form onSubmit={handleInvite} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Select Business Project Requirement</label>
                  <select 
                    value={selectedProjectId} 
                    onChange={e => setSelectedProjectId(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    required
                  >
                    <option value="">Choose requirement...</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.title} - ${p.budget}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Invitation Message</label>
                  <Textarea 
                    value={inviteMessage}
                    onChange={e => setInviteMessage(e.target.value)}
                    placeholder="We would love your team to look at our business requirements..."
                    rows={3}
                    required
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="outline" onClick={() => setInviteOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={inviting}>
                    {inviting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : "Send Invitation"}
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      )}

      {/* Profile Details Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Col - Overview, Certifications, Contacts */}
        <div className="space-y-6 lg:col-span-1">
          {/* Key Stats */}
          <Card className="border border-border">
            <CardContent className="p-6 space-y-4">
              <h3 className="font-semibold text-foreground border-b border-border pb-2">Business Snapshot</h3>
              
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Established Experience</span>
                <span className="font-medium text-foreground">{profile.experience}</span>
              </div>
              
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Average Rating</span>
                <span className="font-medium text-foreground flex items-center gap-1 text-amber-500">
                  <Star className="w-4 h-4 fill-amber-500 text-amber-500" /> {profile.ratings.toFixed(1)} / 5.0
                </span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Team Size</span>
                <span className="font-medium text-foreground">{profile.teamSize} professional specialists</span>
              </div>

              {profile.socialLinks && (
                <div className="flex gap-3 pt-3 border-t border-border justify-center">
                  {profile.socialLinks.linkedin && (
                    <a href={profile.socialLinks.linkedin} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary">
                      <Linkedin className="w-5 h-5" />
                    </a>
                  )}
                  {profile.socialLinks.twitter && (
                    <a href={profile.socialLinks.twitter} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary">
                      <Twitter className="w-5 h-5" />
                    </a>
                  )}
                  {profile.socialLinks.github && (
                    <a href={profile.socialLinks.github} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary">
                      <Github className="w-5 h-5" />
                    </a>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Services offered */}
          <Card className="border border-border">
            <CardContent className="p-6 space-y-3">
              <h3 className="font-semibold text-foreground border-b border-border pb-2">Services Provided</h3>
              <div className="flex flex-wrap gap-2 pt-1">
                {profile.services && profile.services.length > 0 ? (
                  profile.services.map(s => (
                    <Badge key={s} variant="secondary" className="rounded-full">{s}</Badge>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground">No services declared yet.</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Certifications and Audits */}
          <Card className="border border-border">
            <CardContent className="p-6 space-y-3">
              <h3 className="font-semibold text-foreground border-b border-border pb-2">Certifications & Accreditations</h3>
              <div className="space-y-2 pt-1">
                {profile.certifications && profile.certifications.length > 0 ? (
                  profile.certifications.map(c => (
                    <div key={c} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Award className="w-4 h-4 text-primary shrink-0" />
                      <span>{c}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground">No accreditation tags listed.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Col - Portfolio and Reviews */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Portfolio Section */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold font-heading flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-primary" /> Showcase Portfolio
            </h2>
            
            {profile.portfolio && profile.portfolio.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {profile.portfolio.map((item, index) => (
                  <motion.div 
                    key={index} 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className="overflow-hidden h-full border border-border bg-card/40 hover:border-primary/40 transition-colors">
                      {item.imageUrl && (
                        <div className="h-36 overflow-hidden border-b border-border">
                          <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                        </div>
                      )}
                      <CardContent className="p-4 space-y-2">
                        <h4 className="font-semibold text-sm text-foreground line-clamp-1">{item.title}</h4>
                        <p className="text-xs text-muted-foreground line-clamp-3">{item.description}</p>
                        {item.url && (
                          <a 
                            href={item.url} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-xs text-primary hover:underline font-medium inline-flex items-center gap-1 pt-1"
                          >
                            Live Showcase <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            ) : (
              <Card className="p-6 text-center text-muted-foreground border border-dashed">
                This organization hasn't added portfolio showcases yet.
              </Card>
            )}
          </div>

          {/* Client Reviews Section */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold font-heading flex items-center gap-2">
              <Star className="w-5 h-5 text-primary" /> Ratings & Client Reviews
            </h2>
            
            {/* Review List */}
            <div className="space-y-4">
              {profile.reviews && profile.reviews.length > 0 ? (
                profile.reviews.map((rev, idx) => (
                  <Card key={idx} className="border border-border bg-card/30">
                    <CardContent className="p-4 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-sm">{rev.authorName}</span>
                        <div className="flex items-center gap-1 text-amber-500">
                          {Array.from({ length: rev.rating }).map((_, i) => (
                            <Star key={i} className="w-3.5 h-3.5 fill-amber-500" />
                          ))}
                          <span className="text-xs text-muted-foreground ml-1">{rev.date}</span>
                        </div>
                      </div>
                      <p className="text-xs md:text-sm text-muted-foreground">{rev.comment}</p>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <p className="text-sm text-muted-foreground italic">No feedback reviews submitted yet. Be the first to leave a review below!</p>
              )}
            </div>

            {/* Leave a review */}
            {user && user.id !== businessId && (
              <Card className="border border-border bg-accent/10">
                <CardHeader className="py-3">
                  <CardTitle className="text-sm font-semibold">Post a Verified Client Review</CardTitle>
                </CardHeader>
                <CardContent className="pb-4 pt-0">
                  <form onSubmit={handleAddReview} className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Rating:</span>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map(num => (
                          <button 
                            key={num} 
                            type="button" 
                            onClick={() => setNewRating(num)}
                            className="text-amber-500 hover:scale-110 transition-transform"
                          >
                            <Star className={`w-5 h-5 ${num <= newRating ? "fill-amber-500" : ""}`} />
                          </button>
                        ))}
                      </div>
                    </div>
                    <Textarea 
                      placeholder="Share your experience working with this business or agency..."
                      value={newComment}
                      onChange={e => setNewComment(e.target.value)}
                      rows={2}
                      required
                    />
                    <div className="flex justify-end">
                      <Button type="submit" size="sm" disabled={submittingReview}>
                        {submittingReview ? "Posting..." : "Submit Review"}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

          </div>

        </div>

      </div>

    </div>
  );
}
