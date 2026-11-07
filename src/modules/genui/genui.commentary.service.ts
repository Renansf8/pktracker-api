import {
  BadGatewayException,
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { env } from '../../shared/config/env';
import { InsightsRepository } from '../../database/repositories/insights.repository';
import { DashboardSpec } from './genui.schema';
import { ANTHROPIC_CLIENT, GenUiService } from './genui.service';
import { GenUiQuota } from './genui.quota';
import { callClaude, replyText } from './genui.model';
import {
  buildCommentaryContent,
  extractFacts,
  renderCommentary,
} from './genui.commentary';
import {
  COMMENTARY_JSON_SCHEMA,
  CommentaryOutput,
  CommentarySchema,
} from './genui.commentary.schema';
import { COMMENTARY_SYSTEM_PROMPT } from './genui.commentary.prompt';
import type { CommentaryResponse } from './entities/commentary.entity';
import type { CommentDashboardDto } from './dto/comment-dashboard.dto';

const MAX_TOKENS = 4000;
const MAX_PROMPT_LENGTH = 500;
const FAILED = 'Não consegui comentar este dashboard. Tente de novo.';

@Injectable()
export class GenUiCommentaryService {
  private readonly logger = new Logger(GenUiCommentaryService.name);

  constructor(
    @Inject(ANTHROPIC_CLIENT) private readonly client: Anthropic | null,
    private readonly genUi: GenUiService,
    private readonly insightsRepository: InsightsRepository,
    private readonly quota: GenUiQuota,
  ) {}

  async commentDashboard(
    userId: string,
    dto: CommentDashboardDto,
  ): Promise<CommentaryResponse> {
    if (!this.client) {
      throw new ServiceUnavailableException(
        'Geração de dashboards não está configurada no servidor.',
      );
    }
    // Only the spec comes from the client, and only to say what to look at:
    // the numbers are recomputed here, for the token's user.
    const parsed = DashboardSpec.safeParse(dto.spec);
    const prompt = dto.prompt ?? undefined;
    if (
      !parsed.success ||
      (prompt !== undefined &&
        (typeof prompt !== 'string' || prompt.length > MAX_PROMPT_LENGTH))
    ) {
      throw new BadRequestException('Dashboard inválido.');
    }
    if (parsed.data.widgets.length === 0) return { commentary: null };
    // Fail early on a spent quota, before any query; it is only used up when
    // the model is actually called.
    this.quota.check(userId, 'commentary');

    const context = await this.insightsRepository.getUserContext(userId);
    const { spec, data } = await this.genUi.resolveDashboard(
      userId,
      parsed.data,
      context,
    );
    const facts = extractFacts(spec, data);
    if (facts.length === 0) return { commentary: null };

    this.quota.consume(userId, 'commentary');

    const response = await callClaude(this.client, this.logger, {
      tag: 'genui-commentary',
      userId,
      model: env.genuiCommentaryModel ?? env.genuiModel,
      system: COMMENTARY_SYSTEM_PROMPT,
      schema: COMMENTARY_JSON_SCHEMA,
      content: buildCommentaryContent({
        today: new Date().toISOString().slice(0, 10),
        currencies: context.currencies,
        spec,
        facts,
        prompt,
      }),
      maxTokens: MAX_TOKENS,
      logExtra: `facts=${facts.length}`,
      refusalMessage: 'Não consigo comentar esse dashboard.',
    });

    const output =
      response.stop_reason === 'end_turn' ? parseOutput(response) : null;
    const commentary = output
      ? renderCommentary(output, facts, spec.widgets.length, context.platforms)
      : null;
    if (!commentary) {
      this.logger.warn(
        `genui-commentary no valid commentary user=${userId} stop=${response.stop_reason}`,
      );
      throw new BadGatewayException(FAILED);
    }
    return { commentary };
  }
}

function parseOutput(response: Anthropic.Message): CommentaryOutput | null {
  try {
    const result = CommentarySchema.safeParse(JSON.parse(replyText(response)));
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}
