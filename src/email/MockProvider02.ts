import { IEmailProvider, EmailOptions, EmailResult } from './EmailProvider';

export class MockProvider02 implements IEmailProvider {
  name = 'MockProvider02';
  private failureRate: number;
  private timeout: number;

  constructor(failureRate = 0.2, timeout = 100) {
    this.failureRate = failureRate;
    this.timeout = timeout;
  }

  async sendEmail(options: EmailOptions): Promise<EmailResult> {
    await new Promise(resolve => setTimeout(resolve, this.timeout));
    
    if (Math.random() < this.failureRate) {
      throw new Error('MockProvider02 simulated failure');
    }
    
    return {
      success: true,
      provider: this.name,
      id: `mocka-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`
    };
  }

  async isHealthy(): Promise<boolean> {
    // Simulate occasional health check failures
    return Math.random() > 0.1;
  }
}