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
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { TournamentsService } from './tournaments.service';
import { CreateTournamentDto } from './dto/create-tournament.dto';
import { UpdateTournamentDto } from './dto/update-tournament.dto';
import { FilterTournamentsDto } from './dto/filter-tournaments.dto';
import { ActiveUserId } from 'src/shared/decorators/ActiveUserId';
import { BulkCreateTournamentsDto } from './dto/bulk-create-tournaments.dto';

@ApiTags('Tournaments')
@ApiBearerAuth()
@Controller('tournaments')
export class TournamentsController {
  constructor(private readonly tournamentsService: TournamentsService) {}

  @Post()
  @ApiOperation({ summary: 'Log a tournament result' })
  @ApiResponse({ status: 201, description: 'Tournament created successfully' })
  create(
    @ActiveUserId() userId: string,
    @Body() createTournamentDto: CreateTournamentDto,
  ) {
    return this.tournamentsService.create(userId, createTournamentDto);
  }

  @Post('bulk')
  @ApiOperation({ summary: 'Log multiple tournament results at once' })
  @ApiResponse({ status: 201, description: 'Tournaments created successfully' })
  createBulk(
    @ActiveUserId() userId: string,
    @Body() dto: BulkCreateTournamentsDto,
  ) {
    return this.tournamentsService.createBulk(userId, dto.tournaments);
  }

  @Post('apply-schedule')
  @ApiOperation({ summary: 'Apply a schedule to create tournaments' })
  @ApiQuery({ name: 'scheduleId', required: false })
  @ApiResponse({ status: 201, description: 'Schedule applied successfully' })
  applySchedule(
    @ActiveUserId() userId: string,
    @Query('scheduleId') scheduleId?: string,
  ) {
    return this.tournamentsService.applySchedule(userId, { scheduleId });
  }

  @Get()
  @ApiOperation({ summary: 'List tournaments with optional filters' })
  @ApiResponse({ status: 200, description: 'Paginated list of tournaments' })
  findAll(
    @ActiveUserId() userId: string,
    @Query() filters: FilterTournamentsDto,
  ) {
    return this.tournamentsService.findAll(userId, filters);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a tournament' })
  @ApiResponse({ status: 200, description: 'Tournament updated successfully' })
  @ApiResponse({ status: 404, description: 'Tournament not found' })
  update(
    @ActiveUserId() userId: string,
    @Param('id') id: string,
    @Body() updateTournamentDto: UpdateTournamentDto,
  ) {
    return this.tournamentsService.update(userId, id, updateTournamentDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a tournament and reverse its bank effect' })
  @ApiResponse({ status: 200, description: 'Tournament deleted successfully' })
  @ApiResponse({ status: 404, description: 'Tournament not found' })
  remove(@Param('id') id: string, @ActiveUserId() userId: string) {
    return this.tournamentsService.remove(userId, id);
  }
}
