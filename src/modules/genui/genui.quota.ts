import { HttpException, HttpStatus, Injectable } from '@nestjs/common';

export type QuotaKind = 'dashboard' | 'commentary';

/** Calls per user per day, one counter per kind. In memory, so it resets on restart. */
const QUOTAS: Record<QuotaKind, { limit: number; noun: string }> = {
  dashboard: { limit: 30, noun: 'dashboards' },
  commentary: { limit: 30, noun: 'comentários' },
};

@Injectable()
export class GenUiQuota {
  private readonly usage = new Map<string, { day: string; count: number }>();

  /** Throws 429 when the quota is spent, without using any of it. */
  check(userId: string, kind: QuotaKind): void {
    this.count(userId, kind);
  }

  consume(userId: string, kind: QuotaKind): void {
    const { day, count } = this.count(userId, kind);
    this.usage.set(`${kind}:${userId}`, { day, count: count + 1 });
  }

  private count(userId: string, kind: QuotaKind) {
    const { limit, noun } = QUOTAS[kind];
    const day = new Date().toISOString().slice(0, 10);
    const current = this.usage.get(`${kind}:${userId}`);
    const count = current?.day === day ? current.count : 0;
    if (count >= limit) {
      throw new HttpException(
        `Limite de ${limit} ${noun} por dia atingido.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    return { day, count };
  }
}
