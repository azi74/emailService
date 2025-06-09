export class CircuitBreaker {
  private failureThreshold: number;
  private recoveryTimeout: number;
  private failures = 0;
  private lastFailure = 0;
  private isOpen = false;

  constructor(failureThreshold = 5, recoveryTimeout = 30000) {
    this.failureThreshold = failureThreshold;
    this.recoveryTimeout = recoveryTimeout;
  }

  async execute(fn: () => Promise<any>): Promise<any> {
    if (this.isOpen) {
      const now = Date.now();
      if (now - this.lastFailure > this.recoveryTimeout) {
        this.isOpen = false;
      } else {
        throw new Error('Circuit breaker is open');
      }
    }

    try {
      const result = await fn();
      this.failures = 0;
      return result;
    } catch (error) {
      this.failures++;
      this.lastFailure = Date.now();
      if (this.failures >= this.failureThreshold) {
        this.isOpen = true;
      }
      throw error;
    }
  }

  get status(): 'open' | 'half-open' | 'closed' {
    if (this.isOpen) {
      const now = Date.now();
      if (now - this.lastFailure > this.recoveryTimeout) {
        return 'half-open';
      }
      return 'open';
    }
    return 'closed';
  }
}