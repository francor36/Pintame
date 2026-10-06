//Es el que "recibe" las peticiones HTTP que le manda tu frontend (por ejemplo, cuando hacés el fetch a /api/auth/login). Recibe los datos del formulario y llama al servicio.

import { Controller, Post, Body, HttpCode, HttpStatus, Get, UseGuards, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard'; // El guard que protege la ruta

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: { email: string; password: string }) {
    return this.authService.login(body.email, body.password);
  }

  @Post('register')
  async register(@Body() body: { nombre: string; email: string; password: string }) {
    return this.authService.register(body.nombre, body.email, body.password);
  }

  // Ejemplo de ruta protegida con JWT
  @UseGuards(JwtAuthGuard)
  @Get('perfil')
  getProfile(@Request() req) {
    return req.user; // Devuelve la info del usuario decodificada del token
  }
}
