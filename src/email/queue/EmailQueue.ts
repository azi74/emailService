import { QueueItem } from './QueueItem';
import { EmailOptions } from '../types';
import { Logger } from '../../utils/logger';

export class EmailQueue {
  private queue: QueueItem[] = [];
  private processing = false;
  private concurrency: number;
  private activeCount = 0;

  constructor(concurrency = 5) {
    this.concurrency = concurrency;
  }

  add(options: EmailOptions): Promise<any> {
    let resolve: (value: any) => void = () => {};
    let reject: (reason?: any) => void = () => {};
    
    const promise = new Promise((res, rej) => {
      resolve = res;
      reject = rej;
    });

    const item: QueueItem = {
      options,
      status: { status: 'pending', attempts: 0 },
      promise,
      resolve,
      reject
    };

    this.queue.push(item);
    this.process();
    return promise;
  }

  private async process(): Promise<void> {
    if (this.processing || this.activeCount >= this.concurrency) return;
    
    this.processing = true;
    
    while (this.queue.length > 0 && this.activeCount < this.concurrency) {
      const item = this.queue.shift();
      if (!item) continue;
      
      this.activeCount++;
      try {
        item.status.status = 'sent';
        item.status.attempts++;
        item.status.lastAttempt = new Date();
        item.resolve(item);
      } catch (error) {
        item.status.status = 'failed';
        item.status.error = (error as Error).message;
        item.reject(error);
      } finally {
        this.activeCount--;
      }
    }
    
    this.processing = false;
  }

  getQueueStatus(): { pending: number; active: number } {
    return {
      pending: this.queue.length,
      active: this.activeCount
    };
  }
}