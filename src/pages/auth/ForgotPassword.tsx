import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { toast } from 'react-hot-toast';
import { motion } from 'motion/react';
import { Mail, ArrowLeft } from 'lucide-react';

export function ForgotPassword() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      toast.success('Password reset email sent!');
      setSent(true);
    } catch (error: any) {
      toast.error(error.message || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="mb-8">
        <Link to="/login" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to login
        </Link>
        <h1 className="text-3xl font-bold font-heading mb-2">Reset password</h1>
        <p className="text-muted-foreground">
          Enter your email address and we'll send you a link to reset your password.
        </p>
      </div>

      {!sent ? (
        <form onSubmit={handleReset} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email address</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground" />
              <Input 
                id="email" 
                type="email" 
                placeholder="name@example.com" 
                className="pl-10"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required 
              />
            </div>
          </div>

          <Button type="submit" className="w-full h-12 mt-4" disabled={loading}>
            {loading ? 'Sending link...' : 'Send reset link'}
          </Button>
        </form>
      ) : (
        <div className="p-6 bg-green-500/10 border border-green-500/20 rounded-2xl text-center">
          <h3 className="text-lg font-medium text-green-500 mb-2">Check your inbox</h3>
          <p className="text-muted-foreground text-sm">
            We've sent a password reset link to <strong>{email}</strong>.
          </p>
          <Button 
            variant="outline" 
            className="mt-6 w-full h-12"
            onClick={() => setSent(false)}
          >
            Try another email
          </Button>
        </div>
      )}
    </motion.div>
  );
}
