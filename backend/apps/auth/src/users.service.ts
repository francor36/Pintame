//Este archivo se encargará exclusivamente de inicializar al usuario administrador cuando la tabla esté vacía (implementando OnModuleInit).

import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService implements OnModuleInit {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  // Este método se ejecuta automáticamente al iniciar la aplicación
  async onModuleInit() {
    await this.createDefaultAdmin();
  }

  private async createDefaultAdmin() {
    try {
      // 1. Verificamos si ya existe algún usuario en la base de datos
      const userCount = await this.userRepository.count();

      if (userCount === 0) {
        this.logger.log('No se encontraron usuarios. Creando administrador por defecto...');

        // 2. Hasheamos la contraseña por seguridad
        const hashedPassword = await bcrypt.hash('admin123', 10);

        // 3. Creamos el usuario administrador predeterminado
        const adminUser = this.userRepository.create({
          nombre: 'Administrador',
          email: 'admin@pintureria.com',
          password: hashedPassword,
        });

        await this.userRepository.save(adminUser);
        this.logger.log('¡Usuario administrador creado exitosamente: admin@pintureria.com / admin123!');
      }
    } catch (error) {
      this.logger.error('Error al intentar crear el administrador automático:', error);
    }
  }
}