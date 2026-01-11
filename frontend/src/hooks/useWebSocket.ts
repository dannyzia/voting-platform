import { useEffect, useRef, useState, useCallback } from 'react';

interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

interface UseWebSocketOptions {
  electionId: string;
  onConstituencyUpdate?: (data: any) => void;
  onVoteCount?: (totalVotes: number) => void;
}

export function useWebSocket({ electionId, onConstituencyUpdate, onVoteCount }: UseWebSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const reconnectTimeoutRef = useRef<number>();

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws`;

    try {
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        setConnected(true);
        console.log('WebSocket connected');
        
        // Subscribe to election updates
        wsRef.current?.send(JSON.stringify({
          type: 'subscribe',
          electionId
        }));
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          
          switch (message.type) {
            case 'constituency_update':
              if (message.electionId === electionId && onConstituencyUpdate) {
                onConstituencyUpdate(message);
              }
              break;
            case 'vote_count':
              if (message.electionId === electionId && onVoteCount) {
                onVoteCount(message.totalVotes);
              }
              break;
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      wsRef.current.onclose = () => {
        setConnected(false);
        console.log('WebSocket disconnected');
        
        // Attempt to reconnect after 5 seconds
        reconnectTimeoutRef.current = window.setTimeout(() => {
          connect();
        }, 5000);
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
    }
  }, [electionId, onConstituencyUpdate, onVoteCount]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    setConnected(false);
  }, []);

  useEffect(() => {
    connect();
    
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return { connected, disconnect };
}
