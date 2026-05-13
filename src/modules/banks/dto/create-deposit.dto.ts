import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber } from 'class-validator';

export class CreateDepositDto {
  @ApiProperty({ example: 100 })
  @IsNotEmpty()
  @IsNumber()
  amount: number;
}
