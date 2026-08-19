import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AppConfig } from '../config/configuration';

interface Waiter {
  notifyPosition: (position: number) => void;
  admit: () => void;
  /** Last position this waiter was actually notified of — lets broadcasts skip a no-op re-notify. */
  lastNotified: number;
}

/**
 * A FIFO semaphore gating concurrent Ollama generation calls.
 *
 * A single Ollama process on a shared VPS serves one generation at a time
 * per loaded model in practice — letting every visitor's request hit it
 * concurrently doesn't get more throughput, it just makes every request
 * time out together instead of queuing predictably. This caps how many
 * generations run at once and gives everyone waiting a live position, so
 * the query pipeline can show "queued, position 3" instead of a spinner
 * that looks identical to a hang.
 *
 * In-memory and per-process by design: this app runs as a single replica
 * (see docker-compose.yml) specifically so this queue has one true state.
 * A second replica would need the queue moved to Redis; not worth the
 * operational cost for a demo sized around one small VPS.
 */
@Injectable()
export class InferenceQueueService {
  private active = 0;
  private readonly waiters: Waiter[] = [];
  private readonly maxConcurrent: number;
  private readonly maxQueueLength: number;

  constructor(configService: ConfigService<{ app: AppConfig }, true>) {
    const concurrency = configService.get('app', { infer: true }).concurrency;
    this.maxConcurrent = concurrency.maxConcurrentInference;
    this.maxQueueLength = concurrency.maxQueueLength;
  }

  get queueLength(): number {
    return this.waiters.length;
  }

  /**
   * Resolves once a slot is free. While waiting, `onPosition` is called
   * every time this caller's place in line changes. Returns a release
   * function the caller MUST invoke when generation finishes (success or
   * failure) or the slot leaks forever.
   *
   * Rejects immediately, without joining the line, once the queue is
   * already at `maxQueueLength` — an unattended public demo has to answer
   * "busy, try later" rather than let the wait list grow without bound.
   */
  acquire(onPosition: (position: number) => void): Promise<() => void> {
    if (this.active < this.maxConcurrent && this.waiters.length === 0) {
      this.active++;
      return Promise.resolve(() => this.release());
    }

    if (this.waiters.length >= this.maxQueueLength) {
      return Promise.reject(
        new ServiceUnavailableException(
          'This demo is at capacity right now — too many people are trying it at once. Please try again in a minute.',
        ),
      );
    }

    return new Promise((resolveAcquire) => {
      this.waiters.push({
        notifyPosition: onPosition,
        lastNotified: 0,
        admit: () => {
          this.active++;
          resolveAcquire(() => this.release());
        },
      });
      this.broadcastPositions();
    });
  }

  private release(): void {
    this.active = Math.max(0, this.active - 1);
    this.admitNext();
  }

  private admitNext(): void {
    while (this.active < this.maxConcurrent && this.waiters.length > 0) {
      const next = this.waiters.shift();
      next?.admit();
    }
    this.broadcastPositions();
  }

  /** Notifies only the waiters whose position actually moved since the last broadcast. */
  private broadcastPositions(): void {
    this.waiters.forEach((waiter, index) => {
      const position = index + 1;
      if (waiter.lastNotified !== position) {
        waiter.lastNotified = position;
        waiter.notifyPosition(position);
      }
    });
  }
}
