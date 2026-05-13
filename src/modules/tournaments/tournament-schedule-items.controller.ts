import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ActiveUserId } from 'src/shared/decorators/ActiveUserId';
import { CreateTournamentScheduleItemDto } from './dto/create-tournament-schedule-item.dto';
import { UpdateTournamentScheduleItemDto } from './dto/update-tournament-schedule-item.dto';
import { TournamentScheduleItemsService } from './tournament-schedule-items.service';

@ApiTags('Tournament Schedule Items')
@ApiBearerAuth()
@Controller('tournaments/schedules/:scheduleId/items')
export class TournamentScheduleItemsController {
  constructor(
    private readonly tournamentScheduleItemsService: TournamentScheduleItemsService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Add an item to a schedule' })
  @ApiResponse({ status: 201, description: 'Item created successfully' })
  create(
    @ActiveUserId() userId: string,
    @Param('scheduleId') scheduleId: string,
    @Body() dto: CreateTournamentScheduleItemDto,
  ) {
    return this.tournamentScheduleItemsService.create(userId, scheduleId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List items of a schedule' })
  @ApiResponse({ status: 200, description: 'List of schedule items' })
  findAll(
    @ActiveUserId() userId: string,
    @Param('scheduleId') scheduleId: string,
  ) {
    return this.tournamentScheduleItemsService.findAll(userId, scheduleId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a schedule item' })
  @ApiResponse({ status: 200, description: 'Item updated successfully' })
  @ApiResponse({ status: 404, description: 'Item not found' })
  update(
    @ActiveUserId() userId: string,
    @Param('scheduleId') scheduleId: string,
    @Param('id') id: string,
    @Body() dto: UpdateTournamentScheduleItemDto,
  ) {
    return this.tournamentScheduleItemsService.update(userId, scheduleId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a schedule item' })
  @ApiResponse({ status: 200, description: 'Item deleted successfully' })
  @ApiResponse({ status: 404, description: 'Item not found' })
  remove(
    @ActiveUserId() userId: string,
    @Param('scheduleId') scheduleId: string,
    @Param('id') id: string,
  ) {
    return this.tournamentScheduleItemsService.remove(userId, scheduleId, id);
  }
}
