import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getActiveElections } from '../utils/api';

interface Election {
  id: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  totalConstituencies: number;
}

export default function Home() {
  const [elections, setElections] = useState<Election[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadElections() {
      try {
        const data = await getActiveElections();
        setElections(data.elections || []);
      } catch (error) {
        console.error('Failed to load elections:', error);
      } finally {
        setLoading(false);
      }
    }
    loadElections();
  }, []);

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-900/20 via-transparent to-accent-900/10" />
        <div className="relative max-w-7xl mx-auto px-4 py-24 sm:px-6 lg:px-8">
          <div className="text-center animate-fade-in">
            <h1 className="text-5xl md:text-7xl font-display font-bold tracking-tight mb-6">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary-400 to-primary-200">
                Bangladesh
              </span>
              <br />
              <span className="text-white">Digital Voting Platform</span>
            </h1>
            <p className="text-xl md:text-2xl text-slate-300 max-w-3xl mx-auto mb-8">
              Secure, transparent, and accessible voting for the nation's democratic future
            </p>
            <div className="flex items-center justify-center gap-3 text-sm text-slate-400">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary-500 animate-pulse-slow" />
                Device Verified Voting
              </span>
              <span className="text-slate-600">•</span>
              <span>Real-time Results</span>
              <span className="text-slate-600">•</span>
              <span>End-to-End Encryption</span>
            </div>
          </div>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-accent-500/10 rounded-full blur-3xl" />
      </header>

      {/* Elections Section */}
      <main className="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-display font-semibold mb-8 text-center">
          Active Elections
        </h2>

        {loading ? (
          <div className="flex justify-center">
            <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : elections.length === 0 ? (
          <div className="text-center py-16 glass rounded-2xl">
            <svg className="w-20 h-20 mx-auto mb-6 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-xl font-semibold text-slate-300 mb-2">No Active Elections</h3>
            <p className="text-slate-400">Check back later for upcoming elections</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 stagger-children">
            {elections.map((election) => (
              <div
                key={election.id}
                className="glass rounded-2xl p-6 hover:border-primary-500/50 transition-all duration-300 group"
              >
                <div className="flex items-start justify-between mb-4">
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-primary-500/20 text-primary-400">
                    Active
                  </span>
                  <span className="text-sm text-slate-400">
                    {election.totalConstituencies} Constituencies
                  </span>
                </div>
                
                <h3 className="text-xl font-display font-semibold mb-2 group-hover:text-primary-400 transition-colors">
                  {election.name}
                </h3>
                
                {election.description && (
                  <p className="text-slate-400 text-sm mb-4 line-clamp-2">
                    {election.description}
                  </p>
                )}
                
                <div className="text-xs text-slate-500 mb-6">
                  {new Date(election.startDate).toLocaleDateString()} - {new Date(election.endDate).toLocaleDateString()}
                </div>
                
                <div className="flex gap-3">
                  <Link
                    to={`/vote/${election.id}`}
                    className="flex-1 px-4 py-3 rounded-xl bg-primary-600 hover:bg-primary-500 text-white font-medium text-center transition-colors"
                  >
                    Vote Now
                  </Link>
                  <Link
                    to={`/results/${election.id}`}
                    className="px-4 py-3 rounded-xl border border-slate-600 hover:border-primary-500 text-slate-300 font-medium transition-colors"
                  >
                    Results
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-8 mt-16">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm text-slate-500">
          <p>Bangladesh Election Commission • Secure Digital Voting Platform</p>
          <Link to="/admin" className="text-slate-600 hover:text-slate-400 mt-2 inline-block">
            Admin Access
          </Link>
        </div>
      </footer>
    </div>
  );
}
