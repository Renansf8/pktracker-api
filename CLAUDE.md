# CLAUDE.md — pktracker-api

## Project overview

**pktracker-api** is a poker tournament tracker REST API. It lets players register, manage a bankroll (deposits/withdrawals), log tournament results, and track overall profit/loss. Built with NestJS, Prisma, and PostgreSQL.

## Tech stack

- **Runtime:** Node.js + TypeScript
- **Framework:** NestJS 10
- **ORM:** Prisma 6 (PostgreSQL)
- **Auth:** JWT (`@nestjs/jwt`) + bcryptjs for password hashing
- **Validation:** `class-validator` + `class-transformer` with a global `ValidationPipe`
- **Package manager:** Yarn
- **Test runner:** Jest (unit) + Supertest (e2e)

## Required environment variables

Both variables are validated at startup via `src/shared/config/env.ts` — the app will throw if either is missing or invalid.

```
DATABASE_URL=postgresql://...
JWT_SECRET=<a secure string — must not be "unsecure_jwt_secret">
```

## Running the project

```bash
yarn install
yarn start:dev       # watch mode
yarn start           # development
yarn start:prod      # production (from dist/)
```

Database migrations:
```bash
npx prisma migrate dev    # apply migrations + regenerate client
npx prisma generate       # regenerate client only
```

## Project structure

```
src/
  app.module.ts                  # Root module
  main.ts                        # Entry point (port 3000, CORS *, global ValidationPipe)
  shared/
    config/env.ts                # Env var validation
    decorators/
      ActiveUserId.ts            # Extracts userId from JWT-enriched request
      IsPublic.ts                # Marks a route as unauthenticated
  database/
    prisma.service.ts            # PrismaClient wrapper
    database.module.ts           # Exports PrismaService + repositories
    repositories/
      users.repositories.ts
      banks.repositories.ts
      tournaments.repository.ts
  modules/
    auth/                        # Signup / signin, JWT issuance
    users/                       # User CRUD
    banks/                       # Bankroll, deposits, withdrawals
    tournaments/                 # Tournament log
```

## Architecture conventions

- **Controller → Service → Repository → Prisma** — always follow this layering; never call `PrismaService` directly from a controller or service.
- **Repositories** wrap all Prisma calls and own query logic. Services own business logic (e.g. computing profit, validating funds).
- **DTOs** live in `dto/` under each module and use `class-validator` decorators for input validation.
- **Entities** (`entities/`) are plain TypeScript classes representing the domain shape (used for typing, not Prisma models).
- Auth is enforced globally via `AuthGuard`. To make a route public, apply the `@IsPublic()` decorator on the controller class or method.
- The authenticated user's ID is injected into controller handlers via `@ActiveUserId()`.

## API endpoints

All endpoints except `/auth/*` require a `Bearer <token>` JWT header.

| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/signup` | Register; auto-creates a Bank for the user |
| POST | `/auth/signin` | Login; returns `{ accessToken }` |
| POST | `/banks/deposits` | Deposit funds into the user's bank |
| POST | `/banks/withdrawals` | Withdraw funds (validated against balance) |
| POST | `/tournaments` | Log a tournament result |
| GET | `/tournaments` | List tournaments (optional `?platform=` filter, ordered by date desc) |
| DELETE | `/tournaments/:id` | Delete a tournament and reverse its effect on the bank |

## Domain logic notes

- **Bank auto-creation:** a `Bank` record is created automatically on signup. Each user has exactly one bank.
- **Profit calculation:** `profit = result - buyIn`. This is computed server-side; the `profit` field in `CreateTournamentDto` is ignored.
- **Bank balance on tournament create/delete:** when a tournament is logged, `bank.bank` and `bank.profit` are updated atomically. Deletion reverses the change.
- **Deposits/withdrawals** run inside a Prisma `$transaction` to keep `bank`, `totalDeposit`/`totalWithdrawal` consistent.
- **Insufficient funds** on withdrawal throws a `BadRequestException` (surfaced from the repository's `validateSufficientFunds` check).

## Known incomplete areas

- `GET /tournaments/:id` — method exists in the service but the controller route is commented out.
- `PATCH /tournaments/:id` — service `update()` is stubbed; the actual repository call is commented out.
- Users module controller/service — exists but review before modifying (may be incomplete).
- Error handling in `TournamentsService` uses raw `throw new Error(...)` instead of NestJS `NotFoundException` — worth standardising.

## Testing

```bash
yarn test          # unit tests
yarn test:e2e      # end-to-end tests
yarn test:cov      # coverage report
```

Test files live alongside source files (`*.spec.ts`). E2E config is in `test/jest-e2e.json`.
