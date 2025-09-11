import { Module } from '@nestjs/common';

import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { DatabaseModule } from './database/database.module';
import { APP_GUARD } from '@nestjs/core';
import { AuthGuard } from './modules/auth/auth.guard';
import { TournamentsModule } from './modules/tournaments/tournaments.module';
import { BanksModule } from './modules/banks/banks.module';

@Module({
  imports: [UsersModule, AuthModule, DatabaseModule, TournamentsModule, BanksModule],
  controllers: [],
  providers: [
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
  ],
})
export class AppModule {}
