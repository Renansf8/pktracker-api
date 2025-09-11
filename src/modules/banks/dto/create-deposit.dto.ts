import { IsNotEmpty, IsNumber } from 'class-validator';

export class CreateDepositDto {
  @IsNotEmpty()
  @IsNumber()
  amount: number;
}
