import { 
  Ship, 
  Video, 
  Globe, 
  Smartphone, 
  Palette, 
  Layers, 
  Megaphone, 
  Search, 
  FileText, 
  Cpu, 
  Headphones, 
  Briefcase, 
  Factory, 
  Package, 
  Store, 
  Truck, 
  Lightbulb 
} from 'lucide-react';

export interface CategoryItem {
  id: string;
  name: string;
  description: string;
  icon: any;
  color: string;
}

export const BUSINESS_CATEGORIES: CategoryItem[] = [
  {
    id: 'import-export',
    name: 'Import & Export',
    description: 'Global trade representation, customs clearances, and international freight matching.',
    icon: Ship,
    color: 'from-blue-500 to-indigo-500'
  },
  {
    id: 'video-editors',
    name: 'Video Editors',
    description: 'Professional visual media editing, colour grading, sound design, and content creation.',
    icon: Video,
    color: 'from-red-500 to-pink-500'
  },
  {
    id: 'website-developers',
    name: 'Website Developers',
    description: 'Custom React, Vue, Next.js, WordPress and full-stack enterprise web development.',
    icon: Globe,
    color: 'from-cyan-500 to-blue-500'
  },
  {
    id: 'mobile-app-developers',
    name: 'Mobile App Developers',
    description: 'Native iOS & Android, Flutter, and React Native mobile application development.',
    icon: Smartphone,
    color: 'from-violet-500 to-purple-500'
  },
  {
    id: 'graphic-designers',
    name: 'Graphic Designers',
    description: 'Corporate brand identity development, high-end infographics, and digital assets.',
    icon: Palette,
    color: 'from-orange-500 to-amber-500'
  },
  {
    id: 'ui-ux-designers',
    name: 'UI/UX Designers',
    description: 'Interactive wireframing, high-fidelity mockups, design systems, and user testing.',
    icon: Layers,
    color: 'from-indigo-500 to-purple-500'
  },
  {
    id: 'digital-marketing',
    name: 'Digital Marketing',
    description: 'Targeted PPC campaigns, social media management, lead generation, and growth loops.',
    icon: Megaphone,
    color: 'from-rose-500 to-pink-500'
  },
  {
    id: 'seo-experts',
    name: 'SEO Experts',
    description: 'On-page SEO, technical architecture audits, link building, and rank optimization.',
    icon: Search,
    color: 'from-teal-500 to-emerald-500'
  },
  {
    id: 'content-writers',
    name: 'Content Writers',
    description: 'High-quality copywriting, ghostwriting, business plan creation, and technical articles.',
    icon: FileText,
    color: 'from-yellow-500 to-orange-500'
  },
  {
    id: 'ai-automation-experts',
    name: 'AI Automation Experts',
    description: 'Gemini integrations, LLM fine-tuning, voicebots, and smart process automations.',
    icon: Cpu,
    color: 'from-purple-500 to-indigo-600'
  },
  {
    id: 'virtual-assistants',
    name: 'Virtual Assistants',
    description: 'Executive administration, inbox management, appointment scheduling, and data entry.',
    icon: Headphones,
    color: 'from-sky-500 to-indigo-500'
  },
  {
    id: 'agencies',
    name: 'Agencies',
    description: 'Full-service digital boutiques, software factories, and multifaceted business firms.',
    icon: Briefcase,
    color: 'from-emerald-500 to-teal-600'
  },
  {
    id: 'manufacturers',
    name: 'Manufacturers',
    description: 'Industrial manufacturing facilities, prototyping services, and factory sourcing.',
    icon: Factory,
    color: 'from-stone-500 to-zinc-600'
  },
  {
    id: 'suppliers',
    name: 'Suppliers',
    description: 'Direct materials, supply chain providers, raw chemical compounds, and hardware.',
    icon: Package,
    color: 'from-blue-600 to-cyan-600'
  },
  {
    id: 'wholesalers',
    name: 'Wholesalers',
    description: 'Bulk inventory sellers, commodity distribution channels, and volume pricing.',
    icon: Store,
    color: 'from-amber-600 to-red-600'
  },
  {
    id: 'logistics-shipping',
    name: 'Logistics & Shipping',
    description: 'Third-party logistics (3PL), global freight forwarding, and local warehouse hubs.',
    icon: Truck,
    color: 'from-green-600 to-teal-600'
  },
  {
    id: 'business-consultants',
    name: 'Business Consultants',
    description: 'Strategic market expansions, corporate legal advisory, financial audits, and seed pitches.',
    icon: Lightbulb,
    color: 'from-indigo-600 to-rose-600'
  }
];
