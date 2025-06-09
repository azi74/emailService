export interface EmailOptions {
  to: string;
  from: string;
  subject: string;
  body: string;
  html?: string;
  idempotencyKey?: string;
}

export interface EmailResult {
  success: boolean;
  provider: string;
  id?: string;
  error?: Error;
  retries?: number;
}

export interface EmailStatus {
  status: 'pending' | 'sent' | 'failed' | 'retrying';
  attempts: number;
  lastAttempt?: Date;
  provider?: string;
  error?: string;
}

export type ProviderName = 'MockProviderA' | 'MockProviderB';