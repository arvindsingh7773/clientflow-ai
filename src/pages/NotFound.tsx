import { Link } from 'react-router-dom';
import { Compass, Home, ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/button';
import { SEO } from '../components/SEO';

export function NotFound() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-white relative overflow-hidden" id="not-found-screen">
      <SEO 
        title="404 Page Not Found" 
        description="The page you are looking for does not exist on ClientFlow AI. Navigate back to safety."
      />
      
      {/* Background Decorative Ambient Gradients */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl -z-10 animate-pulse" />
      <div className="absolute bottom-1/4 left-1/3 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl -z-10" />

      <div className="max-w-md w-full text-center space-y-6 relative z-10">
        <div className="w-20 h-20 bg-indigo-500/10 text-indigo-400 rounded-2xl flex items-center justify-center mx-auto border border-indigo-500/20 shadow-lg shadow-indigo-500/5">
          <Compass className="w-10 h-10 animate-spin" style={{ animationDuration: '10s' }} />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-7xl font-extrabold font-heading text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
            404
          </h1>
          <h2 className="text-2xl font-bold font-heading">Lost in Space?</h2>
          <p className="text-slate-400 text-sm max-w-sm mx-auto">
            The page you requested doesn't exist, was renamed, or has traveled to another dimension.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-4 justify-center">
          <Button 
            variant="outline"
            onClick={() => window.history.back()}
            className="border-slate-800 hover:bg-slate-900 hover:text-white text-slate-300 flex items-center justify-center gap-2 h-11"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </Button>
          <Button 
            asChild
            className="bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center gap-2 h-11 shadow-lg shadow-indigo-600/20"
          >
            <Link to="/">
              <Home className="w-4 h-4" />
              Return Home
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
