import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ActiveUserId } from 'src/shared/decorators/ActiveUserId';
import { CreateTournamentScheduleItemDto } from './dto/create-tournament-schedule-item.dto';
import { UpdateTournamentScheduleItemDto } from './dto/update-tournament-schedule-item.dto';
import { TournamentScheduleItemsService } from './tournament-schedule-items.service';

@Controller('tournaments/schedules/:scheduleId/items')
export class TournamentScheduleItemsController {
  constructor(
    private readonly tournamentScheduleItemsService: TournamentScheduleItemsService,
  ) {}

  @Post()
  create(
    @ActiveUserId() userId: string,
    @Param('scheduleId') scheduleId: string,
    @Body() dto: CreateTournamentScheduleItemDto,
  ) {
    return this.tournamentScheduleItemsService.create(userId, scheduleId, dto);
  }

  @Get()
  findAll(
    @ActiveUserId() userId: string,
    @Param('scheduleId') scheduleId: string,
  ) {
    return this.tournamentScheduleItemsService.findAll(userId, scheduleId);
  }

  @Patch(':id')
  update(
    @ActiveUserId() userId: string,
    @Param('scheduleId') scheduleId: string,
    @Param('id') id: string,
    @Body() dto: UpdateTournamentScheduleItemDto,
  ) {
    return this.tournamentScheduleItemsService.update(userId, scheduleId, id, dto);
  }

  @Delete(':id')
  remove(
    @ActiveUserId() userId: string,
    @Param('scheduleId') scheduleId: string,
    @Param('id') id: string,
  ) {
    return this.tournamentScheduleItemsService.remove(userId, scheduleId, id);
  }
}
