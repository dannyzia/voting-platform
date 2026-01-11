import { createClient, RedisClientType } from "redis";
import axios from "axios";

class RedisService {
  private client: RedisClientType | null = null;
  isConnected: boolean = false;

  // Upstash REST API configuration
  private isUpstash: boolean = false;
  private upstashUrl: string | null = null;
  private upstashToken: string | null = null;

  async connect() {
    try {
      const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

      // Check if using Upstash REST API
      if (
        redisUrl.startsWith("https://") &&
        process.env.UPSTASH_REDIS_REST_TOKEN
      ) {
        this.isUpstash = true;
        this.upstashUrl = redisUrl;
        this.upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;
        this.isConnected = true;
        console.log("Redis: Upstash REST API configured");
      } else {
        // Standard Redis connection
        this.client = createClient({
          url: redisUrl,
          socket: {
            reconnectStrategy: (retries) => {
              if (retries > 10) {
                console.error("Redis: Too many reconnection attempts");
                return new Error("Redis connection failed");
              }
              return retries * 100; // Exponential backoff
            },
          },
        });

        this.client.on("error", (err) => {
          console.error("Redis Client Error:", err);
          this.isConnected = false;
        });

        this.client.on("connect", () => {
          console.log("Redis: Connecting...");
        });

        this.client.on("ready", () => {
          console.log("Redis: Connected and ready");
          this.isConnected = true;
        });

        this.client.on("reconnecting", () => {
          console.log("Redis: Reconnecting...");
          this.isConnected = false;
        });

        await this.client.connect();
      }
    } catch (error) {
      console.error("Failed to connect to Redis:", error);
      this.isConnected = false;
    }
  }

  async disconnect() {
    if (this.client) {
      await this.client.quit();
      this.isConnected = false;
      console.log("Redis: Disconnected");
    } else if (this.isUpstash) {
      this.isConnected = false;
      console.log("Redis: Upstash REST API disconnected");
    }
  }

  getClient(): RedisClientType | null {
    return this.isConnected ? this.client : null;
  }

  isReady(): boolean {
    return this.isConnected;
  }

  /**
   * Store session data
   */
  async setSession(
    sessionToken: string,
    data: any,
    expirySeconds: number = 3600,
  ): Promise<void> {
    if (!this.isConnected) {
      console.warn("Redis not connected, session not stored");
      return;
    }

    try {
      if (this.isUpstash && this.upstashUrl && this.upstashToken) {
        // Use Upstash REST API
        await axios.post(
          `${this.upstashUrl}/setex/session:${sessionToken}/${expirySeconds}`,
          JSON.stringify(data),
          {
            headers: {
              Authorization: `Bearer ${this.upstashToken}`,
              "Content-Type": "application/json",
            },
          },
        );
      } else if (this.client) {
        // Use standard Redis client
        await this.client.setEx(
          `session:${sessionToken}`,
          expirySeconds,
          JSON.stringify(data),
        );
      }
    } catch (error) {
      console.error("Redis setSession error:", error);
    }
  }

  /**
   * Retrieve session data
   */
  async getSession(sessionToken: string): Promise<any | null> {
    if (!this.isConnected) {
      return null;
    }

    try {
      if (this.isUpstash && this.upstashUrl && this.upstashToken) {
        // Use Upstash REST API
        const response = await axios.get(
          `${this.upstashUrl}/get/session:${sessionToken}`,
          {
            headers: {
              Authorization: `Bearer ${this.upstashToken}`,
            },
          },
        );
        return response.data.result ? JSON.parse(response.data.result) : null;
      } else if (this.client) {
        // Use standard Redis client
        const data = await this.client.get(`session:${sessionToken}`);
        return data ? JSON.parse(data) : null;
      }
      return null;
    } catch (error) {
      console.error("Redis getSession error:", error);
      return null;
    }
  }

