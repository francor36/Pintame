import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './user.entity';

@Injectable()
export class AdminSeedService implements OnModuleInit {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async onModuleInit() {
    await this.createDefaultAdmin();
  }

  private async createDefaultAdmin() {
    try {
      // 1. Verificamos si ya existe algún usuario en la base de datos
      const userCount = await this.userRepository.count();

      if (userCount === 0) {
        console.log('📦 No se encontraron usuarios. Creando administrador por defecto...');

        // 2. Tomamos las credenciales desde el archivo .env (con fallbacks seguros por seguridad)
        const defaultEmail = process.env.ADMIN_EMAIL || 'admin@pintureria.com';
        const defaultPassword = process.env.ADMIN_PASSWORD || 'AdminPassword123*';
        const hashedPassword = await bcrypt.hash(defaultPassword, 10);

        // 3. Creamos y guardamos el usuario administrador
        const adminUser = this.userRepository.create({
          nombre: 'Administrador',
          email: defaultEmail,
          password: hashedPassword,
        });

        await this.userRepository.save(adminUser);

        console.log('✅ ¡Administrador por defecto creado con éxito!');
        console.log(`📧 Email: ${defaultEmail}`);
        console.log(`🔑 Contraseña configurada desde el entorno.`);
        console.log('⚠️ (Recomienda al cliente cambiar esta contraseña al ingresar por primera vez).');
      }
    } catch (error) {
      console.error('❌ Error al intentar crear el administrador por defecto:', error);
    }
  }
}