import React, { useEffect, useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { db } from '../../../lib/firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { Project } from '../../../types';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Card, CardContent } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Search, Filter, Sparkles, Clock, Globe, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';

export function BrowseProjects() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const isAiMode = searchParams.get('ai') === 'true';

  const [projects, setProjects] = useState<(Project & { score?: number, matchReason?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const q = query(
          collection(db, 'projects'),
          where('status', '==', 'OPEN')
        );
        const snapshot = await getDocs(q);
        let projData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project & { score?: number, matchReason?: string }));
        
        projData.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setProjects(projData);

        if (isAiMode && user) {
          generateAiMatches(projData);
        }
      } catch (error) {
        console.error("Error fetching projects:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProjects();
  }, [isAiMode, user]);

  const generateAiMatches = async (availableProjects: Project[]) => {
    if (!user) return;
    setAiGenerating(true);
    try {
      // Fetch freelancer profile
      const qProfile = query(collection(db, 'freelancer_profiles'), where('userId', '==', user.id));
      const docSnap = await getDocs(qProfile);
      let profileData = null;
      if (!docSnap.empty) {
        profileData = docSnap.docs[0].data();
      }

      const response = await fetch('/api/ai/match-projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          freelancerProfile: profileData || { name: user.name, role: user.role },
          projects: availableProjects
        })
      });
      if (!response.ok) throw new Error('Failed to match projects');
      const data = await response.json();
      
      if (data.matches && Array.isArray(data.matches)) {
        // Apply scores
        const matchedProjects = availableProjects.map(p => {
          const match = data.matches.find((m: any) => m.projectId === p.id);
          return match 
            ? { ...p, score: match.score, matchReason: match.reason } 
            : { ...p, score: undefined, matchReason: undefined };
        }) as (Project & { score?: number, matchReason?: string })[];
        
        // Sort by score
        matchedProjects.sort((a, b) => (b.score || 0) - (a.score || 0));
        setProjects(matchedProjects);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setAiGenerating(false);
    }
  };

  const filteredProjects = projects.filter(p => {
    const matchesSearch = p.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.skillsRequired.some(s => s.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesSearch;
  });

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold font-heading">Find Work</h1>
          <p className="text-muted-foreground mt-1">Browse and apply to projects that match your skills.</p>
        </div>
        <div className="flex items-center gap-4">
          {!isAiMode && (
            <Button 
              variant="outline" 
              onClick={() => generateAiMatches(projects)} 
              disabled={aiGenerating || projects.length === 0}
              className="border-purple-500/30 text-purple-500 hover:bg-purple-500/10"
            >
              <Sparkles className="w-4 h-4 mr-2" /> 
              AI Rank Projects
            </Button>
          )}
          {isAiMode && (
            <Badge variant="glass" className="bg-primary/10 text-primary border-primary/20 text-sm px-3 py-1">
              <Sparkles className="w-4 h-4 mr-2" /> AI Recommended Matches
            </Badge>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="p-4 sm:p-6">
          <div className="flex gap-4 mb-6 relative">
            <Search className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground" />
            <Input 
              placeholder="Search projects by title or skills..." 
              className="pl-10 flex-1"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Button variant="outline" className="hidden sm:flex">
              <Filter className="w-4 h-4 mr-2" /> Filters
            </Button>
          </div>

          {(loading || aiGenerating) ? (
            <div className="py-12 text-center text-muted-foreground flex flex-col items-center">
              <Loader2 className="w-8 h-8 mb-4 animate-spin text-primary" />
              {aiGenerating ? "AI is finding your best matches..." : "Loading projects..."}
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-accent flex items-center justify-center mx-auto mb-4">
                <Globe className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No projects found</h3>
              <p className="text-muted-foreground mb-6">Try adjusting your search criteria.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredProjects.map((project, index) => (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Link to={`/dashboard/freelancer/projects/${project.id}`}>
                    <div className="group border border-border rounded-2xl p-6 hover:border-primary/50 hover:bg-accent/20 transition-all cursor-pointer">
                      <div className="flex flex-col md:flex-row justify-between gap-4">
                        <div className="space-y-3 flex-1">
                          <div className="flex items-start justify-between">
                            <h3 className="text-xl font-bold font-heading group-hover:text-primary transition-colors">{project.title}</h3>
                            {project.score !== undefined && (
                              <Badge variant="glass" className={
                                project.score >= 80 ? "bg-green-500/10 text-green-500 border-green-500/20" :
                                project.score >= 50 ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" :
                                "bg-red-500/10 text-red-500 border-red-500/20"
                              }>
                                {project.score}% Match
                              </Badge>
                            )}
                          </div>
                          
                          {project.matchReason && (
                            <div className="bg-purple-500/5 border border-purple-500/20 rounded-lg p-3 flex items-start gap-3">
                              <Sparkles className="w-4 h-4 text-purple-500 shrink-0 mt-0.5" />
                              <p className="text-sm text-purple-600 dark:text-purple-400">{project.matchReason}</p>
                            </div>
                          )}
                          
                          <p className="text-muted-foreground line-clamp-2 text-sm">{project.description}</p>
                          
                          <div className="flex flex-wrap gap-2 pt-2">
                            {project.skillsRequired.map(skill => (
                              <Badge key={skill} variant="secondary" className="text-xs">{skill}</Badge>
                            ))}
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground pt-2">
                            <span className="font-semibold text-foreground">{project.currency} {project.budgetMin} - {project.budgetMax}</span>
                            <span>•</span>
                            <span>{project.category}</span>
                            <span>•</span>
                            <span>Posted {new Date(project.createdAt).toLocaleDateString()}</span>
                            <span>•</span>
                            <span>{project.proposalsCount || 0} Proposals</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
