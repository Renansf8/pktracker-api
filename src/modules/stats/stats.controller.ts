import { Controller, Get } from '@nestjs/common';
import { StatsService } from './stats.service';
import { ActiveUserId } from '../../shared/decorators/ActiveUserId';

@Controller('stats')
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get('summary')
  getSummary(@ActiveUserId() userId: string) {
    return this.statsService.getSummary(userId);
  }
}
