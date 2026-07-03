import React, { useEffect, useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { db } from '../../../lib/firebase';
import { collection, query, where, getDocs, setDoc, doc } from 'firebase/firestore';
import { FreelancerProfile } from '../../../types';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Textarea } from '../../../components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { toast } from 'react-hot-toast';
import { Loader2, Plus, Trash2, Link as LinkIcon, Briefcase, GraduationCap, Sparkles, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';

export function ProfileManager() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<FreelancerProfile>({
    userId: user?.id || '',
    headline: '',
    bio: '',
    hourlyRate: 0,
    skills: [],
    portfolio: [],
    experience: [],
    education: [],
    savedProjects: [],
  });

  const [newSkill, setNewSkill] = useState('');
  const [generatingAi, setGeneratingAi] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const handleAiSuggestions = async () => {
    setGeneratingAi(true);
    try {
      const response = await fetch('/api/ai/profile-suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ freelancerProfile: profile })
      });
      if (!response.ok) throw new Error('Failed to get suggestions');
      const data = await response.json();
      if (data.suggestions) {
        setSuggestions(data.suggestions);
        toast.success("AI analyzed your profile!");
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to generate AI suggestions");
    } finally {
      setGeneratingAi(false);
    }
  };

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      try {
        const docRef = doc(db, 'freelancer_profiles', user.id);
        const docSnap = await getDocs(query(collection(db, 'freelancer_profiles'), where('userId', '==', user.id)));
        
        if (!docSnap.empty) {
          setProfile(docSnap.docs[0].data() as FreelancerProfile);
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await setDoc(doc(db, 'freelancer_profiles', user.id), {
        ...profile,
        userId: user.id
      });
      toast.success('Profile updated successfully');
    } catch (error) {
      console.error(error);
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const addSkill = () => {
    if (newSkill.trim() && !profile.skills.includes(newSkill.trim())) {
      setProfile({ ...profile, skills: [...profile.skills, newSkill.trim()] });
      setNewSkill('');
    }
  };

  const removeSkill = (skill: string) => {
    setProfile({ ...profile, skills: profile.skills.filter(s => s !== skill) });
  };

  if (loading) {
    return <div className="p-12 text-center text-muted-foreground animate-pulse">Loading profile...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold font-heading">My Profile</h1>
          <p className="text-muted-foreground mt-1">Manage your public freelancer profile.</p>
        </div>
        <div className="flex gap-4">
          <Button onClick={handleAiSuggestions} disabled={generatingAi} variant="outline" className="border-purple-500/30 text-purple-500 hover:bg-purple-500/10">
            {generatingAi ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
            AI Profile Review
          </Button>
          <Button onClick={handleSave} disabled={saving} size="lg">
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Save Changes
          </Button>
        </div>
      </div>

      {suggestions.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-purple-500/30 bg-purple-500/5">
            <CardHeader>
              <CardTitle className="text-lg flex items-center text-purple-600 dark:text-purple-400">
                <Sparkles className="w-5 h-5 mr-2" /> AI Suggestions to Win More Jobs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {suggestions.map((suggestion, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-sm">
                    <CheckCircle2 className="w-5 h-5 text-purple-500 shrink-0 mt-0.5" />
                    <span>{suggestion}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </motion.div>
      )}

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Professional Headline</label>
              <Input 
                placeholder="e.g. Senior Full Stack Developer" 
                value={profile.headline}
                onChange={e => setProfile({...profile, headline: e.target.value})}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Hourly Rate ($)</label>
              <Input 
                type="number"
                placeholder="0" 
                value={profile.hourlyRate}
                onChange={e => setProfile({...profile, hourlyRate: Number(e.target.value)})}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Bio</label>
              <Textarea 
                placeholder="Tell clients about yourself..." 
                className="min-h-[150px]"
                value={profile.bio}
                onChange={e => setProfile({...profile, bio: e.target.value})}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Skills</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 mb-4">
              <Input 
                placeholder="Add a skill (e.g. React, Node.js)" 
                value={newSkill}
                onChange={e => setNewSkill(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addSkill()}
              />
              <Button onClick={addSkill} variant="secondary">Add</Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {profile.skills.map(skill => (
                <div key={skill} className="flex items-center gap-2 px-3 py-1 bg-accent rounded-full text-sm">
                  {skill}
                  <button onClick={() => removeSkill(skill)} className="text-muted-foreground hover:text-red-500">
                    &times;
                  </button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Portfolio</CardTitle>
            <Button variant="outline" size="sm" onClick={() => {
              const newItem = {
                id: Math.random().toString(36).substr(2, 9),
                title: 'Project Title',
                description: 'Short description of the project',
                link: ''
              };
              setProfile({ ...profile, portfolio: [...profile.portfolio, newItem] });
            }}>
              <Plus className="w-4 h-4 mr-2" /> Add Item
            </Button>
          </CardHeader>
          <CardContent>
            {profile.portfolio.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No portfolio items added yet.
              </div>
            ) : (
              <div className="space-y-4">
                {profile.portfolio.map((item, idx) => (
                  <div key={item.id} className="border border-border p-4 rounded-lg space-y-3 relative">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="absolute top-2 right-2 text-red-500 hover:text-red-600 hover:bg-red-500/10"
                      onClick={() => setProfile({ ...profile, portfolio: profile.portfolio.filter(p => p.id !== item.id) })}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                    <div className="space-y-1 pr-8">
                      <label className="text-xs font-medium text-muted-foreground">Title</label>
                      <Input value={item.title} onChange={(e) => {
                        const newPortfolio = [...profile.portfolio];
                        newPortfolio[idx].title = e.target.value;
                        setProfile({ ...profile, portfolio: newPortfolio });
                      }} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Description</label>
                      <Textarea value={item.description} onChange={(e) => {
                        const newPortfolio = [...profile.portfolio];
                        newPortfolio[idx].description = e.target.value;
                        setProfile({ ...profile, portfolio: newPortfolio });
                      }} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Project Link (Optional)</label>
                      <Input value={item.link || ''} placeholder="https://" onChange={(e) => {
                        const newPortfolio = [...profile.portfolio];
                        newPortfolio[idx].link = e.target.value;
                        setProfile({ ...profile, portfolio: newPortfolio });
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Experience</CardTitle>
            <Button variant="outline" size="sm" onClick={() => {
              const newExp = {
                id: Math.random().toString(36).substr(2, 9),
                company: 'New Company',
                role: 'Role',
                startDate: '2020',
                description: 'Description of what I did.'
              };
              setProfile({ ...profile, experience: [...profile.experience, newExp] });
            }}>
              <Plus className="w-4 h-4 mr-2" /> Add Experience
            </Button>
          </CardHeader>
          <CardContent>
            {profile.experience.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No experience added yet.</div>
            ) : (
              <div className="space-y-4">
                {profile.experience.map((exp, idx) => (
                  <div key={exp.id} className="border border-border p-4 rounded-lg space-y-3 relative">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="absolute top-2 right-2 text-red-500 hover:text-red-600 hover:bg-red-500/10"
                      onClick={() => setProfile({ ...profile, experience: profile.experience.filter(e => e.id !== exp.id) })}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Role</label>
                        <Input value={exp.role} onChange={(e) => {
                          const newExp = [...profile.experience];
                          newExp[idx].role = e.target.value;
                          setProfile({ ...profile, experience: newExp });
                        }} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Company</label>
                        <Input value={exp.company} onChange={(e) => {
                          const newExp = [...profile.experience];
                          newExp[idx].company = e.target.value;
                          setProfile({ ...profile, experience: newExp });
                        }} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Start Date</label>
                        <Input value={exp.startDate} placeholder="e.g. 2020" onChange={(e) => {
                          const newExp = [...profile.experience];
                          newExp[idx].startDate = e.target.value;
                          setProfile({ ...profile, experience: newExp });
                        }} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">End Date</label>
                        <Input value={exp.endDate || ''} placeholder="e.g. Present" onChange={(e) => {
                          const newExp = [...profile.experience];
                          newExp[idx].endDate = e.target.value;
                          setProfile({ ...profile, experience: newExp });
                        }} />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Description</label>
                      <Textarea value={exp.description} onChange={(e) => {
                        const newExp = [...profile.experience];
                        newExp[idx].description = e.target.value;
                        setProfile({ ...profile, experience: newExp });
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Education</CardTitle>
            <Button variant="outline" size="sm" onClick={() => {
              const newEdu = {
                id: Math.random().toString(36).substr(2, 9),
                institution: 'University',
                degree: 'Degree',
                year: '2020'
              };
              setProfile({ ...profile, education: [...profile.education, newEdu] });
            }}>
              <Plus className="w-4 h-4 mr-2" /> Add Education
            </Button>
          </CardHeader>
          <CardContent>
            {profile.education.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No education added yet.</div>
            ) : (
              <div className="space-y-4">
                {profile.education.map((edu, idx) => (
                  <div key={edu.id} className="border border-border p-4 rounded-lg space-y-3 relative">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="absolute top-2 right-2 text-red-500 hover:text-red-600 hover:bg-red-500/10"
                      onClick={() => setProfile({ ...profile, education: profile.education.filter(e => e.id !== edu.id) })}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Degree</label>
                        <Input value={edu.degree} onChange={(e) => {
                          const newEdu = [...profile.education];
                          newEdu[idx].degree = e.target.value;
                          setProfile({ ...profile, education: newEdu });
                        }} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Institution</label>
                        <Input value={edu.institution} onChange={(e) => {
                          const newEdu = [...profile.education];
                          newEdu[idx].institution = e.target.value;
                          setProfile({ ...profile, education: newEdu });
                        }} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Year</label>
                        <Input value={edu.year} onChange={(e) => {
                          const newEdu = [...profile.education];
                          newEdu[idx].year = e.target.value;
                          setProfile({ ...profile, education: newEdu });
                        }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
