//Cerebro, (la logica del negocio) aca es donde se valida si el usuario existe, se verifica la contraseña cifrada y se genera el token de seguridad//

import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  async register(nombre: string, email: string, password: string) {
    // 1. Verificar si el usuario ya existe
    const existingUser = await this.userRepository.findOne({ where: { email } });
    if (existingUser) {
      throw new ConflictException('El correo ya está registrado');
    }

    // 2. Cifrar la contraseña con bcrypt (10 rondas de salt)
    const hashedPassword = await bcrypt.hash(password, 10);

    // 3. Crear y guardar el nuevo usuario en PostgreSQL
    const newUser = this.userRepository.create({
      nombre,
      email,
      password: hashedPassword,
    });

    const savedUser = await this.userRepository.save(newUser);

    return {
      message: 'Usuario registrado exitosamente',
      userId: savedUser.id,
      email: savedUser.email,
    };
  }

  async login(email: string, password: string) {
    // 1. Buscar al usuario en la base de datos por su email
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // 2. Comparar la contraseña ingresada con el hash guardado en PostgreSQL
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // 3. Crear el payload y generar el token JWT real
    const payload = { sub: user.id, email: user.email, nombre: user.nombre };
    const token = this.jwtService.sign(payload);

    return {
      message: 'Login exitoso',
      token,
      nombre: user.nombre,
      email: user.email,
    };
  }
}