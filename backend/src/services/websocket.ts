import { WebSocketServer, WebSocket } from "ws";
import { Server } from "http";

interface Client {
  ws: WebSocket;
  electionId?: string;
}

class WebSocketService {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, Client> = new Map();

  initialize(server: Server) {
    this.wss = new WebSocketServer({ server, path: "/ws" });

    this.wss.on("connection", (ws, req) => {
      const clientId = this.generateClientId();
      this.clients.set(clientId, { ws });

      console.log(`WebSocket client connected: ${clientId}`);

      ws.on("message", (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleMessage(clientId, message);
        } catch (error) {
          console.error("Invalid WebSocket message:", error);
        }
      });

      ws.on("close", () => {
        this.clients.delete(clientId);
        console.log(`WebSocket client disconnected: ${clientId}`);
      });

      ws.on("error", (error) => {
        console.error("WebSocket error:", error);
        this.clients.delete(clientId);
      });

      // Send welcome message
      ws.send(
        JSON.stringify({
          type: "connected",
          clientId,
          timestamp: new Date().toISOString(),
        }),
      );
    });

    console.log("WebSocket server initialized");
  }

  private generateClientId(): string {
    return Math.random().toString(36).substring(2, 15);
  }

  private handleMessage(clientId: string, message: any) {
    const client = this.clients.get(clientId);
    if (!client) return;

    switch (message.type) {
      case "subscribe":
        // Subscribe to election updates
        client.electionId = message.electionId;
        console.log(
          `Client ${clientId} subscribed to election ${message.electionId}`,
        );
        break;

      case "unsubscribe":
        client.electionId = undefined;
        break;

      case "ping":
        client.ws.send(JSON.stringify({ type: "pong" }));
        break;
    }
  }

  /**
   * Broadcast constituency update to all subscribed clients
   */
  broadcastConstituencyUpdate(
    electionId: string,
    constituencyId: string,
    data: {
      mapColor: string;
      breakdown: any[];
      totalVotes: number;
      winnerName?: string;
      winnerParty?: string;
    },
  ) {
    const message = JSON.stringify({
      type: "constituency_update",
      electionId,
      constituencyId,
      data,
      timestamp: new Date().toISOString(),
    });

    this.clients.forEach((client) => {
      if (
        client.electionId === electionId &&
        client.ws.readyState === WebSocket.OPEN
      ) {
        client.ws.send(message);
      }
    });
  }

  /**
   * Broadcast vote count update
   */
  broadcastVoteCount(electionId: string, totalVotes: number) {
    const message = JSON.stringify({
      type: "vote_count",
      electionId,
      totalVotes,
      timestamp: new Date().toISOString(),
    });

    this.clients.forEach((client) => {
      if (
        client.electionId === electionId &&
        client.ws.readyState === WebSocket.OPEN
      ) {
        client.ws.send(message);
      }
    });
  }

  /**
   * Get connected client count for an election
   */
  getClientCount(electionId?: string): number {
    if (!electionId) {
      return this.clients.size;
    }

    let count = 0;
    this.clients.forEach((client) => {
      if (client.electionId === electionId) count++;
    });
    return count;
  }

  /**
   * Check if WebSocket server is connected and running
   */
  isConnected(): boolean {
    return this.wss !== null && this.wss.readyState === 1;
  }
}

export const wsService = new WebSocketService();
