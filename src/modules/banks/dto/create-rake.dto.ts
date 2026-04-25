import { IsNotEmpty, IsNumber, IsPositive } from 'class-validator';

export class CreateRakeDto {
  @IsNotEmpty()
  @IsNumber()
  @IsPositive()
  amount: number;
}
