import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Button } from '@/src/components/ui/button';
import { Badge } from '@/src/components/ui/badge';
import { ArrowRight, Bot, Shield, Zap, Globe, Users, Briefcase, Check } from 'lucide-react';
import { SEO } from '../components/SEO';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-hot-toast';

const fadeIn = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] }
};

const stagger = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

export function LandingPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState([
    { label: 'Active Projects', value: '...' },
    { label: 'Vetted Experts', value: '...' },
    { label: 'Success Rate', value: '...' },
    { label: 'Countries', value: '...' },
  ]);

  useEffect(() => {
    const fetchRealStats = async () => {
      try {
        const projectsSnap = await getDocs(collection(db, 'projects'));
        const usersSnap = await getDocs(collection(db, 'users'));
        
        const projects = projectsSnap.docs.map(doc => doc.data());
        const users = usersSnap.docs.map(doc => doc.data());

        const activeProjectsCount = projects.filter(p => p.status === 'OPEN' || p.status === 'IN_PROGRESS' || p.status === 'UNDER_REVIEW').length;
        const vettedExpertsCount = users.filter(u => u.role === 'FREELANCER' || u.role === 'AGENCY').length;

        const completedCount = projects.filter(p => p.status === 'COMPLETED').length;
        const cancelledCount = projects.filter(p => p.status === 'CANCELLED').length;
        const totalClosed = completedCount + cancelledCount;
        const successRateValue = totalClosed > 0 ? `${((completedCount / totalClosed) * 100).toFixed(1)}%` : 'No data available';

        const countriesSet = new Set<string>();
        users.forEach(u => {
          if (u.country && u.country.trim() !== '') {
            countriesSet.add(u.country.trim());
          } else if (u.location && u.location.trim() !== '') {
            countriesSet.add(u.location.trim());
          }
        });
        const countriesCount = countriesSet.size;

        setStats([
          { label: 'Active Projects', value: activeProjectsCount > 0 ? `${activeProjectsCount}` : '0' },
          { label: 'Vetted Experts', value: vettedExpertsCount > 0 ? `${vettedExpertsCount}` : '0' },
          { label: 'Success Rate', value: successRateValue },
          { label: 'Countries', value: countriesCount > 0 ? `${countriesCount}` : '0' },
        ]);
      } catch (e) {
        console.error("Error loading landing page stats from Firestore:", e);
        setStats([
          { label: 'Active Projects', value: '0' },
          { label: 'Vetted Experts', value: '0' },
          { label: 'Success Rate', value: 'No data available' },
          { label: 'Countries', value: '0' },
        ]);
      }
    };
    fetchRealStats();
  }, []);

  // Determine paths based on logged-in user and role
  const isClientOrBusiness = user?.role === 'CLIENT' || user?.role === 'BUSINESS' || user?.role === 'ADMIN';
  const hireTalentPath = user ? (isClientOrBusiness ? '/dashboard/projects/new' : '/dashboard') : '/signup?role=CLIENT';
  const findWorkPath = user ? (isClientOrBusiness ? '/dashboard' : '/dashboard/freelancer/browse') : '/signup?role=FREELANCER';
  const createAccountPath = user ? '/dashboard' : '/signup';

  return (
    <div className="flex flex-col min-h-screen pt-20">
      <SEO 
        title="ClientFlow AI - Next-Gen AI B2B & Freelance Talent Network" 
        description="Connect with top-vetted global clients, elite freelancers, and top-tier agencies. Powered by intelligent Gemini AI matchmaking, automated project scoping, and secure milestone escrow payments."
      />
      
      {/* Hero Section */}
      <section className="relative pt-24 pb-32 overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] opacity-20 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 blur-[100px] rounded-full mix-blend-screen" />
        </div>
        
        <div className="container mx-auto px-6 relative z-10">
          <motion.div 
            initial="initial"
            animate="animate"
            variants={stagger}
            className="flex flex-col items-center text-center max-w-4xl mx-auto"
          >
            <motion.div variants={fadeIn} className="mb-6">
              <Badge variant="glass" className="px-4 py-1.5 text-sm border-white/10">
                <SparklesIcon className="w-4 h-4 mr-2 text-blue-400" />
                ClientFlow AI 2.0 is now live
              </Badge>
            </motion.div>
            
            <motion.h1 variants={fadeIn} className="text-5xl md:text-7xl font-bold font-heading tracking-tight mb-8 leading-[1.1]">
              The world's smartest AI-powered <br className="hidden md:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-white">talent network.</span>
            </motion.h1>
            
            <motion.p variants={fadeIn} className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl">
              Connect with global clients, elite freelancers, and top-tier agencies.
              Powered by advanced AI matching, automated scoping, and secure escrow.
            </motion.p>
            
            <motion.div variants={fadeIn} className="flex flex-col sm:flex-row items-center gap-4">
              <Link to={hireTalentPath} className="w-full sm:w-auto">
                <Button size="lg" className="w-full h-14 px-8 text-base shadow-[0_0_40px_rgba(255,255,255,0.1)]">
                  Hire Top Talent
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <Link to={findWorkPath} className="w-full sm:w-auto">
                <Button size="lg" variant="glass" className="w-full h-14 px-8 text-base">
                  Find Great Work
                </Button>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 border-y border-border/50 bg-card/50">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 text-center">
            {stats.map((stat, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="flex flex-col gap-2"
              >
                <div className="text-4xl md:text-5xl font-bold font-heading text-white">{stat.value}</div>
                <div className="text-sm text-muted-foreground uppercase tracking-wider font-medium">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-32 relative">
        <div className="container mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <h2 className="text-3xl md:text-5xl font-bold font-heading tracking-tight mb-6">
              Not just another marketplace.
            </h2>
            <p className="text-lg text-muted-foreground">
              We rebuilt the entire freelance experience from the ground up using advanced AI to eliminate friction, negotiation overhead, and bad matches.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <FeatureCard 
              icon={<Bot className="w-8 h-8 text-blue-400" />}
              title="AI Project Scoping"
              description="Our AI Assistant automatically generates precise project scopes, milestones, and budgets based on your rough idea."
              delay={0.1}
            />
            <FeatureCard 
              icon={<Zap className="w-8 h-8 text-purple-400" />}
              title="Instant Matching"
              description="Skip the endless scrolling. Get matched with the top 3 verified professionals whose skills exactly fit your scope."
              delay={0.2}
            />
            <FeatureCard 
              icon={<Shield className="w-8 h-8 text-green-400" />}
              title="Smart Escrow"
              description="Funds are secured in smart contracts and released automatically when AI-verified milestones are completed."
              delay={0.3}
            />
          </div>
        </div>
      </section>

      {/* Solutions Section */}
      <section id="solutions" className="py-32 relative border-t border-border/50 bg-background/50">
        <div className="container mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <Badge variant="glass" className="mb-4 px-4 py-1.5 text-sm border-white/10">
              Tailored Solutions
            </Badge>
            <h2 className="text-3xl md:text-5xl font-bold font-heading tracking-tight mb-6">
              Designed for every stage of growth.
            </h2>
            <p className="text-lg text-muted-foreground">
              Whether you are an independent builder, a scaling startup, or a global enterprise, ClientFlow AI provides the tools to execute flawlessly.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Startup Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="p-8 rounded-3xl bg-card border border-border/50 hover:border-border transition-all flex flex-col justify-between"
            >
              <div>
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center mb-6">
                  <Zap className="w-6 h-6 text-blue-400" />
                </div>
                <h3 className="text-2xl font-bold font-heading mb-3 text-white">For Startups</h3>
                <p className="text-muted-foreground mb-6 leading-relaxed text-sm">
                  Hire top 1% developers, designers, and marketers in minutes. Fully structured and scoped milestones mean you launch faster without overhead.
                </p>
                <ul className="space-y-3 mb-8 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400" /> AI-generated product scoping
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400" /> Matches in under 24 hours
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400" /> Pay-as-you-go milestone escrow
                  </li>
                </ul>
              </div>
              <Link to={hireTalentPath} className="w-full">
                <Button className="w-full bg-blue-500 hover:bg-blue-600 text-white">Hire Talent</Button>
              </Link>
            </motion.div>

            {/* Agencies Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="p-8 rounded-3xl bg-card border border-border/50 hover:border-border transition-all flex flex-col justify-between"
            >
              <div>
                <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center mb-6">
                  <Users className="w-6 h-6 text-purple-400" />
                </div>
                <h3 className="text-2xl font-bold font-heading mb-3 text-white">For Agencies</h3>
                <p className="text-muted-foreground mb-6 leading-relaxed text-sm">
                  Expand your capacity dynamically. Seamlessly scale up delivery with elite specialists under strict white-label legal agreements.
                </p>
                <ul className="space-y-3 mb-8 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400" /> Multi-member team matching
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400" /> Dedicated account structures
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400" /> Unified milestone billing
                  </li>
                </ul>
              </div>
              <Link to={findWorkPath} className="w-full">
                <Button variant="outline" className="w-full border-purple-500/30 hover:bg-purple-500/10">Find Agency Projects</Button>
              </Link>
            </motion.div>

            {/* Enterprise Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="p-8 rounded-3xl bg-card border border-border/50 hover:border-border transition-all flex flex-col justify-between"
            >
              <div>
                <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center mb-6">
                  <Globe className="w-6 h-6 text-green-400" />
                </div>
                <h3 className="text-2xl font-bold font-heading mb-3 text-white">For Enterprises</h3>
                <p className="text-muted-foreground mb-6 leading-relaxed text-sm">
                  Complete workforce compliance, custom integrations, and dedicated high-touch support for complex technical buildout initiatives.
                </p>
                <ul className="space-y-3 mb-8 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400" /> IP and NDA compliance protection
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400" /> MSA & custom payment terms
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400" /> Dedicated success manager
                  </li>
                </ul>
              </div>
              <Button 
                className="w-full bg-green-500 hover:bg-green-600 text-white"
                onClick={() => {
                  toast.success("Enterprise request received! An executive will contact you in 12 hours.");
                }}
              >
                Contact Enterprise
              </Button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-32 relative border-t border-border/50">
        <div className="container mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <Badge variant="glass" className="mb-4 px-4 py-1.5 text-sm border-white/10">
              Transparent Pricing
            </Badge>
            <h2 className="text-3xl md:text-5xl font-bold font-heading tracking-tight mb-6">
              Simple, flexible plans. No hidden fees.
            </h2>
            <p className="text-lg text-muted-foreground">
              Choose the plan that is right for you. Free plans available for independent professionals and clients looking to hire.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Free Plan */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="p-8 rounded-3xl bg-card border border-border/50 hover:border-border transition-all flex flex-col justify-between"
            >
              <div>
                <h3 className="text-xl font-bold font-heading mb-2 text-white">Starter</h3>
                <p className="text-sm text-muted-foreground mb-6">Perfect for launching new projects</p>
                <div className="flex items-baseline gap-1 mb-8">
                  <span className="text-4xl font-bold font-heading text-white">$0</span>
                  <span className="text-muted-foreground text-sm">/ forever</span>
                </div>
                <ul className="space-y-4 mb-8 text-sm">
                  <li className="flex items-center gap-3 text-muted-foreground">
                    <Check className="w-4 h-4 text-green-400 shrink-0" />
                    <span>Post unlimited open projects</span>
                  </li>
                  <li className="flex items-center gap-3 text-muted-foreground">
                    <Check className="w-4 h-4 text-green-400 shrink-0" />
                    <span>Standard AI matching & scoping</span>
                  </li>
                  <li className="flex items-center gap-3 text-muted-foreground">
                    <Check className="w-4 h-4 text-green-400 shrink-0" />
                    <span>Secure milestone escrow storage</span>
                  </li>
                </ul>
              </div>
              <Link to={createAccountPath} className="w-full">
                <Button variant="outline" className="w-full">Get Started</Button>
              </Link>
            </motion.div>

            {/* Pro Plan */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="p-8 rounded-3xl bg-card border-2 border-primary hover:border-primary transition-all flex flex-col justify-between relative"
            >
              <div className="absolute top-0 right-8 -translate-y-1/2 bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wider">
                Popular
              </div>
              <div>
                <h3 className="text-xl font-bold font-heading mb-2 text-white">Business Pro</h3>
                <p className="text-sm text-muted-foreground mb-6">For scaling teams & growing brands</p>
                <div className="flex items-baseline gap-1 mb-8">
                  <span className="text-4xl font-bold font-heading text-white">$49</span>
                  <span className="text-muted-foreground text-sm">/ month</span>
                </div>
                <ul className="space-y-4 mb-8 text-sm">
                  <li className="flex items-center gap-3 text-muted-foreground">
                    <Check className="w-4 h-4 text-green-400 shrink-0" />
                    <span className="text-white">Priority 1-hour AI expert match</span>
                  </li>
                  <li className="flex items-center gap-3 text-muted-foreground">
                    <Check className="w-4 h-4 text-green-400 shrink-0" />
                    <span>Advanced milestone performance stats</span>
                  </li>
                  <li className="flex items-center gap-3 text-muted-foreground">
                    <Check className="w-4 h-4 text-green-400 shrink-0" />
                    <span>Reduced platform contract fee (2%)</span>
                  </li>
                  <li className="flex items-center gap-3 text-muted-foreground">
                    <Check className="w-4 h-4 text-green-400 shrink-0" />
                    <span>Premium 24/7 priority support</span>
                  </li>
                </ul>
              </div>
              <Button 
                className="w-full bg-primary hover:bg-primary/95"
                onClick={() => {
                  toast.success("Pro subscription initiated! Complete checkout inside your dashboard.");
                }}
              >
                Go Pro Now
              </Button>
            </motion.div>

            {/* Enterprise Plan */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="p-8 rounded-3xl bg-card border border-border/50 hover:border-border transition-all flex flex-col justify-between"
            >
              <div>
                <h3 className="text-xl font-bold font-heading mb-2 text-white">Enterprise</h3>
                <p className="text-sm text-muted-foreground mb-6">Full compliance & high scale tools</p>
                <div className="flex items-baseline gap-1 mb-8">
                  <span className="text-4xl font-bold font-heading text-white">Custom</span>
                  <span className="text-muted-foreground text-sm"></span>
                </div>
                <ul className="space-y-4 mb-8 text-sm">
                  <li className="flex items-center gap-3 text-muted-foreground">
                    <Check className="w-4 h-4 text-green-400 shrink-0" />
                    <span>Custom legal MSAs & contract terms</span>
                  </li>
                  <li className="flex items-center gap-3 text-muted-foreground">
                    <Check className="w-4 h-4 text-green-400 shrink-0" />
                    <span>Complete corporate compliance & vetting</span>
                  </li>
                  <li className="flex items-center gap-3 text-muted-foreground">
                    <Check className="w-4 h-4 text-green-400 shrink-0" />
                    <span>Dedicated account success team</span>
                  </li>
                  <li className="flex items-center gap-3 text-muted-foreground">
                    <Check className="w-4 h-4 text-green-400 shrink-0" />
                    <span>API access & Custom integrations</span>
                  </li>
                </ul>
              </div>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => {
                  toast.success("Enterprise demo request received! We will schedule a custom brief with you.");
                }}
              >
                Contact Sales
              </Button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-accent" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] opacity-10 pointer-events-none">
           <div className="absolute inset-0 bg-gradient-to-b from-white to-transparent blur-[100px] rounded-full" />
        </div>
        
        <div className="container mx-auto px-6 relative z-10 text-center">
          <h2 className="text-4xl md:text-6xl font-bold font-heading tracking-tight mb-8">
            Ready to join the future of work?
          </h2>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
             <Link to={createAccountPath} className="w-full sm:w-auto">
               <Button size="lg" className="w-full h-14 px-8 text-base bg-white text-black hover:bg-white/90">
                  Create Free Account
               </Button>
             </Link>
             <Button 
               size="lg" 
               variant="outline" 
               className="w-full sm:w-auto h-14 px-8 text-base border-white/20 hover:bg-white/10"
               onClick={() => {
                 toast.success("Demo request submitted! We'll reach out to your registered email.");
               }}
             >
                Book a Demo
             </Button>
          </div>
        </div>
      </section>
      
    </div>
  );
}

function FeatureCard({ icon, title, description, delay }: { icon: React.ReactNode, title: string, description: string, delay: number }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.5 }}
      className="p-8 rounded-3xl bg-card border border-border/50 hover:border-border transition-colors group"
    >
      <div className="w-16 h-16 rounded-2xl bg-accent flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-300">
        {icon}
      </div>
      <h3 className="text-xl font-semibold font-heading mb-4">{title}</h3>
      <p className="text-muted-foreground leading-relaxed">{description}</p>
    </motion.div>
  );
}

function SparklesIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
      <path d="M5 3v4" />
      <path d="M19 17v4" />
      <path d="M3 5h4" />
      <path d="M17 19h4" />
    </svg>
  );
}
