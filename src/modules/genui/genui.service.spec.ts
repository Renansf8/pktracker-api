import {
  BadGatewayException,
  HttpException,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type Anthropic from '@anthropic-ai/sdk';
import { GenUiService } from './genui.service';
import { GenUiQuota } from './genui.quota';
import { DASHBOARD_JSON_SCHEMA, DashboardSpecType } from './genui.schema';
import type {
  InsightsRepository,
  UserTournamentContext,
} from '../../database/repositories/insights.repository';

jest.mock('../../shared/config/env', () => ({
  env: { genuiModel: 'claude-haiku-5-5' },
}));

const context: UserTournamentContext = {
  totalTournaments: 3,
  firstTournamentDate: new Date('2026-01-10T12:00:00Z'),
  lastTournamentDate: new Date('2026-10-01T12:00:00Z'),
  platforms: ['GG', 'Poker Stars'],
  currencies: ['USD'],
};

function modelReply(
  spec: unknown,
  stopReason: Anthropic.Message['stop_reason'] = 'end_turn',
) {
  return {
    model: 'claude-haiku-5-5',
    stop_reason: stopReason,
    usage: { input_tokens: 100, output_tokens: 50 },
    content: [
      {
        type: 'text',
        text: typeof spec === 'string' ? spec : JSON.stringify(spec),
      },
    ],
  };
}

function setup() {
  const create = jest.fn();
  const client = { messages: { create } } as unknown as Anthropic;
  const repository = {
    getUserContext: jest.fn().mockResolvedValue(context),
    aggregate: jest.fn(),
    aggregateByBucket: jest.fn(),
    listTournaments: jest.fn(),
  };
  const service = new GenUiService(
    client,
    repository as unknown as InsightsRepository,
    new GenUiQuota(),
  );
  return { service, create, repository };
}

describe('GenUiService', () => {
  it('answers 503 when no API key is configured', async () => {
    const service = new GenUiService(
      null,
      {} as InsightsRepository,
      new GenUiQuota(),
    );
    await expect(service.generateDashboard('u1', 'roi')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('asks the configured model for a schema-constrained spec and resolves widget data', async () => {
    const { service, create, repository } = setup();
    const spec: DashboardSpecType = {
      title: 'ROI por plataforma',
      summary: 'Seu ROI em cada plataforma nos últimos 3 meses.',
      widgets: [
        {
          type: 'stat',
          title: 'ROI geral',
          metric: 'roi',
          period: { from: '2026-07-15', to: '2026-10-15' },
          platform: null,
        },
        {
          type: 'bar_chart',
          title: 'ROI por plataforma',
          metric: 'roi',
          groupBy: 'platform',
          order: 'desc',
          limit: null,
          period: { from: '2026-07-15', to: '2026-10-15' },
          platform: null,
        },
        {
          type: 'line_chart',
          title: 'Lucro acumulado',
          metric: 'cumulative_profit',
          bucket: 'week',
          period: { from: '2026-07-15', to: '2026-10-15' },
          platform: null,
        },
      ],
    };
    create.mockResolvedValue(modelReply(spec));
    repository.aggregate.mockImplementation((_u, _r, groupBy) =>
      Promise.resolve(
        groupBy
          ? [
              {
                key: 'GG',
                tournaments: 2,
                buyInTotal: 100,
                buyInCount: 2,
                profitTotal: 50,
                itmCount: 1,
              },
              {
                key: 'Poker Stars',
                tournaments: 1,
                buyInTotal: 0,
                buyInCount: 0,
                profitTotal: 0,
                itmCount: 0,
              },
            ]
          : [
              {
                key: null,
                tournaments: 3,
                buyInTotal: 100,
                buyInCount: 2,
                profitTotal: 50,
                itmCount: 1,
              },
            ],
      ),
    );
    repository.aggregateByBucket.mockResolvedValue([
      {
        bucket: new Date('2026-07-13T00:00:00Z'),
        tournaments: 2,
        profitTotal: 30,
      },
      {
        bucket: new Date('2026-07-20T00:00:00Z'),
        tournaments: 1,
        profitTotal: -10,
      },
    ]);

    const result = await service.generateDashboard(
      'u1',
      'meu ROI por plataforma',
    );

    const request = create.mock.calls[0][0];
    expect(request.model).toBe('claude-haiku-5-5');
    expect(request.output_config.format).toEqual({
      type: 'json_schema',
      schema: DASHBOARD_JSON_SCHEMA,
    });
    expect(request.messages[0].content).toContain('meu ROI por plataforma');
    expect(request.messages[0].content).toContain(
      '"platforms":["GG","Poker Stars"]',
    );

    expect(result.spec.widgets).toHaveLength(3);
    expect(result.data[0]).toEqual({
      type: 'stat',
      unit: 'percent',
      value: 50,
      tournaments: 3,
    });
    expect(result.data[1]).toEqual({
      type: 'bar_chart',
      unit: 'percent',
      bars: [
        { label: 'GG', value: 50 },
        { label: 'Poker Stars', value: null },
      ],
    });
    expect(result.data[2]).toEqual({
      type: 'line_chart',
      unit: 'money',
      points: [
        { bucket: '2026-07-13', value: 30 },
        { bucket: '2026-07-20', value: 20 },
      ],
    });

    const [, filter] = repository.aggregate.mock.calls[0];
    expect(filter.from.toISOString()).toBe('2026-07-15T00:00:00.000Z');
    expect(filter.to.toISOString()).toBe('2026-10-16T00:00:00.000Z');
    expect(filter.platform).toBeNull();
  });

  it('groups by tournament name inside one platform, sorted and limited', async () => {
    const { service, create, repository } = setup();
    create.mockResolvedValue(
      modelReply({
        title: 'Lucro na GG por torneio',
        summary: 's',
        widgets: [
          {
            type: 'table',
            title: 'Lucro por torneio',
            groupBy: 'tournament_name',
            sortBy: 'profit',
            order: 'desc',
            limit: 2,
            period: { from: '2026-01-10', to: '2026-10-15' },
            platform: 'gg',
          },
        ],
      }),
    );
    const row = (key: string, profitTotal: number) => ({
      key,
      tournaments: 1,
      buyInTotal: 10,
      buyInCount: 1,
      profitTotal,
      itmCount: 0,
    });
    repository.aggregate.mockResolvedValue([
      row('Bounty Hunters $10', -10),
      row('Daily Big $22', 120),
      row('Zodiac $5', 15),
    ]);

    const result = await service.generateDashboard('u1', 'lucro na GG');

    const [, filter, groupBy] = repository.aggregate.mock.calls[0];
    expect(filter.platform).toBe('GG');
    expect(groupBy).toBe('tournament_name');
    expect(result.data[0]).toMatchObject({
      type: 'table',
      rows: [
        { label: 'Daily Big $22', profit: 120 },
        { label: 'Zodiac $5', profit: 15 },
      ],
    });
  });

  it('keeps which tournament each row is and names it on bars', async () => {
    const { service, create, repository } = setup();
    const widget = (type: 'table' | 'bar_chart') => ({
      type,
      title: 'x',
      groupBy: 'tournament_name',
      ...(type === 'table' ? { sortBy: 'profit' } : { metric: 'profit' }),
      order: 'desc',
      limit: 1,
      period: { from: '2026-01-10', to: '2026-10-15' },
      platform: null,
    });
    create.mockResolvedValue(
      modelReply({
        title: 't',
        summary: 's',
        widgets: [widget('table'), widget('bar_chart')],
      }),
    );
    repository.aggregate.mockResolvedValue([
      {
        key: 'Bounty Hunters',
        entry: { platform: 'GG', currency: 'USD', buyIn: 10 },
        tournaments: 2,
        buyInTotal: 20,
        buyInCount: 2,
        profitTotal: 400,
        itmCount: 1,
      },
      {
        key: 'Bounty Hunters',
        entry: { platform: 'WPN', currency: 'EUR', buyIn: null },
        tournaments: 1,
        buyInTotal: 10,
        buyInCount: 1,
        profitTotal: -10,
        itmCount: 0,
      },
    ]);

    const result = await service.generateDashboard('u1', 'x');

    expect(result.data[0]).toMatchObject({
      rows: [
        {
          label: 'Bounty Hunters',
          entry: { platform: 'GG', currency: 'USD', buyIn: 10 },
          profit: 400,
        },
      ],
    });
    expect(result.data[1]).toMatchObject({
      bars: [{ label: 'Bounty Hunters $10 (GG)', value: 400 }],
    });
  });

  it('computes the new per-group metrics', async () => {
    const { service, create, repository } = setup();
    const stat = (metric: string) => ({
      type: 'stat',
      title: metric,
      metric,
      period: { from: '2026-01-10', to: '2026-10-15' },
      platform: null,
    });
    const metrics = [
      'ft_rate',
      'day2_rate',
      'wins',
      'podiums',
      'avg_profit',
      'biggest_cash',
      'total_invested',
    ];
    create.mockResolvedValue(
      modelReply({
        title: 't',
        summary: 's',
        widgets: metrics.slice(0, 6).map(stat),
      }),
    );
    repository.aggregate.mockResolvedValue([
      {
        key: null,
        entry: null,
        tournaments: 8,
        buyInTotal: 80,
        buyInCount: 8,
        profitTotal: 100,
        itmCount: 2,
        ftCount: 2,
        winCount: 1,
        podiumCount: 3,
        day2Count: 1,
        biggestCash: 150,
      },
    ]);

    const result = await service.generateDashboard('u1', 'x');

    expect(result.data).toEqual([
      expect.objectContaining({ type: 'stat', unit: 'percent', value: 25 }),
      expect.objectContaining({ type: 'stat', unit: 'percent', value: 12.5 }),
      expect.objectContaining({ type: 'stat', unit: 'count', value: 1 }),
      expect.objectContaining({ type: 'stat', unit: 'count', value: 3 }),
      expect.objectContaining({ type: 'stat', unit: 'money', value: 12.5 }),
      expect.objectContaining({ type: 'stat', unit: 'money', value: 150 }),
    ]);

    create.mockResolvedValue(
      modelReply({
        title: 't',
        summary: 's',
        widgets: [stat('total_invested')],
      }),
    );
    const invested = await service.generateDashboard('u1', 'x');
    expect(invested.data[0]).toMatchObject({
      type: 'stat',
      unit: 'money',
      value: 80,
    });
  });

  it('groups by buy-in range', async () => {
    const { service, create, repository } = setup();
    create.mockResolvedValue(
      modelReply({
        title: 't',
        summary: 's',
        widgets: [
          {
            type: 'bar_chart',
            title: 'ROI por faixa',
            metric: 'roi',
            groupBy: 'buy_in_range',
            order: 'desc',
            limit: null,
            period: { from: '2026-01-10', to: '2026-10-15' },
            platform: null,
          },
        ],
      }),
    );
    repository.aggregate.mockResolvedValue([]);

    await service.generateDashboard('u1', 'x');

    expect(repository.aggregate.mock.calls[0][2]).toBe('buy_in_range');
  });

  it('lists individual tournaments with the default limit', async () => {
    const { service, create, repository } = setup();
    create.mockResolvedValue(
      modelReply({
        title: 'Maiores prêmios',
        summary: 's',
        widgets: [
          {
            type: 'tournament_list',
            title: 'Top prêmios',
            sortBy: 'prize',
            order: 'desc',
            limit: null,
            period: { from: '2026-01-10', to: '2026-10-15' },
            platform: 'gg',
          },
        ],
      }),
    );
    repository.listTournaments.mockResolvedValue([
      {
        date: new Date('2026-05-08T21:30:00Z'),
        name: 'Bounty Hunters',
        platform: 'GG',
        currency: 'USD',
        buyIn: 5.5,
        prize: 800,
        profit: 794.499,
        position: 32,
        itm: true,
        hasFt: false,
      },
    ]);

    const result = await service.generateDashboard('u1', 'x');

    const [, filter, sortBy, order, limit] =
      repository.listTournaments.mock.calls[0];
    expect(filter.platform).toBe('GG');
    expect([sortBy, order, limit]).toEqual(['prize', 'desc', 10]);
    expect(result.data[0]).toEqual({
      type: 'tournament_list',
      rows: [
        {
          date: '2026-05-08',
          name: 'Bounty Hunters',
          platform: 'GG',
          currency: 'USD',
          buyIn: 5.5,
          prize: 800,
          profit: 794.5,
          position: 32,
          itm: true,
          hasFt: false,
        },
      ],
    });
  });

  it('sorts ascending with empty values last', async () => {
    const { service, create, repository } = setup();
    create.mockResolvedValue(
      modelReply({
        title: 't',
        summary: 's',
        widgets: [
          {
            type: 'bar_chart',
            title: 'ROI',
            metric: 'roi',
            groupBy: 'platform',
            order: 'asc',
            limit: null,
            period: { from: '2026-01-10', to: '2026-10-15' },
            platform: null,
          },
        ],
      }),
    );
    repository.aggregate.mockResolvedValue([
      {
        key: 'A',
        tournaments: 1,
        buyInTotal: 0,
        buyInCount: 0,
        profitTotal: 0,
        itmCount: 0,
      },
      {
        key: 'B',
        tournaments: 1,
        buyInTotal: 10,
        buyInCount: 1,
        profitTotal: 5,
        itmCount: 0,
      },
      {
        key: 'C',
        tournaments: 1,
        buyInTotal: 10,
        buyInCount: 1,
        profitTotal: -5,
        itmCount: 0,
      },
    ]);

    const result = await service.generateDashboard('u1', 'x');

    expect(result.data[0]).toMatchObject({
      bars: [
        { label: 'C', value: -50 },
        { label: 'B', value: 50 },
        { label: 'A', value: null },
      ],
    });
  });

  it('rejects replies that are not valid JSON or break the schema', async () => {
    const { service, create } = setup();
    create.mockResolvedValueOnce(modelReply('not json'));
    await expect(service.generateDashboard('u1', 'x')).rejects.toBeInstanceOf(
      BadGatewayException,
    );

    create.mockResolvedValueOnce(
      modelReply({ title: 't', summary: 's', widgets: [{ type: 'pie' }] }),
    );
    await expect(service.generateDashboard('u1', 'x')).rejects.toBeInstanceOf(
      BadGatewayException,
    );
  });

  it('does not trust output cut off by max_tokens', async () => {
    const { service, create } = setup();
    create.mockResolvedValue(
      modelReply({ title: 't', summary: 's', widgets: [] }, 'max_tokens'),
    );
    await expect(service.generateDashboard('u1', 'x')).rejects.toBeInstanceOf(
      BadGatewayException,
    );
  });

  it('turns a refusal into a 422', async () => {
    const { service, create } = setup();
    create.mockResolvedValue(modelReply('', 'refusal'));
    await expect(service.generateDashboard('u1', 'x')).rejects.toBeInstanceOf(
      UnprocessableEntityException,
    );
  });

  it('limits each user to 30 generations per day', async () => {
    const { service, create } = setup();
    create.mockResolvedValue(
      modelReply({ title: 't', summary: 's', widgets: [] }),
    );

    for (let i = 0; i < 30; i++) {
      await service.generateDashboard('u1', 'x');
    }
    const blocked = service.generateDashboard('u1', 'x');
    await expect(blocked).rejects.toBeInstanceOf(HttpException);
    await expect(blocked).rejects.toMatchObject({ status: 429 });
    await expect(service.generateDashboard('u2', 'x')).resolves.toBeDefined();
    expect(create).toHaveBeenCalledTimes(31);
  });

  describe('normalizeSpec', () => {
    const { service } = setup();
    const stat = (from: string, to: string) => ({
      type: 'stat' as const,
      title: 'x',
      metric: 'roi' as const,
      period: { from, to },
      platform: null,
    });

    it('falls back to the whole history for invalid dates and swaps reversed ranges', () => {
      const today = new Date().toISOString().slice(0, 10);
      const result = service.normalizeSpec(
        {
          title: 't',
          summary: 's',
          widgets: [
            stat('ontem', '2026-02-30'),
            stat('2026-09-30', '2026-09-01'),
          ],
        },
        context,
      );
      expect(result.widgets[0].period).toEqual({
        from: '2026-01-10',
        to: today,
      });
      expect(result.widgets[1].period).toEqual({
        from: '2026-09-01',
        to: '2026-09-30',
      });
    });

    it('keeps at most 6 widgets', () => {
      const result = service.normalizeSpec(
        {
          title: 't',
          summary: 's',
          widgets: Array.from({ length: 9 }, () =>
            stat('2026-01-01', '2026-02-01'),
          ),
        },
        context,
      );
      expect(result.widgets).toHaveLength(6);
    });

    it('moves long daily line charts to a coarser bucket', () => {
      const result = service.normalizeSpec(
        {
          title: 't',
          summary: 's',
          widgets: [
            {
              type: 'line_chart',
              title: 'x',
              metric: 'profit',
              bucket: 'day',
              period: { from: '2025-01-01', to: '2026-10-01' },
              platform: null,
            },
          ],
        },
        context,
      );
      expect(result.widgets[0]).toMatchObject({ bucket: 'week' });
    });

    it('fills and clamps row limits and keeps unknown platforms as typed', () => {
      const table = (limit: number | null, platform: string | null) => ({
        type: 'table' as const,
        title: 'x',
        groupBy: 'tournament_name' as const,
        sortBy: 'profit' as const,
        order: 'desc' as const,
        limit,
        period: { from: '2026-01-01', to: '2026-02-01' },
        platform,
      });
      const result = service.normalizeSpec(
        {
          title: 't',
          summary: 's',
          widgets: [
            table(null, ' poker stars '),
            table(0, 'Winamax'),
            table(500, ''),
          ],
        },
        context,
      );
      expect(result.widgets.map((w) => [w['limit'], w.platform])).toEqual([
        [50, 'Poker Stars'],
        [1, 'Winamax'],
        [100, null],
      ]);
    });
  });

  it('sends a JSON schema that keeps the catalog enums and only uses anyOf', () => {
    const serialized = JSON.stringify(DASHBOARD_JSON_SCHEMA);
    expect(serialized).not.toContain('oneOf');
    expect(serialized).not.toContain('$schema');
    expect(serialized).not.toContain('$ref');
    expect(serialized).not.toContain('"type":[');
    expect(serialized).toContain(
      '"enum":["platform","currency","tournament_name","buy_in_range"]',
    );
    expect(serialized).toContain('"const":"bar_chart"');
    expect(serialized).toContain('"const":"tournament_list"');
    expect(serialized).toContain('"ft_rate"');
  });
});
