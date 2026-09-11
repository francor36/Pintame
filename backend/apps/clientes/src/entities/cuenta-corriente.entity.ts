import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
} from 'typeorm';

import { Cliente } from './cliente.entity';

@Entity('cuentas_corrientes')
export class CuentaCorriente {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({
    type: 'boolean',
    default: false,
  })
  habilitada!: boolean;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
  })
  cupoMaximo!: number;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
  })
  deudaActual!: number;

  @OneToOne(
    () => Cliente,
    (cliente) => cliente.cuentaCorriente,
  )
  @JoinColumn()
  cliente!: Cliente;
}