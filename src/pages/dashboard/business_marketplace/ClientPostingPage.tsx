import React, { useState } from 'react';
import { db } from '../../../lib/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { useAuth } from '../../../contexts/AuthContext';
import { BusinessProject } from '../../../types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Textarea } from '../../../components/ui/textarea';
import { toast } from 'react-hot-toast';
import { BUSINESS_CATEGORIES } from './categories';
import { 
  Plus, 
  Sparkles, 
  Loader2, 
  DollarSign, 
  MapPin, 
  Clock, 
  Languages, 
  Tags, 
  FileUp, 
  Eye, 
  EyeOff, 
  CheckCircle2 
} from 'lucide-react';

export default function ClientPostingPage({ onPostComplete }: { onPostComplete?: () => void }) {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [budget, setBudget] = useState<number>(1000);
  const [country, setCountry] = useState('');
  const [timeline, setTimeline] = useState('');
  const [language, setLanguage] = useState('English');
  const [skills, setSkills] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<string[]>([]);
  const [newFileUrl, setNewFileUrl] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  
  const [improvingDesc, setImprovingDesc] = useState(false);
  const [posting, setPosting] = useState(false);

  const handleAiImprove = async () => {
    if (!description.trim()) {
      toast.error("Please write a draft description first, then ask AI to improve it.");
      return;
    }
    setImprovingDesc(true);
    try {
      const response = await fetch('/api/ai/improve-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description, category })
      });
      if (!response.ok) throw new Error("Failed to improve description");
      const data = await response.json();
      if (data.improvedDescription) {
        setDescription(data.improvedDescription);
        toast.success("Description improved using Gemini AI!");
      }
    } catch (error) {
      console.error(error);
      toast.error("AI improvement failed. Please try again.");
    } finally {
      setImprovingDesc(false);
    }
  };

  const handleAddFile = () => {
    if (newFileUrl.trim() && !attachedFiles.includes(newFileUrl.trim())) {
      setAttachedFiles([...attachedFiles, newFileUrl.trim()]);
      setNewFileUrl('');
      toast.success("File attachment URL added.");
    }
  };

  const handleRemoveFile = (url: string) => {
    setAttachedFiles(attachedFiles.filter(f => f !== url));
  };

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!title.trim() || !description.trim() || !category || !country.trim() || !timeline.trim()) {
      toast.error("Please fill in all required fields marked with *");
      return;
    }

    setPosting(true);
    try {
      const skillsArray = skills.split(',').map(s => s.trim()).filter(Boolean);
      
      const newProject: Omit<BusinessProject, 'id'> = {
        clientId: user.id,
        title: title.trim(),
        description: description.trim(),
        category,
        budget: Number(budget) || 1000,
        country: country.trim(),
        timeline: timeline.trim(),
        language: language.trim() || 'English',
        skillsRequired: skillsArray,
        files: attachedFiles,
        isPublic,
        createdAt: new Date().toISOString(),
        status: 'OPEN',
        proposalsCount: 0
      };

      await addDoc(collection(db, 'business_projects'), newProject);
      toast.success("Business requirements posted to marketplace successfully!");
      
      // Reset form
      setTitle('');
      setDescription('');
      setCategory('');
      setBudget(1000);
      setCountry('');
      setTimeline('');
      setLanguage('English');
      setSkills('');
      setAttachedFiles([]);
      
      if (onPostComplete) onPostComplete();
    } catch (error) {
      console.error("Error posting project:", error);
      toast.error("Failed to post requirements");
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <Card className="border border-border">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Plus className="w-8 h-8 text-primary" />
            <div>
              <CardTitle className="text-2xl font-bold font-heading">Post Business Marketplace Requirement</CardTitle>
              <CardDescription>
                Reach verified suppliers, manufacturers, development agencies, and business consultants globally.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePost} className="space-y-6">
            
            {/* Project Title */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Requirement Title *</label>
              <Input 
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Sourcing Manufacturer for Eco-Friendly Bamboo Straws"
                required
              />
            </div>

            {/* Category & Budget */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Category *</label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  required
                >
                  <option value="">Choose category...</option>
                  {BUSINESS_CATEGORIES.map(cat => (
                    <option key={cat.id} value={cat.name}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Estimated Budget (USD) *</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input 
                    type="number"
                    value={budget}
                    onChange={e => setBudget(Number(e.target.value) || 0)}
                    placeholder="e.g. 5000"
                    className="pl-10"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Country, Timeline, Language */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Target Country/Region *</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input 
                    value={country}
                    onChange={e => setCountry(e.target.value)}
                    placeholder="e.g. Global, Vietnam, Germany"
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Delivery Timeline *</label>
                <div className="relative">
                  <Clock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input 
                    value={timeline}
                    onChange={e => setTimeline(e.target.value)}
                    placeholder="e.g. 2 Months, Urgent"
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Preferred Language</label>
                <div className="relative">
                  <Languages className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input 
                    value={language}
                    onChange={e => setLanguage(e.target.value)}
                    placeholder="e.g. English, Mandarin"
                    className="pl-10"
                  />
                </div>
              </div>
            </div>

            {/* Skills required */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Key Skills / Requirements Required (Comma Separated)</label>
              <div className="relative">
                <Tags className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input 
                  value={skills}
                  onChange={e => setSkills(e.target.value)}
                  placeholder="e.g. Sourcing, ISO Compliance, Manufacturing, English"
                  className="pl-10"
                />
              </div>
            </div>

            {/* Project Draft and AI description improvement */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-muted-foreground">Detailed Requirements Description *</label>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={handleAiImprove}
                  disabled={improvingDesc}
                  className="border-purple-500/30 text-purple-600 dark:text-purple-400 hover:bg-purple-500/10"
                >
                  {improvingDesc ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Improving...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-1.5" /> AI Improve with Gemini
                    </>
                  )}
                </Button>
              </div>
              <Textarea 
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Describe your specifications, quality benchmarks, delivery ports, logistics requirements, and key milestones in detail..."
                rows={6}
                required
              />
            </div>

            {/* Attached Files/Images */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Attach Specifications Document / Image URLs</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <FileUp className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input 
                    value={newFileUrl}
                    onChange={e => setNewFileUrl(e.target.value)}
                    placeholder="https://yourcloudstorage.com/specifications.pdf"
                    className="pl-10"
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddFile(); } }}
                  />
                </div>
                <Button type="button" onClick={handleAddFile} variant="outline">Attach</Button>
              </div>
              {attachedFiles.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {attachedFiles.map(file => (
                    <div key={file} className="bg-accent/30 border border-border rounded-lg px-3 py-1 flex items-center gap-2 text-xs">
                      <span className="truncate max-w-xs">{file}</span>
                      <button type="button" onClick={() => handleRemoveFile(file)} className="text-muted-foreground hover:text-red-500">×</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Visibility Mode */}
            <div className="pt-4 border-t border-border flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-sm font-semibold flex items-center gap-2 text-foreground">
                  {isPublic ? <Eye className="w-4 h-4 text-primary" /> : <EyeOff className="w-4 h-4 text-muted-foreground" />}
                  {isPublic ? "Public Marketplace Post" : "Private / Invite Only Post"}
                </span>
                <p className="text-xs text-muted-foreground">
                  {isPublic 
                    ? "Visible to all verified global business operators and search engines." 
                    : "Hidden from browse. Only operators you invite directly can see or submit proposals."}
                </p>
              </div>
              <Button 
                type="button" 
                variant="outline" 
                size="sm"
                onClick={() => setIsPublic(!isPublic)}
              >
                Switch to {isPublic ? "Private" : "Public"}
              </Button>
            </div>

            {/* Submit */}
            <div className="flex justify-end pt-4 border-t border-border">
              <Button type="submit" disabled={posting} className="min-w-48 rounded-xl">
                {posting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sourcing...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" /> Post Sourcing Requirement
                  </>
                )}
              </Button>
            </div>

          </form>
        </CardContent>
      </Card>
    </div>
  );
}
