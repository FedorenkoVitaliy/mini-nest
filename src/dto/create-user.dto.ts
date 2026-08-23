import { IsString, MinLength, IsEmail } from 'class-validator';

export class CreateUserDto {
  @IsString()
  @MinLength(2)
  name!: string;
  @IsEmail()
  email!: string;
}
