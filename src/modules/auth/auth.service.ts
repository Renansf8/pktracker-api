import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { SignupDto } from './dto/signup.dto';
import { JwtService } from '@nestjs/jwt';
import { UsersRepository } from 'src/database/repositories/users.repositories';
import { hash, compare } from 'bcryptjs';
import { SigninDto } from './dto/signin.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly jwtService: JwtService,
  ) {}

  async signin(signinDto: SigninDto) {
    const { email, password } = signinDto;

    const user = await this.usersRepository.findUnique({
      where: {
        email,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    const isPasswordValid = await compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    const accessToken = await this.generateAccessToken(user.id);

    return { accessToken };
  }

  async signup(signupDto: SignupDto) {
    const { name, email, password } = signupDto;

    const emailTaken = await this.usersRepository.findUnique({
      where: {
        email,
      },
      select: {
        id: true,
      },
    });

    if (emailTaken) {
      throw new ConflictException('This email is already in use.');
    }

    const hashedPassword = await hash(password, 10);

    const user = await this.usersRepository.create({
      data: {
        name,
        email,
        password: hashedPassword,
      },
    });

    return user;
  }

  private async generateAccessToken(userId: string) {
    return this.jwtService.signAsync({ sub: userId });
  }
}
