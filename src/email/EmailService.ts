import { IEmailProvider } from './EmailProvider';
import { EmailOptions, EmailResult, EmailStatus, ProviderName } from './types';
import { withExponentialBackoff } from '../utils/exponentialBackoff';
import { Logger } from '../utils/logger';
import { RateLimiter } from './rateLimiter';
import { CircuitBreaker } from './circuitBreaker';
import { IdempotencyStore } from './idempotency';
import { EmailQueue } from './queue/EmailQueue';

export class EmailService {
  private primaryProvider: IEmailProvider;
  private secondaryProvider: IEmailProvider;
  private rateLimiter: RateLimiter;
  private circuitBreaker: CircuitBreaker;
  private idempotencyStore: IdempotencyStore;
  private emailQueue: EmailQueue;
  private statusMap: Map<string, EmailStatus> = new Map();
  private currentProvider: IEmailProvider;

  constructor(
    primaryProvider: IEmailProvider,
    secondaryProvider: IEmailProvider,
    rateLimit = { requests: 100, interval: 60000 }, // 100 requests per minute
    queueConcurrency = 5
  ) {
    this.primaryProvider = primaryProvider;
    this.secondaryProvider = secondaryProvider;
    this.currentProvider = primaryProvider;
    this.rateLimiter = new RateLimiter(rateLimit.requests, rateLimit.interval);
    this.circuitBreaker = new CircuitBreaker();
    this.idempotencyStore = new IdempotencyStore();
    this.emailQueue = new EmailQueue(queueConcurrency);
  }

  async sendEmail(options: EmailOptions): Promise<EmailResult> {
    if (!options.idempotencyKey) {
      options.idempotencyKey = this.generateIdempotencyKey(options);
    }

    return this.idempotencyStore.execute(
      options.idempotencyKey,
      () => this.sendEmailWithRetry(options)
    );
  }

  private async sendEmailWithRetry(options: EmailOptions): Promise<EmailResult> {
    const statusId = options.idempotencyKey || this.generateIdempotencyKey(options);
    this.updateStatus(statusId, { status: 'pending', attempts: 0 });

    try {
      await this.rateLimiter.acquire();

      const result = await withExponentialBackoff<EmailResult>(
        () => this.trySendWithProvider(options),
        3, // max retries
        1000 // initial delay
      );

      this.updateStatus(statusId, {
        status: 'sent',
        attempts: (this.statusMap.get(statusId)?.attempts || 0) + 1,
        lastAttempt: new Date(),
        provider: result.provider
      });

      return result;
    } catch (error) {
      this.updateStatus(statusId, {
        status: 'failed',
        attempts: (this.statusMap.get(statusId)?.attempts || 0) + 1,
        lastAttempt: new Date(),
        error: (error as Error).message
      });

      Logger.error(error as Error, { emailOptions: options });
      throw error;
    }
  }

  private async trySendWithProvider(options: EmailOptions): Promise<EmailResult> {
    try {
      return await this.circuitBreaker.execute(() => 
        this.currentProvider.sendEmail(options)
      );
    } catch (error) {
      Logger.log('Provider failed, checking health', {
        provider: this.currentProvider.name,
        error: (error as Error).message
      });

      const isHealthy = await this.checkProviderHealth();
      if (!isHealthy) {
        this.switchProvider();
      }

      throw error;
    }
  }

  private async checkProviderHealth(): Promise<boolean> {
    try {
      return await this.currentProvider.isHealthy();
    } catch (error) {
      Logger.error(error as Error, {
        context: 'Provider health check failed'
      });
      return false;
    }
  }

  private switchProvider(): void {
    this.currentProvider = this.currentProvider === this.primaryProvider
      ? this.secondaryProvider
      : this.primaryProvider;

    Logger.log('Switched email provider', {
      newProvider: this.currentProvider.name
    });
  }

  private generateIdempotencyKey(options: EmailOptions): string {
    return `${options.to}-${options.subject}-${options.body.substring(0, 20)}-${Date.now()}`;
  }

  private updateStatus(id: string, status: Partial<EmailStatus>): void {
    const current = this.statusMap.get(id) || { status: 'pending', attempts: 0 };
    this.statusMap.set(id, { ...current, ...status });
  }

  getEmailStatus(id: string): EmailStatus | undefined {
    return this.statusMap.get(id);
  }

  queueEmail(options: EmailOptions): Promise<EmailResult> {
    return this.emailQueue.add(options).then(() => this.sendEmail(options));
  }

  getQueueStatus() {
    return this.emailQueue.getQueueStatus();
  }
}