declare global {
  interface Window {
    recaptchaVerifier: any;
  }
}

export type UserRole = 'CLIENT' | 'FREELANCER' | 'AGENCY' | 'BUSINESS' | 'ADMIN';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
  joinedAt: string;
  walletBalance?: number;
  aiCredits?: number;
  subscriptionPlan?: 'FREE' | 'PRO_FREELANCER' | 'AGENCY_PRO' | 'BUSINESS_PRO';
  subscriptionExpiresAt?: string;
  isFeatured?: boolean;
}

export type ProjectStatus = 'DRAFT' | 'OPEN' | 'IN_PROGRESS' | 'UNDER_REVIEW' | 'COMPLETED' | 'CANCELLED';

export interface Project {
  id?: string;
  title: string;
  description: string;
  budgetMin: number;
  budgetMax: number;
  currency: string;
  category: string;
  clientId: string;
  status: ProjectStatus;
  skillsRequired: string[];
  deadline: string;
  attachments?: string[];
  createdAt: string;
  updatedAt: string;
  proposalsCount: number;
  hiredFreelancerId?: string; // New: track hired freelancer
}

export interface FreelancerProfile {
  userId: string;
  headline: string;
  bio: string;
  hourlyRate: number;
  skills: string[];
  portfolio: PortfolioItem[];
  experience: Experience[];
  education: Education[];
  savedProjects: string[];
}

export interface PortfolioItem {
  id: string;
  title: string;
  description: string;
  link?: string;
  imageUrl?: string;
}

export interface Experience {
  id: string;
  company: string;
  role: string;
  startDate: string;
  endDate?: string;
  description: string;
}

export interface Education {
  id: string;
  institution: string;
  degree: string;
  year: string;
}

export interface Proposal {
  id?: string;
  projectId: string;
  freelancerId: string;
  coverLetter: string;
  bidAmount: number;
  estimatedDays: number;
  status: 'PENDING' | 'SHORTLISTED' | 'ACCEPTED' | 'REJECTED';
  createdAt: string;
  updatedAt: string;
}

export interface ChatRoom {
  id: string;
  participantIds: string[];
  participantNames: Record<string, string>;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: Record<string, number>;
  projectId?: string;
}

export interface Message {
  id?: string;
  roomId: string;
  senderId: string;
  text: string;
  createdAt: string;
  read: boolean;
}

export interface Notification {
  id?: string;
  userId: string;
  title: string;
  body: string;
  read: boolean;
  type: 'NEW_PROPOSAL' | 'PROPOSAL_ACCEPTED' | 'NEW_MESSAGE' | 'PROJECT_UPDATE' | 'GENERAL';
  link?: string;
  createdAt: string;
}

export interface Review {
  id?: string;
  projectId: string;
  reviewerId: string;
  revieweeId: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface Milestone {
  id?: string;
  projectId: string;
  title: string;
  amount: number;
  status: 'PENDING' | 'ACTIVE' | 'SUBMITTED' | 'APPROVED' | 'PAID';
  dueDate?: string;
}

export interface Transaction {
  id: string;
  userId: string;
  type: 'DEPOSIT' | 'WITHDRAWAL' | 'ESCROW_FUND' | 'ESCROW_RELEASE' | 'REFUND' | 'SUBSCRIPTION';
  amount: number;
  currency: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
  description: string;
  projectId?: string;
  milestoneId?: string;
  createdAt: string;
  paymentMethod?: string;
  invoiceNumber?: string;
}

export interface PaymentProvider {
  name: string;
  initializePayment: (amount: number, currency: string, metadata: any) => Promise<{ success: boolean; transactionId: string; details: any }>;
  processRefund: (transactionId: string, amount: number) => Promise<{ success: boolean; refundId: string }>;
  withdrawFunds: (userId: string, amount: number, destination: string) => Promise<{ success: boolean; payoutId: string }>;
}

export interface BusinessProfile {
  id: string;
  userId: string;
  logo?: string;
  banner?: string;
  companyName: string;
  country: string;
  industry: string;
  services: string[];
  experience: string;
  certifications: string[];
  portfolio: { title: string; description: string; url?: string; imageUrl?: string }[];
  reviews: { authorName: string; rating: number; comment: string; date: string }[];
  ratings: number;
  teamSize: number;
  website?: string;
  socialLinks?: { linkedin?: string; twitter?: string; github?: string };
  isVerified?: boolean;
  isOnline?: boolean;
  savedClients?: string[];
  savedProjects?: string[];
}

export interface BusinessProject {
  id: string;
  clientId: string;
  title: string;
  description: string;
  category: string;
  budget: number;
  country: string;
  timeline: string;
  language: string;
  skillsRequired: string[];
  files?: string[];
  isPublic: boolean;
  createdAt: string;
  status: 'OPEN' | 'HIRED' | 'COMPLETED' | 'CANCELLED';
  proposalsCount?: number;
}

export interface BusinessProposal {
  id: string;
  businessProjectId: string;
  businessProfileId: string;
  companyName?: string;
  logo?: string;
  coverLetter: string;
  bidAmount: number;
  timeline: string;
  status: 'PENDING' | 'SHORTLISTED' | 'HIRED' | 'REJECTED';
  createdAt: string;
}


