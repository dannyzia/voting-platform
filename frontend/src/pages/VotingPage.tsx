import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useVote } from '../context/VoteContext';
import { generateFingerprint } from '../utils/fingerprint';
import { getElection, getConstituencies, getCandidates, verifyDevice, castVote } from '../utils/api';
import ConstituencySelector from '../components/ConstituencySelector';
import Ballot from '../components/Ballot';
import VoteConfirmation from '../components/VoteConfirmation';

type VotingStep = 'verifying' | 'selecting-constituency' | 'voting' | 'confirming' | 'success' | 'error';

interface Election {
  id: string;
  name: string;
  description: string;
}

interface Constituency {
  id: string;
  code: string;
  name: string;
  district: string;
  candidateCount: number;
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

export default function VotingPage() {
  const { electionId } = useParams<{ electionId: string }>();
  const navigate = useNavigate();
  const { sessionToken, setSession, setConstituency, markAsVoted, hasVoted } = useVote();
  
  const [step, setStep] = useState<VotingStep>('verifying');
  const [election, setElection] = useState<Election | null>(null);
  const [constituencies, setConstituencies] = useState<Constituency[]>([]);
  const [selectedConstituency, setSelectedConstituency] = useState<Constituency | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [receiptToken, setReceiptToken] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Verify device on mount
  useEffect(() => {
    async function verifyAndLoad() {
      if (!electionId) return;
      
      try {
        // Load election info
        const electionData = await getElection(electionId);
        setElection(electionData);
        
        // Generate fingerprint
        const fingerprint = await generateFingerprint();
        
        // Verify device
        const result = await verifyDevice(fingerprint, electionId);
        
        if (result.canVote) {
          setSession(result.sessionToken, electionId);
          
          // Load constituencies
          const constData = await getConstituencies(electionId);
          setConstituencies(constData.constituencies || []);
          
          setStep('selecting-constituency');
        } else {
          setErrorMessage(result.reason || 'You cannot vote in this election');
          setStep('error');
        }
      } catch (error: any) {
        console.error('Verification error:', error);
        setErrorMessage(error.response?.data?.reason || 'Failed to verify device');
        setStep('error');
      }
    }
    
    verifyAndLoad();
  }, [electionId, setSession]);

  // Load candidates when constituency is selected
  const handleConstituencySelect = async (constituency: Constituency) => {
    setSelectedConstituency(constituency);
    setConstituency(constituency.id);
    
    try {
      const data = await getCandidates(electionId!, constituency.id);
      setCandidates(data.candidates || []);
      setStep('voting');
    } catch (error) {
      toast.error('Failed to load candidates');
    }
  };

  // Handle candidate selection
  const handleCandidateSelect = (candidate: Candidate) => {
    setSelectedCandidate(candidate);
    setStep('confirming');
  };

  // Handle vote submission
  const handleVoteSubmit = async () => {
    if (!sessionToken || !selectedConstituency || !selectedCandidate) return;
    
    try {
      const result = await castVote(
        electionId!,
        selectedConstituency.id,
        selectedCandidate.id,
        sessionToken
      );
      
      if (result.success) {
        setReceiptToken(result.receiptToken);
        markAsVoted();
        setStep('success');
        toast.success('Vote successfully recorded!');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to submit vote');
      setStep('voting');
    }
  };

  // Render based on step
  const renderStep = () => {
    switch (step) {
      case 'verifying':
        return (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-20 h-20 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mb-8" />
            <h2 className="text-2xl font-display font-semibold mb-2">Verifying Device</h2>
            <p className="text-slate-400">Please wait while we verify your device...</p>
          </div>
        );
      
      case 'selecting-constituency':
        return (
          <ConstituencySelector
            constituencies={constituencies}
            onSelect={handleConstituencySelect}
          />
        );
      
      case 'voting':
        return (
          <Ballot
            constituency={selectedConstituency!}
            candidates={candidates}
            onSelect={handleCandidateSelect}
            onBack={() => setStep('selecting-constituency')}
          />
        );
      
      case 'confirming':
        return (
          <VoteConfirmation
            constituency={selectedConstituency!}
            candidate={selectedCandidate!}
            onConfirm={handleVoteSubmit}
            onCancel={() => setStep('voting')}
          />
        );
      
      case 'success':
        return (
          <div className="text-center py-20 animate-fade-in">
            <div className="w-24 h-24 rounded-full bg-primary-500/20 flex items-center justify-center mx-auto mb-8">
              <svg className="w-12 h-12 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-3xl font-display font-bold text-primary-400 mb-4">
              Vote Successfully Cast!
            </h2>
            <p className="text-slate-300 mb-8 max-w-md mx-auto">
              Your vote has been securely recorded. Thank you for participating in the democratic process.
            </p>
            <div className="glass inline-block px-6 py-4 rounded-xl mb-8">
              <p className="text-sm text-slate-400 mb-2">Receipt Token</p>
              <code className="text-lg font-mono text-primary-300">{receiptToken}</code>
            </div>
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => navigate(`/results/${electionId}`)}
                className="px-6 py-3 rounded-xl bg-primary-600 hover:bg-primary-500 text-white font-medium transition-colors"
              >
                View Results
              </button>
              <button
                onClick={() => navigate('/')}
                className="px-6 py-3 rounded-xl border border-slate-600 hover:border-primary-500 text-slate-300 font-medium transition-colors"
              >
                Return Home
              </button>
            </div>
          </div>
        );
      
      case 'error':
        return (
          <div className="text-center py-20 animate-fade-in">
            <div className="w-24 h-24 rounded-full bg-accent-500/20 flex items-center justify-center mx-auto mb-8">
              <svg className="w-12 h-12 text-accent-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-3xl font-display font-bold text-accent-400 mb-4">
              Unable to Vote
            </h2>
            <p className="text-slate-300 mb-8 max-w-md mx-auto">
              {errorMessage}
            </p>
            <button
              onClick={() => navigate('/')}
              className="px-6 py-3 rounded-xl border border-slate-600 hover:border-primary-500 text-slate-300 font-medium transition-colors"
            >
              Return Home
            </button>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-slate-800 py-4">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-display font-semibold">{election?.name || 'Loading...'}</h1>
            <p className="text-sm text-slate-400">{election?.description}</p>
          </div>
          <button
            onClick={() => navigate('/')}
            className="text-sm text-slate-400 hover:text-white transition-colors"
          >
            ← Back to Elections
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {renderStep()}
      </main>
    </div>
  );
}
