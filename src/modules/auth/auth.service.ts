import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';

import { SignupDto } from './dto/signup.dto';
import { JwtService } from '@nestjs/jwt';
import { UsersRepository } from 'src/database/repositories/users.repositories';
import { hash, compare } from 'bcryptjs';
import { SigninDto } from './dto/signin.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UsersService } from '../users/users.service';
import { env, isEmailAllowed } from 'src/shared/config/env';
import { MailService } from 'src/shared/mail/mail.service';

const RESET_TOKEN_TTL_MINUTES = 30;

@Injectable()
export class AuthService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
    private readonly mailService: MailService,
  ) {}

  async signin(signinDto: SigninDto) {
    const { email, password } = signinDto;

    if (!isEmailAllowed(email)) {
      throw new UnauthorizedException('Credenciais inválidas.');
    }

    const user = await this.usersRepository.findUnique({
      where: {
        email,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Credenciais inválidas.');
    }

    const isPasswordValid = await compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciais inválidas.');
    }

    const accessToken = await this.generateAccessToken(user.id);

    return { accessToken };
  }

  async signup(signupDto: SignupDto) {
    const { name, email, password } = signupDto;

    if (!isEmailAllowed(email)) {
      throw new UnauthorizedException('Credenciais inválidas.');
    }

    const emailTaken = await this.usersRepository.findUnique({
      where: {
        email,
      },
      select: {
        id: true,
      },
    });

    if (emailTaken) {
      throw new ConflictException('Esse email já está em uso.');
    }

    const hashedPassword = await hash(password, 10);

    const user = await this.usersRepository.create({
      data: {
        name,
        email,
        password: hashedPassword,
      },
    });

    // Create bank for the new user
    await this.usersService.createUserBank(user.id);

    const accessToken = await this.generateAccessToken(user.id);

    return { accessToken };
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const { email } = forgotPasswordDto;
    const genericResponse = {
      message:
        'Se esse email estiver cadastrado, um link de recuperação foi enviado.',
    };

    const user = await this.usersRepository.findUnique({ where: { email } });

    if (!user) {
      return genericResponse;
    }

    const token = randomBytes(32).toString('hex');
    const resetTokenHash = this.hashResetToken(token);
    const resetTokenExpiresAt = new Date(
      Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000,
    );

    await this.usersRepository.setResetToken(
      user.id,
      resetTokenHash,
      resetTokenExpiresAt,
    );

    const resetLink = `${env.frontendUrl}/reset-password?token=${token}`;
    await this.mailService.sendPasswordResetEmail(user.email, resetLink);

    return genericResponse;
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const { token, newPassword } = resetPasswordDto;

    const resetTokenHash = this.hashResetToken(token);
    const user =
      await this.usersRepository.findByValidResetTokenHash(resetTokenHash);

    if (!user) {
      throw new BadRequestException('Token inválido ou expirado.');
    }

    const hashedPassword = await hash(newPassword, 10);
    await this.usersRepository.resetPassword(user.id, hashedPassword);

    return { message: 'Senha redefinida com sucesso.' };
  }

  private hashResetToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private async generateAccessToken(userId: string) {
    return this.jwtService.signAsync({ sub: userId });
  }
}
