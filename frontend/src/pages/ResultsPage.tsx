import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getResults, getMapData, getElection } from '../utils/api';
import ElectionMap from '../components/ElectionMap';
import MapLegend from '../components/MapLegend';
import ConstituencyPopup from '../components/ConstituencyPopup';

interface ConstituencyResult {
  constituencyId: string;
  constituencyCode: string;
  constituencyName: string;
  mapColor: string;
  winnerName: string;
  winnerParty: string;
  winningPercentage: number;
  totalVotes: number;
}

interface PartySummary {
  party_id: string;
  party_name: string;
  party_short: string;
  party_color: string;
  seats_won: number;
  total_votes: number;
}

export default function ResultsPage() {
  const { electionId } = useParams<{ electionId: string }>();
  const [election, setElection] = useState<any>(null);
  const [results, setResults] = useState<any>(null);
  const [mapData, setMapData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedConstituency, setSelectedConstituency] = useState<ConstituencyResult | null>(null);

  useEffect(() => {
    async function loadData() {
      if (!electionId) return;
      
      try {
        const [electionData, resultsData, mapGeoJson] = await Promise.all([
          getElection(electionId),
          getResults(electionId),
          getMapData(electionId).catch(() => null)
        ]);
        
        setElection(electionData);
        setResults(resultsData);
        setMapData(mapGeoJson);
      } catch (error) {
        console.error('Failed to load results:', error);
      } finally {
        setLoading(false);
      }
    }
    
    loadData();
  }, [electionId]);

  const handleConstituencyClick = (constituency: ConstituencyResult | null) => {
    setSelectedConstituency(constituency);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-slate-800 py-4">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold">{election?.name}</h1>
            <p className="text-sm text-slate-400">Live Election Results</p>
          </div>
          <Link
            to="/"
            className="text-sm text-slate-400 hover:text-white transition-colors"
          >
            ← Back to Elections
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="glass rounded-xl p-4">
            <p className="text-sm text-slate-400">Total Constituencies</p>
            <p className="text-3xl font-display font-bold text-primary-400">
              {results?.totalConstituencies || 0}
            </p>
          </div>
          <div className="glass rounded-xl p-4">
            <p className="text-sm text-slate-400">Results Declared</p>
            <p className="text-3xl font-display font-bold text-green-400">
              {results?.resultsDeclared || 0}
            </p>
          </div>
          <div className="glass rounded-xl p-4">
            <p className="text-sm text-slate-400">In Progress</p>
            <p className="text-3xl font-display font-bold text-yellow-400">
              {results?.inProgress || 0}
            </p>
          </div>
          <div className="glass rounded-xl p-4">
            <p className="text-sm text-slate-400">Total Votes Cast</p>
            <p className="text-3xl font-display font-bold text-slate-300">
              {election?.stats?.totalVotesCast?.toLocaleString() || 0}
            </p>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Map */}
          <div className="lg:col-span-2">
            <div className="glass rounded-2xl overflow-hidden" style={{ height: '600px' }}>
              <ElectionMap
                mapData={mapData}
                results={results}
                onConstituencyClick={handleConstituencyClick}
              />
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Party Summary & Legend */}
            <MapLegend partySummary={results?.partySummary} />

            {/* Selected Constituency */}
            {selectedConstituency && (
              <ConstituencyPopup
                constituency={selectedConstituency}
                onClose={() => setSelectedConstituency(null)}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
