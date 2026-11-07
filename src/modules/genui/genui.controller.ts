import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ActiveUserId } from '../../shared/decorators/ActiveUserId';
import { GenerateDashboardDto } from './dto/generate-dashboard.dto';
import { CommentDashboardDto } from './dto/comment-dashboard.dto';
import { GenUiService } from './genui.service';
import { GenUiCommentaryService } from './genui.commentary.service';

@ApiTags('GenUI')
@ApiBearerAuth()
@Controller('genui')
export class GenUiController {
  constructor(
    private readonly genUiService: GenUiService,
    private readonly commentaryService: GenUiCommentaryService,
  ) {}

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

  @Post('dashboard/commentary')
  @HttpCode(200)
  @ApiOperation({
    summary:
      'Comment on a generated dashboard. Numbers are recomputed server-side; the model only writes the text around them',
  })
  @ApiResponse({
    status: 200,
    description: '{ commentary } (null if nothing to comment)',
  })
  @ApiResponse({ status: 400, description: 'Invalid dashboard' })
  @ApiResponse({ status: 422, description: 'The model refused' })
  @ApiResponse({ status: 429, description: 'Daily limit reached' })
  @ApiResponse({ status: 502, description: 'No valid commentary' })
  @ApiResponse({ status: 503, description: 'ANTHROPIC_API_KEY not configured' })
  commentDashboard(
    @ActiveUserId() userId: string,
    @Body() dto: CommentDashboardDto,
  ) {
    return this.commentaryService.commentDashboard(userId, dto);
  }
}
