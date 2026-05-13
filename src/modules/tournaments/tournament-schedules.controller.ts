import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ScheduleType } from '@prisma/client';
import { ActiveUserId } from 'src/shared/decorators/ActiveUserId';
import { CreateTournamentScheduleDto } from './dto/create-tournament-schedule.dto';
import { UpdateTournamentScheduleDto } from './dto/update-tournament-schedule.dto';
import { TournamentSchedulesService } from './tournament-schedules.service';

@ApiTags('Tournament Schedules')
@ApiBearerAuth()
@Controller('tournaments/schedules')
export class TournamentSchedulesController {
  constructor(
    private readonly tournamentSchedulesService: TournamentSchedulesService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a tournament schedule' })
  @ApiResponse({ status: 201, description: 'Schedule created successfully' })
  create(
    @ActiveUserId() userId: string,
    @Body() dto: CreateTournamentScheduleDto,
  ) {
    return this.tournamentSchedulesService.create(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List tournament schedules' })
  @ApiQuery({ name: 'type', enum: ScheduleType, required: false })
  @ApiResponse({ status: 200, description: 'List of schedules' })
  findAll(
    @ActiveUserId() userId: string,
    @Query('type') type?: ScheduleType,
  ) {
    return this.tournamentSchedulesService.findAll(userId, type);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a tournament schedule' })
  @ApiResponse({ status: 200, description: 'Schedule updated successfully' })
  @ApiResponse({ status: 404, description: 'Schedule not found' })
  update(
    @ActiveUserId() userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateTournamentScheduleDto,
  ) {
    return this.tournamentSchedulesService.update(userId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a tournament schedule' })
  @ApiResponse({ status: 200, description: 'Schedule deleted successfully' })
  @ApiResponse({ status: 404, description: 'Schedule not found' })
  remove(@ActiveUserId() userId: string, @Param('id') id: string) {
    return this.tournamentSchedulesService.remove(userId, id);
  }
}
