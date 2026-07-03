import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { db } from '../../../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Textarea } from '../../../components/ui/textarea';
import { Select } from '../../../components/ui/select';
import { Card, CardContent } from '../../../components/ui/card';
import { toast } from 'react-hot-toast';
import { ArrowLeft, Sparkles, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { ProjectStatus } from '../../../types';

export function CreateProject() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isAiMode = searchParams.get('ai') === 'true';

  const [loading, setLoading] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'Development',
    budgetMin: '',
    budgetMax: '',
    currency: 'USD',
    deadline: '',
    skillsRequired: ''
  });

  const CATEGORIES = [
    'Development', 'Design', 'Marketing', 'Writing', 'Video & Animation', 'AI & Data'
  ];

  const handleAiScoping = async () => {
    if (!formData.title && !formData.description) {
      toast.error("Please enter a basic title or description first.");
      return;
    }
    setAiGenerating(true);
    // Simulate AI API call
    setTimeout(() => {
      setFormData(prev => ({
        ...prev,
        title: prev.title || 'AI Generated: E-Commerce Mobile App',
        description: prev.description + '\n\n**AI Generated Scope:**\n- Full UI/UX Design\n- Payment Gateway Integration\n- Admin Dashboard\n- Push Notifications',
        category: 'Development',
        budgetMin: '5000',
        budgetMax: '15000',
        skillsRequired: 'React Native, Node.js, Stripe, UI/UX'
      }));
      setAiGenerating(false);
      toast.success("AI generated a complete scope!");
    }, 2000);
  };

  const handleSubmit = async (e: React.FormEvent, status: ProjectStatus) => {
    e.preventDefault();
    if (!user) return;
    
    setLoading(true);
    try {
      const projectData = {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        budgetMin: Number(formData.budgetMin),
        budgetMax: Number(formData.budgetMax),
        currency: formData.currency,
        deadline: formData.deadline,
        skillsRequired: formData.skillsRequired.split(',').map(s => s.trim()).filter(Boolean),
        clientId: user.id,
        status: status,
        proposalsCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const docRef = await addDoc(collection(db, 'projects'), projectData);
      toast.success(status === 'DRAFT' ? 'Draft saved successfully' : 'Project published successfully');
      navigate(`/dashboard/projects/${docRef.id}`);
    } catch (error: any) {
      console.error(error);
      toast.error('Failed to save project. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-12">
      <div className="mb-8">
        <button 
          onClick={() => navigate(-1)}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </button>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold font-heading">Post a New Project</h1>
            <p className="text-muted-foreground mt-2">Fill out the details below or use AI to generate a professional scope.</p>
          </div>
          {isAiMode && (
            <Badge variant="glass" className="bg-primary/10 text-primary border-primary/20">
              <Sparkles className="w-4 h-4 mr-2" /> AI Scoping Active
            </Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardContent className="p-6 sm:p-8 space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">Project Title</Label>
                <Input 
                  id="title" 
                  placeholder="e.g. Build a responsive e-commerce website" 
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                  required
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="description">Project Description</Label>
                  <button 
                    type="button" 
                    onClick={handleAiScoping}
                    disabled={aiGenerating}
                    className="text-xs font-medium text-primary flex items-center hover:underline bg-primary/10 px-3 py-1 rounded-full"
                  >
                    {aiGenerating ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Sparkles className="w-3 h-3 mr-1" />}
                    {aiGenerating ? 'Generating...' : 'Enhance with AI'}
                  </button>
                </div>
                <Textarea 
                  id="description" 
                  placeholder="Describe your requirements in detail..." 
                  className="min-h-[200px]"
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select 
                    id="category"
                    value={formData.category}
                    onChange={e => setFormData({...formData, category: e.target.value})}
                  >
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="deadline">Deadline</Label>
                  <Input 
                    id="deadline" 
                    type="date"
                    value={formData.deadline}
                    onChange={e => setFormData({...formData, deadline: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="skills">Required Skills (comma separated)</Label>
                <Input 
                  id="skills" 
                  placeholder="e.g. React, Node.js, Figma" 
                  value={formData.skillsRequired}
                  onChange={e => setFormData({...formData, skillsRequired: e.target.value})}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardContent className="p-6 space-y-6">
              <h3 className="font-heading font-semibold text-lg">Budget & Pricing</h3>
              
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Select 
                  id="currency"
                  value={formData.currency}
                  onChange={e => setFormData({...formData, currency: e.target.value})}
                >
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="INR">INR (₹)</option>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="budgetMin">Min Budget</Label>
                  <Input 
                    id="budgetMin" 
                    type="number"
                    placeholder="1000"
                    value={formData.budgetMin}
                    onChange={e => setFormData({...formData, budgetMin: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="budgetMax">Max Budget</Label>
                  <Input 
                    id="budgetMax" 
                    type="number"
                    placeholder="5000"
                    value={formData.budgetMax}
                    onChange={e => setFormData({...formData, budgetMax: e.target.value})}
                    required
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col gap-3">
            <Button 
              size="lg" 
              className="w-full"
              onClick={(e) => handleSubmit(e, 'OPEN')}
              disabled={loading || aiGenerating}
            >
              Publish Project
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="w-full"
              onClick={(e) => handleSubmit(e, 'DRAFT')}
              disabled={loading || aiGenerating}
            >
              Save as Draft
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Quick inline Badge since we need it here and I don't want to mess up imports
function Badge({ children, className, variant = 'default' }: any) {
  return (
    <div className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${className}`}>
      {children}
    </div>
  );
}
