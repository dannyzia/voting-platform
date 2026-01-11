import { useState } from 'react';

interface Constituency {
  id: string;
  code: string;
  name: string;
  district: string;
  candidateCount: number;
}

interface Props {
  constituencies: Constituency[];
  onSelect: (constituency: Constituency) => void;
}

export default function ConstituencySelector({ constituencies, onSelect }: Props) {
  const [search, setSearch] = useState('');
  const [selectedDivision, setSelectedDivision] = useState<string>('');

  // Get unique divisions (from district names)
  const divisions = [...new Set(constituencies.map(c => c.district))].sort();

  // Filter constituencies
  const filtered = constituencies.filter(c => {
    const matchesSearch = 
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.code.toLowerCase().includes(search.toLowerCase()) ||
      c.district.toLowerCase().includes(search.toLowerCase());
    
    const matchesDivision = !selectedDivision || c.district === selectedDivision;
    
    return matchesSearch && matchesDivision;
  });

  return (
    <div className="animate-fade-in">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-display font-bold mb-2">Select Your Constituency</h2>
        <p className="text-slate-400">Choose the constituency where you are registered to vote</p>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="Search by name, code, or district..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-4 py-3 pl-12 rounded-xl bg-slate-800/50 border border-slate-700 focus:border-primary-500 focus:outline-none text-white placeholder-slate-500 transition-colors"
          />
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        
        <select
          value={selectedDivision}
          onChange={(e) => setSelectedDivision(e.target.value)}
          className="px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700 focus:border-primary-500 focus:outline-none text-white transition-colors"
        >
          <option value="">All Districts</option>
          {divisions.map(d => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
      </div>

      {/* Results count */}
      <p className="text-sm text-slate-500 mb-4">
        Showing {filtered.length} of {constituencies.length} constituencies
      </p>

      {/* Constituency Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 stagger-children">
        {filtered.map((constituency) => (
          <button
            key={constituency.id}
            onClick={() => onSelect(constituency)}
            className="text-left glass rounded-xl p-5 hover:border-primary-500/50 transition-all duration-300 group"
          >
            <div className="flex items-start justify-between mb-2">
              <span className="text-xs font-mono text-primary-400 bg-primary-500/10 px-2 py-1 rounded">
                {constituency.code}
              </span>
              <span className="text-xs text-slate-500">
                {constituency.candidateCount} candidates
              </span>
            </div>
            <h3 className="text-lg font-semibold group-hover:text-primary-400 transition-colors">
              {constituency.name}
            </h3>
            <p className="text-sm text-slate-400">{constituency.district}</p>
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-slate-500">
          <p>No constituencies match your search</p>
        </div>
      )}
    </div>
  );
}
