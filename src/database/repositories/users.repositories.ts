import { Injectable } from '@nestjs/common';
import { type Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';

@Injectable()
export class UsersRepository {
  constructor(private readonly prismaService: PrismaService) {}

  create(createDTO: Prisma.UserCreateArgs) {
    return this.prismaService.user.create(createDTO);
  }

  findUnique(findUniqueDTO: Prisma.UserFindUniqueArgs) {
    return this.prismaService.user.findUnique(findUniqueDTO);
  }

  findMany() {
    return this.prismaService.user.findMany({
      select: {
        name: true,
        email: true,
        createdAt: true,
        Bank: {
          include: {
            deposits: { orderBy: { date: 'desc' } },
            withdrawals: { orderBy: { date: 'desc' } },
            rakes: { orderBy: { date: 'desc' } },
          },
        },
      },
    });
  }

  setResetToken(
    userId: string,
    resetTokenHash: string,
    resetTokenExpiresAt: Date,
  ) {
    return this.prismaService.user.update({
      where: { id: userId },
      data: { resetTokenHash, resetTokenExpiresAt },
    });
  }

  findByValidResetTokenHash(resetTokenHash: string) {
    return this.prismaService.user.findFirst({
      where: {
        resetTokenHash,
        resetTokenExpiresAt: { gt: new Date() },
      },
    });
  }

  resetPassword(userId: string, hashedPassword: string) {
    return this.prismaService.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        resetTokenHash: null,
        resetTokenExpiresAt: null,
      },
    });
  }
}
