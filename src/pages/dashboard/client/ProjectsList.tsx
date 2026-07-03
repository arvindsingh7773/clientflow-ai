import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { db } from '../../../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Project } from '../../../types';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Select } from '../../../components/ui/select';
import { Card, CardContent } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Search, Filter, Plus, Clock, FileText, CheckCircle, XCircle, MoreVertical } from 'lucide-react';
import { motion } from 'motion/react';

export function ProjectsList() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  useEffect(() => {
    const fetchProjects = async () => {
      if (!user) return;
      try {
        const q = query(
          collection(db, 'projects'),
          where('clientId', '==', user.id)
        );
        const snapshot = await getDocs(q);
        const projData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project));
        
        // Sort locally by createdAt descending
        projData.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        
        setProjects(projData);
      } catch (error) {
        console.error("Error fetching projects:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProjects();
  }, [user]);

  const filteredProjects = projects.filter(p => {
    const matchesSearch = p.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'DRAFT': return <FileText className="w-4 h-4 text-muted-foreground" />;
      case 'OPEN': return <Clock className="w-4 h-4 text-blue-500" />;
      case 'IN_PROGRESS': return <Clock className="w-4 h-4 text-purple-500" />;
      case 'COMPLETED': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'CANCELLED': return <XCircle className="w-4 h-4 text-red-500" />;
      default: return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT': return 'bg-gray-500/10 text-gray-500';
      case 'OPEN': return 'bg-blue-500/10 text-blue-500';
      case 'IN_PROGRESS': return 'bg-purple-500/10 text-purple-500';
      case 'COMPLETED': return 'bg-green-500/10 text-green-500';
      case 'CANCELLED': return 'bg-red-500/10 text-red-500';
      default: return 'bg-gray-500/10 text-gray-500';
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold font-heading">My Projects</h1>
          <p className="text-muted-foreground mt-1">Manage your active projects and drafts.</p>
        </div>
        <Link to="/dashboard/projects/new">
          <Button size="lg">
            <Plus className="w-5 h-5 mr-2" />
            Create Project
          </Button>
        </Link>
      </div>

      <Card>
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground" />
              <Input 
                placeholder="Search projects..." 
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-4 w-full sm:w-auto">
              <Filter className="w-5 h-5 text-muted-foreground hidden sm:block" />
              <Select 
                className="w-full sm:w-48"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="ALL">All Status</option>
                <option value="DRAFT">Drafts</option>
                <option value="OPEN">Open</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="COMPLETED">Completed</option>
              </Select>
            </div>
          </div>

          {loading ? (
            <div className="py-12 text-center text-muted-foreground animate-pulse">Loading projects...</div>
          ) : filteredProjects.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-accent flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No projects found</h3>
              <p className="text-muted-foreground mb-6">We couldn't find any projects matching your criteria.</p>
              <Button variant="outline" onClick={() => {setSearchTerm(''); setStatusFilter('ALL');}}>Clear Filters</Button>
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
                  <Link to={`/dashboard/projects/${project.id}`}>
                    <div className="group border border-border rounded-2xl p-6 hover:border-primary/50 hover:bg-accent/20 transition-all cursor-pointer">
                      <div className="flex flex-col md:flex-row justify-between gap-4">
                        <div className="space-y-3 flex-1">
                          <div className="flex items-center gap-3">
                            <h3 className="text-xl font-bold font-heading group-hover:text-primary transition-colors">{project.title}</h3>
                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 ${getStatusColor(project.status)}`}>
                              {getStatusIcon(project.status)}
                              {project.status.replace('_', ' ')}
                            </span>
                          </div>
                          
                          <p className="text-muted-foreground line-clamp-2 text-sm">{project.description}</p>
                          
                          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground pt-2">
                            <span className="font-medium text-foreground">{project.currency} {project.budgetMin} - {project.budgetMax}</span>
                            <span>•</span>
                            <span>{project.category}</span>
                            <span>•</span>
                            <span>Posted {new Date(project.createdAt).toLocaleDateString()}</span>
                            <span>•</span>
                            <span>{project.proposalsCount || 0} Proposals</span>
                          </div>
                        </div>
                        
                        <div className="flex md:flex-col items-center md:items-end justify-between md:justify-center gap-2">
                          <Button variant="ghost" size="icon" className="hidden md:flex text-muted-foreground hover:text-foreground">
                            <MoreVertical className="w-5 h-5" />
                          </Button>
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