  /**
   * Delete session data
   */
  async deleteSession(sessionToken: string): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    try {
      if (this.isUpstash && this.upstashUrl && this.upstashToken) {
        // Use Upstash REST API
        await axios.post(
          `${this.upstashUrl}/del/session:${sessionToken}`,
          {},
          {
            headers: {
              Authorization: `Bearer ${this.upstashToken}`,
            },
          },
        );
      } else if (this.client) {
        // Use standard Redis client
        await this.client.del(`session:${sessionToken}`);
      }
    } catch (error) {
      console.error("Redis deleteSession error:", error);
    }
  }

  /**
   * Rate limiting: Check if IP/fingerprint has exceeded limit
   */
  async checkRateLimit(
    key: string,
    maxRequests: number,
    windowSeconds: number,
  ): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
    if (!this.isConnected) {
      // If Redis is down, allow the request (fail open)
      return {
        allowed: true,
        remaining: maxRequests,
        resetAt: Date.now() + windowSeconds * 1000,
      };
    }

    try {
      const rateLimitKey = `ratelimit:${key}`;

      if (this.isUpstash && this.upstashUrl && this.upstashToken) {
        // Use Upstash REST API
        const currentResponse = await axios.get(
          `${this.upstashUrl}/get/${rateLimitKey}`,
          {
            headers: {
              Authorization: `Bearer ${this.upstashToken}`,
            },
          },
        );
        const current = currentResponse.data.result;

        if (!current) {
          // First request in window
          await axios.post(
            `${this.upstashUrl}/setex/${rateLimitKey}/${windowSeconds}/1`,
            {},
            {
              headers: {
                Authorization: `Bearer ${this.upstashToken}`,
              },
            },
          );
          return {
            allowed: true,
            remaining: maxRequests - 1,
            resetAt: Date.now() + windowSeconds * 1000,
          };
        }

        const count = parseInt(current, 10);

        if (count >= maxRequests) {
          const ttlResponse = await axios.get(
            `${this.upstashUrl}/ttl/${rateLimitKey}`,
            {
              headers: {
                Authorization: `Bearer ${this.upstashToken}`,
              },
            },
          );
          const ttl = ttlResponse.data.result;
          return {
            allowed: false,
            remaining: 0,
            resetAt: Date.now() + ttl * 1000,
          };
        }

        // Increment count
        await axios.post(
          `${this.upstashUrl}/incr/${rateLimitKey}`,
          {},
          {
            headers: {
              Authorization: `Bearer ${this.upstashToken}`,
            },
          },
        );

        const ttlResponse = await axios.get(
          `${this.upstashUrl}/ttl/${rateLimitKey}`,
          {
            headers: {
              Authorization: `Bearer ${this.upstashToken}`,
            },
          },
        );
        const ttl = ttlResponse.data.result;

        return {
          allowed: true,
          remaining: maxRequests - count - 1,
          resetAt: Date.now() + ttl * 1000,
        };
      } else if (this.client) {
        // Use standard Redis client
        const current = await this.client.get(rateLimitKey);

        if (!current) {
          // First request in window
          await this.client.setEx(rateLimitKey, windowSeconds, "1");
          return {
            allowed: true,
            remaining: maxRequests - 1,
            resetAt: Date.now() + windowSeconds * 1000,
          };
        }

        const count = parseInt(current, 10);

        if (count >= maxRequests) {
          const ttl = await this.client.ttl(rateLimitKey);
          return {
            allowed: false,
            remaining: 0,
            resetAt: Date.now() + ttl * 1000,
          };
        }

        // Increment count
        await this.client.incr(rateLimitKey);
        const ttl = await this.client.ttl(rateLimitKey);

        return {
          allowed: true,
          remaining: maxRequests - count - 1,
          resetAt: Date.now() + ttl * 1000,
        };
      }

      // Fallback
      return {
        allowed: true,
        remaining: maxRequests,
        resetAt: Date.now() + windowSeconds * 1000,
      };
    } catch (error) {
      console.error("Redis checkRateLimit error:", error);
      // Fail open on error
      return {
        allowed: true,
        remaining: maxRequests,
        resetAt: Date.now() + windowSeconds * 1000,
      };
    }
  }

  /**
   * Cache data with expiry
   */
  async cache(
    key: string,
    data: any,
    expirySeconds: number = 300,
  ): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    try {
      if (this.isUpstash && this.upstashUrl && this.upstashToken) {
        // Use Upstash REST API
        await axios.post(
          `${this.upstashUrl}/setex/cache:${key}/${expirySeconds}`,
          JSON.stringify(data),
          {
            headers: {
              Authorization: `Bearer ${this.upstashToken}`,
              "Content-Type": "application/json",
            },
          },
        );
      } else if (this.client) {
        // Use standard Redis client
        await this.client.setEx(
          `cache:${key}`,
          expirySeconds,
          JSON.stringify(data),
        );
      }
    } catch (error) {
      console.error("Redis cache error:", error);
    }
  }

  /**
   * Retrieve cached data
   */
  async getCached(key: string): Promise<any | null> {
    if (!this.isConnected) {
      return null;
    }

    try {
      if (this.isUpstash && this.upstashUrl && this.upstashToken) {
        // Use Upstash REST API
        const response = await axios.get(
          `${this.upstashUrl}/get/cache:${key}`,
          {
            headers: {
              Authorization: `Bearer ${this.upstashToken}`,
            },
          },
        );
        return response.data.result ? JSON.parse(response.data.result) : null;
      } else if (this.client) {
        // Use standard Redis client
        const data = await this.client.get(`cache:${key}`);
        return data ? JSON.parse(data) : null;
      }
      return null;
    } catch (error) {
      console.error("Redis getCached error:", error);
      return null;
    }
  }

  /**
   * Delete cached data
   */
  async deleteCached(key: string): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    try {
      if (this.isUpstash && this.upstashUrl && this.upstashToken) {
        // Use Upstash REST API
        await axios.post(
          `${this.upstashUrl}/del/cache:${key}`,
          {},
          {
            headers: {
              Authorization: `Bearer ${this.upstashToken}`,
            },
          },
        );
      } else if (this.client) {
        // Use standard Redis client
        await this.client.del(`cache:${key}`);
      }
    } catch (error) {
      console.error("Redis deleteCached error:", error);
    }
  }

  /**
   * Ping Redis server to check connection health
   */
  async ping(): Promise<void> {
    if (!this.isConnected) {
      throw new Error("Redis not connected");
    }

    try {
      if (this.isUpstash && this.upstashUrl && this.upstashToken) {
        // Use Upstash REST API
        await axios.post(
          `${this.upstashUrl}/ping`,
          {},
          {
            headers: {
              Authorization: `Bearer ${this.upstashToken}`,
            },
          },
        );
      } else if (this.client) {
        // Use standard Redis client
        await this.client.ping();
      }
    } catch (error) {
      throw new Error("Redis ping failed");
    }
  }
}

export const redisService = new RedisService();
