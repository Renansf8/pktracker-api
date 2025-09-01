import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { TournamentsService } from './tournaments.service';
import { CreateTournamentDto } from './dto/create-tournament.dto';
import { UpdateTournamentDto } from './dto/update-tournament.dto';
import { FilterTournamentsDto } from './dto/filter-tournaments.dto';
import { ActiveUserId } from 'src/shared/decorators/ActiveUserId';

@Controller('tournaments')
export class TournamentsController {
  constructor(private readonly tournamentsService: TournamentsService) {}

  @Post()
  create(
    @ActiveUserId() userId: string,
    @Body() createTournamentDto: CreateTournamentDto,
  ) {
    return this.tournamentsService.create(userId, createTournamentDto);
  }

  @Get()
  findAll(
    @ActiveUserId() userId: string,
    @Query() filters: FilterTournamentsDto,
  ) {
    return this.tournamentsService.findAll(userId, filters);
  }

  // @Get(':id')
  // findOne(@Param('id') id: string) {
  //   return this.tournamentsService.findOne(+id);
  // }

  // @Patch(':id')
  // update(@Param('id') id: string, @Body() updateTournamentDto: UpdateTournamentDto) {
  //   return this.tournamentsService.update(+id, updateTournamentDto);
  // }

  @Delete(':id')
  remove(@Param('id') id: string, @ActiveUserId() userId: string) {
    return this.tournamentsService.remove(userId, id);
  }
}
