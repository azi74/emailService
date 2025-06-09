import { EmailOptions, EmailStatus } from '../types';

export interface QueueItem {
  options: EmailOptions;
  status: EmailStatus;
  promise: Promise<any>;
  resolve: (value: any) => void;
  reject: (reason?: any) => void;
}