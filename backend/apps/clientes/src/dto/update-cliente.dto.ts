import {
  IsEmail,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';

export class UpdateClienteDto {
  @IsOptional()
  @IsString()
  @Length(2, 100)
  nombre?: string;

  @IsOptional()
  @IsString()
  @Length(2, 100)
  apellido?: string;

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