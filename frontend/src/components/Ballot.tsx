interface Constituency {
  id: string;
  code: string;
  name: string;
  district: string;
}

interface Candidate {
  id: string;
  name: string;
  partyName: string;
  partyShort: string;
  partyColor: string;
  symbol: string;
  logoUrl: string;
}

interface Props {
  constituency: Constituency;
  candidates: Candidate[];
  onSelect: (candidate: Candidate) => void;
  onBack: () => void;
}

export default function Ballot({ constituency, candidates, onSelect, onBack }: Props) {
  return (
    <div className="animate-fade-in">
      {/* Back button and constituency info */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={onBack}
          className="p-2 rounded-lg hover:bg-slate-800 transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h2 className="text-2xl font-display font-bold">{constituency.name}</h2>
          <p className="text-slate-400">{constituency.district} • {constituency.code}</p>
        </div>
      </div>

      <div className="text-center mb-8">
        <p className="text-xl text-slate-300">Select your candidate</p>
        <p className="text-sm text-slate-500">Click on a candidate card to cast your vote</p>
      </div>

      {/* Candidates Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 stagger-children">
        {candidates.map((candidate) => (
          <button
            key={candidate.id}
            onClick={() => onSelect(candidate)}
            className="candidate-card text-left glass rounded-2xl p-6 hover:border-primary-500/50 border-2 border-transparent"
            style={{ 
              '--party-color': candidate.partyColor || '#808080' 
            } as React.CSSProperties}
          >
            {/* Party color indicator */}
            <div 
              className="w-full h-2 rounded-full mb-4"
              style={{ backgroundColor: candidate.partyColor || '#808080' }}
            />
            
            {/* Candidate info */}
            <div className="flex gap-4 mb-4">
              <div className="w-16 h-16 rounded-xl bg-slate-700 flex items-center justify-center overflow-hidden shrink-0">
                {candidate.logoUrl ? (
                  <img src={candidate.logoUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl">🗳️</span>
                )}
              </div>
              <div>
                <h3 className="text-lg font-semibold">{candidate.name}</h3>
                <p className="text-sm" style={{ color: candidate.partyColor || '#94a3b8' }}>
                  {candidate.partyName || 'Independent'}
                </p>
                {candidate.partyShort && (
                  <span className="inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium bg-slate-700">
                    {candidate.partyShort}
                  </span>
                )}
              </div>
            </div>

            {/* Symbol */}
            {candidate.symbol && (
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <span>Symbol:</span>
                <span className="font-medium text-slate-300">{candidate.symbol}</span>
              </div>
            )}

            {/* Vote indicator */}
            <div className="mt-4 pt-4 border-t border-slate-700 flex items-center justify-between">
              <span className="text-sm text-slate-500">Click to select</span>
              <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
