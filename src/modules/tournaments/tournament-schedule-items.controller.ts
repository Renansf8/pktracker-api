import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ActiveUserId } from 'src/shared/decorators/ActiveUserId';
import { CreateTournamentScheduleItemDto } from './dto/create-tournament-schedule-item.dto';
import { UpdateTournamentScheduleItemDto } from './dto/update-tournament-schedule-item.dto';
import { TournamentScheduleItemsService } from './tournament-schedule-items.service';

@Controller('tournaments/schedule')
export class TournamentScheduleItemsController {
  constructor(
    private readonly tournamentScheduleItemsService: TournamentScheduleItemsService,
  ) {}

  @Post()
  create(
    @ActiveUserId() userId: string,
    @Body() dto: CreateTournamentScheduleItemDto,
  ) {
    return this.tournamentScheduleItemsService.create(userId, dto);
  }

  @Get()
  findAll(@ActiveUserId() userId: string) {
    return this.tournamentScheduleItemsService.findAll(userId);
  }

  @Patch(':id')
  update(
    @ActiveUserId() userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateTournamentScheduleItemDto,
  ) {
    return this.tournamentScheduleItemsService.update(userId, id, dto);
  }

  @Delete(':id')
  remove(@ActiveUserId() userId: string, @Param('id') id: string) {
    return this.tournamentScheduleItemsService.remove(userId, id);
  }
}

