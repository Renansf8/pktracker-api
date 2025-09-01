import { IsOptional, IsString } from 'class-validator';

export class FilterTournamentsDto {
  @IsOptional()
  @IsString()
  platform?: string;
}
