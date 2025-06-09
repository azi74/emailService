export class RateLimiter {
  private requests: number;
  private interval: number;
  private queue: Array<{ resolve: () => void; timestamp: number }> = [];
  private lastProcessed = 0;

  constructor(requests: number, interval: number) {
    this.requests = requests;
    this.interval = interval;
  }

  async acquire(): Promise<void> {
    return new Promise(resolve => {
      const now = Date.now();
      const item = { resolve, timestamp: now };
      this.queue.push(item);
      this.processQueue();
    });
  }

  private processQueue(): void {
    const now = Date.now();
    
    // Clear old requests
    while (this.queue.length > 0 && 
           now - this.queue[0].timestamp > this.interval) {
      this.queue.shift();
    }
    
    // Process up to request limit
    while (this.queue.length > 0 && 
           this.queue.filter(item => now - item.timestamp <= this.interval).length <= this.requests) {
      const item = this.queue.shift();
      if (item) {
        this.lastProcessed = now;
        item.resolve();
      }
    }
    
    // Schedule next processing
    if (this.queue.length > 0) {
      const nextProcess = this.lastProcessed + this.interval;
      setTimeout(() => this.processQueue(), nextProcess - Date.now());
    }
  }
}