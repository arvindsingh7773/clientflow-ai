import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { db } from '../../lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { Project, FreelancerProfile } from '../../types';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Search as SearchIcon, Filter, Sparkles, Loader2, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export function SearchPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get('q') || '';
  const type = searchParams.get('type') || 'freelancers'; // 'freelancers' or 'projects'
  
  const [searchTerm, setSearchTerm] = useState(q);
  const [activeType, setActiveType] = useState(type);
  const [loading, setLoading] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  
  const [freelancers, setFreelancers] = useState<(FreelancerProfile & { score?: number, matchReason?: string, userDetails?: any })[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    handleSearch();
  }, [activeType, searchParams.get('q')]); // Trigger when URL query changes

  const handleSearch = async () => {
    setLoading(true);
    try {
      if (activeType === 'freelancers') {
        const snapshot = await getDocs(collection(db, 'freelancer_profiles'));
        let data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as any));
        
        if (q) {
          data = data.filter(f => 
            f.headline?.toLowerCase().includes(q.toLowerCase()) || 
            f.bio?.toLowerCase().includes(q.toLowerCase()) ||
            f.skills?.some((s: string) => s.toLowerCase().includes(q.toLowerCase()))
          );
        }
        setFreelancers(data);
      } else {
        const snap = await getDocs(query(collection(db, 'projects'), where('status', '==', 'OPEN')));
        let data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Project));
        
        if (q) {
          data = data.filter(p => 
            p.title.toLowerCase().includes(q.toLowerCase()) || 
            p.description.toLowerCase().includes(q.toLowerCase()) ||
            p.skillsRequired?.some((s: string) => s.toLowerCase().includes(q.toLowerCase()))
          );
        }
        setProjects(data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const executeSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchParams({ q: searchTerm, type: activeType });
  };

  const handleAiMatch = async () => {
    if (activeType !== 'freelancers' || freelancers.length === 0 || !q) return;
    setAiGenerating(true);
    try {
      const response = await fetch('/api/ai/match-freelancers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          project: { title: q, description: 'Client is searching for: ' + q },
          freelancerProfiles: freelancers
        })
      });
      if (!response.ok) throw new Error('Failed to rank freelancers');
      const data = await response.json();
      
      if (data.matches && Array.isArray(data.matches)) {
        const ranked = freelancers.map(f => {
          const match = data.matches.find((m: any) => m.freelancerId === f.userId);
          return match ? { ...f, score: match.score, matchReason: match.reason } : f;
        });
        
        ranked.sort((a, b) => (b.score || 0) - (a.score || 0));
        setFreelancers(ranked);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setAiGenerating(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      <div className="text-center max-w-2xl mx-auto mb-8">
        <h1 className="text-4xl font-bold font-heading mb-4">Smart Search Engine</h1>
        <p className="text-muted-foreground text-lg">
          Find top freelancers, exciting projects, and global opportunities.
        </p>
      </div>

      <Card className="border-primary/20 bg-card">
        <CardContent className="p-6">
          <form onSubmit={executeSearch} className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <SearchIcon className="absolute left-4 top-3.5 h-5 w-5 text-muted-foreground" />
              <Input 
                placeholder="Search by keywords, skills, or titles..." 
                className="pl-12 h-12 text-lg rounded-xl"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button type="button" variant={activeType === 'freelancers' ? 'default' : 'outline'} className="h-12 rounded-xl" onClick={() => { setActiveType('freelancers'); setSearchParams({ q: searchTerm, type: 'freelancers' }) }}>
                Freelancers
              </Button>
              <Button type="button" variant={activeType === 'projects' ? 'default' : 'outline'} className="h-12 rounded-xl" onClick={() => { setActiveType('projects'); setSearchParams({ q: searchTerm, type: 'projects' }) }}>
                Projects
              </Button>
              <Button type="submit" size="lg" className="h-12 rounded-xl px-8 ml-2">
                Search
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">
          {loading ? "Searching..." : `Results for "${q}"`}
        </h2>
        <div className="flex gap-2">
          {activeType === 'freelancers' && q && freelancers.length > 0 && (
            <Button variant="outline" size="sm" onClick={handleAiMatch} disabled={aiGenerating} className="border-purple-500/30 text-purple-500 hover:bg-purple-500/10">
              {aiGenerating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
              AI Rank
            </Button>
          )}
          <Button variant="outline" size="sm">
            <Filter className="w-4 h-4 mr-2" /> Advanced Filters
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="py-20 flex justify-center"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>
      ) : activeType === 'freelancers' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {freelancers.length === 0 ? (
            <div className="col-span-full py-12 text-center text-muted-foreground">No freelancers found.</div>
          ) : freelancers.map((f, i) => (
            <motion.div key={f.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className="h-full hover:border-primary/50 transition-colors">
                <CardHeader>
                  <div className="flex justify-between items-start gap-2">
                    <CardTitle className="line-clamp-1 flex-1">{f.headline || "Freelancer"}</CardTitle>
                    {f.score !== undefined && (
                      <Badge variant="glass" className={
                        f.score >= 80 ? "bg-green-500/10 text-green-500 border-green-500/20" :
                        f.score >= 50 ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" :
                        "bg-red-500/10 text-red-500 border-red-500/20"
                      }>
                        {f.score}% Match
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {f.matchReason && (
                    <div className="bg-purple-500/5 border border-purple-500/20 rounded-lg p-3 flex items-start gap-3">
                      <Sparkles className="w-4 h-4 text-purple-500 shrink-0 mt-0.5" />
                      <p className="text-xs text-purple-600 dark:text-purple-400">{f.matchReason}</p>
                    </div>
                  )}
                  <p className="text-sm text-muted-foreground line-clamp-3">{f.bio || "No bio provided."}</p>
                  <div className="flex flex-wrap gap-2">
                    {f.skills?.slice(0, 3).map((s: string) => (
                      <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                    ))}
                    {f.skills?.length > 3 && <Badge variant="outline" className="text-xs">+{f.skills.length - 3}</Badge>}
                  </div>
                  <div className="pt-4 border-t border-border flex justify-between items-center">
                    <span className="font-semibold text-primary">${f.hourlyRate}/hr</span>
                    <Link to={`/freelancer/${f.userId}`}>
                      <Button variant="ghost" size="sm">View Profile <ArrowRight className="w-4 h-4 ml-2" /></Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {projects.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">No projects found.</div>
          ) : projects.map((project, i) => (
            <motion.div key={project.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className="hover:border-primary/50 transition-colors">
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="space-y-3 flex-1">
                      <h3 className="text-xl font-bold font-heading">{project.title}</h3>
                      <p className="text-muted-foreground line-clamp-2 text-sm">{project.description}</p>
                      <div className="flex flex-wrap gap-2 pt-2">
                        {project.skillsRequired.map(skill => (
                          <Badge key={skill} variant="secondary" className="text-xs">{skill}</Badge>
                        ))}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground pt-2">
                        <span className="font-semibold text-foreground">{project.currency} {project.budgetMin} - {project.budgetMax}</span>
                        <span>•</span>
                        <span>{project.category}</span>
                      </div>
                    </div>
                    <div className="shrink-0">
                      <Link to={user?.role === 'CLIENT' || user?.role === 'BUSINESS' || user?.role === 'ADMIN' ? `/dashboard/projects/${project.id}` : `/dashboard/freelancer/projects/${project.id}`}>
                        <Button size="sm" className="gap-2">
                          View details <ArrowRight className="w-4 h-4" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
