//Es el archivo que empaqueta todo esto y se lo comunica al núcleo de la aplicación.//

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config'; 
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt'; 
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { User } from './user.entity';
import { AdminSeedService } from './admin-seed.service'; // 1. Importamos el servicio del seed

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // Esto carga el archivo .env al iniciar el módulo
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'postgres',
      password: process.env.DB_PASSWORD, 
      database: 'pintureria',
      entities: [User],
      synchronize: true,
    }),
    TypeOrmModule.forFeature([User]),
    
    // Registrar el módulo de JWT (leyendo la clave secreta del .env o usando un fallback seguro)
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || 'CLAVE_SECRETA_SUPER_SEGURA',
        signOptions: { expiresIn: '8h' }, // El token expira en 8 horas
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    AdminSeedService, // 2. Lo agregamos aquí para que NestJS lo ejecute automáticamente al arrancar
  ],
})
export class AuthModule {}