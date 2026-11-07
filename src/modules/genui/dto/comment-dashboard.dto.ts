import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Allow } from 'class-validator';

/**
 * Shape and size are checked in GenUiCommentaryService, so a bad body gets
 * the plain-string message "Dashboard inválido." instead of the global pipe's
 * array of messages. `@Allow()` only keeps the global whitelist from
 * stripping the fields.
 */
export class CommentDashboardDto {
  @ApiProperty({
    description: 'The `spec` returned by POST /genui/dashboard',
    type: 'object',
    additionalProperties: true,
  })
  @Allow()
  spec: Record<string, unknown>;

  @ApiPropertyOptional({
    example: 'meu ROI por plataforma nos últimos 3 meses',
    maxLength: 500,
  })
  @Allow()
  prompt?: string;
}
