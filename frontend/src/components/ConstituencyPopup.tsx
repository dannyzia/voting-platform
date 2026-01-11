interface ConstituencyResult {
  constituencyId: string;
  constituencyCode: string;
  constituencyName: string;
  mapColor: string;
  winnerName?: string;
  winnerParty?: string;
  winningPercentage?: number;
  victoryMargin?: number;
  totalVotes: number;
  turnoutPercentage?: number;
  colorBreakdown?: Array<{
    candidateName: string;
    partyShort: string;
    partyColor: string;
    voteCount: number;
    percentage: string;
  }>;
}

interface ConstituencyPopupProps {
  constituency: ConstituencyResult | null;
  onClose?: () => void;
}

export default function ConstituencyPopup({ constituency, onClose }: ConstituencyPopupProps) {
  if (!constituency) {
    return null;
  }

  return (
    <div className="glass rounded-2xl p-6 animate-fade-in">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-display font-semibold">
            {constituency.constituencyName}
          </h3>
          <p className="text-sm text-slate-400">{constituency.constituencyCode}</p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-700 transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Winner Info */}
      {constituency.winnerName && (
        <div className="mb-4 p-4 rounded-xl bg-slate-800/50 border border-slate-700">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <span className="text-sm font-medium text-slate-400">Leading/Winner</span>
          </div>
          <p className="text-xl font-bold">{constituency.winnerName}</p>
          <p className="text-sm text-slate-400">{constituency.winnerParty}</p>
        </div>
      )}

      {/* Statistics */}
      <div className="space-y-3 mb-4">
        {constituency.winningPercentage !== undefined && (
          <div className="flex justify-between">
            <span className="text-slate-400">Vote Share</span>
            <span className="font-medium">
              {constituency.winningPercentage.toFixed(1)}%
            </span>
          </div>
        )}
        
        {constituency.victoryMargin !== undefined && constituency.victoryMargin > 0 && (
          <div className="flex justify-between">
            <span className="text-slate-400">Victory Margin</span>
            <span className="font-medium">
              {constituency.victoryMargin.toFixed(1)}%
            </span>
          </div>
        )}
        
        <div className="flex justify-between">
          <span className="text-slate-400">Total Votes</span>
          <span className="font-medium">
            {constituency.totalVotes?.toLocaleString() || 0}
          </span>
        </div>
        
        {constituency.turnoutPercentage !== undefined && (
          <div className="flex justify-between">
            <span className="text-slate-400">Turnout</span>
            <span className="font-medium">
              {constituency.turnoutPercentage.toFixed(1)}%
            </span>
          </div>
        )}
      </div>

      {/* Vote Breakdown */}
      {constituency.colorBreakdown && constituency.colorBreakdown.length > 0 && (
        <div className="pt-4 border-t border-slate-700">
          <h4 className="text-sm font-semibold mb-3">Vote Breakdown</h4>
          <div className="space-y-2">
            {constituency.colorBreakdown.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: item.partyColor }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{item.candidateName}</p>
                  <p className="text-xs text-slate-500">{item.partyShort}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{item.percentage}%</p>
                  <p className="text-xs text-slate-500">{item.voteCount.toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
