export class IdempotencyStore {
  private store: Map<string, { result: any; expiry: number }> = new Map();
  private ttl: number;

  constructor(ttl = 3600000) { // 1 hour default
    this.ttl = ttl;
  }

  async execute<T>(
    key: string,
    fn: () => Promise<T>
  ): Promise<T> {
    const existing = this.store.get(key);
    const now = Date.now();

    if (existing && now < existing.expiry) {
      return existing.result as T;
    }

    const result = await fn();
    this.store.set(key, { result, expiry: now + this.ttl });
    return result;
  }

  clear(): void {
    this.store.clear();
  }
}