import { EmailService } from './email/EmailService';
import { MockProvider01 } from './email/MockProvider01';
import { MockProvider02 } from './email/MockProvider02';

// Initialize providers
const provider1 = new MockProvider01(0.1); // 10% failure rate
const provider2 = new MockProvider02(0.1);

// Create email service
const emailService = new EmailService(provider1, provider2);

// Send an email
async function sendDemoEmail() {
  try {
    const result = await emailService.sendEmail({
      to: 'recipient@example.com',
      from: 'sender@example.com',
      subject: 'Hello from Resilient Email Service',
      body: 'This is a test email sent with retry logic!',
      idempotencyKey: 'demo-email-1'
    });

    console.log('Email result:', result);
    
    // Check status
    const status = emailService.getEmailStatus('demo-email-1');
    console.log('Email status:', status);
  } catch (error) {
    console.error('Failed to send email:', error);
  }
}

sendDemoEmail();