import { IsNotEmpty, IsNumber } from 'class-validator';

export class CreateWithdrawalDto {
  @IsNotEmpty()
  @IsNumber()
  amount: number;
}
