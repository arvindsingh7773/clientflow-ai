import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { ClientDashboard } from './client/ClientDashboard';
import { FreelancerDashboard } from './freelancer/FreelancerDashboard';
import { AdminDashboard } from './admin/AdminDashboard';

export function DashboardHome() {
  const { user } = useAuth();

  if (!user) return null;

  if (user.role === 'ADMIN' || user.email === 'arvind7773singh14@gmail.com') {
    return <AdminDashboard />;
  }

  if (user.role === 'CLIENT' || user.role === 'BUSINESS') {
    return <ClientDashboard />;
  }
  
  if (user.role === 'FREELANCER' || user.role === 'AGENCY') {
    return <FreelancerDashboard />;
  }

  return <div className="p-8">Dashboard for {user.role} coming soon.</div>;
}
