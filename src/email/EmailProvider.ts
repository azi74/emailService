import { EmailOptions, EmailResult } from './types';

export interface IEmailProvider {
  name: string;
  sendEmail(options: EmailOptions): Promise<EmailResult>;
  isHealthy(): Promise<boolean>;
}