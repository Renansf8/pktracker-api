import { Injectable } from '@nestjs/common';

import { SignupDto } from './dto/signup.dto';

@Injectable()
export class AuthService {
  async signup(signupDto: SignupDto) {
    return 'This action adds a new auth';
  }
}
