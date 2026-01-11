import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface VoteContextType {
  sessionToken: string | null;
  electionId: string | null;
  constituencyId: string | null;
  hasVoted: boolean;
  setSession: (token: string, electionId: string) => void;
  setConstituency: (id: string) => void;
  markAsVoted: () => void;
  clearSession: () => void;
}

const VoteContext = createContext<VoteContextType | undefined>(undefined);

export function VoteProvider({ children }: { children: ReactNode }) {
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [electionId, setElectionId] = useState<string | null>(null);
  const [constituencyId, setConstituencyId] = useState<string | null>(null);
  const [hasVoted, setHasVoted] = useState(false);

  const setSession = useCallback((token: string, election: string) => {
    setSessionToken(token);
    setElectionId(election);
    setHasVoted(false);
  }, []);

  const setConstituency = useCallback((id: string) => {
    setConstituencyId(id);
  }, []);

  const markAsVoted = useCallback(() => {
    setHasVoted(true);
  }, []);

  const clearSession = useCallback(() => {
    setSessionToken(null);
    setElectionId(null);
    setConstituencyId(null);
    setHasVoted(false);
  }, []);

  return (
    <VoteContext.Provider
      value={{
        sessionToken,
        electionId,
        constituencyId,
        hasVoted,
        setSession,
        setConstituency,
        markAsVoted,
        clearSession
      }}
    >
      {children}
    </VoteContext.Provider>
  );
}

export function useVote() {
  const context = useContext(VoteContext);
  if (context === undefined) {
    throw new Error('useVote must be used within a VoteProvider');
  }
  return context;
}
