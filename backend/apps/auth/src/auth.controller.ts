import { Controller } from '@nestjs/common';
import { Payload } from '@nestjs/microservices';
import { MessagePattern } from '@nestjs/microservices';
import { AuthService } from './auth.service';

@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @MessagePattern({ cmd: 'auth.login' })
  login(@Payload() body: { email: string; password: string }) {
    return this.authService.login(body?.email, body?.password);
  }
}
