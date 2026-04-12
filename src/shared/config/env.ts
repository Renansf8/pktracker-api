import 'dotenv/config';
import { plainToInstance } from 'class-transformer';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  NotEquals,
  validateSync,
} from 'class-validator';

class Env {
  @IsString()
  @IsNotEmpty()
  dbURL: string;

  @IsString()
  @IsNotEmpty()
  @NotEquals('unsecure_jwt_secret')
  jwtSecret: string;

  /** Comma-separated allowlist; if unset or empty, all emails are allowed. */
  @IsOptional()
  @IsString()
  allowedEmails?: string;
}

export const env: Env = plainToInstance(Env, {
  dbURL: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET,
  allowedEmails: process.env.ALLOWED_EMAILS,
});

const errors = validateSync(env);

if (errors.length > 0) {
  throw new Error(JSON.stringify(errors, null, 2));
}

/**
 * When ALLOWED_EMAILS is set to a non-empty list, only those addresses may sign in or sign up.
 * Comparison is case-insensitive. Does not reveal whether an address is "registered" vs "not allowed".
 */
export function isEmailAllowed(email: string): boolean {
  const raw = env.allowedEmails;
  if (raw === undefined || raw.trim() === '') {
    return true;
  }
  const allowed = new Set(
    raw
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e.length > 0),
  );
  if (allowed.size === 0) {
    return true;
  }
  return allowed.has(email.trim().toLowerCase());
}
