import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { BanksRepository } from '../../database/repositories/banks.repositories';
import { CreateDepositDto } from './dto/create-deposit.dto';
import { CreateWithdrawalDto } from './dto/create-withdrawal.dto';

@Injectable()
export class BanksService {
  constructor(private readonly banksRepository: BanksRepository) {}

  private async validateAndGetBank(userId: string) {
    const bank = await this.banksRepository.findByUserId(userId);

    if (!bank) {
      throw new NotFoundException('Bank not found for this user.');
    }

    return bank;
  }

  async createDeposit(userId: string, createDepositDto: CreateDepositDto) {
    const bank = await this.validateAndGetBank(userId);
    return this.banksRepository.createDeposit(bank.id, createDepositDto.amount);
  }

  async createWithdrawal(
    userId: string,
    createWithdrawalDto: CreateWithdrawalDto,
  ) {
    const bank = await this.validateAndGetBank(userId);

    try {
      return await this.banksRepository.createWithdrawal(
        bank.id,
        createWithdrawalDto.amount,
      );
    } catch (error) {
      if (error.message === 'Insufficient funds') {
        throw new BadRequestException('Insufficient funds for withdrawal.');
      }
      throw error;
    }
  }
}
