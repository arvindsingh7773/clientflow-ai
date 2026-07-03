import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/src/components/ui/button';
import { Menu, X, Sparkles, User as UserIcon, LogOut } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '@/src/contexts/AuthContext';

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { firebaseUser, user, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const scrollToSection = (id: string) => {
    if (window.location.pathname !== '/') {
      navigate('/#' + id);
      setTimeout(() => {
        const element = document.getElementById(id);
        if (element) element.scrollIntoView({ behavior: 'smooth' });
      }, 300);
    } else {
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b border-transparent',
        isScrolled ? 'bg-background/80 backdrop-blur-lg border-border' : 'bg-transparent'
      )}
    >
      <div className="container mx-auto px-6 h-20 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-heading font-bold text-xl tracking-tight">ClientFlow AI</span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-8">
          <button 
            onClick={() => scrollToSection('features')} 
            className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors cursor-pointer bg-transparent border-none p-0 outline-none"
          >
            Features
          </button>
          <button 
            onClick={() => scrollToSection('solutions')} 
            className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors cursor-pointer bg-transparent border-none p-0 outline-none"
          >
            Solutions
          </button>
          <button 
            onClick={() => scrollToSection('pricing')} 
            className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors cursor-pointer bg-transparent border-none p-0 outline-none"
          >
            Pricing
          </button>
          <div className="h-4 w-px bg-border"></div>
          
          {firebaseUser ? (
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium">{user?.name || firebaseUser.email}</span>
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                <LogOut className="w-4 h-4 mr-2" />
                Sign out
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <Link to="/login" className="text-sm font-medium text-primary hover:text-primary/80 transition-colors">Log in</Link>
              <Link to="/signup">
                <Button variant="default">Get Started</Button>
              </Link>
            </div>
          )}
        </nav>

        {/* Mobile Toggle */}
        <button 
          className="md:hidden p-2 -mr-2"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="md:hidden absolute top-full left-0 right-0 bg-background border-b border-border p-6 flex flex-col gap-6 shadow-2xl"
          >
            <nav className="flex flex-col gap-4 items-start">
              <button 
                onClick={() => { scrollToSection('features'); setMobileMenuOpen(false); }} 
                className="text-lg font-medium text-muted-foreground hover:text-primary transition-colors cursor-pointer bg-transparent border-none p-0 outline-none"
              >
                Features
              </button>
              <button 
                onClick={() => { scrollToSection('solutions'); setMobileMenuOpen(false); }} 
                className="text-lg font-medium text-muted-foreground hover:text-primary transition-colors cursor-pointer bg-transparent border-none p-0 outline-none"
              >
                Solutions
              </button>
              <button 
                onClick={() => { scrollToSection('pricing'); setMobileMenuOpen(false); }} 
                className="text-lg font-medium text-muted-foreground hover:text-primary transition-colors cursor-pointer bg-transparent border-none p-0 outline-none"
              >
                Pricing
              </button>
            </nav>
            <div className="flex flex-col gap-3 pt-4 border-t border-border">
              {firebaseUser ? (
                <>
                  <div className="px-4 py-2 mb-2 bg-accent/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">Signed in as</p>
                    <p className="font-medium truncate">{user?.name || firebaseUser.email}</p>
                  </div>
                  <Button variant="outline" className="w-full justify-center" onClick={handleSignOut}>
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign out
                  </Button>
                </>
              ) : (
                <>
                  <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="outline" className="w-full justify-center">Log in</Button>
                  </Link>
                  <Link to="/signup" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="default" className="w-full justify-center">Get Started</Button>
                  </Link>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
