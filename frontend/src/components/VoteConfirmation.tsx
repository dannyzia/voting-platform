import { useState } from 'react';

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
  candidate: Candidate;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function VoteConfirmation({ constituency, candidate, onConfirm, onCancel }: Props) {
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleConfirm = async () => {
    setSubmitting(true);
    await onConfirm();
    setSubmitting(false);
  };

  return (
    <div className="max-w-lg mx-auto animate-fade-in">
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-full bg-yellow-500/20 flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-2xl font-display font-bold mb-2">Confirm Your Vote</h2>
        <p className="text-slate-400">Please review your selection before submitting</p>
      </div>

      {/* Vote summary */}
      <div className="glass rounded-2xl p-6 mb-6">
        <div className="mb-6">
          <p className="text-sm text-slate-500 mb-1">Constituency</p>
          <p className="text-lg font-semibold">{constituency.name}</p>
          <p className="text-sm text-slate-400">{constituency.district} • {constituency.code}</p>
        </div>

        <div className="border-t border-slate-700 pt-6">
          <p className="text-sm text-slate-500 mb-3">Your Vote</p>
          <div className="flex items-center gap-4">
            <div 
              className="w-16 h-16 rounded-xl flex items-center justify-center overflow-hidden shrink-0"
              style={{ backgroundColor: candidate.partyColor + '20' }}
            >
              {candidate.logoUrl ? (
                <img src={candidate.logoUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl">🗳️</span>
              )}
            </div>
            <div>
              <h3 className="text-xl font-semibold">{candidate.name}</h3>
              <p style={{ color: candidate.partyColor || '#94a3b8' }}>
                {candidate.partyName || 'Independent'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Warning */}
      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-6">
        <p className="text-sm text-yellow-300">
          <strong>Important:</strong> Once you submit your vote, it cannot be changed. 
          This action is final and your device will be marked as having voted.
        </p>
      </div>

      {/* Confirmation checkbox */}
      <label className="flex items-start gap-3 mb-6 cursor-pointer group">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
          className="mt-1 w-5 h-5 rounded border-2 border-slate-600 bg-transparent checked:bg-primary-500 checked:border-primary-500 transition-colors"
        />
        <span className="text-sm text-slate-300 group-hover:text-white transition-colors">
          I confirm that I am casting my vote for <strong>{candidate.name}</strong> in 
          constituency <strong>{constituency.name}</strong>. I understand this action cannot be undone.
        </span>
      </label>

      {/* Actions */}
      <div className="flex gap-4">
        <button
          onClick={onCancel}
          disabled={submitting}
          className="flex-1 px-6 py-4 rounded-xl border border-slate-600 hover:border-slate-500 text-slate-300 font-medium transition-colors disabled:opacity-50"
        >
          Go Back
        </button>
        <button
          onClick={handleConfirm}
          disabled={!confirmed || submitting}
          className="flex-1 px-6 py-4 rounded-xl bg-primary-600 hover:bg-primary-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-medium transition-colors flex items-center justify-center gap-2"
        >
          {submitting ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Submit Vote
            </>
          )}
        </button>
      </div>
    </div>
  );
}
