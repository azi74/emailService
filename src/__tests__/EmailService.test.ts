import { EmailService } from '../email/EmailService';
import { MockProvider01 } from '../email/MockProvider01';
import { MockProvider02 } from '../email/MockProvider02';

describe('EmailService', () => {
  let service: EmailService;
  let providerA: MockProvider01;
  let providerB: MockProvider02;

  beforeEach(() => {
    providerA = new MockProvider01(0); // 0% failure rate for testing
    providerB = new MockProvider02(0);
    service = new EmailService(providerA, providerB);
  });

  it('should send email successfully with primary provider', async () => {
    const result = await service.sendEmail({
      to: 'test@example.com',
      from: 'sender@example.com',
      subject: 'Test',
      body: 'Test email'
    });
    
    expect(result.success).toBe(true);
    expect(result.provider).toBe('MockProvider01');
  });

  it('should retry on failure', async () => {
    // Make providerA fail
    const failingProvider = new MockProvider01(1); // 100% failure rate
    service = new EmailService(failingProvider, providerB);
    
    const result = await service.sendEmail({
      to: 'test@example.com',
      from: 'sender@example.com',
      subject: 'Test',
      body: 'Test email'
    });
    
    expect(result.success).toBe(true);
    expect(result.provider).toBe('MockProvider02');
  });

  it('should respect idempotency', async () => {
    const options = {
      to: 'test@example.com',
      from: 'sender@example.com',
      subject: 'Test',
      body: 'Test email',
      idempotencyKey: 'test-key'
    };
    
    const mockSend = jest.spyOn(providerA, 'sendEmail');
    
    await service.sendEmail(options);
    await service.sendEmail(options);
    
    expect(mockSend).toHaveBeenCalledTimes(1);
  });

  it('should track email status', async () => {
    const options = {
      to: 'test@example.com',
      from: 'sender@example.com',
      subject: 'Test',
      body: 'Test email',
      idempotencyKey: 'test-key-2'
    };
    
    await service.sendEmail(options);
    const status = service.getEmailStatus('test-key-2');
    
    expect(status).toBeDefined();
    expect(status?.status).toBe('sent');
    expect(status?.attempts).toBe(1);
  });
});