import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber } from 'class-validator';

export class CreateWithdrawalDto {
  @ApiProperty({ example: 50 })
  @IsNotEmpty()
  @IsNumber()
  amount: number;
}
