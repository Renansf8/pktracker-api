import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { BanksService } from './banks.service';
import { CreateDepositDto } from './dto/create-deposit.dto';
import { CreateWithdrawalDto } from './dto/create-withdrawal.dto';
import { CreateRakeDto } from './dto/create-rake.dto';
import { ActiveUserId } from '../../shared/decorators/ActiveUserId';

@ApiTags('Banks')
@ApiBearerAuth()
@Controller('banks')
export class BanksController {
  constructor(private readonly banksService: BanksService) {}

  @Post('deposits')
  @ApiOperation({ summary: 'Deposit funds into the bank' })
  @ApiResponse({ status: 201, description: 'Deposit created successfully' })
  createDeposit(
    @ActiveUserId() userId: string,
    @Body() createDepositDto: CreateDepositDto,
  ) {
    return this.banksService.createDeposit(userId, createDepositDto);
  }

  @Post('withdrawals')
  @ApiOperation({ summary: 'Withdraw funds from the bank' })
  @ApiResponse({ status: 201, description: 'Withdrawal created successfully' })
  @ApiResponse({ status: 400, description: 'Insufficient funds' })
  createWithdrawal(
    @ActiveUserId() userId: string,
    @Body() createWithdrawalDto: CreateWithdrawalDto,
  ) {
    return this.banksService.createWithdrawal(userId, createWithdrawalDto);
  }

  @Post('rakes')
  @ApiOperation({ summary: 'Register rake received' })
  @ApiResponse({ status: 201, description: 'Rake created successfully' })
  createRake(
    @ActiveUserId() userId: string,
    @Body() createRakeDto: CreateRakeDto,
  ) {
    return this.banksService.createRake(userId, createRakeDto);
  }

  @Get('rakes')
  @ApiOperation({ summary: 'Get rake history' })
  @ApiResponse({ status: 200, description: 'List of rake entries' })
  getRakeHistory(@ActiveUserId() userId: string) {
    return this.banksService.getRakeHistory(userId);
  }

  @Get('me')
  @ApiOperation({ summary: 'Get current user bank info' })
  @ApiResponse({ status: 200, description: 'Bank details' })
  getMe(@ActiveUserId() userId: string) {
    return this.banksService.getMe(userId);
  }
}
