import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class BanksRepository {
  constructor(private readonly prismaService: PrismaService) {}

  private async validateBankExists(bankId: string) {
    const bank = await this.prismaService.bank.findUnique({
      where: { id: bankId },
    });

    if (!bank) {
      throw new Error('Bank not found');
    }

    return bank;
  }

  private validateSufficientFunds(
    bankBalance: number,
    withdrawalAmount: number,
  ) {
    if (bankBalance < withdrawalAmount) {
      throw new Error('Insufficient funds');
    }
  }

  async createDeposit(bankId: string, amount: number) {
    const bank = await this.validateBankExists(bankId);

    return this.prismaService.$transaction(async (prisma) => {
      // Create the deposit
      const deposit = await prisma.deposit.create({
        data: {
          bankId,
          amount,
          date: new Date(),
        },
      });

      // Update bank totals
      await prisma.bank.update({
        where: { id: bankId },
        data: {
          bank: bank.bank + amount,
          totalDeposit: bank.totalDeposit + amount,
        },
      });

      return deposit;
    });
  }

  create(userId: string) {
    return this.prismaService.bank.create({
      data: {
        userId,
        bank: 0,
        totalDeposit: 0,
        totalWithdrawal: 0,
        profit: 0,
      },
    });
  }

  findByUserId(userId: string) {
    return this.prismaService.bank.findFirst({
      where: { userId },
      include: {
        deposits: {
          orderBy: {
            date: 'desc',
          },
        },
        withdrawals: {
          orderBy: {
            date: 'desc',
          },
        },
        rakes: {
          orderBy: {
            date: 'desc',
          },
        },
      },
    });
  }

  async createRake(bankId: string, amount: number) {
    const bank = await this.validateBankExists(bankId);

    return this.prismaService.$transaction(async (prisma) => {
      const rake = await prisma.rake.create({
        data: {
          bankId,
          amount,
          date: new Date(),
        },
      });

      await prisma.bank.update({
        where: { id: bankId },
        data: {
          bank: bank.bank + amount,
          totalRake: bank.totalRake + amount,
        },
      });

      return rake;
    });
  }

  findRakesByBankId(bankId: string) {
    return this.prismaService.rake.findMany({
      where: { bankId },
      orderBy: { date: 'desc' },
    });
  }

  async createWithdrawal(bankId: string, amount: number) {
    const bank = await this.validateBankExists(bankId);
    this.validateSufficientFunds(bank.bank, amount);

    return this.prismaService.$transaction(async (prisma) => {
      // Create the withdrawal
      const withdrawal = await prisma.withdrawal.create({
        data: {
          bankId,
          amount,
          date: new Date(),
        },
      });

      // Update bank totals
      await prisma.bank.update({
        where: { id: bankId },
        data: {
          bank: bank.bank - amount,
          totalWithdrawal: bank.totalWithdrawal + amount,
        },
      });

      return withdrawal;
    });
  }

  update(id: string, data: Prisma.BankUpdateInput) {
    return this.prismaService.bank.update({
      where: { id },
      data,
    });
  }
}
