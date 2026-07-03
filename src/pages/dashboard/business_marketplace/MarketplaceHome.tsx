import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { db } from '../../../lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { useAuth } from '../../../contexts/AuthContext';
import { BusinessProfile, BusinessProject } from '../../../types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Badge } from '../../../components/ui/badge';
import { toast } from 'react-hot-toast';
import { BUSINESS_CATEGORIES } from './categories';
import BusinessProfilePage from './BusinessProfilePage';
import BusinessProfileEdit from './BusinessProfileEdit';
import ClientPostingPage from './ClientPostingPage';
import BusinessDashboard from './BusinessDashboard';
import ClientMarketplaceDashboard from './ClientMarketplaceDashboard';
import { 
  Search, 
  Filter, 
  Sparkles, 
  Building2, 
  Briefcase, 
  MapPin, 
  Star, 
  CheckCircle2, 
  ArrowRight, 
  Globe, 
  Loader2, 
  Bookmark, 
  UserPlus, 
  SlidersHorizontal,
  DollarSign,
  GraduationCap,
  Volume2
} from 'lucide-react';
import { motion } from 'motion/react';

export default function MarketplaceHome() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || 'marketplace'; // 'marketplace' | 'post-requirement' | 'provider-portal' | 'client-dashboard'
  
  // Navigation
  const setTab = (tabName: string) => {
    setSearchParams({ tab: tabName });
    setSelectedBusinessId(null);
  };

  // State
  const [loading, setLoading] = useState(false);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null);
  
  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [selectedBudgetMax, setSelectedBudgetMax] = useState<string>('');
  const [minRating, setMinRating] = useState<string>('');
  const [onlyVerified, setOnlyVerified] = useState<boolean>(false);
  const [onlyOnline, setOnlyOnline] = useState<boolean>(false);
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [viewType, setViewType] = useState<'businesses' | 'requirements'>('businesses');

  // Query Results
  const [businessProfiles, setBusinessProfiles] = useState<BusinessProfile[]>([]);
  const [requirements, setRequirements] = useState<BusinessProject[]>([]);
  
  // Matchmaking State
  const [aiMatching, setAiMatching] = useState(false);
  const [aiMatches, setAiMatches] = useState<{ businessProfileId?: string, projectId?: string, score: number, reason: string }[]>([]);

  // Toggle user view
  const [showProfileSetup, setShowProfileSetup] = useState(false);
  const [hasBusinessProfile, setHasBusinessProfile] = useState(false);

  // Check if current user has business profile
  useEffect(() => {
    if (!user) return;
    const checkProfile = async () => {
      const snap = await getDocs(query(collection(db, 'business_profiles'), where('userId', '==', user.id)));
      if (!snap.empty) {
        setHasBusinessProfile(true);
      } else {
        setHasBusinessProfile(false);
      }
    };
    checkProfile();
  }, [user, currentTab]);

  // Load Marketplace listings
  useEffect(() => {
    if (currentTab !== 'marketplace') return;
    
    const loadMarketplaceData = async () => {
      setLoading(true);
      try {
        if (viewType === 'businesses') {
          const snap = await getDocs(collection(db, 'business_profiles'));
          let list = snap.docs.map(d => ({ id: d.id, ...d.data() } as BusinessProfile));
          
          // Apply Frontend Search Filters
          if (searchTerm) {
            list = list.filter(b => 
              b.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
              b.services.some(s => s.toLowerCase().includes(searchTerm.toLowerCase()))
            );
          }
          if (selectedCategory) {
            list = list.filter(b => b.industry === selectedCategory);
          }
          if (selectedCountry) {
            list = list.filter(b => b.country.toLowerCase().includes(selectedCountry.toLowerCase()));
          }
          if (minRating) {
            list = list.filter(b => b.ratings >= Number(minRating));
          }
          if (onlyVerified) {
            list = list.filter(b => b.isVerified);
          }
          if (onlyOnline) {
            list = list.filter(b => b.isOnline);
          }

          setBusinessProfiles(list);
        } else {
          const snap = await getDocs(query(collection(db, 'business_projects'), where('status', '==', 'OPEN')));
          let list = snap.docs.map(d => ({ id: d.id, ...d.data() } as BusinessProject));

          if (searchTerm) {
            list = list.filter(p => 
              p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
              p.description.toLowerCase().includes(searchTerm.toLowerCase())
            );
          }
          if (selectedCategory) {
            list = list.filter(p => p.category === selectedCategory);
          }
          if (selectedCountry) {
            list = list.filter(p => p.country.toLowerCase().includes(selectedCountry.toLowerCase()));
          }
          if (selectedBudgetMax) {
            list = list.filter(p => p.budget <= Number(selectedBudgetMax));
          }

          setRequirements(list);
        }
      } catch (error) {
        console.error(error);
        toast.error("Failed to load marketplace listings");
      } finally {
        setLoading(false);
      }
    };

    loadMarketplaceData();
  }, [currentTab, viewType, searchTerm, selectedCategory, selectedCountry, minRating, onlyVerified, onlyOnline, selectedBudgetMax]);

  const handleAiRecommend = async () => {
    if (viewType !== 'businesses') {
      toast.error("AI Recommendation is optimized for finding and ranking supplier businesses.");
      return;
    }
    if (businessProfiles.length === 0) {
      toast.error("No business listings found to rank.");
      return;
    }
    setAiMatching(true);
    try {
      const mockProject = {
        title: searchTerm || "General Business Requirement",
        description: `Looking for top-tier specialized providers in: ${selectedCategory || 'Global Business Service'}`,
        category: selectedCategory,
        country: selectedCountry
      };

      const response = await fetch('/api/ai/match-businesses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project: mockProject,
          businessProfiles: businessProfiles.map(b => ({
            businessProfileId: b.id,
            companyName: b.companyName,
            industry: b.industry,
            services: b.services,
            experience: b.experience,
            ratings: b.ratings,
            teamSize: b.teamSize,
            country: b.country
          }))
        })
      });

      if (!response.ok) throw new Error("Matchmaking failed");
      const data = await response.json();
      if (data.matches && Array.isArray(data.matches)) {
        setAiMatches(data.matches);
        
        // Sort current list by match score
        const ranked = [...businessProfiles].map(b => {
          const match = data.matches.find((m: any) => m.businessProfileId === b.id);
          return match ? { ...b, matchScore: match.score, matchReason: match.reason } : b;
        });
        ranked.sort((a: any, b: any) => (b.matchScore || 0) - (a.matchScore || 0));
        setBusinessProfiles(ranked as any);
        toast.success("List successfully ranked with AI Recommended scores!");
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to compile AI recommendations");
    } finally {
      setAiMatching(false);
    }
  };

  const handleSelectCategoryCard = (catName: string) => {
    setSelectedCategory(catName);
    toast.success(`Filtering by category: ${catName}`);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('');
    setSelectedCountry('');
    setSelectedBudgetMax('');
    setMinRating('');
    setOnlyVerified(false);
    setOnlyOnline(false);
    setAiMatches([]);
    toast("Marketplace filters cleared");
  };

  if (selectedBusinessId) {
    return (
      <div className="p-4 md:p-8">
        <BusinessProfilePage 
          businessId={selectedBusinessId} 
          onBack={() => setSelectedBusinessId(null)} 
        />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-8">
      
      {/* Premium Hub Header with Generous Negative Space */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-border pb-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-extrabold font-heading tracking-tight text-foreground flex items-center gap-2">
            <Globe className="w-9 h-9 text-primary animate-pulse" /> Global Business Marketplace
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl leading-relaxed">
            Trade with certified factories, volume wholesalers, software agencies, and legal advisors in 17 high-growth categories.
          </p>
        </div>

        {/* Global Hub Navigation Tabs */}
        <div className="flex flex-wrap gap-2">
          <Button 
            variant={currentTab === 'marketplace' ? 'default' : 'outline'} 
            onClick={() => setTab('marketplace')}
            className="rounded-xl font-medium"
          >
            Browse Marketplace
          </Button>
          <Button 
            variant={currentTab === 'post-requirement' ? 'default' : 'outline'} 
            onClick={() => setTab('post-requirement')}
            className="rounded-xl font-medium"
          >
            Post a Requirement
          </Button>
          <Button 
            variant={currentTab === 'provider-portal' ? 'default' : 'outline'} 
            onClick={() => setTab('provider-portal')}
            className="rounded-xl font-medium"
          >
            Supplier/Provider Portal
          </Button>
          <Button 
            variant={currentTab === 'client-dashboard' ? 'default' : 'outline'} 
            onClick={() => setTab('client-dashboard')}
            className="rounded-xl font-medium"
          >
            Client Tracker
          </Button>
        </div>
      </div>

      {/* RENDER BROWSE MARKETPLACE HUB */}
      {currentTab === 'marketplace' && (
        <div className="space-y-8">
          
          {/* Categories Grid - Only shown when no search query has been entered to keep landing layout beautiful */}
          {!searchTerm && !selectedCategory && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold font-heading flex items-center gap-2">
                <SlidersHorizontal className="w-5 h-5 text-primary" /> Browse by Sourcing Industry
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {BUSINESS_CATEGORIES.map((cat, idx) => {
                  const Icon = cat.icon;
                  return (
                    <motion.div 
                      key={cat.id}
                      whileHover={{ y: -3 }}
                      transition={{ duration: 0.2 }}
                      className="cursor-pointer"
                      onClick={() => handleSelectCategoryCard(cat.name)}
                    >
                      <Card className="h-full border border-border/80 hover:border-primary/40 bg-card/50 hover:bg-card transition-all">
                        <CardContent className="p-4 flex flex-col items-center text-center space-y-3">
                          <div className={`p-3 rounded-xl bg-gradient-to-br ${cat.color} text-white`}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <h3 className="font-semibold text-xs leading-tight line-clamp-1">{cat.name}</h3>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Sourcing Search Engine Filter Banner */}
          <Card className="border border-border bg-card/60">
            <CardContent className="p-6 space-y-4">
              <form onSubmit={(e) => e.preventDefault()} className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-4 top-3.5 h-5 w-5 text-muted-foreground" />
                  <Input 
                    placeholder={viewType === 'businesses' ? "Search organizations, manufacturers, services, or keywords..." : "Search open sourcing specifications..."}
                    className="pl-12 h-12 text-base rounded-xl bg-background"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                  />
                </div>
                
                <div className="flex flex-wrap gap-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="h-12 rounded-xl"
                    onClick={() => setShowFilters(!showFilters)}
                  >
                    <Filter className="w-4 h-4 mr-2" /> Filters {(selectedCategory || selectedCountry || minRating || onlyVerified || onlyOnline) && "•"}
                  </Button>
                  
                  <Button 
                    type="button" 
                    variant={viewType === 'businesses' ? 'default' : 'outline'}
                    onClick={() => setViewType('businesses')}
                    className="h-12 rounded-xl"
                  >
                    Find Suppliers
                  </Button>
                  
                  <Button 
                    type="button" 
                    variant={viewType === 'requirements' ? 'default' : 'outline'}
                    onClick={() => setViewType('requirements')}
                    className="h-12 rounded-xl"
                  >
                    Find Projects
                  </Button>

                  {viewType === 'businesses' && (
                    <Button 
                      type="button" 
                      onClick={handleAiRecommend} 
                      disabled={aiMatching || businessProfiles.length === 0}
                      className="h-12 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-medium"
                    >
                      {aiMatching ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                      AI Rank Matches
                    </Button>
                  )}
                </div>
              </form>

              {/* Advanced Filter Collapse panel */}
              {showFilters && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-4 border border-border bg-accent/20 rounded-xl grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
                  
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Industry Category</label>
                    <select
                      value={selectedCategory}
                      onChange={e => setSelectedCategory(e.target.value)}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="">All Categories</option>
                      {BUSINESS_CATEGORIES.map(cat => (
                        <option key={cat.id} value={cat.name}>{cat.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Country/Region</label>
                    <Input 
                      placeholder="e.g. Singapore, China" 
                      value={selectedCountry}
                      onChange={e => setSelectedCountry(e.target.value)}
                    />
                  </div>

                  {viewType === 'businesses' ? (
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-muted-foreground uppercase">Min Rating</label>
                      <select
                        value={minRating}
                        onChange={e => setMinRating(e.target.value)}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        <option value="">Any Rating</option>
                        <option value="4.5">4.5+ ★ Superior</option>
                        <option value="4.0">4.0+ ★ Reliable</option>
                        <option value="3.0">3.0+ ★ Moderate</option>
                      </select>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-muted-foreground uppercase">Max Budget Limit (USD)</label>
                      <Input 
                        placeholder="e.g. 10000" 
                        type="number"
                        value={selectedBudgetMax}
                        onChange={e => setSelectedBudgetMax(e.target.value)}
                      />
                    </div>
                  )}

                  <div className="col-span-full flex flex-wrap gap-4 items-center justify-between border-t border-border pt-4 mt-2">
                    <div className="flex gap-4">
                      {viewType === 'businesses' && (
                        <>
                          <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={onlyVerified} 
                              onChange={e => setOnlyVerified(e.target.checked)} 
                              className="rounded border-input text-primary focus:ring-primary h-4 w-4"
                            />
                            Verified Supplier Audit
                          </label>
                          <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={onlyOnline} 
                              onChange={e => setOnlyOnline(e.target.checked)} 
                              className="rounded border-input text-primary focus:ring-primary h-4 w-4"
                            />
                            Active Providers Only
                          </label>
                        </>
                      )}
                    </div>
                    <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
                      Reset Filters
                    </Button>
                  </div>

                </motion.div>
              )}
            </CardContent>
          </Card>

          {/* LISTINGS RESULTS VIEW */}
          {loading ? (
            <div className="py-20 flex justify-center">
              <Loader2 className="w-10 h-10 animate-spin text-primary" />
            </div>
          ) : viewType === 'businesses' ? (
            // Suppliers display grid
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {businessProfiles.length === 0 ? (
                <div className="col-span-full py-16 text-center text-muted-foreground border border-dashed rounded-xl">
                  No verified suppliers or companies found matching your queries.
                </div>
              ) : (
                businessProfiles.map((b: any, idx) => (
                  <motion.div 
                    key={b.id} 
                    initial={{ opacity: 0, y: 12 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    transition={{ delay: idx * 0.04 }}
                  >
                    <Card className="h-full hover:border-primary/40 hover:shadow-md transition-all flex flex-col justify-between">
                      <CardHeader className="pb-3 relative">
                        {/* Optional Match Score Tag */}
                        {b.matchScore !== undefined && (
                          <Badge className="absolute top-4 right-4 bg-purple-500 hover:bg-purple-600 text-white text-[10px] font-extrabold shadow-sm">
                            ★ {b.matchScore}% Match
                          </Badge>
                        )}
                        
                        <div className="flex gap-3 items-center">
                          <img 
                            src={b.logo || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=120&auto=format&fit=crop&q=80'} 
                            alt={b.companyName} 
                            className="w-12 h-12 rounded-xl object-cover border border-border"
                          />
                          <div>
                            <div className="flex items-center gap-1">
                              <h3 className="font-bold text-base text-foreground line-clamp-1">{b.companyName}</h3>
                              {b.isVerified && <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <MapPin className="w-3.5 h-3.5 shrink-0" /> <span>{b.country}</span>
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      
                      <CardContent className="space-y-4 flex-1 flex flex-col justify-between">
                        <div className="space-y-2">
                          {b.matchReason && (
                            <div className="bg-purple-500/5 border border-purple-500/10 rounded-xl p-2.5">
                              <p className="text-[11px] text-purple-600 dark:text-purple-400 font-medium leading-normal">{b.matchReason}</p>
                            </div>
                          )}
                          <p className="text-xs text-muted-foreground line-clamp-3">
                            Established agency offering certified services in: {b.services.slice(0, 4).join(', ')}. Experience scale: {b.experience}.
                          </p>
                        </div>

                        <div className="space-y-3">
                          <div className="flex flex-wrap gap-1">
                            {b.services.slice(0, 3).map((s: string) => (
                              <Badge key={s} variant="secondary" className="text-[10px] py-0.5">{s}</Badge>
                            ))}
                            {b.services.length > 3 && (
                              <Badge variant="outline" className="text-[10px] py-0.5">+{b.services.length - 3}</Badge>
                            )}
                          </div>

                          <div className="pt-3 border-t border-border flex justify-between items-center">
                            <div className="flex items-center gap-1 text-sm font-semibold text-amber-500">
                              <Star className="w-4 h-4 fill-amber-500 text-amber-500" /> {b.ratings.toFixed(1)}
                            </div>
                            <Button size="sm" variant="ghost" onClick={() => setSelectedBusinessId(b.id)} className="h-8">
                              View Profile <ArrowRight className="w-4 h-4 ml-1" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))
              )}
            </div>
          ) : (
            // Projects display grid
            <div className="space-y-4">
              {requirements.length === 0 ? (
                <div className="py-16 text-center text-muted-foreground border border-dashed rounded-xl">
                  No active business requirements listed matching your search criteria.
                </div>
              ) : (
                requirements.map((req, idx) => (
                  <motion.div 
                    key={req.id} 
                    initial={{ opacity: 0, y: 10 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    transition={{ delay: idx * 0.04 }}
                  >
                    <Card className="hover:border-primary/30 transition-all">
                      <CardContent className="p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="border-primary/20 text-primary">{req.category}</Badge>
                            <span className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" /> {req.country}</span>
                          </div>
                          <h3 className="text-lg font-bold font-heading">{req.title}</h3>
                          <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">{req.description}</p>
                          <div className="flex flex-wrap gap-1 pt-1">
                            {req.skillsRequired.map(skill => (
                              <Badge key={skill} variant="secondary" className="text-[10px]">{skill}</Badge>
                            ))}
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-3 shrink-0">
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">Estimated Sourcing Budget</p>
                            <p className="text-xl font-extrabold text-foreground">${req.budget.toLocaleString()}</p>
                          </div>
                          
                          <Button size="sm" onClick={() => { setTab('provider-portal'); toast.success(`Submit proposal for: ${req.title}`); }}>
                            Submit Proposal
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))
              )}
            </div>
          )}

        </div>
      )}

      {/* RENDER POST REQUIREMENT */}
      {currentTab === 'post-requirement' && (
        <ClientPostingPage onPostComplete={() => setTab('client-dashboard')} />
      )}

      {/* RENDER SUPPLIER / PROVIDER PORTAL */}
      {currentTab === 'provider-portal' && (
        <div className="space-y-6">
          {!hasBusinessProfile && !showProfileSetup ? (
            <Card className="max-w-2xl mx-auto border-dashed border-border text-center py-12 p-8 space-y-6">
              <Building2 className="w-16 h-16 text-muted-foreground mx-auto" />
              <div className="space-y-2">
                <h3 className="text-xl font-bold font-heading">Register Your Business / Organization</h3>
                <p className="text-muted-foreground text-sm max-w-md mx-auto leading-relaxed">
                  List your manufacturing facility, agency services, wholesale catalog, or consulting firm to receive verified RFQs, project invitations, and match scores.
                </p>
              </div>
              <Button onClick={() => setShowProfileSetup(true)} className="px-8 rounded-xl">
                <UserPlus className="w-4 h-4 mr-2" /> Start Profile Registration
              </Button>
            </Card>
          ) : showProfileSetup ? (
            <div className="space-y-4">
              <Button onClick={() => setShowProfileSetup(false)} variant="ghost" className="hover:bg-accent/50">
                Cancel Registration Setup
              </Button>
              <BusinessProfileEdit onSaved={() => { setHasBusinessProfile(true); setShowProfileSetup(false); }} />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-bold font-heading">Sourcing RFQs & Delivery Management</h2>
                <Button variant="outline" size="sm" onClick={() => setShowProfileSetup(true)}>
                  Edit Corporate Profile
                </Button>
              </div>
              <BusinessDashboard onViewProject={(id) => { setViewType('requirements'); setSearchTerm(''); setTab('marketplace'); }} />
            </div>
          )}
        </div>
      )}

      {/* RENDER CLIENT REQUIREMENTS DASHBOARD */}
      {currentTab === 'client-dashboard' && (
        <ClientMarketplaceDashboard 
          onViewBusinessProfile={(id) => setSelectedBusinessId(id)} 
        />
      )}

    </div>
  );
}
