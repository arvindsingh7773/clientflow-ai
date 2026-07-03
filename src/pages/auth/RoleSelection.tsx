import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/ui/button';
import { UserRole } from '../../types';
import { toast } from 'react-hot-toast';
import { motion } from 'motion/react';
import { Briefcase, User, Building, Landmark } from 'lucide-react';

const ROLES: { id: UserRole; title: string; description: string; icon: React.ReactNode }[] = [
  {
    id: 'CLIENT',
    title: 'Client',
    description: 'I want to hire freelancers and agencies for my projects.',
    icon: <User className="w-6 h-6" />
  },
  {
    id: 'FREELANCER',
    title: 'Freelancer',
    description: 'I am a solo professional looking for high-quality work.',
    icon: <Briefcase className="w-6 h-6" />
  },
  {
    id: 'AGENCY',
    title: 'Agency',
    description: 'We are a team of professionals offering services.',
    icon: <Building className="w-6 h-6" />
  },
  {
    id: 'BUSINESS',
    title: 'Enterprise Business',
    description: 'Large organization looking for scalable talent solutions.',
    icon: <Landmark className="w-6 h-6" />
  }
];

export function RoleSelection() {
  const navigate = useNavigate();
  const { updateRole, firebaseUser } = useAuth();
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(false);

  // If they aren't authenticated with Firebase at all, send to login
  if (!firebaseUser) {
    navigate('/login');
    return null;
  }

  const handleContinue = async () => {
    if (!selectedRole) return;
    
    setLoading(true);
    try {
      await updateRole(selectedRole);
      toast.success('Profile completed successfully!');
      navigate('/');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-xl mx-auto w-full px-6 py-12"
    >
      <div className="mb-10 text-center">
        <h1 className="text-3xl md:text-4xl font-bold font-heading mb-4">How do you want to use ClientFlow AI?</h1>
        <p className="text-muted-foreground text-lg">
          Select your primary goal to help us personalize your experience.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {ROLES.map((role) => (
          <div
            key={role.id}
            onClick={() => setSelectedRole(role.id)}
            className={`
              p-6 rounded-2xl border-2 cursor-pointer transition-all duration-200
              ${selectedRole === role.id 
                ? 'border-primary bg-primary/5' 
                : 'border-border bg-card hover:border-primary/50 hover:bg-accent'}
            `}
          >
            <div className={`
              w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-colors
              ${selectedRole === role.id ? 'bg-primary text-primary-foreground' : 'bg-accent text-muted-foreground'}
            `}>
              {role.icon}
            </div>
            <h3 className="text-lg font-semibold font-heading mb-2">{role.title}</h3>
            <p className="text-sm text-muted-foreground">{role.description}</p>
          </div>
        ))}
      </div>

      <div className="flex justify-center">
        <Button 
          size="lg" 
          className="w-full md:w-auto min-w-[240px] h-14 text-base"
          disabled={!selectedRole || loading}
          onClick={handleContinue}
        >
          {loading ? 'Setting up your profile...' : 'Continue to Dashboard'}
        </Button>
      </div>
    </motion.div>
  );
}
