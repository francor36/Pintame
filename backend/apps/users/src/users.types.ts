export type RolUsuario = 'ADMIN' | 'CAJERO';

export type UsuarioPublico = {
  id: number;
  email: string;
  nombre: string;
  rol: RolUsuario;
  activo: boolean;
  fechaCreacion: Date;
  fechaActualizacion: Date;
};

export type UsuarioInterno = UsuarioPublico & { passwordHash: string };
