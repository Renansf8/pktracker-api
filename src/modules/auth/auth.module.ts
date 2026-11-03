import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtModule } from '@nestjs/jwt';
import { env } from 'src/shared/config/env';
import { UsersService } from '../users/users.service';
import { MailModule } from 'src/shared/mail/mail.module';
import { ThrottlerModule } from '@nestjs/throttler';
import { TOO_MANY_ATTEMPTS_MESSAGE } from 'src/shared/guards/auth-throttler.guard';

@Module({
  imports: [
    JwtModule.register({
      global: true,
      secret: env.jwtSecret,
      signOptions: { expiresIn: '7d' },
    }),
    MailModule,
    // In memory: fine for a single API instance.
    ThrottlerModule.forRoot({
      throttlers: [{ name: 'default', ttl: 60_000, limit: 10 }],
      errorMessage: TOO_MANY_ATTEMPTS_MESSAGE,
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, UsersService],
})
export class AuthModule {}
