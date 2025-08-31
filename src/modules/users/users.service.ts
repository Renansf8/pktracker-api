import { Injectable } from '@nestjs/common';
import { UsersRepository } from 'src/database/repositories/users.repositories';
import { BanksRepository } from 'src/database/repositories/banks.repositories';

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly banksRepository: BanksRepository,
  ) {}

  async getUserById(userId: string) {
    const user = await this.usersRepository.findUnique({
      where: { id: userId },
      select: {
        name: true,
        email: true,
      },
    });

    const bank = await this.banksRepository.findByUserId(userId);

    return {
      ...user,
      bank,
    };
  }

  async createUserBank(userId: string) {
    const existingBank = await this.banksRepository.findByUserId(userId);

    if (!existingBank) {
      return this.banksRepository.create(userId);
    }

    return existingBank;
  }
}
