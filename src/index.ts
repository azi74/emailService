import { EmailService } from './email/EmailService';
import { MockProvider01 } from './email/MockProvider01';
import { MockProvider02 } from './email/MockProvider02';

export {
  EmailService,
  MockProvider01,
  MockProvider02,
};

export type {
  EmailOptions,
  EmailResult,
  EmailStatus
} from './email/types';