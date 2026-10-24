import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ActiveUserId } from '../../shared/decorators/ActiveUserId';
import { GenerateDashboardDto } from './dto/generate-dashboard.dto';
import { GenUiService } from './genui.service';

@ApiTags('GenUI')
@ApiBearerAuth()
@Controller('genui')
export class GenUiController {
  constructor(private readonly genUiService: GenUiService) {}

  @Post('dashboard')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Generate a dashboard spec and its data from a text request',
  })
  @ApiResponse({ status: 200, description: 'Dashboard spec and widget data' })
  @ApiResponse({ status: 429, description: 'Daily limit reached' })
  @ApiResponse({ status: 503, description: 'ANTHROPIC_API_KEY not configured' })
  generateDashboard(
    @ActiveUserId() userId: string,
    @Body() dto: GenerateDashboardDto,
  ) {
    return this.genUiService.generateDashboard(userId, dto.prompt);
  }
}
