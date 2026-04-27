import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ScheduleType } from '@prisma/client';
import { ActiveUserId } from 'src/shared/decorators/ActiveUserId';
import { CreateTournamentScheduleDto } from './dto/create-tournament-schedule.dto';
import { UpdateTournamentScheduleDto } from './dto/update-tournament-schedule.dto';
import { TournamentSchedulesService } from './tournament-schedules.service';

@Controller('tournaments/schedules')
export class TournamentSchedulesController {
  constructor(
    private readonly tournamentSchedulesService: TournamentSchedulesService,
  ) {}

  @Post()
  create(
    @ActiveUserId() userId: string,
    @Body() dto: CreateTournamentScheduleDto,
  ) {
    return this.tournamentSchedulesService.create(userId, dto);
  }

  @Get()
  findAll(
    @ActiveUserId() userId: string,
    @Query('type') type?: ScheduleType,
  ) {
    return this.tournamentSchedulesService.findAll(userId, type);
  }

  @Patch(':id')
  update(
    @ActiveUserId() userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateTournamentScheduleDto,
  ) {
    return this.tournamentSchedulesService.update(userId, id, dto);
  }

  @Delete(':id')
  remove(@ActiveUserId() userId: string, @Param('id') id: string) {
    return this.tournamentSchedulesService.remove(userId, id);
  }
}
