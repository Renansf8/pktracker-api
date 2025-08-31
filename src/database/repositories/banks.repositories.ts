import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class BanksRepository {
  constructor(private readonly prismaService: PrismaService) {}

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
    });
  }

  update(id: string, data: Prisma.BankUpdateInput) {
    return this.prismaService.bank.update({
      where: { id },
      data,
    });
  }
}
