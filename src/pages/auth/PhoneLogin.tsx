import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signInWithPhoneNumber, ConfirmationResult } from 'firebase/auth';
import { auth, setupRecaptcha } from '../../lib/firebase';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { toast } from 'react-hot-toast';
import { motion } from 'motion/react';
import { Phone, ArrowLeft } from 'lucide-react';

export function PhoneLogin() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [showOtp, setShowOtp] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);

  useEffect(() => {
    // Initialize recaptcha when component mounts
    setupRecaptcha('recaptcha-container');
  }, []);

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber) {
      toast.error('Please enter a phone number');
      return;
    }
    
    setLoading(true);
    try {
      const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+1${phoneNumber}`;
      const appVerifier = window.recaptchaVerifier;
      const result = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
      setConfirmationResult(result);
      setShowOtp(true);
      toast.success('Verification code sent');
    } catch (error: any) {
      toast.error(error.message || 'Failed to send verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || !confirmationResult) return;
    
    setLoading(true);
    try {
      await confirmationResult.confirm(otp);
      toast.success('Phone verified successfully');
      navigate('/');
    } catch (error: any) {
      toast.error('Invalid verification code');
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
          Back to login options
        </Link>
        <h1 className="text-3xl font-bold font-heading mb-2">Phone verification</h1>
        <p className="text-muted-foreground">
          {showOtp 
            ? 'Enter the 6-digit code sent to your phone.' 
            : 'Enter your phone number to receive a verification code.'}
        </p>
      </div>

      <div id="recaptcha-container"></div>

      {!showOtp ? (
        <form onSubmit={handleSendCode} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground" />
              <Input 
                id="phone" 
                type="tel" 
                placeholder="+1 234 567 8900" 
                className="pl-10"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                required 
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Please include your country code (e.g. +1 for US).
            </p>
          </div>

          <Button type="submit" className="w-full h-12 mt-4" disabled={loading}>
            {loading ? 'Sending...' : 'Send Code'}
          </Button>
        </form>
      ) : (
        <form onSubmit={handleVerifyCode} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="otp">Verification Code</Label>
            <Input 
              id="otp" 
              type="text" 
              placeholder="123456" 
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="text-center text-2xl tracking-widest h-14"
              required 
            />
          </div>

          <Button type="submit" className="w-full h-12 mt-4" disabled={loading || otp.length < 6}>
            {loading ? 'Verifying...' : 'Verify & Continue'}
          </Button>
          
          <div className="text-center mt-4">
            <button 
              type="button" 
              onClick={() => setShowOtp(false)}
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              Change phone number
            </button>
          </div>
        </form>
      )}
    </motion.div>
  );
}
