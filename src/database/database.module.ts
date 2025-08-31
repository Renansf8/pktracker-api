import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { UsersRepository } from './repositories/users.repositories';
import { BanksRepository } from './repositories/banks.repositories';

@Global()
@Module({
  providers: [PrismaService, UsersRepository, BanksRepository],
  exports: [PrismaService, UsersRepository, BanksRepository],
})
export class DatabaseModule {}
