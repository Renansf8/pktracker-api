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
import { BulkCreateTournamentsDto } from './dto/bulk-create-tournaments.dto';

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

  @Post('bulk')
  createBulk(
    @ActiveUserId() userId: string,
    @Body() dto: BulkCreateTournamentsDto,
  ) {
    return this.tournamentsService.createBulk(userId, dto.tournaments);
  }

  @Post('apply-schedule')
  applySchedule(
    @ActiveUserId() userId: string,
    @Query('scheduleId') scheduleId?: string,
  ) {
    return this.tournamentsService.applySchedule(userId, { scheduleId });
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

  @Patch(':id')
  update(
    @ActiveUserId() userId: string,
    @Param('id') id: string,
    @Body() updateTournamentDto: UpdateTournamentDto,
  ) {
    return this.tournamentsService.update(userId, id, updateTournamentDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @ActiveUserId() userId: string) {
    return this.tournamentsService.remove(userId, id);
  }
}
