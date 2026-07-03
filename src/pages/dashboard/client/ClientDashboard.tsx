import React, { useEffect, useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { db } from '../../../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Project } from '../../../types';
import { Link } from 'react-router-dom';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { motion } from 'motion/react';
import { Briefcase, Clock, CheckCircle, TrendingUp, ChevronRight, Bot, Sparkles } from 'lucide-react';
import { Badge } from '../../../components/ui/badge';

export function ClientDashboard() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

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
        
        // Take top 5 for dashboard
        setProjects(projData.slice(0, 5));
      } catch (error) {
        console.error("Error fetching projects:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProjects();
  }, [user]);

  const stats = [
    { label: 'Active Projects', value: projects.filter(p => p.status === 'OPEN' || p.status === 'IN_PROGRESS').length, icon: <Briefcase className="w-5 h-5 text-blue-500" /> },
    { label: 'Pending Proposals', value: projects.reduce((acc, curr) => acc + (curr.proposalsCount || 0), 0), icon: <Clock className="w-5 h-5 text-purple-500" /> },
    { label: 'Completed', value: projects.filter(p => p.status === 'COMPLETED').length, icon: <CheckCircle className="w-5 h-5 text-green-500" /> },
    { label: 'Total Spent', value: '$0', icon: <TrendingUp className="w-5 h-5 text-yellow-500" /> },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold font-heading">Welcome back, {user?.name?.split(' ')[0]}</h1>
          <p className="text-muted-foreground mt-1">Here is what is happening with your projects today.</p>
        </div>
        <Link to="/dashboard/projects/new">
          <Button size="lg" className="h-12 px-6">
            Create New Project
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card>
              <CardContent className="p-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center">
                  {stat.icon}
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold font-heading">{stat.value}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Projects */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold font-heading">Recent Projects</h2>
            <Link to="/dashboard/projects" className="text-sm font-medium text-primary flex items-center hover:underline">
              View All <ChevronRight className="w-4 h-4 ml-1" />
            </Link>
          </div>
          
          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-8 text-center text-muted-foreground animate-pulse">Loading projects...</div>
              ) : projects.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="w-16 h-16 rounded-full bg-accent flex items-center justify-center mx-auto mb-4">
                    <Briefcase className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">No projects yet</h3>
                  <p className="text-muted-foreground mb-6">Create your first project to start hiring top talent.</p>
                  <Link to="/dashboard/projects/new">
                    <Button variant="outline">Post a Project</Button>
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {projects.map(project => (
                    <div key={project.id} className="p-6 hover:bg-accent/30 transition-colors flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                      <div className="space-y-1">
                        <Link to={`/dashboard/projects/${project.id}`} className="font-semibold font-heading text-lg hover:text-primary transition-colors">
                          {project.title}
                        </Link>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <span className="capitalize">{project.status.toLowerCase().replace('_', ' ')}</span>
                          <span>•</span>
                          <span>{project.proposalsCount || 0} Proposals</span>
                          <span>•</span>
                          <span>Posted {new Date(project.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{project.currency} {project.budgetMin} - {project.budgetMax}</p>
                        <Badge variant="outline" className="mt-2">{project.category}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* AI Assistant Widget */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold font-heading">AI Assistant</h2>
          <Card className="border-primary/20 bg-primary/5 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Bot className="w-32 h-32" />
            </div>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                Project Scoper AI
              </CardTitle>
              <CardDescription>
                Not sure how to define your project? Let our AI help you create the perfect brief.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link to="/dashboard/projects/new?ai=true">
                <Button className="w-full">
                  Start AI Scoping
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Recent Notifications Mock */}
          <h2 className="text-xl font-bold font-heading mt-8">Recent Activity</h2>
          <Card>
            <CardContent className="p-6 space-y-6">
              {[1, 2, 3].map((_, i) => (
                <div key={i} className="flex gap-4">
                  <div className="w-2 h-2 rounded-full bg-primary mt-2"></div>
                  <div>
                    <p className="text-sm">New milestone completed for <span className="font-semibold">E-commerce Redesign</span></p>
                    <p className="text-xs text-muted-foreground mt-1">{i * 2 + 1} hours ago</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
