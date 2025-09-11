import { Body, Controller, Post } from '@nestjs/common';
import { BanksService } from './banks.service';
import { CreateDepositDto } from './dto/create-deposit.dto';
import { CreateWithdrawalDto } from './dto/create-withdrawal.dto';
import { ActiveUserId } from '../../shared/decorators/ActiveUserId';

@Controller('banks')
export class BanksController {
  constructor(private readonly banksService: BanksService) {}

  @Post('deposits')
  createDeposit(
    @ActiveUserId() userId: string,
    @Body() createDepositDto: CreateDepositDto,
  ) {
    return this.banksService.createDeposit(userId, createDepositDto);
  }

  @Post('withdrawals')
  createWithdrawal(
    @ActiveUserId() userId: string,
    @Body() createWithdrawalDto: CreateWithdrawalDto,
  ) {
    return this.banksService.createWithdrawal(userId, createWithdrawalDto);
  }
}
