import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

export const TOO_MANY_ATTEMPTS_MESSAGE =
  'Muitas tentativas. Aguarde um minuto e tente novamente.';

/**
 * Rate limit for the auth routes, counted per client IP and email.
 *
 * In production the API sits behind Render's proxy (Cloudflare), so
 * `req.ip` can be the proxy's address; `CF-Connecting-IP` carries the real
 * client. Adding the email keeps the limit per account even if both fall back
 * to a shared proxy IP, so one attacker can't lock everyone out.
 */
@Injectable()
export class AuthThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    const ip = req.headers?.['cf-connecting-ip'] ?? req.ip;
    const email =
      typeof req.body?.email === 'string'
        ? req.body.email.trim().toLowerCase()
        : '';
    return `${ip}:${email}`;
  }
}
