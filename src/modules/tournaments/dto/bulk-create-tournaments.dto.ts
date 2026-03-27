import {
  ArrayMinSize,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateTournamentDto } from './create-tournament.dto';

export class BulkCreateTournamentsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateTournamentDto)
  tournaments: CreateTournamentDto[];
}

