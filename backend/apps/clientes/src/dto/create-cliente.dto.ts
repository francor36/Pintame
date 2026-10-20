import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';

export class CreateClienteDto {
  @IsString()
  @IsNotEmpty()
  @Length(7, 20)
  dni!: string;

  @IsString()
  @IsNotEmpty()
  @Length(2, 100)
  nombre!: string;

  @IsString()
  @IsNotEmpty()
  @Length(2, 100)
  apellido!: string;

  @IsOptional()
  @IsEmail()
  @Length(5, 150)
  email?: string;

  @IsOptional()
  @IsString()
  @Length(6, 20)
  telefono?: string;

  @IsOptional()
  @IsString()
  @Length(3, 250)
  direccion?: string;
}