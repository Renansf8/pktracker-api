import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class GenerateDashboardDto {
  @ApiProperty({ example: 'meu ROI por plataforma nos últimos 3 meses' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  prompt: string;
}
