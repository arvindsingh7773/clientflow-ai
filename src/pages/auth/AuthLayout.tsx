import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { motion } from 'motion/react';

export function AuthLayout() {
  return (
    <div className="min-h-screen bg-background flex">
      {/* Left side - Auth Form */}
      <div className="flex-1 flex flex-col justify-center px-6 sm:px-12 lg:px-24 xl:px-32 relative z-10">
        <Link to="/" className="absolute top-8 left-6 sm:left-12 flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-heading font-bold text-xl tracking-tight">ClientFlow AI</span>
        </Link>
        
        <div className="w-full max-w-md mx-auto">
          <Outlet />
        </div>
      </div>

      {/* Right side - Abstract Graphic (Hidden on mobile) */}
      <div className="hidden lg:flex flex-1 relative bg-accent overflow-hidden items-center justify-center">
        {/* Background Gradients */}
        <div className="absolute inset-0">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-br from-blue-500/20 via-purple-500/20 to-pink-500/20 blur-[100px] rounded-full mix-blend-screen" />
        </div>
        
        {/* Decorative elements */}
        <div className="relative z-10 max-w-lg text-center px-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-3xl xl:text-5xl font-bold font-heading leading-tight mb-6 text-white">
              The smartest way to hire and work globally.
            </h2>
            <p className="text-lg text-white/70">
              Join millions of businesses and professionals leveraging AI to build the future.
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
