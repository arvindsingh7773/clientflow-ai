import React, { useState, useEffect } from 'react';
import { db } from '../../../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useAuth } from '../../../contexts/AuthContext';
import { BusinessProfile } from '../../../types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Textarea } from '../../../components/ui/textarea';
import { Badge } from '../../../components/ui/badge';
import { toast } from 'react-hot-toast';
import { BUSINESS_CATEGORIES } from './categories';
import { 
  Building2, 
  Globe, 
  MapPin, 
  Award, 
  Users, 
  Linkedin, 
  Twitter, 
  Github, 
  Plus, 
  X, 
  Briefcase, 
  CheckCircle2, 
  Loader2 
} from 'lucide-react';

export default function BusinessProfileEdit({ onSaved }: { onSaved?: () => void }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [companyName, setCompanyName] = useState('');
  const [logo, setLogo] = useState('');
  const [banner, setBanner] = useState('');
  const [country, setCountry] = useState('');
  const [industry, setIndustry] = useState('');
  const [services, setServices] = useState<string[]>([]);
  const [newService, setNewService] = useState('');
  const [experience, setExperience] = useState('');
  const [certifications, setCertifications] = useState<string[]>([]);
  const [newCert, setNewCert] = useState('');
  const [teamSize, setTeamSize] = useState<number>(1);
  const [website, setWebsite] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [twitter, setTwitter] = useState('');
  const [github, setGithub] = useState('');

  // Portfolio items
  const [portfolio, setPortfolio] = useState<{ title: string; description: string; url?: string; imageUrl?: string }[]>([]);
  const [portTitle, setPortTitle] = useState('');
  const [portDesc, setPortDesc] = useState('');
  const [portUrl, setPortUrl] = useState('');
  const [portImage, setPortImage] = useState('');

  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      try {
        const docRef = doc(db, 'business_profiles', user.id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data() as BusinessProfile;
          setCompanyName(data.companyName || '');
          setLogo(data.logo || '');
          setBanner(data.banner || '');
          setCountry(data.country || '');
          setIndustry(data.industry || '');
          setServices(data.services || []);
          setExperience(data.experience || '');
          setCertifications(data.certifications || []);
          setPortfolio(data.portfolio || []);
          setTeamSize(data.teamSize || 1);
          setWebsite(data.website || '');
          setLinkedin(data.socialLinks?.linkedin || '');
          setTwitter(data.socialLinks?.twitter || '');
          setGithub(data.socialLinks?.github || '');
        } else {
          // prefill company name from user displayName
          setCompanyName(user.displayName || '');
        }
      } catch (error) {
        console.error("Error loading profile:", error);
        toast.error("Failed to load business profile");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  const handleAddService = () => {
    if (newService.trim() && !services.includes(newService.trim())) {
      setServices([...services, newService.trim()]);
      setNewService('');
    }
  };

  const handleRemoveService = (service: string) => {
    setServices(services.filter(s => s !== service));
  };

  const handleAddCert = () => {
    if (newCert.trim() && !certifications.includes(newCert.trim())) {
      setCertifications([...certifications, newCert.trim()]);
      setNewCert('');
    }
  };

  const handleRemoveCert = (cert: string) => {
    setCertifications(certifications.filter(c => c !== cert));
  };

  const handleAddPortfolio = () => {
    if (!portTitle.trim() || !portDesc.trim()) {
      toast.error("Portfolio title and description are required");
      return;
    }
    setPortfolio([...portfolio, {
      title: portTitle.trim(),
      description: portDesc.trim(),
      url: portUrl.trim() || undefined,
      imageUrl: portImage.trim() || undefined
    }]);
    setPortTitle('');
    setPortDesc('');
    setPortUrl('');
    setPortImage('');
    toast.success("Portfolio item added");
  };

  const handleRemovePortfolio = (index: number) => {
    setPortfolio(portfolio.filter((_, i) => i !== index));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!companyName.trim()) {
      toast.error("Company Name is required");
      return;
    }
    if (!country.trim()) {
      toast.error("Country is required");
      return;
    }
    if (!industry) {
      toast.error("Please select an industry / category");
      return;
    }

    setSaving(true);
    try {
      const profileData: BusinessProfile = {
        id: user.id,
        userId: user.id,
        companyName: companyName.trim(),
        logo: logo.trim() || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=60',
        banner: banner.trim() || 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800&auto=format&fit=crop&q=60',
        country: country.trim(),
        industry,
        services,
        experience: experience.trim() || '1+ Years',
        certifications,
        portfolio,
        ratings: 5.0,
        reviews: [],
        teamSize: teamSize || 1,
        website: website.trim() || undefined,
        socialLinks: {
          linkedin: linkedin.trim() || undefined,
          twitter: twitter.trim() || undefined,
          github: github.trim() || undefined,
        },
        isVerified: true, // Auto-verified for marketplace simulation
        isOnline: true
      };

      await setDoc(doc(db, 'business_profiles', user.id), profileData);
      toast.success("Business profile saved successfully!");
      if (onSaved) onSaved();
    } catch (error) {
      console.error("Error saving business profile:", error);
      toast.error("Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <Card className="border border-border">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Building2 className="w-8 h-8 text-primary" />
            <div>
              <CardTitle className="text-2xl font-bold font-heading">Business & Agency Setup</CardTitle>
              <CardDescription>Configure your global business credentials, services, and profile banner.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-6">
            
            {/* Core Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Company / Organization Name *</label>
                <Input 
                  value={companyName}
                  onChange={e => setCompanyName(e.target.value)}
                  placeholder="e.g. Apex Global Trading"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Country *</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input 
                    value={country}
                    onChange={e => setCountry(e.target.value)}
                    placeholder="e.g. Singapore, United States"
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Industry / Primary Category *</label>
                <select
                  value={industry}
                  onChange={e => setIndustry(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  required
                >
                  <option value="">Select Primary Business Category</option>
                  {BUSINESS_CATEGORIES.map(cat => (
                    <option key={cat.id} value={cat.name}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Years of Experience</label>
                <Input 
                  value={experience}
                  onChange={e => setExperience(e.target.value)}
                  placeholder="e.g. 5+ Years, Established in 2018"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Total Team Size</label>
                <div className="relative">
                  <Users className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input 
                    type="number"
                    value={teamSize}
                    onChange={e => setTeamSize(parseInt(e.target.value) || 1)}
                    min={1}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Company Website</label>
                <div className="relative">
                  <Globe className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input 
                    type="url"
                    value={website}
                    onChange={e => setWebsite(e.target.value)}
                    placeholder="https://yourwebsite.com"
                    className="pl-10"
                  />
                </div>
              </div>
            </div>

            {/* Logo and Banner URLs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-border">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Logo Image URL</label>
                <Input 
                  value={logo}
                  onChange={e => setLogo(e.target.value)}
                  placeholder="https://images.unsplash.com/photo-..."
                />
                {logo && (
                  <div className="mt-2 w-16 h-16 rounded-lg overflow-hidden border border-border">
                    <img src={logo} alt="Logo preview" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Profile Banner Image URL</label>
                <Input 
                  value={banner}
                  onChange={e => setBanner(e.target.value)}
                  placeholder="https://images.unsplash.com/photo-..."
                />
                {banner && (
                  <div className="mt-2 h-16 rounded-lg overflow-hidden border border-border">
                    <img src={banner} alt="Banner preview" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>
            </div>

            {/* Services Tags */}
            <div className="space-y-2 pt-4 border-t border-border">
              <label className="text-sm font-medium text-muted-foreground">Services Offered</label>
              <div className="flex gap-2">
                <Input 
                  value={newService}
                  onChange={e => setNewService(e.target.value)}
                  placeholder="e.g. Custom Web Development, Logistics Sourcing"
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddService(); } }}
                />
                <Button type="button" onClick={handleAddService} variant="outline" className="shrink-0">
                  <Plus className="w-4 h-4 mr-2" /> Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 pt-2">
                {services.length === 0 ? (
                  <span className="text-sm text-muted-foreground">No services listed yet. Add some above.</span>
                ) : (
                  services.map(s => (
                    <Badge key={s} variant="secondary" className="pl-3 pr-2 py-1 flex items-center gap-2 rounded-full">
                      {s}
                      <button type="button" onClick={() => handleRemoveService(s)} className="text-muted-foreground hover:text-foreground">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </Badge>
                  ))
                )}
              </div>
            </div>

            {/* Certifications Tags */}
            <div className="space-y-2 pt-4 border-t border-border">
              <label className="text-sm font-medium text-muted-foreground">Certifications & Accreditations</label>
              <div className="flex gap-2">
                <Input 
                  value={newCert}
                  onChange={e => setNewCert(e.target.value)}
                  placeholder="e.g. ISO 9001, AWS Certified Agency"
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddCert(); } }}
                />
                <Button type="button" onClick={handleAddCert} variant="outline" className="shrink-0">
                  <Plus className="w-4 h-4 mr-2" /> Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 pt-2">
                {certifications.length === 0 ? (
                  <span className="text-sm text-muted-foreground">No certifications listed yet.</span>
                ) : (
                  certifications.map(c => (
                    <Badge key={c} variant="outline" className="pl-3 pr-2 py-1 border-primary/30 text-primary flex items-center gap-2 rounded-full">
                      <Award className="w-3.5 h-3.5 mr-1" />
                      {c}
                      <button type="button" onClick={() => handleRemoveCert(c)} className="text-muted-foreground hover:text-foreground">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </Badge>
                  ))
                )}
              </div>
            </div>

            {/* Social Links */}
            <div className="space-y-3 pt-4 border-t border-border">
              <label className="text-sm font-medium text-muted-foreground">Social Links</label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative">
                  <Linkedin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input 
                    value={linkedin}
                    onChange={e => setLinkedin(e.target.value)}
                    placeholder="LinkedIn URL"
                    className="pl-10"
                  />
                </div>
                <div className="relative">
                  <Twitter className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input 
                    value={twitter}
                    onChange={e => setTwitter(e.target.value)}
                    placeholder="Twitter / X URL"
                    className="pl-10"
                  />
                </div>
                <div className="relative">
                  <Github className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input 
                    value={github}
                    onChange={e => setGithub(e.target.value)}
                    placeholder="GitHub URL"
                    className="pl-10"
                  />
                </div>
              </div>
            </div>

            {/* Portfolio Section */}
            <div className="space-y-4 pt-4 border-t border-border">
              <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-primary" /> Company Portfolio Projects
              </label>
              
              <div className="bg-accent/20 border border-border rounded-xl p-4 space-y-3">
                <p className="text-xs text-muted-foreground mb-2 font-medium">Add a showcase project to your portfolio:</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Input 
                    value={portTitle}
                    onChange={e => setPortTitle(e.target.value)}
                    placeholder="Project Title *"
                  />
                  <Input 
                    value={portUrl}
                    onChange={e => setPortUrl(e.target.value)}
                    placeholder="Project Live URL (optional)"
                  />
                </div>
                <Textarea 
                  value={portDesc}
                  onChange={e => setPortDesc(e.target.value)}
                  placeholder="What was the business outcome, scale, or deliverables? *"
                  rows={2}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Input 
                    value={portImage}
                    onChange={e => setPortImage(e.target.value)}
                    placeholder="Showcase Image URL (optional)"
                  />
                  <Button type="button" onClick={handleAddPortfolio} className="w-full">
                    <Plus className="w-4 h-4 mr-2" /> Add Project to Portfolio
                  </Button>
                </div>
              </div>

              {/* Display Current Portfolio */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                {portfolio.map((item, index) => (
                  <div key={index} className="flex gap-3 border border-border rounded-xl p-3 relative bg-card hover:bg-accent/5 transition-colors">
                    {item.imageUrl && (
                      <img src={item.imageUrl} alt={item.title} className="w-16 h-16 rounded-lg object-cover border border-border shrink-0" />
                    )}
                    <div className="flex-1 space-y-1">
                      <h4 className="text-sm font-semibold line-clamp-1">{item.title}</h4>
                      <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>
                      {item.url && (
                        <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline block pt-1">
                          View Project →
                        </a>
                      )}
                    </div>
                    <button 
                      type="button" 
                      onClick={() => handleRemovePortfolio(index)}
                      className="absolute top-2 right-2 text-muted-foreground hover:text-red-500 rounded-full p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Submission Buttons */}
            <div className="flex justify-end gap-3 pt-6 border-t border-border">
              <Button type="submit" disabled={saving} className="min-w-40 rounded-xl">
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" /> Save Profile
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
