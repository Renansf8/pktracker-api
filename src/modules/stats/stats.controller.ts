import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { StatsService } from './stats.service';
import { ActiveUserId } from '../../shared/decorators/ActiveUserId';

@ApiTags('Stats')
@ApiBearerAuth()
@Controller('stats')
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Get stats summary for the authenticated user' })
  @ApiResponse({ status: 200, description: 'Stats summary' })
  getSummary(@ActiveUserId() userId: string) {
    return this.statsService.getSummary(userId);
  }
}
