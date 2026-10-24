import { Module } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { env } from '../../shared/config/env';
import { InsightsRepository } from '../../database/repositories/insights.repository';
import { GenUiController } from './genui.controller';
import { ANTHROPIC_CLIENT, GenUiService } from './genui.service';

@Module({
  controllers: [GenUiController],
  providers: [
    GenUiService,
    InsightsRepository,
    {
      provide: ANTHROPIC_CLIENT,
      useFactory: () =>
        env.anthropicApiKey
          ? new Anthropic({ apiKey: env.anthropicApiKey })
          : null,
    },
  ],
})
export class GenUiModule {}
