interface PartySummary {
  party_id: string;
  party_name: string;
  party_short: string;
  party_color: string;
  seats_won: number;
  total_votes: number;
}

interface MapLegendProps {
  partySummary?: PartySummary[];
  maxDisplay?: number;
}

export default function MapLegend({ partySummary = [], maxDisplay = 10 }: MapLegendProps) {
  return (
    <div className="glass rounded-2xl p-6">
      <h3 className="text-lg font-display font-semibold mb-4">Party Standings</h3>
      
      {partySummary.length === 0 ? (
        <p className="text-sm text-slate-500">No results yet</p>
      ) : (
        <div className="space-y-3">
          {partySummary.slice(0, maxDisplay).map((party: PartySummary) => (
            <div key={party.party_id} className="flex items-center gap-3">
              <div
                className="w-4 h-4 rounded-full shrink-0"
                style={{ backgroundColor: party.party_color || '#808080' }}
                title={party.party_name}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" title={party.party_name}>
                  {party.party_short || party.party_name}
                </p>
                <p className="text-xs text-slate-500">
                  {party.total_votes?.toLocaleString() || 0} votes
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold">{party.seats_won || 0}</p>
                <p className="text-xs text-slate-500">seats</p>
              </div>
            </div>
          ))}
        </div>
      )}
      
      <div className="mt-6 pt-6 border-t border-slate-700">
        <h4 className="text-sm font-semibold mb-2">Map Legend</h4>
        <p className="text-xs text-slate-400 leading-relaxed">
          Constituency colors represent a proportional blend of party colors based on vote percentages. 
          Hover over constituencies to highlight, click to view detailed results.
        </p>
      </div>
    </div>
  );
}
