import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { Inject } from '@nestjs/common';
import type { Pool } from 'mariadb';
import * as bcrypt from 'bcrypt';
import { RolUsuario, UsuarioInterno, UsuarioPublico } from './users.types';

type CreateUserInput = {
  email: string;
  nombre: string;
  password: string;
  rol?: RolUsuario;
};

type UpdateUserInput = {
  nombre?: string;
  rol?: RolUsuario;
  activo?: boolean;
};

@Injectable()
export class UsersService implements OnModuleInit, OnModuleDestroy {
  constructor(@Inject('USERS_DB') private readonly pool: Pool) {}

  async onModuleInit() {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(190) NOT NULL UNIQUE,
        nombre VARCHAR(150) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        rol ENUM('ADMIN', 'CAJERO') NOT NULL DEFAULT 'CAJERO',
        activo BOOLEAN NOT NULL DEFAULT TRUE,
        fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        fecha_actualizacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    const email = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
    const nombre = process.env.BOOTSTRAP_ADMIN_NAME?.trim();
    const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
    if ([email, nombre, password].some(Boolean) && !(email && nombre && password)) {
      throw new Error('Configurar juntas BOOTSTRAP_ADMIN_EMAIL, BOOTSTRAP_ADMIN_NAME y BOOTSTRAP_ADMIN_PASSWORD');
    }
    if (email && nombre && password) {
      if (password.length < 12) {
        throw new Error('BOOTSTRAP_ADMIN_PASSWORD debe tener al menos 12 caracteres');
      }
      const existente = await this.buscarPorEmail(email);
      if (!existente) {
        const passwordHash = await bcrypt.hash(password, 12);
        await this.pool.query(
          "INSERT INTO usuarios (email, nombre, password_hash, rol) VALUES (?, ?, ?, 'ADMIN')",
          [email, nombre, passwordHash],
        );
      }
    }
  }

  async onModuleDestroy() {
    await this.pool.end();
  }

  async listar(): Promise<UsuarioPublico[]> {
    const rows = await this.pool.query(
      'SELECT id, email, nombre, rol, activo, fecha_creacion AS fechaCreacion, fecha_actualizacion AS fechaActualizacion FROM usuarios ORDER BY nombre, id',
    );
    return rows.map(this.publico);
  }

  async obtener(id: number): Promise<UsuarioPublico> {
    const usuario = await this.buscarPorId(id);
    if (!usuario) throw new NotFoundException(`No existe el usuario ${id}`);
    return this.publico(usuario);
  }

  async buscarPorEmail(email: string): Promise<UsuarioInterno | null> {
    const rows = await this.pool.query(
      'SELECT id, email, nombre, password_hash AS passwordHash, rol, activo, fecha_creacion AS fechaCreacion, fecha_actualizacion AS fechaActualizacion FROM usuarios WHERE email = ? LIMIT 1',
      [email.trim().toLowerCase()],
    );
    if (!rows[0]) return null;
    const row = rows[0];
    return {
      ...this.publico(row),
      passwordHash: row.passwordHash,
    };
  }

  async crear(input: CreateUserInput): Promise<UsuarioPublico> {
    const email = input.email?.trim().toLowerCase();
    const nombre = input.nombre?.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new BadRequestException('Ingresá un email válido');
    }
    if (!nombre || nombre.length > 150) {
      throw new BadRequestException('El nombre es obligatorio y admite hasta 150 caracteres');
    }
    if (typeof input.password !== 'string' || input.password.length < 8) {
      throw new BadRequestException('La contraseña debe tener al menos 8 caracteres');
    }
    const rol = input.rol ?? 'CAJERO';
    this.validarRol(rol);
    const passwordHash = await bcrypt.hash(input.password, 12);
    try {
      const result = await this.pool.query(
        'INSERT INTO usuarios (email, nombre, password_hash, rol) VALUES (?, ?, ?, ?)',
        [email, nombre, passwordHash, rol],
      );
      return this.obtener(Number(result.insertId));
    } catch (error) {
      if ((error as { code?: string }).code === 'ER_DUP_ENTRY') {
        throw new ConflictException('Ya existe un usuario con ese email');
      }
      throw error;
    }
  }

  async actualizar(id: number, input: UpdateUserInput): Promise<UsuarioPublico> {
    if (input.rol !== undefined) this.validarRol(input.rol);
    if (input.nombre !== undefined && (!input.nombre.trim() || input.nombre.trim().length > 150)) {
      throw new BadRequestException('El nombre no puede estar vacío y admite hasta 150 caracteres');
    }
    await this.obtener(id);
    await this.pool.query(
      'UPDATE usuarios SET nombre = COALESCE(?, nombre), rol = COALESCE(?, rol), activo = COALESCE(?, activo) WHERE id = ?',
      [input.nombre?.trim() ?? null, input.rol ?? null, input.activo ?? null, id],
    );
    return this.obtener(id);
  }

  private async buscarPorId(id: number): Promise<Record<string, any> | null> {
    const rows = await this.pool.query(
      'SELECT id, email, nombre, password_hash AS passwordHash, rol, activo, fecha_creacion AS fechaCreacion, fecha_actualizacion AS fechaActualizacion FROM usuarios WHERE id = ? LIMIT 1',
      [id],
    );
    return rows[0] ?? null;
  }

  private validarRol(rol: string): asserts rol is RolUsuario {
    if (rol !== 'ADMIN' && rol !== 'CAJERO') {
      throw new BadRequestException('El rol debe ser ADMIN o CAJERO');
    }
  }

  private publico(row: Record<string, any>): UsuarioPublico {
    const { passwordHash: _passwordHash, ...data } = row;
    return {
      ...data,
      id: Number(data.id),
      activo: Boolean(data.activo),
      fechaCreacion: new Date(data.fechaCreacion),
      fechaActualizacion: new Date(data.fechaActualizacion),
    } as UsuarioPublico;
  }
}
