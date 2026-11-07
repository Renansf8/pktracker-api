import { INestApplication, ValidationPipe } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import type Anthropic from '@anthropic-ai/sdk';
import * as request from 'supertest';
import { GenUiController } from './genui.controller';
import { ANTHROPIC_CLIENT, GenUiService } from './genui.service';
import { GenUiCommentaryService } from './genui.commentary.service';
import { GenUiQuota } from './genui.quota';
import { InsightsRepository } from '../../database/repositories/insights.repository';
import { AuthGuard } from '../auth/auth.guard';

// The guard imports env through the `src/...` alias, the services through
// relative paths; both must see the same fake values.
const mockEnv = {
  jwtSecret: 'test-secret',
  genuiModel: 'claude-haiku-5-5',
  genuiCommentaryModel: undefined,
};
jest.mock('../../shared/config/env', () => ({
  get env() {
    return mockEnv;
  },
}));
jest.mock(
  'src/shared/config/env',
  () => ({
    get env() {
      return mockEnv;
    },
  }),
  { virtual: true },
);
jest.mock(
  'src/shared/decorators/IsPublic',
  () => jest.requireActual('../../shared/decorators/IsPublic'),
  { virtual: true },
);

const context = {
  totalTournaments: 7,
  firstTournamentDate: new Date('2026-01-10T12:00:00Z'),
  lastTournamentDate: new Date('2026-10-01T12:00:00Z'),
  platforms: ['GG'],
  currencies: ['USD'],
};
const spec = {
  title: 'T',
  summary: 'S',
  widgets: [
    {
      type: 'stat',
      title: 'Lucro',
      metric: 'total_profit',
      period: { from: '2026-08-01', to: '2026-10-31' },
      platform: null,
    },
  ],
};
const goodReply = {
  model: 'claude-haiku-5-5',
  stop_reason: 'end_turn',
  usage: { input_tokens: 1, output_tokens: 1 },
  content: [
    {
      type: 'text',
      text: JSON.stringify({
        headline: 'Seu resultado total é {f0}.',
        insights: [],
        caveat: null,
      }),
    },
  ],
};

describe('POST /genui/dashboard/commentary (HTTP, real guard and pipe)', () => {
  let app: INestApplication;
  let token: string;
  let create: jest.Mock;
  let repository: Record<string, jest.Mock>;

  beforeEach(async () => {
    create = jest.fn().mockResolvedValue(goodReply);
    repository = {
      getUserContext: jest.fn().mockResolvedValue(context),
      aggregate: jest.fn().mockResolvedValue([
        {
          key: null,
          tournaments: 7,
          buyInTotal: 100,
          buyInCount: 7,
          profitTotal: -120.5,
          itmCount: 1,
        },
      ]),
      aggregateByBucket: jest.fn(),
      listTournaments: jest.fn(),
    };
    const jwt = new JwtService({ secret: mockEnv.jwtSecret });
    token = await jwt.signAsync({ sub: 'user-from-token' });

    const moduleRef = await Test.createTestingModule({
      controllers: [GenUiController],
      providers: [
        GenUiService,
        GenUiCommentaryService,
        GenUiQuota,
        { provide: InsightsRepository, useValue: repository },
        {
          provide: ANTHROPIC_CLIENT,
          useValue: { messages: { create } } as unknown as Anthropic,
        },
        { provide: JwtService, useValue: jwt },
        { provide: APP_GUARD, useClass: AuthGuard },
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    // same pipe as main.ts
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    await app.init();
  });

  afterEach(() => app.close());

  const post = (body: unknown, auth: string | null = `Bearer ${token}`) => {
    const req = request(app.getHttpServer()).post(
      '/genui/dashboard/commentary',
    );
    if (auth) req.set('Authorization', auth);
    return req.send(body as object);
  };

  it('answers 401 without a token and does not reach the model', async () => {
    await post({ spec }, null).expect(401);
    expect(create).not.toHaveBeenCalled();
    expect(repository.getUserContext).not.toHaveBeenCalled();
  });

  it('answers 401 with an invalid token', async () => {
    await post({ spec }, 'Bearer not-a-jwt').expect(401);
    await post({ spec }, `Bearer ${token}x`).expect(401);
    expect(create).not.toHaveBeenCalled();
  });

  it('answers 200 with the commentary and uses the user id from the token', async () => {
    const res = await post({ spec, prompt: 'meu lucro' }).expect(200);
    expect(res.body.commentary.headline).toEqual([
      { type: 'text', text: 'Seu resultado total é ' },
      expect.objectContaining({ type: 'fact', factId: 'f0', value: -120.5 }),
      { type: 'text', text: '.' },
    ]);
    expect(repository.getUserContext).toHaveBeenCalledWith('user-from-token');
  });

  it.each([
    ['spec missing', {}],
    ['spec is not an object', { spec: 'x' }],
    ['spec is an array', { spec: [] }],
    ['prompt too long', { spec, prompt: 'a'.repeat(501) }],
    [
      'spec with a field outside the catalog',
      {
        spec: { ...spec, widgets: [{ type: 'sql', query: 'select 1' }] },
      },
    ],
    [
      'spec with an unknown metric',
      {
        spec: {
          ...spec,
          widgets: [{ ...spec.widgets[0], metric: 'drop_table' }],
        },
      },
    ],
  ])('answers 400 "Dashboard inválido." when %s', async (_name, body) => {
    const res = await post(body).expect(400);
    expect(res.body.message).toBe('Dashboard inválido.');
    expect(create).not.toHaveBeenCalled();
  });

  it('ignores a data field sent by the client', async () => {
    const res = await post({
      spec,
      data: [{ value: 999999 }],
      userId: 'someone-else',
    }).expect(200);
    expect(JSON.stringify(res.body)).not.toContain('999999');
    expect(repository.getUserContext).toHaveBeenCalledWith('user-from-token');
    expect(repository.getUserContext).not.toHaveBeenCalledWith('someone-else');
  });

  it('answers commentary null for a spec without widgets, without calling the model', async () => {
    const res = await post({ spec: { ...spec, widgets: [] } }).expect(200);
    expect(res.body).toEqual({ commentary: null });
    expect(create).not.toHaveBeenCalled();
  });

  it('answers commentary null for a period with no tournaments, without calling the model', async () => {
    repository.aggregate.mockResolvedValue([]);
    const res = await post({ spec }).expect(200);
    expect(res.body).toEqual({ commentary: null });
    expect(create).not.toHaveBeenCalled();
  });
});
