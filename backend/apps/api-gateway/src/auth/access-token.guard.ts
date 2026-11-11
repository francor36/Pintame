import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

export type AuthenticatedUser = {
  sub: number;
  email: string;
  nombre: string;
  rol: 'ADMIN' | 'CAJERO';
};

export type AuthenticatedRequest = {
  headers: { authorization?: string };
  user?: AuthenticatedUser;
};

@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authorization = request.headers.authorization;
    const token = authorization?.startsWith('Bearer ')
      ? authorization.slice('Bearer '.length)
      : undefined;
    const secret = process.env.JWT_SECRET;
    if (!token || !secret || secret.length < 32) {
      throw new UnauthorizedException('Se requiere un token válido');
    }
    try {
      request.user = await this.jwt.verifyAsync<AuthenticatedUser>(token, { secret });
      return true;
    } catch {
      throw new UnauthorizedException('Token inválido o vencido');
    }
  }
}
