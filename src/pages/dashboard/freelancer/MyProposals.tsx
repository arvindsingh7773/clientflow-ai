import React, { useEffect, useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { db } from '../../../lib/firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { Proposal, Project } from '../../../types';
import { Card, CardContent } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Briefcase, Clock, CheckCircle, XCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';

export function MyProposals() {
  const { user } = useAuth();
  const [proposals, setProposals] = useState<(Proposal & { projectTitle?: string })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProposals = async () => {
      if (!user) return;
      try {
        const q = query(
          collection(db, 'proposals'),
          where('freelancerId', '==', user.id)
        );
        const snapshot = await getDocs(q);
        
        const propsData = await Promise.all(snapshot.docs.map(async (d) => {
          const data = d.data() as Proposal;
          let projectTitle = 'Unknown Project';
          try {
            const projDoc = await getDoc(doc(db, 'projects', data.projectId));
            if (projDoc.exists()) {
              projectTitle = (projDoc.data() as Project).title;
            }
          } catch (e) {
            console.error(e);
          }
          return { id: d.id, ...data, projectTitle };
        }));
        
        propsData.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setProposals(propsData);
      } catch (error) {
        console.error("Error fetching proposals:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProposals();
  }, [user]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING': return <Clock className="w-4 h-4 text-blue-500" />;
      case 'SHORTLISTED': return <CheckCircle className="w-4 h-4 text-purple-500" />;
      case 'ACCEPTED': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'REJECTED': return <XCircle className="w-4 h-4 text-red-500" />;
      default: return null;
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold font-heading">My Proposals</h1>
          <p className="text-muted-foreground mt-1">Track the status of your submitted bids.</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-4 sm:p-6">
          {loading ? (
            <div className="py-12 text-center text-muted-foreground animate-pulse">Loading proposals...</div>
          ) : proposals.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-accent flex items-center justify-center mx-auto mb-4">
                <Briefcase className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No proposals yet</h3>
              <p className="text-muted-foreground mb-6">You haven't submitted any proposals.</p>
              <Link to="/dashboard/freelancer/browse">
                <Button variant="outline">Browse Projects</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {proposals.map((proposal, index) => (
                <motion.div
                  key={proposal.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <div className="border border-border rounded-2xl p-6 hover:bg-accent/20 transition-all">
                    <div className="flex flex-col md:flex-row justify-between gap-4">
                      <div className="space-y-3 flex-1">
                        <div className="flex items-center justify-between">
                          <Link to={`/dashboard/freelancer/projects/${proposal.projectId}`} className="text-xl font-bold font-heading hover:text-primary transition-colors">
                            {proposal.projectTitle}
                          </Link>
                          <Badge 
                            variant={proposal.status === 'ACCEPTED' ? 'default' : proposal.status === 'REJECTED' ? 'outline' : 'secondary'}
                            className={`flex items-center gap-1.5 ${proposal.status === 'REJECTED' ? 'text-red-500 border-red-500/50' : ''}`}
                          >
                            {getStatusIcon(proposal.status)}
                            {proposal.status}
                          </Badge>
                        </div>
                        
                        <p className="text-muted-foreground line-clamp-2 text-sm">{proposal.coverLetter}</p>
                        
                        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground pt-2">
                          <span className="font-semibold text-foreground">Bid: ${proposal.bidAmount}</span>
                          <span>•</span>
                          <span>Duration: {proposal.estimatedDays} days</span>
                          <span>•</span>
                          <span>Submitted {new Date(proposal.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Inline Button import since it's missing in the imports above
import { Button } from '../../../components/ui/button';
