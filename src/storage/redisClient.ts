import { Redis, RedisOptions } from "ioredis";

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db?: number;
  tls?: boolean;
}

export class RedisClient {
  private client: Redis;
  private connected = false;

  constructor(private config: RedisConfig) {
    this.client = new Redis({
      host: config.host,
      port: config.port,
      password: config.password,
      db: config.db || 0,
      tls: config.tls ? {} : undefined,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      }
    } as RedisOptions);

    this.client.on("error", (err) => {
      console.error(`[REDIS] Connection error: ${err.message}`);
      this.connected = false;
    });

    this.client.on("connect", () => {
      console.log(`[REDIS] Connected to ${config.host}:${config.port}`);
      this.connected = true;
    });
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Redis connection timeout after 5s"));
      }, 5000);

      this.client.once("ready", () => {
        clearTimeout(timeout);
        resolve();
      });
    });
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    if (ttl) {
      await this.client.setex(key, ttl, value);
    } else {
      await this.client.set(key, value);
    }
  }

  async setex(key: string, seconds: number, value: string): Promise<void> {
    await this.client.setex(key, seconds, value);
  }

  async del(key: string): Promise<number> {
    return this.client.del(key);
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    return this.client.hgetall(key);
  }

  async hset(key: string, field: string, value: string): Promise<number> {
    return this.client.hset(key, field, value);
  }

  async incr(key: string): Promise<number> {
    return this.client.incr(key);
  }

  async lpush(key: string, value: string): Promise<number> {
    return this.client.lpush(key, value);
  }

  async brpop(key: string, timeout = 0): Promise<[string, string] | null> {
    return this.client.brpop(key, timeout);
  }

  async disconnect(): Promise<void> {
    await this.client.quit();
    this.connected = false;
  }

  isConnected(): boolean {
    return this.connected;
  }

  getClient(): Redis {
    return this.client;
  }
}
