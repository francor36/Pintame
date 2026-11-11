import {
  Inject,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ClientProxy } from '@nestjs/microservices';
import * as bcrypt from 'bcrypt';
import { firstValueFrom, timeout } from 'rxjs';
import { UsuarioInterno } from '../../users/src/users.types';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwt: JwtService,
    @Inject('USERS_SERVICE') private readonly usersClient: ClientProxy,
  ) {}

  async login(email: string, password: string) {
    if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
      throw new UnauthorizedException('Email o contraseña incorrectos');
    }
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
      throw new ServiceUnavailableException('Configurar JWT_SECRET con al menos 32 caracteres');
    }

    let user: UsuarioInterno | null;
    try {
      user = await firstValueFrom(
        this.usersClient
          .send<UsuarioInterno | null>({ cmd: 'users.buscar-email' }, { email })
          .pipe(timeout(8000)),
      );
    } catch {
      throw new ServiceUnavailableException('El servicio de usuarios no está disponible');
    }
    if (!user || !user.activo || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedException('Email o contraseña incorrectos');
    }

    const accessToken = await this.jwt.signAsync({
      sub: user.id,
      email: user.email,
      nombre: user.nombre,
      rol: user.rol,
    });
    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: '8h',
      usuario: {
        id: user.id,
        email: user.email,
        nombre: user.nombre,
        rol: user.rol,
      },
    };
  }
}
