// Express request type extension for cache
export interface CacheInterface {
  get: (key: string) => any;
  set: (key: string, value: any, ttl?: number) => void;
  del: (key: string) => boolean;
  clear: () => void;
  clearPattern: (pattern: string) => number;
  stats: () => { size: number, keys: string[] };
}

declare global {
  namespace Express {
    interface Request {
      cache?: CacheInterface;
      user?: {
        id: number;
        username: string;
        email: string;
        role: string;
        [key: string]: any;
      };
    }
  }
}

export {};