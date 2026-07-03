import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Sparkles } from 'lucide-react';

export function ProtectedRoute() {
  const { user, firebaseUser, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center animate-pulse">
            <Sparkles className="w-6 h-6 text-primary-foreground" />
          </div>
          <div className="text-sm text-muted-foreground font-medium">Authenticating...</div>
        </div>
      </div>
    );
  }

  // Not authenticated at all
  if (!firebaseUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Authenticated but no profile (needs role selection)
  if (firebaseUser && !user && location.pathname !== '/role-selection') {
    return <Navigate to="/role-selection" replace />;
  }

  return <Outlet />;
}
